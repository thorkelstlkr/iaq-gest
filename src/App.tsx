import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import type { Modul } from '../shared/permisos';
import { Avisos, Confirmacions, ExerciciContext } from './components/ui';
import { DEMO } from './mode';
import { ImpressioCarnets } from './components/Carnet';
import { Acces } from './components/Acces';
import { AvisLlicencia } from './components/assistent/AvisLlicencia';
import { EntitatProvider, Logo, useEntitat } from './entitat';
import { PERFILS } from '../shared/permisos';
import Tauler from './pages/Tauler';
import Socis from './pages/Socis';
import FitxaSoci from './pages/FitxaSoci';
import Interessats from './pages/Interessats';
import Seguiment from './pages/Seguiment';
import Comunicacions from './pages/Comunicacions';
import Quotes from './pages/Quotes';
import Moviments from './pages/Moviments';
import Activitats from './pages/Activitats';
import Informes from './pages/Informes';
import Configuracio from './pages/Configuracio';
import Web from './pages/Web';
import ProteccioDades from './pages/ProteccioDades';
import Facturacio from './pages/Facturacio';
import Xarxes from './pages/Xarxes';
import Governanca from './pages/Governanca';
import Tresoreria from './pages/Tresoreria';
import Voluntariat from './pages/Voluntariat';
import Collaboradors from './pages/Collaboradors';
import Subvencions from './pages/Subvencions';
import Donatius from './pages/Donatius';
import Inventari from './pages/Inventari';
import AgentIA from './pages/AgentIA';
import { canviaIdioma, idioma, opcionsIdioma, t } from './i18n';
import { MenuLateral } from './components/MenuLateral';
import type { GrupMenu } from './components/MenuLateral';
import Ajuda from './pages/Ajuda';
import type { Idioma } from './i18n';
import { api } from './api';

// Menú lateral per categories. Cada entrada indica el mòdul que cal tenir (shared/permisos.ts); null = tothom.
const MENU: GrupMenu[] = [
  { id: 'inici', titol: null, icona: '⌂', elements: [{ a: '/', text: t("Tauler"), modul: 'informes' }] },
  {
    id: 'persones',
    titol: t("Persones"),
    icona: '👥',
    elements: [
      { a: '/socis', text: t("Socis"), modul: 'socis' },
      { a: '/interessats', text: t("Interessats"), modul: 'socis' },
      { a: '/seguiment', text: t("Seguiment"), modul: 'socis' },
      { a: '/comunicacions', text: t("Comunicacions"), modul: 'socis' },
      { a: '/voluntariat', text: t("Voluntariat"), modul: 'socis' },
      { a: '/collaboradors', text: t("Col·laboradors"), modul: 'socis' },
    ],
  },
  {
    id: 'activitats',
    titol: t("Activitats i difusió"),
    icona: '🎭',
    elements: [
      { a: '/activitats', text: t("Activitats"), modul: 'activitats' },
      { a: '/web', text: t("Web"), modul: 'web' },
      { a: '/xarxes', text: t("Xarxes socials"), modul: 'web' },
    ],
  },
  {
    id: 'economia',
    titol: t("Economia"),
    icona: '€',
    elements: [
      { a: '/quotes', text: t("Quotes"), modul: 'economia' },
      { a: '/moviments', text: t("Comptabilitat"), modul: 'economia' },
      { a: '/tresoreria', text: t("Tresoreria"), modul: 'economia' },
      { a: '/facturacio', text: t("Facturació"), modul: 'economia' },
      { a: '/subvencions', text: t("Subvencions"), modul: 'economia' },
      { a: '/donatius', text: t("Donatius"), modul: 'economia' },
      { a: '/inventari', text: t("Inventari"), modul: 'economia' },
    ],
  },
  {
    id: 'govern',
    titol: t("Govern i compliment"),
    icona: '⚖',
    elements: [
      { a: '/governanca', text: t("Òrgans de govern"), modul: 'socis' },
      { a: '/proteccio-dades', text: t("Protecció de dades"), modul: 'socis' },
      { a: '/informes', text: t("Informes"), modul: 'informes' },
    ],
  },
  {
    id: 'sistema',
    titol: t("Eines i ajuda"),
    icona: '⚙',
    elements: [
      { a: '/agent-ia', text: t("El meu agent d'IA"), modul: null },
      { a: '/configuracio', text: t("Configuració"), modul: null },
      { a: '/ajuda', text: t("Ajuda"), modul: null },
    ],
  },
];

function exerciciInicial() {
  try {
    const e = Number(localStorage.getItem('exercici'));
    if (Number.isInteger(e) && e > 1900) return e;
  } catch {
    /* sense emmagatzematge */
  }
  return new Date().getFullYear();
}

export default function App() {
  return (
    <>
      <Acces>
        {(usuari, surt) => (
          <EntitatProvider usuari={usuari}>
            <Aplicacio surt={surt} />
          </EntitatProvider>
        )}
      </Acces>
      <Avisos />
      <Confirmacions />
    </>
  );
}

function Aplicacio({ surt }: { surt: () => void }) {
  const { config, usuari, pot } = useEntitat();
  const permes = (m: Modul | null) => m === null || pot(m);
  const menu = MENU.map((g) => ({ ...g, elements: g.elements.filter((m) => permes(m.modul)) })).filter((g) => g.elements.length);
  // Pàgina inicial: el tauler si s'hi té accés; si no, la primera secció permesa.
  const inici = menu[0]?.elements[0]?.a ?? '/configuracio';
  const ruta = (modul: Modul | null, element: ReactElement) => (permes(modul) ? element : <Navigate to={inici} replace />);
  const [exercici, setExercici] = useState(exerciciInicial);
  useEffect(() => {
    try {
      localStorage.setItem('exercici', String(exercici));
    } catch {
      /* sense emmagatzematge */
    }
  }, [exercici]);
  const anyActual = new Date().getFullYear();
  const anys = Array.from({ length: 8 }, (_, i) => anyActual + 1 - i);
  if (!anys.includes(exercici)) anys.push(exercici);

  return (
    <ExerciciContext.Provider value={[exercici, setExercici]}>
      <div className="app">
        <aside className="lateral">
          <div className="marca">
            <Logo />
            <div>
              <strong>{config?.nom || t("Gestió")}</strong>
              {config?.lema && <small>{config.lema}</small>}
            </div>
          </div>
          <MenuLateral grups={menu} />
          <div className="lateral-peu">
            <label className="selector-exercici">
              <span>{t("Exercici")}</span>
              <select value={exercici} onChange={(e) => setExercici(Number(e.target.value))}>
                {anys.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            {usuari && (
              <div className="sessio">
                <span>
                  {usuari.nom}
                  <small>{t(PERFILS[usuari.rol]?.nom ?? '')}</small>
                </span>
                <select
                  className="idioma-lateral"
                  value={idioma()}
                  aria-label={t('Idioma')}
                  onChange={async (e) => {
                    const nou = e.target.value as Idioma;
                    // Es desa com a preferència de l'usuari perquè la propera vegada ja surti en aquest idioma.
                    if (!DEMO) await api.put('/usuaris/jo/idioma', { idioma: nou }).catch(() => {});
                    canviaIdioma(nou);
                  }}
                >
                  {opcionsIdioma().map((o) => (
                    <option key={o.codi} value={o.codi}>
                      {o.nom}
                    </option>
                  ))}
                </select>
                {!DEMO && (
                  <button type="button" className="enllac" onClick={surt}>
                    {t("Surt")}
                  </button>
                )}
              </div>
            )}
            <Versio />
          </div>
        </aside>
        <main className="contingut">
          {DEMO && (
            <p className="avis-demo">
              <strong>{t("Versió de demostració")}</strong> {t("amb dades inventades. Pots provar-ho tot: els canvis es perden en tornar a carregar la pàgina.")}
            </p>
          )}
          <Routes>
            <Route path="/" element={pot('informes') ? <Tauler /> : <Navigate to={inici} replace />} />
            <Route path="/socis" element={ruta('socis', <Socis />)} />
            <Route path="/socis/:id" element={ruta('socis', <FitxaSoci />)} />
            <Route path="/interessats" element={ruta('socis', <Interessats />)} />
            <Route path="/seguiment" element={ruta('socis', <Seguiment />)} />
            <Route path="/comunicacions" element={ruta('socis', <Comunicacions />)} />
            <Route path="/quotes" element={ruta('economia', <Quotes />)} />
            <Route path="/moviments" element={ruta('economia', <Moviments />)} />
            <Route path="/facturacio" element={ruta('economia', <Facturacio />)} />
            <Route path="/governanca" element={ruta('socis', <Governanca />)} />
            <Route path="/tresoreria" element={ruta('economia', <Tresoreria />)} />
            <Route path="/subvencions" element={ruta('economia', <Subvencions />)} />
            <Route path="/donatius" element={ruta('economia', <Donatius />)} />
            <Route path="/inventari" element={ruta('economia', <Inventari />)} />
            <Route path="/voluntariat" element={ruta('socis', <Voluntariat />)} />
            <Route path="/collaboradors" element={ruta('socis', <Collaboradors />)} />
            <Route path="/activitats" element={ruta('activitats', <Activitats />)} />
            <Route path="/web" element={ruta('web', <Web />)} />
            <Route path="/xarxes" element={ruta('web', <Xarxes />)} />
            <Route path="/proteccio-dades" element={ruta('socis', <ProteccioDades />)} />
            <Route path="/informes" element={ruta('informes', <Informes />)} />
            <Route path="/agent-ia" element={<AgentIA />} />
            <Route path="/ajuda" element={<Ajuda />} />
            <Route path="/ajuda/:article" element={<Ajuda />} />
            <Route path="/configuracio" element={<Configuracio />} />
            <Route path="*" element={<p>{t("Pàgina no trobada.")}</p>} />
          </Routes>
        </main>
      </div>
      <ImpressioCarnets />
      <AvisLlicencia />
    </ExerciciContext.Provider>
  );
}

/** Versió del programa, al peu del menú (útil per saber si s'ha actualitzat). */
function Versio() {
  const [versio, setVersio] = useState<string | null>(null);
  useEffect(() => {
    if (DEMO) return;
    api
      .get<{ versio?: string }>('/auth/estat')
      .then((r) => setVersio(r.versio ?? null))
      .catch(() => {});
  }, []);
  return versio ? <small className="versio-app">{t("Versió {0}", versio)}</small> : null;
}
