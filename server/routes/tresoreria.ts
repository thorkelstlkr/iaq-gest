// Tresoreria: pressupost anual, domiciliacions SEPA, fiscalitat (Impost de Societats) i tancament de l'exercici.
import { Router } from 'express';
import { all, get, getConfig, run, setConfig, tx } from '../db.ts';
import {
  HttpError, bool, cents, data, dataObligatoria, enter, exerciciParam, idParam, notFound, text, textObligatori,
} from '../util.ts';
import { registra } from '../auditoria.ts';
import { autor, usuariDe } from './auth.ts';
import { avui } from '../../shared/dates.ts';
import { ibanValid, netejaIban } from '../../shared/iban.ts';
import { identificadorCreditorValid, idSepa, MOTIUS_DEVOLUCIO } from '../tresoreria/sepa.ts';
import {
  cobraRemesa, configSepa, creaRemesa, dataMinimaCobrament, eliminaRemesa, prefixMandat, quotesDomiciliades, retornaLinia,
} from '../tresoreria/remeses.ts';
import { informeFiscal } from '../tresoreria/fiscal.ts';
import { exercicisTancats, exerciciTancat } from '../tresoreria/tancament.ts';

export const tresoreriaRouter = Router();

const anyActual = () => Number(avui().slice(0, 4));

function exerciciCos(v: unknown): number {
  const e = enter(v, 'Exercici');
  if (!e || e < 1900 || e > 3000) throw new HttpError(400, 'Exercici no vàlid.');
  return e;
}

// ---------- Pressupost ----------

const aprovatEl = (exercici: number) => getConfig(`pressupost_aprovat_${exercici}`) || null;

function realPerCategoria(exercici: number) {
  return all<{ categoria_id: number; import_cents: number }>(
    `SELECT categoria_id, SUM(import_cents) AS import_cents FROM moviments
      WHERE tipus IN ('ingres','despesa') AND categoria_id IS NOT NULL AND data BETWEEN ? AND ?
      GROUP BY categoria_id`,
    `${exercici}-01-01`, `${exercici}-12-31`,
  );
}

tresoreriaRouter.get('/pressupost', (req, res) => {
  const exercici = exerciciParam(req);
  const fila = (llista: { categoria_id: number; import_cents: number }[]) =>
    new Map(llista.map((r) => [r.categoria_id, r.import_cents]));
  const pressupost = fila(all('SELECT categoria_id, import_cents FROM pressupost WHERE exercici = ?', exercici));
  const anterior = fila(all('SELECT categoria_id, import_cents FROM pressupost WHERE exercici = ?', exercici - 1));
  const real = fila(realPerCategoria(exercici));
  const realAnterior = fila(realPerCategoria(exercici - 1));
  const categories = all<{ id: number; nom: string; tipus: string; actiu: number }>(
    'SELECT id, nom, tipus, actiu FROM categories ORDER BY tipus DESC, nom',
  ).map((c) => ({
    ...c,
    pressupost_cents: pressupost.get(c.id) ?? 0,
    real_cents: real.get(c.id) ?? 0,
    anterior_pressupost_cents: anterior.get(c.id) ?? 0,
    anterior_real_cents: realAnterior.get(c.id) ?? 0,
  }));
  res.json({ exercici, aprovat_el: aprovatEl(exercici), te_pressupost: pressupost.size > 0, categories });
});

function comprovaEditable(exercici: number) {
  if (aprovatEl(exercici))
    throw new HttpError(409, "El pressupost d'aquest exercici ja està aprovat: desfés l'aprovació per modificar-lo.");
}

tresoreriaRouter.put('/pressupost', (req, res) => {
  const exercici = exerciciCos(req.body.exercici);
  comprovaEditable(exercici);
  const linies = Array.isArray(req.body.linies) ? req.body.linies : [];
  tx(() => {
    run('DELETE FROM pressupost WHERE exercici = ?', exercici);
    for (const l of linies) {
      const categoria = enter(l?.categoria_id, 'Categoria');
      const imp = cents(l?.import_cents ?? 0, 'Import');
      if (!categoria) throw new HttpError(400, 'Cal triar una categoria.');
      if (imp > 0) run('INSERT INTO pressupost (exercici, categoria_id, import_cents) VALUES (?, ?, ?)', exercici, categoria, imp);
    }
  });
  registra(req, 'modifica', 'pressupost', exercici);
  res.json({ ok: true });
});

/** Copia el pressupost o les xifres reals de l'any anterior com a punt de partida. */
tresoreriaRouter.post('/pressupost/copia', (req, res) => {
  const exercici = exerciciCos(req.body.exercici);
  comprovaEditable(exercici);
  const origen = req.body.origen === 'real' ? 'real' : 'pressupost';
  const files =
    origen === 'real'
      ? realPerCategoria(exercici - 1)
      : all<{ categoria_id: number; import_cents: number }>(
          'SELECT categoria_id, import_cents FROM pressupost WHERE exercici = ?', exercici - 1,
        );
  if (!files.length)
    throw new HttpError(404, origen === 'real' ? "L'any anterior no té moviments." : "L'any anterior no té pressupost.");
  tx(() => {
    run('DELETE FROM pressupost WHERE exercici = ?', exercici);
    for (const f of files)
      run('INSERT INTO pressupost (exercici, categoria_id, import_cents) VALUES (?, ?, ?)', exercici, f.categoria_id, f.import_cents);
  });
  registra(req, 'modifica', 'pressupost', exercici, `Còpia (${origen}) de ${exercici - 1}`);
  res.json({ copiades: files.length });
});

tresoreriaRouter.post('/pressupost/aprova', (req, res) => {
  const exercici = exerciciCos(req.body.exercici);
  const dataAprovacio = dataObligatoria(req.body.data, "Data d'aprovació");
  if (!get('SELECT 1 AS x FROM pressupost WHERE exercici = ?', exercici))
    throw new HttpError(400, 'El pressupost és buit.');
  setConfig(`pressupost_aprovat_${exercici}`, dataAprovacio);
  registra(req, 'modifica', 'pressupost', exercici, `Aprovat per l'assemblea el ${dataAprovacio}`);
  res.json({ aprovat_el: dataAprovacio });
});

tresoreriaRouter.post('/pressupost/desaprova', (req, res) => {
  const exercici = exerciciCos(req.body.exercici);
  setConfig(`pressupost_aprovat_${exercici}`, '');
  registra(req, 'modifica', 'pressupost', exercici, 'Aprovació desfeta');
  res.json({ aprovat_el: null });
});

// ---------- Tancament de l'exercici ----------

tresoreriaRouter.get('/exercicis-tancats', (_req, res) => {
  res.json(exercicisTancats());
});

tresoreriaRouter.get('/tancaments', (_req, res) => {
  const anys = new Set<number>([anyActual(), anyActual() - 1, ...exercicisTancats()]);
  for (const r of all<{ a: number }>("SELECT DISTINCT CAST(substr(data, 1, 4) AS INTEGER) AS a FROM moviments")) anys.add(r.a);
  const llista = [...anys]
    .sort((a, b) => b - a)
    .map((exercici) => {
      const t = get<{ tancat_el: string; usuari: string | null; notes: string | null }>(
        'SELECT tancat_el, usuari, notes FROM exercicis_tancats WHERE exercici = ?', exercici,
      );
      const xifres = get<{ n: number; ingressos: number; despeses: number }>(
        `SELECT COUNT(*) AS n,
                COALESCE(SUM(CASE WHEN tipus = 'ingres' THEN import_cents END), 0) AS ingressos,
                COALESCE(SUM(CASE WHEN tipus = 'despesa' THEN import_cents END), 0) AS despeses
           FROM moviments WHERE data BETWEEN ? AND ?`,
        `${exercici}-01-01`, `${exercici}-12-31`,
      )!;
      const pendents = get<{ n: number }>(
        "SELECT COUNT(*) AS n FROM quotes WHERE exercici = ? AND estat = 'pendent'", exercici,
      )!.n;
      const remeses = get<{ n: number }>(
        "SELECT COUNT(*) AS n FROM remeses WHERE estat = 'generada' AND data_cobrament BETWEEN ? AND ?",
        `${exercici}-01-01`, `${exercici}-12-31`,
      )!.n;
      return {
        exercici,
        tancat: Boolean(t),
        tancat_el: t?.tancat_el ?? null,
        usuari: t?.usuari ?? null,
        notes: t?.notes ?? null,
        moviments: xifres.n,
        ingressos_cents: xifres.ingressos,
        despeses_cents: xifres.despeses,
        quotes_pendents: pendents,
        remeses_pendents: remeses,
      };
    });
  res.json(llista);
});

tresoreriaRouter.post('/tancaments', (req, res) => {
  const exercici = exerciciCos(req.body.exercici);
  if (exercici >= anyActual()) throw new HttpError(400, "Només es poden tancar exercicis acabats.");
  if (exerciciTancat(exercici)) throw new HttpError(409, 'Aquest exercici ja està tancat.');
  if (get("SELECT 1 AS x FROM remeses WHERE estat = 'generada' AND data_cobrament BETWEEN ? AND ?", `${exercici}-01-01`, `${exercici}-12-31`))
    throw new HttpError(409, "Hi ha remeses de l'exercici pendents de marcar com a cobrades.");
  run('INSERT INTO exercicis_tancats (exercici, usuari, notes) VALUES (?, ?, ?)', exercici, autor(req), text(req.body.notes));
  registra(req, 'modifica', 'exercici', exercici, `Tancament de l'exercici ${exercici}`);
  res.status(201).json({ ok: true });
});

tresoreriaRouter.post('/tancaments/:id/reobre', (req, res) => {
  if (usuariDe(req)?.rol !== 'admin') throw new HttpError(403, "Només l'administració pot reobrir un exercici tancat.");
  const exercici = idParam(req);
  const motiu = textObligatori(req.body.motiu, 'Motiu');
  const { changes } = run('DELETE FROM exercicis_tancats WHERE exercici = ?', exercici);
  if (!changes) notFound();
  registra(req, 'modifica', 'exercici', exercici, `Reobertura de l'exercici ${exercici}: ${motiu}`);
  res.json({ ok: true });
});

// ---------- Fiscalitat ----------

tresoreriaRouter.get('/fiscalitat', (req, res) => {
  res.json(informeFiscal(exerciciParam(req)));
});

tresoreriaRouter.put('/fiscalitat/categories/:id', (req, res) => {
  const id = idParam(req);
  const { changes } = run(
    "UPDATE categories SET renda_exempta = ?, subjecta_retencio = ? WHERE id = ? AND tipus = 'ingres'",
    bool(req.body.renda_exempta), bool(req.body.subjecta_retencio), id,
  );
  if (!changes) notFound();
  registra(req, 'modifica', 'categoria', id, 'Tractament fiscal');
  res.json({ ok: true });
});

// ---------- Domiciliacions SEPA: configuració i mandats ----------

const BIC_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

tresoreriaRouter.get('/sepa', (_req, res) => {
  res.json({
    ...configSepa(),
    prefix: prefixMandat(),
    comptes: all('SELECT id, nom, iban, bic, actiu FROM comptes ORDER BY id'),
  });
});

tresoreriaRouter.put('/sepa', (req, res) => {
  const identificador = (text(req.body.identificador) ?? '').toUpperCase().replace(/\s/g, '');
  if (identificador && !identificadorCreditorValid(identificador))
    throw new HttpError(400, "L'identificador de creditor no és vàlid (format ESxxZZZ + NIF, amb dígits de control).");
  const compteId = enter(req.body.compte_id, 'Compte');
  const iban = text(req.body.iban) ? netejaIban(String(req.body.iban)) : null;
  const bic = text(req.body.bic)?.toUpperCase().replace(/\s/g, '') ?? null;
  if (iban && !ibanValid(iban)) throw new HttpError(400, "L'IBAN no és vàlid.");
  if (bic && !BIC_RE.test(bic)) throw new HttpError(400, 'El BIC no és vàlid (8 o 11 caràcters).');
  tx(() => {
    setConfig('sepa_identificador_creditor', identificador);
    setConfig('sepa_compte_id', compteId ? String(compteId) : '');
    if (compteId) {
      const { changes } = run('UPDATE comptes SET iban = ?, bic = ? WHERE id = ?', iban, bic, compteId);
      if (!changes) throw new HttpError(400, 'Compte inexistent.');
    }
  });
  registra(req, 'modifica', 'sepa', compteId, 'Configuració de les domiciliacions');
  res.json(configSepa());
});

const METODES = ['efectiu', 'transferencia', 'domiciliacio'];

tresoreriaRouter.get('/mandats', (_req, res) => {
  const prefix = prefixMandat();
  const files = all<{ iban: string | null; num_soci: number; referencia: string | null; metode: string | null }>(
    `SELECT s.id AS soci_id, s.num_soci, TRIM(s.nom || ' ' || s.llinatges) AS nom, s.iban, s.data_baixa,
            COALESCE(m.metode, 'efectiu') AS metode, m.referencia, m.data_signatura, COALESCE(m.sequencia, 'FRST') AS sequencia,
            COALESCE(m.actiu, 0) AS actiu, m.soci_id IS NOT NULL AS te_fila
       FROM socis s LEFT JOIN mandats_sepa m ON m.soci_id = s.id
      WHERE s.anonimitzat_el IS NULL AND s.estat_admissio = 'admesa' AND (s.data_baixa IS NULL OR s.data_baixa >= ? OR m.metode = 'domiciliacio')
      ORDER BY s.num_soci`,
    avui(),
  );
  res.json(
    files.map((f) => ({
      ...f,
      iban: f.iban ? netejaIban(f.iban) : null,
      iban_valid: Boolean(f.iban && ibanValid(f.iban)),
      referencia_suggerida: `${prefix}-${f.num_soci}`,
    })),
  );
});

tresoreriaRouter.put('/mandats/:id', (req, res) => {
  const sociId = idParam(req);
  if (!get('SELECT 1 AS x FROM socis WHERE id = ?', sociId)) notFound();
  const metode = String(req.body.metode ?? 'efectiu');
  if (!METODES.includes(metode)) throw new HttpError(400, 'Forma de pagament no vàlida.');
  const referencia = text(req.body.referencia);
  if (referencia && (referencia.length > 35 || idSepa(referencia) !== referencia))
    throw new HttpError(400, 'La referència del mandat només pot tenir lletres sense accents, xifres i els signes - . / (màxim 35).');
  const dataSignatura = data(req.body.data_signatura, 'Data de signatura');
  if (dataSignatura && dataSignatura > avui()) throw new HttpError(400, 'La data de signatura no pot ser futura.');
  const sequencia = req.body.sequencia === 'RCUR' ? 'RCUR' : 'FRST';
  const actiu = bool(req.body.actiu ?? 1);
  if (metode === 'domiciliacio' && actiu && (!referencia || !dataSignatura))
    throw new HttpError(400, 'Per domiciliar cal la referència i la data de signatura del mandat.');
  const ibanText = req.body.iban === undefined ? undefined : text(req.body.iban);
  const iban = ibanText ? netejaIban(ibanText) : ibanText;
  if (iban && !ibanValid(iban)) throw new HttpError(400, "L'IBAN no és vàlid.");
  tx(() => {
    run(
      `INSERT INTO mandats_sepa (soci_id, metode, referencia, data_signatura, sequencia, actiu, modificat_el)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(soci_id) DO UPDATE SET metode = excluded.metode, referencia = excluded.referencia,
         data_signatura = excluded.data_signatura, sequencia = excluded.sequencia, actiu = excluded.actiu,
         modificat_el = excluded.modificat_el`,
      sociId, metode, referencia, dataSignatura, sequencia, actiu,
    );
    if (iban !== undefined) run('UPDATE socis SET iban = ? WHERE id = ?', iban, sociId);
  });
  registra(req, 'modifica', 'soci', sociId, `Forma de pagament / mandat SEPA${iban !== undefined ? ' (IBAN)' : ''}`);
  res.json({ ok: true });
});

// ---------- Remeses ----------

tresoreriaRouter.get('/remeses', (_req, res) => {
  res.json(
    all(
      `SELECT r.id, r.referencia, r.data_cobrament, r.compte_id, r.num_operacions, r.total_cents, r.estat, r.cobrada_el,
              r.usuari, r.creat_el, c.nom AS compte_nom,
              (SELECT COUNT(*) FROM remesa_linies l WHERE l.remesa_id = r.id AND l.estat = 'retornada') AS retornats
         FROM remeses r JOIN comptes c ON c.id = r.compte_id
        ORDER BY r.data_cobrament DESC, r.id DESC`,
    ),
  );
});

tresoreriaRouter.get('/remeses/quotes', (req, res) => {
  res.json({ quotes: quotesDomiciliades(exerciciParam(req)), data_minima: dataMinimaCobrament() });
});

tresoreriaRouter.get('/motius-devolucio', (_req, res) => {
  res.json(MOTIUS_DEVOLUCIO);
});

tresoreriaRouter.post('/remeses', (req, res) => {
  const dataCobrament = dataObligatoria(req.body.data_cobrament, 'Data de cobrament');
  if (dataCobrament < dataMinimaCobrament()) throw new HttpError(400, 'La data de cobrament ha de ser posterior a avui.');
  const id = creaRemesa({
    quotaIds: Array.isArray(req.body.quota_ids) ? req.body.quota_ids : [],
    dataCobrament,
    usuari: autor(req),
  });
  const r = get<{ referencia: string; num_operacions: number }>('SELECT referencia, num_operacions FROM remeses WHERE id = ?', id)!;
  registra(req, 'crea', 'remesa', id, `${r.referencia} (${r.num_operacions} rebuts)`);
  res.status(201).json({ id });
});

tresoreriaRouter.get('/remeses/:id', (req, res) => {
  const id = idParam(req);
  const r = get(
    'SELECT r.*, c.nom AS compte_nom FROM remeses r JOIN comptes c ON c.id = r.compte_id WHERE r.id = ?', id,
  ) ?? notFound();
  const linies = all(
    `SELECT l.*, s.num_soci, q.exercici, q.estat AS estat_quota FROM remesa_linies l
       LEFT JOIN socis s ON s.id = l.soci_id LEFT JOIN quotes q ON q.id = l.quota_id
      WHERE l.remesa_id = ? ORDER BY l.id`,
    id,
  );
  res.json({ ...r, linies });
});

tresoreriaRouter.get('/remeses/:id/xml', (req, res) => {
  const r = get<{ referencia: string; xml: string }>('SELECT referencia, xml FROM remeses WHERE id = ?', idParam(req)) ?? notFound();
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${r.referencia}.xml"`);
  res.send(r.xml);
});

tresoreriaRouter.post('/remeses/:id/cobra', (req, res) => {
  const id = idParam(req);
  const dataAbonament = dataObligatoria(req.body.data, "Data d'abonament");
  cobraRemesa(id, dataAbonament);
  registra(req, 'modifica', 'remesa', id, `Cobrada el ${dataAbonament}`);
  res.json({ ok: true });
});

tresoreriaRouter.delete('/remeses/:id', (req, res) => {
  const id = idParam(req);
  eliminaRemesa(id);
  registra(req, 'elimina', 'remesa', id);
  res.status(204).end();
});

tresoreriaRouter.post('/remeses/linies/:id/devolucio', (req, res) => {
  const id = idParam(req);
  const codi = String(req.body.motiu ?? '');
  const motiu = MOTIUS_DEVOLUCIO[codi] ? `${codi} ${MOTIUS_DEVOLUCIO[codi]}` : textObligatori(req.body.motiu, 'Motiu');
  retornaLinia(id, {
    data: dataObligatoria(req.body.data, 'Data de devolució'),
    motiu,
    comissioCents: req.body.comissio_cents ? cents(req.body.comissio_cents, 'Comissió') : 0,
  });
  registra(req, 'modifica', 'remesa', null, `Devolució del rebut ${id}: ${motiu}`);
  res.json({ ok: true });
});
