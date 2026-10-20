// Pestanya «Reunions»: llista de reunions dels òrgans i formulari d'alta o modificació.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { avui, data } from '../../format';
import { t } from '../../i18n';
import { Buit, Camp, Carregant, Modal, avisa } from '../ui';
import { CLASSE_ESTAT, ESTATS_REUNIO, ORGANS, TIPUS_REUNIO, titolReunio } from './comuns';
import type { ConfigGov, DetallReunio, Reunio, ReunioLlista } from './comuns';
import { DetallReunioVista } from './DetallReunio';

const diesEntre = (de: string, a: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000);

export function AvisAntelacio({ a }: { a: Reunio['antelacio'] }) {
  if (!a) return null;
  return (
    <p className="gov-avis" role="alert">
      {a.convocada
        ? t("La convocatòria es va fer amb {0} dies d'antelació; els estatuts en demanen com a mínim {1}.", a.dies, a.minim)
        : t("Només queden {0} dies fins a la reunió: la convocatòria no arribaria als {1} dies d'antelació mínims.", a.dies, a.minim)}
    </p>
  );
}

export function Reunions({ config }: { config: ConfigGov | null }) {
  const [any, setAny] = useState('');
  const [organ, setOrgan] = useState('');
  const [editant, setEditant] = useState<Partial<Reunio> | null>(null);
  const [obert, setObert] = useState<number | null>(null);
  const params = new URLSearchParams();
  if (any) params.set('any', any);
  if (organ) params.set('organ', organ);
  const { data: llista, error, reload } = useApi<ReunioLlista[]>(`/governanca/reunions?${params}`);

  if (obert)
    return (
      <DetallReunioVista
        id={obert}
        config={config}
        onTorna={() => {
          setObert(null);
          reload();
        }}
      />
    );

  const anyActual = new Date().getFullYear();
  const anys = Array.from({ length: 6 }, (_, i) => String(anyActual + 1 - i));

  return (
    <>
      <div className="filtres">
        <select aria-label={t("Any")} value={any} onChange={(e) => setAny(e.target.value)}>
          <option value="">{t("Tots els anys")}</option>
          {anys.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select aria-label={t("Òrgan")} value={organ} onChange={(e) => setOrgan(e.target.value)}>
          <option value="">{t("Tots els òrgans")}</option>
          {Object.entries(ORGANS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span className="espai" />
        <button className="boto" onClick={() => setEditant({ organ: 'assemblea', tipus: 'ordinaria', estat: 'prevista', ordre_dia: [] })}>
          {t("+ Nova reunió")}
        </button>
      </div>
      {!llista ? (
        <Carregant error={error} />
      ) : llista.length === 0 ? (
        <Buit>{t("No hi ha cap reunió registrada.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Data")}</th>
                <th>{t("Reunió")}</th>
                <th className="opcional">{t("Lloc")}</th>
                <th>{t("Estat")}</th>
                <th className="num">{t("Assistents")}</th>
                <th className="num">{t("Acords")}</th>
                <th>{t("Acta")}</th>
              </tr>
            </thead>
            <tbody>
              {llista.map((r) => (
                <tr key={r.id} onClick={() => setObert(r.id)}>
                  <td className="nowrap">
                    {data(r.data)} {r.hora_1a && <span className="apagat petit">{r.hora_1a}</span>}
                  </td>
                  <td>
                    {titolReunio(r)}
                    {r.antelacio && <div className="petit negatiu">{t("Antelació insuficient ({0} dies)", r.antelacio.dies)}</div>}
                  </td>
                  <td className="opcional">{r.lloc}</td>
                  <td>
                    <span className={`insignia ${CLASSE_ESTAT[r.estat]}`}>{ESTATS_REUNIO[r.estat]}</span>
                  </td>
                  <td className="num">{r.n_assistents || ''}</td>
                  <td className="num">{r.n_acords || ''}</td>
                  <td className="nowrap">
                    {r.acta_id ? (
                      <>
                        {r.acta_numero}/{r.data.slice(0, 4)}{' '}
                        <span className={`insignia ${r.acta_tancada ? 'insignia-pagada' : 'insignia-pendent'}`}>
                          {r.acta_tancada ? t("Aprovada") : t("Esborrany")}
                        </span>
                      </>
                    ) : r.estat === 'celebrada' ? (
                      <span className="apagat petit">{t("Sense acta")}</span>
                    ) : (
                      ''
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editant && (
        <FormReunio
          inicial={editant}
          config={config}
          onClose={() => setEditant(null)}
          onFet={(r) => {
            setEditant(null);
            setObert(r.id);
          }}
        />
      )}
    </>
  );
}

export function FormReunio(props: {
  inicial: Partial<Reunio>;
  config: ConfigGov | null;
  onClose: () => void;
  onFet: (r: DetallReunio) => void;
}) {
  const d = props.inicial;
  const [f, setF] = useState({
    organ: d.organ ?? 'assemblea',
    tipus: d.tipus ?? 'ordinaria',
    titol: d.titol ?? '',
    data: d.data ?? '',
    hora_1a: d.hora_1a ?? '',
    hora_2a: d.hora_2a ?? '',
    lloc: d.lloc ?? '',
    estat: d.estat ?? 'prevista',
    data_convocatoria: d.data_convocatoria ?? '',
    convocatoria_celebrada: d.convocatoria_celebrada ?? '',
    ordre_dia: (d.ordre_dia ?? []).join('\n'),
    notes: d.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  // Avís d'antelació mentre s'omple el formulari (només per a l'assemblea).
  const minim = props.config?.gov_dies_convocatoria ?? 15;
  const des = f.data_convocatoria || (f.estat === 'prevista' ? avui() : '');
  const dies = f.organ === 'assemblea' && f.data && des && f.estat !== 'anullada' && f.estat !== 'celebrada' ? diesEntre(des, f.data) : null;

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      const cos = { ...f, ordre_dia: f.ordre_dia.split('\n') };
      const r = d.id ? await api.put<DetallReunio>(`/governanca/reunions/${d.id}`, cos) : await api.post<DetallReunio>('/governanca/reunions', cos);
      avisa(t("Reunió desada."));
      if (r.antelacio) avisa(t("Atenció: la convocatòria no arriba als {0} dies d'antelació.", r.antelacio.minim), 'error');
      props.onFet(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={d.id ? t("Modifica la reunió") : t("Nova reunió")} onClose={props.onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Òrgan")}>
          <select value={f.organ} onChange={set('organ')}>
            {Object.entries(ORGANS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Tipus")}>
          <select value={f.tipus} onChange={set('tipus')}>
            {Object.entries(TIPUS_REUNIO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        {f.organ === 'comissio' && (
          <Camp etiqueta={t("Nom de la comissió")} ample>
            <input value={f.titol} onChange={set('titol')} />
          </Camp>
        )}
        <Camp etiqueta={t("Data")}>
          <input type="date" value={f.data} onChange={set('data')} required />
        </Camp>
        <Camp etiqueta={t("Lloc")}>
          <input value={f.lloc} onChange={set('lloc')} />
        </Camp>
        <Camp etiqueta={t("Hora (1a convocatòria)")}>
          <input type="time" value={f.hora_1a} onChange={set('hora_1a')} />
        </Camp>
        <Camp etiqueta={t("Hora (2a convocatòria)")}>
          <input type="time" value={f.hora_2a} onChange={set('hora_2a')} />
        </Camp>
        <Camp etiqueta={t("Estat")}>
          <select value={f.estat} onChange={set('estat')}>
            {Object.entries(ESTATS_REUNIO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Data de convocatòria")} ajuda={t("S'omple sola en enviar la convocatòria")}>
          <input type="date" value={f.data_convocatoria} onChange={set('data_convocatoria')} />
        </Camp>
        {f.estat === 'celebrada' && (
          <Camp etiqueta={t("Es va celebrar en")}>
            <select value={f.convocatoria_celebrada} onChange={set('convocatoria_celebrada')}>
              <option value="">—</option>
              <option value="1a">{t("Primera convocatòria")}</option>
              <option value="2a">{t("Segona convocatòria")}</option>
            </select>
          </Camp>
        )}
        <Camp etiqueta={t("Ordre del dia")} ajuda={t("Un punt per línia")} ample>
          <textarea rows={6} value={f.ordre_dia} onChange={set('ordre_dia')} />
        </Camp>
        <Camp etiqueta={t("Notes")} ample>
          <textarea rows={2} value={f.notes} onChange={set('notes')} />
        </Camp>
        {dies !== null && dies < minim && (
          <p className="gov-avis camp-ample">
            {t("Entre la convocatòria i la reunió hi ha {0} dies; els estatuts en demanen com a mínim {1}.", dies, minim)}
          </p>
        )}
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>
    </Modal>
  );
}
