import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../api';
import { Camp, Capcalera, Carregant, avisa, avisaError, confirma, useExercici } from '../components/ui';
import { centsAText, euros, textACents } from '../format';
import { DEMO } from '../mode';
import { useEntitat } from '../entitat';
import { Correu, Etiquetes, Finalitats, Usuaris } from './ConfiguracioAvancada';
import { Carnet } from '../components/Carnet';
import { CopiaSeguretat } from '../components/operacions/CopiaSeguretat';
import { AccesRemot } from '../components/operacions/AccesRemot';
import type { PlantillaCarnet } from '../components/Carnet';
import { PLANTILLA, redueixImatge } from '../imatges';
import type { Categoria, Compte, Config, TipusQuota } from '../../shared/types';
import { opcionsIdioma, t } from '../i18n';

const PESTANYES = [
  { id: 'entitat', text: t("Entitat") },
  { id: 'socis', text: t("Socis i carnet") },
  { id: 'economia', text: t("Quotes i comptes") },
  { id: 'correu', text: t("Correu") },
  { id: 'usuaris', text: t("Usuaris") },
  { id: 'copia', text: t("Còpia de seguretat") },
  { id: 'remot', text: t("Accés remot") },
] as const;
type Pestanya = (typeof PESTANYES)[number]['id'];

export default function Configuracio() {
  const { pot } = useEntitat();
  // Sense accés a la configuració, només es pot canviar la pròpia contrasenya.
  const visibles = PESTANYES.filter((p) => (pot('config') || p.id === 'usuaris') && (!DEMO || (p.id !== 'copia' && p.id !== 'remot')));
  const [pestanya, setPestanya] = useState<Pestanya>(visibles[0].id);
  return (
    <>
      <Capcalera titol={t("Configuració")} subtitol={t("Tot el que és propi de l'entitat es configura aquí")} />
      <div className="pestanyes" role="tablist">
        {visibles.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestanya === p.id}
            className={pestanya === p.id ? 'actiu' : ''}
            onClick={() => setPestanya(p.id)}
          >
            {p.text}
          </button>
        ))}
      </div>
      {pestanya === 'entitat' && (
        <>
          <DadesEntitat />
          <Finalitats />
        </>
      )}
      {pestanya === 'socis' && (
        <>
          <Etiquetes />
          <PlantillaDelCarnet />
        </>
      )}
      {pestanya === 'economia' && (
        <>
          <TipusQuotes />
          <Comptes />
          <Categories />
        </>
      )}
      {pestanya === 'correu' && <Correu />}
      {pestanya === 'usuaris' && <Usuaris />}
      {pestanya === 'copia' && <CopiaSeguretat />}
      {pestanya === 'remot' && <AccesRemot />}
    </>
  );
}

function DadesEntitat() {
  const { recarrega } = useEntitat();
  const { data: config, error } = useApi<Config>('/config');
  const [f, setF] = useState<Config | null>(null);
  useEffect(() => setF(config), [config]);
  if (!f) return <Carregant error={error} />;
  const set = (k: keyof Config) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function desa(e: FormEvent) {
    e.preventDefault();
    try {
      setF(await api.put<Config>('/config', f));
      recarrega();
      avisa(t("Dades de l'entitat desades."));
    } catch (err) {
      avisaError(err);
    }
  }

  async function triaLogo(e: { target: HTMLInputElement }) {
    const fitxer = e.target.files?.[0];
    e.target.value = '';
    if (!fitxer || !f) return;
    try {
      // Quadrat i petit: es mostra al menú, al carnet i als documents.
      setF({ ...f, logo: await redueixImatge(fitxer, 256, 256, 0.9) });
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <form className="formulari targeta" onSubmit={desa}>
      <h2 className="camp-ample">{t("Dades de l'entitat")}</h2>
      <div className="camp-foto camp-ample">
        {f.logo ? <img src={f.logo} alt={t("Logotip")} className="logo-config" /> : <div className="logo-config foto-buida">{t("Sense logotip")}</div>}
        <div className="camp-foto-accions">
          <label className="boto boto-petit boto-secundari">
            {f.logo ? t("Canvia el logotip") : t("Puja el logotip")}
            <input type="file" accept="image/*" onChange={triaLogo} hidden />
          </label>
          {f.logo && (
            <button type="button" className="boto boto-petit boto-perill" onClick={() => setF({ ...f, logo: '' })}>
              {t("Treu el logotip")}
            </button>
          )}
          <span className="camp-ajuda">{t("Es retalla en quadrat. Recorda desar els canvis.")}</span>
        </div>
      </div>
      <Camp etiqueta={t("Nom curt")}>
        <input id="cfg-nom" value={f.nom} onChange={set('nom')} required />
      </Camp>
      <Camp etiqueta={t("Lema")} ajuda={t("Surt sota el nom al menú")}>
        <input id="cfg-lema" value={f.lema} onChange={set('lema')} placeholder={t("p. ex. Cultura i tradició de Pollença")} />
      </Camp>
      <Camp etiqueta={t("Denominació completa")} ample>
        <input id="cfg-nom-complet" value={f.nom_complet} onChange={set('nom_complet')} />
      </Camp>
      <Camp etiqueta="NIF">
        <input id="cfg-nif" value={f.nif} onChange={set('nif')} placeholder="G00000000" />
      </Camp>
      <Camp etiqueta={t("Núm. al registre d'associacions")}>
        <input id="cfg-registre" value={f.num_registre} onChange={set('num_registre')} />
      </Camp>
      <Camp etiqueta={t("Domicili social")} ample>
        <input id="cfg-adreca" value={f.adreca} onChange={set('adreca')} />
      </Camp>
      <Camp etiqueta={t("Població")} ajuda={t("Valor per defecte als socis nous")}>
        <input id="cfg-poblacio" value={f.poblacio} onChange={set('poblacio')} />
      </Camp>
      <Camp etiqueta={t("Codi postal")} ajuda={t("Valor per defecte als socis nous")}>
        <input id="cfg-cp" value={f.codi_postal} onChange={set('codi_postal')} />
      </Camp>
      <Camp etiqueta={t("Correu electrònic")}>
        <input id="cfg-email" type="email" value={f.email} onChange={set('email')} />
      </Camp>
      <Camp etiqueta={t("Telèfon")}>
        <input id="cfg-telefon" value={f.telefon} onChange={set('telefon')} />
      </Camp>
      <Camp etiqueta={t("Web")}>
        <input id="cfg-web" value={f.web} onChange={set('web')} placeholder="https://" />
      </Camp>
      <Camp etiqueta={t('Idioma del programa')} ajuda={t("Per defecte, per a tots els usuaris (cadascú el pot canviar al menú)")}>
        <select id="cfg-idioma" value={f.idioma || 'ca'} onChange={set('idioma')}>
          {opcionsIdioma().map((o) => (
            <option key={o.codi} value={o.codi}>
              {o.nom}
            </option>
          ))}
        </select>
      </Camp>
      <Camp etiqueta={t("IBAN de l'entitat")}>
        <input id="cfg-iban" value={f.iban} onChange={set('iban')} />
      </Camp>
      <div className="formulari-peu camp-ample">
        <span className="espai" />
        <button className="boto">{t("Desa")}</button>
      </div>
    </form>
  );
}

const SOCI_EXEMPLE = {
  num_soci: 7,
  nom: t("Margalida"),
  llinatges: t("Cerdà Vives"),
  dni: '43123456X',
  data_alta: '2024-02-01',
};

function PlantillaDelCarnet() {
  const [exercici] = useExercici();
  const { data: config } = useApi<Config>('/config');
  const { data: plantilla, error, reload } = useApi<PlantillaCarnet>('/config/carnet');
  if (!plantilla) return <Carregant error={error} />;

  async function desa(cara: 'anvers' | 'revers', valor: string | null) {
    try {
      await api.put('/config/carnet', { [cara]: valor });
      avisa(valor ? t("Plantilla desada.") : t("Plantilla eliminada."));
      reload();
    } catch (err) {
      avisaError(err);
    }
  }

  async function tria(cara: 'anvers' | 'revers', e: { target: HTMLInputElement }) {
    const fitxer = e.target.files?.[0];
    e.target.value = '';
    if (!fitxer) return;
    try {
      await desa(cara, await redueixImatge(fitxer, PLANTILLA.ample, PLANTILLA.alt, 0.9));
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <section className="targeta">
      <h2>{t("Plantilla del carnet de soci")}</h2>
      <p className="apagat petit">
        {t("Imatge de fons per a cada cara del carnet, en format targeta (85,6 × 54 mm). Mida recomanada:")}{' '}
        {PLANTILLA.ample} × {PLANTILLA.alt} {t("píxels. A l'anvers, deixa lliure la franja superior per al logotip i la part de sota clara: la foto i les dades del soci s'hi imprimeixen a sobre. Si no hi ha plantilla, s'usa el disseny per defecte.")}
      </p>
      <div className="plantilla-carnet">
        <div className="carnet-previsualitzacio">
          <Carnet soci={SOCI_EXEMPLE} foto={null} config={config} plantilla={plantilla} exercici={exercici} />
        </div>
        <div className="plantilla-accions">
          {(['anvers', 'revers'] as const).map((cara) => (
            <div key={cara} className="plantilla-cara">
              <strong>{cara === 'anvers' ? t("Anvers") : t("Revers")}</strong>
              <span className="apagat petit">{plantilla[cara] ? t("Plantilla pròpia") : t("Disseny per defecte")}</span>
              <div className="accions">
                <label className="boto boto-petit">
                  {plantilla[cara] ? t("Canvia") : t("Puja una imatge")}
                  <input type="file" accept="image/*" onChange={(e) => tria(cara, e)} hidden />
                </label>
                {plantilla[cara] && (
                  <button type="button" className="boto boto-petit boto-secundari" onClick={() => desa(cara, null)}>
                    {t("Torna al disseny per defecte")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Taula amb edició en línia: cada fila té el seu propi estat i botó de desar. */
function useDesa(reload: () => void) {
  return async (fn: () => Promise<unknown>, missatge: string) => {
    try {
      await fn();
      avisa(missatge);
      reload();
      return true;
    } catch (err) {
      avisaError(err);
      return false;
    }
  };
}

function TipusQuotes() {
  const { data: tipus, error, reload } = useApi<TipusQuota[]>('/config/tipus-quota');
  const desa = useDesa(reload);
  if (!tipus) return <Carregant error={error} />;
  return (
    <section className="targeta">
      <h2>{t("Tipus de quota")}</h2>
      <p className="apagat petit">
        {t("Import anual. Els canvis s'apliquen a les quotes que es generin a partir d'ara, no a les ja generades.")}
      </p>
      <table className="taula taula-edicio">
        <thead>
          <tr>
            <th>{t("Nom")}</th>
            <th>{t("Import anual (€)")}</th>
            <th>{t("Descripció")}</th>
            <th>{t("Actiu")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tipus.map((tt) => (
            <FilaTipusQuota key={tt.id} t={tt} desa={desa} />
          ))}
          <FilaTipusQuota key={`nou-${tipus.length}`} desa={desa} />
        </tbody>
      </table>
    </section>
  );
}

function FilaTipusQuota({ t: tt, desa }: { t?: TipusQuota; desa: ReturnType<typeof useDesa> }) {
  const [nom, setNom] = useState(tt?.nom ?? '');
  const [imp, setImp] = useState(tt ? centsAText(tt.import_cents) : '');
  const [desc, setDesc] = useState(tt?.descripcio ?? '');
  const [actiu, setActiu] = useState(tt ? Boolean(tt.actiu) : true);

  function guarda() {
    const import_cents = textACents(imp);
    if (import_cents === null || import_cents < 0) return avisa(t("L'import no és vàlid."), 'error');
    const cos = { nom, import_cents, descripcio: desc, actiu };
    if (tt) desa(() => api.put(`/config/tipus-quota/${tt.id}`, cos), t("Tipus de quota desat."));
    else desa(() => api.post('/config/tipus-quota', cos), t("Tipus de quota afegit."));
  }

  return (
    <tr>
      <td>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={tt ? '' : t("Nou tipus…")} aria-label={t("Nom")} />
      </td>
      <td>
        <input inputMode="decimal" value={imp} onChange={(e) => setImp(e.target.value)} aria-label={t("Import")} className="input-import" />
      </td>
      <td>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} aria-label={t("Descripció")} />
      </td>
      <td>
        <input type="checkbox" checked={actiu} onChange={(e) => setActiu(e.target.checked)} aria-label={t("Actiu")} />
      </td>
      <td className="accions-fila">
        <button className="boto boto-petit" onClick={guarda} disabled={!nom.trim()}>
          {tt ? t("Desa") : t("Afegeix")}
        </button>
        {tt && (
          <button
            className="boto boto-petit boto-secundari"
            onClick={async () => (await confirma(t("Eliminar «{0}»?", tt.nom))) && desa(() => api.del(`/config/tipus-quota/${tt.id}`), t("Eliminat."))}
          >
            {t("Elimina")}
          </button>
        )}
      </td>
    </tr>
  );
}

function Comptes() {
  const { data: comptes, error, reload } = useApi<Compte[]>('/comptabilitat/comptes');
  const desa = useDesa(reload);
  if (!comptes) return <Carregant error={error} />;
  return (
    <section className="targeta">
      <h2>{t("Comptes de tresoreria")}</h2>
      <p className="apagat petit">
        {t("El saldo inicial és el que hi havia el dia que es va començar a usar aquesta aplicació.")}
      </p>
      <table className="taula taula-edicio">
        <thead>
          <tr>
            <th>{t("Nom")}</th>
            <th>{t("Saldo inicial (€)")}</th>
            <th>{t("Saldo actual")}</th>
            <th>{t("Actiu")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {comptes.map((c) => (
            <FilaCompte key={c.id} c={c} desa={desa} />
          ))}
          <FilaCompte key={`nou-${comptes.length}`} desa={desa} />
        </tbody>
      </table>
    </section>
  );
}

function FilaCompte({ c, desa }: { c?: Compte; desa: ReturnType<typeof useDesa> }) {
  const [nom, setNom] = useState(c?.nom ?? '');
  const [saldo, setSaldo] = useState(c ? centsAText(c.saldo_inicial_cents) : '0,00');
  const [actiu, setActiu] = useState(c ? Boolean(c.actiu) : true);

  function guarda() {
    const saldo_inicial_cents = textACents(saldo);
    if (saldo_inicial_cents === null) return avisa(t("El saldo no és vàlid."), 'error');
    const cos = { nom, saldo_inicial_cents, actiu };
    if (c) desa(() => api.put(`/comptabilitat/comptes/${c.id}`, cos), t("Compte desat."));
    else desa(() => api.post('/comptabilitat/comptes', cos), t("Compte afegit."));
  }

  return (
    <tr>
      <td>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={c ? '' : t("Nou compte…")} aria-label={t("Nom")} />
      </td>
      <td>
        <input inputMode="decimal" value={saldo} onChange={(e) => setSaldo(e.target.value)} aria-label={t("Saldo inicial")} className="input-import" />
      </td>
      <td className="num">{c ? euros(c.saldo_cents ?? 0) : ''}</td>
      <td>
        <input type="checkbox" checked={actiu} onChange={(e) => setActiu(e.target.checked)} aria-label={t("Actiu")} />
      </td>
      <td className="accions-fila">
        <button className="boto boto-petit" onClick={guarda} disabled={!nom.trim()}>
          {c ? t("Desa") : t("Afegeix")}
        </button>
        {c && (
          <button
            className="boto boto-petit boto-secundari"
            onClick={async () => (await confirma(t("Eliminar «{0}»?", c.nom))) && desa(() => api.del(`/comptabilitat/comptes/${c.id}`), t("Eliminat."))}
          >
            {t("Elimina")}
          </button>
        )}
      </td>
    </tr>
  );
}

function Categories() {
  const { data: categories, error, reload } = useApi<Categoria[]>('/comptabilitat/categories');
  const desa = useDesa(reload);
  if (!categories) return <Carregant error={error} />;
  return (
    <section className="targeta">
      <h2>{t("Categories d'ingressos i despeses")}</h2>
      <p className="apagat petit">
        {t("Una categoria amb moviments no es pot eliminar; desactiva-la perquè no surti als formularis.")}
      </p>
      <div className="graella-2">
        {(['ingres', 'despesa'] as const).map((tipus) => (
          <table key={tipus} className="taula taula-edicio">
            <thead>
              <tr>
                <th>{tipus === 'ingres' ? t("Ingressos") : t("Despeses")}</th>
                <th>{t("Activa")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories
                .filter((c) => c.tipus === tipus)
                .map((c) => (
                  <FilaCategoria key={c.id} c={c} tipus={tipus} desa={desa} />
                ))}
              <FilaCategoria key={`nou-${categories.length}`} tipus={tipus} desa={desa} />
            </tbody>
          </table>
        ))}
      </div>
    </section>
  );
}

function FilaCategoria({ c, tipus, desa }: { c?: Categoria; tipus: string; desa: ReturnType<typeof useDesa> }) {
  const [nom, setNom] = useState(c?.nom ?? '');
  const [actiu, setActiu] = useState(c ? Boolean(c.actiu) : true);
  const canviat = !c || nom !== c.nom || actiu !== Boolean(c.actiu);

  function guarda() {
    if (c) desa(() => api.put(`/comptabilitat/categories/${c.id}`, { nom, actiu }), t("Categoria desada."));
    else desa(() => api.post('/comptabilitat/categories', { nom, tipus }), t("Categoria afegida."));
  }

  return (
    <tr>
      <td>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={c ? '' : t("Nova categoria…")} aria-label={t("Nom")} />
      </td>
      <td>{c && <input type="checkbox" checked={actiu} onChange={(e) => setActiu(e.target.checked)} aria-label={t("Activa")} />}</td>
      <td className="accions-fila">
        {canviat && (
          <button className="boto boto-petit" onClick={guarda} disabled={!nom.trim()}>
            {c ? t("Desa") : t("Afegeix")}
          </button>
        )}
        {c && (
          <button
            className="boto boto-petit boto-secundari"
            onClick={async () => (await confirma(t("Eliminar «{0}»?", c.nom))) && desa(() => api.del(`/comptabilitat/categories/${c.id}`), t("Eliminada."))}
            aria-label={t("Elimina {0}", c.nom)}
          >
            ×
          </button>
        )}
      </td>
    </tr>
  );
}
