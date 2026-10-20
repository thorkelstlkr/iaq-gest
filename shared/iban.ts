// Validació i format d'IBAN (ISO 13616, dígits de control mod 97). Compartit entre servidor i interfície.

/** Treu espais i guions i ho passa a majúscules: «es91 2100-0418…» → «ES9121000418…». */
export const netejaIban = (iban: string) => iban.replace(/[\s-]/g, '').toUpperCase();

/** Cert si l'IBAN té un format i uns dígits de control vàlids. */
export function ibanValid(iban: string): boolean {
  const i = netejaIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(i)) return false;
  if (i.startsWith('ES') && i.length !== 24) return false;
  const reordenat = i.slice(4) + i.slice(0, 4);
  let resta = 0;
  for (const c of reordenat) {
    const v = c >= 'A' ? String(c.charCodeAt(0) - 55) : c;
    for (const d of v) resta = (resta * 10 + Number(d)) % 97;
  }
  return resta === 1;
}

/** Format de lectura en grups de quatre: «ES91 2100 0418 4502 0005 1332». */
export const formataIban = (iban: string) => netejaIban(iban).replace(/(.{4})(?=.)/g, '$1 ');
