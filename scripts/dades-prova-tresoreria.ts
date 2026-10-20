// Dades de prova del mòdul «tresoreria»: pressupost, mandats SEPA, una remesa cobrada amb una devolució
// i l'exercici de fa dos anys tancat.
import { all, get, getConfig, run, setConfig, tx } from '../server/db.ts';
import { avui } from '../shared/dates.ts';
import { cobraRemesa, creaRemesa, prefixMandat, retornaLinia } from '../server/tresoreria/remeses.ts';

/** IBAN espanyol vàlid a partir d'un compte de 20 xifres. */
function ibanEs(bban: string): string {
  let resta = 0;
  for (const d of bban + '142800') resta = (resta * 10 + Number(d)) % 97; // «ES00» → 14 28 00
  return `ES${String(98 - resta).padStart(2, '0')}${bban}`;
}

export function dadesProva() {
  const any = Number(avui().slice(0, 4));
  const banc = get<{ id: number }>("SELECT id FROM comptes WHERE nom LIKE 'Compte%' ORDER BY id")?.id;
  if (!banc) return;

  tx(() => {
    if (!getConfig('nif')) setConfig('nif', 'G57123458');
    run("UPDATE comptes SET iban = 'ES9121000418450200051332', bic = 'CAIXESBBXXX' WHERE id = ?", banc);
    setConfig('sepa_compte_id', String(banc));

    // Pressupost de l'any en curs a partir de les xifres reals de l'any anterior (+10 %), aprovat per l'assemblea.
    if (!get('SELECT 1 AS x FROM pressupost WHERE exercici = ?', any)) {
      const reals = all<{ categoria_id: number; s: number }>(
        `SELECT categoria_id, SUM(import_cents) AS s FROM moviments
          WHERE categoria_id IS NOT NULL AND data BETWEEN ? AND ? GROUP BY categoria_id`,
        `${any - 1}-01-01`, `${any - 1}-12-31`,
      );
      for (const r of reals)
        run('INSERT INTO pressupost (exercici, categoria_id, import_cents) VALUES (?, ?, ?)', any, r.categoria_id, Math.round((r.s * 1.1) / 1000) * 1000);
      if (reals.length) setConfig(`pressupost_aprovat_${any}`, `${any}-03-28`);
    }
  });

  // Mandats: socis adults amb la quota de 2026 pendent paguen per domiciliació.
  const prefix = prefixMandat();
  const candidats = all<{ id: number; num_soci: number; data_alta: string }>(
    `SELECT s.id, s.num_soci, s.data_alta FROM socis s JOIN quotes q ON q.soci_id = s.id
      WHERE q.exercici = 2026 AND q.estat = 'pendent' AND q.import_cents > 0 AND s.dni IS NOT NULL
      ORDER BY s.num_soci LIMIT 5`,
  );
  if (candidats.length < 2) return;
  tx(() => {
    candidats.forEach((s, i) => {
      const iban = ibanEs(`2100${String(1000 + i * 37).padStart(4, '0')}${String(10 + i).padStart(2, '0')}${String(5000000000 + s.num_soci * 7919)}`);
      run('UPDATE socis SET iban = ? WHERE id = ?', iban, s.id);
      // L'últim encara no ha tornat el mandat signat (surt com a avís al tauler).
      const ambMandat = i < candidats.length - 1;
      run(
        `INSERT OR REPLACE INTO mandats_sepa (soci_id, metode, referencia, data_signatura, sequencia, actiu)
         VALUES (?, 'domiciliacio', ?, ?, 'FRST', 1)`,
        s.id, ambMandat ? `${prefix}-${s.num_soci}` : null, ambMandat ? s.data_alta : null,
      );
    });
    // Altres socis: transferència.
    run(
      `INSERT OR IGNORE INTO mandats_sepa (soci_id, metode) SELECT id, 'transferencia' FROM socis
        WHERE dni IS NOT NULL AND id NOT IN (SELECT soci_id FROM mandats_sepa) AND num_soci % 4 = 0`,
    );
  });

  // Remesa de març de 2026: cobrada, amb un rebut retornat per fons insuficients.
  const quotes = all<{ id: number }>(
    `SELECT q.id FROM quotes q JOIN mandats_sepa m ON m.soci_id = q.soci_id
      WHERE q.exercici = 2026 AND q.estat = 'pendent' AND m.metode = 'domiciliacio' AND m.referencia IS NOT NULL`,
  );
  if (!quotes.length) return;
  const id = creaRemesa({
    quotaIds: quotes.map((q) => q.id),
    dataCobrament: '2026-03-05',
    usuari: 'Dades de prova',
    ara: new Date(2026, 1, 25, 10, 30),
  });
  cobraRemesa(id, '2026-03-05');
  const linia = get<{ id: number }>('SELECT id FROM remesa_linies WHERE remesa_id = ? ORDER BY id LIMIT 1', id)!;
  retornaLinia(linia.id, { data: '2026-03-12', motiu: 'AM04 Fons insuficients', comissioCents: 350 });

  // Exercici de fa dos anys, tancat.
  run(
    "INSERT OR IGNORE INTO exercicis_tancats (exercici, tancat_el, usuari, notes) VALUES (?, ?, 'Dades de prova', ?)",
    any - 2, `${any - 1}-06-15 19:30:00`, "Comptes aprovats per l'assemblea general.",
  );
}
