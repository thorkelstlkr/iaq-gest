// Pestanya «Certificats»: certificats de la secretaria amb el vist i plau de la presidència.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { data } from '../../format';
import { t } from '../../i18n';
import { Imprimible } from '../Rgpd';
import { Buit, Camp, Carregant, avisa } from '../ui';
import { nomSoci, titolReunio } from './comuns';
import type { Acord, Organ, SociGov } from './comuns';
import { CertificatDocument, TIPUS_CERTIFICAT } from './Impresos';
import type { Certificat } from './Impresos';

interface AcordLlista extends Acord {
  organ: Organ;
  tipus: 'ordinaria' | 'extraordinaria';
  data_reunio: string;
  acta_numero: number | null;
  acta_any: number | null;
  acta_tancada: number | null;
}

export function Certificats() {
  const { config, pot } = useEntitat();
  const { data: llista, error, reload } = useApi<Certificat[]>('/governanca/certificats');
  const [obert, setObert] = useState<Certificat | null>(null);
  const [nou, setNou] = useState(false);

  if (obert)
    return (
      <>
        <div className="barra-accions gov-barra">
          <button className="boto boto-secundari boto-petit" onClick={() => setObert(null)}>
            {t("← Tots els certificats")}
          </button>
          <span className="espai" />
        </div>
        <Imprimible titolBoto={t("Imprimeix el certificat")}>
          <CertificatDocument c={obert} config={config} />
        </Imprimible>
      </>
    );

  return (
    <>
      <p className="apagat petit">
        {t("Certificats que expedeix la secretaria amb el vist i plau de la presidència (per al banc, el Registre d'Associacions, subvencions…). Cada certificat queda numerat i registrat.")}
      </p>
      {pot('socis') && !nou && (
        <div className="barra-accions">
          <button className="boto" onClick={() => setNou(true)}>
            {t("+ Nou certificat")}
          </button>
        </div>
      )}
      {nou && (
        <FormCertificat
          onClose={() => setNou(false)}
          onFet={(c) => {
            setNou(false);
            reload();
            setObert(c);
          }}
        />
      )}
      {!llista ? (
        <Carregant error={error} />
      ) : llista.length === 0 ? (
        <Buit>{t("Encara no s'ha emès cap certificat.")}</Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th>{t("Núm.")}</th>
                <th>{t("Data")}</th>
                <th>{t("Tipus")}</th>
                <th>{t("Referent a")}</th>
                <th className="opcional">{t("Finalitat")}</th>
                <th className="opcional">{t("Emès per")}</th>
              </tr>
            </thead>
            <tbody>
              {llista.map((c) => (
                <tr key={c.id} onClick={() => setObert(c)}>
                  <td className="nowrap">
                    {c.numero}/{c.any}
                  </td>
                  <td className="nowrap">{data(c.data)}</td>
                  <td>{TIPUS_CERTIFICAT[c.tipus]}</td>
                  <td>
                    {c.contingut.soci
                      ? nomSoci(c.contingut.soci)
                      : c.contingut.acord
                        ? c.contingut.acord.text.slice(0, 70) + (c.contingut.acord.text.length > 70 ? '…' : '')
                        : t("{0} càrrecs", c.contingut.junta?.length ?? 0)}
                  </td>
                  <td className="opcional">{c.finalitat}</td>
                  <td className="opcional">{c.emes_per}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function FormCertificat({ onClose, onFet }: { onClose: () => void; onFet: (c: Certificat) => void }) {
  const [f, setF] = useState({ tipus: 'soci' as Certificat['tipus'], soci_id: '', acord_id: '', finalitat: '' });
  const { data: socis } = useApi<SociGov[]>(f.tipus === 'soci' ? '/governanca/socis?tots=1' : null);
  const { data: acords } = useApi<AcordLlista[]>(f.tipus === 'acord' ? '/governanca/acords' : null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value } as typeof f);

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      const c = await api.post<Certificat>('/governanca/certificats', f);
      avisa(t("Certificat núm. {0}/{1} emès.", c.numero, c.any));
      onFet(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form className="formulari targeta" onSubmit={envia}>
      <Camp etiqueta={t("Tipus de certificat")}>
        <select value={f.tipus} onChange={set('tipus')}>
          {Object.entries(TIPUS_CERTIFICAT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Camp>
      {f.tipus === 'soci' && (
        <Camp etiqueta={t("Persona sòcia")}>
          <select value={f.soci_id} onChange={set('soci_id')} required>
            <option value="">—</option>
            {socis?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.num_soci} · {nomSoci(s)}
                {s.data_baixa ? ' ' + t("(baixa)") : ''}
              </option>
            ))}
          </select>
        </Camp>
      )}
      {f.tipus === 'acord' && (
        <Camp etiqueta={t("Acord")} ample>
          <select value={f.acord_id} onChange={set('acord_id')} required>
            <option value="">—</option>
            {acords?.map((a) => (
              <option key={a.id} value={a.id}>
                {data(a.data_reunio)} · {titolReunio({ organ: a.organ, tipus: a.tipus, titol: null })}
                {a.acta_numero ? ` · ${t("acta {0}/{1}", a.acta_numero, a.acta_any)}` : ''} · {a.text.slice(0, 80)}
              </option>
            ))}
          </select>
        </Camp>
      )}
      <Camp etiqueta={t("Finalitat (opcional)")} ample ajuda={t("P. ex.: «obrir un compte bancari», «sol·licitud de subvenció»")}>
        <input value={f.finalitat} onChange={set('finalitat')} />
      </Camp>
      {error && <p className="error camp-ample">{error}</p>}
      <div className="formulari-peu camp-ample">
        <span className="espai" />
        <button type="button" className="boto boto-secundari" onClick={onClose}>
          {t("Cancel·la")}
        </button>
        <button className="boto">{t("Emet el certificat")}</button>
      </div>
    </form>
  );
}
