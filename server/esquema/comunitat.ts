// Esquema del mòdul «comunitat»: voluntariat (Llei 45/2015 del voluntariat i Llei 3/1998 del voluntariat
// de les Illes Balears), assegurances, entitats col·laboradores, convenis i col·laboracions a les activitats.
// Idempotent: s'executa a cada arrencada.
import type { Esquema } from './tipus.ts';

export const esquema: Esquema = (db) => {
  db.exec(`
    -- Persones voluntàries: sòcies (soci_id) o no. El nom i els llinatges sempre hi són (per a les sòcies,
    -- còpia sincronitzada de la fitxa); la resta de dades identificatives només per a les no sòcies.
    CREATE TABLE IF NOT EXISTS voluntaris (
      id                       INTEGER PRIMARY KEY,
      soci_id                  INTEGER REFERENCES socis(id) ON DELETE SET NULL,
      nom                      TEXT NOT NULL,
      llinatges                TEXT NOT NULL DEFAULT '',
      dni                      TEXT,
      data_naixement           TEXT,
      email                    TEXT,
      telefon                  TEXT,
      adreca                   TEXT,
      data_incorporacio        TEXT NOT NULL,
      data_baixa               TEXT,
      motiu_baixa              TEXT,
      funcions                 TEXT,
      habilitats               TEXT,
      disponibilitat           TEXT,          -- compromís de temps / disponibilitat
      formacio                 TEXT,
      acord_signat_el          TEXT,          -- acord d'incorporació (art. 12 Llei 45/2015)
      treballa_amb_menors      INTEGER NOT NULL DEFAULT 0,
      certificat_delictes_data TEXT,          -- certificat negatiu del Registre Central de Delinqüents Sexuals (art. 8.4)
      notes                    TEXT,
      creat_el                 TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS voluntaris_soci ON voluntaris(soci_id) WHERE soci_id IS NOT NULL;

    -- Registre d'altes i baixes: un període per incorporació (no es perd l'historial en reincorporar-se).
    CREATE TABLE IF NOT EXISTS voluntaris_periodes (
      id           INTEGER PRIMARY KEY,
      voluntari_id INTEGER NOT NULL REFERENCES voluntaris(id) ON DELETE CASCADE,
      data_alta    TEXT NOT NULL,
      data_baixa   TEXT,
      motiu_baixa  TEXT
    );
    CREATE INDEX IF NOT EXISTS voluntaris_periodes_vol ON voluntaris_periodes(voluntari_id, data_alta);

    DROP TRIGGER IF EXISTS voluntaris_periode_alta;
    CREATE TRIGGER voluntaris_periode_alta AFTER INSERT ON voluntaris
    BEGIN
      INSERT INTO voluntaris_periodes (voluntari_id, data_alta, data_baixa, motiu_baixa)
      VALUES (NEW.id, NEW.data_incorporacio, NEW.data_baixa, NEW.motiu_baixa);
    END;

    -- Les dates de la fitxa són les del període actual (el darrer).
    DROP TRIGGER IF EXISTS voluntaris_periode_sincronitza;
    CREATE TRIGGER voluntaris_periode_sincronitza AFTER UPDATE OF data_incorporacio, data_baixa, motiu_baixa ON voluntaris
    BEGIN
      UPDATE voluntaris_periodes
         SET data_alta = NEW.data_incorporacio, data_baixa = NEW.data_baixa,
             motiu_baixa = CASE WHEN NEW.data_baixa IS NULL THEN NULL ELSE NEW.motiu_baixa END
       WHERE id = (SELECT MAX(id) FROM voluntaris_periodes WHERE voluntari_id = NEW.id);
    END;

    -- El nom de les persones sòcies segueix la fitxa del soci (també quan s'anonimitza).
    DROP TRIGGER IF EXISTS voluntaris_nom_soci;
    CREATE TRIGGER voluntaris_nom_soci AFTER UPDATE OF nom, llinatges ON socis
    BEGIN
      UPDATE voluntaris SET nom = NEW.nom, llinatges = NEW.llinatges WHERE soci_id = NEW.id;
    END;
    DROP TRIGGER IF EXISTS voluntaris_anonimitza;
    CREATE TRIGGER voluntaris_anonimitza AFTER UPDATE OF anonimitzat_el ON socis
    WHEN NEW.anonimitzat_el IS NOT NULL
    BEGIN
      UPDATE voluntaris SET dni = NULL, data_naixement = NULL, email = NULL, telefon = NULL, adreca = NULL, notes = NULL,
             motiu_baixa = NULL, data_baixa = COALESCE(data_baixa, date('now','localtime'))
       WHERE soci_id = NEW.id;
    END;

    CREATE TABLE IF NOT EXISTS hores_voluntariat (
      id           INTEGER PRIMARY KEY,
      voluntari_id INTEGER NOT NULL REFERENCES voluntaris(id) ON DELETE CASCADE,
      activitat_id INTEGER REFERENCES activitats(id) ON DELETE SET NULL,
      data         TEXT NOT NULL,
      hores        REAL NOT NULL CHECK (hores > 0 AND hores <= 24),
      tasca        TEXT,
      creat_el     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS hores_voluntariat_data ON hores_voluntariat(data);
    CREATE INDEX IF NOT EXISTS hores_voluntariat_vol ON hores_voluntariat(voluntari_id, data);

    -- Assegurances (art. 10 Llei 45/2015: accidents i responsabilitat civil de les persones voluntàries).
    CREATE TABLE IF NOT EXISTS assegurances (
      id              INTEGER PRIMARY KEY,
      asseguradora    TEXT NOT NULL,
      num_polissa     TEXT,
      tipus           TEXT NOT NULL CHECK (tipus IN ('responsabilitat_civil','accidents_voluntaris','activitats','altres')),
      cobertura       TEXT,
      data_inici      TEXT,
      data_venciment  TEXT NOT NULL,
      prima_cents     INTEGER CHECK (prima_cents >= 0),
      mediador        TEXT,
      contacte        TEXT,
      nominativa      INTEGER NOT NULL DEFAULT 0,   -- 1: només cobreix les persones indicades
      no_renovar      INTEGER NOT NULL DEFAULT 0,   -- 1: no s'avisa del venciment
      document        TEXT,                         -- data URI (PDF o imatge)
      document_nom    TEXT,
      notes           TEXT,
      creat_el        TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS assegurances_voluntaris (
      asseguranca_id  INTEGER NOT NULL REFERENCES assegurances(id) ON DELETE CASCADE,
      voluntari_id    INTEGER NOT NULL REFERENCES voluntaris(id) ON DELETE CASCADE,
      PRIMARY KEY (asseguranca_id, voluntari_id)
    );

    -- ---------- Col·laboradors ----------

    CREATE TABLE IF NOT EXISTS entitats_collaboradores (
      id               INTEGER PRIMARY KEY,
      nom              TEXT NOT NULL,
      tipus            TEXT NOT NULL DEFAULT 'entitat' CHECK (tipus IN ('ajuntament','consell','govern','escola','entitat','empresa','altres')),
      nif              TEXT,
      persona_contacte TEXT,
      carrec           TEXT,
      email            TEXT,
      telefon          TEXT,
      adreca           TEXT,
      web              TEXT,
      notes            TEXT,
      actiu            INTEGER NOT NULL DEFAULT 1,
      creat_el         TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS convenis (
      id                   INTEGER PRIMARY KEY,
      entitat_id           INTEGER NOT NULL REFERENCES entitats_collaboradores(id),
      titol                TEXT NOT NULL,
      objecte              TEXT,
      data_signatura       TEXT,
      data_inici           TEXT,
      data_fi              TEXT,
      renovacio_automatica INTEGER NOT NULL DEFAULT 0,
      import_cents         INTEGER CHECK (import_cents >= 0),  -- aportació econòmica, si n'hi ha
      obligacions          TEXT,
      document             TEXT,
      document_nom         TEXT,
      estat                TEXT NOT NULL DEFAULT 'esborrany' CHECK (estat IN ('esborrany','vigent','finalitzat')),
      notes                TEXT,
      creat_el             TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS convenis_entitat ON convenis(entitat_id);

    CREATE TABLE IF NOT EXISTS activitats_entitats (
      activitat_id INTEGER NOT NULL REFERENCES activitats(id) ON DELETE CASCADE,
      entitat_id   INTEGER NOT NULL REFERENCES entitats_collaboradores(id) ON DELETE CASCADE,
      rol          TEXT NOT NULL DEFAULT 'collaborador' CHECK (rol IN ('organitzador','collaborador','patrocinador','espai_cedit','altres')),
      notes        TEXT,
      PRIMARY KEY (activitat_id, entitat_id)
    );
    CREATE INDEX IF NOT EXISTS activitats_entitats_entitat ON activitats_entitats(entitat_id);
  `);
};
