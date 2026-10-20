// Filtre de dades sensibles: tot el que torna una eina passa per aquí abans d'arribar a l'agent.
// L'entitat ha decidit que els agents d'IA no vegin dades personals sensibles; el model treballa
// amb noms, edats, estats i imports, que és el que necessita per gestionar.

/** Camps que mai no arriben a l'agent. */
const SEMPRE = new Set([
  'dni', 'nie', 'nif_soci', 'dni_tutor', 'iban', 'bic', 'mandat_ref', 'referencia_mandat',
  'adreca', 'adreça', 'domicili', 'codi_postal', 'cp',
  'foto', 'fotografia', 'signatura', 'tutor_legal', 'tutor_dni', 'tutor_telefon', 'telefon_tutor',
  'hash', 'contrasenya', 'token', 'dades', // «dades»: fitxers adjunts (data URI)
  'notes_privades', 'motiu_baixa', 'motiu', 'consentiment_signant',
  'clau', 'clau_donant', 'mandat_referencia', 'referencia_mandat',
]);
/** Dades de contacte: només si la clau de l'agent ho permet expressament. */
const CONTACTE = new Set(['email', 'correu', 'telefon', 'mobil', 'telefon_contacte', 'contacte']);

/**
 * Segona línia de defensa, pel contingut: un text amb forma de DNI, NIE, NIF o IBAN no surt mai,
 * encara que el camp tingui un nom que no està a les llistes.
 */
const DOCUMENT = /^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])$/i;
const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/i;
const esDadaSensible = (v: string) => {
  const net = v.replace(/[\s-]/g, '');
  return DOCUMENT.test(net) || IBAN.test(net);
};

/** Edat a partir d'una data AAAA-MM-DD (l'agent veu l'edat, no la data de naixement). */
function edat(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const ara = new Date();
  const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return ara.getFullYear() - a - (ara.getMonth() + 1 < mes || (ara.getMonth() + 1 === mes && ara.getDate() < dia) ? 1 : 0);
}

export function filtraSensible(valor: unknown, { contacte = false } = {}, profunditat = 0): unknown {
  if (profunditat > 12) return null;
  if (typeof valor === 'string') {
    if (/^data:[a-z]+\/[a-z0-9.+-]+;base64,/i.test(valor)) return '[fitxer]';
    return esDadaSensible(valor) ? '[ocult]' : valor;
  }
  if (Array.isArray(valor)) return valor.map((v) => filtraSensible(v, { contacte }, profunditat + 1));
  if (!valor || typeof valor !== 'object') return valor;
  const sortida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(valor)) {
    const clau = k.toLowerCase();
    if (SEMPRE.has(clau)) continue;
    if (!contacte && CONTACTE.has(clau)) continue;
    if (clau === 'data_naixement') {
      if (typeof v === 'string') sortida.edat = edat(v);
      continue;
    }
    // NIF/DNI de persones (el de l'entitat o d'empreses no és sensible, però per prudència no se n'envia cap).
    if (clau === 'nif' || clau.endsWith('_nif') || clau.endsWith('_dni')) continue;
    // Dades del tutor o tutora d'un menor: cap ni una.
    if (clau.startsWith('tutor') || clau.endsWith('_tutor')) continue;
    sortida[k] = filtraSensible(v, { contacte }, profunditat + 1);
  }
  return sortida;
}
