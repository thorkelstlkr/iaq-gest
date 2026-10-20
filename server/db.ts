import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { OBJECTIUS } from '../shared/objectius.ts';
import { ESQUEMES } from './esquema/index.ts';
import { desxifra, esSecret, migraSecretsUnCop, xifra } from './secrets.ts';

// Les proves automàtiques (node --test) mai no poden obrir la base de dades real.
if (process.env.NODE_TEST_CONTEXT && !process.env.DB_PATH) {
  throw new Error('Les proves han de fixar DB_PATH a una carpeta temporal abans d’importar server/db.ts.');
}

export const DB_PATH = resolve(process.env.DB_PATH ?? 'data/iaraque.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

// Restauració pendent (Configuració → Còpia de seguretat): abans d'obrir la base de dades,
// l'actual (i els seus fitxers -wal/-shm) es reanomena com a «.abans-restaurar-<data>» i la
// còpia validada n'ocupa el lloc. Es deixa una marca perquè el servidor ho registri.
{
  const pendent = join(dirname(DB_PATH), 'restaura-pendent.db');
  if (existsSync(pendent)) {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const marca = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    const anterior = `${DB_PATH}.abans-restaurar-${marca}`;
    try {
      if (existsSync(DB_PATH)) renameSync(DB_PATH, anterior);
      // Els fitxers auxiliars segueixen el nom de la base de dades perquè SQLite els trobi si s'obre.
      for (const sufix of ['-wal', '-shm']) if (existsSync(DB_PATH + sufix)) renameSync(DB_PATH + sufix, anterior + sufix);
      renameSync(pendent, DB_PATH);
      writeFileSync(join(dirname(DB_PATH), 'restauracio-feta.json'), JSON.stringify({ el: d.toISOString(), anterior: basename(anterior) }));
      console.log(`S'ha restaurat la còpia de seguretat. La base de dades anterior s'ha desat com a ${anterior}`);
    } catch (e) {
      console.error("ERROR: no s'ha pogut aplicar la restauració pendent:", e);
    }
  }
}

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS config (
  clau  TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tipus_quota (
  id           INTEGER PRIMARY KEY,
  nom          TEXT NOT NULL,
  import_cents INTEGER NOT NULL DEFAULT 0 CHECK (import_cents >= 0),
  descripcio   TEXT,
  actiu        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS socis (
  id                 INTEGER PRIMARY KEY,
  num_soci           INTEGER NOT NULL UNIQUE,
  nom                TEXT NOT NULL,
  llinatges          TEXT NOT NULL DEFAULT '',
  dni                TEXT,
  data_naixement     TEXT,
  genere             TEXT CHECK (genere IN ('dona','home','altre','nc')),
  adreca             TEXT,
  codi_postal        TEXT,
  poblacio           TEXT,
  telefon            TEXT,
  email              TEXT,
  data_alta          TEXT NOT NULL,
  data_baixa         TEXT,
  motiu_baixa        TEXT,
  tipus_quota_id     INTEGER REFERENCES tipus_quota(id),
  iban               TEXT,
  tutor_legal        TEXT,
  consentiment_dades INTEGER NOT NULL DEFAULT 0,
  drets_imatge       INTEGER NOT NULL DEFAULT 0,
  notes              TEXT,
  creat_el           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS socis_fotos (
  soci_id INTEGER PRIMARY KEY REFERENCES socis(id) ON DELETE CASCADE,
  foto    TEXT NOT NULL  -- data URI (JPEG reduït a la interfície)
);

CREATE TABLE IF NOT EXISTS comptes (
  id                  INTEGER PRIMARY KEY,
  nom                 TEXT NOT NULL,
  saldo_inicial_cents INTEGER NOT NULL DEFAULT 0,
  actiu               INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
  id    INTEGER PRIMARY KEY,
  nom   TEXT NOT NULL,
  tipus TEXT NOT NULL CHECK (tipus IN ('ingres','despesa')),
  actiu INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS activitats (
  id           INTEGER PRIMARY KEY,
  nom          TEXT NOT NULL,
  data_inici   TEXT NOT NULL,
  data_fi      TEXT,
  lloc         TEXT,
  descripcio   TEXT,
  objectius    TEXT NOT NULL DEFAULT '',
  participants INTEGER,
  notes        TEXT
);

CREATE TABLE IF NOT EXISTS moviments (
  id              INTEGER PRIMARY KEY,
  data            TEXT NOT NULL,
  tipus           TEXT NOT NULL CHECK (tipus IN ('ingres','despesa','traspas')),
  import_cents    INTEGER NOT NULL CHECK (import_cents > 0),
  concepte        TEXT NOT NULL,
  categoria_id    INTEGER REFERENCES categories(id),
  compte_id       INTEGER NOT NULL REFERENCES comptes(id),
  compte_desti_id INTEGER REFERENCES comptes(id),
  activitat_id    INTEGER REFERENCES activitats(id) ON DELETE SET NULL,
  soci_id         INTEGER REFERENCES socis(id) ON DELETE SET NULL,
  justificant     TEXT,
  notes           TEXT,
  creat_el        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS moviments_data ON moviments(data);

CREATE TABLE IF NOT EXISTS quotes (
  id            INTEGER PRIMARY KEY,
  soci_id       INTEGER NOT NULL REFERENCES socis(id) ON DELETE CASCADE,
  exercici      INTEGER NOT NULL,
  import_cents  INTEGER NOT NULL DEFAULT 0,
  estat         TEXT NOT NULL DEFAULT 'pendent' CHECK (estat IN ('pendent','pagada','exempta')),
  data_pagament TEXT,
  moviment_id   INTEGER REFERENCES moviments(id) ON DELETE SET NULL,
  UNIQUE (soci_id, exercici)
);

-- Finalitats estatutàries de l'entitat (editables a Configuració).
CREATE TABLE IF NOT EXISTS finalitats (
  codi  TEXT PRIMARY KEY,
  curt  TEXT NOT NULL,
  text  TEXT NOT NULL DEFAULT '',
  ordre INTEGER NOT NULL DEFAULT 0
);

-- ---------- Usuaris i sessions ----------

CREATE TABLE IF NOT EXISTS usuaris (
  id       INTEGER PRIMARY KEY,
  nom      TEXT NOT NULL,
  usuari   TEXT NOT NULL UNIQUE COLLATE NOCASE,
  hash     TEXT NOT NULL,          -- scrypt, format "sal:hash" en hexadecimal
  rol      TEXT NOT NULL DEFAULT 'admin' CHECK (rol IN ('admin','junta','tresoreria','comunicacio')),
  actiu    INTEGER NOT NULL DEFAULT 1,
  creat_el TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token     TEXT PRIMARY KEY,
  usuari_id INTEGER NOT NULL REFERENCES usuaris(id) ON DELETE CASCADE,
  caduca    TEXT NOT NULL
);

-- ---------- CRM ----------

CREATE TABLE IF NOT EXISTS etiquetes (
  id    INTEGER PRIMARY KEY,
  nom   TEXT NOT NULL UNIQUE COLLATE NOCASE,
  color TEXT NOT NULL DEFAULT '#56662c'
);

CREATE TABLE IF NOT EXISTS socis_etiquetes (
  soci_id     INTEGER NOT NULL REFERENCES socis(id) ON DELETE CASCADE,
  etiqueta_id INTEGER NOT NULL REFERENCES etiquetes(id) ON DELETE CASCADE,
  PRIMARY KEY (soci_id, etiqueta_id)
);

-- Historial de contactes amb cada soci (trucades, correus, reunions, notes…).
CREATE TABLE IF NOT EXISTS interaccions (
  id       INTEGER PRIMARY KEY,
  soci_id  INTEGER NOT NULL REFERENCES socis(id) ON DELETE CASCADE,
  data     TEXT NOT NULL,
  tipus    TEXT NOT NULL CHECK (tipus IN ('trucada','correu','reunio','missatge','nota')),
  resum    TEXT NOT NULL,
  autor    TEXT,
  creat_el TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS interaccions_soci ON interaccions(soci_id, data);

CREATE TABLE IF NOT EXISTS tasques (
  id         INTEGER PRIMARY KEY,
  titol      TEXT NOT NULL,
  data_limit TEXT,
  soci_id    INTEGER REFERENCES socis(id) ON DELETE CASCADE,
  feta       INTEGER NOT NULL DEFAULT 0,
  feta_el    TEXT,
  notes      TEXT,
  creat_el   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Persones interessades que encara no són sòcies.
CREATE TABLE IF NOT EXISTS interessats (
  id        INTEGER PRIMARY KEY,
  nom       TEXT NOT NULL,
  llinatges TEXT NOT NULL DEFAULT '',
  telefon   TEXT,
  email     TEXT,
  origen    TEXT,
  interessos TEXT,
  estat     TEXT NOT NULL DEFAULT 'nou' CHECK (estat IN ('nou','contactat','convertit','descartat')),
  soci_id   INTEGER REFERENCES socis(id) ON DELETE SET NULL,
  notes     TEXT,
  data      TEXT NOT NULL DEFAULT (date('now', 'localtime'))
);

-- Inscripció i assistència dels socis a les activitats.
CREATE TABLE IF NOT EXISTS participacions (
  activitat_id INTEGER NOT NULL REFERENCES activitats(id) ON DELETE CASCADE,
  soci_id      INTEGER NOT NULL REFERENCES socis(id) ON DELETE CASCADE,
  assistit     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (activitat_id, soci_id)
);

-- ---------- Web pública ----------

CREATE TABLE IF NOT EXISTS web_noticies (
  id           INTEGER PRIMARY KEY,
  titol        TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  data         TEXT NOT NULL,
  resum        TEXT,
  contingut    TEXT NOT NULL DEFAULT '',   -- text amb format senzill (Markdown)
  imatge       TEXT,                       -- data URI
  activitat_id INTEGER REFERENCES activitats(id) ON DELETE SET NULL,
  publicada    INTEGER NOT NULL DEFAULT 1,
  creat_el     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS web_pagines (
  id        INTEGER PRIMARY KEY,
  titol     TEXT NOT NULL,
  slug      TEXT NOT NULL UNIQUE,
  contingut TEXT NOT NULL DEFAULT '',
  ordre     INTEGER NOT NULL DEFAULT 0,
  publicada INTEGER NOT NULL DEFAULT 1
);

-- ---------- Protecció de dades (RGPD / LOPDGDD) ----------

-- Registre d'operacions sobre dades personals: qui, quan i què.
CREATE TABLE IF NOT EXISTS auditoria (
  id        INTEGER PRIMARY KEY,
  data      TEXT NOT NULL DEFAULT (datetime('now')),
  usuari    TEXT,
  accio     TEXT NOT NULL,
  entitat   TEXT NOT NULL,
  entitat_id INTEGER,
  detall    TEXT
);
CREATE INDEX IF NOT EXISTS auditoria_data ON auditoria(data);

-- Sol·licituds d'exercici de drets (accés, rectificació, supressió…). Termini legal: un mes.
CREATE TABLE IF NOT EXISTS drets_rgpd (
  id              INTEGER PRIMARY KEY,
  soci_id         INTEGER REFERENCES socis(id) ON DELETE SET NULL,
  sollicitant     TEXT NOT NULL,
  tipus           TEXT NOT NULL CHECK (tipus IN ('acces','rectificacio','supressio','oposicio','limitacio','portabilitat','retirada_consentiment')),
  data_sollicitud TEXT NOT NULL,
  data_limit      TEXT NOT NULL,
  estat           TEXT NOT NULL DEFAULT 'pendent' CHECK (estat IN ('pendent','resolta','denegada')),
  data_resolucio  TEXT,
  notes           TEXT,
  creat_el        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Facturació (RD 1619/2012 i sistema VERI*FACTU, RD 1007/2023) ----------

CREATE TABLE IF NOT EXISTS clients (
  id          INTEGER PRIMARY KEY,
  nom         TEXT NOT NULL,
  nif         TEXT,
  adreca      TEXT,
  codi_postal TEXT,
  poblacio    TEXT,
  pais        TEXT NOT NULL DEFAULT 'ES',
  email       TEXT,
  soci_id     INTEGER REFERENCES socis(id) ON DELETE SET NULL,
  creat_el    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS series_factura (
  id          INTEGER PRIMARY KEY,
  codi        TEXT NOT NULL UNIQUE,
  descripcio  TEXT NOT NULL,
  tipus       TEXT NOT NULL CHECK (tipus IN ('ordinaria','simplificada','rectificativa')),
  actiu       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS factures (
  id                     INTEGER PRIMARY KEY,
  serie_id               INTEGER NOT NULL REFERENCES series_factura(id),
  numero                 INTEGER,              -- NULL mentre és esborrany
  num_serie              TEXT UNIQUE,          -- sèrie + número, p. ex. «A2026-0001»
  tipus_factura          TEXT NOT NULL CHECK (tipus_factura IN ('F1','F2','R1','R4','R5')),
  tipus_rectificativa    TEXT CHECK (tipus_rectificativa IN ('I','S')),
  factura_rectificada_id INTEGER REFERENCES factures(id),
  motiu_rectificacio     TEXT,
  data_expedicio         TEXT,
  data_operacio          TEXT,
  client_id              INTEGER REFERENCES clients(id),
  -- Còpia de les dades del destinatari en el moment d'emetre (la factura no pot canviar després).
  dest_nom               TEXT,
  dest_nif               TEXT,
  dest_adreca            TEXT,
  descripcio_operacio    TEXT NOT NULL DEFAULT '',
  observacions           TEXT,
  base_cents             INTEGER NOT NULL DEFAULT 0,
  quota_cents            INTEGER NOT NULL DEFAULT 0,
  total_cents            INTEGER NOT NULL DEFAULT 0,
  estat                  TEXT NOT NULL DEFAULT 'esborrany' CHECK (estat IN ('esborrany','emesa','anullada')),
  cobrada_el             TEXT,
  moviment_id            INTEGER REFERENCES moviments(id) ON DELETE SET NULL,
  emesa_per              TEXT,
  creat_el               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS factura_linies (
  id             INTEGER PRIMARY KEY,
  factura_id     INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  ordre          INTEGER NOT NULL DEFAULT 0,
  concepte       TEXT NOT NULL,
  quantitat      REAL NOT NULL DEFAULT 1,
  preu_cents     INTEGER NOT NULL,             -- preu unitari sense IVA
  descompte      REAL NOT NULL DEFAULT 0,      -- percentatge
  qualificacio   TEXT NOT NULL DEFAULT 'S1',   -- S1 subjecta, E1-E6 exempta, N1-N2 no subjecta
  tipus_iva      REAL NOT NULL DEFAULT 21,
  causa_exempcio TEXT
);

-- Registres de facturació encadenats (alta i anul·lació). No es poden modificar ni esborrar.
CREATE TABLE IF NOT EXISTS registres_facturacio (
  id              INTEGER PRIMARY KEY,
  tipus           TEXT NOT NULL CHECK (tipus IN ('alta','anulacio')),
  factura_id      INTEGER NOT NULL REFERENCES factures(id),
  nif_emissor     TEXT NOT NULL,
  num_serie       TEXT NOT NULL,
  data_expedicio  TEXT NOT NULL,               -- DD-MM-AAAA
  tipus_factura   TEXT,
  quota_total     TEXT,
  import_total    TEXT,
  huella_anterior TEXT NOT NULL DEFAULT '',
  data_hora_gen   TEXT NOT NULL,               -- AAAA-MM-DDThh:mm:ss+hh:mm
  huella          TEXT NOT NULL,
  xml             TEXT NOT NULL,
  -- Estat de la remissió a l'AEAT (aquests camps sí que s'actualitzen).
  estat_aeat      TEXT NOT NULL DEFAULT 'pendent' CHECK (estat_aeat IN ('pendent','correcte','acceptat_errors','incorrecte','no_aplica')),
  csv_aeat        TEXT,
  error_aeat      TEXT,
  enviat_el       TEXT,
  creat_el        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS registres_no_esborrar BEFORE DELETE ON registres_facturacio
BEGIN SELECT RAISE(ABORT, 'Els registres de facturació no es poden esborrar.'); END;

CREATE TRIGGER IF NOT EXISTS registres_no_modificar
BEFORE UPDATE OF tipus, factura_id, nif_emissor, num_serie, data_expedicio, tipus_factura, quota_total, import_total,
                 huella_anterior, data_hora_gen, huella, xml ON registres_facturacio
BEGIN SELECT RAISE(ABORT, 'Els registres de facturació no es poden modificar.'); END;

CREATE TRIGGER IF NOT EXISTS factures_no_esborrar BEFORE DELETE ON factures WHEN OLD.estat <> 'esborrany'
BEGIN SELECT RAISE(ABORT, 'Una factura emesa no es pot esborrar: cal anul·lar-la o fer-ne una de rectificativa.'); END;

CREATE TRIGGER IF NOT EXISTS factures_no_modificar
BEFORE UPDATE OF serie_id, numero, num_serie, tipus_factura, tipus_rectificativa, factura_rectificada_id, motiu_rectificacio,
                 data_expedicio, data_operacio, client_id, dest_nom, dest_nif, dest_adreca, descripcio_operacio,
                 observacions, base_cents, quota_cents, total_cents ON factures WHEN OLD.estat <> 'esborrany'
BEGIN SELECT RAISE(ABORT, 'Una factura emesa no es pot modificar: cal fer-ne una de rectificativa.'); END;

CREATE TRIGGER IF NOT EXISTS linies_no_afegir BEFORE INSERT ON factura_linies
WHEN (SELECT estat FROM factures WHERE id = NEW.factura_id) <> 'esborrany'
BEGIN SELECT RAISE(ABORT, 'Una factura emesa no es pot modificar.'); END;

CREATE TRIGGER IF NOT EXISTS linies_no_modificar BEFORE UPDATE ON factura_linies
WHEN (SELECT estat FROM factures WHERE id = OLD.factura_id) <> 'esborrany'
BEGIN SELECT RAISE(ABORT, 'Una factura emesa no es pot modificar.'); END;

CREATE TRIGGER IF NOT EXISTS linies_no_esborrar BEFORE DELETE ON factura_linies
WHEN (SELECT estat FROM factures WHERE id = OLD.factura_id) <> 'esborrany'
BEGIN SELECT RAISE(ABORT, 'Una factura emesa no es pot modificar.'); END;

-- ---------- Xarxes socials ----------

-- Publicació preparada al programa (un sol text i imatge, adaptats a cada xarxa).
CREATE TABLE IF NOT EXISTS xarxes_publicacions (
  id           INTEGER PRIMARY KEY,
  text         TEXT NOT NULL,
  enllac       TEXT,
  imatge       TEXT,                 -- data URI
  activitat_id INTEGER REFERENCES activitats(id) ON DELETE SET NULL,
  noticia_id   INTEGER REFERENCES web_noticies(id) ON DELETE SET NULL,
  autor        TEXT,
  creat_el     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- On s'ha publicat cada publicació (per l'API o a mà des de la xarxa).
CREATE TABLE IF NOT EXISTS xarxes_enviaments (
  id             INTEGER PRIMARY KEY,
  publicacio_id  INTEGER NOT NULL REFERENCES xarxes_publicacions(id) ON DELETE CASCADE,
  xarxa          TEXT NOT NULL CHECK (xarxa IN ('instagram','facebook','x','tiktok','youtube')),
  estat          TEXT NOT NULL CHECK (estat IN ('publicada','error')),
  metode         TEXT NOT NULL CHECK (metode IN ('api','manual')),
  url            TEXT,
  error          TEXT,
  autor          TEXT,
  data           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comunicacions (
  id           INTEGER PRIMARY KEY,
  data         TEXT NOT NULL DEFAULT (datetime('now')),
  assumpte     TEXT NOT NULL,
  cos          TEXT NOT NULL,
  segment      TEXT NOT NULL,
  destinataris INTEGER NOT NULL,
  enviats      INTEGER NOT NULL DEFAULT 0,
  metode       TEXT NOT NULL CHECK (metode IN ('correu','manual')),
  autor        TEXT
);
`);

// ---------- Migracions d'esquema ----------

/** Afegeix una columna a una taula existent si encara no hi és. */
function afegeixColumna(taula: string, columna: string, definicio: string) {
  const cols = db.prepare(`PRAGMA table_info(${taula})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === columna)) db.exec(`ALTER TABLE ${taula} ADD COLUMN ${columna} ${definicio}`);
}

afegeixColumna('activitats', 'web_publica', 'INTEGER NOT NULL DEFAULT 1');
// Protecció de dades: data i signant del consentiment, comunicacions i anonimització.
afegeixColumna('socis', 'consentiment_data', 'TEXT');
afegeixColumna('socis', 'consentiment_signant', "TEXT CHECK (consentiment_signant IN ('soci','tutor'))");
afegeixColumna('socis', 'accepta_comunicacions', 'INTEGER NOT NULL DEFAULT 1');
afegeixColumna('socis', 'anonimitzat_el', 'TEXT');
afegeixColumna('interessats', 'consentiment', 'INTEGER NOT NULL DEFAULT 0');
afegeixColumna('activitats', 'imatge', 'TEXT');
afegeixColumna('usuaris', 'idioma', 'TEXT'); // preferència d'idioma (si és buida, la de l'entitat)

// Taules i columnes de cada mòdul (server/esquema/).
for (const esquema of ESQUEMES) esquema(db, afegeixColumna);

// Els perfils d'usuari van passar de admin/editor a admin/junta/tresoreria/comunicacio (octubre 2026).
// SQLite no permet canviar un CHECK: es recrea la taula conservant-ne les dades.
{
  const def = (db.prepare("SELECT sql FROM sqlite_master WHERE name = 'usuaris'").get() as { sql: string }).sql;
  if (def.includes("'editor'")) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN;
      CREATE TABLE usuaris_nou (
        id       INTEGER PRIMARY KEY,
        nom      TEXT NOT NULL,
        usuari   TEXT NOT NULL UNIQUE COLLATE NOCASE,
        hash     TEXT NOT NULL,
        rol      TEXT NOT NULL DEFAULT 'admin' CHECK (rol IN ('admin','junta','tresoreria','comunicacio')),
        actiu    INTEGER NOT NULL DEFAULT 1,
        creat_el TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO usuaris_nou SELECT id, nom, usuari, hash, CASE rol WHEN 'editor' THEN 'junta' ELSE rol END, actiu, creat_el FROM usuaris;
      DROP TABLE usuaris;
      ALTER TABLE usuaris_nou RENAME TO usuaris;
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }
}

type Row = Record<string, unknown>;

export const all = <T = Row>(sql: string, ...params: any[]) =>
  db.prepare(sql).all(...params) as T[];
export const get = <T = Row>(sql: string, ...params: any[]) =>
  db.prepare(sql).get(...params) as T | undefined;
export const run = (sql: string, ...params: any[]) => {
  const r = db.prepare(sql).run(...params);
  return { id: Number(r.lastInsertRowid), changes: Number(r.changes) };
};

export function tx<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function getConfig(clau: string): string | null {
  // Secrets (contrasenyes, certificat, testimonis): es guarden xifrats amb la clau de server/secrets.ts.
  migraSecretsUnCop(
    () => all<{ clau: string; valor: string }>('SELECT clau, valor FROM config'),
    (k, v) => run('UPDATE config SET valor = ? WHERE clau = ?', v, k),
  );
  const valor = get<{ valor: string }>('SELECT valor FROM config WHERE clau = ?', clau)?.valor ?? null;
  return valor !== null && esSecret(clau) ? desxifra(valor) : valor;
}

export function setConfig(clau: string, valor: string) {
  const desat = esSecret(clau) ? xifra(valor) : valor;
  run('INSERT INTO config (clau, valor) VALUES (?, ?) ON CONFLICT(clau) DO UPDATE SET valor = excluded.valor', clau, desat);
}

const installacioExistent = Boolean(getConfig('inicialitzat'));

// Dades inicials: només s'insereixen la primera vegada. Les dades de l'entitat
// (nom, finalitats, logotip…) les demana l'assistent inicial de la interfície.
if (!installacioExistent) {
  tx(() => {
    const defaults: Record<string, string> = {
      nom: '',
      nom_complet: '',
      nif: '',
      num_registre: '',
      adreca: '',
      email: '',
      telefon: '',
      iban: '',
    };
    for (const [k, v] of Object.entries(defaults)) setConfig(k, v);

    const quotes: [string, number, string][] = [
      ['General', 2000, 'Persones adultes'],
      ['Jove (fins a 25 anys)', 1000, 'Quota reduïda per a joves'],
      ['Gent gran (65 anys o més)', 1000, 'Quota reduïda per a gent gran'],
      ['Infant (menys de 14 anys)', 0, 'Exempts de quota'],
      ['Familiar', 3500, 'Unitat familiar'],
    ];
    for (const q of quotes) run('INSERT INTO tipus_quota (nom, import_cents, descripcio) VALUES (?, ?, ?)', ...q);

    run("INSERT INTO comptes (nom) VALUES ('Caixa (efectiu)')");
    run("INSERT INTO comptes (nom) VALUES ('Compte bancari')");

    const ingressos = [
      'Quotes de socis',
      'Subvencions públiques',
      'Donacions',
      'Patrocinis i col·laboracions',
      'Vendes i inscripcions a activitats',
      'Altres ingressos',
    ];
    const despeses = [
      'Activitats i tallers',
      'Material i subministraments',
      'Publicacions i impremta',
      'Lloguers',
      'Assegurances',
      'Serveis professionals',
      'Comissions bancàries',
      'Desplaçaments',
      'Arxiu i documentació',
      'Altres despeses',
    ];
    for (const nom of ingressos) {
      const { id } = run("INSERT INTO categories (nom, tipus) VALUES (?, 'ingres')", nom);
      if (nom === 'Quotes de socis') setConfig('categoria_quotes', String(id));
    }
    for (const nom of despeses) run("INSERT INTO categories (nom, tipus) VALUES (?, 'despesa')", nom);

    setConfig('inicialitzat', new Date().toISOString());
  });
}

// Correcció del nom de l'entitat a les bases de dades creades abans d'octubre de 2026.
for (const clau of ['nom', 'nom_complet']) {
  const valor = getConfig(clau);
  if (valor?.includes('I Ara Que?')) setConfig(clau, valor.replaceAll('I Ara Que?', 'I ara qué?'));
}

// Sèries de facturació per defecte.
if (get<{ n: number }>('SELECT COUNT(*) AS n FROM series_factura')!.n === 0) {
  run("INSERT INTO series_factura (codi, descripcio, tipus) VALUES ('A', 'Factures ordinàries', 'ordinaria')");
  run("INSERT INTO series_factura (codi, descripcio, tipus) VALUES ('S', 'Factures simplificades (tiquets)', 'simplificada')");
  run("INSERT INTO series_factura (codi, descripcio, tipus) VALUES ('R', 'Factures rectificatives', 'rectificativa')");
}

// Les instal·lacions anteriors a l'edició de finalitats tenien fixades les de I ara qué?.
if (!getConfig('finalitats_migrades')) {
  tx(() => {
    const buida = get<{ n: number }>('SELECT COUNT(*) AS n FROM finalitats')!.n === 0;
    if (installacioExistent && buida) {
      OBJECTIUS.forEach((o, i) =>
        run('INSERT INTO finalitats (codi, curt, text, ordre) VALUES (?, ?, ?, ?)', o.codi, o.curt, o.text, i),
      );
      setConfig('lema', 'Cultura i tradició de Pollença');
      setConfig('poblacio', 'Pollença');
      setConfig('codi_postal', '07460');
    }
    setConfig('finalitats_migrades', '1');
  });
}
