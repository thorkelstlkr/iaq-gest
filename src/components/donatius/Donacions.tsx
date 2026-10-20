// Pestanya «Donacions»: registre de donacions dineràries i en espècie, amb el moviment d'ingrés a la tresoreria.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { centsAText, data, euros, textACents, avui } from '../../format';
import { t } from '../../i18n';
import { Imprimible } from '../Rgpd';
import { Buit, Camp, Carregant, Modal, avisa, avisaError, confirma } from '../ui';
import { DocumentCertificat } from './Document';
import { TIPUS_PERSONA, valorDonacio } from './comuns';
import type { CertificatDonacio, ConfigDonatius, Donacio } from './comuns';

interface Opcions {
  comptes: { id: number; nom: string }[];
  categories: { id: number; nom: string }[];
  socis: { id: number; num_soci: number; nom: string; llinatges: string; dni: string | null; adreca: string | null; codi_postal: string | null; poblacio: string | null }[];
  config: ConfigDonatius;
}

export function Donacions({ exercici, config }: { exercici: number; config: ConfigDonatius }) {
  const { pot } = useEntitat();
  const editor = pot('economia');
  const { data: llista, error, reload } = useApi<Donacio[]>(`/donatius?exercici=${exercici}`);
  const [editant, setEditant] = useState<Donacio | 'nova' | null>(null);
  const [certificat, setCertificat] = useState<CertificatDonacio | null>(null);
  const acollida = config.regim_49_2002 === 'si';

  const vigents = llista?.filter((d) => !d.revocada) ?? [];
  const total = vigents.reduce((s, d) => s + valorDonacio(d), 0);
  const dineraries = vigents.filter((d) => !d.en_especie).reduce((s, d) => s + d.import_cents, 0);

  async function emet(d: Donacio) {
    try {
      const c = await api.post<CertificatDonacio>('/donatius/certificats', { tipus: acollida && d.nif ? 'donacio' : 'rebut', donatiu_id: d.id });
      avisa(t("Document núm. {0}/{1} emès.", c.numero, c.any));
      reload();
      setCertificat(c);
    } catch (e) {
      avisaError(e);
    }
  }

  async function inventaria(d: Donacio) {
    try {
      await api.post(`/donatius/inventari/des-de-donatiu/${d.id}`, {});
      avisa(t("Afegit a l'inventari."));
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <>
      <div className="barra-accions">
        {editor && (
          <button className="boto" onClick={() => setEditant('nova')}>
            {t("+ Nova donació")}
          </button>
        )}
        <span className="espai" />
      </div>
      {llista && llista.length > 0 && (
        <div className="xifres xifres-petites">
          <div className="xifra">
            <span className="xifra-valor">{euros(total)}</span>
            <span className="xifra-etiqueta">{t("Total donat el {0}", exercici)}</span>
          </div>
          <div className="xifra">
            <span className="xifra-valor">{euros(dineraries)}</span>
            <span className="xifra-etiqueta">{t("Donacions dineràries")}</span>
          </div>
          <div className="xifra">
            <span className="xifra-valor">{vigents.length}</span>
            <span className="xifra-etiqueta">{t("Donacions")}</span>
          </div>
        </div>
      )}
      {!llista ? (
        <Carregant error={error} />
      ) : llista.length === 0 ? (
        <Buit>{t("No hi ha cap donació registrada el {0}.", exercici)}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Data")}</th>
                <th>{t("Donant")}</th>
                <th className="opcional">{t("NIF")}</th>
                <th>{t("Concepte")}</th>
                <th className="num">{t("Import")}</th>
                <th>{t("Estat")}</th>
                <th className="no-imprimir" />
              </tr>
            </thead>
            <tbody>
              {llista.map((d) => (
                <tr key={d.id} className={d.revocada ? 'don-revocada' : ''} onClick={() => editor && setEditant(d)}>
                  <td className="nowrap">{data(d.data)}</td>
                  <td>
                    {d.nom}
                    {d.tipus_persona === 'juridica' && <span className="apagat petit"> · {TIPUS_PERSONA.juridica}</span>}
                  </td>
                  <td className="opcional nowrap">{d.nif ?? <span className="insignia insignia-pendent">{t("Sense NIF")}</span>}</td>
                  <td>
                    {d.en_especie ? t("En espècie: {0}", d.descripcio_especie ?? '') : t("Dinerària")}
                    {d.destinacio && <div className="apagat petit">{d.destinacio}</div>}
                  </td>
                  <td className="num nowrap">{euros(valorDonacio(d))}</td>
                  <td>
                    {d.revocada ? (
                      <span className="insignia insignia-buida">{t("Revocada")}</span>
                    ) : d.certificats ? (
                      <span className="insignia insignia-pagada">{acollida ? t("Certificada") : t("Amb rebut")}</span>
                    ) : (
                      <span className="insignia insignia-pendent">{acollida ? t("Sense certificat") : t("Sense rebut")}</span>
                    )}
                    {d.moviment_id && <span className="apagat petit"> · {t("A tresoreria")}</span>}
                  </td>
                  <td className="no-imprimir nowrap" onClick={(e) => e.stopPropagation()}>
                    {editor && !d.revocada && !d.certificats && (
                      <button className="boto boto-petit boto-secundari" onClick={() => emet(d)}>
                        {acollida && d.nif ? t("Certificat") : t("Rebut")}
                      </button>
                    )}{' '}
                    {editor && Boolean(d.en_especie) && !d.inventari_ids && (
                      <button className="boto boto-petit boto-secundari" onClick={() => inventaria(d)}>
                        {t("A l'inventari")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {acollida && (
        <p className="apagat petit">
          {t("Les donacions sense NIF del donant no es poden certificar amb efectes fiscals ni declarar al model 182: se'ls pot lliurar un rebut.")}
        </p>
      )}
      {editant && (
        <FormDonacio
          donacio={editant === 'nova' ? null : editant}
          onClose={() => setEditant(null)}
          onFet={() => {
            setEditant(null);
            reload();
          }}
        />
      )}
      {certificat && (
        <Modal titol={t("Document emès")} onClose={() => setCertificat(null)} ample>
          <Imprimible titolBoto={t("Imprimeix")}>
            <DocumentCertificat c={certificat} />
          </Imprimible>
        </Modal>
      )}
    </>
  );
}

function FormDonacio({ donacio, onClose, onFet }: { donacio: Donacio | null; onClose: () => void; onFet: () => void }) {
  const { data: opcions } = useApi<Opcions>('/donatius/opcions');
  const d = donacio;
  const [f, setF] = useState({
    soci_id: d?.soci_id ? String(d.soci_id) : '',
    nom: d?.nom ?? '',
    nif: d?.nif ?? '',
    tipus_persona: d?.tipus_persona ?? 'fisica',
    adreca: d?.adreca ?? '',
    codi_postal: d?.codi_postal ?? '',
    poblacio: d?.poblacio ?? '',
    data: d?.data ?? avui(),
    en_especie: Boolean(d?.en_especie),
    import: d && !d.en_especie ? centsAText(d.import_cents) : '',
    descripcio_especie: d?.descripcio_especie ?? '',
    valoracio: d?.valoracio_cents ? centsAText(d.valoracio_cents) : '',
    destinacio: d?.destinacio ?? '',
    crea_moviment: !d,
    compte_id: '',
    categoria_id: '',
    revocada: Boolean(d?.revocada),
    data_revocacio: d?.data_revocacio ?? '',
    notes: d?.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const compte = f.compte_id || String(opcions?.config.donatius_compte_id ?? '');
  const categoria = f.categoria_id || String(opcions?.config.donatius_categoria_id ?? '');

  function triaSoci(id: string) {
    const s = opcions?.socis.find((x) => String(x.id) === id);
    setF(
      s
        ? { ...f, soci_id: id, nom: `${s.nom} ${s.llinatges}`.trim(), nif: s.dni ?? '', tipus_persona: 'fisica', adreca: s.adreca ?? '', codi_postal: s.codi_postal ?? '', poblacio: s.poblacio ?? '' }
        : { ...f, soci_id: '' },
    );
  }

  async function envia(e: FormEvent) {
    e.preventDefault();
    const cos = {
      ...f,
      import_cents: f.en_especie ? 0 : textACents(f.import),
      valoracio_cents: f.en_especie ? textACents(f.valoracio) : null,
      crea_moviment: !f.en_especie && !d?.moviment_id && f.crea_moviment,
      compte_id: compte,
      categoria_id: categoria,
    };
    try {
      if (d) await api.put(`/donatius/${d.id}`, cos);
      else await api.post('/donatius', cos);
      avisa(t("Donació desada."));
      onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!d) return;
    if (!(await confirma(t("Segur que vols eliminar aquesta donació?")))) return;
    const ambMoviment = d.moviment_id ? await confirma(t("Vols eliminar també el moviment d'ingrés de la tresoreria?")) : false;
    try {
      await api.del(`/donatius/${d.id}${ambMoviment ? '?moviment=1' : ''}`);
      avisa(t("Donació eliminada."));
      onFet();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <Modal titol={d ? t("Donació") : t("Nova donació")} onClose={onClose} ample>
      <form className="formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Soci o sòcia (opcional)")} ajuda={t("Omple les dades del donant a partir de la fitxa del soci.")}>
          <select value={f.soci_id} onChange={(e) => triaSoci(e.target.value)}>
            <option value="">{t("— No és soci / no consta —")}</option>
            {opcions?.socis.map((s) => (
              <option key={s.id} value={s.id}>
                {s.num_soci} · {s.nom} {s.llinatges}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Tipus de donant")}>
          <select value={f.tipus_persona} onChange={set('tipus_persona')}>
            <option value="fisica">{TIPUS_PERSONA.fisica}</option>
            <option value="juridica">{TIPUS_PERSONA.juridica}</option>
          </select>
        </Camp>
        <Camp etiqueta={f.tipus_persona === 'juridica' ? t("Raó social") : t("Nom i llinatges")}>
          <input value={f.nom} onChange={set('nom')} required />
        </Camp>
        <Camp etiqueta={t("NIF")} ajuda={t("Imprescindible per al certificat amb efectes fiscals i el model 182.")}>
          <input value={f.nif} onChange={set('nif')} />
        </Camp>
        <Camp etiqueta={t("Adreça")} ample>
          <input value={f.adreca} onChange={set('adreca')} />
        </Camp>
        <Camp etiqueta={t("Codi postal")} ajuda={t("En surt el codi de província del model 182.")}>
          <input value={f.codi_postal} onChange={set('codi_postal')} inputMode="numeric" maxLength={5} />
        </Camp>
        <Camp etiqueta={t("Població")}>
          <input value={f.poblacio} onChange={set('poblacio')} />
        </Camp>
        <Camp etiqueta={t("Data")}>
          <input type="date" value={f.data} onChange={set('data')} required />
        </Camp>
        <Camp etiqueta={t("Tipus de donació")}>
          <select value={f.en_especie ? 'especie' : 'diners'} onChange={(e) => setF({ ...f, en_especie: e.target.value === 'especie' })}>
            <option value="diners">{t("Dinerària")}</option>
            <option value="especie">{t("En espècie (béns)")}</option>
          </select>
        </Camp>
        {f.en_especie ? (
          <>
            <Camp etiqueta={t("Descripció del bé donat")} ample>
              <input value={f.descripcio_especie} onChange={set('descripcio_especie')} required />
            </Camp>
            <Camp etiqueta={t("Valoració (€)")} ajuda={t("Valor del bé en el moment de la donació (art. 18 Llei 49/2002).")}>
              <input className="input-import" value={f.valoracio} onChange={set('valoracio')} inputMode="decimal" required />
            </Camp>
          </>
        ) : (
          <Camp etiqueta={t("Import (€)")}>
            <input className="input-import" value={f.import} onChange={set('import')} inputMode="decimal" required />
          </Camp>
        )}
        <Camp etiqueta={t("Destinació o finalitat")} ample ajuda={t("P. ex.: «Taller de rondalles», «activitats generals de l'associació».")}>
          <input value={f.destinacio} onChange={set('destinacio')} />
        </Camp>
        {!f.en_especie && !d?.moviment_id && (
          <>
            <label className="casella camp-ample">
              <input type="checkbox" checked={f.crea_moviment} onChange={(e) => setF({ ...f, crea_moviment: e.target.checked })} />
              {t("Registra l'ingrés a la tresoreria")}
            </label>
            {f.crea_moviment && (
              <>
                <Camp etiqueta={t("Compte")}>
                  <select value={compte} onChange={set('compte_id')} required>
                    <option value="">—</option>
                    {opcions?.comptes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </Camp>
                <Camp etiqueta={t("Categoria")}>
                  <select value={categoria} onChange={set('categoria_id')} required>
                    <option value="">—</option>
                    {opcions?.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </Camp>
              </>
            )}
          </>
        )}
        {d?.moviment_id && <p className="apagat petit camp-ample">{t("L'ingrés ja és a la tresoreria: si canvies la data o l'import, també s'hi actualitzarà.")}</p>}
        {d && (
          <>
            <label className="casella">
              <input type="checkbox" checked={f.revocada} onChange={(e) => setF({ ...f, revocada: e.target.checked })} />
              {t("Donació revocada")}
            </label>
            {f.revocada && (
              <Camp etiqueta={t("Data de revocació")}>
                <input type="date" value={f.data_revocacio} onChange={set('data_revocacio')} />
              </Camp>
            )}
          </>
        )}
        <Camp etiqueta={t("Notes")} ample>
          <textarea value={f.notes} onChange={set('notes')} rows={2} />
        </Camp>
        {d && d.certificats > 0 && (
          <p className="apagat petit camp-ample">{t("Aquesta donació ja té un certificat o rebut emès: no se'n poden canviar el donant, la data ni l'import.")}</p>
        )}
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {d && (
            <button type="button" className="boto boto-perill" onClick={elimina}>
              {t("Elimina")}
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
