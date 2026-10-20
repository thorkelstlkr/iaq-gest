// Calendari d'obligacions legals i fiscals de l'any: assemblea ordinària, models de l'AEAT, comunicacions
// al Registre d'Associacions, renovació d'assegurances i justificació de subvencions.
//
// GET /api/calendari?any=2026 → [{ clau, data, titol, descripcio, valors, estat, enllac, manual }]
// L'estat es calcula quan el programa ho sap (fet / pendent / no_aplica); si no, és «desconegut».
// Les obligacions que el programa no pot comprovar (p. ex. si s'ha presentat un model) es poden marcar
// com a fetes a mà: POST /api/calendari/marca { any, clau, fet }.
//
// Les taules d'altres mòduls que poden no existir (assegurances, subvencions, dades fiscals) es consulten
// només si hi són.
import { Router } from 'express';
import { all, get, getConfig, setConfig } from './db.ts';
import { avui, dataLocal } from '../shared/dates.ts';
import { informeFiscal } from './tresoreria/fiscal.ts';
import { registra } from './auditoria.ts';
import { HttpError, text } from './util.ts';

export type EstatObligacio = 'fet' | 'pendent' | 'no_aplica' | 'desconegut';

export interface ItemCalendari {
  clau: string;
  data: string;
  /** Text en català amb {0}, {1}… (els mateixos valors per al títol i la descripció). */
  titol: string;
  descripcio: string | null;
  valors: (string | number)[];
  estat: EstatObligacio;
  enllac: string | null;
  /** Es pot marcar com a fet a mà. */
  manual: boolean;
}

export const taulaExisteix = (nom: string) =>
  Boolean(get("SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = ?", nom));

const teColumnes = (taula: string, columnes: string[]) => {
  if (!taulaExisteix(taula)) return false;
  const cols = new Set(all<{ name: string }>(`PRAGMA table_info(${taula})`).map((c) => c.name));
  return columnes.every((c) => cols.has(c));
};

const clauFets = (any: number) => `calendari_fets_${any}`;

export function marquesManuals(any: number): Set<string> {
  try {
    const v = JSON.parse(getConfig(clauFets(any)) ?? '[]');
    return new Set(Array.isArray(v) ? v.map(String) : []);
  } catch {
    return new Set();
  }
}

const darrerDiaFebrer = (any: number) => dataLocal(new Date(any, 2, 0));
const sumaDiesA = (iso: string, dies: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return dataLocal(new Date(y, m - 1, d + dies));
};

/** Trimestre natural: [inici, fi]. */
const trimestre = (any: number, t: number): [string, string] => {
  const mesInici = (t - 1) * 3 + 1;
  return [`${any}-${String(mesInici).padStart(2, '0')}-01`, dataLocal(new Date(any, mesInici + 2, 0))];
};

/** Retencions practicades en un període: 111 (professionals i altres) i 115 (lloguers). Null si no se'n sap res. */
function retencions(de: string, fins: string): { r111: number; r115: number } | null {
  if (teColumnes('moviments_fiscal', ['moviment_id', 'retencio_cents', 'tipus_retencio'])) {
    const r = get<{ r111: number; r115: number }>(
      `SELECT COALESCE(SUM(CASE WHEN COALESCE(f.tipus_retencio, 'professional') <> 'arrendament' THEN f.retencio_cents END), 0) AS r111,
              COALESCE(SUM(CASE WHEN f.tipus_retencio = 'arrendament' THEN f.retencio_cents END), 0) AS r115
         FROM moviments_fiscal f JOIN moviments m ON m.id = f.moviment_id
        WHERE f.retencio_cents > 0 AND m.data BETWEEN ? AND ?`,
      de, fins,
    )!;
    return r;
  }
  return null;
}

const pagamentRegistrat = (model: '111' | '115', any: number, t: number) =>
  teColumnes('fiscal_pagaments', ['model', 'exercici', 'trimestre']) &&
  Boolean(get('SELECT 1 AS x FROM fiscal_pagaments WHERE model = ? AND exercici = ? AND trimestre = ?', model, any, t));

/** Calcula les obligacions de l'any `any`; `hui` permet fixar la data d'avui (proves). */
export function calendari(any: number, hui: string = avui()): ItemCalendari[] {
  const items: ItemCalendari[] = [];
  const fets = marquesManuals(any);
  const afegeix = (i: Omit<ItemCalendari, 'manual' | 'valors'> & { manual?: boolean; valors?: (string | number)[] }) => {
    const manual = i.manual ?? false;
    const estat = manual && (i.estat === 'pendent' || i.estat === 'desconegut') && fets.has(i.clau) ? 'fet' : i.estat;
    items.push({ ...i, valors: i.valors ?? [], manual, estat });
  };
  const anterior = any - 1;

  // ---------- Assemblea general ordinària (comptes de l'any anterior i pressupost) ----------
  if (taulaExisteix('reunions')) {
    const feta = get<{ data: string }>(
      "SELECT data FROM reunions WHERE organ = 'assemblea' AND tipus = 'ordinaria' AND estat = 'celebrada' AND data BETWEEN ? AND ? ORDER BY data LIMIT 1",
      `${any}-01-01`, `${any}-12-31`,
    );
    afegeix({
      clau: 'assemblea',
      data: `${any}-06-30`,
      titol: 'Assemblea general ordinària',
      descripcio: "Aprovació dels comptes de {0} i del pressupost de {1}. Abans del 30 de juny (o el termini que fixin els estatuts).",
      valors: [anterior, any],
      estat: feta ? 'fet' : 'pendent',
      enllac: '/governanca',
    });
  }

  // ---------- Retencions trimestrals (models 111 i 115) ----------
  const trimestres: [number, number, string][] = [
    [anterior, 4, `${any}-01-20`],
    [any, 1, `${any}-04-20`],
    [any, 2, `${any}-07-20`],
    [any, 3, `${any}-10-20`],
  ];
  const ret = { r111: 0, r115: 0, sabut: false };
  for (const [a, t, termini] of trimestres) {
    const [de, fins] = trimestre(a, t);
    const r = retencions(de, fins);
    let estat: EstatObligacio = 'desconegut';
    let descripcio = "Només si s'han practicat retencions d'IRPF a professionals o artistes (model 111) o sobre lloguers (model 115).";
    if (r) {
      if (r.r111 || r.r115) {
        const models = [r.r111 ? '111' : null, r.r115 ? '115' : null].filter(Boolean) as ('111' | '115')[];
        estat = models.every((m) => pagamentRegistrat(m, a, t)) ? 'fet' : 'pendent';
        descripcio = models.length === 2 ? 'Cal presentar els models 111 i 115.' : models[0] === '111' ? 'Cal presentar el model 111.' : 'Cal presentar el model 115.';
      } else if (fins < hui) {
        estat = 'no_aplica';
        descripcio = "No consta cap retenció practicada en aquest trimestre.";
      }
    }
    afegeix({
      clau: `retencions_${a}_${t}`,
      data: termini,
      titol: 'Retencions trimestrals (models 111 i 115): {0}T {1}',
      descripcio,
      valors: [t, a],
      estat,
      enllac: '/tresoreria',
      manual: true,
    });
  }

  // ---------- Resums anuals de retencions (190 i 180) de l'any anterior ----------
  const anual = retencions(`${anterior}-01-01`, `${anterior}-12-31`);
  if (anual) {
    ret.r111 = anual.r111;
    ret.r115 = anual.r115;
    ret.sabut = true;
  }
  afegeix({
    clau: 'model190',
    data: `${any}-01-31`,
    titol: 'Resum anual de retencions a professionals (model 190) de {0}',
    descripcio: ret.sabut && !ret.r111 ? "No consta cap retenció a professionals l'any {0}." : "Només si l'any {0} es van practicar retencions (model 111).",
    valors: [anterior],
    estat: ret.sabut ? (ret.r111 ? 'pendent' : 'no_aplica') : 'desconegut',
    enllac: '/tresoreria',
    manual: true,
  });
  afegeix({
    clau: 'model180',
    data: `${any}-01-31`,
    titol: 'Resum anual de retencions sobre lloguers (model 180) de {0}',
    descripcio: ret.sabut && !ret.r115 ? "No consta cap retenció sobre lloguers l'any {0}." : "Només si l'any {0} es van practicar retencions sobre lloguers (model 115).",
    valors: [anterior],
    estat: ret.sabut ? (ret.r115 ? 'pendent' : 'no_aplica') : 'desconegut',
    enllac: '/tresoreria',
    manual: true,
  });

  // ---------- Model 182 (donatius) de l'any anterior ----------
  const regim = getConfig('regim_49_2002') === 'si';
  const donacions = taulaExisteix('donatius')
    ? get<{ n: number }>('SELECT COUNT(*) AS n FROM donatius WHERE revocada = 0 AND data BETWEEN ? AND ?', `${anterior}-01-01`, `${anterior}-12-31`)!.n
    : 0;
  afegeix({
    clau: 'model182',
    data: `${any}-01-31`,
    titol: 'Declaració informativa de donatius (model 182) de {0}',
    descripcio: !regim
      ? "L'entitat no està acollida al règim de la Llei 49/2002."
      : donacions
        ? '{1} donacions rebudes.'
        : "No consten donacions l'any {0}.",
    valors: [anterior, donacions],
    estat: regim && donacions ? 'pendent' : 'no_aplica',
    enllac: '/donatius',
    manual: true,
  });

  // ---------- Model 347 (operacions amb tercers > 3.005,06 €) de l'any anterior ----------
  let estat347: EstatObligacio = 'desconegut';
  let tercers347 = 0;
  if (teColumnes('moviments_fiscal', ['moviment_id', 'tercer_id', 'retencio_cents'])) {
    tercers347 = all(
      `SELECT f.tercer_id FROM moviments_fiscal f JOIN moviments m ON m.id = f.moviment_id
        WHERE f.tercer_id IS NOT NULL AND f.retencio_cents = 0 AND m.data BETWEEN ? AND ?
        GROUP BY f.tercer_id HAVING SUM(m.import_cents) > 300506`,
      `${anterior}-01-01`, `${anterior}-12-31`,
    ).length;
    estat347 = tercers347 ? 'pendent' : 'no_aplica';
  }
  afegeix({
    clau: 'model347',
    data: darrerDiaFebrer(any),
    titol: 'Operacions amb tercers (model 347) de {0}',
    descripcio: tercers347
      ? '{1} proveïdors o clients amb operacions de més de 3.005,06 €.'
      : estat347 === 'no_aplica'
        ? 'No consta cap tercer amb operacions de més de 3.005,06 € (sense retenció).'
        : 'Només si amb algun proveïdor o client s\'han superat 3.005,06 € en tot l\'any.',
    valors: [anterior, tercers347],
    estat: estat347,
    enllac: '/tresoreria',
    manual: true,
  });

  // ---------- Impost de Societats (model 200) de l'any anterior ----------
  const movimentsAnterior = Boolean(get('SELECT 1 AS x FROM moviments WHERE data BETWEEN ? AND ?', `${anterior}-01-01`, `${anterior}-12-31`));
  let obligat200: boolean | null = null;
  if (movimentsAnterior) {
    try {
      obligat200 = informeFiscal(anterior).obligat;
    } catch {
      obligat200 = null;
    }
  }
  afegeix({
    clau: 'model200',
    data: `${any}-07-25`,
    titol: 'Impost de Societats (model 200) de {0}',
    descripcio:
      obligat200 === false || !movimentsAnterior
        ? "No és obligatori presentar-lo: ingressos inferiors a 75.000 € i rendes no exemptes inferiors a 2.000 € amb retenció (art. 124.3 LIS)."
        : obligat200
          ? "L'entitat està obligada a presentar-lo (vegeu Tresoreria → Fiscalitat)."
          : null,
    valors: [anterior],
    estat: obligat200 ? 'pendent' : obligat200 === false || !movimentsAnterior ? 'no_aplica' : 'desconegut',
    enllac: '/tresoreria',
    manual: true,
  });

  // ---------- Canvis de la junta pendents de comunicar al Registre d'Associacions ----------
  if (teColumnes('carrecs', ['comunicat_registre_el', 'data_eleccio']) && any === Number(hui.slice(0, 4))) {
    const p = get<{ n: number; primera: string | null }>(
      `SELECT COUNT(*) AS n, MIN(d) AS primera FROM (
         SELECT data_eleccio AS d FROM carrecs WHERE comunicat_registre_el IS NULL AND data_eleccio <= ?
         UNION ALL
         SELECT data_cessament FROM carrecs WHERE data_cessament IS NOT NULL AND data_cessament <= ? AND cessament_comunicat_el IS NULL)`,
      hui, hui,
    )!;
    if (p.n && p.primera) {
      const termini = sumaDiesA(p.primera, 30);
      afegeix({
        clau: 'registre_junta',
        data: termini < `${any}-01-01` ? `${any}-01-01` : termini,
        titol: "Comunicar els canvis de la junta al Registre d'Associacions",
        descripcio: '{0} nomenaments o cessaments pendents de comunicar.',
        valors: [p.n],
        estat: 'pendent',
        enllac: '/governanca',
      });
    }
  }
  if (teColumnes('carrecs', ['comunicat_registre_el'])) {
    const comunicat = get<{ n: number; darrera: string | null }>(
      `SELECT COUNT(*) AS n, MAX(d) AS darrera FROM (
         SELECT substr(comunicat_registre_el, 1, 10) AS d FROM carrecs WHERE comunicat_registre_el BETWEEN ? AND ?
         UNION ALL
         SELECT substr(cessament_comunicat_el, 1, 10) FROM carrecs WHERE cessament_comunicat_el BETWEEN ? AND ?)`,
      `${any}-01-01`, `${any}-12-31 99`, `${any}-01-01`, `${any}-12-31 99`,
    )!;
    if (comunicat.n && comunicat.darrera)
      afegeix({
        clau: 'registre_junta_fet',
        data: comunicat.darrera,
        titol: "Canvis de la junta comunicats al Registre d'Associacions",
        descripcio: '{0} comunicacions.',
        valors: [comunicat.n],
        estat: 'fet',
        enllac: '/governanca',
      });
  }

  // ---------- Assegurances (taula opcional) ----------
  if (teColumnes('assegurances', ['id', 'asseguradora', 'data_venciment'])) {
    const ambTipus = teColumnes('assegurances', ['tipus']);
    const ambNoRenovar = teColumnes('assegurances', ['no_renovar']);
    const polisses = all<{ id: number; asseguradora: string; data_venciment: string; tipus: string | null; renovada: number }>(
      `SELECT a.id, a.asseguradora, a.data_venciment, ${ambTipus ? 'a.tipus' : 'NULL'} AS tipus,
              EXISTS (SELECT 1 FROM assegurances b WHERE b.id <> a.id AND b.data_venciment > a.data_venciment
                         ${ambTipus ? 'AND b.tipus = a.tipus' : 'AND b.asseguradora = a.asseguradora'}) AS renovada
         FROM assegurances a
        WHERE a.data_venciment BETWEEN ? AND ? ${ambNoRenovar ? 'AND a.no_renovar = 0' : ''}`,
      `${any}-01-01`, `${any}-12-31`,
    );
    for (const a of polisses)
      afegeix({
        clau: `asseguranca_${a.id}`,
        data: a.data_venciment,
        titol: "Renovació de l'assegurança: {0}",
        descripcio: null,
        valors: [a.asseguradora],
        estat: a.renovada ? 'fet' : 'pendent',
        enllac: '/voluntariat',
        manual: true,
      });
  }

  // ---------- Justificació de subvencions (taula opcional) ----------
  if (teColumnes('subvencions', ['id', 'organisme', 'termini_justificacio'])) {
    const ambEstat = teColumnes('subvencions', ['estat']);
    const ambData = teColumnes('subvencions', ['data_justificacio']);
    const ambConv = teColumnes('subvencions', ['convocatoria']);
    const subv = all<{ id: number; organisme: string; convocatoria: string | null; termini_justificacio: string; estat: string | null; data_justificacio: string | null }>(
      `SELECT id, organisme, ${ambConv ? 'convocatoria' : 'NULL'} AS convocatoria, termini_justificacio,
              ${ambEstat ? 'estat' : 'NULL'} AS estat, ${ambData ? 'data_justificacio' : 'NULL'} AS data_justificacio
         FROM subvencions WHERE termini_justificacio BETWEEN ? AND ?`,
      `${any}-01-01`, `${any}-12-31`,
    );
    for (const s of subv) {
      if (s.estat && ['preparacio', 'sollicitada', 'denegada'].includes(s.estat)) continue;
      const feta = Boolean(s.data_justificacio) || (s.estat !== null && ['justificada', 'tancada', 'reintegrament'].includes(s.estat));
      afegeix({
        clau: `subvencio_${s.id}`,
        data: s.termini_justificacio,
        titol: 'Justificació de la subvenció: {0}',
        descripcio: null,
        valors: [[s.organisme, s.convocatoria].filter(Boolean).join(' · ')],
        estat: feta ? 'fet' : 'pendent',
        enllac: '/subvencions',
      });
    }
  }

  return items.sort((a, b) => a.data.localeCompare(b.data) || a.clau.localeCompare(b.clau));
}

export const calendariRouter = Router();

const anyDe = (v: unknown) => {
  const any = Number(v ?? avui().slice(0, 4));
  if (!Number.isInteger(any) || any < 1900 || any > 3000) throw new HttpError(400, 'Any no vàlid.');
  return any;
};

calendariRouter.get('/', (req, res) => {
  res.json(calendari(anyDe(req.query.any)));
});

/** Marca (o desmarca) com a feta una obligació que el programa no pot comprovar. */
calendariRouter.post('/marca', (req, res) => {
  const any = anyDe(req.body?.any);
  const clau = text(req.body?.clau);
  const item = calendari(any).find((i) => i.clau === clau);
  if (!clau || !item) throw new HttpError(404, 'No trobat.');
  if (!item.manual) throw new HttpError(400, 'Aquesta obligació no es pot marcar a mà.');
  const fets = marquesManuals(any);
  if (req.body?.fet) fets.add(clau);
  else fets.delete(clau);
  setConfig(clauFets(any), JSON.stringify([...fets]));
  registra(req, 'configura', 'calendari', null, `${clau} ${any}: ${req.body?.fet ? 'fet' : 'pendent'}`);
  res.json(calendari(any));
});
