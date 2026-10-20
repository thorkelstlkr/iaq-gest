// Esquema de l'accés d'agents d'IA: claus d'accés, propostes pendents d'aprovar i registre d'activitat.
import type { Esquema } from './tipus.ts';

export const esquema: Esquema = (db) => {
  db.exec(`
    -- Clau personal: cada persona connecta el seu agent al seu compte (actua amb els seus permisos).
    CREATE TABLE IF NOT EXISTS agent_claus (
      id          INTEGER PRIMARY KEY,
      usuari_id   INTEGER NOT NULL REFERENCES usuaris(id) ON DELETE CASCADE,
      nom         TEXT NOT NULL,                 -- p. ex. «Claude de casa», «ChatGPT del mòbil»
      prefix      TEXT NOT NULL,                 -- primers caràcters, per reconèixer-la
      hash        TEXT NOT NULL UNIQUE,          -- SHA-256 de la clau (la clau no es desa)
      mode        TEXT NOT NULL DEFAULT 'complet' CHECK (mode IN ('lectura','complet')),
      caduca_el   TEXT,                          -- opcional
      creat_el    TEXT NOT NULL DEFAULT (datetime('now')),
      darrer_us   TEXT,
      revocada_el TEXT
    );
    CREATE TABLE IF NOT EXISTS agent_propostes (
      id          INTEGER PRIMARY KEY,
      clau_id     INTEGER REFERENCES agent_claus(id) ON DELETE SET NULL,
      usuari_id   INTEGER REFERENCES usuaris(id) ON DELETE SET NULL, -- propietari de l'agent (qui l'ha d'aprovar)
      agent       TEXT NOT NULL,
      eina        TEXT NOT NULL,
      arguments   TEXT NOT NULL,                    -- JSON
      resum       TEXT NOT NULL,                    -- què farà, en llenguatge planer
      motiu       TEXT,                             -- per què ho proposa l'agent
      estat       TEXT NOT NULL DEFAULT 'pendent' CHECK (estat IN ('pendent','executada','rebutjada','error')),
      resultat    TEXT,
      creat_el    TEXT NOT NULL DEFAULT (datetime('now')),
      decidit_per TEXT,
      decidit_el  TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_agent_propostes_estat ON agent_propostes(estat);
    CREATE TABLE IF NOT EXISTS agent_registre (
      id        INTEGER PRIMARY KEY,
      clau_id   INTEGER REFERENCES agent_claus(id) ON DELETE SET NULL,
      usuari_id INTEGER REFERENCES usuaris(id) ON DELETE SET NULL,
      agent     TEXT NOT NULL,
      eina      TEXT NOT NULL,
      nivell    TEXT NOT NULL,
      arguments TEXT,
      correcte  INTEGER NOT NULL,
      detall    TEXT,
      data      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_agent_registre_data ON agent_registre(data);

    -- OAuth per als connectors al núvol (Claude.ai, ChatGPT): aplicacions registrades (RFC 7591),
    -- codis de connexió d'un sol ús generats al programa i codis d'autorització (amb PKCE).
    CREATE TABLE IF NOT EXISTS agent_oauth_clients (
      client_id     TEXT PRIMARY KEY,
      nom           TEXT,
      redirect_uris TEXT NOT NULL,                  -- JSON
      creat_el      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS agent_codis_connexio (
      id        INTEGER PRIMARY KEY,
      usuari_id INTEGER NOT NULL REFERENCES usuaris(id) ON DELETE CASCADE,
      hash      TEXT NOT NULL UNIQUE,
      nom       TEXT NOT NULL,
      mode      TEXT NOT NULL DEFAULT 'complet' CHECK (mode IN ('lectura','complet')),
      caduca    TEXT NOT NULL,
      usat_el   TEXT
    );
    CREATE TABLE IF NOT EXISTS agent_oauth_codis (
      hash           TEXT PRIMARY KEY,
      client_id      TEXT NOT NULL,
      redirect_uri   TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      usuari_id      INTEGER NOT NULL REFERENCES usuaris(id) ON DELETE CASCADE,
      nom            TEXT NOT NULL,
      mode           TEXT NOT NULL,
      caduca         TEXT NOT NULL,
      usat_el        TEXT
    );
  `);
};
