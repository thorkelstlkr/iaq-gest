// Esquema del mòdul «tresoreria»: taules i columnes pròpies (idempotent, s'executa a cada arrencada).
import type { Esquema } from './tipus.ts';

/** Missatge dels disparadors que protegeixen els exercicis tancats (es tradueix a server/i18n/moduls/tresoreria.ts). */
export const MISSATGE_TANCAT = "Exercici tancat: no es poden afegir, modificar ni eliminar moviments d'un exercici tancat. Cal reobrir-lo primer.";

/**
 * Valors fiscals per defecte de les categories d'ingrés encara no revisades (art. 9.3 LIS):
 * quotes, subvencions i donacions són rendes exemptes; vendes, inscripcions, patrocinis… no.
 * Els interessos bancaris no són exempts però sí que estan subjectes a retenció.
 */
export const SQL_VALORS_FISCALS = `
  UPDATE categories SET
      renda_exempta = CASE
        WHEN nom LIKE '%quot%' OR nom LIKE '%subvenc%' OR nom LIKE '%donaci%' OR nom LIKE '%donatiu%'
          OR nom LIKE '%llegat%' OR nom LIKE '%herènc%' OR nom LIKE '%herenc%' THEN 1 ELSE 0 END,
      subjecta_retencio = CASE WHEN nom LIKE '%interess%' OR nom LIKE '%rendiment%' THEN 1 ELSE subjecta_retencio END
   WHERE renda_exempta IS NULL AND tipus = 'ingres';
  UPDATE categories SET renda_exempta = 0 WHERE renda_exempta IS NULL AND tipus = 'despesa';
`;

export const esquema: Esquema = (db, afegeixColumna) => {
  // Forma de pagament de cada quota cobrada.
  afegeixColumna('quotes', 'metode', "TEXT CHECK (metode IN ('efectiu','transferencia','domiciliacio'))");
  // Dades bancàries dels comptes (per a les remeses SEPA).
  afegeixColumna('comptes', 'iban', 'TEXT');
  afegeixColumna('comptes', 'bic', 'TEXT');
  // Fiscalitat (Impost de Societats, entitats parcialment exemptes): NULL = encara sense revisar.
  afegeixColumna('categories', 'renda_exempta', 'INTEGER');
  afegeixColumna('categories', 'subjecta_retencio', 'INTEGER NOT NULL DEFAULT 0');

  db.exec(`
    -- Forma de pagament preferida de cada soci i mandat SEPA (una fila per soci).
    CREATE TABLE IF NOT EXISTS mandats_sepa (
      soci_id        INTEGER PRIMARY KEY REFERENCES socis(id) ON DELETE CASCADE,
      metode         TEXT NOT NULL DEFAULT 'efectiu' CHECK (metode IN ('efectiu','transferencia','domiciliacio')),
      referencia     TEXT UNIQUE,
      data_signatura TEXT,
      sequencia      TEXT NOT NULL DEFAULT 'FRST' CHECK (sequencia IN ('FRST','RCUR')),
      actiu          INTEGER NOT NULL DEFAULT 1,
      modificat_el   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Remeses de rebuts domiciliats (SEPA Core, pain.008.001.02).
    CREATE TABLE IF NOT EXISTS remeses (
      id              INTEGER PRIMARY KEY,
      referencia      TEXT NOT NULL UNIQUE,      -- MsgId del fitxer
      data_cobrament  TEXT NOT NULL,             -- ReqdColltnDt
      compte_id       INTEGER NOT NULL REFERENCES comptes(id),
      num_operacions  INTEGER NOT NULL,
      total_cents     INTEGER NOT NULL,
      estat           TEXT NOT NULL DEFAULT 'generada' CHECK (estat IN ('generada','cobrada')),
      xml             TEXT NOT NULL,
      moviment_id     INTEGER REFERENCES moviments(id) ON DELETE SET NULL,
      cobrada_el      TEXT,
      usuari          TEXT,
      creat_el        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS remesa_linies (
      id                    INTEGER PRIMARY KEY,
      remesa_id             INTEGER NOT NULL REFERENCES remeses(id) ON DELETE CASCADE,
      quota_id              INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
      soci_id               INTEGER REFERENCES socis(id) ON DELETE SET NULL,
      nom_deutor            TEXT NOT NULL,
      iban                  TEXT NOT NULL,
      mandat_referencia     TEXT NOT NULL,
      mandat_data           TEXT NOT NULL,
      sequencia             TEXT NOT NULL CHECK (sequencia IN ('FRST','RCUR')),
      import_cents          INTEGER NOT NULL CHECK (import_cents > 0),
      end_to_end            TEXT NOT NULL,
      concepte              TEXT NOT NULL,
      estat                 TEXT NOT NULL DEFAULT 'inclosa' CHECK (estat IN ('inclosa','retornada')),
      data_devolucio        TEXT,
      motiu_devolucio       TEXT,
      comissio_cents        INTEGER NOT NULL DEFAULT 0,
      moviment_devolucio_id INTEGER REFERENCES moviments(id) ON DELETE SET NULL,
      moviment_comissio_id  INTEGER REFERENCES moviments(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS remesa_linies_remesa ON remesa_linies(remesa_id);
    CREATE INDEX IF NOT EXISTS remesa_linies_quota ON remesa_linies(quota_id);

    -- Pressupost anual per categoria (l'aprovació es desa a config: pressupost_aprovat_<any>).
    CREATE TABLE IF NOT EXISTS pressupost (
      exercici     INTEGER NOT NULL,
      categoria_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      import_cents INTEGER NOT NULL DEFAULT 0 CHECK (import_cents >= 0),
      PRIMARY KEY (exercici, categoria_id)
    );

    -- Exercicis tancats: els seus moviments ja no es poden tocar.
    CREATE TABLE IF NOT EXISTS exercicis_tancats (
      exercici  INTEGER PRIMARY KEY,
      tancat_el TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      usuari    TEXT,
      notes     TEXT
    );

    CREATE TRIGGER IF NOT EXISTS moviments_tancat_afegir BEFORE INSERT ON moviments
    WHEN EXISTS (SELECT 1 FROM exercicis_tancats WHERE exercici = CAST(substr(NEW.data, 1, 4) AS INTEGER))
    BEGIN SELECT RAISE(ABORT, '${MISSATGE_TANCAT.replace(/'/g, "''")}'); END;

    -- No inclou soci_id ni activitat_id: si s'elimina un soci o una activitat, la clau es posa a NULL.
    CREATE TRIGGER IF NOT EXISTS moviments_tancat_modificar
    BEFORE UPDATE OF data, tipus, import_cents, concepte, categoria_id, compte_id, compte_desti_id, justificant ON moviments
    WHEN EXISTS (SELECT 1 FROM exercicis_tancats
                  WHERE exercici IN (CAST(substr(OLD.data, 1, 4) AS INTEGER), CAST(substr(NEW.data, 1, 4) AS INTEGER)))
    BEGIN SELECT RAISE(ABORT, '${MISSATGE_TANCAT.replace(/'/g, "''")}'); END;

    CREATE TRIGGER IF NOT EXISTS moviments_tancat_esborrar BEFORE DELETE ON moviments
    WHEN EXISTS (SELECT 1 FROM exercicis_tancats WHERE exercici = CAST(substr(OLD.data, 1, 4) AS INTEGER))
    BEGIN SELECT RAISE(ABORT, '${MISSATGE_TANCAT.replace(/'/g, "''")}'); END;
  `);

  db.exec(SQL_VALORS_FISCALS);
};
