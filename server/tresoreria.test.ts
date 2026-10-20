// Proves del mòdul de tresoreria: fitxer SEPA, identificador de creditor, exercicis tancats, model 200 i cobrament en bloc.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
// Només mòduls sense base de dades a dalt: tota la resta s'importa després de fixar DB_PATH.
import { generaPain008, identificadorCreditor, identificadorCreditorValid, idSepa, textSepa } from './tresoreria/sepa.ts';

const dir = mkdtempSync(join(tmpdir(), 'tresoreria-'));
process.env.DB_PATH = join(dir, 'prova.db');
const { all, db, get, run, setConfig, DB_PATH } = await import('./db.ts');
assert.ok(DB_PATH.startsWith(dir), 'les proves no poden tocar la base de dades real');
const { obligacioModel200, terminiModel200 } = await import('./tresoreria/fiscal.ts');
after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

// ---------- SEPA ----------

test('identificador de creditor: algorisme ISO 7064 mod 97-10', () => {
  // Identificador de proves del Bundesbank (mateix algorisme que a l'Estat).
  assert.equal(identificadorCreditor('09999999999', 'DE'), 'DE98ZZZ09999999999');
  const es = identificadorCreditor('G57123458');
  assert.match(es, /^ES\d{2}ZZZG57123458$/);
  assert.ok(identificadorCreditorValid(es));
  assert.ok(identificadorCreditorValid('DE98ZZZ09999999999'));
  assert.ok(!identificadorCreditorValid('DE97ZZZ09999999999'));
  // El codi comercial no entra en el càlcul.
  assert.equal(identificadorCreditor('G57123458', 'ES', '000').slice(2, 4), es.slice(2, 4));
});

test('text SEPA: sense accents ni caràcters no admesos', () => {
  assert.equal(textSepa('Associació «I ara qué?» · Pollença & Cía', 70), 'Associacio I ara que? . Pollenca Cia');
  assert.equal(idSepa('IAQ / 12 // àb'), 'IAQ/12/ab');
  assert.equal(textSepa('x'.repeat(100), 70).length, 70);
});

test('fitxer pain.008.001.02: recomptes, sumes de control i agrupació per seqüència', () => {
  const op = (n: number, seq: 'FRST' | 'RCUR', cents: number) => ({
    endToEnd: `REM-${n}`,
    importCents: cents,
    mandat: `IAQ-${n}`,
    dataMandat: '2025-01-15',
    sequencia: seq,
    nom: n === 1 ? 'Bartomeu Cànaves Ñúñez' : `Soci ${n}`,
    iban: 'ES91 2100 0418 4502 0005 1332',
    concepte: `Quota 2026 – soci núm. ${n}`,
  });
  const xml = generaPain008({
    msgId: 'REM20261017-01',
    creacio: '2026-10-17T10:00:00',
    dataCobrament: '2026-10-24',
    creditor: { nom: 'Associació I ara qué?', identificador: identificadorCreditor('G57123458'), iban: 'ES9121000418450200051332', bic: null },
    operacions: [op(1, 'FRST', 2000), op(2, 'RCUR', 1000), op(3, 'FRST', 3550)],
  });
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns="urn:iso:std:iso:20022:tech:xsd:pain\.008\.001\.02"/);
  assert.ok(/^[\x09\x0a\x0d\x20-\x7e]*$/.test(xml), 'només ASCII');
  const grp = xml.slice(xml.indexOf('<GrpHdr>'), xml.indexOf('</GrpHdr>'));
  assert.match(grp, /<NbOfTxs>3<\/NbOfTxs>/);
  assert.match(grp, /<CtrlSum>65\.50<\/CtrlSum>/);
  const blocs = xml.split('<PmtInf>').slice(1);
  assert.equal(blocs.length, 2);
  assert.match(blocs[0], /<SeqTp>FRST<\/SeqTp>/);
  assert.match(blocs[0], /<NbOfTxs>2<\/NbOfTxs>/);
  assert.match(blocs[0], /<CtrlSum>55\.50<\/CtrlSum>/);
  assert.match(blocs[1], /<SeqTp>RCUR<\/SeqTp>/);
  assert.match(blocs[1], /<NbOfTxs>1<\/NbOfTxs>/);
  assert.match(blocs[1], /<CtrlSum>10\.00<\/CtrlSum>/);
  for (const b of blocs) {
    for (const etiqueta of ['<PmtMtd>DD</PmtMtd>', '<Cd>SEPA</Cd>', '<Cd>CORE</Cd>', '<ChrgBr>SLEV</ChrgBr>', '<Id>NOTPROVIDED</Id>', '<Prtry>SEPA</Prtry>'])
      assert.ok(b.includes(etiqueta), etiqueta);
    assert.match(b, /<ReqdColltnDt>2026-10-24<\/ReqdColltnDt>/);
  }
  assert.equal(xml.match(/<DrctDbtTxInf>/g)?.length, 3);
  assert.match(xml, /<InstdAmt Ccy="EUR">35\.50<\/InstdAmt>/);
  assert.match(xml, /<Nm>Bartomeu Canaves Nunez<\/Nm>/);
  assert.match(xml, /<IBAN>ES9121000418450200051332<\/IBAN>/);
  assert.match(xml, /<MndtId>IAQ-1<\/MndtId>\s*<DtOfSgntr>2025-01-15<\/DtOfSgntr>/);
  assert.match(xml, /<Ustrd>Quota 2026 - soci num. 1<\/Ustrd>/);
  // L'ordre dels elements del grup de pagament segueix l'esquema XSD.
  const ordre = ['<PmtInfId>', '<PmtMtd>', '<NbOfTxs>', '<CtrlSum>', '<PmtTpInf>', '<ReqdColltnDt>', '<Cdtr>', '<CdtrAcct>', '<CdtrAgt>', '<ChrgBr>', '<CdtrSchmeId>', '<DrctDbtTxInf>'];
  const pos = ordre.map((e) => blocs[0].indexOf(e));
  assert.deepEqual([...pos].sort((a, b) => a - b), pos);
});

// ---------- Model 200 ----------

test('model 200: obligació segons art. 124.3 LIS', () => {
  const e = (total: number, noExempts: number, senseRet: number) =>
    obligacioModel200({ total_cents: total * 100, no_exempts_cents: noExempts * 100, no_exempts_sense_retencio_cents: senseRet * 100 }).obligat;
  assert.equal(e(20_000, 0, 0), false);
  assert.equal(e(75_000, 2_000, 0), false); // als límits, encara exempta
  assert.equal(e(75_000.01, 0, 0), true);
  assert.equal(e(30_000, 2_000.01, 0), true);
  assert.equal(e(30_000, 500, 500), true); // rendes no exemptes sense retenció
  assert.equal(e(30_000, 500, 0), false); // p. ex. interessos bancaris amb retenció
  assert.equal(terminiModel200(2025), '2026-07-25');
});

// ---------- Exercicis tancats ----------

test('exercici tancat: els disparadors bloquegen moviments', async () => {
  const { MISSATGE_TANCAT } = await import('./esquema/tresoreria.ts');
  const { ambTancament } = await import('./tresoreria/tancament.ts');
  const compte = get<{ id: number }>('SELECT id FROM comptes LIMIT 1')!.id;
  const soci = run("INSERT INTO socis (num_soci, nom, data_alta) VALUES (900, 'Prova', '2020-01-01')").id;
  const mov = run(
    "INSERT INTO moviments (data, tipus, import_cents, concepte, compte_id, soci_id) VALUES ('2023-05-01', 'traspas', 100, 'x', ?, ?)",
    compte, soci,
  ).id;
  run('INSERT INTO exercicis_tancats (exercici) VALUES (2023)');
  const insereix = () =>
    run("INSERT INTO moviments (data, tipus, import_cents, concepte, compte_id) VALUES ('2023-12-31', 'traspas', 100, 'y', ?)", compte);
  assert.throws(insereix, (e: Error) => e.message.includes(MISSATGE_TANCAT));
  assert.throws(() => run('UPDATE moviments SET import_cents = 200 WHERE id = ?', mov), /Exercici tancat/);
  assert.throws(() => run("UPDATE moviments SET data = '2024-01-01' WHERE id = ?", mov), /Exercici tancat/);
  assert.throws(() => run('DELETE FROM moviments WHERE id = ?', mov), /Exercici tancat/);
  // Moure un moviment d'un any obert cap a un de tancat tampoc es pot.
  const obert = run("INSERT INTO moviments (data, tipus, import_cents, concepte, compte_id) VALUES ('2024-02-01', 'traspas', 100, 'z', ?)", compte).id;
  assert.throws(() => run("UPDATE moviments SET data = '2023-02-01' WHERE id = ?", obert), /Exercici tancat/);
  // Eliminar el soci posa soci_id a NULL: això sí que es permet.
  run('DELETE FROM socis WHERE id = ?', soci);
  assert.equal(get<{ soci_id: number | null }>('SELECT soci_id FROM moviments WHERE id = ?', mov)!.soci_id, null);
  // L'error es converteix en un 409 llegible.
  assert.throws(() => ambTancament(insereix), (e: Error & { status?: number }) => e.status === 409);
  run('DELETE FROM exercicis_tancats WHERE exercici = 2023');
  run('DELETE FROM moviments WHERE id IN (?, ?)', mov, obert);
});

// ---------- API: cobrament en bloc i remeses ----------

async function servidor() {
  const express = (await import('express')).default;
  const { quotesRouter } = await import('./routes/quotes.ts');
  const { tresoreriaRouter } = await import('./routes/tresoreria.ts');
  const { errorHandler } = await import('./util.ts');
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { usuari: unknown }).usuari = { id: 1, nom: 'Prova', usuari: 'prova', rol: 'admin' };
    next();
  });
  app.use('/quotes', quotesRouter);
  app.use('/tresoreria', tresoreriaRouter);
  app.use(errorHandler);
  const s = app.listen(0, '127.0.0.1');
  await new Promise((r) => s.once('listening', r));
  const base = `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
  const crida = async (method: string, path: string, body?: unknown) => {
    const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    return { status: r.status, body: text ? JSON.parse(text) : null };
  };
  return { crida, tanca: () => s.close() };
}

test('cobrament en bloc i remesa amb devolució', async () => {
  const { crida, tanca } = await servidor();
  try {
    const compte = get<{ id: number }>("SELECT id FROM comptes WHERE nom LIKE 'Compte%'")!.id;
    const socis = [1, 2, 3, 4].map((n) => run("INSERT INTO socis (num_soci, nom, llinatges, data_alta) VALUES (?, ?, 'Prova', '2025-01-01')", 100 + n, `Soci${n}`).id);
    const quotes = socis.map((s) => run("INSERT INTO quotes (soci_id, exercici, import_cents) VALUES (?, 2026, 2000)", s).id);

    // Cobrament en bloc de dues quotes: un moviment per quota, amb la forma de pagament indicada.
    let r = await crida('POST', '/quotes/cobrar-lot', { ids: quotes.slice(0, 2), data: '2026-04-01', compte_id: compte, metode: 'transferencia' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.cobrades, 2);
    const cobrades = all<{ estat: string; metode: string; moviment_id: number }>('SELECT * FROM quotes WHERE id IN (?, ?)', quotes[0], quotes[1]);
    assert.ok(cobrades.every((q) => q.estat === 'pagada' && q.metode === 'transferencia' && q.moviment_id));
    // Si una falla, no se'n cobra cap (transacció).
    r = await crida('POST', '/quotes/cobrar-lot', { ids: [quotes[2], quotes[0]], data: '2026-04-01', compte_id: compte });
    assert.equal(r.status, 409);
    assert.equal(get<{ estat: string }>('SELECT estat FROM quotes WHERE id = ?', quotes[2])!.estat, 'pendent');

    // Configuració SEPA i mandats de les altres dues.
    setConfig('nom', 'Associació de prova');
    setConfig('nif', 'G57123458');
    r = await crida('PUT', '/tresoreria/sepa', { identificador: '', compte_id: compte, iban: 'ES91 2100 0418 4502 0005 1332', bic: '' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    for (const [i, s] of socis.slice(2).entries()) {
      r = await crida('PUT', `/tresoreria/mandats/${s}`, {
        metode: 'domiciliacio', iban: 'ES9121000418450200051332', referencia: `IAQ-${3 + i}`, data_signatura: '2025-01-01', sequencia: 'FRST',
      });
      assert.equal(r.status, 200, JSON.stringify(r.body));
    }
    r = await crida('GET', '/tresoreria/remeses/quotes?exercici=2026');
    assert.equal(r.body.quotes.filter((q: { motiu: string | null }) => !q.motiu).length, 2);

    r = await crida('POST', '/tresoreria/remeses', { quota_ids: quotes.slice(2), data_cobrament: r.body.data_minima });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const remesa = r.body.id;
    r = await crida('GET', `/tresoreria/remeses/${remesa}`);
    assert.equal(r.body.total_cents, 4000);
    assert.match(r.body.xml, /<CtrlSum>40\.00<\/CtrlSum>/);
    // Una quota en remesa no es pot cobrar a mà.
    r = await crida('POST', `/quotes/${quotes[2]}/cobrar`, { data: '2026-04-01', compte_id: compte });
    assert.equal(r.status, 409);

    r = await crida('POST', `/tresoreria/remeses/${remesa}/cobra`, { data: '2026-04-10' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const movs = all<{ moviment_id: number; metode: string }>('SELECT moviment_id, metode FROM quotes WHERE id IN (?, ?)', quotes[2], quotes[3]);
    assert.equal(movs[0].moviment_id, movs[1].moviment_id, 'un sol ingrés agregat');
    assert.equal(get<{ import_cents: number }>('SELECT import_cents FROM moviments WHERE id = ?', movs[0].moviment_id)!.import_cents, 4000);
    assert.equal(get<{ sequencia: string }>('SELECT sequencia FROM mandats_sepa WHERE soci_id = ?', socis[2])!.sequencia, 'RCUR');

    const linia = get<{ id: number }>('SELECT id FROM remesa_linies WHERE remesa_id = ? AND quota_id = ?', remesa, quotes[2])!.id;
    r = await crida('POST', `/tresoreria/remeses/linies/${linia}/devolucio`, { data: '2026-04-15', motiu: 'AM04', comissio_cents: 300 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(get<{ estat: string }>('SELECT estat FROM quotes WHERE id = ?', quotes[2])!.estat, 'pendent');
    assert.equal(get<{ sequencia: string }>('SELECT sequencia FROM mandats_sepa WHERE soci_id = ?', socis[2])!.sequencia, 'FRST');
    const despeses = all<{ import_cents: number; nom: string }>(
      "SELECT m.import_cents, c.nom FROM moviments m JOIN categories c ON c.id = m.categoria_id WHERE m.tipus = 'despesa' AND m.data = '2026-04-15' ORDER BY m.import_cents",
    );
    assert.deepEqual(despeses.map((d) => [d.import_cents, d.nom]), [[300, 'Comissions bancàries'], [2000, 'Devolucions de rebuts']]);
    // El moviment agregat de la remesa no es pot anul·lar des de Quotes.
    r = await crida('POST', `/quotes/${quotes[3]}/anullar-cobrament`);
    assert.equal(r.status, 409);

    // Tancament i reobertura.
    r = await crida('POST', '/tresoreria/tancaments', { exercici: new Date().getFullYear() });
    assert.equal(r.status, 400); // l'exercici en curs (o futur) no es pot tancar si encara no ha acabat
  } finally {
    tanca();
  }
});
