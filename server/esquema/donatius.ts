// Esquema del mòdul «donatius»: donacions, certificats per als donants (Llei 49/2002) i inventari de béns
// (art. 14 LO 1/2002). Idempotent: s'executa a cada arrencada.
//
// Les dades fiscals del donant (nom, NIF, adreça, codi postal) es copien a la mateixa fila de la donació:
// han de sobreviure a l'anonimització del soci (RGPD), perquè la donació i el certificat s'han de conservar.
import type { Esquema } from './tipus.ts';

export const esquema: Esquema = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS donatius (
      id                 INTEGER PRIMARY KEY,
      soci_id            INTEGER REFERENCES socis(id) ON DELETE SET NULL,
      -- Còpia de les dades del donant en el moment de la donació.
      nom                TEXT NOT NULL,
      nif                TEXT,
      tipus_persona      TEXT NOT NULL DEFAULT 'fisica' CHECK (tipus_persona IN ('fisica','juridica')),
      adreca             TEXT,
      codi_postal        TEXT,
      poblacio           TEXT,
      codi_provincia     TEXT,             -- dos dígits, derivat del codi postal (model 182)
      data               TEXT NOT NULL,
      import_cents       INTEGER NOT NULL DEFAULT 0 CHECK (import_cents >= 0),   -- donació dinerària
      en_especie         INTEGER NOT NULL DEFAULT 0,
      descripcio_especie TEXT,
      valoracio_cents    INTEGER CHECK (valoracio_cents IS NULL OR valoracio_cents >= 0),
      destinacio         TEXT,             -- finalitat a què es destina
      revocada           INTEGER NOT NULL DEFAULT 0,
      data_revocacio     TEXT,
      moviment_id        INTEGER REFERENCES moviments(id) ON DELETE SET NULL,
      notes              TEXT,
      creat_el           TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS donatius_data ON donatius(data);
    CREATE INDEX IF NOT EXISTS donatius_nif ON donatius(nif);

    -- Certificats i rebuts emesos als donants: numerats per any i immutables.
    CREATE TABLE IF NOT EXISTS certificats_donacio (
      id          INTEGER PRIMARY KEY,
      any         INTEGER NOT NULL,
      numero      INTEGER NOT NULL,
      tipus       TEXT NOT NULL CHECK (tipus IN ('donacio','anual','rebut')),
      donatiu_id  INTEGER REFERENCES donatius(id) ON DELETE SET NULL,
      exercici    INTEGER NOT NULL,          -- any de les donacions certificades
      nom         TEXT NOT NULL,
      nif         TEXT,
      data        TEXT NOT NULL,
      total_cents INTEGER NOT NULL DEFAULT 0,
      contingut   TEXT NOT NULL,             -- JSON amb les dades certificades en el moment d'emetre'l
      secretaria  TEXT,
      presidencia TEXT,
      emes_per    TEXT,
      creat_el    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (any, numero)
    );
    CREATE INDEX IF NOT EXISTS certificats_donacio_donatiu ON certificats_donacio(donatiu_id);

    -- Les donacions que formen part d'un certificat anual (per saber quines ja estan certificades).
    CREATE TABLE IF NOT EXISTS certificats_donacio_linies (
      certificat_id INTEGER NOT NULL REFERENCES certificats_donacio(id) ON DELETE CASCADE,
      donatiu_id    INTEGER NOT NULL REFERENCES donatius(id) ON DELETE CASCADE,
      PRIMARY KEY (certificat_id, donatiu_id)
    );

    CREATE TRIGGER IF NOT EXISTS certificats_donacio_no_modificar
    BEFORE UPDATE OF any, numero, tipus, exercici, nom, nif, data, total_cents, contingut ON certificats_donacio
    BEGIN SELECT RAISE(ABORT, 'Un certificat emès no es pot modificar.'); END;

    -- Inventari de béns (art. 14 LO 1/2002).
    CREATE TABLE IF NOT EXISTS inventari (
      id                     INTEGER PRIMARY KEY,
      descripcio             TEXT NOT NULL,
      categoria              TEXT NOT NULL DEFAULT 'altres'
                             CHECK (categoria IN ('equip_so','mobiliari','informatica','material_tallers','vestuari','altres')),
      data_adquisicio        TEXT NOT NULL,
      valor_adquisicio_cents INTEGER NOT NULL DEFAULT 0 CHECK (valor_adquisicio_cents >= 0),
      procedencia            TEXT NOT NULL DEFAULT 'compra' CHECK (procedencia IN ('compra','donacio','cessio')),
      moviment_id            INTEGER REFERENCES moviments(id) ON DELETE SET NULL,
      donatiu_id             INTEGER REFERENCES donatius(id) ON DELETE SET NULL,
      ubicacio               TEXT,
      estat                  TEXT NOT NULL DEFAULT 'bo' CHECK (estat IN ('bo','regular','dolent')),
      vida_util_anys         INTEGER CHECK (vida_util_anys IS NULL OR vida_util_anys > 0),
      data_baixa             TEXT,
      motiu_baixa            TEXT,
      foto                   TEXT,          -- data URI (JPEG reduït a la interfície)
      notes                  TEXT,
      creat_el               TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
};
