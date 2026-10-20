import { useEffect, useRef, useState } from 'react';
import { api, useApi } from '../../api';
import { Buit, Camp, Carregant, avisa, avisaError, confirma } from '../ui';
import { data } from '../../format';
import { idioma, locale, t } from '../../i18n';
import '../../styles/operacions.css';

interface InfoCopia {
  nom: string;
  data: string;
  mida: number;
  modificada: string;
}

interface EstatCopies {
  disponible: boolean;
  carpeta: string | null;
  carpeta_dades: string | null;
  darrera: InfoCopia | null;
  copies: InfoCopia[];
  error: string | null;
  externa: { carpeta: string | null; darrera: string | null; error: string | null };
  restauracio_pendent: boolean;
}

interface Verificacio {
  valida: true;
  entitat: string | null;
  inicialitzat: string | null;
  taules: { taula: string; files: number }[];
}

const NOMS_TAULES: Record<string, string> = {
  socis: t("Socis"),
  interessats: t("Persones interessades"),
  quotes: t("Quotes"),
  moviments: t("Moviments comptables"),
  activitats: t("Activitats"),
  factures: t("Factures"),
  reunions: t("Reunions"),
  web_noticies: t("Notícies de la web"),
  usuaris: t("Usuaris"),
  auditoria: t("Registre d'activitat"),
};

export function mida(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString(locale(), { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

const dataHora = (iso: string) => new Date(iso).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' });

/** Puja un fitxer en binari (les còpies poden passar del límit de les peticions JSON). */
async function pujaFitxer<T>(ruta: string, fitxer: File): Promise<T> {
  const res = await fetch('/api' + ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Idioma': idioma() },
    body: fitxer,
  });
  const cos = await res.json().catch(() => null);
  if (!res.ok) throw new Error(cos?.error ?? `Error ${res.status}`);
  return cos as T;
}

export function CopiaSeguretat() {
  const { data: estat, error, reload } = useApi<EstatCopies>('/config/copia-seguretat/estat');
  const { data: auth } = useApi<{ versio?: string | null }>('/auth/estat');
  const [fent, setFent] = useState(false);

  async function copiaAra() {
    setFent(true);
    try {
      const r = await api.post<{ nom: string; externa: { ok: boolean; error?: string } | null }>('/config/copia-seguretat/ara');
      if (r.externa && !r.externa.ok) avisa(t("Còpia feta, però no s'ha pogut desar a la carpeta externa: {0}", r.externa.error ?? ''), 'error');
      else avisa(t("Còpia feta: {0}", r.nom));
      reload();
    } catch (e) {
      avisaError(e);
    } finally {
      setFent(false);
    }
  }

  if (!estat) return <Carregant error={error} />;
  if (!estat.disponible) {
    return (
      <section className="targeta">
        <h2>{t("Còpia de seguretat")}</h2>
        <p>{t("Les còpies de seguretat no estan disponibles en aquesta versió.")}</p>
      </section>
    );
  }

  return (
    <>
      {estat.restauracio_pendent && <RestauracioPendent onCanvi={reload} />}
      <section className="targeta">
        <h2>{t("Còpia de seguretat")}</h2>
        <p>
          {t("Totes les dades es guarden en un únic fitxer en aquest ordinador. El programa en fa una còpia automàtica cada dia que s'obre i en conserva les dels darrers 7 dies i la primera de cada mes dels darrers 12 mesos. Perquè una avaria, un robatori o un virus no s'ho emportin tot, configura també una carpeta externa: un llapis USB o una carpeta sincronitzada amb el núvol (OneDrive, Google Drive…).")}
        </p>
        <dl className="op-resum">
          <div>
            <dt>{t("Darrera còpia")}</dt>
            <dd>
              {estat.darrera ? (
                <>
                  {dataHora(estat.darrera.modificada)} · {mida(estat.darrera.mida)}
                </>
              ) : (
                <span className="negatiu">{t("Encara no se n'ha fet cap.")}</span>
              )}
            </dd>
          </div>
          <div>
            <dt>{t("Carpeta de les còpies")}</dt>
            <dd>
              <code>{estat.carpeta}</code>
            </dd>
          </div>
          {auth?.versio && (
            <div>
              <dt>{t("Versió del programa")}</dt>
              <dd>{auth.versio}</dd>
            </div>
          )}
        </dl>
        {estat.error && <p className="error">{t("Error en la darrera còpia automàtica: {0}", estat.error)}</p>}
        <div className="accions-fila">
          <button type="button" className="boto" onClick={copiaAra} disabled={fent}>
            {fent ? t("Fent la còpia…") : t("Fes una còpia ara")}
          </button>
          <a className="boto boto-secundari" href="/api/config/copia-seguretat">
            {t("Descarrega una còpia de seguretat")}
          </a>
        </div>
        <p className="apagat petit">
          {t("Les còpies contenen totes les dades. Les contrasenyes guardades (correu, FTP, certificat digital, xarxes socials) hi van xifrades amb una clau que és al fitxer «clau.key» de la carpeta {0}. Per recuperar-les en un altre ordinador, guarda també una còpia d'aquest fitxer en un lloc segur i separat; si no, només caldrà tornar-les a escriure.", estat.carpeta_dades ?? '')}
        </p>
      </section>

      <CarpetaExterna estat={estat} onCanvi={reload} />
      <LlistaCopies copies={estat.copies} />
      <Restaura pendent={estat.restauracio_pendent} onCanvi={reload} />
    </>
  );
}

function CarpetaExterna({ estat, onCanvi }: { estat: EstatCopies; onCanvi: () => void }) {
  const [carpeta, setCarpeta] = useState(estat.externa.carpeta ?? '');
  useEffect(() => setCarpeta(estat.externa.carpeta ?? ''), [estat.externa.carpeta]);

  async function prova() {
    try {
      await api.post('/config/copia-seguretat/carpeta-externa/prova', { carpeta });
      avisa(t("La carpeta és accessible i s'hi pot escriure."));
    } catch (e) {
      avisaError(e);
    }
  }

  // Google Drive, OneDrive o Dropbox sincronitzats en aquest ordinador.
  const { data: nuvol } = useApi<{ servei: string; arrel: string; proposta: string }[]>('/config/copia-seguretat/carpetes-nuvol');
  async function usaNuvol(arrel: string, servei: string) {
    try {
      const r = await api.post<{ carpeta: string }>('/config/copia-seguretat/carpeta-nuvol', { arrel });
      setCarpeta(r.carpeta);
      avisa(t("Les còpies es desaran també a {0} ({1}).", servei, r.carpeta));
      onCanvi();
    } catch (e) {
      avisaError(e);
    }
  }

  async function desa() {
    try {
      await api.put('/config/copia-seguretat/carpeta-externa', { carpeta });
      avisa(carpeta ? t("Carpeta externa desada. La propera còpia s'hi desarà també.") : t("Carpeta externa eliminada."));
      onCanvi();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <section className="targeta">
      <h2>{t("Carpeta externa")}</h2>
      <p className="apagat petit">
        {t("Cada còpia diària es desa també en aquesta carpeta. Escriu la ruta completa, per exemple «E:\\Còpies» (llapis USB) o «C:\\Users\\nom\\OneDrive\\Associació\\Còpies» (carpeta sincronitzada amb el núvol).")}
      </p>
      {nuvol && nuvol.length > 0 ? (
        <div className="op-nuvol">
          <p className="petit">{t("Hem trobat aquestes carpetes sincronitzades amb el núvol en aquest ordinador. Amb un clic, cada còpia diària es desarà també al núvol:")}</p>
          <div className="accions-fila">
            {nuvol.map((c) => (
              <button key={c.arrel} type="button" className="boto boto-secundari" title={c.proposta} onClick={() => usaNuvol(c.arrel, c.servei)}>
                {t("Desa-les a {0}", c.servei)} <span className="apagat petit">({c.arrel})</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        nuvol && (
          <p className="apagat petit">
            {t("Per desar les còpies a Google Drive, instal·la «Google Drive per a ordinadors» (google.com/drive/download) i inicia-hi sessió amb el compte de l'entitat; després torna aquí i apareixerà un botó per fer-ho servir.")}
          </p>
        )
      )}
      <div className="op-carpeta">
        <Camp etiqueta={t("Ruta de la carpeta")}>
          <input value={carpeta} onChange={(e) => setCarpeta(e.target.value)} placeholder="E:\Copies" />
        </Camp>
        <div className="accions-fila">
          <button type="button" className="boto boto-secundari" onClick={prova} disabled={!carpeta.trim()}>
            {t("Prova")}
          </button>
          <button type="button" className="boto" onClick={desa}>
            {t("Desa")}
          </button>
        </div>
      </div>
      {estat.externa.carpeta && estat.externa.error && (
        <p className="error">{t("La darrera còpia no s'ha pogut desar a la carpeta externa: {0}", estat.externa.error)}</p>
      )}
      {estat.externa.carpeta && !estat.externa.error && estat.externa.darrera && (
        <p className="apagat petit">{t("Darrera còpia a la carpeta externa: {0}", dataHora(estat.externa.darrera))}</p>
      )}
    </section>
  );
}

function LlistaCopies({ copies }: { copies: InfoCopia[] }) {
  const [verificacio, setVerificacio] = useState<{ nom: string; r: Verificacio } | null>(null);

  async function verifica(nom: string) {
    try {
      setVerificacio({ nom, r: await api.post<Verificacio>(`/config/copia-seguretat/copies/${encodeURIComponent(nom)}/verifica`) });
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <section className="targeta">
      <h2>{t("Còpies guardades en aquest ordinador")}</h2>
      {copies.length === 0 ? (
        <Buit>{t("Encara no hi ha cap còpia.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-compacta">
            <thead>
              <tr>
                <th>{t("Data")}</th>
                <th>{t("Fitxer")}</th>
                <th className="num">{t("Mida")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {copies.map((c) => (
                <tr key={c.nom}>
                  <td className="nowrap">{data(c.data)}</td>
                  <td>
                    <code>{c.nom}</code>
                  </td>
                  <td className="num nowrap">{mida(c.mida)}</td>
                  <td className="nowrap op-accions">
                    <button type="button" className="boto boto-petit boto-secundari" onClick={() => verifica(c.nom)}>
                      {t("Verifica")}
                    </button>
                    <a className="boto boto-petit boto-secundari" href={`/api/config/copia-seguretat/copies/${encodeURIComponent(c.nom)}`}>
                      {t("Descarrega")}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {verificacio && <ResultatVerificacio titol={verificacio.nom} r={verificacio.r} />}
    </section>
  );
}

function ResultatVerificacio({ titol, r }: { titol: string; r: Verificacio }) {
  return (
    <div className="op-verificacio" role="status">
      <p>
        <strong className="positiu">{t("Còpia correcta")}</strong> · {titol}
        {r.entitat ? ` · ${r.entitat}` : ''}
      </p>
      <ul>
        {r.taules.map((tb) => (
          <li key={tb.taula}>
            {NOMS_TAULES[tb.taula] ?? tb.taula}: <strong>{tb.files.toLocaleString(locale())}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Restaura({ pendent, onCanvi }: { pendent: boolean; onCanvi: () => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [fitxer, setFitxer] = useState<File | null>(null);
  const [verificacio, setVerificacio] = useState<Verificacio | null>(null);
  const [ocupat, setOcupat] = useState(false);

  async function verifica() {
    if (!fitxer) return;
    setOcupat(true);
    try {
      setVerificacio(await pujaFitxer<Verificacio>('/config/copia-seguretat/verifica', fitxer));
    } catch (e) {
      setVerificacio(null);
      avisaError(e);
    } finally {
      setOcupat(false);
    }
  }

  async function restaura() {
    if (!fitxer) return;
    const ok = await confirma(
      t("Es substituiran TOTES les dades actuals per les de la còpia «{0}» quan es reiniciï el programa. Les dades actuals es conservaran en un fitxer a part. Vols continuar?", fitxer.name),
    );
    if (!ok) return;
    setOcupat(true);
    try {
      await pujaFitxer<Verificacio>('/config/copia-seguretat/restaura', fitxer);
      avisa(t("Còpia preparada: es restaurarà en reiniciar el programa."));
      setFitxer(null);
      setVerificacio(null);
      if (entrada.current) entrada.current.value = '';
      onCanvi();
    } catch (e) {
      avisaError(e);
    } finally {
      setOcupat(false);
    }
  }

  return (
    <section className="targeta">
      <h2>{t("Restaurar una còpia")}</h2>
      <p className="apagat petit">
        {t("Tria un fitxer de còpia (.db). Amb «Verifica» es comprova que és correcte i quantes dades conté, sense canviar res. Amb «Restaura» es prepara per substituir les dades actuals: es restaurarà en reiniciar el programa (tanca la finestra negra i torna a obrir Iniciar.bat).")}
      </p>
      <div className="op-carpeta">
        <Camp etiqueta={t("Fitxer de còpia")}>
          <input
            ref={entrada}
            type="file"
            accept=".db,.sqlite,application/octet-stream"
            onChange={(e) => {
              setFitxer(e.target.files?.[0] ?? null);
              setVerificacio(null);
            }}
          />
        </Camp>
        <div className="accions-fila">
          <button type="button" className="boto boto-secundari" onClick={verifica} disabled={!fitxer || ocupat}>
            {t("Verifica una còpia")}
          </button>
          <button type="button" className="boto boto-perill" onClick={restaura} disabled={!fitxer || ocupat || pendent}>
            {t("Restaura")}
          </button>
        </div>
      </div>
      {ocupat && <p className="apagat">{t("Comprovant el fitxer…")}</p>}
      {verificacio && fitxer && <ResultatVerificacio titol={fitxer.name} r={verificacio} />}
    </section>
  );
}

function RestauracioPendent({ onCanvi }: { onCanvi: () => void }) {
  async function cancella() {
    try {
      await api.del('/config/copia-seguretat/restaura');
      avisa(t("Restauració cancel·lada."));
      onCanvi();
    } catch (e) {
      avisaError(e);
    }
  }
  return (
    <div className="op-pendent" role="alert">
      <p>
        <strong>{t("Hi ha una còpia preparada per restaurar.")}</strong>{' '}
        {t("Es restaurarà en reiniciar el programa: tanca la finestra negra del programa i torna a obrir Iniciar.bat.")}
      </p>
      <button type="button" className="boto boto-petit boto-secundari" onClick={cancella}>
        {t("Cancel·la la restauració")}
      </button>
    </div>
  );
}
