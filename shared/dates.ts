// Dates en hora local (YYYY-MM-DD). `toISOString()` dona la data UTC, que a l'Estat
// va endarrerida una o dues hores: entre les 0 h i les 2 h donaria la data d'ahir.

/** Data local d'un instant, format YYYY-MM-DD. */
export function dataLocal(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Data d'avui en hora local. */
export const avui = () => dataLocal();

/** Data local d'aquí a `dies` dies (o de fa, si és negatiu). */
export function sumaDies(dies: number, des: Date = new Date()): string {
  const d = new Date(des);
  d.setDate(d.getDate() + dies);
  return dataLocal(d);
}
