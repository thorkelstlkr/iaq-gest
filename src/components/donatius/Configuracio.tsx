// Pestanya «Configuració»: règim fiscal de l'entitat (Llei 49/2002) i on es registren els ingressos per donacions.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { useEntitat } from '../../entitat';
import { t } from '../../i18n';
import { Camp, avisa } from '../ui';
import { ExplicacioRegim } from './comuns';
import type { ConfigDonatius } from './comuns';

export function Configuracio({ config, onDesat }: { config: ConfigDonatius; onDesat: () => void }) {
  const { pot } = useEntitat();
  const { data: opcions } = useApi<{ comptes: { id: number; nom: string }[]; categories: { id: number; nom: string }[] }>('/donatius/opcions');
  const [f, setF] = useState({
    regim_49_2002: config.regim_49_2002,
    regim_49_2002_data: config.regim_49_2002_data ?? '',
    utilitat_publica_data: config.utilitat_publica_data ?? '',
    donatius_compte_id: config.donatius_compte_id ? String(config.donatius_compte_id) : '',
    donatius_categoria_id: config.donatius_categoria_id ? String(config.donatius_categoria_id) : '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value } as typeof f);
  const editor = pot('economia');

  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      await api.put('/donatius/config', f);
      avisa(t("Configuració desada."));
      setError(null);
      onDesat();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <ExplicacioRegim acollida={config.regim_49_2002 === 'si'} />
      <div className="don-explicacio">
        <p>
          <strong>{t("Com s'hi accedeix?")}</strong>{' '}
          {t("Una associació hi pot accedir si és declarada d'utilitat pública (Ministeri de l'Interior) i comunica a l'Agència Tributària que opta pel règim especial (model 036), o si compleix els requisits de l'article 3 de la Llei 49/2002 i hi opta. Un cop acollida, ha de presentar cada any l'Impost de Societats i la memòria econòmica.")}
        </p>
      </div>
      <form className="formulari targeta" onSubmit={envia}>
        <Camp etiqueta={t("Règim fiscal de l'entitat")} ample>
          <select value={f.regim_49_2002} onChange={set('regim_49_2002')} disabled={!editor}>
            <option value="no">{t("No acollida: només rebuts sense efectes fiscals")}</option>
            <option value="si">{t("Acollida a la Llei 49/2002: certificats amb deducció i model 182")}</option>
          </select>
        </Camp>
        {f.regim_49_2002 === 'si' && (
          <>
            <Camp etiqueta={t("Data d'acolliment al règim")}>
              <input type="date" value={f.regim_49_2002_data} onChange={set('regim_49_2002_data')} disabled={!editor} />
            </Camp>
            <Camp etiqueta={t("Data de declaració d'utilitat pública (si n'hi ha)")}>
              <input type="date" value={f.utilitat_publica_data} onChange={set('utilitat_publica_data')} disabled={!editor} />
            </Camp>
          </>
        )}
        <Camp etiqueta={t("Compte habitual de les donacions")}>
          <select value={f.donatius_compte_id} onChange={set('donatius_compte_id')} disabled={!editor}>
            <option value="">{t("— Triar-lo cada vegada —")}</option>
            {opcions?.comptes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Categoria d'ingrés de les donacions")}>
          <select value={f.donatius_categoria_id} onChange={set('donatius_categoria_id')} disabled={!editor}>
            <option value="">—</option>
            {opcions?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        {editor && (
          <div className="formulari-peu camp-ample">
            <span className="espai" />
            <button className="boto">{t("Desa")}</button>
          </div>
        )}
      </form>
    </>
  );
}
