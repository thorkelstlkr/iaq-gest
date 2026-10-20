// Donatius: donacions rebudes, certificats per als donants (art. 24 Llei 49/2002), resum del model 182
// i inventari de béns de l'associació (art. 14 LO 1/2002).
//
// Només les entitats acollides al règim fiscal especial de la Llei 49/2002 (p. ex. declarades d'utilitat
// pública que hi han optat) poden emetre certificats amb dret a deducció i han de presentar el model 182.
// La resta poden donar un rebut de la donació, sense efectes fiscals.
import { Router } from 'express';
import type { Request } from 'express';
import { all, get, getConfig, run, setConfig, tx } from '../db.ts';
import { registra } from '../auditoria.ts';
import { autor } from './auth.ts';
import { juntaActual } from './governanca.ts';
import { avui } from '../../shared/dates.ts';
import {
  HttpError, bool, cents, columnesTraduides, data, dataObligatoria, enter, idParam, notFound, sendCsv, text,
  textObligatori, toCsv, centsAEuros,
} from '../util.ts';

export const donatiusRouter = Router();

// ---------- Càlculs (exportats per a les proves) ----------

/** Codi de província (dos dígits) a partir d'un codi postal espanyol; null si no és vàlid. */
export function codiProvincia(cp: string | null | undefined): string | null {
  const net = (cp ?? '').replace(/\s/g, '');
  if (!/^\d{5}$/.test(net)) return null;
  const p = Number(net.slice(0, 2));
  return p >= 1 && p <= 52 ? net.slice(0, 2) : null;
}

/** Normalitza i valida un NIF (DNI, NIE o NIF d'entitat). Altres documents s'accepten tal qual. */
export function validaNif(nif: string | null): string | null {
  if (!nif) return null;
  const net = nif.replace(/[\s.-]/g, '').toUpperCase();
  const dni = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(net);
  if (dni) {
    const num = Number(({ X: '0', Y: '1', Z: '2' }[dni[1]] ?? '') + dni[2]);
    if ('TRWAGMYFPDXBNJZSQVHLCKE'[num % 23] !== dni[3]) throw new HttpError(400, 'La lletra del NIF no és correcta.');
    return net;
  }
  const cif = /^([ABCDEFGHJKLMNPQRSUVW])(\d{7})([0-9A-J])$/.exec(net);
  if (cif) {
    const d = cif[2].split('').map(Number);
    let suma = 0;
    d.forEach((x, i) => {
      if (i % 2 === 1) suma += x;
      else {
        const doble = x * 2;
        suma += Math.floor(doble / 10) + (doble % 10);
      }
    });
    const control = (10 - (suma % 10)) % 10;
    const lletra = 'JABCDEFGHI'[control];
    const ok = /[ABEH]/.test(cif[1])
      ? cif[3] === String(control)
      : /[KPQS]/.test(cif[1])
        ? cif[3] === lletra
        : cif[3] === String(control) || cif[3] === lletra;
    if (!ok) throw new HttpError(400, 'El dígit de control del NIF no és correcte.');
    return net;
  }
  return net;
}

export type TipusPersona = 'fisica' | 'juridica';

/** Valor d'una donació: l'import si és dinerària, la valoració si és en espècie. */
export const valorDonacio = (d: { en_especie: number; import_cents: number; valoracio_cents: number | null }) =>
  d.en_especie ? (d.valoracio_cents ?? 0) : d.import_cents;

/**
 * Donant recurrent (art. 19.1 i 20.1 Llei 49/2002, redacció del RDL 6/2023): ha fet donacions a la mateixa
 * entitat els dos anys anteriors, i l'import de cada any és igual o superior al de l'any anterior
 * (any-2 > 0, any-1 ≥ any-2 i any ≥ any-1).
 */
export function esRecurrent(perAny: Map<number, number> | Record<number, number>, any: number): boolean {
  const imp = (a: number) => (perAny instanceof Map ? perAny.get(a) : perAny[a]) ?? 0;
  const a2 = imp(any - 2);
  const a1 = imp(any - 1);
  const a0 = imp(any);
  return a2 > 0 && a1 >= a2 && a0 >= a1;
}

/** Percentatges de deducció vigents des de 2024: persones físiques 80 % fins a 250 € i 40 % (45 % recurrent) la resta; jurídiques 40 % (50 % recurrent). */
export function percentatges(tipus: TipusPersona, recurrent: boolean): { fins_250: number | null; resta: number } {
  return tipus === 'fisica' ? { fins_250: 80, resta: recurrent ? 45 : 40 } : { fins_250: null, resta: recurrent ? 50 : 40 };
}

/** Deducció estimada (en cèntims) per a l'import total donat en un any. Orientativa: no aplica els límits sobre la base liquidable. */
export function deduccio(tipus: TipusPersona, totalCents: number, recurrent: boolean): number {
  const p = percentatges(tipus, recurrent);
  if (p.fins_250 === null) return Math.round((totalCents * p.resta) / 100);
  const tram = Math.min(totalCents, 250_00);
  return Math.round((tram * p.fins_250) / 100 + (Math.max(0, totalCents - 250_00) * p.resta) / 100);
}

export interface DonacioResum {
  id?: number;
  nom: string;
  nif: string | null;
  tipus_persona: TipusPersona;
  codi_provincia: string | null;
  codi_postal?: string | null;
  data: string;
  import_cents: number;
  en_especie: number;
  valoracio_cents: number | null;
  revocada: number;
}

export interface Fila182 {
  clau_donant: string;
  nif: string | null;
  nom: string;
  tipus_persona: TipusPersona;
  naturalesa: 'F' | 'J';
  codi_provincia: string | null;
  clau: 'A';
  total_cents: number;
  donacions: number;
  en_especie: boolean;
  recurrent: boolean;
  percentatge_250: number | null;
  percentatge_resta: number;
  deduccio_cents: number;
  import_anterior_cents: number;
  import_anterior2_cents: number;
  declarable: boolean;
  motius: string[];
}

/** Clau per agrupar les donacions d'una mateixa persona: el NIF; si no en té, el nom. */
export const clauDonant = (d: { nif: string | null; nom: string }) =>
  d.nif ? d.nif.toUpperCase() : `NOM:${d.nom.trim().toLowerCase()}`;

/** Resum per donant del model 182 d'un exercici. `donacions` ha d'incloure els dos anys anteriors (recurrència). */
export function resum182(donacions: DonacioResum[], exercici: number): Fila182[] {
  const perDonant = new Map<string, { anys: Map<number, number>; delAny: DonacioResum[] }>();
  for (const d of donacions) {
    if (d.revocada) continue;
    const any = Number(d.data.slice(0, 4));
    if (any < exercici - 2 || any > exercici) continue;
    const clau = clauDonant(d);
    let g = perDonant.get(clau);
    if (!g) perDonant.set(clau, (g = { anys: new Map(), delAny: [] }));
    g.anys.set(any, (g.anys.get(any) ?? 0) + valorDonacio(d));
    if (any === exercici) g.delAny.push(d);
  }
  const files: Fila182[] = [];
  for (const [clau, g] of perDonant) {
    if (!g.delAny.length) continue;
    const ordenades = [...g.delAny].sort((a, b) => b.data.localeCompare(a.data));
    const ultima = ordenades[0];
    const tipus = ultima.tipus_persona;
    const total = g.anys.get(exercici) ?? 0;
    const recurrent = esRecurrent(g.anys, exercici);
    const p = percentatges(tipus, recurrent);
    // La província de la donació més recent que en tingui (o derivada del seu codi postal).
    const provincia = ordenades.map((d) => d.codi_provincia ?? codiProvincia(d.codi_postal)).find(Boolean) ?? null;
    const motius: string[] = [];
    if (!ultima.nif) motius.push('Sense NIF: no es pot declarar.');
    if (!provincia) motius.push('Sense codi de província (codi postal).');
    files.push({
      clau_donant: clau,
      nif: ultima.nif,
      nom: ultima.nom,
      tipus_persona: tipus,
      naturalesa: tipus === 'fisica' ? 'F' : 'J',
      codi_provincia: provincia,
      clau: 'A',
      total_cents: total,
      donacions: g.delAny.length,
      en_especie: g.delAny.some((d) => d.en_especie),
      recurrent,
      percentatge_250: p.fins_250,
      percentatge_resta: p.resta,
      deduccio_cents: deduccio(tipus, total, recurrent),
      import_anterior_cents: g.anys.get(exercici - 1) ?? 0,
      import_anterior2_cents: g.anys.get(exercici - 2) ?? 0,
      declarable: Boolean(ultima.nif),
      motius,
    });
  }
  return files.sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
}

/** Mesos sencers entre dues dates (YYYY-MM-DD); 0 si la segona és anterior. */
export function mesosEntre(de: string, fins: string): number {
  const [y1, m1, d1] = de.split('-').map(Number);
  const [y2, m2, d2] = fins.split('-').map(Number);
  const m = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  return Math.max(0, m);
}

const diaSeguent = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
};

export interface Amortitzacio {
  anual_cents: number;
  acumulada_cents: number;
  net_cents: number;
  de_baixa: boolean;
}

/**
 * Amortització lineal per mesos sencers: valor / (vida útil × 12) per mes, fins a la data indicada (inclosa).
 * Sense vida útil, el bé no s'amortitza. Un bé donat de baixa abans de la data té valor net 0.
 */
export function amortitzacio(
  b: { valor_adquisicio_cents: number; data_adquisicio: string; vida_util_anys: number | null; data_baixa?: string | null },
  dataRef: string,
): Amortitzacio {
  const valor = b.valor_adquisicio_cents;
  const deBaixa = Boolean(b.data_baixa && b.data_baixa <= dataRef);
  if (!b.vida_util_anys || valor <= 0 || dataRef < b.data_adquisicio) {
    return { anual_cents: 0, acumulada_cents: 0, net_cents: deBaixa || dataRef < b.data_adquisicio ? 0 : valor, de_baixa: deBaixa };
  }
  const total = b.vida_util_anys * 12;
  const fi = deBaixa ? b.data_baixa! : dataRef;
  const mesos = Math.min(total, mesosEntre(b.data_adquisicio, diaSeguent(fi)));
  const acumulada = Math.round((valor * mesos) / total);
  return {
    anual_cents: Math.round(valor / b.vida_util_anys),
    acumulada_cents: acumulada,
    net_cents: deBaixa ? 0 : valor - acumulada,
    de_baixa: deBaixa,
  };
}

/** Amortització imputable a un any natural. */
export function amortitzacioAny(
  b: { valor_adquisicio_cents: number; data_adquisicio: string; vida_util_anys: number | null; data_baixa?: string | null },
  any: number,
): number {
  const fins = (iso: string) => amortitzacio({ ...b, data_baixa: null }, iso).acumulada_cents;
  const finalAny = b.data_baixa && b.data_baixa < `${any}-12-31` ? b.data_baixa : `${any}-12-31`;
  if (finalAny < `${any}-01-01`) return 0;
  return Math.max(0, fins(finalAny) - fins(`${any - 1}-12-31`));
}

// ---------- Configuració del règim fiscal ----------

export interface ConfigDonatius {
  regim_49_2002: 'si' | 'no';
  regim_49_2002_data: string | null;
  utilitat_publica_data: string | null;
  donatius_categoria_id: number | null;
  donatius_compte_id: number | null;
}

export function configDonatius(): ConfigDonatius {
  return {
    regim_49_2002: getConfig('regim_49_2002') === 'si' ? 'si' : 'no',
    regim_49_2002_data: getConfig('regim_49_2002_data') || null,
    utilitat_publica_data: getConfig('utilitat_publica_data') || null,
    donatius_categoria_id: Number(getConfig('donatius_categoria_id')) || categoriaDonacions(),
    donatius_compte_id: Number(getConfig('donatius_compte_id')) || null,
  };
}

/** Categoria d'ingrés «Donacions» (per nom), si existeix. */
export function categoriaDonacions(): number | null {
  return (
    get<{ id: number }>(
      "SELECT id FROM categories WHERE tipus = 'ingres' AND actiu = 1 AND (nom LIKE 'Donaci%' OR nom LIKE 'Donatiu%') ORDER BY id LIMIT 1",
    )?.id ?? null
  );
}

donatiusRouter.get('/config', (_req, res) => {
  res.json(configDonatius());
});

donatiusRouter.put('/config', (req, res) => {
  const b = req.body ?? {};
  const regim = b.regim_49_2002 === 'si' ? 'si' : 'no';
  setConfig('regim_49_2002', regim);
  setConfig('regim_49_2002_data', data(b.regim_49_2002_data, "Data d'acolliment al règim") ?? '');
  setConfig('utilitat_publica_data', data(b.utilitat_publica_data, "Data de declaració d'utilitat pública") ?? '');
  setConfig('donatius_categoria_id', String(enter(b.donatius_categoria_id, 'Categoria') ?? ''));
  setConfig('donatius_compte_id', String(enter(b.donatius_compte_id, 'Compte') ?? ''));
  registra(req, 'configura', 'config', null, 'Donatius: regim_49_2002, regim_49_2002_data, utilitat_publica_data, donatius_categoria_id, donatius_compte_id');
  res.json(configDonatius());
});

/** Comptes, categories d'ingrés i socis per als formularis. */
donatiusRouter.get('/opcions', (_req, res) => {
  res.json({
    comptes: all('SELECT id, nom FROM comptes WHERE actiu = 1 ORDER BY id'),
    categories: all("SELECT id, nom FROM categories WHERE tipus = 'ingres' AND actiu = 1 ORDER BY nom"),
    socis: all(
      `SELECT id, num_soci, nom, llinatges, dni, adreca, codi_postal, poblacio FROM socis
        WHERE anonimitzat_el IS NULL ORDER BY nom, llinatges`,
    ),
    config: configDonatius(),
  });
});

// ---------- Donacions ----------

interface Donatiu extends DonacioResum {
  id: number;
  soci_id: number | null;
  adreca: string | null;
  codi_postal: string | null;
  poblacio: string | null;
  descripcio_especie: string | null;
  destinacio: string | null;
  data_revocacio: string | null;
  moviment_id: number | null;
  notes: string | null;
}

const SQL_DONATIUS = `
  SELECT d.*,
         (SELECT COUNT(*) FROM certificats_donacio c WHERE c.donatiu_id = d.id)
           + (SELECT COUNT(*) FROM certificats_donacio_linies l WHERE l.donatiu_id = d.id) AS certificats,
         (SELECT GROUP_CONCAT(i.id) FROM inventari i WHERE i.donatiu_id = d.id) AS inventari_ids,
         m.compte_id AS moviment_compte_id
    FROM donatius d LEFT JOIN moviments m ON m.id = d.moviment_id`;

const teCertificats = (id: number) =>
  Boolean(
    get('SELECT 1 AS x FROM certificats_donacio WHERE donatiu_id = ? UNION SELECT 1 FROM certificats_donacio_linies WHERE donatiu_id = ?', id, id),
  );

donatiusRouter.get('/', (req, res) => {
  const any = req.query.exercici === 'tots' ? null : Number(req.query.exercici ?? avui().slice(0, 4));
  if (any !== null && (!Number.isInteger(any) || any < 1900 || any > 3000)) throw new HttpError(400, 'Exercici no vàlid.');
  res.json(
    any === null
      ? all(`${SQL_DONATIUS} ORDER BY d.data DESC, d.id DESC`)
      : all(`${SQL_DONATIUS} WHERE d.data BETWEEN ? AND ? ORDER BY d.data DESC, d.id DESC`, `${any}-01-01`, `${any}-12-31`),
  );
});

function llegeixDonatiu(b: Record<string, unknown>) {
  const enEspecie = bool(b.en_especie);
  const tipus = b.tipus_persona === 'juridica' ? 'juridica' : 'fisica';
  const codiPostal = text(b.codi_postal);
  const d = {
    soci_id: enter(b.soci_id, 'Soci'),
    nom: textObligatori(b.nom, 'Nom del donant'),
    nif: validaNif(text(b.nif)),
    tipus_persona: tipus,
    adreca: text(b.adreca),
    codi_postal: codiPostal,
    poblacio: text(b.poblacio),
    codi_provincia: codiProvincia(codiPostal),
    data: dataObligatoria(b.data, 'Data'),
    import_cents: enEspecie ? 0 : cents(b.import_cents, 'Import', { positiu: true }),
    en_especie: enEspecie,
    descripcio_especie: enEspecie ? textObligatori(b.descripcio_especie, 'Descripció del bé donat') : null,
    valoracio_cents: enEspecie ? cents(b.valoracio_cents, 'Valoració', { positiu: true }) : null,
    destinacio: text(b.destinacio),
    revocada: bool(b.revocada),
    data_revocacio: null as string | null,
    notes: text(b.notes),
  };
  if (d.revocada) d.data_revocacio = data(b.data_revocacio, 'Data de revocació') ?? avui();
  if (d.soci_id && !get('SELECT 1 AS x FROM socis WHERE id = ?', d.soci_id)) throw new HttpError(400, 'Soci no trobat.');
  return d;
}

/** Crea el moviment d'ingrés d'una donació dinerària (respecta els exercicis tancats). */
function creaMoviment(d: ReturnType<typeof llegeixDonatiu>, b: Record<string, unknown>): number {
  const cfg = configDonatius();
  const compte = enter(b.compte_id, 'Compte') ?? cfg.donatius_compte_id;
  const categoria = enter(b.categoria_id, 'Categoria') ?? cfg.donatius_categoria_id;
  if (!compte || !get('SELECT 1 AS x FROM comptes WHERE id = ?', compte)) throw new HttpError(400, 'Cal triar el compte on ha entrat la donació.');
  if (!categoria || !get("SELECT 1 AS x FROM categories WHERE id = ? AND tipus = 'ingres'", categoria))
    throw new HttpError(400, "Cal triar la categoria d'ingrés de la donació.");
  return run(
    `INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, soci_id)
     VALUES (?, 'ingres', ?, ?, ?, ?, ?)`,
    d.data, d.import_cents, `Donació: ${d.nom}`, categoria, compte, d.soci_id,
  ).id;
}

const obteDonatiu = (id: number) => get(`${SQL_DONATIUS} WHERE d.id = ?`, id) ?? notFound();

donatiusRouter.post('/', (req, res) => {
  const b = req.body ?? {};
  const d = llegeixDonatiu(b);
  const id = tx(() => {
    const movimentId = !d.en_especie && bool(b.crea_moviment) ? creaMoviment(d, b) : null;
    return run(
      `INSERT INTO donatius (soci_id, nom, nif, tipus_persona, adreca, codi_postal, poblacio, codi_provincia, data, import_cents,
                             en_especie, descripcio_especie, valoracio_cents, destinacio, revocada, data_revocacio, moviment_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      d.soci_id, d.nom, d.nif, d.tipus_persona, d.adreca, d.codi_postal, d.poblacio, d.codi_provincia, d.data, d.import_cents,
      d.en_especie, d.descripcio_especie, d.valoracio_cents, d.destinacio, d.revocada, d.data_revocacio, movimentId, d.notes,
    ).id;
  });
  registra(req, 'crea', 'donatiu', id, `Donació de ${d.nom} (${d.data})`);
  res.status(201).json(obteDonatiu(id));
});

// ---------- Donants (per als certificats anuals) ----------

export function donantsDe(exercici: number) {
  const files = all<Donatiu>(
    'SELECT * FROM donatius WHERE revocada = 0 AND data BETWEEN ? AND ? ORDER BY data',
    `${exercici}-01-01`, `${exercici}-12-31`,
  );
  const grups = new Map<string, { clau: string; nom: string; nif: string | null; tipus_persona: TipusPersona; donacions: number; total_cents: number; certificat_id: number | null }>();
  for (const d of files) {
    const clau = clauDonant(d);
    const g = grups.get(clau) ?? { clau, nom: d.nom, nif: d.nif, tipus_persona: d.tipus_persona, donacions: 0, total_cents: 0, certificat_id: null };
    g.nom = d.nom;
    g.donacions++;
    g.total_cents += valorDonacio(d);
    grups.set(clau, g);
  }
  for (const g of grups.values())
    if (g.nif)
      g.certificat_id =
        get<{ id: number }>("SELECT id FROM certificats_donacio WHERE tipus = 'anual' AND exercici = ? AND UPPER(nif) = ?", exercici, g.nif.toUpperCase())?.id ?? null;
  return [...grups.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
}

donatiusRouter.get('/donants', (req, res) => {
  res.json(donantsDe(exerciciDe(req)));
});

function exerciciDe(req: Request): number {
  const e = Number(req.query.exercici ?? avui().slice(0, 4));
  if (!Number.isInteger(e) || e < 1900 || e > 3000) throw new HttpError(400, 'Exercici no vàlid.');
  return e;
}

// ---------- Certificats ----------

interface CertificatFila {
  id: number;
  any: number;
  numero: number;
  tipus: 'donacio' | 'anual' | 'rebut';
  donatiu_id: number | null;
  exercici: number;
  nom: string;
  nif: string | null;
  data: string;
  total_cents: number;
  contingut: string;
  secretaria: string | null;
  presidencia: string | null;
  emes_per: string | null;
}

const certificatJson = (c: CertificatFila) => ({ ...c, contingut: JSON.parse(c.contingut) });

donatiusRouter.get('/certificats', (req, res) => {
  const filtre = req.query.exercici ? exerciciDe(req) : null;
  const files = filtre
    ? all<CertificatFila>('SELECT * FROM certificats_donacio WHERE exercici = ? ORDER BY any DESC, numero DESC', filtre)
    : all<CertificatFila>('SELECT * FROM certificats_donacio ORDER BY any DESC, numero DESC');
  res.json(files.map(certificatJson));
});

donatiusRouter.get('/certificats/:id', (req, res) => {
  const c = get<CertificatFila>('SELECT * FROM certificats_donacio WHERE id = ?', idParam(req)) ?? notFound();
  res.json(certificatJson(c));
});

const liniaCert = (d: Donatiu) => ({
  id: d.id,
  data: d.data,
  import_cents: d.import_cents,
  en_especie: Boolean(d.en_especie),
  descripcio_especie: d.descripcio_especie,
  valoracio_cents: d.valoracio_cents,
  valor_cents: valorDonacio(d),
  destinacio: d.destinacio,
});

donatiusRouter.post('/certificats', (req, res) => {
  const b = req.body ?? {};
  const tipus = b.tipus === 'anual' ? 'anual' : b.tipus === 'rebut' ? 'rebut' : 'donacio';
  const cfg = configDonatius();
  if (tipus !== 'rebut' && cfg.regim_49_2002 !== 'si')
    throw new HttpError(400, "L'entitat no està acollida al règim de la Llei 49/2002: només es pot emetre un rebut sense efectes fiscals.");
  const dataCert = data(b.data, 'Data') ?? avui();
  const junta = juntaActual(dataCert);
  if (tipus !== 'rebut' && !junta.secretaria)
    throw new HttpError(400, 'Per emetre certificats cal tenir registrada la persona que ocupa la secretaria.');

  let donacions: Donatiu[];
  let exercici: number;
  if (tipus === 'anual') {
    exercici = enter(b.exercici, 'Exercici') ?? Number(dataCert.slice(0, 4)) - 1;
    const nif = validaNif(text(b.nif));
    if (!nif) throw new HttpError(400, 'El certificat amb efectes fiscals requereix el NIF del donant.');
    donacions = all<Donatiu>(
      'SELECT * FROM donatius WHERE revocada = 0 AND UPPER(nif) = ? AND data BETWEEN ? AND ? ORDER BY data',
      nif, `${exercici}-01-01`, `${exercici}-12-31`,
    );
    if (!donacions.length) throw new HttpError(400, 'Aquest donant no té donacions en aquest exercici.');
    if (get("SELECT 1 AS x FROM certificats_donacio WHERE tipus = 'anual' AND exercici = ? AND UPPER(nif) = ?", exercici, nif))
      throw new HttpError(409, 'Ja hi ha un certificat anual per a aquest donant i exercici: podeu tornar-lo a imprimir.');
  } else {
    const id = enter(b.donatiu_id, 'Donació');
    const d = id ? get<Donatiu>('SELECT * FROM donatius WHERE id = ?', id) : undefined;
    if (!d) throw new HttpError(404, 'Donació no trobada.');
    if (d.revocada) throw new HttpError(400, 'La donació està revocada.');
    if (tipus === 'donacio' && !d.nif) throw new HttpError(400, 'El certificat amb efectes fiscals requereix el NIF del donant.');
    if (get('SELECT 1 AS x FROM certificats_donacio WHERE donatiu_id = ?', d.id))
      throw new HttpError(409, 'Aquesta donació ja té un certificat: podeu tornar-lo a imprimir.');
    donacions = [d];
    exercici = Number(d.data.slice(0, 4));
  }
  const ultima = donacions[donacions.length - 1];
  const total = donacions.reduce((s, d) => s + valorDonacio(d), 0);
  const contingut = {
    entitat: {
      nom: getConfig('nom_complet') || getConfig('nom') || '',
      nif: getConfig('nif') || '',
      num_registre: getConfig('num_registre') || '',
      adreca: getConfig('adreca') || '',
      codi_postal: getConfig('codi_postal') || '',
      poblacio: getConfig('poblacio') || '',
    },
    regim: { acollida: cfg.regim_49_2002 === 'si', data: cfg.regim_49_2002_data, utilitat_publica_data: cfg.utilitat_publica_data },
    donant: {
      nom: ultima.nom, nif: ultima.nif, tipus_persona: ultima.tipus_persona, adreca: ultima.adreca,
      codi_postal: ultima.codi_postal, poblacio: ultima.poblacio,
    },
    exercici,
    donacions: donacions.map(liniaCert),
    total_cents: total,
    irrevocable: true,
  };
  const c = tx(() => {
    const any = Number(dataCert.slice(0, 4));
    const numero = get<{ n: number }>('SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM certificats_donacio WHERE any = ?', any)!.n;
    const { id } = run(
      `INSERT INTO certificats_donacio (any, numero, tipus, donatiu_id, exercici, nom, nif, data, total_cents, contingut, secretaria, presidencia, emes_per)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      any, numero, tipus, tipus === 'anual' ? null : ultima.id, exercici, ultima.nom, ultima.nif, dataCert, total,
      JSON.stringify(contingut), junta.secretaria?.nom ?? null, junta.presidencia?.nom ?? null, autor(req),
    );
    if (tipus === 'anual') for (const d of donacions) run('INSERT INTO certificats_donacio_linies (certificat_id, donatiu_id) VALUES (?, ?)', id, d.id);
    return get<CertificatFila>('SELECT * FROM certificats_donacio WHERE id = ?', id)!;
  });
  registra(req, 'crea', 'certificat_donacio', c.id, `Certificat de donació ${c.numero}/${c.any} (${tipus}) de ${c.nom}`);
  res.status(201).json(certificatJson(c));
});

// ---------- Model 182 ----------

export function model182(exercici: number) {
  const donacions = all<Donatiu>(
    'SELECT * FROM donatius WHERE data BETWEEN ? AND ?',
    `${exercici - 2}-01-01`, `${exercici}-12-31`,
  );
  const files = resum182(donacions, exercici);
  const revocades = donacions.filter((d) => d.revocada && d.data.startsWith(String(exercici))).length;
  const declarables = files.filter((f) => f.declarable);
  return {
    exercici,
    regim: configDonatius().regim_49_2002,
    termini: `${exercici + 1}-01-31`,
    entitat: { nom: getConfig('nom_complet') || getConfig('nom') || '', nif: getConfig('nif') || '' },
    donants: files,
    revocades,
    totals: {
      donants: files.length,
      declarables: declarables.length,
      sense_nif: files.length - declarables.length,
      import_cents: declarables.reduce((s, f) => s + f.total_cents, 0),
      deduccio_cents: declarables.reduce((s, f) => s + f.deduccio_cents, 0),
    },
  };
}

donatiusRouter.get('/model182', (req, res) => {
  res.json(model182(exerciciDe(req)));
});

const COLUMNES_182: [string, string][] = [
  ['nif', 'NIF'],
  ['nom', 'Nom o raó social'],
  ['codi_provincia', 'Codi de província'],
  ['clau', 'Clau'],
  ['naturalesa', 'Naturalesa (F/J)'],
  ['percentatge', 'Percentatge de deducció'],
  ['import', 'Import (€)'],
  ['especie', 'En espècie'],
  ['recurrencia', 'Recurrència'],
  ['import_anterior', 'Import any anterior (€)'],
  ['import_anterior2', 'Import fa dos anys (€)'],
  ['declarable', 'Declarable'],
];

/** Dades per al CSV del 182 (també les fa servir la interfície per mostrar-les i copiar-les). */
export function files182Csv(m: ReturnType<typeof model182>) {
  return m.donants.map((f) => ({
    nif: f.nif ?? '',
    nom: f.nom,
    codi_provincia: f.codi_provincia ?? '',
    clau: f.clau,
    naturalesa: f.naturalesa,
    percentatge: f.percentatge_250 !== null ? `${f.percentatge_250}/${f.percentatge_resta}` : String(f.percentatge_resta),
    import: centsAEuros(f.total_cents),
    especie: f.en_especie ? 'X' : '',
    recurrencia: f.recurrent ? '1' : '',
    import_anterior: centsAEuros(f.import_anterior_cents),
    import_anterior2: centsAEuros(f.import_anterior2_cents),
    declarable: f.declarable ? 'X' : '',
  }));
}

donatiusRouter.get('/model182.csv', (req, res) => {
  const exercici = exerciciDe(req);
  const m = model182(exercici);
  registra(req, 'exporta', 'donatiu', null, `Model 182 de ${exercici} (CSV)`);
  sendCsv(res, `model182-${exercici}.csv`, toCsv(files182Csv(m), columnesTraduides(req, COLUMNES_182)));
});

// ---------- Inventari ----------

export const CATEGORIES_INVENTARI = ['equip_so', 'mobiliari', 'informatica', 'material_tallers', 'vestuari', 'altres'] as const;
const PROCEDENCIES = ['compra', 'donacio', 'cessio'] as const;
const ESTATS = ['bo', 'regular', 'dolent'] as const;
/** Mida màxima de la foto (data URI en base64): uns 1,4 MB d'imatge. */
const MAX_FOTO = 1_900_000;

interface BeInventari {
  id: number;
  descripcio: string;
  categoria: string;
  data_adquisicio: string;
  valor_adquisicio_cents: number;
  procedencia: string;
  moviment_id: number | null;
  donatiu_id: number | null;
  ubicacio: string | null;
  estat: string;
  vida_util_anys: number | null;
  data_baixa: string | null;
  motiu_baixa: string | null;
  notes: string | null;
}

const COLS_INVENTARI = `i.id, i.descripcio, i.categoria, i.data_adquisicio, i.valor_adquisicio_cents, i.procedencia, i.moviment_id,
  i.donatiu_id, i.ubicacio, i.estat, i.vida_util_anys, i.data_baixa, i.motiu_baixa, i.notes, (i.foto IS NOT NULL) AS te_foto,
  d.nom AS donant_nom`;

export function llistaInventari(dataRef: string, ambBaixes: boolean) {
  const files = all<BeInventari>(
    `SELECT ${COLS_INVENTARI} FROM inventari i LEFT JOIN donatius d ON d.id = i.donatiu_id
      WHERE i.data_adquisicio <= ? ${ambBaixes ? '' : 'AND (i.data_baixa IS NULL OR i.data_baixa > ?)'}
      ORDER BY i.categoria, i.descripcio`,
    ...(ambBaixes ? [dataRef] : [dataRef, dataRef]),
  );
  const any = Number(dataRef.slice(0, 4));
  return files.map((b) => ({ ...b, ...amortitzacio(b, dataRef), amortitzacio_any_cents: amortitzacioAny(b, any) }));
}

function llegeixBe(b: Record<string, unknown>) {
  const tria = <T extends string>(v: unknown, llista: readonly T[], def: T): T => (llista.includes(v as T) ? (v as T) : def);
  const foto = text(b.foto);
  if (foto && !/^data:image\/(jpeg|png|webp);base64,/.test(foto)) throw new HttpError(400, 'La foto no és una imatge vàlida.');
  if (foto && foto.length > MAX_FOTO) throw new HttpError(400, 'La foto és massa gran (màxim 1,4 MB).');
  const vida = enter(b.vida_util_anys, 'Vida útil');
  if (vida !== null && (vida <= 0 || vida > 100)) throw new HttpError(400, 'La vida útil ha de ser entre 1 i 100 anys.');
  const be = {
    descripcio: textObligatori(b.descripcio, 'Descripció'),
    categoria: tria(b.categoria, CATEGORIES_INVENTARI, 'altres'),
    data_adquisicio: dataObligatoria(b.data_adquisicio, "Data d'adquisició"),
    valor_adquisicio_cents: cents(b.valor_adquisicio_cents ?? 0, "Valor d'adquisició"),
    procedencia: tria(b.procedencia, PROCEDENCIES, 'compra'),
    moviment_id: enter(b.moviment_id, 'Moviment'),
    donatiu_id: enter(b.donatiu_id, 'Donació'),
    ubicacio: text(b.ubicacio),
    estat: tria(b.estat, ESTATS, 'bo'),
    vida_util_anys: vida,
    data_baixa: data(b.data_baixa, 'Data de baixa'),
    motiu_baixa: text(b.motiu_baixa),
    foto,
    notes: text(b.notes),
  };
  if (be.data_baixa && be.data_baixa < be.data_adquisicio) throw new HttpError(400, "La data de baixa no pot ser anterior a la d'adquisició.");
  if (be.moviment_id && !get('SELECT 1 AS x FROM moviments WHERE id = ?', be.moviment_id)) throw new HttpError(400, 'Moviment no trobat.');
  if (be.donatiu_id && !get('SELECT 1 AS x FROM donatius WHERE id = ?', be.donatiu_id)) throw new HttpError(404, 'Donació no trobada.');
  return be;
}


const dataRefDe = (req: Request) => data(req.query.data, 'Data') ?? avui();

donatiusRouter.get('/inventari', (req, res) => {
  res.json(llistaInventari(dataRefDe(req), req.query.baixes === '1'));
});

const COLUMNES_INVENTARI: [string, string][] = [
  ['id', 'Núm.'],
  ['descripcio', 'Descripció'],
  ['categoria', 'Categoria'],
  ['data_adquisicio', "Data d'adquisició"],
  ['valor', "Valor d'adquisició (€)"],
  ['procedencia', 'Procedència'],
  ['ubicacio', 'Ubicació'],
  ['estat', 'Estat'],
  ['vida_util_anys', 'Vida útil (anys)'],
  ['amortitzacio_any', "Amortització de l'any (€)"],
  ['acumulada', 'Amortització acumulada (€)'],
  ['net', 'Valor net comptable (€)'],
  ['data_baixa', 'Data de baixa'],
  ['motiu_baixa', 'Motiu de la baixa'],
];

donatiusRouter.get('/inventari/export.csv', (req, res) => {
  const dataRef = dataRefDe(req);
  const files = llistaInventari(dataRef, req.query.baixes === '1').map((b) => ({
    ...b,
    valor: centsAEuros(b.valor_adquisicio_cents),
    amortitzacio_any: centsAEuros(b.amortitzacio_any_cents),
    acumulada: centsAEuros(b.acumulada_cents),
    net: centsAEuros(b.net_cents),
  }));
  registra(req, 'exporta', 'inventari', null, `Inventari a ${dataRef} (CSV)`);
  sendCsv(res, `inventari-${dataRef}.csv`, toCsv(files, columnesTraduides(req, COLUMNES_INVENTARI)));
});

donatiusRouter.get('/inventari/:id', (req, res) => {
  const b = get<BeInventari & { foto: string | null }>(
    `SELECT ${COLS_INVENTARI}, i.foto FROM inventari i LEFT JOIN donatius d ON d.id = i.donatiu_id WHERE i.id = ?`,
    idParam(req),
  ) ?? notFound();
  res.json({ ...b, ...amortitzacio(b, avui()), amortitzacio_any_cents: amortitzacioAny(b, Number(avui().slice(0, 4))) });
});

donatiusRouter.post('/inventari', (req, res) => {
  const be = llegeixBe(req.body ?? {});
  const { id } = run(
    `INSERT INTO inventari (descripcio, categoria, data_adquisicio, valor_adquisicio_cents, procedencia, moviment_id, donatiu_id,
                            ubicacio, estat, vida_util_anys, data_baixa, motiu_baixa, foto, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    be.descripcio, be.categoria, be.data_adquisicio, be.valor_adquisicio_cents, be.procedencia, be.moviment_id, be.donatiu_id,
    be.ubicacio, be.estat, be.vida_util_anys, be.data_baixa, be.motiu_baixa, be.foto, be.notes,
  );
  registra(req, 'crea', 'inventari', id, be.descripcio);
  res.status(201).json({ id });
});

/** Crea un bé de l'inventari a partir d'una donació en espècie. */
donatiusRouter.post('/inventari/des-de-donatiu/:id', (req, res) => {
  const d = get<Donatiu>('SELECT * FROM donatius WHERE id = ?', idParam(req)) ?? notFound();
  if (!d.en_especie) throw new HttpError(400, 'Només es poden inventariar les donacions en espècie.');
  const ja = get<{ id: number }>('SELECT id FROM inventari WHERE donatiu_id = ?', d.id);
  if (ja) throw new HttpError(409, "Aquesta donació ja és a l'inventari.");
  const b = req.body ?? {};
  const be = llegeixBe({
    descripcio: d.descripcio_especie ?? d.nom,
    data_adquisicio: d.data,
    valor_adquisicio_cents: d.valoracio_cents ?? 0,
    procedencia: 'donacio',
    donatiu_id: d.id,
    categoria: b.categoria,
    ubicacio: b.ubicacio,
    vida_util_anys: b.vida_util_anys,
    notes: `Donació de ${d.nom}`,
  });
  const { id } = run(
    `INSERT INTO inventari (descripcio, categoria, data_adquisicio, valor_adquisicio_cents, procedencia, donatiu_id, ubicacio, estat, vida_util_anys, notes)
     VALUES (?, ?, ?, ?, 'donacio', ?, ?, 'bo', ?, ?)`,
    be.descripcio, be.categoria, be.data_adquisicio, be.valor_adquisicio_cents, d.id, be.ubicacio, be.vida_util_anys, be.notes,
  );
  registra(req, 'crea', 'inventari', id, `${be.descripcio} (donació ${d.id})`);
  res.status(201).json({ id });
});

donatiusRouter.put('/inventari/:id', (req, res) => {
  const id = idParam(req);
  const abans = get<{ foto: string | null }>('SELECT foto FROM inventari WHERE id = ?', id) ?? notFound();
  const body = req.body ?? {};
  // Si no s'envia el camp «foto», es conserva la que hi havia.
  const be = llegeixBe({ ...body, foto: 'foto' in body ? body.foto : abans.foto });
  run(
    `UPDATE inventari SET descripcio = ?, categoria = ?, data_adquisicio = ?, valor_adquisicio_cents = ?, procedencia = ?, moviment_id = ?,
            donatiu_id = ?, ubicacio = ?, estat = ?, vida_util_anys = ?, data_baixa = ?, motiu_baixa = ?, foto = ?, notes = ?
      WHERE id = ?`,
    be.descripcio, be.categoria, be.data_adquisicio, be.valor_adquisicio_cents, be.procedencia, be.moviment_id, be.donatiu_id,
    be.ubicacio, be.estat, be.vida_util_anys, be.data_baixa, be.motiu_baixa, be.foto, be.notes, id,
  );
  registra(req, 'modifica', 'inventari', id, be.descripcio + (be.data_baixa ? ` (baixa ${be.data_baixa})` : ''));
  res.json({ id });
});

donatiusRouter.delete('/inventari/:id', (req, res) => {
  const id = idParam(req);
  const b = get<{ descripcio: string }>('SELECT descripcio FROM inventari WHERE id = ?', id) ?? notFound();
  run('DELETE FROM inventari WHERE id = ?', id);
  registra(req, 'elimina', 'inventari', id, b.descripcio);
  res.status(204).end();
});

// ---------- Donació concreta (al final: «/:id» no ha de capturar les rutes anteriors) ----------

donatiusRouter.get('/:id', (req, res) => {
  res.json(obteDonatiu(idParam(req)));
});

donatiusRouter.put('/:id', (req, res) => {
  const id = idParam(req);
  const abans = get<Donatiu>('SELECT * FROM donatius WHERE id = ?', id) ?? notFound();
  const b = req.body ?? {};
  const d = llegeixDonatiu(b);
  if (teCertificats(id)) {
    const canvia = (['nom', 'nif', 'data', 'import_cents', 'en_especie', 'valoracio_cents', 'tipus_persona'] as const).some(
      (k) => (abans[k] ?? null) !== (d[k] ?? null),
    );
    if (canvia) throw new HttpError(409, "La donació ja té certificats emesos: no se'n poden canviar les dades certificades.");
  }
  if (d.en_especie && abans.moviment_id) throw new HttpError(400, 'Una donació en espècie no pot tenir un moviment de tresoreria.');
  tx(() => {
    let movimentId = abans.moviment_id;
    if (movimentId) {
      run(
        'UPDATE moviments SET data = ?, import_cents = ?, concepte = ?, soci_id = ? WHERE id = ?',
        d.data, d.import_cents, `Donació: ${d.nom}`, d.soci_id, movimentId,
      );
    } else if (!d.en_especie && bool(b.crea_moviment)) movimentId = creaMoviment(d, b);
    run(
      `UPDATE donatius SET soci_id = ?, nom = ?, nif = ?, tipus_persona = ?, adreca = ?, codi_postal = ?, poblacio = ?, codi_provincia = ?,
              data = ?, import_cents = ?, en_especie = ?, descripcio_especie = ?, valoracio_cents = ?, destinacio = ?, revocada = ?,
              data_revocacio = ?, moviment_id = ?, notes = ?
        WHERE id = ?`,
      d.soci_id, d.nom, d.nif, d.tipus_persona, d.adreca, d.codi_postal, d.poblacio, d.codi_provincia, d.data, d.import_cents,
      d.en_especie, d.descripcio_especie, d.valoracio_cents, d.destinacio, d.revocada, d.data_revocacio, movimentId, d.notes, id,
    );
  });
  registra(req, 'modifica', 'donatiu', id, `Donació de ${d.nom} (${d.data})${d.revocada && !abans.revocada ? ': revocada' : ''}`);
  res.json(obteDonatiu(id));
});

donatiusRouter.delete('/:id', (req, res) => {
  const id = idParam(req);
  const abans = get<Donatiu>('SELECT * FROM donatius WHERE id = ?', id) ?? notFound();
  if (teCertificats(id))
    throw new HttpError(409, 'La donació té certificats emesos: no es pot esborrar (podeu marcar-la com a revocada).');
  tx(() => {
    run('UPDATE inventari SET donatiu_id = NULL WHERE donatiu_id = ?', id);
    run('DELETE FROM donatius WHERE id = ?', id);
    if (abans.moviment_id && req.query.moviment === '1') run('DELETE FROM moviments WHERE id = ?', abans.moviment_id);
  });
  registra(req, 'elimina', 'donatiu', id, `Donació de ${abans.nom} (${abans.data})`);
  res.status(204).end();
});

