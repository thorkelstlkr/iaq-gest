// Recuperació de l'accés: crea un usuari administrador o en restableix la contrasenya.
// Només es pot fer des de la consola de l'ordinador on hi ha la base de dades (accés físic).
//
//   npm run restableix-admin -- <usuari> <nova-contrasenya>
//
// Si l'usuari existeix, se'n canvia la contrasenya, passa a ser administrador, es reactiva i se'n
// tanquen les sessions obertes. Si no existeix, es crea. Queda anotat al registre d'activitat.

import { get, run, tx } from '../server/db.ts';
import { hashContrasenya } from '../server/routes/auth.ts';
import { registraSistema } from '../server/auditoria.ts';

const [usuari, contrasenya] = process.argv.slice(2).map((v) => v?.trim());

if (!usuari || !contrasenya) {
  console.error('Ús: npm run restableix-admin -- <usuari> <nova-contrasenya>');
  process.exit(2);
}
if (contrasenya.length < 8) {
  console.error('La contrasenya ha de tenir almenys 8 caràcters.');
  process.exit(2);
}

const existent = get<{ id: number; nom: string }>('SELECT id, nom FROM usuaris WHERE usuari = ?', usuari);
tx(() => {
  if (existent) {
    run("UPDATE usuaris SET hash = ?, rol = 'admin', actiu = 1 WHERE id = ?", hashContrasenya(contrasenya), existent.id);
    run('DELETE FROM sessions WHERE usuari_id = ?', existent.id);
    registraSistema('consola', 'contrasenya', 'usuari', existent.id, `Accés d'administració restablert des de la consola per a ${usuari}`);
  } else {
    const { id } = run("INSERT INTO usuaris (nom, usuari, hash, rol) VALUES (?, ?, ?, 'admin')", usuari, usuari, hashContrasenya(contrasenya));
    registraSistema('consola', 'crea', 'usuari', id, `Usuari administrador ${usuari} creat des de la consola`);
  }
});

console.log(
  existent
    ? `S'ha restablert la contrasenya de «${usuari}» i ara és administrador. Ja pots entrar al programa.`
    : `S'ha creat l'usuari administrador «${usuari}». Ja pots entrar al programa.`,
);
