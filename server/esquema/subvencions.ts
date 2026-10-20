// Esquema del mòdul «subvencions»: taules i columnes pròpies (idempotent, s'executa a cada arrencada).
// Subvencions (Llei 38/2003 i RD 887/2006), imputació de despeses i justificants adjunts als moviments.
import type { Esquema } from './tipus.ts';

/** Missatges dels disparadors (es tradueixen a server/i18n/moduls/subvencions.ts). */
export const MISSATGE_IMPUTACIO_EXCES = "La suma de les imputacions a subvencions supera l'import del moviment.";
export const MISSATGE_JUSTIFICANT_TANCAT = "Exercici tancat: els justificants dels moviments d'un exercici tancat no es poden eliminar ni modificar.";

export const ESTATS_SUBVENCIO = ['preparacio', 'sollicitada', 'concedida', 'denegada', 'cobrada', 'justificada', 'tancada', 'reintegrament'] as const;

const sql = (s: string) => s.replace(/'/g, "''");

export const esquema: Esquema = (db, afegeixColumna) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subvencions (
      id                        INTEGER PRIMARY KEY,
      organisme                 TEXT NOT NULL,
      convocatoria              TEXT,
      linia                     TEXT,            -- línia o programa
      expedient                 TEXT,
      exercici                  INTEGER NOT NULL,
      import_sollicitat_cents   INTEGER NOT NULL DEFAULT 0 CHECK (import_sollicitat_cents >= 0),
      import_concedit_cents     INTEGER CHECK (import_concedit_cents >= 0),
      pressupost_projecte_cents INTEGER CHECK (pressupost_projecte_cents >= 0),
      data_sollicitud           TEXT,
      data_resolucio            TEXT,
      periode_inici             TEXT,
      periode_fi                TEXT,
      termini_justificacio      TEXT,
      activitat_id              INTEGER REFERENCES activitats(id) ON DELETE SET NULL,
      estat                     TEXT NOT NULL DEFAULT 'preparacio'
                                CHECK (estat IN (${ESTATS_SUBVENCIO.map((e) => `'${e}'`).join(',')})),
      requisits                 TEXT,            -- certificats AEAT / Seguretat Social i dates…
      notes                     TEXT,
      memoria                   TEXT,            -- memòria d'actuació per al compte justificatiu
      altres_ingressos          TEXT,            -- altres fonts de finançament (text lliure)
      data_justificacio         TEXT,
      document_nom              TEXT,            -- resolució de concessió
      document_mime             TEXT,
      document_mida             INTEGER,
      document_dades            TEXT,            -- data URI en base64
      creat_el                  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS subvencions_exercici ON subvencions(exercici);

    -- Despeses imputades: un moviment de despesa es pot repartir entre subvencions, sense superar-ne l'import.
    CREATE TABLE IF NOT EXISTS subvencio_imputacions (
      id           INTEGER PRIMARY KEY,
      subvencio_id INTEGER NOT NULL REFERENCES subvencions(id) ON DELETE CASCADE,
      moviment_id  INTEGER NOT NULL REFERENCES moviments(id) ON DELETE CASCADE,
      import_cents INTEGER NOT NULL CHECK (import_cents > 0),
      creditor     TEXT,                          -- proveïdor/creditor (si és buit, el concepte del moviment)
      data_emissio TEXT,                          -- data de la factura (si és buida, la del moviment)
      creat_el     TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (subvencio_id, moviment_id)
    );
    CREATE INDEX IF NOT EXISTS imputacions_moviment ON subvencio_imputacions(moviment_id);

    CREATE TRIGGER IF NOT EXISTS imputacions_limit_afegir BEFORE INSERT ON subvencio_imputacions
    WHEN NEW.import_cents + COALESCE((SELECT SUM(import_cents) FROM subvencio_imputacions WHERE moviment_id = NEW.moviment_id), 0)
         > (SELECT import_cents FROM moviments WHERE id = NEW.moviment_id)
    BEGIN SELECT RAISE(ABORT, '${sql(MISSATGE_IMPUTACIO_EXCES)}'); END;

    CREATE TRIGGER IF NOT EXISTS imputacions_limit_modificar BEFORE UPDATE OF import_cents, moviment_id ON subvencio_imputacions
    WHEN NEW.import_cents + COALESCE((SELECT SUM(import_cents) FROM subvencio_imputacions
                                       WHERE moviment_id = NEW.moviment_id AND id <> OLD.id), 0)
         > (SELECT import_cents FROM moviments WHERE id = NEW.moviment_id)
    BEGIN SELECT RAISE(ABORT, '${sql(MISSATGE_IMPUTACIO_EXCES)}'); END;

    -- Un moviment no pot baixar per davall del que té imputat.
    CREATE TRIGGER IF NOT EXISTS moviments_limit_imputacions BEFORE UPDATE OF import_cents ON moviments
    WHEN NEW.import_cents < COALESCE((SELECT SUM(import_cents) FROM subvencio_imputacions WHERE moviment_id = NEW.id), 0)
    BEGIN SELECT RAISE(ABORT, '${sql(MISSATGE_IMPUTACIO_EXCES)}'); END;

    -- Justificants (factures, tiquets, rebuts) adjunts als moviments.
    CREATE TABLE IF NOT EXISTS justificants (
      id          INTEGER PRIMARY KEY,
      moviment_id INTEGER NOT NULL REFERENCES moviments(id) ON DELETE CASCADE,
      nom         TEXT NOT NULL,
      mime        TEXT NOT NULL,
      mida        INTEGER NOT NULL,
      dades       TEXT NOT NULL,                  -- data URI en base64
      usuari      TEXT,
      creat_el    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS justificants_moviment ON justificants(moviment_id);

    -- Exercicis tancats: s'hi poden afegir justificants (completen la documentació sense alterar els comptes,
    -- que s'ha de conservar), però no se'n poden eliminar ni modificar.
    CREATE TRIGGER IF NOT EXISTS justificants_tancat_esborrar BEFORE DELETE ON justificants
    WHEN EXISTS (SELECT 1 FROM exercicis_tancats e JOIN moviments m ON m.id = OLD.moviment_id
                  WHERE e.exercici = CAST(substr(m.data, 1, 4) AS INTEGER))
    BEGIN SELECT RAISE(ABORT, '${sql(MISSATGE_JUSTIFICANT_TANCAT)}'); END;

    CREATE TRIGGER IF NOT EXISTS justificants_tancat_modificar BEFORE UPDATE ON justificants
    WHEN EXISTS (SELECT 1 FROM exercicis_tancats e JOIN moviments m ON m.id = OLD.moviment_id
                  WHERE e.exercici = CAST(substr(m.data, 1, 4) AS INTEGER))
    BEGIN SELECT RAISE(ABORT, '${sql(MISSATGE_JUSTIFICANT_TANCAT)}'); END;
  `);

  // Cobraments: ingressos vinculats a una subvenció.
  afegeixColumna('moviments', 'subvencio_id', 'INTEGER REFERENCES subvencions(id) ON DELETE SET NULL');
  db.exec('CREATE INDEX IF NOT EXISTS moviments_subvencio ON moviments(subvencio_id)');
};
