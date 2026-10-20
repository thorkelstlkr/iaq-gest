// Proves del mòdul fiscal: NIF, província, imports i dates dels extractes, Norma 43, duplicats,
// suggeriments de conciliació, retencions trimestrals, model 347 i avisos.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Abans d'importar res que obri la base de dades: carpeta temporal.
const dir = mkdtempSync(join(tmpdir(), 'fiscal-'));
process.env.DB_PATH = join(dir, 'prova.db');
const { db, get, run, DB_PATH } = await import('./db.ts');
assert.ok(DB_PATH.startsWith(dir), 'les proves no poden tocar la base de dades real');
const f = await import('./routes/fiscal.ts');
const { avisosA } = await import('./avisos/fiscal.ts');
after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

// ---------- Validacions ----------

test('NIF: DNI, NIE, K/L/M i persones jurídiques', () => {
  assert.ok(f.nifValid('12345678Z'));
  assert.ok(f.nifValid('12.345.678-z'));
  assert.ok(!f.nifValid('12345678A'));
  assert.ok(f.nifValid('X1234567L'));
  assert.ok(!f.nifValid('X1234567A'));
  assert.ok(f.nifValid('G57123457')); // associació (control amb xifra o lletra)
  assert.ok(f.nifValid('G5712345G'));
  assert.ok(!f.nifValid('G57123458'));
  assert.ok(f.nifValid('B07123458'));
  assert.ok(!f.nifValid('B07123450'));
  assert.ok(!f.nifValid('B0712345H')); // les S.L. sempre amb xifra
  assert.ok(f.nifValid('A58818501'));
  assert.ok(!f.nifValid('P0704200A0'));
  assert.equal(f.validaNif(' b-07123458 '), 'B07123458');
  assert.throws(() => f.validaNif('12345678A'), /no és vàlid/);
  assert.equal(f.validaNif('FR123456789', 'FR'), 'FR123456789'); // estrangers: tal qual
  assert.equal(f.tipusPersonaDeNif('B07123458'), 'juridica');
  assert.equal(f.tipusPersonaDeNif('X1234567L'), 'fisica');
});

test('NIF de persona jurídica: control amb lletra per a P, Q, S', () => {
  // P0700000 → suma: senars 0,0,0,0 ×2 → 0; parells 7,0,0 → 7; control = 3 → lletra C
  assert.ok(f.nifValid('P0700000C'));
  assert.ok(!f.nifValid('P07000003'));
});

test('província a partir del codi postal', () => {
  assert.equal(f.provinciaDeCp('07460'), '07');
  assert.equal(f.provinciaDeCp('08001'), '08');
  assert.equal(f.provinciaDeCp('52001'), '52');
  assert.equal(f.provinciaDeCp('53001'), null);
  assert.equal(f.provinciaDeCp('00123'), null);
  assert.equal(f.provinciaDeCp('7460'), null);
  assert.equal(f.provinciaDeCp('07460', 'FR'), null);
});

// ---------- Imports i dates dels CSV ----------

test('imports en format espanyol i variants', () => {
  assert.equal(f.llegeixImport('1.234,56'), 123456);
  assert.equal(f.llegeixImport('-1.234,56'), -123456);
  assert.equal(f.llegeixImport('12,5'), 1250);
  assert.equal(f.llegeixImport('255,00 €'), 25500);
  assert.equal(f.llegeixImport('12,50-'), -1250);
  assert.equal(f.llegeixImport('(45,00)'), -4500);
  assert.equal(f.llegeixImport('1,234.56'), 123456);
  assert.equal(f.llegeixImport('1.234'), 123400);
  assert.equal(f.llegeixImport('12.34'), 1234);
  assert.equal(f.llegeixImport('+300'), 30000);
  assert.equal(f.llegeixImport('1.234.567,8'), 123456780);
  assert.equal(f.llegeixImport(''), null);
  assert.equal(f.llegeixImport('abc'), null);
});

test('dates dels extractes', () => {
  assert.equal(f.llegeixData('03/10/2026'), '2026-10-03');
  assert.equal(f.llegeixData('3-10-26'), '2026-10-03');
  assert.equal(f.llegeixData('2026-10-03'), '2026-10-03');
  assert.equal(f.llegeixData('20261003'), '2026-10-03');
  assert.equal(f.llegeixData('31/02/2026'), null);
  assert.equal(f.llegeixData('hola'), null);
});

test('files CSV amb columna d’import o amb càrrecs i abonaments', () => {
  const files = [
    ['03/10/2026', 'Transf. Miquel Cerdà', '-255,00', '1.245,00'],
    ['05/10/2026', 'Quota soci', '20,00', '1.265,00'],
    ['xx', 'Error', '1', ''],
  ];
  const r = f.llegeixFilesCsv(files, { data: 0, concepte: 1, import: 2, saldo: 3 }, 2);
  assert.equal(r[0].linia?.import_cents, -25500);
  assert.equal(r[0].linia?.saldo_cents, 124500);
  assert.equal(r[1].linia?.import_cents, 2000);
  assert.equal(r[2].error, 'Data no vàlida: «{0}».');
  assert.equal(r[2].fila, 4);
  const r2 = f.llegeixFilesCsv([['03/10/2026', 'Lloguer', '190,00', ''], ['04/10/2026', 'Donatiu', '', '50,00']], { data: 0, concepte: 1, carrec: 2, abonament: 3 });
  assert.equal(r2[0].linia?.import_cents, -19000);
  assert.equal(r2[1].linia?.import_cents, 5000);
  assert.throws(() => f.llegeixFilesCsv(files, { data: 0, concepte: 1 }), /import/);
});

// ---------- Norma 43 ----------

const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);
const num = (c: number, n = 14) => String(c).padStart(n, '0');
function n43(): string {
  const reg11 = '11' + '2100' + '0418' + '0200051332' + '261001' + '261015' + '2' + num(150000) + '978' + '3' + pad('ASSOCIACIO I ARA QUE', 26) + '   ';
  const reg22a = '22' + '    ' + '0418' + '261003' + '261003' + '04' + '000' + '1' + num(25500) + num(0, 10) + pad('000000000123', 12) + pad('', 16);
  const reg23a = '23' + '01' + pad('TRANSF A MIQUEL CERDA', 38) + pad('ACTUACIO FESTES', 38);
  const reg22b = '22' + '    ' + '0418' + '261005' + '261006' + '02' + '000' + '2' + num(4000) + num(0, 10) + pad('', 12) + pad('DONATIU', 16);
  const reg33 = '33' + '2100' + '0418' + '0200051332' + num(1, 5) + num(25500) + num(1, 5) + num(4000) + '2' + num(150000 - 25500 + 4000) + '978' + '    ';
  const reg88 = '88' + '9'.repeat(18) + num(6, 5) + ' '.repeat(55);
  for (const r of [reg11, reg22a, reg23a, reg22b, reg33, reg88]) assert.equal(r.length, 80);
  return [reg11, reg22a, reg23a, reg22b, reg33, reg88].join('\r\n') + '\r\n';
}

test('Norma 43: capçalera, moviments, conceptes i saldo final', () => {
  const [c] = f.llegeixN43(n43());
  assert.equal(c.entitat, '2100');
  assert.equal(c.oficina, '0418');
  assert.equal(c.compte, '0200051332');
  assert.equal(c.data_inici, '2026-10-01');
  assert.equal(c.data_fi, '2026-10-15');
  assert.equal(c.saldo_inicial_cents, 150000);
  assert.equal(c.saldo_final_cents, 128500);
  assert.equal(c.divisa, '978');
  assert.deepEqual(c.avisos, []);
  assert.equal(c.linies.length, 2);
  assert.deepEqual(c.linies[0], {
    data: '2026-10-03', data_valor: '2026-10-03', concepte: 'TRANSF A MIQUEL CERDA ACTUACIO FESTES',
    import_cents: -25500, saldo_cents: 124500, referencia: '000000000123',
  });
  assert.equal(c.linies[1].concepte, 'DONATIU');
  assert.equal(c.linies[1].data_valor, '2026-10-06');
  assert.equal(c.linies[1].import_cents, 4000);
  assert.equal(c.linies[1].saldo_cents, 128500);
  assert.deepEqual(f.cccDeIban('ES91 2100 0418 4502 0005 1332'), { entitat: '2100', oficina: '0418', compte: '0200051332' });
});

test('Norma 43: totals incoherents i fitxers no vàlids', () => {
  const dolent = n43().replace(num(150000 - 25500 + 4000), num(999));
  assert.equal(f.llegeixN43(dolent)[0].avisos.length, 1);
  assert.throws(() => f.llegeixN43('hola\r\nadeu'), /Norma 43/);
  assert.throws(() => f.llegeixN43(''), /buit/);
});

// ---------- Base de dades ----------

const banc = run("INSERT INTO comptes (nom, iban) VALUES ('Banc prova', 'ES9121000418450200051332')").id;
const catDespesa = get<{ id: number }>("SELECT id FROM categories WHERE tipus = 'despesa' ORDER BY id")!.id;
const catIngres = get<{ id: number }>("SELECT id FROM categories WHERE tipus = 'ingres' ORDER BY id")!.id;
const moviment = (data: string, tipus: string, cents: number, concepte: string, cat: number | null = catDespesa) =>
  run('INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id) VALUES (?, ?, ?, ?, ?, ?)', data, tipus, cents, concepte, cat, banc).id;

test('importació: les línies repetides no es dupliquen', () => {
  const [c] = f.llegeixN43(n43());
  const p1 = f.preparaImportacio(banc, c.linies);
  assert.equal(p1.filter((l) => l.duplicada).length, 0);
  assert.equal(f.desaLinies(banc, p1, 'n43'), 2);
  const p2 = f.preparaImportacio(banc, c.linies);
  assert.equal(p2.filter((l) => l.duplicada).length, 2);
  assert.equal(f.desaLinies(banc, p2, 'n43'), 0);
  // Dues línies idèntiques al mateix fitxer sí que es desen totes dues.
  const igual = { data: '2026-10-07', data_valor: null, concepte: 'Comissió', import_cents: -150, saldo_cents: null, referencia: null };
  assert.equal(f.desaLinies(banc, f.preparaImportacio(banc, [igual, igual]), 'csv'), 2);
  assert.equal(f.desaLinies(banc, f.preparaImportacio(banc, [igual, igual]), 'csv'), 0);
});

test('suggeriments de conciliació: import, direcció i ±5 dies', () => {
  const bo = moviment('2026-10-01', 'despesa', 25500, 'Actuació Miquel Cerdà');
  moviment('2026-09-20', 'despesa', 25500, 'Massa lluny');
  moviment('2026-10-03', 'ingres', 25500, 'Direcció contrària', catIngres);
  moviment('2026-10-03', 'despesa', 25600, 'Import diferent');
  const linia = get<{ id: number }>("SELECT id FROM extracte_linies WHERE import_cents = -25500")!.id;
  const s = f.suggeriments(linia);
  assert.deepEqual(s.map((m) => m.id), [bo]);
  assert.equal(s[0].dies, 2);
  assert.ok(f.suggeriments(linia, true).length >= 2);
  f.vincula(linia, bo);
  assert.equal(get<{ estat: string }>('SELECT estat FROM extracte_linies WHERE id = ?', linia)!.estat, 'conciliat');
  // Un cop conciliat, ja no se suggereix per a cap altra línia del compte.
  const altra = run(
    "INSERT INTO extracte_linies (compte_id, data, concepte, import_cents, empremta) VALUES (?, '2026-10-02', 'x', -25500, 'prova-x')", banc,
  ).id;
  assert.equal(f.suggeriments(altra).length, 0);
  // Si s'esborra el moviment, la línia torna a pendent.
  run('DELETE FROM moviments WHERE id = ?', bo);
  assert.equal(get<{ estat: string }>('SELECT estat FROM extracte_linies WHERE id = ?', linia)!.estat, 'pendent');
  // Traspàs entrant: la línia positiva el troba al compte de destinació.
  const caixa = run("INSERT INTO comptes (nom) VALUES ('Caixa prova')").id;
  const tr = run(
    "INSERT INTO moviments (data, tipus, import_cents, concepte, compte_id, compte_desti_id) VALUES ('2026-10-05', 'traspas', 4000, 'Ingrés efectiu', ?, ?)", caixa, banc,
  ).id;
  const donatiu = get<{ id: number }>('SELECT id FROM extracte_linies WHERE import_cents = 4000')!.id;
  assert.deepEqual(f.suggeriments(donatiu).map((m) => m.id), [tr]);
  assert.throws(() => f.vincula(donatiu, moviment('2026-10-05', 'despesa', 4000, 'Despesa')), /direcció/);
});

test("crear moviment des de l'extracte: categoria del tipus correcte i exercici tancat", () => {
  const l = run(
    "INSERT INTO extracte_linies (compte_id, data, concepte, import_cents, empremta) VALUES (?, '2025-12-30', 'Comissió manteniment', -300, 'prova-tancat')", banc,
  ).id;
  assert.throws(() => f.creaMoviment(l, catIngres, 'Comissió'), /despesa/);
  run('INSERT INTO exercicis_tancats (exercici) VALUES (2025)');
  assert.throws(() => f.creaMoviment(l, catDespesa, 'Comissió'), /Exercici tancat/);
  run('DELETE FROM exercicis_tancats WHERE exercici = 2025');
  const id = f.creaMoviment(l, catDespesa, 'Comissió');
  const m = get<{ tipus: string; import_cents: number; data: string }>('SELECT tipus, import_cents, data FROM moviments WHERE id = ?', id)!;
  assert.deepEqual({ ...m }, { tipus: 'despesa', import_cents: 300, data: '2025-12-30' });
  assert.equal(get<{ moviment_id: number }>('SELECT moviment_id FROM extracte_linies WHERE id = ?', l)!.moviment_id, id);
});

test('saldo de l’aplicació en una data', () => {
  const c = run("INSERT INTO comptes (nom, saldo_inicial_cents) VALUES ('Saldo', 10000)").id;
  run("INSERT INTO moviments (data, tipus, import_cents, concepte, compte_id) VALUES ('2026-01-10', 'ingres', 5000, 'a', ?)", c);
  run("INSERT INTO moviments (data, tipus, import_cents, concepte, compte_id) VALUES ('2026-01-20', 'despesa', 2000, 'b', ?)", c);
  assert.equal(f.saldoAplicacio(c, '2026-01-15'), 15000);
  assert.equal(f.saldoAplicacio(c, '2026-01-31'), 13000);
});

// ---------- Retencions ----------

const tercer = (nom: string, nif: string | null) => run('INSERT INTO tercers (nom, nif) VALUES (?, ?)', nom, nif).id;

test('dades fiscals: base = net + retenció', () => {
  const t = tercer('Miquel Cerdà', '12345678Z');
  const d = f.calculaFiscal(25500, { tercer_id: t, retencio_pct: 15, tipus_retencio: 'professional' });
  assert.equal(d.base_cents, 30000);
  assert.equal(d.retencio_cents, 4500);
  assert.throws(() => f.calculaFiscal(25500, { tercer_id: t, retencio_pct: 15, base_cents: 25500, tipus_retencio: 'professional' }), /no quadra/);
  assert.throws(() => f.calculaFiscal(25500, { tercer_id: t, retencio_pct: 15 }), /tipus de retenció/);
  assert.throws(() => f.calculaFiscal(25500, { retencio_pct: 15, tipus_retencio: 'professional' }), /tercer/);
  assert.equal(f.calculaFiscal(10000, { tercer_id: t, retencio_pct: 15, tipus_retencio: 'professional' }).base_cents, 11765);
  assert.equal(f.calculaFiscal(10000, { tercer_id: t }).base_cents, 10000);
});

test('resums trimestrals 111 i 115, anuals 190 i 180, i pagament', () => {
  const musica = tercer('Música', '12345678Z');
  const ponent = tercer('Ponent', 'X1234567L');
  const propietari = tercer('Propietari', '00000000T');
  const assigna = (mov: number, dades: Record<string, unknown>, net: number) => {
    const d = f.calculaFiscal(net, dades);
    run(
      'INSERT INTO moviments_fiscal (moviment_id, tercer_id, base_cents, retencio_pct, retencio_cents, tipus_retencio, clau_190) VALUES (?, ?, ?, ?, ?, ?, ?)',
      mov, d.tercer_id, d.base_cents, d.retencio_pct, d.retencio_cents, d.tipus_retencio, d.clau_190,
    );
  };
  assigna(moviment('2024-07-15', 'despesa', 25500, 'Concert'), { tercer_id: musica, retencio_pct: 15, tipus_retencio: 'professional', clau_190: 'G01' }, 25500);
  assigna(moviment('2024-08-02', 'despesa', 25500, 'Concert 2'), { tercer_id: musica, retencio_pct: 15, tipus_retencio: 'professional', clau_190: 'G01' }, 25500);
  assigna(moviment('2024-09-10', 'despesa', 17000, 'Xerrada'), { tercer_id: ponent, retencio_pct: 15, tipus_retencio: 'professional', clau_190: 'F01' }, 17000);
  for (const m of ['2024-07-01', '2024-08-01', '2024-09-01'])
    assigna(moviment(m, 'despesa', 16200, 'Lloguer magatzem'), { tercer_id: propietari, retencio_pct: 19, tipus_retencio: 'arrendament' }, 16200);
  const t3 = f.resumTrimestral('111', 2024)[2];
  assert.equal(t3.perceptors, 2);
  assert.equal(t3.base_cents, 30000 + 30000 + 20000);
  assert.equal(t3.retencio_cents, 4500 + 4500 + 3000);
  assert.equal(t3.treball.perceptors, 1);
  assert.equal(t3.activitats.retencio_cents, 9000);
  assert.equal(t3.termini, '2024-10-20');
  assert.equal(f.resumTrimestral('111', 2024)[0].retencio_cents, 0);
  const l3 = f.resumTrimestral('115', 2024)[2];
  assert.equal(l3.perceptors, 1);
  assert.equal(l3.base_cents, 60000);
  assert.equal(l3.retencio_cents, 11400);
  assert.equal(f.terminiTrimestral(2024, 4), '2025-01-30');
  const r190 = f.resumAnual('111', 2024);
  assert.equal(r190.length, 2);
  assert.equal(r190.find((r) => r.nom === 'Música')?.pagaments, 2);
  assert.equal(f.resumAnual('115', 2024)[0].retencio_cents, 11400);
  // Avisos: termini del 3T a menys de 15 dies.
  assert.ok(avisosA('2024-10-10').some((a) => a.text.startsWith('Cal presentar el model {0}') && a.valors?.[0] === '111'));
  assert.ok(avisosA('2024-10-10').some((a) => a.valors?.[0] === '115'));
  assert.ok(!avisosA('2024-09-20').some((a) => a.text.startsWith('Cal presentar el model {0}')));
  assert.ok(avisosA('2025-01-10').some((a) => a.text.includes('model 190')));
  // Pagament del trimestre: moviment a la categoria de retencions i ja no avisa.
  const p = f.registraPagament('111', 2024, 3, '2024-10-18', banc);
  assert.equal(p.import_cents, 12000);
  assert.equal(get<{ nom: string }>('SELECT c.nom FROM moviments m JOIN categories c ON c.id = m.categoria_id WHERE m.id = ?', p.moviment_id)!.nom, f.NOM_CATEGORIA_RETENCIONS);
  assert.throws(() => f.registraPagament('111', 2024, 3, '2024-10-18', banc), /ja té/);
  assert.ok(!avisosA('2024-10-10').some((a) => a.valors?.[0] === '111'));
});

test('model 347: llindar de 3.005,06 € per tercer i clau, sense operacions amb retenció', () => {
  const impremta = tercer('Impremta', 'B07123458');
  const petit = tercer('Petit proveïdor', 'A58818501');
  const assigna = (mov: number, t: number, net: number) =>
    run('INSERT INTO moviments_fiscal (moviment_id, tercer_id, base_cents) VALUES (?, ?, ?)', mov, t, net);
  assigna(moviment('2023-03-01', 'despesa', 200000, 'Llibres'), impremta, 200000);
  assigna(moviment('2023-11-01', 'despesa', 100507, 'Cartells'), impremta, 100507);
  assigna(moviment('2023-05-01', 'despesa', 300506, 'Just al llindar'), petit, 300506);
  const r = f.model347(2023);
  const imp = r.find((x) => x.tercer_id === impremta)!;
  assert.equal(imp.total_cents, 300507);
  assert.equal(imp.t1_cents, 200000);
  assert.equal(imp.t4_cents, 100507);
  assert.equal(imp.clau, 'A');
  assert.ok(imp.supera);
  assert.equal(r.find((x) => x.tercer_id === petit)!.supera, false);
  // Les factures emeses a un client vinculat compten com a clau B.
  const client = run("INSERT INTO clients (nom, nif) VALUES ('Ajuntament', 'P0700000C')").id;
  run('UPDATE tercers SET client_id = ? WHERE id = ?', client, petit);
  const serie = get<{ id: number }>("SELECT id FROM series_factura WHERE codi = 'A'")!.id;
  run(
    "INSERT INTO factures (serie_id, tipus_factura, data_expedicio, client_id, total_cents, estat) VALUES (?, 'F1', '2023-06-01', ?, 400000, 'emesa')",
    serie, client,
  );
  const b = f.model347(2023).find((x) => x.tercer_id === petit && x.clau === 'B')!;
  assert.equal(b.total_cents, 400000);
  assert.equal(b.t2_cents, 400000);
  assert.ok(avisosA('2024-02-10').some((a) => a.text.includes('347') && a.valors?.[0] === 2));
});

test('importa tercers dels clients de facturació', () => {
  run("INSERT INTO clients (nom, nif, codi_postal) VALUES ('Hotel Illa', 'B07123458', '07470')"); // mateix NIF que la impremta: es vincula
  run("INSERT INTO clients (nom, nif, codi_postal) VALUES ('Escola', NULL, '07460')");
  const r = f.importaClients();
  assert.equal(r.vinculats, 1);
  assert.equal(r.creats, 1);
  assert.equal(get<{ codi_provincia: string }>("SELECT codi_provincia FROM tercers WHERE nom = 'Escola'")!.codi_provincia, '07');
  assert.deepEqual(f.importaClients(), { creats: 0, vinculats: 0, nif_dubtosos: 0 });
});

test('avís de línies pendents de fa més de 30 dies', () => {
  assert.ok(avisosA('2026-12-31').some((a) => a.text.includes('pendents de conciliar')));
  assert.ok(!avisosA('2026-10-20').some((a) => a.text.includes('pendents de conciliar')));
});
