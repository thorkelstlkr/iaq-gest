// Esquema del mòdul «activitats»: programa, inscripcions obertes, assistència i planificació.
// Idempotent: s'executa a cada arrencada.
import type { DatabaseSync } from 'node:sqlite';
import type { Esquema } from './tipus.ts';

const TAULA_PARTICIPACIONS = `
  id                 INTEGER PRIMARY KEY,
  activitat_id       INTEGER NOT NULL REFERENCES activitats(id) ON DELETE CASCADE,
  soci_id            INTEGER REFERENCES socis(id) ON DELETE CASCADE,
  interessat_id      INTEGER REFERENCES interessats(id) ON DELETE SET NULL,
  -- Persones que no són sòcies (i còpia del nom de les interessades, per si se n'esborra la fitxa).
  nom_extern         TEXT,
  data_naixement     TEXT,
  genere             TEXT CHECK (genere IN ('dona','home','altre','nc')),
  telefon            TEXT,
  email              TEXT,
  tutor              TEXT,              -- pare, mare o tutor/a legal dels menors
  tutor_telefon      TEXT,
  estat              TEXT NOT NULL DEFAULT 'inscrit' CHECK (estat IN ('inscrit','espera','cancel·lat')),
  inscrit_el         TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  assistit           INTEGER NOT NULL DEFAULT 0,
  autoritzacio_tutor TEXT,              -- data en què el tutor va signar l'autorització
  drets_imatge       INTEGER,           -- NULL: no consta (es tracta com a «no»)
  notes              TEXT,
  CHECK (soci_id IS NOT NULL OR interessat_id IS NOT NULL OR nom_extern IS NOT NULL)`;

function columnes(db: DatabaseSync, taula: string) {
  return (db.prepare(`PRAGMA table_info(${taula})`).all() as { name: string }[]).map((c) => c.name);
}

export const esquema: Esquema = (db, afegeixColumna) => {
  // ---------- Participacions: de (activitat, soci) a inscripcions obertes amb identificador propi ----------
  if (!columnes(db, 'participacions').includes('id')) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN;
      CREATE TABLE participacions_nou (${TAULA_PARTICIPACIONS});
      INSERT INTO participacions_nou (activitat_id, soci_id, assistit, estat, drets_imatge)
        SELECT p.activitat_id, p.soci_id, p.assistit, 'inscrit', s.drets_imatge
          FROM participacions p LEFT JOIN socis s ON s.id = p.soci_id;
      DROP TABLE participacions;
      ALTER TABLE participacions_nou RENAME TO participacions;
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS participacions_activitat ON participacions(activitat_id, estat);
    CREATE UNIQUE INDEX IF NOT EXISTS participacions_soci_unic ON participacions(activitat_id, soci_id) WHERE soci_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS participacions_interessat_unic ON participacions(activitat_id, interessat_id) WHERE interessat_id IS NOT NULL;
    -- Els drets d'imatge d'un soci s'inicialitzen amb els de la seva fitxa.
    CREATE TRIGGER IF NOT EXISTS participacions_drets_imatge AFTER INSERT ON participacions
    WHEN NEW.soci_id IS NOT NULL AND NEW.drets_imatge IS NULL
    BEGIN
      UPDATE participacions SET drets_imatge = (SELECT drets_imatge FROM socis WHERE id = NEW.soci_id) WHERE id = NEW.id;
    END;
  `);

  // ---------- Planificació de l'activitat ----------
  const teEstat = columnes(db, 'activitats').includes('estat');
  afegeixColumna('activitats', 'places', 'INTEGER');                       // NULL: sense límit
  afegeixColumna('activitats', 'assistents_anonims', 'INTEGER NOT NULL DEFAULT 0');
  afegeixColumna('activitats', 'responsable_soci_id', 'INTEGER REFERENCES socis(id) ON DELETE SET NULL');
  afegeixColumna(
    'activitats', 'estat',
    "TEXT NOT NULL DEFAULT 'confirmada' CHECK (estat IN ('idea','preparacio','confirmada','feta','anul·lada'))",
  );
  afegeixColumna('activitats', 'pressupost_cents', 'INTEGER');
  afegeixColumna('activitats', 'materials', 'TEXT');
  afegeixColumna('activitats', 'public_objectiu', 'TEXT');
  // Les activitats que ja existien i ja han passat es donen per fetes.
  if (!teEstat) db.exec("UPDATE activitats SET estat = 'feta' WHERE COALESCE(data_fi, data_inici) < date('now','localtime')");

  // ---------- Tasques vinculades a una activitat ----------
  afegeixColumna('tasques', 'activitat_id', 'INTEGER REFERENCES activitats(id) ON DELETE CASCADE');
  db.exec('CREATE INDEX IF NOT EXISTS tasques_activitat ON tasques(activitat_id)');
};
