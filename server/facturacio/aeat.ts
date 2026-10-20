// Remissió dels registres de facturació a l'AEAT (servei web VERI*FACTU, SistemaFacturacion.wsdl).
// Cal el certificat electrònic de l'entitat (o del seu representant) en format .p12/.pfx.

import { request } from 'node:https';
import { all, getConfig, run, setConfig } from '../db.ts';
import { NS_LR, NS_SF, emissor } from './registres.ts';

const ENDPOINTS = {
  proves: 'https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
  produccio: 'https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
};

export const certificatConfigurat = () => Boolean(getConfig('fac_cert'));

let enviant = false;
let temporitzador: ReturnType<typeof setTimeout> | null = null;

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function sobre(registres: string[]) {
  const { nif, nom } = emissor();
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sfLR="${NS_LR}" xmlns:sf="${NS_SF}">` +
    `<soapenv:Header/><soapenv:Body><sfLR:RegFactuSistemaFacturacion>` +
    `<sfLR:Cabecera><sf:ObligadoEmision><sf:NombreRazon>${esc(nom.slice(0, 120))}</sf:NombreRazon><sf:NIF>${esc(nif)}</sf:NIF></sf:ObligadoEmision></sfLR:Cabecera>` +
    // Cada registre ja porta la seva declaració xmlns:sf; es treu per no repetir-la.
    registres.map((x) => `<sfLR:RegistroFactura>${x.replace(/ xmlns:sf="[^"]*"/, '')}</sfLR:RegistroFactura>`).join('') +
    `</sfLR:RegFactuSistemaFacturacion></soapenv:Body></soapenv:Envelope>`
  );
}

function post(url: string, cos: string): Promise<{ status: number; text: string }> {
  const pfx = Buffer.from(getConfig('fac_cert')!, 'base64');
  const passphrase = getConfig('fac_cert_contrasenya') ?? '';
  return new Promise((resol, rebutja) => {
    const req = request(
      url,
      {
        method: 'POST',
        pfx,
        passphrase,
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""', 'Content-Length': Buffer.byteLength(cos) },
        timeout: 60_000,
      },
      (res) => {
        const trossos: Buffer[] = [];
        res.on('data', (t) => trossos.push(t));
        res.on('end', () => resol({ status: res.statusCode ?? 0, text: Buffer.concat(trossos).toString('utf8') }));
      },
    );
    req.on('timeout', () => req.destroy(new Error("L'AEAT no ha respost a temps.")));
    req.on('error', rebutja);
    req.end(cos);
  });
}

/** Valor d'un element (sense tenir en compte el prefix de l'espai de noms). */
const valor = (xml: string, nom: string) => new RegExp(`<(?:\\w+:)?${nom}>([^<]*)</(?:\\w+:)?${nom}>`).exec(xml)?.[1] ?? null;
const blocs = (xml: string, nom: string) => xml.match(new RegExp(`<(?:\\w+:)?${nom}>[\\s\\S]*?</(?:\\w+:)?${nom}>`, 'g')) ?? [];

const ESTATS: Record<string, string> = { Correcto: 'correcte', AceptadoConErrores: 'acceptat_errors', Incorrecto: 'incorrecte' };

/**
 * Envia a l'AEAT tots els registres pendents (en ordre). Respecta el temps d'espera que indica
 * l'AEAT entre enviaments (TiempoEsperaEnvio).
 */
export async function enviaPendents(): Promise<{ enviats: number; correctes: number; errors: number; missatge: string }> {
  if (!certificatConfigurat()) throw new Error("Falta el certificat electrònic (Facturació → Configuració).");
  if (!emissor().nif) throw new Error("Falta el NIF de l'entitat.");
  if (enviant) throw new Error('Ja hi ha un enviament en curs.');
  const espera = getConfig('fac_proper_enviament');
  if (espera && espera > new Date().toISOString())
    throw new Error(`L'AEAT demana esperar fins a les ${new Date(espera).toLocaleTimeString('ca-ES')} abans del proper enviament.`);

  const pendents = all<{ id: number; tipus: string; num_serie: string; xml: string }>(
    "SELECT id, tipus, num_serie, xml FROM registres_facturacio WHERE estat_aeat = 'pendent' ORDER BY id LIMIT 1000",
  );
  if (!pendents.length) return { enviats: 0, correctes: 0, errors: 0, missatge: 'No hi ha registres pendents.' };

  enviant = true;
  try {
    const entorn = getConfig('fac_entorn') === 'produccio' ? 'produccio' : 'proves';
    const resposta = await post(ENDPOINTS[entorn], sobre(pendents.map((p) => p.xml)));
    const fault = valor(resposta.text, 'faultstring');
    if (fault || resposta.status >= 400) throw new Error(fault ?? `Resposta HTTP ${resposta.status}`);

    const espera = Number(valor(resposta.text, 'TiempoEsperaEnvio') ?? 60);
    setConfig('fac_proper_enviament', new Date(Date.now() + espera * 1000).toISOString());
    const csv = valor(resposta.text, 'CSV');
    const ara = new Date().toISOString();
    let correctes = 0;
    let errors = 0;
    for (const linia of blocs(resposta.text, 'RespuestaLinea')) {
      const numSerie = valor(linia, 'NumSerieFactura') ?? valor(linia, 'NumSerieFacturaAnulada');
      const tipusOp = valor(linia, 'TipoOperacion');
      const estat = ESTATS[valor(linia, 'EstadoRegistro') ?? ''] ?? 'incorrecte';
      const error = [valor(linia, 'CodigoErrorRegistro'), valor(linia, 'DescripcionErrorRegistro')].filter(Boolean).join(': ') || null;
      const reg = pendents.find((p) => p.num_serie === numSerie && (tipusOp === 'Anulacion' ? p.tipus === 'anulacio' : p.tipus === 'alta'));
      if (!reg) continue;
      run(
        'UPDATE registres_facturacio SET estat_aeat = ?, csv_aeat = ?, error_aeat = ?, enviat_el = ? WHERE id = ?',
        estat, csv, error, ara, reg.id,
      );
      if (estat === 'incorrecte') errors++;
      else correctes++;
    }
    setConfig('fac_darrer_error', '');
    return {
      enviats: pendents.length,
      correctes,
      errors,
      missatge: `Enviament ${valor(resposta.text, 'EstadoEnvio') ?? ''}: ${correctes} correctes, ${errors} amb errors.`,
    };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    setConfig('fac_darrer_error', `${new Date().toLocaleString('ca-ES')}: ${m}`);
    throw new Error(`No s'ha pogut enviar a l'AEAT: ${m}`);
  } finally {
    enviant = false;
  }
}

/** Després d'emetre o anul·lar, intenta enviar al cap d'uns segons (si hi ha certificat). */
export function programaEnviament() {
  if (!certificatConfigurat() || getConfig('fac_enviament_auto') === '0') return;
  if (temporitzador) clearTimeout(temporitzador);
  const espera = getConfig('fac_proper_enviament');
  const ms = Math.max(5_000, espera ? new Date(espera).getTime() - Date.now() + 1_000 : 0);
  temporitzador = setTimeout(() => {
    temporitzador = null;
    enviaPendents().catch(() => {}); // l'error queda desat a fac_darrer_error
  }, ms);
}
