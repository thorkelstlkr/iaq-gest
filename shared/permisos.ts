// Perfils d'usuari i a quines parts del programa tenen accés.
// Es fa servir tant al servidor (per protegir l'API) com a la interfície (per amagar el que no toca).

export type Modul = 'socis' | 'economia' | 'activitats' | 'web' | 'informes' | 'config' | 'usuaris';

export type Rol = 'admin' | 'junta' | 'tresoreria' | 'comunicacio';

export const PERFILS: Record<Rol, { nom: string; descripcio: string; moduls: Modul[] }> = {
  admin: {
    nom: 'Administració',
    descripcio: 'Accés total, inclosos els usuaris i la configuració.',
    moduls: ['socis', 'economia', 'activitats', 'web', 'informes', 'config', 'usuaris'],
  },
  junta: {
    nom: 'Junta / Secretaria',
    descripcio: 'Socis, quotes, comptabilitat, activitats, web i informes. No pot gestionar usuaris ni configuració.',
    moduls: ['socis', 'economia', 'activitats', 'web', 'informes'],
  },
  tresoreria: {
    nom: 'Tresoreria',
    descripcio: 'Quotes, comptabilitat, tresoreria i informes. Veu els noms dels socis a les quotes, però no en gestiona les fitxes.',
    moduls: ['economia', 'informes'],
  },
  comunicacio: {
    nom: 'Comunicació',
    descripcio: 'Web, notícies i activitats (per a un community manager). No veu dades personals ni comptes.',
    moduls: ['activitats', 'web'],
  },
};

export const ROLS = Object.keys(PERFILS) as Rol[];

export const pot = (rol: string | undefined, modul: Modul) =>
  Boolean(rol && (PERFILS as Record<string, { moduls: Modul[] }>)[rol]?.moduls.includes(modul));
