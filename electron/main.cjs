// Programa d'escriptori (Electron): arrenca el servidor dins del mateix procés, l'obre en una finestra pròpia
// i deixa una icona al costat del rellotge perquè continuï funcionant (accés remot, agents, còpies diàries)
// encara que es tanqui la finestra.
//
// Opcions de línia d'ordres:
//   --restableix-admin <usuari> <contrasenya>   crea o restableix un administrador i surt (cal accés físic)
//   --amagat                                    arrenca sense mostrar la finestra (inici amb l'ordinador)

const { app, BrowserWindow, Menu, Tray, dialog, nativeImage, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

const NOM = 'IAQ Gest';
app.setName(NOM);
// Fins a la 1.0.0 el programa es deia «I ara qué Gestió»: se'n trasllada la carpeta de dades (o, si no es pot, s'hi continua treballant).
const DIR_USUARI = (() => {
  const nou = path.join(app.getPath('appData'), NOM);
  const antic = path.join(app.getPath('appData'), 'I ara qué Gestió');
  if (fs.existsSync(nou) || !fs.existsSync(antic)) return nou;
  try {
    fs.renameSync(antic, nou);
    return nou;
  } catch {
    return antic;
  }
})();
app.setPath('userData', DIR_USUARI);

const DIR_APP = app.getAppPath();
const DIR_DADES = path.join(app.getPath('userData'), 'dades');
fs.mkdirSync(DIR_DADES, { recursive: true });
if (!process.env.DB_PATH) process.env.DB_PATH = path.join(DIR_DADES, 'iaraque.db');
// El servidor busca la interfície compilada (dist) relativa a la carpeta de treball.
process.chdir(DIR_APP);

const args = process.argv.slice(app.isPackaged ? 1 : 2);
const importa = (...parts) => import(pathToFileURL(path.join(DIR_APP, ...parts)).href);

// ---------- Textos (segons l'idioma del sistema) ----------

const TEXTOS = {
  ca: {
    obre: 'Obre el programa',
    navegador: 'Obre al navegador',
    inici: "Inicia en engegar l'ordinador",
    dades: 'Obre la carpeta de dades',
    surt: 'Surt',
    segueix: "El programa continua funcionant. Per tancar-lo del tot, fes servir «Surt» a la icona del costat del rellotge.",
    error: "No s'ha pogut arrencar el programa",
    restablert: "Accés d'administració",
  },
  es: {
    obre: 'Abrir el programa',
    navegador: 'Abrir en el navegador',
    inici: 'Iniciar al encender el ordenador',
    dades: 'Abrir la carpeta de datos',
    surt: 'Salir',
    segueix: 'El programa sigue funcionando. Para cerrarlo del todo, usa «Salir» en el icono junto al reloj.',
    error: 'No se ha podido arrancar el programa',
    restablert: 'Acceso de administración',
  },
  en: {
    obre: 'Open the program',
    navegador: 'Open in browser',
    inici: 'Start when the computer starts',
    dades: 'Open data folder',
    surt: 'Quit',
    segueix: 'The program keeps running. To close it completely, use “Quit” on the icon next to the clock.',
    error: 'The program could not start',
    restablert: 'Administrator access',
  },
};
let tx = TEXTOS.ca;

// ---------- Recuperació de l'accés d'administració ----------

async function restableixAdmin() {
  const i = args.indexOf('--restableix-admin');
  const [usuari, contrasenya] = args.slice(i + 1);
  const missatges = [];
  const [log, err, exit] = [console.log, console.error, process.exit];
  console.log = (...m) => missatges.push(m.join(' '));
  console.error = console.log;
  let codi = 0;
  process.exit = (c) => {
    codi = c ?? 0;
    throw new Error('sortida');
  };
  process.argv = [process.argv[0], 'restableix-admin', usuari ?? '', contrasenya ?? ''];
  try {
    await importa('scripts', 'restableix-admin.ts');
  } catch (e) {
    if (e.message !== 'sortida') missatges.push(e.message);
  }
  Object.assign(console, { log, error: err });
  process.exit = exit;
  const text = missatges.join('\n') || 'Fet.';
  log(text);
  await dialog.showMessageBox({ type: codi ? 'error' : 'info', title: tx.restablert, message: text });
  app.exit(codi);
}

// ---------- Servidor ----------

const portOcupat = (port) =>
  new Promise((resol) => {
    const s = net.connect({ port, host: '127.0.0.1' });
    s.once('connect', () => {
      s.destroy();
      resol(true);
    });
    s.once('error', () => resol(false));
  });

async function triaPort() {
  if (process.env.PORT) return Number(process.env.PORT);
  for (const p of [3000, 3010, 3020, 3030, 3040]) if (!(await portOcupat(p))) return p;
  return 3050;
}

async function esperaServidor(base) {
  for (let i = 0; i < 200; i++) {
    try {
      const r = await fetch(`${base}/api/auth/estat`);
      if (r.ok) return;
    } catch {
      /* encara no */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('El servidor no respon.');
}

/** La primera vegada que s'obre una versió nova, es fa una còpia de seguretat abans de res. */
async function copiaSiVersioNova() {
  try {
    const { getConfig, setConfig } = await importa('server', 'db.ts');
    const versio = app.getVersion();
    if (getConfig('inicialitzat') && getConfig('versio_escriptori') !== versio) {
      const { ferCopia } = await importa('server', 'copies.ts');
      ferCopia();
    }
    setConfig('versio_escriptori', versio);
  } catch (e) {
    console.error('Còpia en canviar de versió:', e);
  }
}

// ---------- Finestra i icona ----------

let finestra = null;
let safata = null;
let base = '';
let sortint = false;
let avisat = false;

const icona = (nom) => nativeImage.createFromPath(path.join(DIR_APP, 'build', nom));

function creaFinestra(mostra) {
  finestra = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: NOM,
    icon: icona('icon.png'),
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#f7f2ea',
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  finestra.loadURL(base);
  finestra.once('ready-to-show', () => {
    if (mostra) finestra.show();
  });
  // Enllaços externs (webs, xarxes, ajuda en línia) al navegador; les finestres del programa (impressió) dins.
  finestra.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(base) || url === 'about:blank') return { action: 'allow' };
    if (/^(https?|mailto|tel):/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  finestra.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(base)) {
      e.preventDefault();
      if (/^(https?|mailto|tel):/i.test(url)) shell.openExternal(url);
    }
  });
  // Tancar la finestra no atura el programa: queda a la safata.
  finestra.on('close', (e) => {
    if (sortint) return;
    e.preventDefault();
    finestra.hide();
    if (!avisat && process.platform === 'win32' && safata) {
      avisat = true;
      safata.displayBalloon({ title: NOM, content: tx.segueix, iconType: 'info' });
    }
  });
}

function mostra() {
  if (!finestra) creaFinestra(true);
  if (finestra.isMinimized()) finestra.restore();
  finestra.show();
  finestra.focus();
}

// Inici amb l'ordinador: Windows i macOS amb l'API d'Electron; Linux amb un fitxer d'autoarrencada.
const fitxerAutoarrencada = path.join(os.homedir(), '.config', 'autostart', 'i-ara-que-gestio.desktop');
function iniciAutomatic() {
  if (process.platform === 'linux') return fs.existsSync(fitxerAutoarrencada);
  return app.getLoginItemSettings().openAtLogin;
}
function fixaIniciAutomatic(actiu) {
  if (process.platform === 'linux') {
    if (actiu) {
      fs.mkdirSync(path.dirname(fitxerAutoarrencada), { recursive: true });
      const exe = process.env.APPIMAGE || process.execPath;
      fs.writeFileSync(fitxerAutoarrencada, `[Desktop Entry]\nType=Application\nName=${NOM}\nExec="${exe}" --amagat\nX-GNOME-Autostart-enabled=true\n`);
    } else fs.rmSync(fitxerAutoarrencada, { force: true });
    return;
  }
  app.setLoginItemSettings({ openAtLogin: actiu, args: ['--amagat'] });
}

function creaSafata() {
  const img = icona(process.platform === 'darwin' ? 'tray-mac.png' : 'tray.png');
  safata = new Tray(img.isEmpty() ? icona('icon.png').resize({ width: 16, height: 16 }) : img);
  safata.setToolTip(NOM);
  const menu = () =>
    Menu.buildFromTemplate([
      { label: tx.obre, click: mostra },
      { label: tx.navegador, click: () => shell.openExternal(base) },
      { type: 'separator' },
      { label: tx.inici, type: 'checkbox', checked: iniciAutomatic(), click: (item) => fixaIniciAutomatic(item.checked) },
      { label: tx.dades, click: () => shell.openPath(DIR_DADES) },
      { type: 'separator' },
      {
        label: tx.surt,
        click: () => {
          sortint = true;
          app.quit();
        },
      },
    ]);
  safata.setContextMenu(menu());
  safata.on('click', mostra);
  safata.on('right-click', () => safata.setContextMenu(menu()));
}

/** Menú de l'aplicació: al Mac cal per a copiar, enganxar, desfer… */
function creaMenu() {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'editMenu' },
      { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
      { role: 'windowMenu' },
    ]),
  );
}

// ---------- Arrencada ----------

if (args.includes('--restableix-admin')) {
  app.whenReady().then(restableixAdmin);
} else if (!app.requestSingleInstanceLock()) {
  // Ja està obert: l'altra instància mostra la finestra.
  app.quit();
} else {
  app.on('second-instance', mostra);
  app.on('activate', mostra); // macOS: clic a la icona del Dock
  app.on('before-quit', () => {
    sortint = true;
  });
  app.on('window-all-closed', () => {
    /* continua a la safata */
  });

  app.whenReady().then(async () => {
    const idioma = (app.getPreferredSystemLanguages?.()[0] || app.getLocale() || 'ca').slice(0, 2);
    tx = TEXTOS[idioma] ?? TEXTOS.ca;
    creaMenu();
    try {
      const port = await triaPort();
      process.env.PORT = String(port);
      base = `http://127.0.0.1:${port}`;
      await importa('server', 'index.ts');
      await esperaServidor(base);
      await copiaSiVersioNova();
    } catch (e) {
      dialog.showErrorBox(tx.error, String(e?.stack || e));
      app.exit(1);
      return;
    }
    creaSafata();
    creaFinestra(!args.includes('--amagat'));
  });
}
