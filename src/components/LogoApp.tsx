// Logotip del programa («IAQ Gest»): versió clara per a fons clars i fosca per a la barra lateral.
// S'incrusta al codi perquè també surti a la demostració d'un sol fitxer.
import clar from '../assets/logo-clar.png?inline';
import fosc from '../assets/logo-fosc.png?inline';

export function LogoApp({ versio, alcada }: { versio: 'clar' | 'fosc'; alcada: number }) {
  return <img src={versio === 'clar' ? clar : fosc} alt="IAQ Gest" height={alcada} className="logo-app" />;
}
