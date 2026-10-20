// Menú lateral agrupat per categories plegables. El grup de la pàgina actual s'obre sol; la resta
// recorden si les havies deixat obertes. Al mòbil, el menú es desplega amb un botó.
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { Modul } from '../../shared/permisos';
import { t } from '../i18n';

export interface ElementMenu {
  a: string;
  text: string;
  modul: Modul | null;
}
export interface GrupMenu {
  id: string;
  /** null = sense capçalera (elements solts, com el tauler). */
  titol: string | null;
  icona: string;
  elements: ElementMenu[];
}

const CLAU = 'menu-grups-oberts';

function llegeixOberts(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAU) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

const esActiu = (a: string, cami: string) => (a === '/' ? cami === '/' : cami === a || cami.startsWith(`${a}/`));

export function MenuLateral({ grups }: { grups: GrupMenu[] }) {
  const { pathname } = useLocation();
  const [oberts, setOberts] = useState<string[]>(llegeixOberts);
  const [mobilObert, setMobilObert] = useState(false);

  // El grup de la pàgina on ets sempre queda obert.
  const grupActiu = grups.find((g) => g.elements.some((e) => esActiu(e.a, pathname)))?.id;
  useEffect(() => {
    if (grupActiu && !oberts.includes(grupActiu)) setOberts((o) => [...o, grupActiu]);
    setMobilObert(false); // en canviar de pàgina, al mòbil es tanca el menú
  }, [pathname]);
  useEffect(() => {
    try {
      localStorage.setItem(CLAU, JSON.stringify(oberts));
    } catch {
      /* sense emmagatzematge */
    }
  }, [oberts]);

  const commuta = (id: string) => setOberts((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  return (
    <>
      <button type="button" className="menu-mobil-boto" aria-expanded={mobilObert} aria-controls="menu-principal" onClick={() => setMobilObert(!mobilObert)}>
        ☰ {t("Menú")}
      </button>
      <nav id="menu-principal" className={`menu-principal${mobilObert ? ' obert' : ''}`} aria-label={t("Menú principal")}>
        {grups.map((g) => {
          if (!g.titol) {
            return (
              <div key={g.id} className="menu-solts">
                {g.elements.map((e) => (
                  <NavLink key={e.a} to={e.a} end={e.a === '/'}>
                    <span className="menu-icona" aria-hidden="true">
                      {g.icona}
                    </span>
                    {e.text}
                  </NavLink>
                ))}
              </div>
            );
          }
          const obert = oberts.includes(g.id);
          const conteActiu = g.id === grupActiu;
          return (
            <div key={g.id} className={`menu-categoria${obert ? ' oberta' : ''}${conteActiu ? ' activa' : ''}`}>
              <button type="button" className="menu-categoria-cap" aria-expanded={obert} aria-controls={`menu-${g.id}`} onClick={() => commuta(g.id)}>
                <span className="menu-icona" aria-hidden="true">
                  {g.icona}
                </span>
                <span className="menu-categoria-nom">{g.titol}</span>
                <span className="menu-fletxa" aria-hidden="true">
                  ›
                </span>
              </button>
              <div id={`menu-${g.id}`} className="menu-categoria-elements" hidden={!obert}>
                {g.elements.map((e) => (
                  <NavLink key={e.a} to={e.a} end={e.a === '/'}>
                    {e.text}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </>
  );
}
