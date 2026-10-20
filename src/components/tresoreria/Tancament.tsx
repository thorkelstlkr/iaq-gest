import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { Buit, Camp, Carregant, Modal, avisa } from '../ui';
import { useEntitat } from '../../entitat';
import { data, euros } from '../../format';
import { t } from '../../i18n';
import type { Tancament } from './tipus';

export function Tancaments() {
  const { data: llista, error, reload } = useApi<Tancament[]>('/tresoreria/tancaments');
  const { usuari } = useEntitat();
  const [tancant, setTancant] = useState<Tancament | null>(null);
  const [reobrint, setReobrint] = useState<Tancament | null>(null);
  const anyActual = new Date().getFullYear();

  if (!llista) return <Carregant error={error} />;
  if (!llista.length) return <Buit>{t("Encara no hi ha exercicis amb moviments.")}</Buit>;

  return (
    <>
      <p className="apagat">
        {t("Un cop aprovats els comptes, tanca l'exercici: els seus moviments ja no es podran afegir, modificar ni eliminar. Només l'administració pot reobrir-lo, i queda registrat.")}
      </p>
      <div className="taula-contenidor">
        <table className="taula">
          <thead>
            <tr>
              <th>{t("Exercici")}</th>
              <th>{t("Estat")}</th>
              <th className="num">{t("Moviments")}</th>
              <th className="num">{t("Ingressos")}</th>
              <th className="num">{t("Despeses")}</th>
              <th className="num">{t("Resultat")}</th>
              <th>{t("Pendents")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {llista.map((e) => (
              <tr key={e.exercici}>
                <td>
                  <strong>{e.exercici}</strong>
                </td>
                <td>
                  {e.tancat ? (
                    <span className="insignia insignia-exempta" title={e.notes ?? ''}>
                      <span className="cadenat" aria-hidden="true" />
                      {t("Tancat el {0}", data(e.tancat_el?.slice(0, 10)))}
                      {e.usuari && ` · ${e.usuari}`}
                    </span>
                  ) : (
                    <span className="insignia insignia-pagada">{t("Obert")}</span>
                  )}
                </td>
                <td className="num">{e.moviments}</td>
                <td className="num">{euros(e.ingressos_cents)}</td>
                <td className="num">{euros(e.despeses_cents)}</td>
                <td className={`num ${e.ingressos_cents - e.despeses_cents < 0 ? 'negatiu' : 'positiu'}`}>
                  {euros(e.ingressos_cents - e.despeses_cents)}
                </td>
                <td className="petit">
                  {[
                    e.quotes_pendents > 0 && t("{0} quotes pendents", e.quotes_pendents),
                    e.remeses_pendents > 0 && t("{0} remeses per cobrar", e.remeses_pendents),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </td>
                <td className="accions-fila">
                  {!e.tancat && e.exercici < anyActual && (
                    <button className="boto boto-petit" onClick={() => setTancant(e)}>
                      {t("Tanca l'exercici")}
                    </button>
                  )}
                  {e.tancat && usuari?.rol === 'admin' && (
                    <button className="boto boto-petit boto-secundari" onClick={() => setReobrint(e)}>
                      {t("Reobre")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tancant && (
        <Accio
          e={tancant}
          reobre={false}
          onClose={() => setTancant(null)}
          onFet={() => {
            setTancant(null);
            reload();
          }}
        />
      )}
      {reobrint && (
        <Accio
          e={reobrint}
          reobre
          onClose={() => setReobrint(null)}
          onFet={() => {
            setReobrint(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function Accio(props: { e: Tancament; reobre: boolean; onClose: () => void; onFet: () => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { e } = props;

  async function envia(ev: FormEvent) {
    ev.preventDefault();
    try {
      if (props.reobre) {
        await api.post(`/tresoreria/tancaments/${e.exercici}/reobre`, { motiu: text });
        avisa(t("Exercici {0} reobert.", e.exercici));
      } else {
        await api.post('/tresoreria/tancaments', { exercici: e.exercici, notes: text });
        avisa(t("Exercici {0} tancat.", e.exercici));
      }
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal titol={props.reobre ? t("Reobre l'exercici {0}", e.exercici) : t("Tanca l'exercici {0}", e.exercici)} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        {props.reobre ? (
          <p className="camp-ample">
            {t("Reobrir un exercici tancat permet tornar a modificar-ne els moviments. Explica'n el motiu: quedarà al registre d'activitat.")}
          </p>
        ) : (
          <>
            <p className="camp-ample">
              {t("Resultat de l'exercici: {0} ({1} moviments).", euros(e.ingressos_cents - e.despeses_cents), e.moviments)}
            </p>
            {e.quotes_pendents > 0 && (
              <p className="camp-ample error">{t("Atenció: encara hi ha {0} quotes pendents de cobrar d'aquest exercici.", e.quotes_pendents)}</p>
            )}
          </>
        )}
        <Camp etiqueta={props.reobre ? t("Motiu") : t("Notes (p. ex. data de l'assemblea que va aprovar els comptes)")} ample>
          <textarea rows={2} value={text} onChange={(ev) => setText(ev.target.value)} required={props.reobre} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          <span className="espai" />
          <button type="button" className="boto boto-secundari" onClick={props.onClose}>
            {t("Cancel·la")}
          </button>
          <button className={props.reobre ? 'boto boto-perill' : 'boto'}>{props.reobre ? t("Reobre") : t("Tanca l'exercici")}</button>
        </div>
      </form>
    </Modal>
  );
}
