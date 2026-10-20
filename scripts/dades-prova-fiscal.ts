// Dades de prova del mòdul «fiscal»: tercers (músic, ponent, propietari del magatzem i impremta),
// retencions d'IRPF dels pagaments, ingressos trimestrals ja fets i un extracte bancari importat
// amb algunes línies que coincideixen amb moviments existents.
import { get, run, setConfig, tx } from '../server/db.ts';
import { avui, sumaDies } from '../shared/dates.ts';
import { calculaFiscal, desaLinies, preparaImportacio, registraPagament, saldoAplicacio } from '../server/routes/fiscal.ts';
import type { LiniaExtracte } from '../server/routes/fiscal.ts';

export function dadesProva() {
  if (get('SELECT 1 AS x FROM tercers LIMIT 1')) return;
  const banc = get<{ id: number }>("SELECT id FROM comptes WHERE nom LIKE 'Compte%' ORDER BY id")?.id;
  if (!banc) return;
  const any = Number(avui().slice(0, 4));
  const cat = (nom: string) => get<{ id: number }>('SELECT id FROM categories WHERE nom = ?', nom)?.id ?? null;
  const tancat = (data: string) => Boolean(get('SELECT 1 AS x FROM exercicis_tancats WHERE exercici = ?', Number(data.slice(0, 4))));

  const tercer = (nom: string, nif: string, tipus: 'fisica' | 'juridica', adreca: string, cp: string, poblacio: string, email: string | null, notes: string | null) =>
    run(
      `INSERT INTO tercers (nom, nif, tipus_persona, adreca, codi_postal, poblacio, codi_provincia, pais, email, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ES', ?, ?)`,
      nom, nif, tipus, adreca, cp, poblacio, cp.slice(0, 2), email, notes,
    ).id;

  const moviment = (data: string, euros: number, concepte: string, categoria: string, justificant: string | null = null) =>
    tancat(data)
      ? null
      : run(
          `INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, justificant)
           VALUES (?, 'despesa', ?, ?, ?, ?, ?)`,
          data, Math.round(euros * 100), concepte, cat(categoria), banc, justificant,
        ).id;

  const assigna = (movId: number | null | undefined, dades: Record<string, unknown>) => {
    if (!movId) return;
    const net = get<{ import_cents: number }>('SELECT import_cents FROM moviments WHERE id = ?', movId)!.import_cents;
    const d = calculaFiscal(net, dades);
    run(
      `INSERT OR REPLACE INTO moviments_fiscal (moviment_id, tercer_id, base_cents, retencio_pct, retencio_cents, tipus_retencio, clau_190)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      movId, d.tercer_id, d.base_cents, d.retencio_pct, d.retencio_cents, d.tipus_retencio, d.clau_190,
    );
  };

  tx(() => {
    const music = tercer('Miquel Cerdà Llompart', '41523786T', 'fisica', 'Carrer del Temple, 12', '07460', 'Pollença', 'miquel.cerda@exemple.cat', 'Músic (xeremies i flabiol). Factura amb retenció del 15 %.');
    const ponent = tercer('Joana Mas Ferrer', '43098765P', 'fisica', 'Carrer de Sant Miquel, 30', '07002', 'Palma', 'joana.mas@exemple.cat', 'Historiadora. Xerrades i conferències.');
    const propietari = tercer('Bartomeu Vich Torrens', '41234567Y', 'fisica', 'Carrer de Ca les Monges, 4', '07460', 'Pollença', null, 'Lloguer del magatzem del carrer de Ca les Monges (retenció del 19 %).');
    const impremta = tercer('Impremta Pollença, SL', 'B07123458', 'juridica', 'Carrer de Sant Jordi, 21', '07460', 'Pollença', 'comandes@impremta-pollenca.exemple', null);

    // Músic: actuació a les festes de la Patrona (net 255 €, base 300 €, retenció 15 %).
    assigna(moviment(`${any}-08-14`, 255, 'Actuació de xeremies a la festa de la Patrona – Miquel Cerdà', 'Activitats i tallers', 'Factura 2026-07'), {
      tercer_id: music, retencio_pct: 15, tipus_retencio: 'professional', clau_190: 'G01',
    });

    // Ponent: honoraris de la xerrada del febrer (ja comptabilitzats).
    const xerrada = get<{ id: number }>("SELECT id FROM moviments WHERE concepte = 'Honoraris ponent xerrada' ORDER BY id LIMIT 1")?.id;
    assigna(xerrada, { tercer_id: ponent, retencio_pct: 15, tipus_retencio: 'professional', clau_190: 'F01' });

    // Lloguer del magatzem: base 150 €, retenció 19 % (28,50 €), net 121,50 € cada mes fins a l'actual.
    const mesActual = Number(avui().slice(5, 7));
    for (let m = 1; m <= mesActual; m++) {
      const data = `${any}-${String(m).padStart(2, '0')}-05`;
      if (data > avui()) break;
      assigna(moviment(data, 121.5, `Lloguer del magatzem – ${String(m).padStart(2, '0')}/${any}`, 'Lloguers', `Rebut ${m}/${any}`), {
        tercer_id: propietari, retencio_pct: 19, tipus_retencio: 'arrendament',
      });
    }

    // Impremta: el receptari de l'any passat (pagat amb una subvenció) fa superar el llindar del model 347.
    if (!tancat(`${any - 1}-11-14`))
      run(
        `INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, justificant)
         VALUES (?, 'ingres', 300000, 'Subvenció Consell de Mallorca – edició del receptari', ?, ?, 'Resolució CM 2025/4410')`,
        `${any - 1}-11-14`, cat('Subvencions públiques'), banc,
      );
    const receptari = moviment(`${any - 1}-11-28`, 2780, 'Impressió del receptari de cuina de padrines (500 exemplars)', 'Publicacions i impremta', 'F-2025-702');
    for (const id of [
      receptari,
      get<{ id: number }>("SELECT id FROM moviments WHERE concepte = 'Impressió de fotografies i plafons' ORDER BY id LIMIT 1")?.id,
      get<{ id: number }>("SELECT id FROM moviments WHERE concepte = 'Impressió del llibret de rondalles' ORDER BY id LIMIT 1")?.id,
    ])
      assigna(id, { tercer_id: impremta });
  });

  // Ingressos trimestrals ja fets (1T i 2T); el 3T queda pendent i surt com a avís.
  for (const [model, t, data] of [['111', 1, `${any}-04-17`], ['115', 1, `${any}-04-17`], ['115', 2, `${any}-07-16`]] as const) {
    if (data > avui()) continue;
    try {
      registraPagament(model, any, t, data, banc);
    } catch {
      // Sense retencions al trimestre o exercici tancat: no cal.
    }
  }

  // Extracte bancari (com si s'hagués importat d'un CSV) des de l'1 d'agost.
  const inici = `${any}-08-01`;
  if (inici > avui()) return;
  const lloguer = (m: number): [string, number, string] => [`${any}-${String(m).padStart(2, '0')}-05`, -12150, `RECIBO BARTOMEU VICH TORRENS LLOGUER ${String(m).padStart(2, '0')}/${any}`];
  const brut: [string, number, string][] = [
    lloguer(8),
    [`${any}-08-17`, -25500, 'TRANSFERENCIA A MIQUEL CERDA LLOMPART FRA 2026-07'],
    [`${any}-08-31`, -350, 'COMISION MANTENIMIENTO'],
    lloguer(9),
    [`${any}-09-12`, 2000, 'TRANSF. DE ANTONIA SERRA - QUOTA SOCI'],
    [`${any}-09-30`, -350, 'COMISION MANTENIMIENTO'],
    lloguer(10),
    [`${any}-10-09`, 5000, 'BIZUM DE CATALINA FERRAGUT DONATIU MOLINS'],
  ];
  let saldo = saldoAplicacio(banc, sumaDies(-1, new Date(`${inici}T12:00:00`)));
  const linies: LiniaExtracte[] = brut
    .filter(([d]) => d <= avui())
    .map(([data, import_cents, concepte]) => {
      saldo += import_cents;
      return { data, data_valor: data, concepte, import_cents, saldo_cents: saldo, referencia: null };
    });
  desaLinies(banc, preparaImportacio(banc, linies), 'csv');
  setConfig(`fiscal_extracte_mapa_${banc}`, JSON.stringify({ mapa: { data: 0, data_valor: 1, concepte: 2, import: 3, saldo: 4 }, capcalera: true }));

  // El lloguer d'agost ja està conciliat amb el seu moviment.
  const l = get<{ id: number }>("SELECT id FROM extracte_linies WHERE compte_id = ? AND data = ? AND import_cents = -12150", banc, `${any}-08-05`);
  const m = get<{ id: number }>("SELECT id FROM moviments WHERE compte_id = ? AND data = ? AND import_cents = 12150 AND tipus = 'despesa'", banc, `${any}-08-05`);
  if (l && m) run("UPDATE extracte_linies SET estat = 'conciliat', moviment_id = ? WHERE id = ?", m.id, l.id);
}

