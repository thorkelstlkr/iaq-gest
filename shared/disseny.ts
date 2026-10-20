// Disseny de la web pública: colors, tipografies, capçalera, peu, portada per blocs i menú.
// Es desa com a JSON a config.web_disseny i el fan servir tant el generador (servidor) com l'editor (interfície).

export type IdTipusBloc = 'heroi' | 'activitats' | 'noticies' | 'finalitats' | 'soci' | 'contacte' | 'xarxes' | 'text';
export type FonsBloc = 'normal' | 'suau' | 'color';

export interface BlocInici {
  /** Identificador estable (els blocs de text poden ser més d'un). */
  id: string;
  tipus: IdTipusBloc;
  visible: boolean;
  /** Títol propi; buit = el títol per defecte del bloc. */
  titol: string;
  /** Només blocs de text: contingut en Markdown. */
  text: string;
  /** Activitats i notícies: quants se'n mostren. */
  quantitat: number;
  fons: FonsBloc;
}

export type IdMenu = 'inici' | 'agenda' | 'noticies' | 'qui-som' | 'pagines' | 'soci' | 'contacte';

export interface Disseny {
  tema: string;
  colors: {
    principal: string;
    fons: string;
    superficie: string;
    text: string;
    apagat: string;
    vora: string;
    /** Buit = automàtic (segons la disposició de la capçalera). */
    capcalera_fons: string;
    capcalera_text: string;
    peu_fons: string;
    peu_text: string;
  };
  fonts: { titols: string; text: string; mida: 'petita' | 'normal' | 'gran' };
  forma: { cantonades: 'rectes' | 'suaus' | 'arrodonides'; botons: 'pindola' | 'rectangle' | 'contorn'; ombres: boolean };
  capcalera: {
    disposicio: 'esquerra' | 'centrada' | 'plegada';
    fixa: boolean;
    mostra_nom: boolean;
    mida_logo: 'petit' | 'mitja' | 'gran';
    forma_logo: 'original' | 'rodona' | 'quadrada';
    menu_majuscules: boolean;
  };
  heroi: {
    alcada: 'baixa' | 'mitjana' | 'alta';
    alineacio: 'esquerra' | 'centre';
    /** Enfosquiment de la imatge de fons, 0–80 %. */
    enfosquiment: number;
    botons: boolean;
  };
  peu: { text: string; mostra_contacte: boolean; mostra_xarxes: boolean; mostra_legal: boolean; alineacio: 'columnes' | 'centrat' };
  targetes: { columnes: 2 | 3 | 4; estil: 'imatge' | 'compacta' };
  inici: BlocInici[];
  menu: { ordre: IdMenu[]; amagats: IdMenu[] };
  css: string;
}

// ---------- Tipografies ----------

export interface Font {
  id: string;
  nom: string;
  /** Pila CSS completa, amb alternatives per si la font no carrega. */
  familia: string;
  /** Família a Google Fonts (es descarrega i s'allotja a la mateixa web en publicar). */
  google?: string;
  tipus: 'serif' | 'sans' | 'display';
}

export const FONTS: Font[] = [
  { id: 'sistema-serif', nom: 'Clàssica del sistema', familia: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif", tipus: 'serif' },
  { id: 'sistema-sans', nom: 'Moderna del sistema', familia: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", tipus: 'sans' },
  { id: 'lora', nom: 'Lora', familia: "'Lora', Georgia, serif", google: 'Lora:ital,wght@0,400;0,600;0,700;1,400', tipus: 'serif' },
  { id: 'merriweather', nom: 'Merriweather', familia: "'Merriweather', Georgia, serif", google: 'Merriweather:ital,wght@0,400;0,700;1,400', tipus: 'serif' },
  { id: 'playfair', nom: 'Playfair Display', familia: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:ital,wght@0,400;0,600;0,700;1,400', tipus: 'display' },
  { id: 'garamond', nom: 'EB Garamond', familia: "'EB Garamond', Garamond, Georgia, serif", google: 'EB+Garamond:ital,wght@0,400;0,600;1,400', tipus: 'serif' },
  { id: 'baskerville', nom: 'Libre Baskerville', familia: "'Libre Baskerville', Baskerville, Georgia, serif", google: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400', tipus: 'serif' },
  { id: 'roboto-slab', nom: 'Roboto Slab', familia: "'Roboto Slab', Rockwell, Georgia, serif", google: 'Roboto+Slab:wght@400;600;700', tipus: 'serif' },
  { id: 'inter', nom: 'Inter', familia: "'Inter', system-ui, sans-serif", google: 'Inter:wght@400;500;600;700', tipus: 'sans' },
  { id: 'open-sans', nom: 'Open Sans', familia: "'Open Sans', system-ui, sans-serif", google: 'Open+Sans:ital,wght@0,400;0,600;0,700;1,400', tipus: 'sans' },
  { id: 'lato', nom: 'Lato', familia: "'Lato', system-ui, sans-serif", google: 'Lato:ital,wght@0,400;0,700;1,400', tipus: 'sans' },
  { id: 'nunito', nom: 'Nunito', familia: "'Nunito', system-ui, sans-serif", google: 'Nunito:ital,wght@0,400;0,600;0,700;1,400', tipus: 'sans' },
  { id: 'montserrat', nom: 'Montserrat', familia: "'Montserrat', system-ui, sans-serif", google: 'Montserrat:ital,wght@0,400;0,600;0,700;1,400', tipus: 'sans' },
  { id: 'source-sans', nom: 'Source Sans 3', familia: "'Source Sans 3', system-ui, sans-serif", google: 'Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400', tipus: 'sans' },
  { id: 'oswald', nom: 'Oswald', familia: "'Oswald', Impact, sans-serif", google: 'Oswald:wght@400;500;600', tipus: 'display' },
  { id: 'caveat', nom: 'Caveat (manuscrita)', familia: "'Caveat', 'Segoe Print', cursive", google: 'Caveat:wght@500;700', tipus: 'display' },
];

export const font = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];

/** URL de Google Fonts per a les fonts triades (només per a la previsualització; en publicar s'allotgen a la web). */
export function urlGoogleFonts(d: Disseny): string | null {
  const families = [...new Set([font(d.fonts.titols), font(d.fonts.text)].map((f) => f.google).filter(Boolean))];
  return families.length ? `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap` : null;
}

// ---------- Blocs i menú ----------

export const TIPUS_BLOCS: IdTipusBloc[] = ['heroi', 'activitats', 'noticies', 'finalitats', 'soci', 'contacte', 'xarxes', 'text'];
export const MENU_DEFECTE: IdMenu[] = ['inici', 'agenda', 'noticies', 'qui-som', 'pagines', 'soci', 'contacte'];

export const bloc = (tipus: IdTipusBloc, extra: Partial<BlocInici> = {}): BlocInici => ({
  id: tipus === 'text' ? `text-${Math.random().toString(36).slice(2, 8)}` : tipus,
  tipus,
  visible: true,
  titol: '',
  text: '',
  quantitat: 3,
  fons: tipus === 'finalitats' ? 'color' : tipus === 'soci' ? 'suau' : 'normal',
  ...extra,
});

const BLOCS_DEFECTE = (): BlocInici[] => [
  bloc('heroi'),
  bloc('activitats'),
  bloc('noticies'),
  bloc('finalitats'),
  bloc('soci', { visible: false }),
  bloc('contacte', { visible: false }),
  bloc('xarxes', { visible: false }),
];

// ---------- Temes ----------

type Tema = { id: string; nom: string } & Pick<Disseny, 'colors' | 'fonts' | 'forma'>;

const colorsBase = { capcalera_fons: '', capcalera_text: '', peu_fons: '', peu_text: '' };

export const TEMES: Tema[] = [
  {
    id: 'terracota',
    nom: 'Terracota',
    colors: { principal: '#9a3b25', fons: '#fbf8f3', superficie: '#ffffff', text: '#2a2420', apagat: '#6f655d', vora: '#e7dfd4', ...colorsBase, peu_fons: '#2a2420', peu_text: '#e9e1d6' },
    fonts: { titols: 'sistema-serif', text: 'sistema-sans', mida: 'normal' },
    forma: { cantonades: 'suaus', botons: 'pindola', ombres: false },
  },
  {
    id: 'mediterrani',
    nom: 'Mediterrani',
    colors: { principal: '#1f5f8b', fons: '#f5f9fc', superficie: '#ffffff', text: '#1b2733', apagat: '#5b6b7a', vora: '#d8e3ec', ...colorsBase, peu_fons: '#12344d', peu_text: '#dde8f1' },
    fonts: { titols: 'playfair', text: 'source-sans', mida: 'normal' },
    forma: { cantonades: 'arrodonides', botons: 'pindola', ombres: true },
  },
  {
    id: 'oliva',
    nom: 'Oliva i pedra',
    colors: { principal: '#56662c', fons: '#f7f6f0', superficie: '#ffffff', text: '#262a1d', apagat: '#666a5a', vora: '#e1e0d3', ...colorsBase, peu_fons: '#30381a', peu_text: '#e8ead8' },
    fonts: { titols: 'lora', text: 'lato', mida: 'normal' },
    forma: { cantonades: 'suaus', botons: 'rectangle', ombres: false },
  },
  {
    id: 'festa',
    nom: 'Festa major',
    colors: { principal: '#c0392b', fons: '#fffaf0', superficie: '#ffffff', text: '#2b1d16', apagat: '#7a6355', vora: '#f0e1cb', ...colorsBase, capcalera_fons: '#c0392b', capcalera_text: '#ffffff', peu_fons: '#f4b400', peu_text: '#2b1d16' },
    fonts: { titols: 'oswald', text: 'nunito', mida: 'gran' },
    forma: { cantonades: 'arrodonides', botons: 'pindola', ombres: true },
  },
  {
    id: 'arxiu',
    nom: 'Arxiu antic',
    colors: { principal: '#7b5a3c', fons: '#f4efe4', superficie: '#fbf8f1', text: '#2e261d', apagat: '#6e6152', vora: '#ddd2bf', ...colorsBase, peu_fons: '#3a2f24', peu_text: '#eadfcc' },
    fonts: { titols: 'garamond', text: 'garamond', mida: 'gran' },
    forma: { cantonades: 'rectes', botons: 'contorn', ombres: false },
  },
  {
    id: 'minimal',
    nom: 'Minimal',
    colors: { principal: '#111111', fons: '#ffffff', superficie: '#ffffff', text: '#111111', apagat: '#666666', vora: '#e5e5e5', ...colorsBase, peu_fons: '#f2f2f2', peu_text: '#111111' },
    fonts: { titols: 'inter', text: 'inter', mida: 'normal' },
    forma: { cantonades: 'rectes', botons: 'rectangle', ombres: false },
  },
  {
    id: 'nit',
    nom: 'Nit d’estiu',
    colors: { principal: '#e0a458', fons: '#16181d', superficie: '#20232a', text: '#ece7df', apagat: '#a8a197', vora: '#33363e', ...colorsBase, capcalera_fons: '#16181d', capcalera_text: '#ece7df', peu_fons: '#0f1014', peu_text: '#cfc8bd' },
    fonts: { titols: 'playfair', text: 'open-sans', mida: 'normal' },
    forma: { cantonades: 'suaus', botons: 'pindola', ombres: false },
  },
];

export function aplicaTema(d: Disseny, id: string): Disseny {
  const t = TEMES.find((x) => x.id === id);
  if (!t) return d;
  return { ...d, tema: id, colors: { ...t.colors }, fonts: { ...t.fonts }, forma: { ...t.forma } };
}

export function dissenyPerDefecte(colorPrincipal?: string | null): Disseny {
  const t = TEMES[0];
  return {
    tema: t.id,
    colors: { ...t.colors, principal: colorValid(colorPrincipal) ? colorPrincipal! : t.colors.principal },
    fonts: { ...t.fonts },
    forma: { ...t.forma },
    capcalera: { disposicio: 'esquerra', fixa: true, mostra_nom: true, mida_logo: 'mitja', forma_logo: 'original', menu_majuscules: false },
    heroi: { alcada: 'mitjana', alineacio: 'esquerra', enfosquiment: 45, botons: true },
    peu: { text: '', mostra_contacte: true, mostra_xarxes: true, mostra_legal: true, alineacio: 'columnes' },
    targetes: { columnes: 3, estil: 'imatge' },
    inici: BLOCS_DEFECTE(),
    menu: { ordre: [...MENU_DEFECTE], amagats: [] },
    css: '',
  };
}

// ---------- Validació ----------

export const colorValid = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const opcio = <T extends string>(v: unknown, permesos: readonly T[], defecte: T): T => (permesos.includes(v as T) ? (v as T) : defecte);
const boolea = (v: unknown, defecte: boolean) => (typeof v === 'boolean' ? v : defecte);
const textCurt = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/**
 * Converteix qualsevol valor (JSON desat, dades del formulari) en un disseny complet i vàlid:
 * el que falta o no és vàlid pren el valor per defecte. Així els dissenys antics continuen funcionant.
 */
export function normalitzaDisseny(brut: unknown, colorAntic?: string | null): Disseny {
  const d = dissenyPerDefecte(colorAntic);
  if (!brut || typeof brut !== 'object') return d;
  const b = brut as Record<string, any>;
  const tema = TEMES.some((x) => x.id === b.tema) ? (b.tema as string) : d.tema;

  const colors = { ...d.colors };
  for (const k of Object.keys(colors) as (keyof Disseny['colors'])[]) {
    const v = b.colors?.[k];
    if (colorValid(v)) colors[k] = v;
    else if (v === '' && /^(capcalera|peu)_/.test(k)) colors[k] = ''; // buit = automàtic
  }
  const fontsIds = FONTS.map((f) => f.id);
  const inici = Array.isArray(b.inici)
    ? (b.inici as Record<string, any>[])
        .filter((x) => x && TIPUS_BLOCS.includes(x.tipus))
        .slice(0, 30)
        .map((x) => ({
          id: textCurt(x.id, 40) || bloc(x.tipus).id,
          tipus: x.tipus as IdTipusBloc,
          visible: boolea(x.visible, true),
          titol: textCurt(x.titol, 120),
          text: textCurt(x.text, 20_000),
          quantitat: Math.min(12, Math.max(1, Number(x.quantitat) || 3)),
          fons: opcio(x.fons, ['normal', 'suau', 'color'] as const, 'normal'),
        }))
    : d.inici;
  // Cada tipus de bloc fix només una vegada; els que falten s'afegeixen amagats al final.
  const vistos = new Set<string>();
  const blocs = inici.filter((x) => (x.tipus === 'text' ? !vistos.has(x.id) && vistos.add(x.id) : !vistos.has(x.tipus) && vistos.add(x.tipus)));
  for (const t of TIPUS_BLOCS) if (t !== 'text' && !vistos.has(t)) blocs.push(bloc(t, { visible: false }));

  const ordre = Array.isArray(b.menu?.ordre) ? (b.menu.ordre as IdMenu[]).filter((x) => MENU_DEFECTE.includes(x)) : [...MENU_DEFECTE];
  for (const m of MENU_DEFECTE) if (!ordre.includes(m)) ordre.push(m);
  const amagats = Array.isArray(b.menu?.amagats) ? (b.menu.amagats as IdMenu[]).filter((x) => MENU_DEFECTE.includes(x) && x !== 'inici') : [];

  return {
    tema,
    colors,
    fonts: {
      titols: opcio(b.fonts?.titols, fontsIds, d.fonts.titols),
      text: opcio(b.fonts?.text, fontsIds, d.fonts.text),
      mida: opcio(b.fonts?.mida, ['petita', 'normal', 'gran'] as const, d.fonts.mida),
    },
    forma: {
      cantonades: opcio(b.forma?.cantonades, ['rectes', 'suaus', 'arrodonides'] as const, d.forma.cantonades),
      botons: opcio(b.forma?.botons, ['pindola', 'rectangle', 'contorn'] as const, d.forma.botons),
      ombres: boolea(b.forma?.ombres, d.forma.ombres),
    },
    capcalera: {
      disposicio: opcio(b.capcalera?.disposicio, ['esquerra', 'centrada', 'plegada'] as const, d.capcalera.disposicio),
      fixa: boolea(b.capcalera?.fixa, d.capcalera.fixa),
      mostra_nom: boolea(b.capcalera?.mostra_nom, d.capcalera.mostra_nom),
      mida_logo: opcio(b.capcalera?.mida_logo, ['petit', 'mitja', 'gran'] as const, d.capcalera.mida_logo),
      forma_logo: opcio(b.capcalera?.forma_logo, ['original', 'rodona', 'quadrada'] as const, d.capcalera.forma_logo),
      menu_majuscules: boolea(b.capcalera?.menu_majuscules, d.capcalera.menu_majuscules),
    },
    heroi: {
      alcada: opcio(b.heroi?.alcada, ['baixa', 'mitjana', 'alta'] as const, d.heroi.alcada),
      alineacio: opcio(b.heroi?.alineacio, ['esquerra', 'centre'] as const, d.heroi.alineacio),
      enfosquiment: Math.min(80, Math.max(0, Math.round(Number(b.heroi?.enfosquiment ?? d.heroi.enfosquiment)) || 0)),
      botons: boolea(b.heroi?.botons, d.heroi.botons),
    },
    peu: {
      text: textCurt(b.peu?.text, 5_000),
      mostra_contacte: boolea(b.peu?.mostra_contacte, true),
      mostra_xarxes: boolea(b.peu?.mostra_xarxes, true),
      mostra_legal: boolea(b.peu?.mostra_legal, true),
      alineacio: opcio(b.peu?.alineacio, ['columnes', 'centrat'] as const, 'columnes'),
    },
    targetes: {
      columnes: ([2, 3, 4] as const).includes(Number(b.targetes?.columnes) as 2) ? (Number(b.targetes.columnes) as 2 | 3 | 4) : 3,
      estil: opcio(b.targetes?.estil, ['imatge', 'compacta'] as const, 'imatge'),
    },
    inici: blocs,
    menu: { ordre, amagats },
    // Mai no pot tancar l'etiqueta <style> on s'insereix.
    css: textCurt(b.css, 20_000).replace(/<\/?style/gi, ''),
  };
}

/** Color de text llegible (blanc o fosc) sobre un fons donat. */
export function textSobre(fons: string): string {
  if (!colorValid(fons)) return '#ffffff';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(fons.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? '#1d1a17' : '#ffffff';
}
