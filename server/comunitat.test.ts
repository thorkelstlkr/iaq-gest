// Comunitat: validesa del certificat de delictes sexuals, avisos, totals d'hores de voluntariat,
// voluntaris no socis, registre d'altes i baixes, cobertura de l'assegurança i col·laboracions a les activitats.

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Cal fixar DB_PATH ABANS d'importar res que obri server/db.ts.
const dir = mkdtempSync(join(tmpdir(), 'comunitat-test-'));
process.env.DB_PATH = join(dir, 'prova.db');
const { db, run, get, all, setConfig } = await import('./db.ts');
const C = await import('./routes/comunitat.ts');
const { avisos } = await import('./avisos/comunitat.ts');
const { avui, sumaDies } = await import('../shared/dates.ts');

after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

let num = 0;
const soci = (nom: string, llinatges = 'Prova') =>
  run("INSERT INTO socis (num_soci, nom, llinatges, data_alta, dni, email) VALUES (?, ?, ?, '2024-01-01', '12345678Z', ?)", ++num, nom, llinatges, `${nom}@exemple.cat`).id;
const activitat = (nom: string, data: string) => run('INSERT INTO activitats (nom, data_inici) VALUES (?, ?)', nom, data).id;
const textos = () => avisos().map((a) => a.text);

test('suma de mesos i caducitat del certificat', () => {
  assert.equal(C.sumaMesos('2025-03-15', 12), '2026-03-15');
  assert.equal(C.sumaMesos('2025-01-31', 1), '2025-02-28');
  assert.equal(C.sumaMesos('2024-11-30', 3), '2025-02-28');
  assert.equal(C.sumaMesos('2025-06-10', -6), '2024-12-10');

  const ara = '2026-10-17';
  const e = (data: string | null, menors = 1, mesos = 12) => C.estatCertificat({ treballa_amb_menors: menors, certificat_delictes_data: data }, mesos, ara);
  assert.equal(e(null, 0).estat, 'no_cal');
  assert.equal(e(null).estat, 'falta');
  assert.deepEqual(e('2025-10-17'), { estat: 'caducat', caduca: '2026-10-17' }); // el dia que fa un any ja no és vàlid
  assert.equal(e('2025-10-18').estat, 'caduca_aviat');
  assert.equal(e('2025-11-20').estat, 'vigent');
  assert.equal(e('2026-01-10', 1, 6).estat, 'caducat'); // validesa configurable
  assert.equal(e('2026-01-10', 1, 24).estat, 'vigent');
});

test('validesa configurable (vol_validesa_certificat_mesos)', () => {
  assert.equal(C.configComunitat().vol_validesa_certificat_mesos, 12);
  setConfig('vol_validesa_certificat_mesos', '6');
  assert.equal(C.estatCertificat({ treballa_amb_menors: 1, certificat_delictes_data: sumaDies(-200) }).estat, 'caducat');
  setConfig('vol_validesa_certificat_mesos', '12');
  assert.equal(C.estatCertificat({ treballa_amb_menors: 1, certificat_delictes_data: sumaDies(-200) }).estat, 'vigent');
});

let aina = 0;
let extern = 0;

test('alta de voluntaris socis i no socis', () => {
  const sociAina = soci('Aina', 'Llompart Cifre');
  aina = C.creaVoluntari({ soci_id: sociAina, data_incorporacio: '2025-02-01', funcions: 'Tallers', acord_signat_el: '2025-02-01' });
  // Les dades personals d'un soci es llegeixen de la seva fitxa.
  const v = C.llistaVoluntaris().find((x) => x.id === aina)!;
  assert.equal(v.nom, 'Aina');
  assert.equal(v.dni, '12345678Z');
  assert.equal(v.email, 'Aina@exemple.cat');
  assert.equal(get<{ dni: string | null }>('SELECT dni FROM voluntaris WHERE id = ?', aina)!.dni, null);
  // El mateix soci no pot ser-hi dues vegades.
  assert.throws(() => C.creaVoluntari({ soci_id: sociAina, data_incorporacio: '2025-03-01' }), /ja consta/);

  // Persona externa: el nom és obligatori i es desen les seves dades.
  assert.throws(() => C.creaVoluntari({ data_incorporacio: '2025-03-01' }), /Nom/);
  extern = C.creaVoluntari({
    nom: 'Pau', llinatges: 'Cerdà Llull', dni: '43123456k', email: 'pau@exemple.cat', data_naixement: '1990-04-02',
    data_incorporacio: '2025-03-01', treballa_amb_menors: true,
  });
  const p = C.llistaVoluntaris().find((x) => x.id === extern)!;
  assert.equal(p.soci_id, null);
  assert.equal(p.dni, '43123456K');
  assert.equal(p.treballa_amb_menors, 1);
  assert.equal(p.certificat.estat, 'falta');
  assert.throws(() => C.creaVoluntari({ nom: 'X', data_incorporacio: '2025-03-01', data_baixa: '2025-01-01' }), /anterior/);

  // Si el soci canvia de nom (o s'anonimitza), la fitxa de voluntari el segueix.
  run("UPDATE socis SET llinatges = 'Llompart Vives' WHERE id = ?", sociAina);
  assert.equal(get<{ llinatges: string }>('SELECT llinatges FROM voluntaris WHERE id = ?', aina)!.llinatges, 'Llompart Vives');
});

test('registre d’altes i baixes amb reincorporació', () => {
  assert.throws(() => C.baixaVoluntari(extern, '2025-01-01', null), /anterior/);
  C.baixaVoluntari(extern, '2025-09-30', 'Canvi de feina');
  assert.throws(() => C.baixaVoluntari(extern, '2025-10-01', null), /ja és de baixa/);
  assert.equal(C.llistaVoluntaris().some((v) => v.id === extern), false);
  assert.equal(C.llistaVoluntaris({ tots: true }).some((v) => v.id === extern), true);
  C.reincorporaVoluntari(extern, '2026-01-15');
  const periodes = all<{ data_alta: string; data_baixa: string | null; motiu_baixa: string | null }>(
    'SELECT data_alta, data_baixa, motiu_baixa FROM voluntaris_periodes WHERE voluntari_id = ? ORDER BY id',
    extern,
  );
  assert.deepEqual(periodes.map((p) => ({ ...p })), [
    { data_alta: '2025-03-01', data_baixa: '2025-09-30', motiu_baixa: 'Canvi de feina' },
    { data_alta: '2026-01-15', data_baixa: null, motiu_baixa: null },
  ]);
  // La reincorporació demana un acord nou.
  assert.equal(get<{ a: string | null }>('SELECT acord_signat_el AS a FROM voluntaris WHERE id = ?', extern)!.a, null);
  assert.equal(C.registreVoluntaris().length, 3);
});

test('hores de voluntariat: entrada ràpida i totals anuals', () => {
  setConfig('vol_valor_hora_cents', '1200');
  const a1 = activitat('Taller de rondalles', '2026-03-14');
  const a2 = activitat('Xerrada dels molins', '2026-10-17');
  C.afegeixHores({ voluntari_ids: [aina, extern], activitat_id: a1, data: '2026-03-14', hores: '3,5', tasca: 'Monitoratge' });
  C.afegeixHores({ voluntari_id: aina, activitat_id: a2, data: '2026-10-17', hores: 2 });
  C.afegeixHores({ voluntari_id: aina, data: '2026-05-02', hores: 1.25, tasca: 'Arxiu' });
  C.afegeixHores({ voluntari_id: aina, data: '2025-12-20', hores: 4 }); // un altre exercici
  assert.throws(() => C.afegeixHores({ voluntari_id: aina, data: '2026-05-02', hores: 0 }), /hores/);
  assert.throws(() => C.afegeixHores({ voluntari_id: aina, data: '2026-05-02', hores: 25 }), /hores/);
  assert.throws(() => C.afegeixHores({ voluntari_ids: [], data: '2026-05-02', hores: 1 }), /almenys/);
  assert.throws(() => C.afegeixHores({ voluntari_id: 9999, data: '2026-05-02', hores: 1 }), /no existeix/);

  const r = C.resumVoluntariat(2026);
  assert.equal(r.hores_totals, 10.25);
  assert.equal(r.persones_amb_hores, 2);
  assert.equal(r.valor_hora_cents, 1200);
  assert.equal(r.valor_estimat_cents, 12300);
  const perAina = r.per_persona.find((p) => p.voluntari_id === aina)!;
  assert.equal(perAina.hores, 6.75);
  assert.equal(perAina.activitats, 2);
  assert.equal(perAina.valor_cents, 8100);
  const rondalles = r.per_activitat.find((p) => p.activitat_id === a1)!;
  assert.equal(rondalles.hores, 7);
  assert.equal(rondalles.persones, 2);
  assert.equal(r.per_activitat.find((p) => p.activitat_id === null)!.hores, 1.25);
  assert.equal(C.resumVoluntariat(2025).hores_totals, 4);

  const cert = C.dadesCertificat(aina, '2026-01-01', '2026-12-31');
  assert.equal(cert.hores, 6.75);
  assert.equal(cert.activitats.length, 3);
  assert.deepEqual(cert.tasques, ['Arxiu', 'Monitoratge']);
  assert.equal(C.llistaVoluntaris({ exercici: 2026 }).find((v) => v.id === aina)!.hores_exercici, 6.75);
});

test('cobertura de l’assegurança i avisos', () => {
  const ara = avui();
  // Sense cap pòlissa: avís de voluntaris sense assegurança, certificat que falta i acord pendent.
  let t = textos();
  assert.ok(t.some((x) => x.startsWith("Hi ha {0} persones voluntàries actives i cap assegurança d'accidents")));
  assert.ok(t.includes('{0} treballa amb menors i no té el certificat negatiu del Registre Central de Delinqüents Sexuals.'));
  assert.ok(t.includes("{0} persones voluntàries actives no tenen signat l'acord d'incorporació."));

  // Pòlissa d'accidents nominativa que només cobreix l'Aina i que venç d'aquí a 10 dies.
  const pol = run(
    "INSERT INTO assegurances (asseguradora, num_polissa, tipus, data_inici, data_venciment, nominativa) VALUES ('Mútua', 'AC-1', 'accidents_voluntaris', ?, ?, 1)",
    sumaDies(-355), sumaDies(10),
  ).id;
  run('INSERT INTO assegurances_voluntaris (asseguranca_id, voluntari_id) VALUES (?, ?)', pol, aina);
  let cob = C.cobertura(ara);
  assert.equal(cob.get(aina)!.accidents, true);
  assert.equal(cob.get(extern)!.accidents, false);
  t = textos();
  assert.ok(t.includes("{0} persones voluntàries actives no estan cobertes per l'assegurança d'accidents."));
  const venc = avisos().find((a) => a.text === "L'assegurança {0} (pòlissa {1}) venç el {2}.");
  assert.ok(venc);
  assert.equal(venc!.nivell, 'alerta');

  // Renovació: una pòlissa nova per a tothom fa desaparèixer l'avís de venciment i el de cobertura.
  run(
    "INSERT INTO assegurances (asseguradora, tipus, data_inici, data_venciment) VALUES ('Mútua', 'accidents_voluntaris', ?, ?)",
    sumaDies(11), sumaDies(376),
  );
  run("UPDATE assegurances SET data_inici = ? WHERE asseguradora = 'Mútua' AND num_polissa IS NULL", sumaDies(-1));
  cob = C.cobertura(ara);
  assert.equal(cob.get(extern)!.accidents, true);
  t = textos();
  assert.ok(!t.some((x) => x.includes('venç el') || x.includes('va vèncer')));
  assert.ok(!t.some((x) => x.includes("cobertes per l'assegurança")));

  // Pòlissa de responsabilitat civil vençuda i no substituïda.
  run("INSERT INTO assegurances (asseguradora, tipus, data_venciment) VALUES ('Segurs Illa', 'responsabilitat_civil', ?)", sumaDies(-3));
  assert.ok(avisos().some((a) => a.text === "L'assegurança {0} va vèncer el {1}." && a.valors![0] === 'Segurs Illa'));
  run("UPDATE assegurances SET no_renovar = 1 WHERE asseguradora = 'Segurs Illa'");
  assert.ok(!avisos().some((a) => a.valors?.[0] === 'Segurs Illa'));

  // Certificat: caducat → alerta; vigent → cap avís.
  run('UPDATE voluntaris SET certificat_delictes_data = ? WHERE id = ?', sumaDies(-400), extern);
  assert.ok(textos().includes('El certificat de delictes sexuals de {0} va caducar el {1}.'));
  run('UPDATE voluntaris SET certificat_delictes_data = ? WHERE id = ?', sumaDies(-350), extern);
  assert.ok(avisos().some((a) => a.text === 'El certificat de delictes sexuals de {0} caduca el {1}.' && a.nivell === 'info'));
  run('UPDATE voluntaris SET certificat_delictes_data = ?, acord_signat_el = ? WHERE id = ?', sumaDies(-10), sumaDies(-10), extern);
  t = textos();
  assert.ok(!t.some((x) => x.includes('delictes sexuals') || x.includes('Delinqüents')));
  assert.ok(!t.includes("{0} persones voluntàries actives no tenen signat l'acord d'incorporació."));
  // Tots els avisos del voluntariat porten a la seva pàgina i només els veu qui gestiona socis.
  assert.ok(avisos().every((a) => a.modul === 'socis'));
});

test('entitats col·laboradores, convenis i activitats', () => {
  const ajuntament = C.creaEntitat({ nom: 'Ajuntament de Pollença', tipus: 'ajuntament', nif: 'p0704200a' });
  const escola = C.creaEntitat({ nom: 'CEIP Joan Mas', tipus: 'escola' });
  assert.throws(() => C.creaEntitat({ nom: 'X', tipus: 'banc' }), /Tipus/);
  const a = activitat('Fira de les tradicions', '2026-05-10');
  const b = activitat('Ball de bot a la plaça', '2026-07-20');
  C.vinculaActivitat(ajuntament, a, 'espai_cedit', null);
  C.vinculaActivitat(ajuntament, b, 'patrocinador', 'Equip de so');
  C.vinculaActivitat(escola, a, undefined, null); // per defecte: col·laborador
  C.vinculaActivitat(ajuntament, a, 'organitzador', null); // actualitza el rol, no duplica
  assert.throws(() => C.vinculaActivitat(ajuntament, 9999, 'altres', null), /no existeix/);
  assert.throws(() => C.vinculaActivitat(ajuntament, b, 'mecenes', null), /Rol/);

  const ents = C.entitatsActivitat(a) as { nom: string; rol: string }[];
  assert.deepEqual(ents.map((e) => [e.nom, e.rol]), [['Ajuntament de Pollença', 'organitzador'], ['CEIP Joan Mas', 'collaborador']]);

  const conv = C.desaConveni({ entitat_id: ajuntament, titol: 'Cessió del Claustre', estat: 'vigent', data_inici: '2026-01-01', data_fi: sumaDies(40), import_cents: 150000 }, null);
  C.desaConveni({ entitat_id: ajuntament, titol: 'Esborrany 2027', import_cents: 99999 }, null);
  assert.throws(() => C.desaConveni({ entitat_id: ajuntament, titol: 'X', data_inici: '2026-02-01', data_fi: '2026-01-01' }, null), /anterior/);
  assert.throws(() => C.desaConveni({ entitat_id: ajuntament, titol: 'X', document: 'data:text/html;base64,AAAA' }, null), /PDF/);

  const f = C.fitxaEntitat(ajuntament) as unknown as { activitats: number; convenis: number; convenis_vigents: number; aportacions_cents: number; llista_activitats: unknown[] };
  assert.equal(f.activitats, 2);
  assert.equal(f.convenis, 2);
  assert.equal(f.convenis_vigents, 1);
  assert.equal(f.aportacions_cents, 150000); // els esborranys no compten
  assert.equal(f.llista_activitats.length, 2);

  // Conveni que acaba dins de 60 dies → avís informatiu; si ja ha acabat → alerta.
  let av = avisos().find((x) => x.text === 'El conveni «{0}» amb {1} acaba el {2}.');
  assert.equal(av?.nivell, 'info');
  assert.equal(av?.enllac, '/collaboradors');
  run('UPDATE convenis SET data_fi = ? WHERE id = ?', sumaDies(-1), conv);
  av = avisos().find((x) => x.text === 'El conveni «{0}» amb {1} va acabar el {2}.');
  assert.equal(av?.nivell, 'alerta');
  run('UPDATE convenis SET renovacio_automatica = 1 WHERE id = ?', conv);
  assert.ok(!avisos().some((x) => x.text.startsWith('El conveni')));

  // Esborrar una activitat esborra les col·laboracions.
  run('DELETE FROM activitats WHERE id = ?', b);
  assert.equal((C.fitxaEntitat(ajuntament) as unknown as { activitats: number }).activitats, 1);
});

test('documents adjunts: tipus i mida', () => {
  assert.equal(C.documentValid(''), null);
  assert.ok(C.documentValid('data:application/pdf;base64,JVBERi0xLjQ='));
  assert.ok(C.documentValid('data:image/jpeg;base64,/9j/4AAQ'));
  assert.throws(() => C.documentValid('data:image/gif;base64,R0lG'), /PDF/);
  const gros = 'data:application/pdf;base64,' + 'A'.repeat(Math.ceil((C.MAX_DOCUMENT * 4) / 3) + 8);
  assert.throws(() => C.documentValid(gros), /massa gran/);
});
