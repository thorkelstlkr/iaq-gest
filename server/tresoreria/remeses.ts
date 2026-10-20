// Remeses de rebuts domiciliats: generació, cobrament i devolucions.
import { all, get, getConfig, run, setConfig, tx } from '../db.ts';
import { HttpError, notFound } from '../util.ts';
import { ibanValid, netejaIban } from '../../shared/iban.ts';
import { dataLocal, sumaDies } from '../../shared/dates.ts';
import { generaPain008, identificadorCreditor, identificadorCreditorValid, idSepa } from './sepa.ts';
import type { Sequencia } from './sepa.ts';
import { ambTancament, comprovaObert } from './tancament.ts';

export interface ConfigSepa {
  nom: string;
  nif: string;
  identificador: string; // el configurat (pot ser buit)
  suggeriment: string; // calculat a partir del NIF
  compte_id: number | null;
  iban: string | null;
  bic: string | null;
}

export function configSepa(): ConfigSepa {
  const nif = getConfig('nif') ?? '';
  const compteId = Number(getConfig('sepa_compte_id')) || null;
  const compte = compteId ? get<{ iban: string | null; bic: string | null }>('SELECT iban, bic FROM comptes WHERE id = ?', compteId) : undefined;
  return {
    // El nom del creditor té un màxim de 70 caràcters: si el nom complet és més llarg, s'usa el nom curt.
    nom: [getConfig('nom_complet'), getConfig('nom')].find((n) => n && n.length <= 70) || getConfig('nom') || '',
    nif,
    identificador: getConfig('sepa_identificador_creditor') ?? '',
    suggeriment: identificadorCreditor(nif),
    compte_id: compte ? compteId : null,
    iban: compte?.iban ?? null,
    bic: compte?.bic ?? null,
  };
}

/** Prefix de les referències de mandat: inicials del nom de l'entitat («I ara qué?» → «IAQ»). */
export function prefixMandat(): string {
  const nom = (getConfig('nom') || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const inicials = nom.split(/[^A-Za-z0-9]+/).filter(Boolean).map((p) => p[0].toUpperCase()).join('').slice(0, 4);
  return inicials || 'MND';
}

/** Categoria per nom i tipus; la crea si no existeix. */
export function categoria(nom: string, tipus: 'ingres' | 'despesa', clauConfig?: string): number {
  const desada = clauConfig ? Number(getConfig(clauConfig)) : 0;
  if (desada && get('SELECT 1 AS x FROM categories WHERE id = ? AND tipus = ?', desada, tipus)) return desada;
  const id =
    get<{ id: number }>('SELECT id FROM categories WHERE nom = ? AND tipus = ?', nom, tipus)?.id ??
    run('INSERT INTO categories (nom, tipus, renda_exempta) VALUES (?, ?, 0)', nom, tipus).id;
  if (clauConfig) setConfig(clauConfig, String(id));
  return id;
}

interface QuotaRemesable {
  id: number;
  exercici: number;
  import_cents: number;
  estat: string;
  soci_id: number;
  num_soci: number;
  nom: string;
  llinatges: string;
  iban: string | null;
  metode: string | null;
  referencia: string | null;
  data_signatura: string | null;
  sequencia: Sequencia | null;
  actiu: number | null;
  en_remesa: number;
}

const SELECT_REMESABLES = `
  SELECT q.id, q.exercici, q.import_cents, q.estat, s.id AS soci_id, s.num_soci, s.nom, s.llinatges, s.iban,
         m.metode, m.referencia, m.data_signatura, m.sequencia, m.actiu,
         EXISTS (SELECT 1 FROM remesa_linies l JOIN remeses r ON r.id = l.remesa_id
                  WHERE l.quota_id = q.id AND r.estat = 'generada') AS en_remesa
    FROM quotes q JOIN socis s ON s.id = q.soci_id
    LEFT JOIN mandats_sepa m ON m.soci_id = s.id`;

/** Motiu pel qual una quota no es pot incloure en una remesa (null si es pot). */
export function motiuExclusio(q: QuotaRemesable): string | null {
  if (q.estat !== 'pendent' || q.import_cents <= 0) return 'La quota no està pendent.';
  if (q.metode !== 'domiciliacio') return 'El soci no paga per domiciliació.';
  if (!q.referencia || !q.data_signatura || !q.actiu) return 'Sense mandat SEPA actiu.';
  if (!q.iban || !ibanValid(q.iban)) return 'IBAN absent o no vàlid.';
  if (q.en_remesa) return 'Ja és en una remesa pendent de cobrar.';
  return null;
}

/** Quotes pendents dels socis que paguen per domiciliació, amb el motiu si no es poden remesar. */
export function quotesDomiciliades(exercici: number) {
  return all<QuotaRemesable>(
    `${SELECT_REMESABLES} WHERE q.exercici = ? AND q.estat = 'pendent' AND q.import_cents > 0 AND m.metode = 'domiciliacio'
      ORDER BY s.num_soci`,
    exercici,
  ).map((q) => ({ ...q, iban: q.iban ? netejaIban(q.iban) : null, motiu: motiuExclusio(q) }));
}

const dataHoraLocal = (d: Date) => `${dataLocal(d)}T${d.toTimeString().slice(0, 8)}`;

export function creaRemesa(opcions: { quotaIds: number[]; dataCobrament: string; usuari: string | null; ara?: Date }): number {
  const ara = opcions.ara ?? new Date();
  const cfg = configSepa();
  const identificador = cfg.identificador || cfg.suggeriment;
  if (!cfg.nom) throw new HttpError(400, "Cal indicar el nom de l'entitat a Configuració.");
  if (!identificador || !identificadorCreditorValid(identificador))
    throw new HttpError(400, "Cal configurar un identificador de creditor SEPA vàlid (o el NIF de l'entitat).");
  if (!cfg.compte_id || !cfg.iban || !ibanValid(cfg.iban))
    throw new HttpError(400, "Cal triar el compte bancari de l'entitat i indicar-ne un IBAN vàlid.");
  const ids = [...new Set(opcions.quotaIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (!ids.length) throw new HttpError(400, 'Cal triar almenys una quota.');

  return tx(() => {
    const quotes = ids.map((id) => {
      const q = get<QuotaRemesable>(`${SELECT_REMESABLES} WHERE q.id = ?`, id) ?? notFound();
      const motiu = motiuExclusio(q);
      if (motiu) throw new HttpError(409, `Soci núm. ${q.num_soci}: ${motiu}`);
      return q;
    });
    const dia = dataLocal(ara).replace(/-/g, '');
    const seq = get<{ n: number }>("SELECT COUNT(*) AS n FROM remeses WHERE referencia LIKE ?", `REM${dia}%`)!.n + 1;
    const referencia = idSepa(`REM${dia}-${String(seq).padStart(2, '0')}-${prefixMandat()}`);
    const nomEntitat = getConfig('nom') || cfg.nom;
    const linies = quotes.map((q, i) => ({
      quota_id: q.id,
      soci_id: q.soci_id,
      nom_deutor: `${q.nom} ${q.llinatges}`.trim(),
      iban: netejaIban(q.iban!),
      mandat_referencia: q.referencia!,
      mandat_data: q.data_signatura!,
      sequencia: (q.sequencia ?? 'FRST') as Sequencia,
      import_cents: q.import_cents,
      end_to_end: idSepa(`${referencia}-${String(i + 1).padStart(3, '0')}`),
      concepte: `Quota ${q.exercici} ${nomEntitat} - soci num. ${q.num_soci}`,
    }));
    const total = linies.reduce((s, l) => s + l.import_cents, 0);
    const xml = generaPain008({
      msgId: referencia,
      creacio: dataHoraLocal(ara),
      dataCobrament: opcions.dataCobrament,
      creditor: { nom: cfg.nom, identificador, iban: cfg.iban!, bic: cfg.bic },
      operacions: linies.map((l) => ({
        endToEnd: l.end_to_end,
        importCents: l.import_cents,
        mandat: l.mandat_referencia,
        dataMandat: l.mandat_data,
        sequencia: l.sequencia,
        nom: l.nom_deutor,
        iban: l.iban,
        concepte: l.concepte,
      })),
    });
    const { id } = run(
      `INSERT INTO remeses (referencia, data_cobrament, compte_id, num_operacions, total_cents, xml, usuari)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      referencia, opcions.dataCobrament, cfg.compte_id, linies.length, total, xml, opcions.usuari,
    );
    for (const l of linies) {
      run(
        `INSERT INTO remesa_linies (remesa_id, quota_id, soci_id, nom_deutor, iban, mandat_referencia, mandat_data, sequencia,
           import_cents, end_to_end, concepte) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, l.quota_id, l.soci_id, l.nom_deutor, l.iban, l.mandat_referencia, l.mandat_data, l.sequencia,
        l.import_cents, l.end_to_end, l.concepte,
      );
    }
    return id;
  });
}

interface Remesa {
  id: number;
  referencia: string;
  data_cobrament: string;
  compte_id: number;
  num_operacions: number;
  total_cents: number;
  estat: 'generada' | 'cobrada';
}

/** El banc ha abonat la remesa: un sol ingrés agregat i les quotes queden cobrades per domiciliació. */
export function cobraRemesa(id: number, data: string) {
  tx(() =>
    ambTancament(() => {
      const r = get<Remesa>('SELECT * FROM remeses WHERE id = ?', id) ?? notFound();
      if (r.estat !== 'generada') throw new HttpError(409, 'Aquesta remesa ja està cobrada.');
      comprovaObert(data);
      const linies = all<{ quota_id: number | null; soci_id: number | null; estat_quota: string | null }>(
        `SELECT l.quota_id, l.soci_id, q.estat AS estat_quota FROM remesa_linies l LEFT JOIN quotes q ON q.id = l.quota_id
          WHERE l.remesa_id = ?`,
        id,
      );
      if (linies.some((l) => l.estat_quota !== 'pendent'))
        throw new HttpError(409, "Alguna quota de la remesa ja no està pendent (s'ha cobrat o eliminat). Elimina la remesa i genera'n una de nova.");
      const mov = run(
        `INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, justificant)
         VALUES (?, 'ingres', ?, ?, ?, ?, ?)`,
        data, r.total_cents, `Remesa de rebuts domiciliats ${r.referencia} (${r.num_operacions} rebuts)`,
        categoria('Quotes de socis', 'ingres', 'categoria_quotes'), r.compte_id, r.referencia,
      );
      for (const l of linies) {
        run(
          "UPDATE quotes SET estat = 'pagada', data_pagament = ?, moviment_id = ?, metode = 'domiciliacio' WHERE id = ?",
          data, mov.id, l.quota_id,
        );
        run("UPDATE mandats_sepa SET sequencia = 'RCUR' WHERE soci_id = ?", l.soci_id);
      }
      run("UPDATE remeses SET estat = 'cobrada', cobrada_el = ?, moviment_id = ? WHERE id = ?", data, mov.id, id);
    }),
  );
}

/** Devolució d'un rebut: despesa per l'import retornat (+ comissió), la quota torna a pendent i el mandat a FRST. */
export function retornaLinia(liniaId: number, o: { data: string; motiu: string; comissioCents: number }) {
  tx(() =>
    ambTancament(() => {
      const l = get<{
        id: number; estat: string; import_cents: number; quota_id: number | null; soci_id: number | null; nom_deutor: string;
        remesa_estat: string; referencia: string; compte_id: number; exercici: number | null; num_soci: number | null;
      }>(
        `SELECT l.*, r.estat AS remesa_estat, r.referencia, r.compte_id, q.exercici, s.num_soci
           FROM remesa_linies l JOIN remeses r ON r.id = l.remesa_id
           LEFT JOIN quotes q ON q.id = l.quota_id LEFT JOIN socis s ON s.id = l.soci_id
          WHERE l.id = ?`,
        liniaId,
      ) ?? notFound();
      if (l.remesa_estat !== 'cobrada') throw new HttpError(409, 'Només es poden retornar rebuts de remeses cobrades.');
      if (l.estat === 'retornada') throw new HttpError(409, 'Aquest rebut ja està retornat.');
      comprovaObert(o.data);
      const qui = `${l.num_soci ? `soci núm. ${l.num_soci} ` : ''}(${l.nom_deutor})`;
      const dev = run(
        `INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, soci_id, justificant)
         VALUES (?, 'despesa', ?, ?, ?, ?, ?, ?)`,
        o.data, l.import_cents, `Devolució rebut ${l.exercici ?? ''} ${qui} – ${o.motiu}`.replace(/\s+/g, ' '),
        categoria('Devolucions de rebuts', 'despesa', 'categoria_devolucions'), l.compte_id, l.soci_id, l.referencia,
      );
      let comissio: number | null = null;
      if (o.comissioCents > 0) {
        comissio = run(
          `INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, soci_id, justificant)
           VALUES (?, 'despesa', ?, ?, ?, ?, ?, ?)`,
          o.data, o.comissioCents, `Comissió per devolució de rebut ${qui}`,
          categoria('Comissions bancàries', 'despesa'), l.compte_id, l.soci_id, l.referencia,
        ).id;
      }
      run(
        `UPDATE remesa_linies SET estat = 'retornada', data_devolucio = ?, motiu_devolucio = ?, comissio_cents = ?,
           moviment_devolucio_id = ?, moviment_comissio_id = ? WHERE id = ?`,
        o.data, o.motiu, o.comissioCents, dev.id, comissio, liniaId,
      );
      if (l.quota_id)
        run("UPDATE quotes SET estat = 'pendent', data_pagament = NULL, moviment_id = NULL, metode = NULL WHERE id = ?", l.quota_id);
      if (l.soci_id) run("UPDATE mandats_sepa SET sequencia = 'FRST' WHERE soci_id = ?", l.soci_id);
    }),
  );
}

/** Només es pot eliminar una remesa que encara no s'ha cobrat. */
export function eliminaRemesa(id: number) {
  const r = get<Remesa>('SELECT * FROM remeses WHERE id = ?', id) ?? notFound();
  if (r.estat !== 'generada') throw new HttpError(409, 'Una remesa cobrada no es pot eliminar.');
  run('DELETE FROM remeses WHERE id = ?', id);
}

/** Data mínima per al cobrament: l'endemà. */
export const dataMinimaCobrament = () => sumaDies(1);
