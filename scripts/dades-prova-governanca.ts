// Dades de prova del mòdul «governanca»: junta directiva amb mandats, assemblea ordinària de l'any passat
// (assistents, acords i acta aprovada), una reunió de junta i l'assemblea prevista per al mes que ve.
// Es crida des de scripts/dades-prova.ts.

import { get, run, tx } from '../server/db.ts';
import { avui, sumaDies } from '../shared/dates.ts';
import { votants } from '../server/routes/governanca.ts';

export function dadesProva() {
  const soci = (nom: string, llinatges: string) =>
    get<{ id: number }>('SELECT id FROM socis WHERE nom = ? AND llinatges = ?', nom, llinatges)?.id;
  const aina = soci('Aina', 'Llompart Cifre');
  const miquel = soci('Miquel', 'Siquier Crespí');
  const antonia = soci('Antònia', 'Mir Cerdà');
  const joan = soci('Joan', 'Bennàsar Serra');
  const maria = soci('Maria', 'Crespí Torres');
  const margalida = soci('Margalida', 'Cerdà Vives');
  if (!aina || !miquel || !antonia || !joan || !maria || !margalida) return;

  const any = Number(avui().slice(0, 4));
  const passat = any - 1;
  const dataAssemblea = `${passat}-03-28`;
  const mesMenys = (d: string, anys: number) => `${Number(d.slice(0, 4)) + anys}${d.slice(4)}`;

  tx(() => {
    // ---------- Assemblea ordinària de l'any passat ----------
    const ordre = [
      "Lectura i aprovació, si escau, de l'acta de la sessió anterior",
      `Aprovació dels comptes de l'exercici ${passat - 1}`,
      `Aprovació del pressupost i del pla d'activitats de ${passat}`,
      'Renovació de la junta directiva',
      'Precs i preguntes',
    ];
    const assemblea = run(
      `INSERT INTO reunions (organ, tipus, data, hora_1a, hora_2a, lloc, ordre_dia, estat, data_convocatoria, convocatoria_celebrada)
       VALUES ('assemblea', 'ordinaria', ?, '19:00', '19:30', 'Casal de cultura de Pollença', ?, 'celebrada', ?, '2a')`,
      dataAssemblea, JSON.stringify(ordre), `${passat}-03-06`,
    ).id;

    const cens = votants(dataAssemblea);
    const presents = cens.filter((_, i) => i % 3 !== 2).slice(0, Math.max(1, Math.ceil(cens.length * 0.55)));
    for (const s of presents)
      run(
        "INSERT INTO reunio_assistents (reunio_id, soci_id, nom, forma) VALUES (?, ?, ?, 'present')",
        assemblea, s.id, `${s.nom} ${s.llinatges}`,
      );
    const absents = cens.filter((s) => !presents.includes(s)).slice(0, 2);
    absents.forEach((s, i) =>
      run(
        "INSERT INTO reunio_assistents (reunio_id, soci_id, nom, forma, representant_id) VALUES (?, ?, ?, 'representat', ?)",
        assemblea, s.id, `${s.nom} ${s.llinatges}`, presents[i].id,
      ),
    );
    const vots = presents.length + absents.length;
    const acord = (punt: number, text: string, favor: number | null, contra: number | null, abst: number | null, resultat = 'aprovat') =>
      run(
        'INSERT INTO acords (reunio_id, punt, text, vots_favor, vots_contra, abstencions, resultat) VALUES (?, ?, ?, ?, ?, ?, ?)',
        assemblea, punt, text, favor, contra, abst, resultat,
      );
    acord(1, "S'aprova per unanimitat l'acta de la sessió anterior.", vots, 0, 0);
    acord(2, `S'aproven els comptes de l'exercici ${passat - 1}, amb un resultat positiu de 1.214,35 €.`, vots - 1, 0, 1);
    acord(3, `S'aprova el pressupost de ${passat} (4.850 € d'ingressos i despeses) i el pla d'activitats presentat per la junta.`, vots - 2, 1, 1);
    acord(
      4,
      "S'elegeix la junta directiva per a quatre anys: presidenta, Aina Llompart Cifre; secretari, Miquel Siquier Crespí; tresorera, Antònia Mir Cerdà; vocals, Joan Bennàsar Serra i Maria Crespí Torres.",
      vots, 0, 0,
    );
    acord(5, "Diversos socis proposen recuperar el taller de cançons de feina. La junta n'estudiarà la viabilitat.", null, null, null, 'informatiu');

    run(
      `INSERT INTO actes (reunio_id, organ, any, numero, text, data_aprovacio, presidencia, secretaria, tancada, tancada_el, tancada_per)
       VALUES (?, 'assemblea', ?, 1, ?, ?, 'Margalida Cerdà Vives', 'Miquel Siquier Crespí', 1, ?, 'Miquel Siquier')`,
      assemblea, passat,
      [
        "A Pollença, a les 19.30 h, en segona convocatòria, es reuneix l'Assemblea General Ordinària de l'associació amb l'assistència de les persones sòcies que consten en aquesta acta.",
        '',
        "Presideix la sessió Margalida Cerdà Vives, presidenta sortint, i actua de secretari Miquel Siquier Crespí.",
        '',
        '## Desenvolupament de la sessió',
        '',
        `La tresorera presenta l'estat de comptes de ${passat - 1}, que s'ha posat a disposició dels socis durant els quinze dies anteriors. S'explica el destí de la subvenció de l'Ajuntament i els ingressos de l'exposició «Pollença en blanc i negre».`,
        '',
        "Margalida Cerdà agraeix la feina feta durant el seu mandat i presenta l'única candidatura a la junta directiva, que s'aprova per unanimitat.",
        '',
        "I, sense més assumptes per tractar, s'aixeca la sessió a les 21.10 h, de la qual s'estén aquesta acta, que s'aprova al final de la sessió.",
      ].join('\n'),
      dataAssemblea, `${dataAssemblea} 21:15:00`,
    );

    // ---------- Junta directiva ----------
    const fiMandat = mesMenys(dataAssemblea, 4);
    const carrec = (s: number, c: string, eleccio: string, fi: string | null, reunio: number | null, comunicat: string | null, cessament: string | null = null, cessComunicat: string | null = null) =>
      run(
        `INSERT INTO carrecs (soci_id, carrec, data_eleccio, data_fi_mandat, reunio_id, comunicat_registre_el, data_cessament, motiu_cessament, cessament_comunicat_el)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        s, c, eleccio, fi, reunio, comunicat, cessament, cessament ? 'Fi del mandat' : null, cessComunicat,
      );
    // Junta anterior (historial).
    const eleccioAnterior = '2024-02-01';
    carrec(margalida, 'presidencia', eleccioAnterior, dataAssemblea, null, '2024-02-20', dataAssemblea, `${passat}-04-15`);
    carrec(antonia, 'secretaria', eleccioAnterior, dataAssemblea, null, '2024-02-20', dataAssemblea, `${passat}-04-15`);
    // Junta actual.
    carrec(aina, 'presidencia', dataAssemblea, fiMandat, assemblea, `${passat}-04-15`);
    carrec(miquel, 'secretaria', dataAssemblea, fiMandat, assemblea, `${passat}-04-15`);
    carrec(antonia, 'tresoreria', dataAssemblea, fiMandat, assemblea, `${passat}-04-15`);
    // Un vocal que ve de la junta anterior i té el mandat a punt d'acabar; una vocal pendent de comunicar.
    carrec(joan, 'vocal', eleccioAnterior, sumaDies(45), null, '2024-02-20');
    carrec(maria, 'vocal', dataAssemblea, fiMandat, assemblea, null);

    // ---------- Reunió de junta (fa 40 dies), amb l'acta encara en esborrany ----------
    const junta = run(
      `INSERT INTO reunions (organ, tipus, data, hora_1a, lloc, ordre_dia, estat, data_convocatoria, convocatoria_celebrada)
       VALUES ('junta', 'ordinaria', ?, '20:00', 'Seu social, carrer Major', ?, 'celebrada', ?, '1a')`,
      sumaDies(-40),
      JSON.stringify(['Preparació de la xerrada sobre els molins', "Convocatòria de l'assemblea general ordinària", 'Estat de tresoreria']),
      sumaDies(-47),
    ).id;
    for (const [s, nom] of [[aina, 'Aina Llompart Cifre'], [miquel, 'Miquel Siquier Crespí'], [antonia, 'Antònia Mir Cerdà'], [maria, 'Maria Crespí Torres']] as const)
      run("INSERT INTO reunio_assistents (reunio_id, soci_id, nom, forma) VALUES (?, ?, ?, 'present')", junta, s, nom);
    run(
      "INSERT INTO acords (reunio_id, punt, text, vots_favor, vots_contra, abstencions, resultat) VALUES (?, 1, ?, 4, 0, 0, 'aprovat')",
      junta, "Es reserva el Claustre de Sant Domingo per a la xerrada i s'encarreguen 200 programes de mà.",
    );
    run(
      "INSERT INTO acords (reunio_id, punt, text, vots_favor, vots_contra, abstencions, resultat) VALUES (?, 2, ?, 4, 0, 0, 'aprovat')",
      junta, "Es convoca l'assemblea general ordinària per al mes que ve, amb l'aprovació dels comptes i del pressupost.",
    );
    run(
      "INSERT INTO actes (reunio_id, organ, any, numero, text, presidencia, secretaria) VALUES (?, 'junta', ?, 1, ?, 'Aina Llompart Cifre', 'Miquel Siquier Crespí')",
      junta, Number(sumaDies(-40).slice(0, 4)),
      "Es reuneix la junta directiva a la seu social amb l'assistència de les persones que consten en aquesta acta. Joan Bennàsar excusa l'absència.",
    );

    // ---------- Assemblea prevista per al mes que ve ----------
    run(
      `INSERT INTO reunions (organ, tipus, data, hora_1a, hora_2a, lloc, ordre_dia, estat)
       VALUES ('assemblea', 'ordinaria', ?, '19:00', '19:30', 'Claustre de Sant Domingo', ?, 'prevista')`,
      sumaDies(30),
      JSON.stringify([
        "Lectura i aprovació, si escau, de l'acta de la sessió anterior",
        `Aprovació dels comptes de l'exercici ${passat}`,
        `Aprovació del pressupost de ${any + 1}`,
        'Renovació de la vocalia de Joan Bennàsar Serra',
        'Precs i preguntes',
      ]),
    );
  });
}
