import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { all, get, run, setConfig, tx } from '../db.ts';
import { HttpError, bool, idParam, notFound, text, textObligatori } from '../util.ts';
import { ROLS, pot } from '../../shared/permisos.ts';
import { esIdioma } from '../i18n.ts';
import { getConfig } from '../db.ts';
import type { Modul, Rol } from '../../shared/permisos.ts';
import { registra, registraSistema } from '../auditoria.ts';
import { versioApp } from '../copies.ts';

export const authRouter = Router();
export const usuarisRouter = Router();

const DIES_SESSIO = 30;
const COOKIE = 'sessio';

export interface Usuari {
  id: number;
  nom: string;
  usuari: string;
  rol: Rol;
}

// ---------- Contrasenyes ----------

export function hashContrasenya(contrasenya: string): string {
  const sal = randomBytes(16);
  return `${sal.toString('hex')}:${scryptSync(contrasenya, sal, 64).toString('hex')}`;
}

function comprova(contrasenya: string, desat: string): boolean {
  const [sal, hash] = desat.split(':');
  const esperat = Buffer.from(hash, 'hex');
  const calculat = scryptSync(contrasenya, Buffer.from(sal, 'hex'), esperat.length);
  return timingSafeEqual(esperat, calculat);
}

function validaContrasenya(v: unknown): string {
  const c = typeof v === 'string' ? v : '';
  if (c.length < 8) throw new HttpError(400, 'La contrasenya ha de tenir almenys 8 caràcters.');
  return c;
}

// ---------- Bloqueig després d'intents fallits ----------
// En memòria (es reinicia en reiniciar el programa): per nom d'usuari i per adreça IP.

export const MAX_INTENTS = 5;
/** Per IP el llindar és més alt: en un sol ordinador totes les peticions venen de 127.0.0.1. */
export const MAX_INTENTS_IP = 10;
export const MINUTS_BLOQUEIG = 15;
const intents = new Map<string, { n: number; fins: number }>();

const claus = (usuari: string, ip: string) => [`u:${usuari.toLowerCase()}`, `ip:${ip}`];

/** Minuts que falten perquè es desbloquegi (0 si no està bloquejat). */
export function minutsBloqueig(usuari: string, ip: string, ara = Date.now()): number {
  let fins = 0;
  for (const k of claus(usuari, ip)) {
    const e = intents.get(k);
    if (e && e.n >= (k.startsWith('ip:') ? MAX_INTENTS_IP : MAX_INTENTS) && e.fins > ara) fins = Math.max(fins, e.fins);
  }
  return fins ? Math.ceil((fins - ara) / 60_000) : 0;
}

export function registraIntentFallit(usuari: string, ip: string, ara = Date.now()) {
  for (const k of claus(usuari, ip)) {
    const e = intents.get(k);
    // Els intents compten dins d'una finestra de 15 minuts des del darrer.
    const n = e && e.fins > ara ? e.n + 1 : 1;
    intents.set(k, { n, fins: ara + MINUTS_BLOQUEIG * 60_000 });
  }
}

export function esborraIntents(usuari: string, ip: string) {
  for (const k of claus(usuari, ip)) intents.delete(k);
}

export const reiniciaBloquejos = () => intents.clear();

const ipDe = (req: Request) => req.ip ?? req.socket?.remoteAddress ?? '?';

// ---------- Sessions ----------

function llegeixCookie(req: Request): string | null {
  const capcalera = req.headers.cookie ?? '';
  for (const part of capcalera.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
}

function obreSessio(res: Response, usuariId: number) {
  const token = randomBytes(32).toString('hex');
  const caduca = new Date(Date.now() + DIES_SESSIO * 86400_000).toISOString();
  run('DELETE FROM sessions WHERE caduca < ?', new Date().toISOString());
  run('INSERT INTO sessions (token, usuari_id, caduca) VALUES (?, ?, ?)', token, usuariId, caduca);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DIES_SESSIO * 86400}`,
  );
}

/** Tanca totes les sessions d'un usuari (excepte, si s'indica, la de la petició actual). */
export function tancaSessions(usuariId: number, excepteReq?: Request) {
  const actual = excepteReq ? llegeixCookie(excepteReq) : null;
  run('DELETE FROM sessions WHERE usuari_id = ? AND token IS NOT ?', usuariId, actual);
}

export function usuariDeLaPeticio(req: Request): Usuari | null {
  const token = llegeixCookie(req);
  if (!token) return null;
  return (
    get<Usuari>(
      `SELECT u.id, u.nom, u.usuari, u.rol, u.idioma FROM sessions s JOIN usuaris u ON u.id = s.usuari_id
        WHERE s.token = ? AND s.caduca > ? AND u.actiu = 1`,
      token, new Date().toISOString(),
    ) ?? null
  );
}

/** Protegeix totes les rutes de l'API excepte les d'inici de sessió. */
export function requereixSessio(req: Request, res: Response, next: NextFunction) {
  const usuari = usuariDeLaPeticio(req);
  if (!usuari) {
    res.status(401).json({ error: 'Cal iniciar sessió.' });
    return;
  }
  (req as unknown as { usuari: Usuari }).usuari = usuari;
  next();
}

/**
 * Limita una part de l'API als perfils que tenen accés al mòdul. Els perfils de «lectura»
 * hi poden fer consultes (GET) però no modificar res.
 */
export function permet(modul: Modul, lectura: Modul[] | 'tothom' = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rol = usuariDe(req)?.rol;
    const potLlegir = lectura === 'tothom' ? Boolean(rol) : lectura.some((m) => pot(rol, m));
    if (pot(rol, modul) || (req.method === 'GET' && potLlegir)) return next();
    res.status(403).json({ error: 'El teu perfil no té accés a aquesta part del programa.' });
  };
}

/** Usuari autenticat de la petició (el posa requereixSessio). */
export const usuariDe = (req: Request): Usuari | undefined => (req as unknown as { usuari?: Usuari }).usuari;

/** Nom de l'usuari que fa la petició (per registrar qui ha fet cada cosa). */
export const autor = (req: Request) => usuariDe(req)?.nom ?? null;

const hiHaUsuaris = () => get<{ n: number }>('SELECT COUNT(*) AS n FROM usuaris')!.n > 0;

// ---------- Rutes públiques ----------

authRouter.get('/estat', (req, res) => {
  res.json({ configurat: hiHaUsuaris(), usuari: usuariDeLaPeticio(req), idioma: getConfig('idioma') || null, versio: versioApp() });
});

/** Només funciona mentre no hi ha cap usuari: crea l'administrador inicial. */
authRouter.post('/primer-usuari', (req, res) => {
  if (hiHaUsuaris()) throw new HttpError(409, 'Ja hi ha usuaris creats.');
  const entitat = text(req.body.entitat);
  const id = tx(() => {
    if (entitat) setConfig('nom', entitat);
    const entitatCompleta = text(req.body.entitat_completa);
    if (entitatCompleta) setConfig('nom_complet', entitatCompleta);
    return run(
      "INSERT INTO usuaris (nom, usuari, hash, rol) VALUES (?, ?, ?, 'admin')",
      textObligatori(req.body.nom, 'Nom'),
      textObligatori(req.body.usuari, 'Usuari'),
      hashContrasenya(validaContrasenya(req.body.contrasenya)),
    ).id;
  });
  obreSessio(res, id);
  registraSistema(String(req.body.nom).trim(), 'crea', 'usuari', id, `Usuari inicial (administració): ${String(req.body.usuari).trim()}`);
  res.status(201).json(get('SELECT id, nom, usuari, rol FROM usuaris WHERE id = ?', id));
});

authRouter.post('/entrar', async (req, res) => {
  const nomUsuari = String(req.body.usuari ?? '').trim();
  const ip = ipDe(req);
  const bloqueig = minutsBloqueig(nomUsuari, ip);
  if (bloqueig) throw new HttpError(429, `Massa intents fallits. Torna-ho a provar d'aquí a ${bloqueig} minuts.`);
  const u = get<Usuari & { hash: string }>(
    'SELECT id, nom, usuari, rol, hash FROM usuaris WHERE usuari = ? AND actiu = 1',
    nomUsuari,
  );
  const contrasenya = String(req.body.contrasenya ?? '');
  if (!u || !comprova(contrasenya, u.hash)) {
    registraIntentFallit(nomUsuari, ip);
    registraSistema(nomUsuari.slice(0, 60) || '?', 'entrada_fallida', 'sessio', u?.id ?? null, `Intent d'entrada fallit des de ${ip}`);
    await new Promise((r) => setTimeout(r, 800)); // frena els intents a cegues
    throw new HttpError(401, "L'usuari o la contrasenya no són correctes.");
  }
  esborraIntents(nomUsuari, ip);
  obreSessio(res, u.id);
  registraSistema(u.nom, 'entra', 'sessio', u.id, `Entrada des de ${ip}`);
  res.json({ id: u.id, nom: u.nom, usuari: u.usuari, rol: u.rol });
});

authRouter.post('/sortir', (req, res) => {
  const token = llegeixCookie(req);
  if (token) run('DELETE FROM sessions WHERE token = ?', token);
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
  res.status(204).end();
});

// ---------- Gestió d'usuaris (requereix sessió) ----------

function nomesAdmin(req: Request) {
  if (usuariDe(req)?.rol !== 'admin')
    throw new HttpError(403, 'Només un administrador pot gestionar usuaris.');
}

function rolValid(v: unknown): Rol {
  if (!ROLS.includes(v as Rol)) throw new HttpError(400, 'Perfil no vàlid.');
  return v as Rol;
}

/** Idioma preferit de l'usuari (buit = el de l'entitat). */
usuarisRouter.put('/jo/idioma', (req, res) => {
  const idioma = req.body.idioma;
  if (idioma !== null && idioma !== '' && !esIdioma(idioma)) throw new HttpError(400, 'Idioma no vàlid.');
  run('UPDATE usuaris SET idioma = ? WHERE id = ?', idioma || null, usuariDe(req)!.id);
  res.status(204).end();
});

usuarisRouter.put('/jo/contrasenya', (req, res) => {
  const jo = usuariDe(req)!;
  const u = get<{ hash: string }>('SELECT hash FROM usuaris WHERE id = ?', jo.id)!;
  if (!comprova(String(req.body.actual ?? ''), u.hash)) throw new HttpError(400, 'La contrasenya actual no és correcta.');
  run('UPDATE usuaris SET hash = ? WHERE id = ?', hashContrasenya(validaContrasenya(req.body.nova)), jo.id);
  tancaSessions(jo.id, req); // es tanquen les sessions obertes en altres navegadors
  registra(req, 'contrasenya', 'usuari', jo.id, 'Canvi de la pròpia contrasenya');
  res.status(204).end();
});

usuarisRouter.get('/', (req, res) => {
  nomesAdmin(req);
  res.json(all('SELECT id, nom, usuari, rol, actiu FROM usuaris ORDER BY nom'));
});

usuarisRouter.post('/', (req, res) => {
  nomesAdmin(req);
  const rol = rolValid(req.body.rol);
  const { id } = run(
    'INSERT INTO usuaris (nom, usuari, hash, rol) VALUES (?, ?, ?, ?)',
    textObligatori(req.body.nom, 'Nom'), textObligatori(req.body.usuari, 'Usuari'),
    hashContrasenya(validaContrasenya(req.body.contrasenya)), rol,
  );
  registra(req, 'crea', 'usuari', id, `Usuari ${String(req.body.usuari).trim()} (perfil ${rol})`);
  res.status(201).json(get('SELECT id, nom, usuari, rol, actiu FROM usuaris WHERE id = ?', id));
});

usuarisRouter.put('/:id', (req, res) => {
  nomesAdmin(req);
  const id = idParam(req);
  const jo = usuariDe(req)!;
  const actiu = bool(req.body.actiu ?? 1);
  const rol = rolValid(req.body.rol);
  if (id === jo.id && (!actiu || rol !== 'admin'))
    throw new HttpError(400, 'No et pots desactivar ni treure els permisos a tu mateix.');
  const abans = get<{ nom: string; usuari: string; rol: string; actiu: number }>('SELECT nom, usuari, rol, actiu FROM usuaris WHERE id = ?', id);
  if (!abans) notFound();
  const nova = text(req.body.contrasenya);
  const hash = nova ? hashContrasenya(validaContrasenya(nova)) : null;
  const nom = textObligatori(req.body.nom, 'Nom');
  tx(() => {
    run('UPDATE usuaris SET nom = ?, rol = ?, actiu = ? WHERE id = ?', nom, rol, actiu, id);
    if (hash) run('UPDATE usuaris SET hash = ? WHERE id = ?', hash, id);
    // Contrasenya canviada o usuari desactivat: es tanquen les seves sessions (excepte la pròpia actual).
    if (hash || !actiu) tancaSessions(id, id === jo.id ? req : undefined);
  });
  const canvis = [
    nom !== abans.nom && 'nom',
    rol !== abans.rol && `perfil ${abans.rol} → ${rol}`,
    actiu !== abans.actiu && (actiu ? 'reactivat' : 'desactivat'),
  ].filter(Boolean);
  if (canvis.length) registra(req, 'modifica', 'usuari', id, `Usuari ${abans.usuari}: ${canvis.join(', ')}`);
  if (hash) registra(req, 'contrasenya', 'usuari', id, `Contrasenya de ${abans.usuari} restablerta per l'administració`);
  res.json(get('SELECT id, nom, usuari, rol, actiu FROM usuaris WHERE id = ?', id));
});

usuarisRouter.delete('/:id', (req, res) => {
  nomesAdmin(req);
  const id = idParam(req);
  if (id === usuariDe(req)?.id) throw new HttpError(400, 'No et pots eliminar a tu mateix.');
  const abans = get<{ usuari: string }>('SELECT usuari FROM usuaris WHERE id = ?', id);
  const { changes } = run('DELETE FROM usuaris WHERE id = ?', id);
  if (!changes) notFound();
  registra(req, 'elimina', 'usuari', id, `Usuari ${abans?.usuari ?? id}`);
  res.status(204).end();
});
