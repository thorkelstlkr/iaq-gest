// Esquema del mòdul «governanca»: reunions dels òrgans de govern, assistència, acords, llibre d'actes,
// càrrecs de la junta directiva, convocatòries i certificats (idempotent, s'executa a cada arrencada).
//
// Llei orgànica 1/2002, art. 14: les associacions han de dur un llibre d'actes. Un cop aprovada
// (tancada), una acta —i els acords i l'assistència de la reunió— no es pot modificar ni esborrar:
// ho impedeixen els disparadors de la base de dades, encara que s'hi accedeixi des de fora del programa.
import type { Esquema } from './tipus.ts';

export const esquema: Esquema = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reunions (
      id                INTEGER PRIMARY KEY,
      organ             TEXT NOT NULL CHECK (organ IN ('assemblea','junta','comissio')),
      tipus             TEXT NOT NULL DEFAULT 'ordinaria' CHECK (tipus IN ('ordinaria','extraordinaria')),
      titol             TEXT,                 -- p. ex. el nom de la comissió
      data              TEXT NOT NULL,
      hora_1a           TEXT,
      hora_2a           TEXT,
      lloc              TEXT,
      ordre_dia         TEXT NOT NULL DEFAULT '[]',  -- JSON: llista de punts
      estat             TEXT NOT NULL DEFAULT 'prevista' CHECK (estat IN ('prevista','convocada','celebrada','anullada')),
      data_convocatoria TEXT,
      convocatoria_celebrada TEXT CHECK (convocatoria_celebrada IN ('1a','2a')),
      notes             TEXT,
      creat_el          TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS reunions_data ON reunions(data);

    -- Assistència: present o representat per un altre soci (delegació de vot).
    -- «nom» és una còpia del nom en el moment de la reunió (l'acta no ha de canviar si després s'anonimitza el soci).
    CREATE TABLE IF NOT EXISTS reunio_assistents (
      reunio_id       INTEGER NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
      soci_id         INTEGER NOT NULL REFERENCES socis(id),
      nom             TEXT NOT NULL,
      forma           TEXT NOT NULL DEFAULT 'present' CHECK (forma IN ('present','representat')),
      representant_id INTEGER REFERENCES socis(id),
      PRIMARY KEY (reunio_id, soci_id)
    );

    CREATE TABLE IF NOT EXISTS acords (
      id          INTEGER PRIMARY KEY,
      reunio_id   INTEGER NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
      punt        INTEGER,
      text        TEXT NOT NULL,
      vots_favor  INTEGER,
      vots_contra INTEGER,
      abstencions INTEGER,
      resultat    TEXT NOT NULL DEFAULT 'aprovat' CHECK (resultat IN ('aprovat','rebutjat','informatiu')),
      creat_el    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS acords_reunio ON acords(reunio_id);

    -- Una acta per reunió celebrada, numerada correlativament per òrgan i any.
    CREATE TABLE IF NOT EXISTS actes (
      id             INTEGER PRIMARY KEY,
      reunio_id      INTEGER NOT NULL UNIQUE REFERENCES reunions(id) ON DELETE CASCADE,
      organ          TEXT NOT NULL,
      any            INTEGER NOT NULL,
      numero         INTEGER NOT NULL,
      text           TEXT NOT NULL DEFAULT '',
      data_aprovacio TEXT,
      presidencia    TEXT,   -- qui presideix (signa el vist i plau)
      secretaria     TEXT,   -- qui actua de secretari/ària (signa l'acta)
      tancada        INTEGER NOT NULL DEFAULT 0,
      tancada_el     TEXT,
      tancada_per    TEXT,
      creat_el       TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (organ, any, numero)
    );

    -- Càrrecs de la junta directiva (historial complet: no s'esborren quan cessen).
    CREATE TABLE IF NOT EXISTS carrecs (
      id                      INTEGER PRIMARY KEY,
      soci_id                 INTEGER NOT NULL REFERENCES socis(id),
      carrec                  TEXT NOT NULL CHECK (carrec IN ('presidencia','vicepresidencia','secretaria','tresoreria','vocal')),
      data_eleccio            TEXT NOT NULL,
      data_fi_mandat          TEXT,
      reunio_id               INTEGER REFERENCES reunions(id) ON DELETE SET NULL,
      data_cessament          TEXT,
      motiu_cessament         TEXT,
      comunicat_registre_el   TEXT,   -- comunicació del nomenament al Registre d'Associacions
      cessament_comunicat_el  TEXT,   -- comunicació del cessament
      notes                   TEXT,
      creat_el                TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Registre d'enviament de cada convocatòria (correu o carta).
    CREATE TABLE IF NOT EXISTS reunio_convocats (
      id        INTEGER PRIMARY KEY,
      reunio_id INTEGER NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
      soci_id   INTEGER REFERENCES socis(id) ON DELETE SET NULL,
      nom       TEXT NOT NULL,
      canal     TEXT NOT NULL CHECK (canal IN ('email','carta')),
      adreca    TEXT,               -- correu o adreça postal
      enviat_el TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      error     TEXT,
      autor     TEXT
    );
    CREATE INDEX IF NOT EXISTS reunio_convocats_reunio ON reunio_convocats(reunio_id);

    -- Certificats emesos per la secretaria amb el vist i plau de la presidència.
    CREATE TABLE IF NOT EXISTS certificats (
      id          INTEGER PRIMARY KEY,
      any         INTEGER NOT NULL,
      numero      INTEGER NOT NULL,
      tipus       TEXT NOT NULL CHECK (tipus IN ('soci','acord','junta')),
      data        TEXT NOT NULL,
      soci_id     INTEGER REFERENCES socis(id) ON DELETE SET NULL,
      acord_id    INTEGER REFERENCES acords(id) ON DELETE SET NULL,
      finalitat   TEXT,
      contingut   TEXT NOT NULL,     -- JSON amb les dades certificades en el moment d'emetre'l
      secretaria  TEXT,
      presidencia TEXT,
      emes_per    TEXT,
      creat_el    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (any, numero)
    );

    -- ---------- Actes tancades: immutables ----------

    CREATE TRIGGER IF NOT EXISTS actes_tancades_no_modificar BEFORE UPDATE ON actes WHEN OLD.tancada = 1
    BEGIN SELECT RAISE(ABORT, 'Una acta aprovada no es pot modificar.'); END;

    CREATE TRIGGER IF NOT EXISTS actes_tancades_no_esborrar BEFORE DELETE ON actes WHEN OLD.tancada = 1
    BEGIN SELECT RAISE(ABORT, 'Una acta aprovada no es pot esborrar.'); END;

    CREATE TRIGGER IF NOT EXISTS reunions_acta_tancada_no_modificar
    BEFORE UPDATE OF organ, tipus, titol, data, hora_1a, hora_2a, lloc, ordre_dia, estat, convocatoria_celebrada ON reunions
    WHEN EXISTS (SELECT 1 FROM actes WHERE reunio_id = OLD.id AND tancada = 1)
    BEGIN SELECT RAISE(ABORT, 'La reunió té l''acta aprovada: no es pot modificar.'); END;

    CREATE TRIGGER IF NOT EXISTS reunions_acta_tancada_no_esborrar BEFORE DELETE ON reunions
    WHEN EXISTS (SELECT 1 FROM actes WHERE reunio_id = OLD.id AND tancada = 1)
    BEGIN SELECT RAISE(ABORT, 'La reunió té l''acta aprovada: no es pot esborrar.'); END;

    CREATE TRIGGER IF NOT EXISTS acords_acta_tancada_no_afegir BEFORE INSERT ON acords
    WHEN EXISTS (SELECT 1 FROM actes WHERE reunio_id = NEW.reunio_id AND tancada = 1)
    BEGIN SELECT RAISE(ABORT, 'Els acords d''una acta aprovada no es poden modificar.'); END;

    CREATE TRIGGER IF NOT EXISTS acords_acta_tancada_no_modificar BEFORE UPDATE ON acords
    WHEN EXISTS (SELECT 1 FROM actes WHERE reunio_id IN (OLD.reunio_id, NEW.reunio_id) AND tancada = 1)
    BEGIN SELECT RAISE(ABORT, 'Els acords d''una acta aprovada no es poden modificar.'); END;

    CREATE TRIGGER IF NOT EXISTS acords_acta_tancada_no_esborrar BEFORE DELETE ON acords
    WHEN EXISTS (SELECT 1 FROM actes WHERE reunio_id = OLD.reunio_id AND tancada = 1)
    BEGIN SELECT RAISE(ABORT, 'Els acords d''una acta aprovada no es poden modificar.'); END;

    CREATE TRIGGER IF NOT EXISTS assistents_acta_tancada_no_afegir BEFORE INSERT ON reunio_assistents
    WHEN EXISTS (SELECT 1 FROM actes WHERE reunio_id = NEW.reunio_id AND tancada = 1)
    BEGIN SELECT RAISE(ABORT, 'L''assistència d''una acta aprovada no es pot modificar.'); END;

    CREATE TRIGGER IF NOT EXISTS assistents_acta_tancada_no_modificar BEFORE UPDATE ON reunio_assistents
    WHEN EXISTS (SELECT 1 FROM actes WHERE reunio_id IN (OLD.reunio_id, NEW.reunio_id) AND tancada = 1)
    BEGIN SELECT RAISE(ABORT, 'L''assistència d''una acta aprovada no es pot modificar.'); END;

    CREATE TRIGGER IF NOT EXISTS assistents_acta_tancada_no_esborrar BEFORE DELETE ON reunio_assistents
    WHEN EXISTS (SELECT 1 FROM actes WHERE reunio_id = OLD.reunio_id AND tancada = 1)
    BEGIN SELECT RAISE(ABORT, 'L''assistència d''una acta aprovada no es pot modificar.'); END;

    CREATE TRIGGER IF NOT EXISTS certificats_no_modificar BEFORE UPDATE OF any, numero, tipus, data, contingut ON certificats
    BEGIN SELECT RAISE(ABORT, 'Un certificat emès no es pot modificar.'); END;
  `);
};
