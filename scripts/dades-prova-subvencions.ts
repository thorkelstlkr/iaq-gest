// Dades de prova del mòdul «subvencions»: una subvenció del Consell de Mallorca per al taller de rondalles
// (concedida, cobrada i amb despeses imputades, algunes amb justificant adjunt; termini d'aquí a tres setmanes),
// una sol·licitud a l'Ajuntament pendent de resoldre i una subvenció de l'any passat ja justificada.
import { deflateSync, crc32 } from 'node:zlib';
import { get, run, tx } from '../server/db.ts';
import { sumaDies } from '../shared/dates.ts';

/** PNG petit (escala de grisos) que imita un tiquet: fons blanc amb línies de text grises. */
function pngTiquet(llavor: number): string {
  const ample = 96;
  const alt = 128;
  const files: Buffer[] = [];
  for (let y = 0; y < alt; y++) {
    const fila = Buffer.alloc(ample + 1, 255);
    fila[0] = 0; // filtre «cap»
    const linia = y > 8 && y < alt - 8 && y % 8 < 3;
    if (linia) {
      const llarg = 30 + ((y * 7 + llavor * 13) % 50);
      for (let x = 8; x < 8 + llarg && x < ample - 8; x++) fila[x + 1] = y > alt - 24 ? 40 : 150;
    }
    files.push(fila);
  }
  const tros = (tipus: string, dades: Buffer) => {
    const t = Buffer.concat([Buffer.from(tipus, 'ascii'), dades]);
    const llargada = Buffer.alloc(4);
    llargada.writeUInt32BE(dades.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(t) >>> 0);
    return Buffer.concat([llargada, t, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ample, 0);
  ihdr.writeUInt32BE(alt, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 0; // escala de grisos
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    tros('IHDR', ihdr),
    tros('IDAT', deflateSync(Buffer.concat(files))),
    tros('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

export function dadesProva() {
  if (get('SELECT 1 AS x FROM subvencions')) return;
  const banc = get<{ id: number }>("SELECT id FROM comptes WHERE nom LIKE 'Compte%' ORDER BY id")?.id;
  const caixa = get<{ id: number }>("SELECT id FROM comptes WHERE nom LIKE 'Caixa%' ORDER BY id")?.id;
  const catSubv = get<{ id: number }>("SELECT id FROM categories WHERE tipus = 'ingres' AND nom LIKE 'Subvenc%'")?.id;
  if (!banc || !caixa || !catSubv) return;
  const cat = (nom: string) => get<{ id: number }>("SELECT id FROM categories WHERE tipus = 'despesa' AND nom = ?", nom)?.id ?? null;
  const act = (nom: string, inici: string) => get<{ id: number }>('SELECT id FROM activitats WHERE nom = ? AND data_inici = ?', nom, inici)?.id ?? null;
  const mov = (concepte: string, data: string) =>
    get<{ id: number }>('SELECT id FROM moviments WHERE concepte = ? AND data = ?', concepte, data)?.id ?? null;
  const tancat = (data: string) => Boolean(get('SELECT 1 AS x FROM exercicis_tancats WHERE exercici = ?', Number(data.slice(0, 4))));
  const despesa = (data: string, cents: number, concepte: string, categoria: string, compte: number, activitat: number | null, justificant: string) =>
    tancat(data)
      ? null
      : run(
          `INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, activitat_id, justificant)
           VALUES (?, 'despesa', ?, ?, ?, ?, ?, ?)`,
          data, cents, concepte, cat(categoria), compte, activitat, justificant,
        ).id;
  let llavor = 0;
  const adjunta = (moviment: number | null, nom: string) => {
    if (!moviment) return;
    const dades = pngTiquet(++llavor);
    run(
      "INSERT INTO justificants (moviment_id, nom, mime, mida, dades, usuari) VALUES (?, ?, 'image/png', ?, ?, 'Tresoreria')",
      moviment, nom, Math.floor(((dades.length - 22) * 3) / 4), dades,
    );
  };
  const imputa = (subvencio: number, moviment: number | null, cents: number, creditor: string | null, emissio: string | null = null) =>
    moviment && run(
      'INSERT INTO subvencio_imputacions (subvencio_id, moviment_id, import_cents, creditor, data_emissio) VALUES (?, ?, ?, ?, ?)',
      subvencio, moviment, cents, creditor, emissio,
    );

  tx(() => {
    // 1. Consell de Mallorca 2026: Taller de rondalles (concedida 1.500 €, cobrada, per justificar d'aquí a 3 setmanes).
    const rondalles = act('Taller de rondalles amb padrins i nets', '2026-03-14');
    const cm = run(
      `INSERT INTO subvencions (organisme, convocatoria, linia, expedient, exercici, import_sollicitat_cents, import_concedit_cents,
         pressupost_projecte_cents, data_sollicitud, data_resolucio, periode_inici, periode_fi, termini_justificacio, activitat_id,
         estat, requisits, notes, memoria)
       VALUES ('Consell de Mallorca', 'Subvencions per a activitats de cultura popular i tradicional 2026',
         'Línia 2 – Transmissió del patrimoni immaterial', 'CM-CUL-2026/0457', 2026, 180000, 150000, 190000,
         '2026-01-28', '2026-04-15', '2026-01-01', '2026-12-31', ?, ?, 'cobrada',
         ?, 'Resolució publicada al BOIB. Cal fer constar el logotip del Consell als materials.', ?)`,
      sumaDies(21), rondalles,
      "Certificat d'estar al corrent amb l'AEAT (12/01/2026) i amb la Seguretat Social (12/01/2026). Declaració responsable d'altres ajudes presentada amb la sol·licitud.",
      "S'han fet quatre sessions del taller de rondalles al Casal de cultura amb 34 participants (padrins, padrines i nets). " +
        "Els infants han recollit rondalles de la tradició oral pollencina i s'ha editat un llibret il·lustrat amb deu rondalles, " +
        "que s'ha repartit entre les famílies participants i les escoles del municipi.",
    ).id;
    run(
      `INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, activitat_id, justificant, subvencio_id)
       VALUES ('2026-06-30', 'ingres', 150000, 'Subvenció Consell de Mallorca – Taller de rondalles', ?, ?, ?, 'CM-CUL-2026/0457', ?)`,
      catSubv, banc, rondalles, cm,
    );
    const honoraris = despesa('2026-03-14', 60000, 'Honoraris de la contadora de rondalles (Caterina Vallespir)', 'Serveis professionals', banc, rondalles, 'F-2026-031');
    const illustracions = despesa('2026-04-10', 45000, 'Il·lustracions del llibret de rondalles', 'Serveis professionals', banc, rondalles, 'F-2026-007');
    const so = despesa('2026-03-14', 9000, "Lloguer d'equip de so per al taller", 'Lloguers', caixa, rondalles, 'Rebut 0315');
    const berenar = mov('Berenar i material del taller', '2026-03-14');
    const impressio = mov('Impressió del llibret de rondalles', '2026-04-20');
    imputa(cm, honoraris, 60000, 'Caterina Vallespir Cerdà');
    imputa(cm, illustracions, 45000, 'Joana Mir Il·lustració', '2026-04-02');
    imputa(cm, impressio, 32000, 'Gràfiques Pollença SL', '2026-04-15');
    imputa(cm, berenar, 8540, 'Forn de Can Cifre');
    imputa(cm, so, 4460, 'So i Llum Tramuntana');
    adjunta(honoraris, 'factura-F-2026-031.png');
    adjunta(illustracions, 'factura-F-2026-007.png');
    adjunta(impressio, 'factura-F-2026-88.png');
    // El berenar i l'equip de so encara no tenen el justificant escanejat (surt l'avís al tauler).

    // 2. Ajuntament de Pollença: sol·licitud pendent de resoldre.
    run(
      `INSERT INTO subvencions (organisme, convocatoria, linia, exercici, import_sollicitat_cents, pressupost_projecte_cents,
         data_sollicitud, periode_inici, periode_fi, activitat_id, estat, requisits)
       VALUES ('Ajuntament de Pollença', 'Ajudes a entitats culturals i festives 2026', 'Festes i tradicions', 2026, 200000, 320000,
         ?, '2026-09-01', '2026-12-31', ?, 'sollicitada', ?)`,
      sumaDies(-40), act('Mostra de cuina de padrines', '2026-11-21'),
      "Certificats AEAT i TGSS de 02/09/2026. Pendent: memòria final i fotografies de l'activitat.",
    );

    // 3. Ajuntament 2025: cultura popular, cobrada i justificada.
    const aj = run(
      `INSERT INTO subvencions (organisme, convocatoria, expedient, exercici, import_sollicitat_cents, import_concedit_cents,
         pressupost_projecte_cents, data_sollicitud, data_resolucio, periode_inici, periode_fi, termini_justificacio, estat,
         data_justificacio, requisits, memoria)
       VALUES ('Ajuntament de Pollença', 'Subvencions a entitats – cultura popular 2025', 'AJP-2025/0214', 2025, 150000, 120000, 140000,
         '2024-11-20', '2025-01-30', '2025-01-01', '2025-12-31', '2026-01-31', 'justificada', '2026-01-26',
         'Certificats AEAT i Seguretat Social de 15/11/2024.', ?)`,
      "Programa anual d'activitats de cultura popular: taller de rondalles, demostració de cuina, exposició «Pollença en blanc i negre», itinerari pels oficis perduts i taller de jocs tradicionals.",
    ).id;
    const cobrament = mov('Subvenció Ajuntament de Pollença – cultura popular', '2025-02-10');
    if (cobrament) run('UPDATE moviments SET subvencio_id = ? WHERE id = ?', aj, cobrament);
    const escenari = despesa('2025-07-15', 34000, "Lloguer d'escenari i plafons per a l'exposició", 'Lloguers', banc, act('Exposició «Pollença en blanc i negre»', '2025-07-20'), 'F-2025-290');
    const d25: [string, string, number, string][] = [
      ['Berenar i material del taller', '2025-03-15', 6430, 'Forn de Can Cifre'],
      ['Ingredients per a la demostració', '2025-04-05', 3890, 'Colmado Can Vic'],
      ['Impressió de fotografies i plafons', '2025-07-10', 41250, 'Foto Pollença'],
      ['Guia de l’itinerari', '2025-10-18', 12000, 'Bartomeu Llompart Seguí'],
      ['Material de jocs (baldufes, cordes)', '2025-11-22', 4780, 'Joguines Tramuntana'],
      ['Assegurança de responsabilitat civil 2025', '2025-05-02', 18500, 'Mútua Balear'],
    ];
    for (const [concepte, data, cents, creditor] of d25) {
      const id = mov(concepte, data);
      imputa(aj, id, cents, creditor);
      adjunta(id, `justificant-${data}.png`);
    }
    imputa(aj, escenari, 33150, 'Muntatges Cala Sant Vicenç SL');
    adjunta(escenari, 'factura-F-2025-290.png');
  });
}
