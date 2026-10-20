import { Router } from 'express';
import { all, get } from '../db.ts';
import { columnesTraduides, exerciciParam, sendCsv, toCsv } from '../util.ts';
import { idiomaDe, tr } from '../i18n.ts';
import { fluxosComptes, saldosActuals } from './comptabilitat.ts';
import { FRANGES, SELECT_ACTIVITATS, SENSE_DATA, edatA, franjaEdat } from './activitats.ts';
import type { InformeEconomic, Tauler } from '../../shared/types.ts';
import { avui as dataAvui } from '../../shared/dates.ts';

export const informesRouter = Router();

const EDAT = `((CAST(strftime('%Y', $ref) AS INTEGER) - CAST(strftime('%Y', s.data_naixement) AS INTEGER))
  - (strftime('%m-%d', $ref) < strftime('%m-%d', s.data_naixement)))`;

const FRANJA = `CASE
  WHEN s.data_naixement IS NULL THEN 'Sense data'
  WHEN ${EDAT} < 14 THEN 'Infants (0-13)'
  WHEN ${EDAT} < 30 THEN 'Joves (14-29)'
  WHEN ${EDAT} < 65 THEN 'Adults (30-64)'
  ELSE 'Gent gran (65+)' END`;

const ORDRE_FRANGES = ['Infants (0-13)', 'Joves (14-29)', 'Adults (30-64)', 'Gent gran (65+)', 'Sense data'];

/** Socis actius en una data de referència, agrupats per franja d'edat i per gènere. */
function composicioSocis(ref: string) {
  const actiu = 's.data_alta <= $ref AND (s.data_baixa IS NULL OR s.data_baixa > $ref)';
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM socis s WHERE ${actiu}`, { ref })!.n;
  const perFranja = all<{ franja: string; total: number }>(
    `SELECT ${FRANJA} AS franja, COUNT(*) AS total FROM socis s WHERE ${actiu} GROUP BY franja`,
    { ref },
  );
  const per_franja = ORDRE_FRANGES.map((f) => ({ franja: f, total: perFranja.find((r) => r.franja === f)?.total ?? 0 }));
  const per_genere = all<{ genere: string; total: number }>(
    `SELECT COALESCE(s.genere, 'nc') AS genere, COUNT(*) AS total FROM socis s WHERE ${actiu} GROUP BY 1 ORDER BY 2 DESC`,
    { ref },
  );
  return { total, per_franja, per_genere };
}

function sumaTipus(tipus: string, inici: string, fi: string) {
  return get<{ t: number }>(
    'SELECT COALESCE(SUM(import_cents), 0) AS t FROM moviments WHERE tipus = ? AND data BETWEEN ? AND ?',
    tipus, inici, fi,
  )!.t;
}

informesRouter.get('/tauler', (req, res) => {
  const exercici = exerciciParam(req);
  const inici = `${exercici}-01-01`;
  const fi = `${exercici}-12-31`;
  const avui = dataAvui();
  // Per a exercicis passats, la composició es mostra a 31 de desembre.
  const ref = fi < avui ? fi : avui;
  const comp = composicioSocis(ref);
  const q = get<Tauler['quotes']>(
    `SELECT
       COALESCE(SUM(estat = 'pendent'), 0) AS pendents,
       COALESCE(SUM(CASE WHEN estat = 'pendent' THEN import_cents END), 0) AS pendent_cents,
       COALESCE(SUM(CASE WHEN estat = 'pagada' THEN import_cents END), 0) AS cobrat_cents,
       COALESCE(SUM(CASE WHEN estat <> 'exempta' THEN import_cents END), 0) AS previst_cents
     FROM quotes WHERE exercici = ?`,
    exercici,
  )!;
  const tauler: Tauler = {
    exercici,
    socis_actius: comp.total,
    altes_exercici: get<{ n: number }>("SELECT COUNT(*) AS n FROM socis WHERE estat_admissio = 'admesa' AND data_alta BETWEEN ? AND ?", inici, fi)!.n,
    baixes_exercici: get<{ n: number }>("SELECT COUNT(*) AS n FROM socis WHERE estat_admissio = 'admesa' AND data_baixa BETWEEN ? AND ?", inici, fi)!.n,
    per_franja: comp.per_franja,
    per_genere: comp.per_genere,
    quotes: q,
    ingressos_cents: sumaTipus('ingres', inici, fi),
    despeses_cents: sumaTipus('despesa', inici, fi),
    comptes: saldosActuals().filter((c) => c.actiu),
    darrers_moviments: all(
      `SELECT m.*, c.nom AS categoria_nom FROM moviments m LEFT JOIN categories c ON c.id = m.categoria_id
        ORDER BY m.data DESC, m.id DESC LIMIT 8`,
    ),
    properes_activitats: all(
      `${SELECT_ACTIVITATS} WHERE COALESCE(a.data_fi, a.data_inici) >= ? AND a.estat <> 'anul·lada' ORDER BY a.data_inici LIMIT 5`,
      avui,
    ),
  };
  res.json(tauler);
});

informesRouter.get('/economic', (req, res) => {
  const exercici = exerciciParam(req);
  const inici = `${exercici}-01-01`;
  const fi = `${exercici}-12-31`;
  const perCategoria = (tipus: string) =>
    all<{ categoria: string; total_cents: number }>(
      `SELECT COALESCE(c.nom, 'Sense categoria') AS categoria, SUM(m.import_cents) AS total_cents
         FROM moviments m LEFT JOIN categories c ON c.id = m.categoria_id
        WHERE m.tipus = ? AND m.data BETWEEN ? AND ?
        GROUP BY 1 ORDER BY 2 DESC`,
      tipus, inici, fi,
    );
  const ingressos = perCategoria('ingres');
  const despeses = perCategoria('despesa');

  // Saldo a 1 de gener = saldo inicial + tots els moviments anteriors a l'exercici.
  const abans = fluxosComptes(null, `${exercici - 1}-12-31`);
  const durant = fluxosComptes(inici, fi);
  const comptes = durant.map((c) => {
    const a = abans.find((x) => x.id === c.id)!;
    const saldo_inicial_cents = c.saldo_inicial_cents + a.entrades_cents - a.sortides_cents;
    return {
      nom: c.nom,
      saldo_inicial_cents,
      entrades_cents: c.entrades_cents,
      sortides_cents: c.sortides_cents,
      saldo_final_cents: saldo_inicial_cents + c.entrades_cents - c.sortides_cents,
    };
  });

  const activitats = all<{ nom: string; ingressos_cents: number; despeses_cents: number }>(
    `SELECT a.nom,
       COALESCE(SUM(CASE WHEN m.tipus = 'ingres' THEN m.import_cents END), 0) AS ingressos_cents,
       COALESCE(SUM(CASE WHEN m.tipus = 'despesa' THEN m.import_cents END), 0) AS despeses_cents
     FROM moviments m JOIN activitats a ON a.id = m.activitat_id
     WHERE m.data BETWEEN ? AND ?
     GROUP BY a.id ORDER BY a.data_inici`,
    inici, fi,
  );

  const informe: InformeEconomic = {
    exercici,
    ingressos,
    despeses,
    total_ingressos_cents: ingressos.reduce((s, r) => s + r.total_cents, 0),
    total_despeses_cents: despeses.reduce((s, r) => s + r.total_cents, 0),
    comptes,
    activitats,
  };
  res.json(informe);
});

informesRouter.get('/memoria', (req, res) => {
  const exercici = exerciciParam(req);
  const inici = `${exercici}-01-01`;
  const fi = `${exercici}-12-31`;
  const avui = dataAvui();
  res.json({
    exercici,
    socis: composicioSocis(fi < avui ? fi : avui),
    // Les activitats anul·lades no formen part de la memòria.
    activitats: all(
      `${SELECT_ACTIVITATS} WHERE a.data_inici BETWEEN ? AND ? AND a.estat <> 'anul·lada' ORDER BY a.data_inici`,
      inici, fi,
    ),
    indicadors: indicadorsImpacte(inici, fi),
  });
});

// ---------- Indicadors d'impacte (assistència real) ----------

export interface IndicadorsActivitat {
  id: number;
  nom: string;
  data_inici: string;
  data_fi: string | null;
  estat: string;
  objectius: string;
  inscrits: number;
  assistents_inscrits: number;
  assistents_anonims: number;
  /** Assistents inscrits + anònims; si no hi ha inscripcions (o no s'ha passat llista), els participants escrits a mà. */
  total_assistents: number;
  font: 'assistencia' | 'manual' | 'cap';
  per_franja: Record<string, number>;
  per_genere: Record<string, number>;
  socis: number;
  no_socis: number;
  /** Franges d'edat (sense «Sense data») presents entre els assistents. */
  generacions: string[];
  intergeneracional: boolean;
  ingressos_cents: number;
  despeses_cents: number;
  pressupost_cents: number | null;
}

export interface IndicadorsImpacte {
  activitats: IndicadorsActivitat[];
  totals: {
    activitats: number;
    activitats_amb_assistencia: number;
    activitats_intergeneracionals: number;
    total_assistents: number;
    assistents_inscrits: number;
    assistents_anonims: number;
    assistents_manuals: number;
    persones_uniques: number;
    socis_unics: number;
    no_socis_unics: number;
    assistencies_socis: number;
    assistencies_no_socis: number;
    per_franja: { franja: string; assistencies: number; persones: number }[];
    per_genere: { genere: string; assistencies: number; persones: number }[];
  };
}

const ORDRE_GENERES = ['dona', 'home', 'altre', 'nc'];

/** Indicadors d'impacte de les activitats (no anul·lades) d'un període, a partir de l'assistència registrada. */
export function indicadorsImpacte(inici: string, fi: string): IndicadorsImpacte {
  const acts = all<{
    id: number; nom: string; data_inici: string; data_fi: string | null; estat: string; objectius: string;
    participants: number | null; assistents_anonims: number; pressupost_cents: number | null;
    ingressos_cents: number; despeses_cents: number; inscrits: number;
  }>(
    `SELECT a.id, a.nom, a.data_inici, a.data_fi, a.estat, a.objectius, a.participants, a.assistents_anonims, a.pressupost_cents,
       COALESCE((SELECT SUM(import_cents) FROM moviments WHERE activitat_id = a.id AND tipus = 'ingres'), 0) AS ingressos_cents,
       COALESCE((SELECT SUM(import_cents) FROM moviments WHERE activitat_id = a.id AND tipus = 'despesa'), 0) AS despeses_cents,
       (SELECT COUNT(*) FROM participacions WHERE activitat_id = a.id AND estat = 'inscrit') AS inscrits
     FROM activitats a WHERE a.data_inici BETWEEN ? AND ? AND a.estat <> 'anul·lada' ORDER BY a.data_inici, a.id`,
    inici, fi,
  );
  const assistents = all<{
    activitat_id: number; soci_id: number | null; interessat_id: number | null; nom_extern: string | null;
    naixement: string | null; genere: string; data_activitat: string;
  }>(
    `SELECT p.activitat_id, p.soci_id, p.interessat_id, p.nom_extern, a.data_inici AS data_activitat,
       COALESCE(s.data_naixement, p.data_naixement) AS naixement, COALESCE(s.genere, p.genere, 'nc') AS genere
     FROM participacions p JOIN activitats a ON a.id = p.activitat_id LEFT JOIN socis s ON s.id = p.soci_id
     WHERE a.data_inici BETWEEN ? AND ? AND a.estat <> 'anul·lada' AND p.estat <> 'cancel·lat' AND p.assistit = 1`,
    inici, fi,
  );

  const franges = [...FRANGES, SENSE_DATA];
  const zero = (claus: readonly string[]) => Object.fromEntries(claus.map((k) => [k, 0])) as Record<string, number>;
  // Una mateixa persona en diverses activitats compta una sola vegada a «persones úniques».
  const persones = new Map<string, { soci: boolean; franja: string; genere: string }>();
  const totFranja = zero(franges);
  const totGenere = zero(ORDRE_GENERES);
  let assistenciesSocis = 0;

  const perActivitat = acts.map((a): IndicadorsActivitat => {
    const seus = assistents.filter((p) => p.activitat_id === a.id);
    const per_franja = zero(franges);
    const per_genere = zero(ORDRE_GENERES);
    let socis = 0;
    for (const p of seus) {
      const franja = franjaEdat(edatA(p.naixement, p.data_activitat));
      const genere = ORDRE_GENERES.includes(p.genere) ? p.genere : 'nc';
      per_franja[franja]++;
      per_genere[genere]++;
      totFranja[franja]++;
      totGenere[genere]++;
      if (p.soci_id) socis++;
      const clau = p.soci_id
        ? `s${p.soci_id}`
        : p.interessat_id
          ? `i${p.interessat_id}`
          : `e${(p.nom_extern ?? '').trim().toLowerCase()}|${p.naixement ?? ''}`;
      if (!persones.has(clau)) persones.set(clau, { soci: Boolean(p.soci_id), franja, genere });
    }
    assistenciesSocis += socis;
    const generacions = FRANGES.filter((f) => per_franja[f] > 0);
    const registrats = seus.length;
    // Sense inscripcions (o sense haver passat llista) es manté el nombre de participants escrit a mà.
    const manual = registrats === 0 && a.assistents_anonims === 0 && a.participants !== null;
    return {
      id: a.id,
      nom: a.nom,
      data_inici: a.data_inici,
      data_fi: a.data_fi,
      estat: a.estat,
      objectius: a.objectius,
      inscrits: a.inscrits,
      assistents_inscrits: registrats,
      assistents_anonims: a.assistents_anonims,
      total_assistents: manual ? (a.participants ?? 0) : registrats + a.assistents_anonims,
      font: manual ? 'manual' : registrats + a.assistents_anonims > 0 ? 'assistencia' : 'cap',
      per_franja,
      per_genere,
      socis,
      no_socis: registrats - socis,
      generacions,
      intergeneracional: generacions.length >= 2,
      ingressos_cents: a.ingressos_cents,
      despeses_cents: a.despeses_cents,
      pressupost_cents: a.pressupost_cents,
    };
  });

  const unics = [...persones.values()];
  const suma = (f: (a: IndicadorsActivitat) => number) => perActivitat.reduce((s, a) => s + f(a), 0);
  return {
    activitats: perActivitat,
    totals: {
      activitats: perActivitat.length,
      activitats_amb_assistencia: perActivitat.filter((a) => a.font !== 'cap').length,
      activitats_intergeneracionals: perActivitat.filter((a) => a.intergeneracional).length,
      total_assistents: suma((a) => a.total_assistents),
      assistents_inscrits: suma((a) => a.assistents_inscrits),
      assistents_anonims: suma((a) => a.assistents_anonims),
      assistents_manuals: suma((a) => (a.font === 'manual' ? a.total_assistents : 0)),
      persones_uniques: unics.length,
      socis_unics: unics.filter((p) => p.soci).length,
      no_socis_unics: unics.filter((p) => !p.soci).length,
      assistencies_socis: assistenciesSocis,
      assistencies_no_socis: assistents.length - assistenciesSocis,
      per_franja: franges.map((f) => ({ franja: f, assistencies: totFranja[f], persones: unics.filter((p) => p.franja === f).length })),
      per_genere: ORDRE_GENERES.map((g) => ({ genere: g, assistencies: totGenere[g], persones: unics.filter((p) => p.genere === g).length })),
    },
  };
}

informesRouter.get('/indicadors', (req, res) => {
  const exercici = exerciciParam(req);
  res.json(indicadorsImpacte(`${exercici}-01-01`, `${exercici}-12-31`));
});

const ESTATS_CSV: Record<string, string> = {
  idea: 'Idea', preparacio: 'En preparació', confirmada: 'Confirmada', feta: 'Feta', 'anul·lada': 'Anul·lada',
};
const FONTS_CSV: Record<string, string> = { assistencia: "Llista d'assistència", manual: 'Recompte manual', cap: 'Sense dades' };

/** Indicadors per activitat en CSV (per justificar subvencions). */
informesRouter.get('/indicadors.csv', (req, res) => {
  const exercici = exerciciParam(req);
  const idioma = idiomaDe(req);
  const { activitats } = indicadorsImpacte(`${exercici}-01-01`, `${exercici}-12-31`);
  const euros = (c: number | null) => (c === null ? '' : (c / 100).toFixed(2).replace('.', ','));
  const files = activitats.map((a) => ({
    data_inici: a.data_inici,
    data_fi: a.data_fi ?? '',
    nom: a.nom,
    estat: tr(idioma, ESTATS_CSV[a.estat] ?? a.estat),
    objectius: a.objectius,
    inscrits: a.inscrits,
    assistents_inscrits: a.assistents_inscrits,
    assistents_anonims: a.assistents_anonims,
    total_assistents: a.total_assistents,
    font: tr(idioma, FONTS_CSV[a.font]),
    infants: a.per_franja[FRANGES[0]],
    joves: a.per_franja[FRANGES[1]],
    adults: a.per_franja[FRANGES[2]],
    gent_gran: a.per_franja[FRANGES[3]],
    sense_data: a.per_franja[SENSE_DATA],
    dones: a.per_genere.dona,
    homes: a.per_genere.home,
    altres: a.per_genere.altre + a.per_genere.nc,
    socis: a.socis,
    no_socis: a.no_socis,
    generacions: a.generacions.length,
    intergeneracional: tr(idioma, a.intergeneracional ? 'Sí' : 'No'),
    pressupost: euros(a.pressupost_cents),
    ingressos: euros(a.ingressos_cents),
    despeses: euros(a.despeses_cents),
  }));
  const columnes: [string, string][] = [
    ['data_inici', "Data d'inici"], ['data_fi', 'Data de fi'], ['nom', 'Activitat'], ['estat', 'Estat'], ['objectius', 'Finalitats'],
    ['inscrits', 'Inscrits'], ['assistents_inscrits', 'Assistents inscrits'], ['assistents_anonims', 'Assistents anònims'],
    ['total_assistents', 'Total assistents'], ['font', 'Font de les dades'],
    ['infants', 'Infants (0-13)'], ['joves', 'Joves (14-29)'], ['adults', 'Adults (30-64)'], ['gent_gran', 'Gent gran (65+)'],
    ['sense_data', 'Sense data'], ['dones', 'Dones'], ['homes', 'Homes'], ['altres', 'Altres / no consta'],
    ['socis', 'Socis'], ['no_socis', 'No socis'], ['generacions', 'Generacions presents'], ['intergeneracional', 'Intergeneracional'],
    ['pressupost', 'Pressupost (€)'], ['ingressos', 'Ingressos (€)'], ['despeses', 'Despeses (€)'],
  ];
  sendCsv(res, `indicadors-activitats-${exercici}.csv`, toCsv(files, columnesTraduides(req, columnes)));
});
