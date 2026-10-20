import { locale, t } from './i18n';
const EUR = new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR' });

export const euros = (cents: number) => EUR.format(cents / 100);

/** Cèntims → text editable ("12,50"). */
export const centsAText = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

/** Text escrit per l'usuari ("1.234,56", "12.5", "12") → cèntims. */
export function textACents(s: string): number | null {
  let tt = s.replace(/[\s€]/g, '');
  if (tt === '') return null;
  if (tt.includes(',')) tt = tt.replace(/\./g, '').replace(',', '.');
  const n = Number(tt);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export const data = (iso: string | null | undefined) => (iso ? iso.split('-').reverse().join('/') : '');

/** Data d'avui en hora local, format YYYY-MM-DD. */
export const avui = () => new Date().toLocaleDateString('sv-SE');

export function edat(naixement: string | null): number | null {
  if (!naixement) return null;
  const [a, m, d] = naixement.split('-').map(Number);
  const ara = new Date();
  let e = ara.getFullYear() - a;
  if (ara.getMonth() + 1 < m || (ara.getMonth() + 1 === m && ara.getDate() < d)) e--;
  return e;
}

export const nomComplet = (s: { nom: string; llinatges: string }) => `${s.nom} ${s.llinatges}`.trim();

export const GENERES: Record<string, string> = { dona: t("Dona"), home: t("Home"), altre: t("Altre"), nc: t("No consta") };
export const TIPUS_MOVIMENT: Record<string, string> = { ingres: t("Ingrés"), despesa: t("Despesa"), traspas: t("Traspàs") };
export const ESTATS_QUOTA: Record<string, string> = { pendent: t("Pendent"), pagada: t("Pagada"), exempta: t("Exempta") };
