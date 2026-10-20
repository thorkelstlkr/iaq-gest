import { Router } from 'express';
import type { Request } from 'express';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { all, get, getConfig, run, setConfig, tx } from '../db.ts';
import { HttpError, bool, cents, idParam, notFound, text, textObligatori } from '../util.ts';
import type { Config } from '../../shared/types.ts';
import { marcaCanvisWeb } from '../web/publica.ts';
import { esIdioma } from '../i18n.ts';
import { registra } from '../auditoria.ts';
import { usuariDe } from './auth.ts';
import {
  CLAU_CARPETA_EXTERNA, ambFitxerPujat, cancellaRestauracio, copiaA, estatCopies, ferCopia, prefixCopies,
  preparaRestauracio, provaCarpetaExterna, rutaCopia, verificaFitxer, detectaCarpetesNuvol, usaCarpetaNuvol,
} from '../copies.ts';

export const configRouter = Router();

const CLAUS: (keyof Config)[] = [
  'nom', 'nom_complet', 'lema', 'nif', 'num_registre', 'adreca', 'poblacio', 'codi_postal', 'email', 'telefon', 'web', 'iban', 'logo',
  'idioma', 'llicencia_acceptada_el', 'llicencia_acceptada_per',
];
/** Data i hora ISO 8601 (p. ex. 2026-10-20T09:30:00.000Z) de l'acceptació de la llicència. */
const DATA_HORA_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const LOGO_RE = /^data:image\/(jpeg|png|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

/** Registra quines claus de configuració s'han canviat (mai els valors). */
function auditaConfig(req: Request, claus: string[], entitat = 'config') {
  if (claus.length) registra(req, 'configura', entitat, null, `Claus canviades: ${claus.join(', ')}`);
}

function llegirConfig(): Config {
  return Object.fromEntries(CLAUS.map((k) => [k, getConfig(k) ?? ''])) as unknown as Config;
}

configRouter.get('/', (_req, res) => {
  res.json(llegirConfig());
});

configRouter.put('/', (req, res) => {
  textObligatori(req.body.nom, 'Nom');
  if (req.body.idioma && !esIdioma(req.body.idioma)) throw new HttpError(400, 'Idioma no vàlid.');
  const acceptada = text(req.body.llicencia_acceptada_el);
  if (acceptada && (!DATA_HORA_RE.test(acceptada) || Number.isNaN(Date.parse(acceptada))))
    throw new HttpError(400, "La data d'acceptació de la llicència no és vàlida.");
  const logo = text(req.body.logo);
  if (logo && (!LOGO_RE.test(logo) || logo.length > 400_000)) throw new HttpError(400, 'El logotip no és una imatge vàlida o és massa gran.');
  const canviades: string[] = [];
  for (const k of CLAUS) {
    if (!(k in req.body)) continue;
    const valor = text(req.body[k]) ?? '';
    if ((getConfig(k) ?? '') !== valor) canviades.push(k);
    setConfig(k, valor);
  }
  auditaConfig(req, canviades);
  marcaCanvisWeb();
  res.json(llegirConfig());
});

// ---------- Finalitats estatutàries ----------

configRouter.get('/finalitats', (_req, res) => {
  res.json(all('SELECT codi, curt, text FROM finalitats ORDER BY ordre, codi'));
});

/** Substitueix la llista sencera (l'ordre de l'array és l'ordre de presentació). */
configRouter.put('/finalitats', (req, res) => {
  const llista: unknown[] = Array.isArray(req.body) ? req.body : [];
  const netes = llista.map((f, i) => {
    const o = (f ?? {}) as Record<string, unknown>;
    const codi = (text(o.codi) ?? '').toLowerCase();
    if (!/^[a-z0-9]{1,3}$/.test(codi)) throw new HttpError(400, `Finalitat ${i + 1}: el codi ha de ser una lletra o un número curt.`);
    return { codi, curt: textObligatori(o.curt, `Nom curt de la finalitat ${codi})`), text: text(o.text) ?? '', ordre: i };
  });
  if (new Set(netes.map((f) => f.codi)).size !== netes.length) throw new HttpError(400, 'Hi ha codis de finalitat repetits.');
  tx(() => {
    run('DELETE FROM finalitats');
    for (const f of netes) run('INSERT INTO finalitats (codi, curt, text, ordre) VALUES ($codi, $curt, $text, $ordre)', f);
  });
  auditaConfig(req, ['finalitats'], 'finalitats');
  marcaCanvisWeb();
  res.json(all('SELECT codi, curt, text FROM finalitats ORDER BY ordre, codi'));
});

// ---------- Plantilla del carnet de soci ----------
// Imatges de fons (anvers i revers) sobre les quals s'imprimeixen les dades del soci.

const PLANTILLA_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

configRouter.get('/carnet', (_req, res) => {
  res.json({ anvers: getConfig('carnet_anvers') || null, revers: getConfig('carnet_revers') || null });
});

configRouter.put('/carnet', (req, res) => {
  const canviades: string[] = [];
  for (const cara of ['anvers', 'revers'] as const) {
    if (!(cara in req.body)) continue;
    const img = text(req.body[cara]);
    if (img && (!PLANTILLA_RE.test(img) || img.length > 1_800_000))
      throw new HttpError(400, `La plantilla (${cara}) no és una imatge vàlida o és massa gran.`);
    setConfig(`carnet_${cara}`, img ?? '');
    canviades.push(`carnet_${cara}`);
  }
  auditaConfig(req, canviades);
  res.json({ anvers: getConfig('carnet_anvers') || null, revers: getConfig('carnet_revers') || null });
});

// ---------- Tipus de quota ----------

configRouter.get('/tipus-quota', (_req, res) => {
  res.json(all('SELECT * FROM tipus_quota ORDER BY actiu DESC, nom'));
});

configRouter.post('/tipus-quota', (req, res) => {
  const nom = textObligatori(req.body.nom, 'Nom');
  const { id } = run(
    'INSERT INTO tipus_quota (nom, import_cents, descripcio, actiu) VALUES (?, ?, ?, 1)',
    nom, cents(req.body.import_cents, 'Import'), text(req.body.descripcio),
  );
  registra(req, 'configura', 'tipus_quota', id, `Tipus de quota creat: ${nom}`);
  marcaCanvisWeb();
  res.status(201).json(get('SELECT * FROM tipus_quota WHERE id = ?', id));
});

configRouter.put('/tipus-quota/:id', (req, res) => {
  const id = idParam(req);
  const nom = textObligatori(req.body.nom, 'Nom');
  const { changes } = run(
    'UPDATE tipus_quota SET nom = ?, import_cents = ?, descripcio = ?, actiu = ? WHERE id = ?',
    nom, cents(req.body.import_cents, 'Import'), text(req.body.descripcio),
    bool(req.body.actiu ?? 1), id,
  );
  if (!changes) notFound();
  registra(req, 'configura', 'tipus_quota', id, `Tipus de quota modificat: ${nom}`);
  marcaCanvisWeb();
  res.json(get('SELECT * FROM tipus_quota WHERE id = ?', id));
});

configRouter.delete('/tipus-quota/:id', (req, res) => {
  const id = idParam(req);
  const { changes } = run('DELETE FROM tipus_quota WHERE id = ?', id);
  if (!changes) notFound();
  registra(req, 'configura', 'tipus_quota', id, 'Tipus de quota eliminat');
  marcaCanvisWeb();
  res.status(204).end();
});

// ---------- Còpia de seguretat ----------
// Totes aquestes rutes són només per a qui té accés a la configuració (vegeu server/index.ts).

const marcaHora = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/** Descàrrega d'una còpia feta en aquest moment. */
configRouter.get('/copia-seguretat', (req, res) => {
  const nom = `${prefixCopies()}-${marcaHora()}.db`;
  const desti = join(tmpdir(), nom);
  copiaA(desti);
  registra(req, 'descarrega', 'copia_seguretat', null, nom);
  res.download(desti, nom, () => rmSync(desti, { force: true }));
});

configRouter.get('/copia-seguretat/estat', (_req, res) => {
  res.json(estatCopies());
});

configRouter.post('/copia-seguretat/ara', (req, res) => {
  const r = ferCopia();
  registra(req, 'exporta', 'copia_seguretat', null, `Còpia de seguretat feta manualment: ${r.nom}`);
  res.json({ ...r, estat: estatCopies() });
});

configRouter.get('/copia-seguretat/copies/:nom', (req, res) => {
  const nom = String(req.params.nom);
  const ruta = rutaCopia(nom);
  registra(req, 'descarrega', 'copia_seguretat', null, nom);
  res.download(ruta, nom);
});

configRouter.post('/copia-seguretat/copies/:nom/verifica', (req, res) => {
  res.json(verificaFitxer(rutaCopia(String(req.params.nom))));
});

configRouter.put('/copia-seguretat/carpeta-externa', (req, res) => {
  const carpeta = text(req.body.carpeta);
  if (carpeta) provaCarpetaExterna(carpeta);
  setConfig(CLAU_CARPETA_EXTERNA, carpeta ?? '');
  setConfig('copia_externa_error', '');
  auditaConfig(req, [CLAU_CARPETA_EXTERNA]);
  res.json(estatCopies());
});

/** Carpetes de Google Drive, OneDrive o Dropbox sincronitzades en aquest ordinador. */
configRouter.get('/copia-seguretat/carpetes-nuvol', (_req, res) => {
  res.json(detectaCarpetesNuvol());
});

/** Desa les còpies a una carpeta del núvol detectada (hi crea una subcarpeta per a l'entitat). */
configRouter.post('/copia-seguretat/carpeta-nuvol', (req, res) => {
  const carpeta = usaCarpetaNuvol(textObligatori(req.body.arrel, 'Carpeta'));
  registra(req, 'configura', 'copia_seguretat', null, `Carpeta externa al núvol: ${carpeta}`);
  res.json({ carpeta });
});

configRouter.post('/copia-seguretat/carpeta-externa/prova', (req, res) => {
  provaCarpetaExterna(textObligatori(req.body.carpeta, 'Carpeta'));
  res.json({ ok: true });
});

const MAX_PUJADA_MB = 500;

/**
 * Fitxer pujat: cos binari (application/octet-stream; express.json no el llegeix, així no
 * topa amb el seu límit) o JSON { fitxer: "<base64 o data URI>" } per a fitxers petits.
 */
async function fitxerPujat(req: Request): Promise<Buffer> {
  const cos = req.body as { fitxer?: unknown } | Buffer | undefined;
  if (Buffer.isBuffer(cos)) return cos;
  if (cos && typeof cos.fitxer === 'string') return Buffer.from(cos.fitxer.replace(/^data:[^,]*,/, ''), 'base64');
  const parts: Buffer[] = [];
  let total = 0;
  for await (const tros of req as unknown as AsyncIterable<Buffer>) {
    total += tros.length;
    if (total > MAX_PUJADA_MB * 1024 * 1024) throw new HttpError(413, `El fitxer o les dades són massa grans (màxim ${MAX_PUJADA_MB} MB).`);
    parts.push(tros);
  }
  return Buffer.concat(parts);
}

function nomesAdmin(req: Request) {
  if (usuariDe(req)?.rol !== 'admin') throw new HttpError(403, 'Només un administrador pot restaurar còpies de seguretat.');
}

/** Comprova una còpia (sense restaurar-la) i dona el nombre de registres de les taules principals. */
configRouter.post('/copia-seguretat/verifica', async (req, res) => {
  const bytes = await fitxerPujat(req);
  res.json(ambFitxerPujat(bytes, (ruta) => verificaFitxer(ruta)));
});

/** Valida la còpia i la deixa preparada: es restaurarà en reiniciar el programa. */
configRouter.post('/copia-seguretat/restaura', async (req, res) => {
  nomesAdmin(req);
  const bytes = await fitxerPujat(req);
  const resultat = preparaRestauracio(bytes);
  registra(
    req, 'restaura', 'copia_seguretat', null,
    `Còpia pujada per restaurar (${resultat.entitat ?? '?'}, ${Math.round(bytes.length / 1024)} kB). S'aplicarà en reiniciar el programa.`,
  );
  res.json({ ...resultat, estat: estatCopies() });
});

configRouter.delete('/copia-seguretat/restaura', (req, res) => {
  nomesAdmin(req);
  cancellaRestauracio();
  registra(req, 'restaura', 'copia_seguretat', null, 'Restauració pendent cancel·lada');
  res.json(estatCopies());
});
