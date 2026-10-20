// Esquema del mòdul «fiscal»: tercers, retencions i extractes bancaris (idempotent, s'executa a cada arrencada).
import type { Esquema } from './tipus.ts';

export const esquema: Esquema = (db) => {
  db.exec(`
    -- Tercers: proveïdors, professionals, artistes, arrendadors… (models 111, 115, 180, 190 i 347).
    CREATE TABLE IF NOT EXISTS tercers (
      id             INTEGER PRIMARY KEY,
      nom            TEXT NOT NULL,
      nif            TEXT,
      tipus_persona  TEXT NOT NULL DEFAULT 'fisica' CHECK (tipus_persona IN ('fisica','juridica')),
      adreca         TEXT,
      codi_postal    TEXT,
      poblacio       TEXT,
      codi_provincia TEXT,               -- dues primeres xifres del codi postal espanyol
      pais           TEXT NOT NULL DEFAULT 'ES',
      email          TEXT,
      telefon        TEXT,
      iban           TEXT,
      notes          TEXT,
      client_id      INTEGER UNIQUE REFERENCES clients(id) ON DELETE SET NULL,
      creat_el       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Dades fiscals d'un moviment de despesa: tercer i retenció d'IRPF.
    -- L'import del moviment és el net pagat: base = net + retenció.
    CREATE TABLE IF NOT EXISTS moviments_fiscal (
      moviment_id    INTEGER PRIMARY KEY REFERENCES moviments(id) ON DELETE CASCADE,
      tercer_id      INTEGER REFERENCES tercers(id),
      base_cents     INTEGER NOT NULL DEFAULT 0 CHECK (base_cents >= 0),
      retencio_pct   REAL NOT NULL DEFAULT 0 CHECK (retencio_pct >= 0 AND retencio_pct < 100),
      retencio_cents INTEGER NOT NULL DEFAULT 0 CHECK (retencio_cents >= 0),
      tipus_retencio TEXT CHECK (tipus_retencio IN ('professional','arrendament','altres')),
      clau_190       TEXT
    );
    CREATE INDEX IF NOT EXISTS moviments_fiscal_tercer ON moviments_fiscal(tercer_id);

    -- Ingressos trimestrals de retencions (models 111 i 115) comptabilitzats com a moviment.
    CREATE TABLE IF NOT EXISTS fiscal_pagaments (
      model       TEXT NOT NULL CHECK (model IN ('111','115')),
      exercici    INTEGER NOT NULL,
      trimestre   INTEGER NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
      moviment_id INTEGER NOT NULL REFERENCES moviments(id) ON DELETE CASCADE,
      PRIMARY KEY (model, exercici, trimestre)
    );

    -- Línies dels extractes bancaris importats (CSV o Norma 43) i la seva conciliació.
    -- moviment_id no és clau forana: si s'elimina el moviment, el disparador torna la línia a «pendent».
    CREATE TABLE IF NOT EXISTS extracte_linies (
      id           INTEGER PRIMARY KEY,
      compte_id    INTEGER NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
      data         TEXT NOT NULL,
      data_valor   TEXT,
      concepte     TEXT NOT NULL DEFAULT '',
      import_cents INTEGER NOT NULL,          -- amb signe: positiu = entrada, negatiu = sortida
      saldo_cents  INTEGER,
      referencia   TEXT,
      empremta     TEXT NOT NULL UNIQUE,      -- evita duplicats en tornar a importar
      estat        TEXT NOT NULL DEFAULT 'pendent' CHECK (estat IN ('pendent','conciliat','ignorat')),
      moviment_id  INTEGER,
      origen       TEXT NOT NULL DEFAULT 'csv' CHECK (origen IN ('csv','n43')),
      importat_el  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS extracte_linies_compte ON extracte_linies(compte_id, data);
    CREATE INDEX IF NOT EXISTS extracte_linies_moviment ON extracte_linies(moviment_id);

    CREATE TRIGGER IF NOT EXISTS extracte_moviment_esborrat AFTER DELETE ON moviments
    BEGIN
      UPDATE extracte_linies SET estat = 'pendent', moviment_id = NULL WHERE moviment_id = OLD.id;
    END;
  `);
};
