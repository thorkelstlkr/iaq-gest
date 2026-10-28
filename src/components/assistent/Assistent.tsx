import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api } from '../../api';
import { redueixImatge } from '../../imatges';
import { idioma, opcionsIdioma, t } from '../../i18n';
import { PERFILS, ROLS } from '../../../shared/permisos';
import type { Rol } from '../../../shared/permisos';
import { Camp } from '../ui';
import { SelectorIdioma } from '../Acces';
import { TextLlicencia } from './TextLlicencia';
import { Final } from './Final';
import type { Resultat } from './Final';
import {
  CARRECS, MIN_CONTRASENYA, desaEstat, esborraEstat, fortalesa, generaContrasenya, llegeixEstat, nomCarrec, novaPersona,
  rolDeCarrec, suggereixUsuari,
} from './estat';
import type { Carrec, DadesEntitat, EstatAssistent, Persona } from './estat';
import { IconaApp } from '../IconaApp';
import '../../styles/assistent.css';

const PASSOS = [t("Benvinguda"), t("Llicència"), t("L'entitat"), t("Administració"), t("Persones clau"), t("Resum")];
const PAS_PERSONES = 4;
const PAS_RESUM = 5;

const missatge = (e: unknown) => (e instanceof Error ? e.message : String(e));
const nomIdioma = (codi: string) => opcionsIdioma().find((o) => o.codi === codi)?.nom ?? codi;
const nomPerfil = (rol: Rol) => t(PERFILS[rol].nom);

/**
 * Assistent de primera configuració: es mostra quan encara no hi ha cap usuari.
 * Crea l'administrador, desa les dades de l'entitat (amb l'acceptació de la llicència) i,
 * si es vol, els usuaris de les persones clau de la junta.
 */
export function Assistent({ onEntrat }: { onEntrat: () => void }) {
  const [e, setE] = useState<EstatAssistent>(() => llegeixEstat(idioma()));
  const [contrasenya, setContrasenya] = useState('');
  const [repeteix, setRepeteix] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fase, setFase] = useState<'formulari' | 'executant' | 'final'>('formulari');
  const [adminCreat, setAdminCreat] = useState(false);
  const [errorAdmin, setErrorAdmin] = useState(false);
  const [configDesada, setConfigDesada] = useState<Resultat>('pendent');
  const [resultats, setResultats] = useState<Record<string, Resultat>>({});
  const titol = useRef<HTMLHeadingElement>(null);
  const primer = useRef(true);

  // Es desa a cada canvi (sense contrasenyes), fins que l'administrador ja és creat.
  useEffect(() => {
    if (!adminCreat) desaEstat(e);
  }, [e, adminCreat]);

  // En canviar de pas, el focus va al títol (per al teclat i els lectors de pantalla).
  useEffect(() => {
    if (primer.current) {
      primer.current = false;
      return;
    }
    titol.current?.focus();
  }, [e.pas, fase]);

  const pas = e.pas;
  const vesA = (n: number) => {
    setError(null);
    setE((x) => ({ ...x, pas: n }));
  };
  const setEntitat = (k: keyof DadesEntitat) => (ev: { target: { value: string } }) =>
    setE((x) => ({ ...x, entitat: { ...x.entitat, [k]: ev.target.value }, idiomaEditat: x.idiomaEditat || k === 'idioma' }));
  const setAdmin = (k: 'nom' | 'usuari') => (ev: { target: { value: string } }) =>
    setE((x) => ({ ...x, admin: { ...x.admin, [k]: ev.target.value } }));

  function valida(n: number): string | null {
    if (n === 1 && !e.acceptada) return t("Cal acceptar les condicions per continuar.");
    if (n === 2) {
      if (!e.entitat.nom.trim()) return t("Cal indicar el nom curt de l'entitat.");
      if (e.entitat.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.entitat.email.trim())) return t("El correu electrònic no sembla correcte.");
    }
    if (n === 3) {
      if (!e.admin.nom.trim()) return t("Cal indicar el teu nom.");
      if (!e.admin.usuari.trim()) return t("Cal indicar un nom d'usuari.");
      if (/\s/.test(e.admin.usuari.trim())) return t("El nom d'usuari no pot tenir espais.");
      if (contrasenya.length < MIN_CONTRASENYA) return t("La contrasenya ha de tenir almenys 8 caràcters.");
      if (contrasenya !== repeteix) return t("Les contrasenyes no coincideixen.");
    }
    if (n === PAS_PERSONES) {
      const vistos = new Set([e.admin.usuari.trim().toLowerCase()]);
      for (const [i, p] of e.persones.entries()) {
        const qui = p.nom.trim() || t("persona {0}", i + 1);
        if (!p.nom.trim()) return t("Falta el nom de la persona {0}.", i + 1);
        if (!p.usuari.trim()) return t("Falta el nom d'usuari de {0}.", qui);
        if (/\s/.test(p.usuari.trim())) return t("El nom d'usuari de {0} no pot tenir espais.", qui);
        if (p.contrasenya.length < MIN_CONTRASENYA) return t("La contrasenya de {0} ha de tenir almenys 8 caràcters.", qui);
        const u = p.usuari.trim().toLowerCase();
        if (vistos.has(u)) return t("El nom d'usuari «{0}» està repetit. Cada persona n'ha de tenir un de diferent.", p.usuari.trim());
        vistos.add(u);
      }
    }
    return null;
  }

  function seguent() {
    const err = valida(pas);
    if (err) return setError(err);
    vesA(pas + 1);
  }

  // Si cal tornar a la contrasenya de l'administrador (p. ex. després de recarregar), s'hi va directament.
  function primerPasInvalid(): number | null {
    for (let n = 1; n < PAS_RESUM; n++) if (valida(n)) return n;
    return null;
  }

  async function executa() {
    const invalid = primerPasInvalid();
    if (invalid !== null) {
      vesA(invalid);
      setError(valida(invalid));
      return;
    }
    setError(null);
    setErrorAdmin(false);
    setFase('executant');
    // 1. Administrador (i nom de l'entitat). Si falla, no s'ha creat res: es torna al resum.
    if (!adminCreat) {
      try {
        await api.post('/auth/primer-usuari', {
          entitat: e.entitat.nom.trim(),
          entitat_completa: e.entitat.nom_complet.trim(),
          nom: e.admin.nom.trim(),
          usuari: e.admin.usuari.trim(),
          contrasenya,
        });
      } catch (err) {
        setFase('formulari');
        setError(t("No s'ha pogut crear l'administrador: {0}", missatge(err)));
        setErrorAdmin(true);
        return;
      }
      setAdminCreat(true);
      setContrasenya('');
      setRepeteix('');
      esborraEstat();
    }
    // 2. Dades de l'entitat i acceptació de la llicència.
    await desaConfig();
    // 3. Usuaris de les persones clau.
    for (const p of e.persones) if (resultats[p.id] !== 'ok') await creaPersona(p);
    setFase('final');
  }

  async function desaConfig() {
    setConfigDesada('pendent');
    try {
      await api.put('/config', {
        ...e.entitat,
        nom: e.entitat.nom.trim(),
        llicencia_acceptada_el: new Date().toISOString(),
        llicencia_acceptada_per: e.admin.nom.trim(),
      });
      setConfigDesada('ok');
    } catch (err) {
      setConfigDesada(missatge(err));
    }
  }

  async function creaPersona(p: Persona) {
    setResultats((r) => ({ ...r, [p.id]: 'pendent' }));
    let res: Resultat = 'ok';
    try {
      await api.post('/usuaris', { nom: p.nom.trim(), usuari: p.usuari.trim(), contrasenya: p.contrasenya, rol: p.rol });
    } catch (err) {
      res = missatge(err);
    }
    setResultats((r) => ({ ...r, [p.id]: res }));
  }

  const canviaPersona = (id: string, canvi: Partial<Persona>) =>
    setE((x) => ({ ...x, persones: x.persones.map((p) => (p.id === id ? { ...p, ...canvi } : p)) }));

  if (fase !== 'formulari') {
    return (
      <Final
        titolRef={titol}
        executant={fase === 'executant'}
        entitat={e.entitat.nom}
        admin={e.admin}
        configDesada={configDesada}
        persones={e.persones}
        resultats={resultats}
        onCanviaPersona={canviaPersona}
        onReintentaConfig={desaConfig}
        onReintentaPersona={creaPersona}
        onEntrat={onEntrat}
      />
    );
  }

  function envia(ev: FormEvent) {
    ev.preventDefault();
    if (pas === PAS_RESUM) executa();
    else seguent();
  }

  return (
    <div className="acces">
      <form className="acces-targeta assistent" onSubmit={envia} noValidate>
        <IconaApp mida={44} />
        <Passos actual={pas} onVesA={(n) => n < pas && vesA(n)} />
        <h1 className="assistent-titol" ref={titol} tabIndex={-1}>
          {PASSOS[pas]}
        </h1>

        {pas === 0 && <PasBenvinguda />}

        {pas === 1 && (
          <div className="assistent-cos">
            <p>{t("Llegeix les condicions d'ús del programa. Per continuar cal que les acceptis.")}</p>
            <TextLlicencia />
            <label className="assistent-check">
              <input
                id="as-accepta"
                type="checkbox"
                checked={e.acceptada}
                onChange={(ev) => setE((x) => ({ ...x, acceptada: ev.target.checked }))}
              />
              <span>{t("He llegit i accepto les condicions")}</span>
            </label>
          </div>
        )}

        {pas === 2 && <PasEntitat entitat={e.entitat} set={setEntitat} setLogo={(logo) => setE((x) => ({ ...x, entitat: { ...x.entitat, logo } }))} onError={setError} />}

        {pas === 3 && (
          <div className="assistent-cos">
            <p>
              {t("La persona administradora pot fer-ho tot: portar les dades, canviar la configuració i crear els usuaris de la resta de persones. Normalment és qui s'encarregarà del programa.")}
            </p>
            <fieldset>
              <legend>{t("El teu usuari")}</legend>
              <Camp etiqueta={t("Nom i llinatges")}>
                <input id="as-admin-nom" value={e.admin.nom} onChange={setAdmin('nom')} autoComplete="name" required />
              </Camp>
              <Camp etiqueta={t("Nom d'usuari")} ajuda={t("El que escriuràs per entrar")}>
                <input id="as-admin-usuari" value={e.admin.usuari} onChange={setAdmin('usuari')} autoComplete="username" autoCapitalize="none" required />
              </Camp>
              <Camp etiqueta={t("Contrasenya")} ajuda={t("Almenys 8 caràcters")}>
                <input id="as-admin-contrasenya" type="password" value={contrasenya} onChange={(ev) => setContrasenya(ev.target.value)} autoComplete="new-password" required />
              </Camp>
              <Camp etiqueta={t("Repeteix la contrasenya")}>
                <input id="as-admin-repeteix" type="password" value={repeteix} onChange={(ev) => setRepeteix(ev.target.value)} autoComplete="new-password" required />
              </Camp>
              <Fortalesa contrasenya={contrasenya} repeteix={repeteix} />
            </fieldset>
            <p className="apagat">
              {t("Guarda bé la contrasenya. Per seguretat, no es pot recuperar: només es pot restablir des de l'ordinador on hi ha instal·lat el programa.")}
            </p>
          </div>
        )}

        {pas === PAS_PERSONES && (
          <PasPersones
            persones={e.persones}
            usuariAdmin={e.admin.usuari}
            onCanvia={canviaPersona}
            onAfegeix={() =>
              setE((x) => {
                const usats = new Set(x.persones.map((p) => p.carrec));
                const carrec = (CARRECS.find((c) => c.valor !== 'altres' && !usats.has(c.valor))?.valor ?? 'vocal') as Carrec;
                return { ...x, persones: [...x.persones, { ...novaPersona(), carrec, rol: rolDeCarrec(carrec) }] };
              })
            }
            onTreu={(id) => setE((x) => ({ ...x, persones: x.persones.filter((p) => p.id !== id) }))}
          />
        )}

        {pas === PAS_RESUM && <PasResum e={e} onVesA={vesA} />}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {errorAdmin && (
          <p className="apagat">
            {t("Si el programa ja estava configurat,")}{' '}
            <button type="button" className="enllac" onClick={onEntrat}>
              {t("ves a l'inici de sessió")}
            </button>
            .
          </p>
        )}

        <div className="assistent-botons">
          {pas > 0 && (
            <button type="button" className="boto boto-secundari" onClick={() => vesA(pas - 1)}>
              {t("Enrere")}
            </button>
          )}
          <span className="espai" />
          <button className="boto">
            {pas === 0
              ? t("Comencem")
              : pas === PAS_RESUM
                ? t("Comença")
                : pas === PAS_PERSONES && !e.persones.length
                  ? t("Salta aquest pas")
                  : t("Següent")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Indicador de passos ----------

function Passos({ actual, onVesA }: { actual: number; onVesA: (n: number) => void }) {
  return (
    <nav aria-label={t("Passos de la configuració")}>
      <p className="assistent-comptador">{t("Pas {0} de {1}", actual + 1, PASSOS.length)}</p>
      <ol className="assistent-passos">
        {PASSOS.map((nom, i) => (
          <li key={i} className={i === actual ? 'actual' : i < actual ? 'fet' : ''} aria-current={i === actual ? 'step' : undefined}>
            {i < actual ? (
              <button type="button" onClick={() => onVesA(i)} title={nom}>
                <span className="assistent-num" aria-hidden="true">✓</span>
                <span className="assistent-nom-pas">{nom}</span>
              </button>
            ) : (
              <span className="assistent-pas">
                <span className="assistent-num" aria-hidden="true">{i + 1}</span>
                <span className="assistent-nom-pas">{nom}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ---------- Passos ----------

function PasBenvinguda() {
  return (
    <div className="assistent-cos">
      <p>
        {t("Aquest programa ajuda les associacions a portar els socis, les quotes, la comptabilitat, les activitats i la web, tot en un sol lloc i sense dependre de ningú.")}
      </p>
      <p>{t("En uns minuts deixarem preparat el més bàsic:")}</p>
      <ul className="assistent-llista">
        <li>{t("acceptar les condicions d'ús;")}</li>
        <li>{t("les dades de l'entitat;")}</li>
        <li>{t("el teu usuari d'administració;")}</li>
        <li>{t("si vols, els usuaris de les persones de la junta.")}</li>
      </ul>
      <p className="apagat">{t("Tota la resta (finalitats, quotes, comptes, correu…) es configura després a Configuració.")}</p>
      <div className="camp">
        <span className="camp-etiqueta">{t("Idioma")}</span>
        <div className="assistent-idioma">
          <SelectorIdioma />
        </div>
        <span className="camp-ajuda">{t("Cada persona el podrà canviar després des del menú.")}</span>
      </div>
    </div>
  );
}

function PasEntitat(props: {
  entitat: DadesEntitat;
  set: (k: keyof DadesEntitat) => (ev: { target: { value: string } }) => void;
  setLogo: (logo: string) => void;
  onError: (e: string | null) => void;
}) {
  const { entitat: f, set } = props;
  async function triaLogo(ev: { target: HTMLInputElement }) {
    const fitxer = ev.target.files?.[0];
    ev.target.value = '';
    if (!fitxer) return;
    try {
      props.setLogo(await redueixImatge(fitxer, 256, 256, 0.9));
      props.onError(null);
    } catch (err) {
      props.onError(missatge(err));
    }
  }
  return (
    <div className="assistent-cos">
      <p className="apagat">{t("Només el nom curt és obligatori. La resta es pot completar més endavant a Configuració.")}</p>
      <fieldset>
        <legend>{t("Identificació")}</legend>
        <Camp etiqueta={t("Nom curt")} ajuda={t("Com es coneix l'entitat. Surt al menú i als documents.")}>
          <input id="as-nom" value={f.nom} onChange={set('nom')} required />
        </Camp>
        <Camp etiqueta={t("Denominació completa")} ajuda={t("La que figura als estatuts")}>
          <input id="as-nom-complet" value={f.nom_complet} onChange={set('nom_complet')} />
        </Camp>
        <Camp etiqueta="NIF">
          <input id="as-nif" value={f.nif} onChange={set('nif')} placeholder="G00000000" autoCapitalize="characters" />
        </Camp>
        <Camp etiqueta={t("Idioma del programa")} ajuda={t("Per defecte, per a tots els usuaris")}>
          <select id="as-idioma" value={f.idioma || 'ca'} onChange={set('idioma')}>
            {opcionsIdioma().map((o) => (
              <option key={o.codi} value={o.codi}>
                {o.nom}
              </option>
            ))}
          </select>
        </Camp>
      </fieldset>
      <fieldset>
        <legend>{t("Adreça i contacte")}</legend>
        <Camp etiqueta={t("Domicili social")} ample>
          <input id="as-adreca" value={f.adreca} onChange={set('adreca')} autoComplete="street-address" />
        </Camp>
        <Camp etiqueta={t("Població")}>
          <input id="as-poblacio" value={f.poblacio} onChange={set('poblacio')} autoComplete="address-level2" />
        </Camp>
        <Camp etiqueta={t("Codi postal")}>
          <input id="as-cp" value={f.codi_postal} onChange={set('codi_postal')} inputMode="numeric" autoComplete="postal-code" />
        </Camp>
        <Camp etiqueta={t("Correu electrònic")}>
          <input id="as-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" />
        </Camp>
        <Camp etiqueta={t("Telèfon")}>
          <input id="as-telefon" type="tel" value={f.telefon} onChange={set('telefon')} autoComplete="tel" />
        </Camp>
        <Camp etiqueta={t("Web")}>
          <input id="as-web" value={f.web} onChange={set('web')} placeholder="https://" inputMode="url" />
        </Camp>
      </fieldset>
      <fieldset>
        <legend>{t("Logotip (opcional)")}</legend>
        <div className="camp-foto">
          {f.logo ? <img src={f.logo} alt={t("Logotip")} className="logo-config" /> : <div className="logo-config foto-buida">{t("Sense logotip")}</div>}
          <div className="camp-foto-accions">
            <label className="boto boto-petit boto-secundari">
              {f.logo ? t("Canvia el logotip") : t("Puja el logotip")}
              <input type="file" accept="image/*" onChange={triaLogo} className="assistent-fitxer" />
            </label>
            {f.logo && (
              <button type="button" className="boto boto-petit boto-perill" onClick={() => props.setLogo('')}>
                {t("Treu el logotip")}
              </button>
            )}
            <span className="camp-ajuda">{t("Es retalla en quadrat.")}</span>
          </div>
        </div>
      </fieldset>
    </div>
  );
}

function Fortalesa({ contrasenya, repeteix }: { contrasenya: string; repeteix: string }) {
  if (!contrasenya) return null;
  const f = fortalesa(contrasenya);
  const textos = [t("Massa curta (mínim 8 caràcters)"), t("Feble: fes-la més llarga o barreja-hi números i majúscules"), t("Acceptable"), t("Forta")];
  return (
    <div className="camp camp-ample assistent-fortalesa" aria-live="polite">
      <span className={`assistent-barra nivell-${f}`} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="camp-ajuda">{textos[f]}</span>
      {repeteix && repeteix !== contrasenya && <span className="error">{t("Les contrasenyes no coincideixen.")}</span>}
    </div>
  );
}

function PasPersones(props: {
  persones: Persona[];
  usuariAdmin: string;
  onCanvia: (id: string, canvi: Partial<Persona>) => void;
  onAfegeix: () => void;
  onTreu: (id: string) => void;
}) {
  const { persones } = props;
  const ocupats = (excepte: string) => [props.usuariAdmin, ...persones.filter((p) => p.id !== excepte).map((p) => p.usuari)].filter(Boolean);
  const repetit = (p: Persona) =>
    Boolean(p.usuari.trim()) && ocupats(p.id).some((u) => u.trim().toLowerCase() === p.usuari.trim().toLowerCase());
  return (
    <div className="assistent-cos">
      <p>
        {t("Opcional. Crea ara els usuaris de les persones que faran servir el programa (presidència, secretaria, tresoreria…). Cadascú només veurà les parts que li toquen segons el perfil.")}
      </p>
      <p className="apagat">{t("També ho pots fer més endavant a Configuració → Usuaris. Al final et mostrarem les contrasenyes inicials per donar-les a cada persona.")}</p>
      {persones.map((p, i) => (
        <fieldset key={p.id} className="assistent-persona">
          <legend>{p.nom.trim() || t("Persona {0}", i + 1)}</legend>
          <Camp etiqueta={t("Nom i llinatges")}>
            <input
              id={`as-p-nom-${i}`}
              value={p.nom}
              autoFocus={!p.nom}
              onChange={(ev) => {
                const nom = ev.target.value;
                props.onCanvia(p.id, p.usuariEditat ? { nom } : { nom, usuari: suggereixUsuari(nom, ocupats(p.id)) });
              }}
            />
          </Camp>
          <Camp etiqueta={t("Càrrec")}>
            <select
              id={`as-p-carrec-${i}`}
              value={p.carrec}
              onChange={(ev) => {
                const carrec = ev.target.value as Carrec;
                props.onCanvia(p.id, { carrec, rol: rolDeCarrec(carrec) });
              }}
            >
              {CARRECS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.nom}
                </option>
              ))}
            </select>
          </Camp>
          <Camp etiqueta={t("Nom d'usuari")} ajuda={repetit(p) ? undefined : t("Suggerit a partir del nom; el pots canviar")}>
            <input
              id={`as-p-usuari-${i}`}
              value={p.usuari}
              autoCapitalize="none"
              aria-invalid={repetit(p) || undefined}
              onChange={(ev) => props.onCanvia(p.id, { usuari: ev.target.value, usuariEditat: true })}
            />
            {repetit(p) && <span className="error">{t("Aquest nom d'usuari ja el fa servir una altra persona.")}</span>}
          </Camp>
          <Camp etiqueta={t("Contrasenya inicial")} grup>
            <div className="assistent-contrasenya">
              <input
                id={`as-p-contrasenya-${i}`}
                value={p.contrasenya}
                aria-label={t("Contrasenya inicial")}
                autoComplete="off"
                spellCheck={false}
                onChange={(ev) => props.onCanvia(p.id, { contrasenya: ev.target.value })}
              />
              <button type="button" className="boto boto-petit boto-secundari" onClick={() => props.onCanvia(p.id, { contrasenya: generaContrasenya() })}>
                {t("Genera'n una")}
              </button>
            </div>
            {p.contrasenya.length < MIN_CONTRASENYA && <span className="error">{t("Almenys 8 caràcters")}</span>}
          </Camp>
          <Camp etiqueta={t("Perfil")} ample ajuda={t(PERFILS[p.rol].descripcio)}>
            <select id={`as-p-rol-${i}`} value={p.rol} onChange={(ev) => props.onCanvia(p.id, { rol: ev.target.value as Rol })}>
              {ROLS.map((r) => (
                <option key={r} value={r}>
                  {nomPerfil(r)}
                </option>
              ))}
            </select>
          </Camp>
          <div className="camp-ample assistent-treu">
            <button type="button" className="boto boto-petit boto-perill" onClick={() => props.onTreu(p.id)}>
              {t("Treu aquesta persona")}
            </button>
          </div>
        </fieldset>
      ))}
      {!persones.length && <p className="buit">{t("Encara no has afegit ningú. Pots saltar aquest pas.")}</p>}
      <div>
        <button type="button" className="boto boto-secundari" onClick={props.onAfegeix}>
          {t("+ Afegeix una persona")}
        </button>
      </div>
    </div>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  if (children === '' || children === null || children === undefined) return null;
  return (
    <>
      <dt>{etiqueta}</dt>
      <dd>{children}</dd>
    </>
  );
}

function PasResum({ e, onVesA }: { e: EstatAssistent; onVesA: (n: number) => void }) {
  const f = e.entitat;
  const adreca = [f.adreca, [f.codi_postal, f.poblacio].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const Modifica = ({ pas }: { pas: number }) => (
    <button type="button" className="enllac" onClick={() => onVesA(pas)}>
      {t("Modifica")}
    </button>
  );
  return (
    <div className="assistent-cos">
      <p>{t("Revisa-ho tot. En prémer «Comença» es crearan l'entitat i els usuaris.")}</p>
      <section className="assistent-resum">
        <header>
          <h2>{t("L'entitat")}</h2>
          <Modifica pas={2} />
        </header>
        <div className="assistent-resum-entitat">
          {f.logo && <img src={f.logo} alt={t("Logotip")} className="logo-config" />}
          <dl>
            <Fila etiqueta={t("Nom curt")}>{f.nom}</Fila>
            <Fila etiqueta={t("Denominació completa")}>{f.nom_complet}</Fila>
            <Fila etiqueta="NIF">{f.nif}</Fila>
            <Fila etiqueta={t("Domicili social")}>{adreca}</Fila>
            <Fila etiqueta={t("Correu electrònic")}>{f.email}</Fila>
            <Fila etiqueta={t("Telèfon")}>{f.telefon}</Fila>
            <Fila etiqueta={t("Web")}>{f.web}</Fila>
            <Fila etiqueta={t("Idioma del programa")}>{nomIdioma(f.idioma || 'ca')}</Fila>
          </dl>
        </div>
      </section>
      <section className="assistent-resum">
        <header>
          <h2>{t("Administració")}</h2>
          <Modifica pas={3} />
        </header>
        <dl>
          <Fila etiqueta={t("Nom i llinatges")}>{e.admin.nom}</Fila>
          <Fila etiqueta={t("Nom d'usuari")}>{e.admin.usuari}</Fila>
        </dl>
      </section>
      <section className="assistent-resum">
        <header>
          <h2>{t("Persones clau")}</h2>
          <Modifica pas={PAS_PERSONES} />
        </header>
        {e.persones.length ? (
          <ul className="assistent-persones-resum">
            {e.persones.map((p) => (
              <li key={p.id}>
                <strong>{p.nom}</strong> · {nomCarrec(p.carrec)}
                <br />
                <span className="apagat">
                  {t("Usuari")}: {p.usuari} · {t("Perfil")}: {nomPerfil(p.rol)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="apagat">{t("Cap. Els podràs crear més endavant a Configuració → Usuaris.")}</p>
        )}
      </section>
      <p className="assistent-acceptada">
        ✓ {t("Condicions d'ús acceptades")}{' '}
        <button type="button" className="enllac" onClick={() => onVesA(1)}>
          {t("Torna-les a llegir")}
        </button>
      </p>
    </div>
  );
}
