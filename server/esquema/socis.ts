// Esquema del mòdul «socis» (registre de socis): categories, períodes d'alta i baixa, admissió…
// Idempotent: s'executa a cada arrencada.
import type { Esquema } from './tipus.ts';

/** Dedueix el tipus de motiu de baixa a partir del text lliure antic. */
export function tipusMotiu(motiu: string | null): string {
  const m = (motiu ?? '').toLowerCase();
  if (/defunci|mort|traspàs|falleci/.test(m)) return 'defuncio';
  if (/impagament|impag|quota|deute/.test(m)) return 'impagament';
  if (/expuls|sanci/.test(m)) return 'expulsio';
  if (/volunt|petici|renún|renun|demana|sol·licit|propi/.test(m)) return 'voluntaria';
  return 'altres';
}

export const esquema: Esquema = (db, afegeixColumna) => {
  // Categories de soci: determinen el dret a vot (quòrum de l'assemblea) i si paguen quota.
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories_soci (
      id         INTEGER PRIMARY KEY,
      nom        TEXT NOT NULL UNIQUE,
      te_vot     INTEGER NOT NULL DEFAULT 1,
      paga_quota INTEGER NOT NULL DEFAULT 1,
      descripcio TEXT
    );
  `);
  afegeixColumna('socis', 'categoria_id', 'INTEGER REFERENCES categories_soci(id) ON DELETE SET NULL');
  if (!(db.prepare('SELECT 1 FROM categories_soci LIMIT 1').get())) {
    const ins = db.prepare('INSERT INTO categories_soci (nom, te_vot, paga_quota, descripcio) VALUES (?, ?, ?, ?)');
    ins.run('Numerari', 1, 1, 'Soci de ple dret');
    ins.run('Fundador', 1, 1, "Va participar en la constitució de l'associació");
    ins.run("D'honor", 0, 0, "Nomenat per l'assemblea; sense quota ni vot");
    ins.run('Juvenil', 0, 1, 'Menor de 18 anys; veu però sense vot');
  }

  // Admissió (art. 14 LO 1/2002 i estatuts): sol·licitud → admesa / denegada.
  // Mentre una sol·licitud no és admesa, data_baixa = data_alta (període de durada zero) perquè la resta
  // del programa (quòrum, quotes, informes) no la compti com a sòcia activa.
  afegeixColumna('socis', 'estat_admissio', "TEXT NOT NULL DEFAULT 'admesa' CHECK (estat_admissio IN ('sollicitada','admesa','denegada'))");
  afegeixColumna('socis', 'data_admissio', 'TEXT');
  afegeixColumna('socis', 'acord_admissio', 'TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS socis_estat_admissio ON socis(estat_admissio)');

  // Llibre registre: cada període de pertinença (alta → baixa). No es perd l'historial en readmetre.
  db.exec(`
    CREATE TABLE IF NOT EXISTS socis_periodes (
      id          INTEGER PRIMARY KEY,
      soci_id     INTEGER NOT NULL REFERENCES socis(id) ON DELETE CASCADE,
      data_alta   TEXT NOT NULL,
      data_baixa  TEXT,
      motiu_tipus TEXT CHECK (motiu_tipus IN ('voluntaria','impagament','expulsio','defuncio','altres')),
      motiu       TEXT,
      acord       TEXT,  -- acord d'admissió o de readmissió
      creat_el    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS socis_periodes_soci ON socis_periodes(soci_id, data_alta);
  `);
  afegeixColumna('socis_periodes', 'acord_baixa', 'TEXT'); // acord de la baixa (p. ex. l'expulsió)
  db.exec(`

    -- Qualsevol alta de soci (formulari, conversió d'interessats, importació…) obre el seu primer període.
    DROP TRIGGER IF EXISTS socis_periode_alta;
    CREATE TRIGGER socis_periode_alta AFTER INSERT ON socis
    WHEN NEW.estat_admissio = 'admesa'
    BEGIN
      INSERT INTO socis_periodes (soci_id, data_alta, data_baixa, motiu_tipus, motiu)
      VALUES (NEW.id, NEW.data_alta, NEW.data_baixa,
              CASE WHEN NEW.data_baixa IS NOT NULL THEN 'altres' END, NEW.motiu_baixa);
    END;

    -- socis.data_alta / data_baixa reflecteixen el període actual: si algú els canvia directament
    -- (p. ex. l'anonimització posa data de baixa), el període actual es manté sincronitzat.
    DROP TRIGGER IF EXISTS socis_periode_sincronitza;
    CREATE TRIGGER socis_periode_sincronitza AFTER UPDATE OF data_alta, data_baixa ON socis
    WHEN NEW.estat_admissio = 'admesa'
    BEGIN
      UPDATE socis_periodes
         SET data_alta = NEW.data_alta,
             data_baixa = NEW.data_baixa,
             motiu_tipus = CASE WHEN NEW.data_baixa IS NULL THEN NULL ELSE COALESCE(motiu_tipus, 'altres') END,
             motiu = CASE WHEN NEW.data_baixa IS NULL THEN NULL ELSE motiu END,
             acord_baixa = CASE WHEN NEW.data_baixa IS NULL THEN NULL ELSE acord_baixa END
       WHERE id = (SELECT MAX(id) FROM socis_periodes WHERE soci_id = NEW.id);
    END;

    -- Anonimització: el motiu en text lliure pot contenir dades personals.
    DROP TRIGGER IF EXISTS socis_periode_anonimitza;
    CREATE TRIGGER socis_periode_anonimitza AFTER UPDATE OF anonimitzat_el ON socis
    WHEN NEW.anonimitzat_el IS NOT NULL
    BEGIN
      UPDATE socis_periodes SET motiu = NULL WHERE soci_id = NEW.id;
    END;
  `);

  // Migració: un període per a cada soci admès que encara no en tingui (a la primera arrencada, tots).
  const sense = db
    .prepare(
      `SELECT id, data_alta, data_baixa, motiu_baixa FROM socis s
        WHERE estat_admissio = 'admesa' AND NOT EXISTS (SELECT 1 FROM socis_periodes p WHERE p.soci_id = s.id)`,
    )
    .all() as { id: number; data_alta: string; data_baixa: string | null; motiu_baixa: string | null }[];
  if (sense.length) {
    const ins = db.prepare(
      'INSERT INTO socis_periodes (soci_id, data_alta, data_baixa, motiu_tipus, motiu) VALUES (?, ?, ?, ?, ?)',
    );
    db.exec('BEGIN');
    try {
      for (const s of sense)
        ins.run(s.id, s.data_alta, s.data_baixa, s.data_baixa ? tipusMotiu(s.motiu_baixa) : null, s.data_baixa ? s.motiu_baixa : null);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
};
