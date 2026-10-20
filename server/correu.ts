import { Router } from 'express';
import nodemailer from 'nodemailer';
import { getConfig, setConfig } from './db.ts';
import { HttpError, bool, enter, text, textObligatori } from './util.ts';
import { registra } from './auditoria.ts';

// Configuració SMTP (servidor de correu de la web o Gmail amb contrasenya d'aplicació).

export const correuRouter = Router();

const CLAUS = ['smtp_host', 'smtp_port', 'smtp_segur', 'smtp_usuari', 'smtp_remitent'] as const;

function llegirConfig() {
  return {
    smtp_host: getConfig('smtp_host') ?? '',
    smtp_port: getConfig('smtp_port') ?? '465',
    smtp_segur: getConfig('smtp_segur') ?? '1',
    smtp_usuari: getConfig('smtp_usuari') ?? '',
    smtp_remitent: getConfig('smtp_remitent') ?? '',
    te_contrasenya: Boolean(getConfig('smtp_contrasenya')),
  };
}

export const correuConfigurat = () =>
  Boolean(getConfig('smtp_host') && getConfig('smtp_usuari') && getConfig('smtp_contrasenya'));

function transportador() {
  if (!correuConfigurat()) throw new HttpError(400, "Encara no s'ha configurat el correu (Configuració → Correu).");
  return nodemailer.createTransport({
    host: getConfig('smtp_host')!,
    port: Number(getConfig('smtp_port') || 465),
    secure: getConfig('smtp_segur') !== '0',
    auth: { user: getConfig('smtp_usuari')!, pass: getConfig('smtp_contrasenya')! },
  });
}

export interface Missatge {
  a: string;
  assumpte: string;
  text: string;
}

/** Envia els missatges d'un en un (cada soci rep el seu, sense veure els altres destinataris). */
export async function enviaCorreus(missatges: Missatge[]) {
  const t = transportador();
  const remitent = getConfig('smtp_remitent') || getConfig('smtp_usuari')!;
  const resultats: { a: string; ok: boolean; error?: string }[] = [];
  for (const m of missatges) {
    try {
      await t.sendMail({ from: remitent, to: m.a, subject: m.assumpte, text: m.text });
      resultats.push({ a: m.a, ok: true });
    } catch (e) {
      resultats.push({ a: m.a, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  t.close();
  return resultats;
}

correuRouter.get('/', (_req, res) => {
  res.json(llegirConfig());
});

correuRouter.put('/', (req, res) => {
  for (const k of CLAUS) {
    if (!(k in req.body)) continue;
    if (k === 'smtp_port') {
      const p = enter(req.body.smtp_port, 'Port');
      if (!p || p < 1 || p > 65535) throw new HttpError(400, 'El port no és vàlid.');
      setConfig(k, String(p));
    } else if (k === 'smtp_segur') {
      setConfig(k, String(bool(req.body.smtp_segur)));
    } else {
      setConfig(k, text(req.body[k]) ?? '');
    }
  }
  // La contrasenya només es canvia si se n'envia una de nova (mai es torna a la interfície).
  const contrasenya = text(req.body.smtp_contrasenya);
  if (contrasenya) setConfig('smtp_contrasenya', contrasenya);
  if (req.body.esborra_contrasenya) setConfig('smtp_contrasenya', '');
  registra(req, 'configura', 'correu', null, `Claus canviades: ${Object.keys(req.body ?? {}).join(', ')}`); // només els noms, mai els valors
  res.json(llegirConfig());
});

correuRouter.post('/prova', async (req, res) => {
  const a = textObligatori(req.body.a, 'Destinatari');
  const [r] = await enviaCorreus([
    {
      a,
      assumpte: 'Prova de correu · I ara qué?',
      text: "Aquest és un missatge de prova enviat des del programa de gestió de l'associació. Si el reps, el correu està ben configurat.",
    },
  ]);
  if (!r.ok) throw new HttpError(502, `No s'ha pogut enviar: ${r.error}`);
  res.json({ ok: true });
});
