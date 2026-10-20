import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../api';
import { Buit, Camp, Capcalera, avisa, avisaError, confirma, useExercici } from '../components/ui';
import { useEntitat } from '../entitat';
import { DEMO } from '../mode';
import type { Activitat } from '../../shared/types';
import { t } from '../i18n';

interface Destinataris {
  descripcio: string;
  total: number;
  exclosos: number;
  amb_correu: { id: number; nom: string; email: string }[];
  sense_correu: { id: number; nom: string }[];
  correu_configurat: boolean;
}

interface Comunicacio {
  id: number;
  data: string;
  assumpte: string;
  segment: string;
  destinataris: number;
  enviats: number;
  metode: 'correu' | 'manual';
  autor: string | null;
}

const FRANGES = [
  ['infants', t("Infants (0-13)")],
  ['joves', t("Joves (14-29)")],
  ['adults', t("Adults (30-64)")],
  ['gent_gran', t("Gent gran (65+)")],
];

/** Converteix el valor del desplegable («etiqueta:3») en el segment que entén el servidor. */
function segment(valor: string, exercici: number) {
  const [tipus, v] = valor.split(':');
  switch (tipus) {
    case 'etiqueta':
    case 'activitat':
      return { tipus, id: Number(v) };
    case 'franja':
      return { tipus, valor: v };
    case 'quota_pendent':
      return { tipus, exercici };
    default:
      return { tipus: 'tots' };
  }
}

export default function Comunicacions() {
  const [exercici] = useExercici();
  const { etiquetes } = useEntitat();
  const { data: activitats } = useApi<Activitat[]>(`/activitats?exercici=${exercici}`);
  const { data: historial, reload } = useApi<Comunicacio[]>('/crm/comunicacions');
  const [grup, setGrup] = useState('tots');
  const [assumpte, setAssumpte] = useState('');
  const [cos, setCos] = useState(t("Hola {nom},\n\n"));
  const [dest, setDest] = useState<Destinataris | null>(null);
  const [enviant, setEnviant] = useState(false);

  useEffect(() => {
    setDest(null);
    api
      .post<Destinataris>('/crm/comunicacions/destinataris', { segment: segment(grup, exercici) })
      .then(setDest)
      .catch(avisaError);
  }, [grup, exercici]);

  async function envia(metode: 'correu' | 'manual') {
    if (!assumpte.trim() || !cos.trim()) return avisa(t("Escriu l'assumpte i el missatge."), 'error');
    const n = metode === 'correu' ? dest?.amb_correu.length : dest?.total;
    const pregunta =
      metode === 'correu'
        ? t("S'enviarà el correu a {0} persones, una per una. Continuar?", n)
        : t("Es registrarà la comunicació a l'historial de {0} socis, sense enviar res. Continuar?", n);
    if (!(await confirma(pregunta))) return;
    setEnviant(true);
    try {
      const r = await api.post<{ destinataris: number; enviats: number; errors: { a: string; error?: string }[] }>(
        '/crm/comunicacions',
        { assumpte, cos, metode, segment: segment(grup, exercici) },
      );
      if (metode === 'correu') {
        avisa(t("Enviats {0} correus{1}.", r.enviats, r.errors.length ? `; ${r.errors.length} han fallat` : ''), r.errors.length ? 'error' : 'ok');
      } else avisa(t("Comunicació registrada."));
      setAssumpte('');
      setCos(t("Hola {nom},\n\n"));
      reload();
    } catch (e) {
      avisaError(e);
    } finally {
      setEnviant(false);
    }
  }

  async function copiaAdreces() {
    const adreces = dest?.amb_correu.map((d) => d.email).join(', ') ?? '';
    try {
      await navigator.clipboard.writeText(adreces);
      avisa(t("Adreces copiades. Enganxa-les al camp «Cco» del teu correu."));
    } catch {
      window.prompt(t("Copia les adreces:"), adreces);
    }
  }

  return (
    <>
      <Capcalera titol={t("Comunicacions")} subtitol={t("Correus i avisos a grups de socis")} />

      <div className="graella-comunicacio">
        <section className="targeta formulari">
          <Camp etiqueta={t("A qui va dirigit")}>
            <select id="com-grup" value={grup} onChange={(e) => setGrup(e.target.value)}>
              <option value="tots">{t("Tots els socis actius")}</option>
              {etiquetes.length > 0 && (
                <optgroup label="Etiqueta">
                  {etiquetes.map((e) => (
                    <option key={e.id} value={`etiqueta:${e.id}`}>
                      {e.nom}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Franja d'edat">
                {FRANGES.map(([v, t]) => (
                  <option key={v} value={`franja:${v}`}>
                    {t}
                  </option>
                ))}
              </optgroup>
              <option value="quota_pendent">{t("Amb la quota")} {exercici} {t("pendent")}</option>
              {activitats && activitats.length > 0 && (
                <optgroup label={t("Inscrits a una activitat ({0})", exercici)}>
                  {activitats.map((a) => (
                    <option key={a.id} value={`activitat:${a.id}`}>
                      {a.nom}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </Camp>
          <Camp etiqueta={t("Assumpte")} ample>
            <input id="com-assumpte" value={assumpte} onChange={(e) => setAssumpte(e.target.value)} placeholder={t("p. ex. Convocatòria de l'Assemblea General")} />
          </Camp>
          <Camp etiqueta={t("Missatge")} ample ajuda={t("{nom} es substitueix pel nom de cada soci.")}>
            <textarea id="com-cos" rows={10} value={cos} onChange={(e) => setCos(e.target.value)} />
          </Camp>
          <div className="formulari-peu camp-ample">
            <button type="button" className="boto boto-secundari" disabled={enviant || !dest?.total} onClick={() => envia('manual')}>
              {t("Només registra-ho")}
            </button>
            <span className="espai" />
            <button
              type="button"
              className="boto"
              disabled={enviant || !dest?.correu_configurat || !dest?.amb_correu.length || DEMO}
              onClick={() => envia('correu')}
            >
              {enviant ? t("Enviant…") : t("Envia per correu{0}", dest ? ` (${dest.amb_correu.length})` : '')}
            </button>
          </div>
          {dest && !dest.correu_configurat && (
            <p className="apagat petit camp-ample">
              {t("Per enviar correus des del programa, configura primer el compte a")} <Link to="/configuracio">{t("Configuració → Correu")}</Link>{t(". Mentrestant pots copiar les adreces i enviar-ho des del teu correu, i després prémer «Només registra-ho».")}
            </p>
          )}
        </section>

        <section className="targeta">
          <h2>{t("Destinataris")}</h2>
          {!dest ? (
            <p className="apagat">{t("Calculant…")}</p>
          ) : (
            <>
              <p>
                <strong>{dest.total}</strong> {t("socis ·")} {dest.amb_correu.length} {t("amb correu electrònic")}
              </p>
              {dest.exclosos > 0 && (
                <p className="apagat petit">
                  {dest.exclosos} {dest.exclosos === 1 ? t("soci del grup ha demanat") : t("socis del grup han demanat")} {t("no rebre comunicacions i no s'hi inclouen.")}
                </p>
              )}
              {dest.amb_correu.length > 0 && (
                <button type="button" className="boto boto-petit boto-secundari" onClick={copiaAdreces}>
                  {t("Copia les adreces")}
                </button>
              )}
              {dest.sense_correu.length > 0 && (
                <>
                  <p className="apagat petit">{t("Sense correu (caldrà avisar-los per telèfon o en persona):")}</p>
                  <ul className="llista-noms">
                    {dest.sense_correu.map((s) => (
                      <li key={s.id}>
                        <Link to={`/socis/${s.id}`}>{s.nom}</Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      </div>

      <section className="targeta">
        <h2>{t("Comunicacions enviades")}</h2>
        {!historial ? null : historial.length === 0 ? (
          <Buit>{t("Encara no s'ha enviat cap comunicació.")}</Buit>
        ) : (
          <table className="taula taula-compacta">
            <thead>
              <tr>
                <th>{t("Data")}</th>
                <th>{t("Assumpte")}</th>
                <th>{t("Grup")}</th>
                <th className="num">{t("Persones")}</th>
                <th>{t("Com")}</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((c) => (
                <tr key={c.id}>
                  <td className="nowrap">{c.data.slice(0, 10).split('-').reverse().join('/')}</td>
                  <td>{c.assumpte}</td>
                  <td>{c.segment}</td>
                  <td className="num">{c.metode === 'correu' ? `${c.enviats}/${c.destinataris}` : c.destinataris}</td>
                  <td>{c.metode === 'correu' ? t("Correu") : t("Registrada")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
