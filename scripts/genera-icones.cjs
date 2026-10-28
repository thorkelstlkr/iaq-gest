// Genera les icones de l'aplicació a partir de build/icona-original.png (1024 px, cantonades transparents):
// build/icon.png (instal·ladors), les de la safata i el favicon. Ús: npm run icones
const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const arrel = path.join(__dirname, '..');
// [fitxer, mida, sense marge] — a les mides petites es treu el marge transparent perquè la icona ompli l'espai.
const sortides = [
  ['build/icon.png', 1024, false],
  ['build/tray.png', 32, true],
  ['build/tray-mac.png', 22, true],
  ['public/favicon.png', 64, true],
  ['public/apple-touch-icon.png', 180, true],
  ['src/assets/icona.png', 128, true],
];

app.whenReady().then(() => {
  const original = nativeImage.createFromPath(path.join(arrel, 'build', 'icona-original.png'));
  if (original.isEmpty()) throw new Error('No es troba build/icona-original.png');
  const { width } = original.getSize();
  const marge = Math.round(width * 0.06);
  const retallada = original.crop({ x: marge, y: marge, width: width - 2 * marge, height: width - 2 * marge });
  for (const [nom, mida, senseMarge] of sortides) {
    const img = (senseMarge ? retallada : original).resize({ width: mida, height: mida, quality: 'best' });
    fs.writeFileSync(path.join(arrel, nom), img.toPNG());
  }
  console.log('Icones generades.');
  app.quit();
});
