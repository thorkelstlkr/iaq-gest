// Dades de prova del registre de socis: categories, baixes passades, una readmissió,
// una sol·licitud d'admissió pendent i alguns IBAN. La crida scripts/dades-prova.ts.

import { all, get, run, tx } from '../server/db.ts';

/** IBAN espanyol vàlid a partir d'un compte de 20 dígits (calcula els dígits de control). */
function ibanEs(compte: string) {
  const num = compte + '142800'; // E=14, S=28, 00
  let resta = 0;
  for (const d of num) resta = (resta * 10 + Number(d)) % 97;
  return `ES${String(98 - resta).padStart(2, '0')}${compte}`;
}

export function dadesProva() {
  const categoria = (nom: string) => get<{ id: number }>('SELECT id FROM categories_soci WHERE nom = ?', nom)?.id ?? null;
  const soci = (nom: string, llinatges: string) =>
    get<{ id: number }>('SELECT id FROM socis WHERE nom = ? AND llinatges = ?', nom, llinatges)?.id;

  tx(() => {
    // Categories: numeraris per defecte, juvenils per als menors, fundadors i una sòcia d'honor.
    run("UPDATE socis SET categoria_id = ? WHERE categoria_id IS NULL AND estat_admissio = 'admesa'", categoria('Numerari'));
    run(
      "UPDATE socis SET categoria_id = ? WHERE data_naixement > date('now', 'localtime', '-18 years')",
      categoria('Juvenil'),
    );
    for (const [nom, llinatges] of [['Margalida', 'Cerdà Vives'], ['Joan', 'Bennàsar Serra'], ['Aina', 'Llompart Cifre'], ['Miquel', 'Siquier Crespí']]) {
      const id = soci(nom, llinatges);
      if (id) run('UPDATE socis SET categoria_id = ? WHERE id = ?', categoria('Fundador'), id);
    }
    const magdalena = soci('Magdalena', 'Salas Torrandell');
    if (magdalena) run('UPDATE socis SET categoria_id = ? WHERE id = ?', categoria("D'honor"), magdalena);

    // Baixes passades amb el motiu tipificat.
    const llorenc = soci('Llorenç', 'Salas Mir');
    if (llorenc) {
      run("UPDATE socis SET motiu_baixa = 'Dues quotes sense pagar' WHERE id = ?", llorenc);
      run(
        "UPDATE socis_periodes SET motiu_tipus = 'impagament', motiu = 'Dues quotes sense pagar', acord_baixa = 'Junta directiva, 15/12/2025' WHERE soci_id = ?",
        llorenc,
      );
    }
    // Sebastià: baixa voluntària el 2025 i readmès el 2026 (dos períodes al llibre registre).
    const sebastia = soci('Sebastià', 'Mir Bennàsar');
    if (sebastia && get<{ n: number }>('SELECT COUNT(*) AS n FROM socis_periodes WHERE soci_id = ?', sebastia)!.n === 1) {
      run("UPDATE socis_periodes SET motiu_tipus = 'voluntaria', motiu = 'Estudis fora de Mallorca' WHERE soci_id = ?", sebastia);
      run("INSERT INTO socis_periodes (soci_id, data_alta, acord) VALUES (?, '2026-04-01', 'Junta directiva, 25/03/2026')", sebastia);
      run("UPDATE socis SET data_alta = '2026-04-01', data_baixa = NULL, motiu_baixa = NULL WHERE id = ?", sebastia);
    }

    // IBAN (vàlids) d'alguns socis que paguen per domiciliació.
    all<{ id: number }>("SELECT id FROM socis WHERE estat_admissio = 'admesa' AND iban IS NULL ORDER BY num_soci LIMIT 6").forEach((s, i) =>
      run('UPDATE socis SET iban = ? WHERE id = ?', ibanEs(`2100${String(418 + i).padStart(4, '0')}45${String(20005133 + i * 7919).padStart(10, '0')}`), s.id),
    );

    // Una sol·licitud d'admissió pendent de resoldre per la junta.
    if (!get("SELECT 1 FROM socis WHERE estat_admissio = 'sollicitada'")) {
      const num = get<{ n: number }>('SELECT COALESCE(MAX(num_soci), 0) + 1 AS n FROM socis')!.n;
      run(
        `INSERT INTO socis (num_soci, nom, llinatges, data_naixement, genere, poblacio, codi_postal, email, telefon,
           data_alta, data_baixa, estat_admissio, categoria_id, notes)
         VALUES (?, 'Elena', 'Ramis Pons', '1990-04-12', 'dona', 'Pollença', '07460', 'elena.ramis@exemple.cat', '620445566',
           '2026-10-08', '2026-10-08', 'sollicitada', ?, 'Presentada per Aina Llompart. Interessada en la cuina de padrines.')`,
        num, categoria('Numerari'),
      );
    }
  });
}
