// Icona del programa (la de l'instal·lador). S'incrusta al codi perquè també surti a la demostració d'un sol fitxer.
import icona from '../assets/icona.png?inline';

export function IconaApp({ mida = 56 }: { mida?: number }) {
  return <img src={icona} alt="" width={mida} height={mida} className="icona-app" />;
}
