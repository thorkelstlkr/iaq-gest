// Genera les icones de l'aplicació (build/icon.png 1024 px i les de la safata) a partir de public/favicon.svg,
// renderitzant-les amb el mateix Electron. Ús: npm run icones
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const svg = fs.readFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), 'utf8');
const sortides = [
  ['icon.png', 1024],
  ['tray.png', 32],
  ['tray-mac.png', 22],
];

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const dir = path.join(__dirname, '..', 'build');
  fs.mkdirSync(dir, { recursive: true });
  // Es renderitza una sola vegada a 1024 px i se'n fan les mides petites (les finestres minúscules no carreguen).
  const mida = 1024;
  const w = new BrowserWindow({ width: mida, height: mida, show: false, transparent: true, frame: false, useContentSize: true, webPreferences: { offscreen: true } });
  const html = `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${mida}" height="${mida}" `)}</body></html>`;
  await w.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((r) => setTimeout(r, 400));
  const img = await w.webContents.capturePage({ x: 0, y: 0, width: mida, height: mida });
  for (const [nom, m] of sortides) {
    fs.writeFileSync(path.join(dir, nom), img.resize({ width: m, height: m, quality: 'best' }).toPNG());
  }
  w.destroy();
  console.log('Icones generades a build/.');
  app.quit();
});
