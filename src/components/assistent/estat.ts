// Estat i utilitats de l'assistent de primera configuració.
// L'estat es desa a sessionStorage perquè sobrevisqui a la recàrrega que fa el canvi d'idioma,
// però MAI s'hi desen contrasenyes (ni la de l'administrador ni les inicials de les persones clau).
import type { Rol } from '../../../shared/permisos';
import { t } from '../../i18n';

export type Carrec = 'presidencia' | 'vicepresidencia' | 'secretaria' | 'tresoreria' | 'vocal' | 'comunicacio' | 'altres';

export const CARRECS: { valor: Carrec; nom: string; rol: Rol }[] = [
  { valor: 'presidencia', nom: t("Presidència"), rol: 'junta' },
  { valor: 'vicepresidencia', nom: t("Vicepresidència"), rol: 'junta' },
  { valor: 'secretaria', nom: t("Secretaria"), rol: 'junta' },
  { valor: 'tresoreria', nom: t("Tresoreria"), rol: 'tresoreria' },
  { valor: 'vocal', nom: t("Vocal"), rol: 'junta' },
  { valor: 'comunicacio', nom: t("Comunicació / community manager"), rol: 'comunicacio' },
  { valor: 'altres', nom: t("Altres"), rol: 'junta' },
];

export const nomCarrec = (c: Carrec) => CARRECS.find((x) => x.valor === c)?.nom ?? c;
export const rolDeCarrec = (c: Carrec): Rol => CARRECS.find((x) => x.valor === c)?.rol ?? 'junta';

export interface DadesEntitat {
  nom: string;
  nom_complet: string;
  nif: string;
  adreca: string;
  poblacio: string;
  codi_postal: string;
  email: string;
  telefon: string;
  web: string;
  logo: string;
  idioma: string;
}

/** Persona clau (membre de la junta…) a qui es crea un usuari. */
export interface Persona {
  id: string;
  nom: string;
  carrec: Carrec;
  usuari: string;
  /** L'usuari ha editat el nom d'usuari: ja no se suggereix a partir del nom. */
  usuariEditat: boolean;
  contrasenya: string;
  rol: Rol;
}

export interface EstatAssistent {
  pas: number;
  acceptada: boolean;
  entitat: DadesEntitat;
  admin: { nom: string; usuari: string };
  persones: Persona[];
  /** S'ha triat expressament l'idioma del programa (si no, segueix el de la interfície). */
  idiomaEditat?: boolean;
}

const CLAU = 'assistent-primera-configuracio';

export const estatBuit = (idioma: string): EstatAssistent => ({
  pas: 0,
  acceptada: false,
  entitat: { nom: '', nom_complet: '', nif: '', adreca: '', poblacio: '', codi_postal: '', email: '', telefon: '', web: '', logo: '', idioma },
  admin: { nom: '', usuari: '' },
  persones: [],
});

export function llegeixEstat(idioma: string): EstatAssistent {
  const buit = estatBuit(idioma);
  try {
    const desat = JSON.parse(sessionStorage.getItem(CLAU) ?? 'null') as Partial<EstatAssistent> | null;
    if (!desat || typeof desat !== 'object') return buit;
    return {
      pas: Number.isInteger(desat.pas) ? Math.max(0, Math.min(5, desat.pas!)) : 0,
      acceptada: Boolean(desat.acceptada),
      entitat: { ...buit.entitat, ...desat.entitat, ...(desat.idiomaEditat ? {} : { idioma }) },
      idiomaEditat: Boolean(desat.idiomaEditat),
      admin: { ...buit.admin, ...desat.admin },
      // Les contrasenyes no es desen: se'n genera una de nova en recuperar l'estat.
      persones: Array.isArray(desat.persones) ? desat.persones.map((p) => ({ ...p, contrasenya: generaContrasenya() })) : [],
    };
  } catch {
    return buit;
  }
}

export function desaEstat(e: EstatAssistent) {
  try {
    const senseContrasenyes = { ...e, persones: e.persones.map((p) => ({ ...p, contrasenya: '' })) };
    sessionStorage.setItem(CLAU, JSON.stringify(senseContrasenyes));
  } catch {
    /* sense emmagatzematge o massa gran (logotip): no passa res, només es perd en recarregar */
  }
}

export function esborraEstat() {
  try {
    sessionStorage.removeItem(CLAU);
  } catch {
    /* sense emmagatzematge */
  }
}

// ---------- Noms d'usuari i contrasenyes ----------

/** Suggereix un nom d'usuari a partir del nom: «Maria Pons Vives» → «maria.pons». */
export function suggereixUsuari(nom: string, ocupats: string[]): string {
  const paraules = nom
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const base = paraules.slice(0, 2).join('.');
  if (!base) return '';
  const lliures = new Set(ocupats.map((o) => o.toLowerCase()));
  if (!lliures.has(base)) return base;
  for (let i = 2; ; i++) if (!lliures.has(`${base}${i}`)) return `${base}${i}`;
}

const aleatori = (n: number) => {
  const v = new Uint32Array(1);
  crypto.getRandomValues(v);
  return v[0] % n;
};

/** Contrasenya llegible: síl·labes fàcils de dictar i quatre xifres (p. ex. «Bakuneto-4827»). */
export function generaContrasenya(): string {
  const consonants = 'bcdfgjklmnprstvz';
  const vocals = 'aeiou';
  let s = '';
  for (let i = 0; i < 4; i++) s += consonants[aleatori(consonants.length)] + vocals[aleatori(vocals.length)];
  const xifres = String(aleatori(9000) + 1000);
  return `${s[0].toUpperCase()}${s.slice(1)}-${xifres}`;
}

export const MIN_CONTRASENYA = 8;

/** Fortalesa orientativa: 0 = massa curta, 1 = feble, 2 = acceptable, 3 = forta. */
export function fortalesa(c: string): 0 | 1 | 2 | 3 {
  if (c.length < MIN_CONTRASENYA) return 0;
  const tipus = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(c)).length;
  const punts = (c.length >= 12 ? 2 : c.length >= 10 ? 1 : 0) + (tipus >= 3 ? 2 : tipus === 2 ? 1 : 0);
  return punts >= 3 ? 3 : punts >= 1 ? 2 : 1;
}

export const novaPersona = (): Persona => ({
  id: Math.random().toString(36).slice(2),
  nom: '',
  carrec: 'presidencia',
  usuari: '',
  usuariEditat: false,
  contrasenya: generaContrasenya(),
  rol: 'junta',
});
