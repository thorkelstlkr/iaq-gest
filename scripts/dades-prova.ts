// Omple la base de dades amb dades de prova realistes.
// Ús: npm run dades-prova   (afegeix --force per fer-ho encara que ja hi hagi socis)

import { all, get, getConfig, run, setConfig, tx } from '../server/db.ts';
import { OBJECTIUS } from '../shared/objectius.ts';
import { existsSync } from 'node:fs';

const existents = get<{ n: number }>('SELECT COUNT(*) AS n FROM socis')!.n;
if (existents > 0 && !process.argv.includes('--force')) {
  console.log(`Ja hi ha ${existents} socis a la base de dades. No s'hi afegeix res (usa --force per forçar-ho).`);
  process.exit(0);
}

const cat = (nom: string) => get<{ id: number }>('SELECT id FROM categories WHERE nom = ?', nom)!.id;
const tipusQuota = (prefix: string) => get<{ id: number }>('SELECT id FROM tipus_quota WHERE nom LIKE ?', prefix + '%')!.id;
const compte = (prefix: string) => get<{ id: number }>('SELECT id FROM comptes WHERE nom LIKE ?', prefix + '%')!.id;

const CAIXA = compte('Caixa');
const BANC = compte('Compte');

// [nom, llinatges, naixement, gènere, tipus quota, data alta, data baixa]
const SOCIS: [string, string, string, string, string, string, string | null][] = [
  ['Margalida', 'Cerdà Vives', '1946-03-12', 'dona', 'Gent gran', '2024-02-01', null],
  ['Joan', 'Bennàsar Serra', '1951-07-02', 'home', 'Gent gran', '2024-02-01', null],
  ['Catalina', 'Torrandell Reus', '1958-04-22', 'dona', 'Gent gran', '2024-02-01', null],
  ['Bartomeu', 'Cifre Salas', '1949-11-30', 'home', 'Gent gran', '2024-03-15', null],
  ['Francisca', 'Vives Llobera', '1953-01-19', 'dona', 'Gent gran', '2024-03-15', null],
  ['Antònia', 'Mir Cerdà', '1960-09-08', 'dona', 'General', '2024-02-01', null],
  ['Aina', 'Llompart Cifre', '1982-11-20', 'dona', 'General', '2024-02-01', null],
  ['Miquel', 'Siquier Crespí', '1979-01-05', 'home', 'General', '2024-02-01', null],
  ['Pere', 'Reus Bennàsar', '1975-06-14', 'home', 'Familiar', '2024-04-10', null],
  ['Maria', 'Crespí Torres', '1988-08-25', 'dona', 'General', '2024-04-10', null],
  ['Llorenç', 'Salas Mir', '1970-12-03', 'home', 'General', '2024-06-01', '2025-12-31'],
  ['Joana', 'Ferrer Serra', '1985-03-27', 'dona', 'General', '2025-01-20', null],
  ['Rafel', 'Cànaves Vicens', '1992-10-11', 'home', 'General', '2025-01-20', null],
  ['Francina', 'Vicens Mas', '2002-06-18', 'dona', 'Jove', '2025-02-05', null],
  ['Tomeu', 'Llobera Siquier', '2004-02-09', 'home', 'Jove', '2025-02-05', null],
  ['Neus', 'Serra Cànaves', '2006-05-30', 'dona', 'Jove', '2025-09-12', null],
  ['Guillem', 'Mas Ferrer', '2000-07-21', 'home', 'Jove', '2026-01-10', null],
  ['Biel', 'Cifre Llompart', '2015-09-30', 'home', 'Infant', '2025-02-05', null],
  ['Maria', 'Reus Crespí', '2016-04-17', 'dona', 'Infant', '2024-04-10', null],
  ['Toni', 'Cànaves Ferrer', '2013-02-14', 'home', 'Infant', '2025-09-12', null],
  ['Llucia', 'Siquier Llompart', '2018-12-01', 'dona', 'Infant', '2026-02-20', null],
  ['Jaume', 'Torres Vives', '1964-05-05', 'home', 'General', '2026-03-03', null],
  ['Magdalena', 'Salas Torrandell', '1943-08-15', 'dona', 'Gent gran', '2026-03-03', null],
  ['Sebastià', 'Mir Bennàsar', '1998-11-11', 'home', 'Jove', '2024-06-01', '2025-06-30'],
];

const CARRERS = ['Carrer Major', "Carrer de l'Àngel", 'Carrer del Temple', 'Plaça Major', 'Carrer de Montesió', 'Carrer del Calvari'];

// [nom, inici, fi, lloc, objectius, participants, descripció]
const ACTIVITATS: [string, string, string | null, string, string, number | null, string][] = [
  ['Taller de rondalles amb padrins i nets', '2025-03-15', null, 'Casal de cultura', 'a,c', 28, 'Transmissió oral de rondalles mallorquines entre generacions.'],
  ['Recull de receptes de Setmana Santa', '2025-04-05', null, 'Club de la Tercera Edat', 'a,c,d', 22, 'Enregistrament de receptes tradicionals de panades i robiols.'],
  ['Exposició «Pollença en blanc i negre»', '2025-07-20', '2025-08-10', 'Claustre de Sant Domingo', 'd,e', 640, 'Fotografies antigues cedides per famílies pollencines.'],
  ['Itinerari pels oficis perduts', '2025-10-18', null, 'Nucli antic', 'b,e', 35, 'Ruta guiada per antigues fusteries, ferreries i forns.'],
  ['Taller de jocs tradicionals a l’escola', '2025-11-22', null, 'CEIP Pollença', 'b,c,f', 60, 'Col·laboració amb el centre educatiu.'],
  ['Xerrada: les dones i els oficis tradicionals', '2026-02-28', null, 'Casal de cultura', 'e,g', 48, 'Memòria del treball femení a la Pollença del segle XX.'],
  ['Taller de rondalles amb padrins i nets', '2026-03-14', null, 'Casal de cultura', 'a,c', 34, 'Segona edició.'],
  ['Recull fotogràfic de les festes de la Patrona', '2026-05-02', '2026-06-30', 'Diversos', 'd', 12, 'Digitalització de fotografies de la festa de Moros i Cristians.'],
  ['Taller de cançons de feina', '2026-06-13', null, 'Sa Nostra', 'a,c,e', 26, 'Aprenentatge de cançons de batre i de collir olives.'],
  ['Xerrada: la Pollença de l’aigua i els molins', '2026-10-17', null, 'Claustre de Sant Domingo', 'd,e', null, 'Programada.'],
  ['Mostra de cuina de padrines', '2026-11-21', null, 'Mercat', 'a,c,g', null, 'Programada.'],
];

// [data, tipus, import (€), concepte, categoria, compte, activitat (índex), justificant]
const MOVIMENTS: [string, 'ingres' | 'despesa', number, string, string, number, number | null, string | null][] = [
  ['2025-02-10', 'ingres', 1200, 'Subvenció Ajuntament de Pollença – cultura popular', 'Subvencions públiques', BANC, null, 'Decret 2025/0214'],
  ['2025-03-15', 'despesa', 64.3, 'Berenar i material del taller', 'Activitats i tallers', CAIXA, 0, 'Tiquet 1123'],
  ['2025-04-05', 'despesa', 38.9, 'Ingredients per a la demostració', 'Material i subministraments', CAIXA, 1, 'Tiquet 2231'],
  ['2025-05-02', 'despesa', 185, 'Assegurança de responsabilitat civil 2025', 'Assegurances', BANC, null, 'Pòlissa RC-7781'],
  ['2025-06-20', 'ingres', 300, 'Patrocini Forn de Can Cifre', 'Patrocinis i col·laboracions', BANC, 2, 'Conveni 03/2025'],
  ['2025-07-10', 'despesa', 412.5, 'Impressió de fotografies i plafons', 'Publicacions i impremta', BANC, 2, 'F-2025-311'],
  ['2025-07-20', 'ingres', 145.5, 'Donatius a l’exposició', 'Donacions', CAIXA, 2, null],
  ['2025-10-18', 'ingres', 175, 'Inscripcions a l’itinerari (35 × 5 €)', 'Vendes i inscripcions a activitats', CAIXA, 3, null],
  ['2025-10-18', 'despesa', 120, 'Guia de l’itinerari', 'Serveis professionals', BANC, 3, 'F-0045'],
  ['2025-11-22', 'despesa', 47.8, 'Material de jocs (baldufes, cordes)', 'Material i subministraments', CAIXA, 4, 'Tiquet 8810'],
  ['2025-12-31', 'despesa', 36, 'Comissions bancàries 2025', 'Comissions bancàries', BANC, null, null],
  ['2026-02-15', 'ingres', 1500, 'Subvenció Ajuntament de Pollença – cultura popular', 'Subvencions públiques', BANC, null, 'Decret 2026/0123'],
  ['2026-02-28', 'despesa', 150, 'Honoraris ponent xerrada', 'Serveis professionals', BANC, 5, 'F-2026-12'],
  ['2026-03-14', 'despesa', 85.4, 'Berenar i material del taller', 'Activitats i tallers', CAIXA, 6, 'Tiquet 0451'],
  ['2026-04-20', 'despesa', 320, 'Impressió del llibret de rondalles', 'Publicacions i impremta', BANC, 6, 'F-2026-88'],
  ['2026-05-04', 'despesa', 192, 'Assegurança de responsabilitat civil 2026', 'Assegurances', BANC, null, 'Pòlissa RC-7781'],
  ['2026-05-20', 'ingres', 250, 'Donació d’una família sòcia', 'Donacions', BANC, null, null],
  ['2026-06-01', 'despesa', 89.99, 'Escàner per digitalitzar fotografies', 'Arxiu i documentació', BANC, 7, 'F-2026-140'],
  ['2026-06-13', 'despesa', 60, 'Lloguer de la sala', 'Lloguers', CAIXA, 8, 'Rebut 22'],
  ['2026-06-13', 'ingres', 130, 'Inscripcions al taller de cançons', 'Vendes i inscripcions a activitats', CAIXA, 8, null],
  ['2026-09-10', 'despesa', 45, 'Desplaçament a la trobada d’entitats a Palma', 'Desplaçaments', CAIXA, null, null],
];

tx(() => {
  run('UPDATE comptes SET saldo_inicial_cents = 15000 WHERE id = ?', CAIXA);
  run('UPDATE comptes SET saldo_inicial_cents = 85000 WHERE id = ?', BANC);

  let num = get<{ n: number }>('SELECT COALESCE(MAX(num_soci), 0) AS n FROM socis')!.n;
  SOCIS.forEach(([nom, llinatges, naix, genere, quota, alta, baixa], i) => {
    const menor = naix > '2008-09-26';
    run(
      `INSERT INTO socis (num_soci, nom, llinatges, dni, data_naixement, genere, adreca, codi_postal, poblacio,
         telefon, email, data_alta, data_baixa, motiu_baixa, tipus_quota_id, tutor_legal, consentiment_dades, drets_imatge)
       VALUES (?, ?, ?, ?, ?, ?, ?, '07460', 'Pollença', ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      ++num, nom, llinatges,
      menor ? null : `${String(43000000 + i * 1379).padStart(8, '0')}${'TRWAGMYFPDXBNJZSQVHLCKE'[(43000000 + i * 1379) % 23]}`,
      naix, genere, `${CARRERS[i % CARRERS.length]}, ${(i * 7) % 60 + 1}`,
      `6${String(10000000 + i * 734521).slice(0, 8)}`,
      menor ? null : `${nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${llinatges.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@exemple.cat`,
      alta, baixa, baixa ? 'Canvi de residència' : null, tipusQuota(quota),
      menor ? `Pare/mare de ${nom}` : null, i % 5 === 0 ? 0 : 1,
    );
  });

  // Quotes 2025 i 2026 per als socis actius en cada exercici.
  const categoriaQuotes = Number(getConfig('categoria_quotes'));
  for (const exercici of [2025, 2026]) {
    const socis = all<{ id: number; num_soci: number; nom: string; llinatges: string; import_cents: number }>(
      `SELECT s.id, s.num_soci, s.nom, s.llinatges, t.import_cents FROM socis s JOIN tipus_quota t ON t.id = s.tipus_quota_id
        WHERE s.data_alta <= ? AND (s.data_baixa IS NULL OR s.data_baixa >= ?)
          AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.soci_id = s.id AND q.exercici = ?)`,
      `${exercici}-12-31`, `${exercici}-01-01`, exercici,
    );
    socis.forEach((s, i) => {
      if (s.import_cents === 0) {
        run("INSERT INTO quotes (soci_id, exercici, import_cents, estat) VALUES (?, ?, 0, 'exempta')", s.id, exercici);
        return;
      }
      // 2025: tot cobrat menys un; 2026: aproximadament dues terceres parts cobrades.
      const cobrada = exercici === 2025 ? i !== 3 : i % 3 !== 2;
      if (!cobrada) {
        run("INSERT INTO quotes (soci_id, exercici, import_cents, estat) VALUES (?, ?, ?, 'pendent')", s.id, exercici, s.import_cents);
        return;
      }
      const data = `${exercici}-0${2 + (i % 3)}-${String(5 + (i % 20)).padStart(2, '0')}`;
      const mov = run(
        `INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, soci_id)
         VALUES (?, 'ingres', ?, ?, ?, ?, ?)`,
        data, s.import_cents, `Quota ${exercici} – soci núm. ${s.num_soci} (${s.nom} ${s.llinatges})`,
        categoriaQuotes, i % 2 ? CAIXA : BANC, s.id,
      );
      run(
        "INSERT INTO quotes (soci_id, exercici, import_cents, estat, data_pagament, moviment_id) VALUES (?, ?, ?, 'pagada', ?, ?)",
        s.id, exercici, s.import_cents, data, mov.id,
      );
    });
  }

  const idsActivitats = ACTIVITATS.map(([nom, inici, fi, lloc, objectius, participants, descripcio]) =>
    run(
      'INSERT INTO activitats (nom, data_inici, data_fi, lloc, objectius, participants, descripcio) VALUES (?, ?, ?, ?, ?, ?, ?)',
      nom, inici, fi, lloc, objectius, participants, descripcio,
    ).id,
  );

  for (const [data, tipus, euros, concepte, categoria, compteId, act, justificant] of MOVIMENTS) {
    run(
      `INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, activitat_id, justificant)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      data, tipus, Math.round(euros * 100), concepte, cat(categoria), compteId,
      act === null ? null : idsActivitats[act], justificant,
    );
  }

  // Traspassos entre caixa i banc.
  run(
    `INSERT INTO moviments (data, tipus, import_cents, concepte, compte_id, compte_desti_id) VALUES
      ('2025-03-01', 'traspas', 20000, 'Retirada per a la caixa', ?, ?),
      ('2025-11-30', 'traspas', 25000, 'Ingrés de l’efectiu al banc', ?, ?),
      ('2026-03-02', 'traspas', 20000, 'Retirada per a la caixa', ?, ?)`,
    BANC, CAIXA, CAIXA, BANC, BANC, CAIXA,
  );
});

// Dades de l'entitat d'exemple (I ara qué?), si encara no n'hi ha.
tx(() => {
  run(
    `UPDATE socis SET consentiment_data = data_alta,
       consentiment_signant = CASE WHEN tutor_legal IS NOT NULL THEN 'tutor' ELSE 'soci' END
     WHERE consentiment_dades = 1 AND consentiment_data IS NULL`,
  );
  if (!getConfig('nom')) {
    setConfig('nom', 'I ara qué?');
    setConfig(
      'nom_complet',
      "Associació I ara qué? per a la preservació i transmissió intergeneracional de la cultura, tradició i usos propis de Pollença",
    );
    setConfig('lema', 'Cultura i tradició de Pollença');
    setConfig('adreca', 'Pollença (Illes Balears)');
    setConfig('poblacio', 'Pollença');
    setConfig('codi_postal', '07460');
  }
  if (!get<{ n: number }>('SELECT COUNT(*) AS n FROM finalitats')!.n) {
    OBJECTIUS.forEach((o, i) =>
      run('INSERT INTO finalitats (codi, curt, text, ordre) VALUES (?, ?, ?, ?)', o.codi, o.curt, o.text, i),
    );
  }
});

// CRM: etiquetes, contactes, tasques, persones interessades i inscripcions.
tx(() => {
  const etiqueta = (nom: string, color: string) =>
    get<{ id: number }>('SELECT id FROM etiquetes WHERE nom = ?', nom)?.id ??
    run('INSERT INTO etiquetes (nom, color) VALUES (?, ?)', nom, color).id;
  const E = {
    junta: etiqueta('Junta', '#9a3b25'),
    voluntariat: etiqueta('Voluntariat', '#56662c'),
    musica: etiqueta('Música', '#2f6f8f'),
    cuina: etiqueta('Cuina', '#b7802a'),
    talleristes: etiqueta('Dona tallers', '#7a4a8c'),
  };
  const soci = (nom: string, llinatges: string) =>
    get<{ id: number }>('SELECT id FROM socis WHERE nom = ? AND llinatges = ?', nom, llinatges)!.id;
  const posa = (s: number, ...es: number[]) =>
    es.forEach((e) => run('INSERT OR IGNORE INTO socis_etiquetes (soci_id, etiqueta_id) VALUES (?, ?)', s, e));

  const margalida = soci('Margalida', 'Cerdà Vives');
  const joan = soci('Joan', 'Bennàsar Serra');
  const aina = soci('Aina', 'Llompart Cifre');
  const miquel = soci('Miquel', 'Siquier Crespí');
  const francina = soci('Francina', 'Vicens Mas');
  const catalina = soci('Catalina', 'Torrandell Reus');
  const antonia = soci('Antònia', 'Mir Cerdà');
  const bartomeu = soci('Bartomeu', 'Cifre Salas');
  posa(aina, E.junta, E.voluntariat);
  posa(miquel, E.junta);
  posa(antonia, E.junta, E.cuina);
  posa(margalida, E.talleristes, E.cuina);
  posa(joan, E.talleristes, E.musica);
  posa(bartomeu, E.talleristes);
  posa(francina, E.voluntariat, E.musica);
  posa(catalina, E.cuina);

  const contacte = (s: number, data: string, tipus: string, resum: string) =>
    run("INSERT INTO interaccions (soci_id, data, tipus, resum, autor) VALUES (?, ?, ?, ?, 'Aina Llompart')", s, data, tipus, resum);
  contacte(margalida, '2026-02-20', 'trucada', 'Accepta conduir el taller de rondalles amb els seus nets.');
  contacte(margalida, '2026-09-15', 'reunio', 'Prepara la Mostra de cuina de padrines: portarà receptes de panades.');
  contacte(joan, '2026-05-30', 'trucada', "Pot ensenyar cançons de batre al taller de juny. Demana un equip de so.");
  contacte(joan, '2026-10-02', 'missatge', "Confirma que té fotos antigues de molins per a la xerrada d'octubre.");
  contacte(bartomeu, '2026-09-28', 'nota', "Té eines de ferrer del seu padrí; vol cedir-les a l'arxiu de l'entitat.");
  contacte(francina, '2026-06-14', 'correu', 'Envia les fotos del taller de cançons per a les xarxes.');
  contacte(catalina, '2026-04-11', 'trucada', 'Recorda que té la quota pendent; diu que la pagarà a la propera activitat.');

  const tasca = (titol: string, data: string | null, s: number | null) =>
    run('INSERT INTO tasques (titol, data_limit, soci_id) VALUES (?, ?, ?)', titol, data, s);
  tasca('Confirmar la sala del Claustre per a la xerrada dels molins', '2026-10-10', null);
  tasca('Recollir les fotos de molins', '2026-10-14', joan);
  tasca('Anar a veure les eines de ferrer i fer-ne inventari', '2026-10-24', bartomeu);
  tasca("Demanar pressupost d'impremta per al receptari", '2026-11-05', null);
  tasca('Fer signar el consentiment RGPD', null, antonia);

  const interessat = (nom: string, llinatges: string, data: string, origen: string, interessos: string, estat: string, contacte: string) =>
    run(
      'INSERT INTO interessats (nom, llinatges, data, origen, interessos, estat, email, telefon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      nom, llinatges, data, origen, interessos, estat,
      contacte.includes('@') ? contacte : null, contacte.includes('@') ? null : contacte,
    );
  interessat('Llúcia', 'Vives Cànaves', '2026-06-13', 'Taller de cançons de feina', 'Música tradicional', 'nou', 'llucia.vives@exemple.cat');
  interessat('Tòfol', 'Crespí Mas', '2026-09-20', 'Instagram', 'Fotografia antiga, oficis', 'contactat', '620112233');
  interessat('Elena', 'Ramis Pons', '2026-10-05', 'Una sòcia (Aina)', 'Cuina de padrines', 'nou', 'elena.ramis@exemple.cat');

  const act = (nom: string, inici: string) =>
    get<{ id: number }>('SELECT id FROM activitats WHERE nom = ? AND data_inici = ?', nom, inici)?.id;
  const rondalles = act('Taller de rondalles amb padrins i nets', '2026-03-14');
  const cancons = act('Taller de cançons de feina', '2026-06-13');
  const molins = act('Xerrada: la Pollença de l’aigua i els molins', '2026-10-17');
  const inscriu = (a: number | undefined, assistit: number, ...ss: number[]) =>
    a && ss.forEach((s) => run('INSERT OR IGNORE INTO participacions (activitat_id, soci_id, assistit) VALUES (?, ?, ?)', a, s, assistit));
  const infants = all<{ id: number }>("SELECT id FROM socis WHERE data_naixement > '2012-01-01'").map((r) => r.id);
  inscriu(rondalles, 1, margalida, aina, ...infants);
  inscriu(cancons, 1, joan, francina, miquel, catalina);
  inscriu(molins, 0, joan, bartomeu, margalida, antonia);
});

// Dades de prova de cada mòdul: scripts/dades-prova-<mòdul>.ts exporta dadesProva().
for (const m of ['socis', 'governanca', 'tresoreria', 'activitats', 'operacions', 'comunitat', 'subvencions', 'fiscal', 'donatius']) {
  const fitxer = new URL(`./dades-prova-${m}.ts`, import.meta.url);
  if (existsSync(fitxer)) await (await import(fitxer.href)).dadesProva?.();
}

const r = get<{ s: number; m: number; a: number }>(
  'SELECT (SELECT COUNT(*) FROM socis) AS s, (SELECT COUNT(*) FROM moviments) AS m, (SELECT COUNT(*) FROM activitats) AS a',
)!;
console.log(`Dades de prova creades: ${r.s} socis, ${r.m} moviments, ${r.a} activitats.`);
