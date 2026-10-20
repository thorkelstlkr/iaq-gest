// Dades de prova del mòdul «activitats»: inscripcions obertes, llista d'espera, menors amb tutor,
// assistents anònims, responsable i tasques d'una activitat pròxima.
import { get, run, tx } from '../server/db.ts';
import { sumaDies } from '../shared/dates.ts';

export function dadesProva() {
  const soci = (nom: string, llinatges: string) =>
    get<{ id: number }>('SELECT id FROM socis WHERE nom = ? AND llinatges = ?', nom, llinatges)?.id ?? null;
  const act = (nom: string, inici: string) =>
    get<{ id: number }>('SELECT id FROM activitats WHERE nom = ? AND data_inici = ?', nom, inici)?.id ?? null;

  type Extern = { nom: string; naixement: string; genere: string; tutor?: string; tutor_telefon?: string; autoritzacio?: string | null; imatge?: number | null; assistit?: number; estat?: string; inscrit_el?: string };
  const inscriuSoci = (a: number | null, s: number | null, assistit = 0, estat = 'inscrit', inscrit_el?: string) =>
    a && s && run(
      `INSERT OR IGNORE INTO participacions (activitat_id, soci_id, assistit, estat, inscrit_el)
       VALUES (?, ?, ?, ?, COALESCE(?, datetime('now','localtime')))`,
      a, s, assistit, estat, inscrit_el ?? null,
    );
  const inscriuExtern = (a: number | null, e: Extern) =>
    a && run(
      `INSERT INTO participacions (activitat_id, nom_extern, data_naixement, genere, tutor, tutor_telefon, autoritzacio_tutor,
         drets_imatge, assistit, estat, inscrit_el)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now','localtime')))`,
      a, e.nom, e.naixement, e.genere, e.tutor ?? null, e.tutor_telefon ?? null, e.autoritzacio ?? null,
      e.imatge ?? null, e.assistit ?? 0, e.estat ?? 'inscrit', e.inscrit_el ?? null,
    );

  tx(() => {
    run("UPDATE activitats SET estat = 'feta' WHERE estat = 'confirmada' AND COALESCE(data_fi, data_inici) < date('now','localtime')");
    const margalida = soci('Margalida', 'Cerdà Vives');
    const joan = soci('Joan', 'Bennàsar Serra');
    const catalina = soci('Catalina', 'Torrandell Reus');
    const bartomeu = soci('Bartomeu', 'Cifre Salas');
    const francisca = soci('Francisca', 'Vives Llobera');
    const aina = soci('Aina', 'Llompart Cifre');
    const pere = soci('Pere', 'Reus Bennàsar');
    const maria = soci('Maria', 'Crespí Torres');
    const joana = soci('Joana', 'Ferrer Serra');
    const magdalena = soci('Magdalena', 'Salas Torrandell');

    // 1. Taller amb places limitades, ple i amb llista d'espera, d'aquí a cinc dies.
    const dataTaller = sumaDies(5);
    const taller = run(
      `INSERT INTO activitats (nom, data_inici, lloc, objectius, descripcio, estat, places, responsable_soci_id,
         pressupost_cents, materials, public_objectiu)
       VALUES (?, ?, ?, ?, ?, 'confirmada', 8, ?, 12000, ?, ?)`,
      'Taller de llata amb padrines i nets', dataTaller, 'Casal de cultura', 'a,c',
      'Les padrines ensenyen als nets a fer llata de palma per fer senalles i ventalls.',
      aina,
      'Palma seca (2 feixos), tisores, agulles grosses, berenar per a 16 persones.',
      'Padrins i padrines amb els seus nets de 6 a 12 anys',
    ).id;
    const t = (h: number) => `${sumaDies(-10)} ${String(10 + h).padStart(2, '0')}:00:00`;
    inscriuSoci(taller, margalida, 0, 'inscrit', t(0));
    inscriuSoci(taller, catalina, 0, 'inscrit', t(1));
    inscriuSoci(taller, francisca, 0, 'inscrit', t(2));
    inscriuSoci(taller, magdalena, 0, 'inscrit', t(3));
    inscriuExtern(taller, { nom: 'Pau Cerdà Llull', naixement: '2017-05-14', genere: 'home', tutor: 'Antoni Cerdà Mir', tutor_telefon: '611223344', autoritzacio: sumaDies(-8), imatge: 1, inscrit_el: t(4) });
    inscriuExtern(taller, { nom: 'Martina Torrandell Vich', naixement: '2016-09-02', genere: 'dona', tutor: 'Laura Vich Serra', tutor_telefon: '622334455', autoritzacio: sumaDies(-7), imatge: 0, inscrit_el: t(5) });
    inscriuExtern(taller, { nom: 'Jaume Vives Pons', naixement: '2018-01-21', genere: 'home', tutor: 'Marta Pons Coll', tutor_telefon: '633445566', autoritzacio: null, imatge: null, inscrit_el: t(6) });
    inscriuExtern(taller, { nom: 'Aina Salas Ferrer', naixement: '2015-11-30', genere: 'dona', tutor: 'Joan Salas Mas', tutor_telefon: '644556677', autoritzacio: null, imatge: 1, inscrit_el: t(7) });
    // Ja és ple: aquestes dues persones són a la llista d'espera (per ordre d'arribada).
    inscriuSoci(taller, joan, 0, 'espera', t(8));
    inscriuExtern(taller, { nom: 'Biel Bennàsar Roig', naixement: '2017-03-08', genere: 'home', tutor: 'Joan Bennàsar Serra', tutor_telefon: '655667788', autoritzacio: sumaDies(-3), imatge: 1, estat: 'espera', inscrit_el: t(9) });

    const tasca = (titol: string, data: string | null, s: number | null, a: number) =>
      run('INSERT INTO tasques (titol, data_limit, soci_id, activitat_id) VALUES (?, ?, ?, ?)', titol, data, s, a);
    tasca('Comprar la palma i les agulles', sumaDies(2), aina, taller);
    tasca('Recollir les autoritzacions signades dels tutors', sumaDies(4), aina, taller);
    tasca('Preparar el berenar', sumaDies(5), maria, taller);
    run("INSERT INTO tasques (titol, data_limit, soci_id, activitat_id, feta, feta_el) VALUES (?, ?, ?, ?, 1, ?)",
      'Reservar la sala del Casal', sumaDies(-6), aina, taller, sumaDies(-6));

    // 2. Edició passada del taller de rondalles: nets de fora de l'entitat amb el seu tutor (ja hi van assistir).
    const rondalles = act('Taller de rondalles amb padrins i nets', '2026-03-14');
    inscriuExtern(rondalles, { nom: 'Pau Cerdà Llull', naixement: '2017-05-14', genere: 'home', tutor: 'Antoni Cerdà Mir', autoritzacio: '2026-03-10', imatge: 1, assistit: 1 });
    inscriuExtern(rondalles, { nom: 'Martina Torrandell Vich', naixement: '2016-09-02', genere: 'dona', tutor: 'Laura Vich Serra', autoritzacio: '2026-03-11', imatge: 0, assistit: 1 });
    inscriuSoci(rondalles, catalina, 1);
    inscriuSoci(rondalles, francisca, 0, 'cancel·lat');

    // 3. Xerrada oberta al públic: pocs inscrits i la majoria d'assistents sense inscripció.
    const xerrada = act('Xerrada: les dones i els oficis tradicionals', '2026-02-28');
    if (xerrada) {
      run('UPDATE activitats SET assistents_anonims = 37, responsable_soci_id = ? WHERE id = ?', joana, xerrada);
      for (const s of [margalida, catalina, francisca, magdalena, aina, maria, joana]) inscriuSoci(xerrada, s, 1);
      inscriuSoci(xerrada, joan, 0);
    }

    // 4. Activitat pròxima amb una persona interessada inscrita i tasques.
    const cuina = act('Mostra de cuina de padrines', '2026-11-21');
    const elena = get<{ id: number; nom: string; llinatges: string }>("SELECT id, nom, llinatges FROM interessats WHERE nom = 'Elena'");
    if (cuina) {
      run(
        "UPDATE activitats SET estat = 'preparacio', responsable_soci_id = ?, pressupost_cents = 35000, materials = ?, public_objectiu = ? WHERE id = ?",
        pere, 'Fogons, taules del Mercat, cartells i receptari imprès', 'Tot el poble; especialment famílies amb infants', cuina,
      );
      if (elena) run(
        'INSERT INTO participacions (activitat_id, interessat_id, nom_extern, genere) VALUES (?, ?, ?, ?)',
        cuina, elena.id, `${elena.nom} ${elena.llinatges}`, 'dona',
      );
      inscriuSoci(cuina, catalina);
      inscriuSoci(cuina, bartomeu);
      tasca('Demanar permís per ocupar el Mercat', sumaDies(10), pere, cuina);
      tasca('Triar les receptes del receptari', sumaDies(20), catalina, cuina);
    }

    // 5. Activitat recent amb inscrits però sense haver passat llista (genera un avís al tauler).
    const visita = run(
      `INSERT INTO activitats (nom, data_inici, lloc, objectius, descripcio, estat, responsable_soci_id)
       VALUES (?, ?, ?, ?, ?, 'feta', ?)`,
      'Visita al molí de Can Bennàsar', sumaDies(-12), 'Camí de Ternelles', 'b,e',
      'Visita guiada pel padrí Joan al molí fariner restaurat.', joan,
    ).id;
    for (const s of [joan, bartomeu, pere, aina]) inscriuSoci(visita, s);
    inscriuExtern(visita, { nom: 'Toni Reus Coll', naixement: '2014-06-12', genere: 'home', tutor: 'Pere Reus Bennàsar', autoritzacio: sumaDies(-14), imatge: 1 });
  });
}
