// Disseny de la web: validació del JSON desat i efecte a la web generada (ordre de blocs, menú, colors, CSS).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bloc, dissenyPerDefecte, normalitzaDisseny, textSobre, urlGoogleFonts } from '../shared/disseny.ts';

test('el disseny incomplet o invàlid es completa amb els valors per defecte', () => {
  const d = normalitzaDisseny({ colors: { principal: 'vermell', fons: '#ffffff' }, fonts: { titols: 'no-existeix' }, inici: 'brossa' }, '#123456');
  assert.equal(d.colors.principal, '#123456'); // el color antic de la web
  assert.equal(d.colors.fons, '#ffffff');
  assert.equal(d.fonts.titols, dissenyPerDefecte().fonts.titols);
  assert.ok(d.inici.some((b) => b.tipus === 'heroi'));
  assert.deepEqual(new Set(d.menu.ordre), new Set(dissenyPerDefecte().menu.ordre));
});

test('cada bloc fix només una vegada; els que falten s’afegeixen amagats', () => {
  const d = normalitzaDisseny({ inici: [bloc('noticies'), bloc('noticies'), bloc('text', { id: 't1', text: 'Hola' }), bloc('text', { id: 't1' })] });
  assert.equal(d.inici.filter((b) => b.tipus === 'noticies').length, 1);
  assert.equal(d.inici.filter((b) => b.tipus === 'text').length, 1);
  assert.equal(d.inici[0].tipus, 'noticies');
  assert.equal(d.inici.find((b) => b.tipus === 'heroi')?.visible, false);
});

test('el CSS propi no pot tancar l’etiqueta <style>', () => {
  const d = normalitzaDisseny({ css: 'body{color:red}</style><script>alert(1)</script>' });
  assert.ok(!/<\/style/i.test(d.css));
});

test('contrast i fonts de Google', () => {
  assert.equal(textSobre('#ffffff'), '#1d1a17');
  assert.equal(textSobre('#111111'), '#ffffff');
  const d = dissenyPerDefecte();
  assert.equal(urlGoogleFonts(d), null); // fonts del sistema
  d.fonts.titols = 'lora';
  assert.match(urlGoogleFonts(d)!, /family=Lora/);
});

test('la web generada segueix l’ordre dels blocs, el menú i els colors del disseny', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'web-disseny-'));
  process.env.DB_PATH = join(dir, 'prova.db');
  const { setConfig, db } = await import('./db.ts');
  const { generaWeb } = await import('./web/generador.ts');
  setConfig('nom', 'Entitat de prova');
  setConfig('email', 'hola@exemple.org');

  const d = dissenyPerDefecte();
  d.colors.principal = '#0a7f5a';
  d.inici = [bloc('text', { id: 'benvinguda', titol: 'Benvinguda especial', text: 'Text **propi**' }), bloc('contacte'), bloc('heroi', { visible: false })];
  d.menu.amagats = ['agenda'];
  d.capcalera.disposicio = 'centrada';
  d.fonts.titols = 'playfair';

  const prev = generaWeb({ previsualitzacio: true, disseny: d });
  const index = String(prev.get('index.html'));
  assert.ok(index.indexOf('Benvinguda especial') < index.indexOf('hola@exemple.org'), 'el bloc de text va abans del de contacte');
  assert.ok(!index.includes('class="heroi'), 'la presentació amagada no surt');
  assert.match(index, /<strong>propi<\/strong>/);
  assert.match(index, /--color: #0a7f5a/);
  assert.match(index, /cap-centrada/);
  assert.match(index, /fonts\.googleapis\.com\/css2\?family=Playfair/);
  assert.ok(!/<nav class="menu"[^>]*>.*agenda\.html/.test(index), "l'agenda no surt al menú");
  assert.ok(prev.has('agenda.html'), "però la pàgina d'agenda es continua generant");

  // En publicar, la web enllaça fonts.css (allotjades a la mateixa web), mai Google.
  setConfig('web_disseny', JSON.stringify(d));
  const pub = generaWeb();
  assert.ok(pub.has('fonts.css'));
  assert.ok(!String(pub.get('index.html')).includes('googleapis'));
  assert.match(String(pub.get('estil.css')), /'Playfair Display'/);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});
