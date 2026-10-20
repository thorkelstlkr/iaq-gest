// Pestanya «Junta directiva»: composició actual, historial de càrrecs i comunicació al Registre d'Associacions.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { avui, data } from '../../format';
import { t } from '../../i18n';
import { Buit, Camp, Carregant, Modal, avisa, avisaError, confirma } from '../ui';
import { CARRECS, nomSoci, titolReunio } from './comuns';
import type { Carrec, ReunioLlista, SociGov } from './comuns';

interface CarrecFila {
  id: number;
  soci_id: number;
  carrec: Carrec;
  data_eleccio: string;
  data_fi_mandat: string | null;
  reunio_id: number | null;
  data_cessament: string | null;
  motiu_cessament: string | null;
  comunicat_registre_el: string | null;
  cessament_comunicat_el: string | null;
  notes: string | null;
  nom: string;
  llinatges: string;
  num_soci: number;
  email: string | null;
  telefon: string | null;
  data_reunio: string | null;
  vigent: number;
}

const enDies = (iso: string) => Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${avui()}T12:00:00Z`)) / 86400000);

function Mandat({ c }: { c: CarrecFila }) {
  if (!c.data_fi_mandat) return <span className="apagat">—</span>;
  const dies = enDies(c.data_fi_mandat);
  if (c.vigent && dies < 0)
    return (
      <span className="negatiu" title={t("El càrrec continua en funcions fins que se n'elegeixi un altre")}>
        {data(c.data_fi_mandat)} · {t("vençut")}
      </span>
    );
  if (c.vigent && dies <= 60) return <span className="negatiu">{data(c.data_fi_mandat)} · {t("d'aquí a {0} dies", dies)}</span>;
  return <>{data(c.data_fi_mandat)}</>;
}

export function Junta() {
  const { pot } = useEntitat();
  const potEditar = pot('socis');
  const { data: carrecs, error, reload } = useApi<CarrecFila[]>('/governanca/carrecs');
  const [editant, setEditant] = useState<Partial<CarrecFila> | null>(null);

  if (!carrecs) return <Carregant error={error} />;
  const vigents = carrecs.filter((c) => c.vigent);
  const historial = carrecs.filter((c) => !c.vigent);

  async function marcaComunicat(c: CarrecFila, camp: 'comunicat_registre_el' | 'cessament_comunicat_el') {
    if (!(await confirma(t("Vols registrar que avui s'ha comunicat aquest canvi al Registre d'Associacions?")))) return;
    try {
      await api.put(`/governanca/carrecs/${c.id}`, { ...c, [camp]: avui() });
      avisa(t("Comunicació registrada."));
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  const pendent = (c: CarrecFila) => {
    if (!c.comunicat_registre_el)
      return potEditar ? (
        <button
          className="boto boto-petit boto-secundari"
          onClick={(e) => {
            e.stopPropagation();
            marcaComunicat(c, 'comunicat_registre_el');
          }}
        >
          {t("Pendent · marca com a comunicat")}
        </button>
      ) : (
        <span className="insignia insignia-pendent">{t("Pendent")}</span>
      );
    return <>{data(c.comunicat_registre_el)}</>;
  };

  return (
    <>
      <p className="apagat petit">
        {t("Els canvis en la composició de la junta directiva s'han de comunicar al Registre d'Associacions de les Illes Balears. Un càrrec amb el mandat vençut continua en funcions fins que l'assemblea n'elegeix un altre.")}
      </p>
      {potEditar && (
        <div className="barra-accions">
          <button className="boto" onClick={() => setEditant({ carrec: 'vocal', data_eleccio: avui() })}>
            {t("+ Nou càrrec")}
          </button>
        </div>
      )}
      <section className="targeta">
        <h2>{t("Junta directiva actual")}</h2>
        {vigents.length === 0 ? (
          <Buit>{t("No hi ha cap càrrec vigent registrat.")}</Buit>
        ) : (
          <div className="taula-contenidor">
            <table className={`taula ${potEditar ? 'taula-clicable' : ''}`}>
              <thead>
                <tr>
                  <th>{t("Càrrec")}</th>
                  <th>{t("Nom")}</th>
                  <th>{t("Elecció")}</th>
                  <th>{t("Fi del mandat")}</th>
                  <th>{t("Comunicat al Registre")}</th>
                </tr>
              </thead>
              <tbody>
                {vigents.map((c) => (
                  <tr key={c.id} onClick={() => potEditar && setEditant(c)}>
                    <td>{CARRECS[c.carrec]}</td>
                    <td>
                      {nomSoci(c)}
                      {(c.email || c.telefon) && <div className="apagat petit">{[c.email, c.telefon].filter(Boolean).join(' · ')}</div>}
                    </td>
                    <td className="nowrap">{data(c.data_eleccio)}</td>
                    <td className="nowrap">
                      <Mandat c={c} />
                    </td>
                    <td>{pendent(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="targeta">
        <h2>{t("Historial de càrrecs")}</h2>
        {historial.length === 0 ? (
          <p className="apagat">{t("Encara no hi ha cap càrrec cessat.")}</p>
        ) : (
          <div className="taula-contenidor">
            <table className={`taula taula-compacta ${potEditar ? 'taula-clicable' : ''}`}>
              <thead>
                <tr>
                  <th>{t("Càrrec")}</th>
                  <th>{t("Nom")}</th>
                  <th>{t("Període")}</th>
                  <th>{t("Motiu")}</th>
                  <th>{t("Nomenament comunicat")}</th>
                  <th>{t("Cessament comunicat")}</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((c) => (
                  <tr key={c.id} onClick={() => potEditar && setEditant(c)}>
                    <td>{CARRECS[c.carrec]}</td>
                    <td>{nomSoci(c)}</td>
                    <td className="nowrap">
                      {data(c.data_eleccio)} – {data(c.data_cessament) || t("(encara no ha començat)")}
                    </td>
                    <td>{c.motiu_cessament}</td>
                    <td>{pendent(c)}</td>
                    <td>
                      {c.data_cessament && c.data_cessament <= avui() && !c.cessament_comunicat_el ? (
                        potEditar ? (
                          <button
                            className="boto boto-petit boto-secundari"
                            onClick={(e) => {
                              e.stopPropagation();
                              marcaComunicat(c, 'cessament_comunicat_el');
                            }}
                          >
                            {t("Pendent · marca com a comunicat")}
                          </button>
                        ) : (
                          <span className="insignia insignia-pendent">{t("Pendent")}</span>
                        )
                      ) : (
                        data(c.cessament_comunicat_el)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editant && (
        <FormCarrec
          inicial={editant}
          onClose={() => setEditant(null)}
          onFet={() => {
            setEditant(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function FormCarrec({ inicial, onClose, onFet }: { inicial: Partial<CarrecFila>; onClose: () => void; onFet: () => void }) {
  const { data: socis } = useApi<SociGov[]>('/governanca/socis');
  const { data: reunions } = useApi<ReunioLlista[]>('/governanca/reunions');
  const [f, setF] = useState({
    soci_id: inicial.soci_id ? String(inicial.soci_id) : '',
    carrec: inicial.carrec ?? 'vocal',
    data_eleccio: inicial.data_eleccio ?? avui(),
    data_fi_mandat: inicial.data_fi_mandat ?? '',
    reunio_id: inicial.reunio_id ? String(inicial.reunio_id) : '',
    comunicat_registre_el: inicial.comunicat_registre_el ?? '',
    data_cessament: inicial.data_cessament ?? '',
    motiu_cessament: inicial.motiu_cessament ?? '',
    cessament_comunicat_el: inicial.cessament_comunicat_el ?? '',
    notes: inicial.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const celebrades = (reunions ?? []).filter((r) => r.estat === 'celebrada' && r.organ !== 'comissio');
  const actual = inicial.soci_id && !socis?.some((s) => s.id === inicial.soci_id);

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      if (inicial.id) await api.put(`/governanca/carrecs/${inicial.id}`, f);
      else await api.post('/governanca/carrecs', f);
      avisa(t("Càrrec desat. Recorda comunicar el canvi al Registre d'Associacions."));
      onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }
  async function esborra() {
    if (!(await confirma(t("Vols esborrar aquest càrrec? Si la persona ha cessat, és millor indicar-ne la data de cessament per conservar l'historial.")))) return;
    try {
      await api.del(`/governanca/carrecs/${inicial.id}`);
      onFet();
    } catch (err) {
      avisaError(err);
    }
  }
  const quatreAnys = () => {
    if (!f.data_eleccio) return;
    setF({ ...f, data_fi_mandat: `${Number(f.data_eleccio.slice(0, 4)) + 4}${f.data_eleccio.slice(4)}` });
  };

  return (
    <Modal titol={inicial.id ? t("Càrrec de la junta") : t("Nou càrrec de la junta")} onClose={onClose} ample>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Persona sòcia")}>
          <select value={f.soci_id} onChange={set('soci_id')} required>
            <option value="">—</option>
            {actual && <option value={inicial.soci_id}>{nomSoci({ nom: inicial.nom ?? '', llinatges: inicial.llinatges ?? '' })}</option>}
            {socis?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.num_soci} · {nomSoci(s)}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Càrrec")}>
          <select value={f.carrec} onChange={set('carrec')}>
            {Object.entries(CARRECS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Data d'elecció")}>
          <input type="date" value={f.data_eleccio} onChange={set('data_eleccio')} required />
        </Camp>
        <Camp etiqueta={t("Fi del mandat")} grup>
          <div className="fila-client">
            <input type="date" aria-label={t("Fi del mandat")} value={f.data_fi_mandat} onChange={set('data_fi_mandat')} />
            <button type="button" className="boto boto-petit boto-secundari" onClick={quatreAnys}>
              {t("+4 anys")}
            </button>
          </div>
        </Camp>
        <Camp etiqueta={t("Elegit/da a la reunió")} ample>
          <select value={f.reunio_id} onChange={set('reunio_id')}>
            <option value="">—</option>
            {celebrades.map((r) => (
              <option key={r.id} value={r.id}>
                {data(r.data)} · {titolReunio(r)}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Comunicat al Registre el")}>
          <input type="date" value={f.comunicat_registre_el} onChange={set('comunicat_registre_el')} />
        </Camp>
        <Camp etiqueta={t("Data de cessament")}>
          <input type="date" value={f.data_cessament} onChange={set('data_cessament')} />
        </Camp>
        {f.data_cessament && (
          <>
            <Camp etiqueta={t("Motiu del cessament")}>
              <input value={f.motiu_cessament} onChange={set('motiu_cessament')} placeholder={t("Fi del mandat, dimissió…")} />
            </Camp>
            <Camp etiqueta={t("Cessament comunicat al Registre el")}>
              <input type="date" value={f.cessament_comunicat_el} onChange={set('cessament_comunicat_el')} />
            </Camp>
          </>
        )}
        <Camp etiqueta={t("Notes")} ample>
          <textarea rows={2} value={f.notes} onChange={set('notes')} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {inicial.id && (
            <button type="button" className="boto boto-perill" onClick={esborra}>
              {t("Esborra")}
            </button>
          )}
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={onClose}>
            {t("Cancel·la")}
          </button>
          <button className="boto">{t("Desa")}</button>
        </div>
      </form>
    </Modal>
  );
}
