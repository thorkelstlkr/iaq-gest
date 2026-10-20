// Registres de facturació VERI*FACTU: càlcul de la factura, XML del registre (esquema
// SuministroInformacion.xsd de l'AEAT) i encadenament amb la huella del registre anterior.

import { get, getConfig } from '../db.ts';
import { huellaAlta, huellaAnulacio } from './huella.ts';

export const NS_SF = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd';
export const NS_LR = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd';

/** Identificació d'aquest programa com a sistema informàtic de facturació (camp SistemaInformatico). */
export const SISTEMA = { nom: 'GestioAssociacions', id: 'GA', versio: '1.0' };

export interface Linia {
  concepte: string;
  quantitat: number;
  preu_cents: number;
  descompte: number;
  qualificacio: string; // S1, E1…E6, N1, N2
  tipus_iva: number;
  causa_exempcio: string | null;
}

export interface Desglossament {
  qualificacio: string;
  tipus_iva: number;
  base_cents: number;
  quota_cents: number;
}

export const QUALIFICACIONS: Record<string, string> = {
  S1: 'Subjecta i no exempta',
  E1: 'Exempta (art. 20 Llei de l’IVA)',
  E2: 'Exempta (art. 21, exportacions)',
  E3: 'Exempta (art. 22)',
  E4: 'Exempta (art. 23 i 24)',
  E5: 'Exempta (art. 25, lliuraments intracomunitaris)',
  E6: 'Exempta (altres)',
  N1: 'No subjecta (art. 7, 14 i altres)',
  N2: 'No subjecta per regles de localització',
};

/** Arrodoniment a cèntims «mig cap enfora» (Math.round arrodoneix -0,5 cap amunt i descuadraria les rectificatives). */
const arrodoneix = (x: number) => Math.sign(x) * Math.round(Math.abs(x));

/** Base de cada línia i desglossament per qualificació i tipus d'IVA (la quota s'arrodoneix per grup). */
export function calcula(linies: Linia[]) {
  const grups = new Map<string, Desglossament>();
  const ambBase = linies.map((l) => {
    const base = arrodoneix(l.quantitat * l.preu_cents * (1 - (l.descompte || 0) / 100));
    const subjecta = l.qualificacio === 'S1';
    const tipus = subjecta ? l.tipus_iva : 0;
    const clau = `${l.qualificacio}|${tipus}`;
    const g = grups.get(clau) ?? { qualificacio: l.qualificacio, tipus_iva: tipus, base_cents: 0, quota_cents: 0 };
    g.base_cents += base;
    grups.set(clau, g);
    return { ...l, base_cents: base };
  });
  const desglossament = [...grups.values()].map((g) => ({
    ...g,
    quota_cents: g.qualificacio === 'S1' ? arrodoneix((g.base_cents * g.tipus_iva) / 100) : 0,
  }));
  const base_cents = desglossament.reduce((s, g) => s + g.base_cents, 0);
  const quota_cents = desglossament.reduce((s, g) => s + g.quota_cents, 0);
  return { linies: ambBase, desglossament, base_cents, quota_cents, total_cents: base_cents + quota_cents };
}

// ---------- Formats de l'AEAT ----------

/** «2026-10-16» → «16-10-2026» */
export const dataAeat = (iso: string) => iso.split('-').reverse().join('-');
/** Cèntims → «123.45» */
export const importAeat = (cents: number) => (cents / 100).toFixed(2);

/** Data i hora actuals amb el fus horari local: «2026-10-16T14:05:00+02:00». */
export function araAmbFus(d = new Date()): string {
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    `${off >= 0 ? '+' : '-'}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`
  );
}

const esc = (t: string | number) =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const el = (nom: string, contingut: string | number) => `<sf:${nom}>${typeof contingut === 'number' ? contingut : contingut}</sf:${nom}>`;
const txt = (nom: string, valor: string | number) => el(nom, esc(valor));

// ---------- Dades de l'emissor i del sistema ----------

export function emissor() {
  return {
    nif: (getConfig('fac_nif') || getConfig('nif') || '').toUpperCase().replace(/[\s-]/g, ''),
    nom: getConfig('fac_nom') || getConfig('nom_complet') || getConfig('nom') || '',
  };
}

function sistemaXml() {
  const productorNif = (getConfig('fac_productor_nif') || emissor().nif).toUpperCase();
  const productorNom = getConfig('fac_productor_nom') || emissor().nom;
  return el(
    'SistemaInformatico',
    txt('NombreRazon', productorNom.slice(0, 120)) +
      txt('NIF', productorNif) +
      txt('NombreSistemaInformatico', SISTEMA.nom) +
      txt('IdSistemaInformatico', SISTEMA.id) +
      txt('Version', SISTEMA.versio) +
      txt('NumeroInstalacion', getConfig('fac_num_installacio') || '1') +
      txt('TipoUsoPosibleSoloVerifactu', 'S') +
      txt('TipoUsoPosibleMultiOT', 'N') +
      txt('IndicadorMultiplesOT', 'N'),
  );
}

interface RegistreAnterior {
  nif_emissor: string;
  num_serie: string;
  data_expedicio: string;
  huella: string;
}

export const registreAnterior = () =>
  get<RegistreAnterior>('SELECT nif_emissor, num_serie, data_expedicio, huella FROM registres_facturacio ORDER BY id DESC LIMIT 1') ?? null;

function encadenament(ant: RegistreAnterior | null) {
  return el(
    'Encadenamiento',
    ant
      ? el(
          'RegistroAnterior',
          txt('IDEmisorFactura', ant.nif_emissor) +
            txt('NumSerieFactura', ant.num_serie) +
            txt('FechaExpedicionFactura', ant.data_expedicio) +
            txt('Huella', ant.huella),
        )
      : txt('PrimerRegistro', 'S'),
  );
}

// ---------- Registre d'alta ----------

export interface DadesAlta {
  num_serie: string;
  data_expedicio_iso: string;
  data_operacio_iso: string | null;
  tipus_factura: string;
  tipus_rectificativa: string | null;
  rectificada: { num_serie: string; data_expedicio_iso: string } | null;
  descripcio: string;
  destinatari: { nom: string; nif: string } | null;
  desglossament: Desglossament[];
  quota_cents: number;
  total_cents: number;
}

export function registreAlta(d: DadesAlta) {
  const { nif, nom } = emissor();
  const ant = registreAnterior();
  const dataGen = araAmbFus();
  const dataExp = dataAeat(d.data_expedicio_iso);
  const quota = importAeat(d.quota_cents);
  const total = importAeat(d.total_cents);
  const huella = huellaAlta({
    IDEmisorFactura: nif,
    NumSerieFactura: d.num_serie,
    FechaExpedicionFactura: dataExp,
    TipoFactura: d.tipus_factura,
    CuotaTotal: quota,
    ImporteTotal: total,
    HuellaAnterior: ant?.huella ?? '',
    FechaHoraHusoGenRegistro: dataGen,
  });

  const desglossament = d.desglossament
    .map((g) => {
      const qualif =
        g.qualificacio.startsWith('E') ? txt('OperacionExenta', g.qualificacio) : txt('CalificacionOperacion', g.qualificacio);
      return el(
        'DetalleDesglose',
        txt('Impuesto', '01') +
          txt('ClaveRegimen', '01') +
          qualif +
          (g.qualificacio === 'S1' ? txt('TipoImpositivo', g.tipus_iva.toFixed(2)) : '') +
          txt('BaseImponibleOimporteNoSujeto', importAeat(g.base_cents)) +
          (g.qualificacio === 'S1' ? txt('CuotaRepercutida', importAeat(g.quota_cents)) : ''),
      );
    })
    .join('');

  const xml =
    `<sf:RegistroAlta xmlns:sf="${NS_SF}">` +
    txt('IDVersion', '1.0') +
    el('IDFactura', txt('IDEmisorFactura', nif) + txt('NumSerieFactura', d.num_serie) + txt('FechaExpedicionFactura', dataExp)) +
    txt('NombreRazonEmisor', nom.slice(0, 120)) +
    txt('TipoFactura', d.tipus_factura) +
    (d.tipus_rectificativa ? txt('TipoRectificativa', d.tipus_rectificativa) : '') +
    (d.rectificada
      ? el(
          'FacturasRectificadas',
          el(
            'IDFacturaRectificada',
            txt('IDEmisorFactura', nif) +
              txt('NumSerieFactura', d.rectificada.num_serie) +
              txt('FechaExpedicionFactura', dataAeat(d.rectificada.data_expedicio_iso)),
          ),
        )
      : '') +
    (d.data_operacio_iso && d.data_operacio_iso !== d.data_expedicio_iso ? txt('FechaOperacion', dataAeat(d.data_operacio_iso)) : '') +
    txt('DescripcionOperacion', d.descripcio.slice(0, 500)) +
    (d.destinatari ? el('Destinatarios', el('IDDestinatario', txt('NombreRazon', d.destinatari.nom.slice(0, 120)) + txt('NIF', d.destinatari.nif))) : '') +
    el('Desglose', desglossament) +
    txt('CuotaTotal', quota) +
    txt('ImporteTotal', total) +
    encadenament(ant) +
    sistemaXml() +
    txt('FechaHoraHusoGenRegistro', dataGen) +
    txt('TipoHuella', '01') +
    txt('Huella', huella) +
    `</sf:RegistroAlta>`;

  return {
    nif_emissor: nif,
    num_serie: d.num_serie,
    data_expedicio: dataExp,
    tipus_factura: d.tipus_factura,
    quota_total: quota,
    import_total: total,
    huella_anterior: ant?.huella ?? '',
    data_hora_gen: dataGen,
    huella,
    xml,
  };
}

// ---------- Registre d'anul·lació ----------

export function registreAnulacio(f: { num_serie: string; data_expedicio_iso: string }) {
  const { nif } = emissor();
  const ant = registreAnterior();
  const dataGen = araAmbFus();
  const dataExp = dataAeat(f.data_expedicio_iso);
  const huella = huellaAnulacio({
    IDEmisorFacturaAnulada: nif,
    NumSerieFacturaAnulada: f.num_serie,
    FechaExpedicionFacturaAnulada: dataExp,
    HuellaAnterior: ant?.huella ?? '',
    FechaHoraHusoGenRegistro: dataGen,
  });
  const xml =
    `<sf:RegistroAnulacion xmlns:sf="${NS_SF}">` +
    txt('IDVersion', '1.0') +
    el('IDFactura', txt('IDEmisorFacturaAnulada', nif) + txt('NumSerieFacturaAnulada', f.num_serie) + txt('FechaExpedicionFacturaAnulada', dataExp)) +
    encadenament(ant) +
    sistemaXml() +
    txt('FechaHoraHusoGenRegistro', dataGen) +
    txt('TipoHuella', '01') +
    txt('Huella', huella) +
    `</sf:RegistroAnulacion>`;
  return {
    nif_emissor: nif,
    num_serie: f.num_serie,
    data_expedicio: dataExp,
    tipus_factura: null,
    quota_total: null,
    import_total: null,
    huella_anterior: ant?.huella ?? '',
    data_hora_gen: dataGen,
    huella,
    xml,
  };
}

/** Torna a calcular totes les huelles i comprova que la cadena és íntegra. */
export function verificaCadena(registres: {
  id: number;
  tipus: string;
  nif_emissor: string;
  num_serie: string;
  data_expedicio: string;
  tipus_factura: string | null;
  quota_total: string | null;
  import_total: string | null;
  huella_anterior: string;
  data_hora_gen: string;
  huella: string;
}[]) {
  let anterior = '';
  for (const r of registres) {
    if (r.huella_anterior !== anterior) return { ok: false, id: r.id, motiu: "L'encadenament amb el registre anterior no coincideix." };
    const calculada =
      r.tipus === 'alta'
        ? huellaAlta({
            IDEmisorFactura: r.nif_emissor,
            NumSerieFactura: r.num_serie,
            FechaExpedicionFactura: r.data_expedicio,
            TipoFactura: r.tipus_factura ?? '',
            CuotaTotal: r.quota_total ?? '',
            ImporteTotal: r.import_total ?? '',
            HuellaAnterior: r.huella_anterior,
            FechaHoraHusoGenRegistro: r.data_hora_gen,
          })
        : huellaAnulacio({
            IDEmisorFacturaAnulada: r.nif_emissor,
            NumSerieFacturaAnulada: r.num_serie,
            FechaExpedicionFacturaAnulada: r.data_expedicio,
            HuellaAnterior: r.huella_anterior,
            FechaHoraHusoGenRegistro: r.data_hora_gen,
          });
    if (calculada !== r.huella) return { ok: false, id: r.id, motiu: 'La huella no correspon a les dades del registre.' };
    anterior = r.huella;
  }
  return { ok: true, registres: registres.length };
}

/** URL del codi QR tributari (especificació QR de l'AEAT v0.5.0, sistema VERI*FACTU). */
export function urlQr(f: { num_serie: string; data_expedicio_iso: string; total_cents: number }) {
  const base =
    getConfig('fac_entorn') === 'produccio'
      ? 'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR'
      : 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR';
  const p = new URLSearchParams({
    nif: emissor().nif,
    numserie: f.num_serie,
    fecha: dataAeat(f.data_expedicio_iso),
    importe: importAeat(f.total_cents),
  });
  return `${base}?${p.toString()}`;
}
