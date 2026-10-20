// Dades de prova del mòdul «donatius»: deu donacions de tres anys (donants recurrents, una empresa,
// un donant sense NIF i un equip de so donat en espècie) i l'inventari de béns de l'associació.
// L'entitat no està acollida a la Llei 49/2002 (així la interfície en mostra l'explicació).
// Es crida des de scripts/dades-prova.ts.

import { get, run, setConfig, tx } from '../server/db.ts';
import { avui } from '../shared/dates.ts';
import { codiProvincia } from '../server/routes/donatius.ts';

export function dadesProva() {
  if (get('SELECT 1 AS x FROM donatius LIMIT 1')) return;
  const any = Number(avui().slice(0, 4));
  const [a2, a1, a0] = [any - 2, any - 1, any];

  const soci = (nom: string, llinatges: string) =>
    get<{ id: number; nom: string; llinatges: string; dni: string | null; adreca: string | null; codi_postal: string | null; poblacio: string | null }>(
      'SELECT id, nom, llinatges, dni, adreca, codi_postal, poblacio FROM socis WHERE nom = ? AND llinatges = ?',
      nom, llinatges,
    );
  const banc = get<{ id: number }>("SELECT id FROM comptes WHERE nom LIKE '%banc%' ORDER BY id LIMIT 1")?.id ?? 1;
  const caixa = get<{ id: number }>("SELECT id FROM comptes WHERE nom LIKE '%efectiu%' OR nom LIKE 'Caixa%' ORDER BY id LIMIT 1")?.id ?? banc;
  const catDonacions = get<{ id: number }>("SELECT id FROM categories WHERE tipus = 'ingres' AND nom LIKE 'Donaci%' LIMIT 1")?.id ?? null;
  const tancat = (data: string) => Boolean(get('SELECT 1 AS x FROM exercicis_tancats WHERE exercici = ?', Number(data.slice(0, 4))));

  interface Donant {
    soci_id?: number | null;
    nom: string;
    nif: string | null;
    tipus_persona?: 'fisica' | 'juridica';
    adreca: string | null;
    codi_postal: string | null;
    poblacio: string | null;
  }
  const deSoci = (nom: string, llinatges: string): Donant | null => {
    const s = soci(nom, llinatges);
    return s ? { soci_id: s.id, nom: `${s.nom} ${s.llinatges}`, nif: s.dni, adreca: s.adreca, codi_postal: s.codi_postal, poblacio: s.poblacio } : null;
  };

  function dona(
    donant: Donant | null,
    data: string,
    o: { import?: number; especie?: string; valoracio?: number; destinacio?: string; compte?: number; moviment?: number | null; notes?: string },
  ) {
    if (!donant) return null;
    let movimentId = o.moviment ?? null;
    // Donacions dineràries: moviment d'ingrés (llevat dels exercicis tancats, que ja estan comptabilitzats).
    if (o.import && movimentId === null && catDonacions && !tancat(data))
      movimentId = run(
        "INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, soci_id) VALUES (?, 'ingres', ?, ?, ?, ?, ?)",
        data, Math.round(o.import * 100), `Donació: ${donant.nom}`, catDonacions, o.compte ?? banc, donant.soci_id ?? null,
      ).id;
    return run(
      `INSERT INTO donatius (soci_id, nom, nif, tipus_persona, adreca, codi_postal, poblacio, codi_provincia, data, import_cents,
                             en_especie, descripcio_especie, valoracio_cents, destinacio, moviment_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      donant.soci_id ?? null, donant.nom, donant.nif, donant.tipus_persona ?? 'fisica', donant.adreca, donant.codi_postal, donant.poblacio,
      codiProvincia(donant.codi_postal), data, o.especie ? 0 : Math.round((o.import ?? 0) * 100), o.especie ? 1 : 0, o.especie ?? null,
      o.valoracio ? Math.round(o.valoracio * 100) : null, o.destinacio ?? null, movimentId, o.notes ?? null,
    ).id;
  }

  tx(() => {
    setConfig('regim_49_2002', 'no');

    const aina = deSoci('Aina', 'Llompart Cifre');
    const antonia = deSoci('Antònia', 'Mir Cerdà');
    const miquel = deSoci('Miquel', 'Siquier Crespí');
    const pere = deSoci('Pere', 'Reus Bennàsar');
    const forn: Donant = {
      nom: 'Forn de Can Cifre, SL', nif: 'B07123458', tipus_persona: 'juridica',
      adreca: 'Carrer del Temple, 4', codi_postal: '07460', poblacio: 'Pollença',
    };
    const sons: Donant = {
      nom: 'Sons de Tramuntana, SL', nif: 'B57012346', tipus_persona: 'juridica',
      adreca: 'Polígon de Son Bordoy, nau 12', codi_postal: '07400', poblacio: 'Alcúdia',
    };
    const joan: Donant = { nom: 'Joan Vives Cladera', nif: null, adreca: null, codi_postal: '07470', poblacio: 'Port de Pollença' };

    // Aina: tres anys seguits amb imports iguals o creixents (recurrent).
    dona(aina, `${a2}-03-10`, { import: 50, destinacio: 'Activitats generals de l’associació' });
    dona(aina, `${a1}-03-15`, { import: 60, destinacio: 'Activitats generals de l’associació' });
    dona(aina, `${a0}-03-12`, { import: 60, destinacio: 'Taller de rondalles amb padrins i nets' });
    // Antònia: dos anys (encara no és recurrent).
    dona(antonia, `${a1}-05-03`, { import: 40, destinacio: 'Exposició de fotografia antiga', compte: caixa });
    dona(antonia, `${a0}-04-30`, { import: 50, destinacio: 'Exposició de fotografia antiga' });
    dona(miquel, `${a1}-12-18`, { import: 100, destinacio: 'Arxiu de la memòria oral de Pollença' });
    // Empresa del poble.
    dona(forn, `${a0}-01-25`, { import: 500, destinacio: 'Taller de cançons de feina' });
    // En espècie: l'equip de so, que també és a l'inventari.
    const equip = dona(sons, `${a1}-09-10`, {
      especie: 'Equip de so: dos altaveus autoamplificats de 12" i una taula de mescles de 8 canals',
      valoracio: 1200,
      destinacio: 'Actes i activitats a l’aire lliure',
      notes: 'Valoració segons el preu de mercat que indica el donant.',
    });
    // La donació de la família sòcia que ja és a la tresoreria.
    const movPere = get<{ id: number }>("SELECT id FROM moviments WHERE concepte LIKE 'Donació d%una família sòcia' LIMIT 1")?.id;
    dona(pere, `${a0}-05-20`, { import: 250, destinacio: 'Activitats generals de l’associació', moviment: movPere ?? null });
    // Donació en efectiu d'una persona que no ha donat el NIF.
    dona(joan, `${a0}-07-04`, { import: 30, destinacio: 'Xerrada sobre els molins', compte: caixa });

    // ---------- Inventari ----------
    const be = (
      descripcio: string, categoria: string, data: string, valor: number, vida: number | null,
      o: { procedencia?: string; ubicacio?: string; estat?: string; donatiu?: number | null; moviment?: number | null; baixa?: string; motiu?: string; notes?: string } = {},
    ) =>
      run(
        `INSERT INTO inventari (descripcio, categoria, data_adquisicio, valor_adquisicio_cents, procedencia, moviment_id, donatiu_id,
                                ubicacio, estat, vida_util_anys, data_baixa, motiu_baixa, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        descripcio, categoria, data, Math.round(valor * 100), o.procedencia ?? 'compra', o.moviment ?? null, o.donatiu ?? null,
        o.ubicacio ?? 'Local social (carrer de Sant Domingo)', o.estat ?? 'bo', vida, o.baixa ?? null, o.motiu ?? null, o.notes ?? null,
      );
    const mov = (concepte: string) => get<{ id: number }>('SELECT id FROM moviments WHERE concepte = ? LIMIT 1', concepte)?.id ?? null;

    if (equip)
      be('Equip de so: 2 altaveus autoamplificats i taula de mescles', 'equip_so', `${a1}-09-10`, 1200, 5, {
        procedencia: 'donacio', donatiu: equip, notes: 'Donació de Sons de Tramuntana, SL',
      });
    be('Taules plegables (6 unitats)', 'mobiliari', `${a2}-02-20`, 330, 10);
    be('Cadires plegables (30 unitats)', 'mobiliari', `${a2}-02-20`, 450, 10);
    be('Carpa plegable de 3 × 3 m', 'altres', `${a2}-04-12`, 245, 5, { ubicacio: 'Magatzem municipal (cessió d’espai)', estat: 'regular' });
    be('Ordinador portàtil per a la secretaria', 'informatica', `${a1}-01-15`, 649, 4, { ubicacio: 'Domicili de la secretària' });
    be('Escàner per digitalitzar fotografies', 'informatica', '2026-06-01', 89.99, 4, { moviment: mov('Escàner per digitalitzar fotografies') });
    be('Vestits de ball de bot (12 conjunts)', 'vestuari', `${a2}-09-01`, 900, null, {
      procedencia: 'cessio', notes: 'Cedits per l’Escola de Música i Dansa de Pollença.',
    });
    be('Baldufes, cordes i jocs tradicionals', 'material_tallers', '2025-11-22', 47.8, 3, {
      estat: 'regular', moviment: mov('Material de jocs (baldufes, cordes)'),
    });
    be('Impressora làser', 'informatica', `${a2}-03-01`, 120, 4, {
      estat: 'dolent', baixa: `${a0}-02-10`, motiu: 'Avariada; la reparació costava més que una de nova.',
    });
  });
}
