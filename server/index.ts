import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DB_PATH, getConfig } from './db.ts';
import { errorHandler, traduccioErrors } from './util.ts';
import { socisRouter } from './routes/socis.ts';
import { quotesRouter } from './routes/quotes.ts';
import { comptabilitatRouter } from './routes/comptabilitat.ts';
import { activitatsRouter } from './routes/activitats.ts';
import { informesRouter } from './routes/informes.ts';
import { configRouter } from './routes/config.ts';
import { authRouter, permet, requereixSessio, usuarisRouter } from './routes/auth.ts';
import { webRouter } from './routes/web.ts';
import { rgpdRouter } from './routes/rgpd.ts';
import { facturacioRouter } from './routes/facturacio.ts';
import { xarxesRouter } from './routes/xarxes.ts';
import { crmRouter } from './routes/crm.ts';
import { correuRouter } from './correu.ts';
import { governancaRouter } from './routes/governanca.ts';
import { tresoreriaRouter } from './routes/tresoreria.ts';
import { avisosRouter } from './avisos/index.ts';
import { calendariRouter } from './calendari.ts';
import { ajudaRouter } from './routes/ajuda.ts';
import { accesRemotRouter, fixaEscolta } from './routes/accesRemot.ts';
import { oauthRouter } from './agent/oauth.ts';
import { aplicaServidorAgents } from './agent/servidor-agents.ts';
import { agentConnexioRouter, agentRouter } from './routes/agent.ts';
import { fixaPortIntern } from './agent/intern.ts';
import { CAPCALERA_ORIGEN, ambOrigen } from './agent/context.ts';
import { comunitatRouter } from './routes/comunitat.ts';
import { subvencionsRouter } from './routes/subvencions.ts';
import { fiscalRouter } from './routes/fiscal.ts';
import { donatiusRouter } from './routes/donatius.ts';
import { iniciaCopiesAutomatiques } from './copies.ts';

const app = express();
app.disable('x-powered-by');
// Capçaleres de seguretat. La CSP no restringeix scripts ni estils: la previsualització de la web
// (iframe srcdoc amb sandbox) hereta la política i en fa servir d'incrustats.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'; base-uri 'self'; object-src 'none'");
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use(traduccioErrors);
// Origen de cada petició (persona o agent d'IA), per a les regles que ho tenen en compte.
app.use((req, _res, next) => ambOrigen(req.headers[CAPCALERA_ORIGEN] === 'agent', next)); // les fotos dels socis viatgen en base64

// Inici de sessió (públic); la resta de l'API exigeix una sessió vàlida.
app.use('/api/auth', authRouter);
// OAuth per als connectors al núvol (Claude.ai, ChatGPT…): /.well-known/… i /oauth/….
app.use(oauthRouter);
// Agents d'IA personals: entren amb la seva clau i només poden fer servir les eines (server/agent/).
app.use('/api/agent-ia', agentConnexioRouter);
app.use('/api', requereixSessio);

// Cada part de l'API només és accessible als perfils que hi tenen accés (shared/permisos.ts).
app.use('/api/usuaris', usuarisRouter); // cadascú pot canviar la seva contrasenya; la resta, només admin
app.use('/api/crm', permet('socis'));
app.use('/api/crm', crmRouter);
app.use('/api/socis', permet('socis', ['economia']), socisRouter);
app.use('/api/quotes', permet('economia'), quotesRouter);
app.use('/api/comptabilitat', permet('economia'), comptabilitatRouter);
app.use('/api/activitats', permet('activitats', ['economia', 'informes']), activitatsRouter);
app.use('/api/informes', permet('informes'), informesRouter);
app.use('/api/web', permet('web'), webRouter);
app.use('/api/xarxes', permet('web'), xarxesRouter);
app.use('/api/rgpd', permet('socis'), rgpdRouter);
app.use('/api/facturacio', permet('economia'), facturacioRouter);
app.use('/api/governanca', permet('socis', ['informes']), governancaRouter); // assemblees, junta, actes, certificats
app.use('/api/tresoreria', permet('economia'), tresoreriaRouter); // pressupost, remeses SEPA, fiscalitat, tancament
app.use('/api/comunitat', permet('socis', ['activitats', 'informes']), comunitatRouter); // voluntariat i col·laboradors
app.use('/api/subvencions', permet('economia', ['informes']), subvencionsRouter); // subvencions i justificants
app.use('/api/fiscal', permet('economia'), fiscalRouter); // tercers, retencions i extractes bancaris
app.use('/api/donatius', permet('economia', ['informes']), donatiusRouter); // donatius, certificats i model 182
app.use('/api/calendari', permet('informes', ['socis']), calendariRouter); // calendari d'obligacions legals i fiscals
app.use('/api/agent', agentRouter); // claus, propostes i activitat de l'agent de cada persona
app.use('/api/ajuda', ajudaRouter); // informació del programa (tothom)
app.use('/api/avisos', avisosRouter); // cada avís es filtra segons el perfil
app.use('/api/config/correu', permet('config'), correuRouter);
app.use('/api/config/copia-seguretat', permet('config'));
app.use('/api/config/acces-remot', permet('config'), accesRemotRouter);
app.use('/api/config', permet('config', 'tothom'), configRouter);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta no trobada.' });
});

// En producció, el mateix servidor serveix la interfície compilada.
const dist = resolve('dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}

app.use(errorHandler);

// Per defecte només accessible des d'aquest ordinador. Posa HOST=0.0.0.0 per obrir-la a la xarxa local.
// L'accés des d'altres equips (xarxa local o Tailscale) s'activa a Configuració → Accés remot,
// o amb la variable HOST (que mana sobre la configuració). Cal reiniciar el programa perquè s'apliqui.
const HOST = process.env.HOST ?? (getConfig('acces_xarxa') === '1' ? '0.0.0.0' : '127.0.0.1');
const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, HOST, () => {
  console.log(`${getConfig('nom') || 'Gestió de l’associació'}  →  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Base de dades: ${DB_PATH}`);
  fixaPortIntern(PORT);
  fixaEscolta(HOST, PORT);
  void aplicaServidorAgents(); // port separat per als agents d'IA, si està activat
  iniciaCopiesAutomatiques(); // còpia diària a <carpeta de la BD>/copies (i a la carpeta externa, si n'hi ha)
});
