// Fitxa del soci: historial de períodes (llibre registre), baixa, readmissió i admissió.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import { Camp, Modal, avisa, avisaError } from '../ui';
import { avui, data } from '../../format';
import { t } from '../../i18n';
import { ESTATS_ADMISSIO, MOTIUS_BAIXA } from './tipus';
import type { EstatAdmissio, MotiuBaixa, Periode } from './tipus';

interface SociMinim {
  id: number;
  num_soci: number;
  data_alta: string;
  data_baixa: string | null;
  anonimitzat_el: string | null;
  estat_admissio: EstatAdmissio;
  data_admissio: string | null;
  acord_admissio: string | null;
}

type Accio = 'baixa' | 'readmissio' | 'admet' | 'denega' | null;

export function PeriodesSoci({
  soci, periodes, potEditar, onCanvi,
}: { soci: SociMinim; periodes: Periode[]; potEditar: boolean; onCanvi: () => void }) {
  const [accio, setAccio] = useState<Accio>(null);
  const motius = MOTIUS_BAIXA();
  const actual = periodes[periodes.length - 1];
  const deBaixa = Boolean(soci.data_baixa);
  const anonimitzat = Boolean(soci.anonimitzat_el);

  if (soci.estat_admissio !== 'admesa') {
    return (
      <section className="targeta admissio-soci">
        <div className="targeta-cap">
          <h3 className="sense-marge">
            {t("Sol·licitud d'admissió")} <span className={`insignia insignia-admissio-${soci.estat_admissio}`}>{ESTATS_ADMISSIO()[soci.estat_admissio]}</span>
          </h3>
          {potEditar && soci.estat_admissio === 'sollicitada' && (
            <div className="accions">
              <button type="button" className="boto boto-petit boto-perill" onClick={() => setAccio('denega')}>
                {t("Denega")}
              </button>
              <button type="button" className="boto boto-petit" onClick={() => setAccio('admet')}>
                {t("Admet com a soci")}
              </button>
            </div>
          )}
        </div>
        <p className="apagat petit">
          {soci.estat_admissio === 'sollicitada'
            ? t("Sol·licitud presentada el {0}. Mentre no s'admeti, no compta com a sòcia: no vota, no paga quota i no surt al llibre registre.", data(soci.data_alta))
            : t("Sol·licitud denegada el {0}.", data(soci.data_admissio))}
          {soci.acord_admissio && <> {t("Acord: {0}", soci.acord_admissio)}</>}
        </p>
        {accio && <FormAccio accio={accio} soci={soci} onClose={() => setAccio(null)} onFet={onCanvi} />}
      </section>
    );
  }

  return (
    <section className="targeta periodes-soci">
      <div className="targeta-cap">
        <h3 className="sense-marge">{t("Historial d'altes i baixes")}</h3>
        {potEditar && !anonimitzat && (
          <div className="accions">
            {deBaixa ? (
              <>
                <button type="button" className="boto boto-petit boto-secundari" onClick={() => setAccio('baixa')}>
                  {t("Corregeix la baixa")}
                </button>
                <button type="button" className="boto boto-petit" onClick={() => setAccio('readmissio')}>
                  {t("Readmet")}
                </button>
              </>
            ) : (
              <button type="button" className="boto boto-petit boto-perill" onClick={() => setAccio('baixa')}>
                {t("Donar de baixa")}
              </button>
            )}
          </div>
        )}
      </div>
      <table className="taula taula-compacta">
        <thead>
          <tr>
            <th>{t("Alta")}</th>
            <th>{t("Baixa")}</th>
            <th>{t("Motiu")}</th>
            <th>{t("Acord")}</th>
          </tr>
        </thead>
        <tbody>
          {periodes.map((p) => (
            <tr key={p.id}>
              <td className="nowrap">{data(p.data_alta)}</td>
              <td className="nowrap">{p.data_baixa ? data(p.data_baixa) : <span className="apagat">{t("(actiu)")}</span>}</td>
              <td>
                {p.motiu_tipus && motius[p.motiu_tipus]}
                {p.motiu && p.motiu !== motius[p.motiu_tipus ?? 'altres'] && <span className="apagat"> · {p.motiu}</span>}
              </td>
              <td className="apagat">
                {p.acord && <div>{t("Alta")}: {p.acord}</div>}
                {p.acord_baixa && <div>{t("Baixa")}: {p.acord_baixa}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {accio && <FormAccio accio={accio} soci={soci} periode={actual} onClose={() => setAccio(null)} onFet={onCanvi} />}
    </section>
  );
}

function FormAccio({
  accio, soci, periode, onClose, onFet,
}: { accio: Exclude<Accio, null>; soci: SociMinim; periode?: Periode; onClose: () => void; onFet: () => void }) {
  const motius = MOTIUS_BAIXA();
  const correccio = accio === 'baixa' && Boolean(soci.data_baixa);
  const [f, setF] = useState({
    data: correccio ? soci.data_baixa! : avui(),
    motiu_tipus: (correccio ? periode?.motiu_tipus : null) ?? ('voluntaria' as MotiuBaixa),
    motiu: (correccio ? periode?.motiu : '') ?? '',
    acord: (correccio ? periode?.acord_baixa : '') ?? '',
  });
  const [desant, setDesant] = useState(false);

  const titols: Record<Exclude<Accio, null>, string> = {
    baixa: correccio ? t("Corregeix la baixa") : t("Donar de baixa"),
    readmissio: t("Readmissió"),
    admet: t("Admet com a soci"),
    denega: t("Denega la sol·licitud"),
  };

  async function desa(e: FormEvent) {
    e.preventDefault();
    setDesant(true);
    try {
      if (accio === 'baixa') await api.post(`/socis/${soci.id}/baixa`, { data_baixa: f.data, motiu_tipus: f.motiu_tipus, motiu: f.motiu, acord: f.acord });
      else if (accio === 'readmissio') await api.post(`/socis/${soci.id}/readmissio`, { data_alta: f.data, acord: f.acord });
      else await api.post(`/socis/${soci.id}/${accio}`, { data: f.data, acord: f.acord });
      avisa(
        accio === 'baixa' ? t("Baixa registrada.") : accio === 'readmissio' ? t("Soci readmès.") : accio === 'admet' ? t("Sol·licitud admesa.") : t("Sol·licitud denegada."),
      );
      onClose();
      onFet();
    } catch (err) {
      avisaError(err);
    } finally {
      setDesant(false);
    }
  }

  const etiquetaData =
    accio === 'baixa' ? t("Data de baixa") : accio === 'readmissio' ? t("Data de la nova alta") : accio === 'admet' ? t("Data d'admissió") : t("Data de resolució");

  return (
    <Modal titol={titols[accio]} onClose={onClose}>
      <form className="formulari-modal" onSubmit={desa}>
        {accio === 'readmissio' && (
          <p className="camp-ample apagat petit">
            {t("S'obrirà un període nou al llibre registre. Els períodes anteriors es conserven.")}
          </p>
        )}
        <Camp etiqueta={etiquetaData}>
          <input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} required />
        </Camp>
        {accio === 'baixa' && (
          <>
            <Camp etiqueta={t("Motiu de la baixa")}>
              <select value={f.motiu_tipus} onChange={(e) => setF({ ...f, motiu_tipus: e.target.value as MotiuBaixa })} required>
                {(Object.keys(motius) as MotiuBaixa[]).map((m) => (
                  <option key={m} value={m}>
                    {motius[m]}
                  </option>
                ))}
              </select>
            </Camp>
            <Camp etiqueta={t("Detall del motiu")} ample>
              <input value={f.motiu} onChange={(e) => setF({ ...f, motiu: e.target.value })} />
            </Camp>
          </>
        )}
        <Camp
          etiqueta={t("Acord o referència")}
          ample
          ajuda={
            accio === 'baixa' && f.motiu_tipus === 'expulsio'
              ? t("Obligatori per a una expulsió: òrgan, data i número de l'acord.")
              : t("P. ex. «Junta directiva, acta 12/2026». Opcional.")
          }
        >
          <input value={f.acord} onChange={(e) => setF({ ...f, acord: e.target.value })} required={accio === 'baixa' && f.motiu_tipus === 'expulsio'} />
        </Camp>
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={onClose}>
            {t("Cancel·la")}
          </button>
          <button className={`boto ${accio === 'baixa' || accio === 'denega' ? 'boto-perill' : ''}`} disabled={desant}>
            {desant ? t("Desant…") : titols[accio]}
          </button>
        </div>
      </form>
    </Modal>
  );
}
