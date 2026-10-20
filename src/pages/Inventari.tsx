// Inventari de béns de l'associació (art. 14 LO 1/2002): material, equips i mobiliari, amb l'amortització
// lineal i el valor net comptable a una data.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../api';
import { Buit, Camp, Capcalera, Carregant, Modal, avisa, avisaError, confirma } from '../components/ui';
import { Imprimible } from '../components/Rgpd';
import { CapEntitat, dataLlarga } from '../components/governanca/Impresos';
import { VisorCsv, aCsv, eurosCsv } from '../components/donatius/comuns';
import { useEntitat } from '../entitat';
import { avui, centsAText, data, euros, textACents } from '../format';
import { idioma, t } from '../i18n';
import { redueixImatge } from '../imatges';
import { DEMO } from '../mode';
import '../styles/donatius.css';

interface Be {
  id: number;
  descripcio: string;
  categoria: string;
  data_adquisicio: string;
  valor_adquisicio_cents: number;
  procedencia: string;
  moviment_id: number | null;
  donatiu_id: number | null;
  ubicacio: string | null;
  estat: string;
  vida_util_anys: number | null;
  data_baixa: string | null;
  motiu_baixa: string | null;
  notes: string | null;
  te_foto: number;
  donant_nom: string | null;
  anual_cents: number;
  acumulada_cents: number;
  net_cents: number;
  de_baixa: boolean;
  amortitzacio_any_cents: number;
  foto?: string | null;
}

const CATEGORIES: Record<string, string> = {
  equip_so: t("Equip de so"),
  mobiliari: t("Mobiliari"),
  informatica: t("Informàtica"),
  material_tallers: t("Material de tallers"),
  vestuari: t("Vestuari"),
  altres: t("Altres"),
};
const PROCEDENCIES: Record<string, string> = { compra: t("Compra"), donacio: t("Donació"), cessio: t("Cessió") };
const ESTATS: Record<string, string> = { bo: t("Bo"), regular: t("Regular"), dolent: t("Dolent") };

export default function Inventari() {
  const { config, pot } = useEntitat();
  const editor = pot('economia');
  const [dataRef, setDataRef] = useState(avui());
  const [baixes, setBaixes] = useState(false);
  const [categoria, setCategoria] = useState('');
  const { data: llista, error, reload } = useApi<Be[]>(`/donatius/inventari?data=${dataRef}${baixes ? '&baixes=1' : ''}`);
  const [editant, setEditant] = useState<Be | 'nou' | null>(null);
  const [imprimint, setImprimint] = useState(false);

  const visibles = (llista ?? []).filter((b) => !categoria || b.categoria === categoria);
  const suma = (f: (b: Be) => number) => visibles.reduce((s, b) => s + f(b), 0);
  const any = Number(dataRef.slice(0, 4));

  async function obre(b: Be) {
    try {
      setEditant(await api.get<Be>(`/donatius/inventari/${b.id}`));
    } catch (e) {
      avisaError(e);
    }
  }

  const csv = aCsv(
    [t("Núm."), t("Descripció"), t("Categoria"), t("Data d'adquisició"), t("Valor d'adquisició (€)"), t("Procedència"), t("Ubicació"), t("Estat"), t("Vida útil (anys)"), t("Amortització de l'any (€)"), t("Amortització acumulada (€)"), t("Valor net comptable (€)"), t("Data de baixa"), t("Motiu de la baixa")],
    visibles.map((b) => [
      b.id, b.descripcio, CATEGORIES[b.categoria], b.data_adquisicio, eurosCsv(b.valor_adquisicio_cents), PROCEDENCIES[b.procedencia], b.ubicacio,
      ESTATS[b.estat], b.vida_util_anys, eurosCsv(b.amortitzacio_any_cents), eurosCsv(b.acumulada_cents), eurosCsv(b.net_cents), b.data_baixa, b.motiu_baixa,
    ]),
  );

  const taula = (perImprimir: boolean) => (
    <div className="taula-contenidor">
      <table className={`taula ${perImprimir ? 'taula-compacta' : 'taula-clicable'}`}>
        <thead>
          <tr>
            <th>{t("Núm.")}</th>
            <th>{t("Descripció")}</th>
            <th className="opcional">{t("Categoria")}</th>
            <th>{t("Adquisició")}</th>
            <th className="num">{t("Valor")}</th>
            <th className="num opcional">{t("Amort. {0}", any)}</th>
            <th className="num opcional">{t("Amort. acumulada")}</th>
            <th className="num">{t("Valor net")}</th>
            <th>{t("Estat")}</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((b) => (
            <tr key={b.id} className={b.de_baixa ? 'don-revocada' : ''} onClick={() => !perImprimir && editor && obre(b)}>
              <td>{b.id}</td>
              <td>
                {b.descripcio}
                <div className="apagat petit">
                  {[PROCEDENCIES[b.procedencia] + (b.donant_nom ? `: ${b.donant_nom}` : ''), b.ubicacio, b.te_foto && !perImprimir ? t("amb foto") : null]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </td>
              <td className="opcional">{CATEGORIES[b.categoria]}</td>
              <td className="nowrap">{data(b.data_adquisicio)}</td>
              <td className="num nowrap">{euros(b.valor_adquisicio_cents)}</td>
              <td className="num nowrap opcional">{b.vida_util_anys ? euros(b.amortitzacio_any_cents) : '—'}</td>
              <td className="num nowrap opcional">{b.vida_util_anys ? euros(b.acumulada_cents) : '—'}</td>
              <td className="num nowrap">{euros(b.net_cents)}</td>
              <td>
                {b.de_baixa ? (
                  <span className="insignia insignia-buida" title={b.motiu_baixa ?? undefined}>
                    {t("Baixa {0}", data(b.data_baixa))}
                  </span>
                ) : (
                  <span className={`insignia don-estat-${b.estat}`}>{ESTATS[b.estat]}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={4}>{t("Total ({0} béns)", visibles.length)}</th>
            <th className="num">{euros(suma((b) => b.valor_adquisicio_cents))}</th>
            <th className="num opcional">{euros(suma((b) => b.amortitzacio_any_cents))}</th>
            <th className="num opcional">{euros(suma((b) => b.acumulada_cents))}</th>
            <th className="num">{euros(suma((b) => b.net_cents))}</th>
            <th />
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <>
      <Capcalera titol={t("Inventari")} subtitol={t("Béns de l'associació: material, equips i mobiliari")}>
        {editor && (
          <button className="boto" onClick={() => setEditant('nou')}>
            {t("+ Nou bé")}
          </button>
        )}
      </Capcalera>
      <p className="apagat petit no-imprimir">
        {t("La Llei orgànica 1/2002 (art. 14) obliga les associacions a dur un inventari dels seus béns. L'amortització és lineal: el valor d'adquisició es reparteix entre els anys de vida útil.")}
      </p>
      <div className="filtres no-imprimir">
        <Camp etiqueta={t("Valor a data")}>
          <input type="date" value={dataRef} onChange={(e) => e.target.value && setDataRef(e.target.value)} />
        </Camp>
        <Camp etiqueta={t("Categoria")}>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">{t("Totes")}</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        <label className="casella">
          <input type="checkbox" checked={baixes} onChange={(e) => setBaixes(e.target.checked)} />
          {t("Inclou els béns donats de baixa")}
        </label>
      </div>
      {!llista ? (
        <Carregant error={error} />
      ) : visibles.length === 0 ? (
        <Buit>{t("No hi ha cap bé a l'inventari.")}</Buit>
      ) : (
        <>
          <div className="barra-accions no-imprimir">
            <button className="boto boto-secundari boto-petit" onClick={() => setImprimint(!imprimint)}>
              {imprimint ? t("Amaga el document") : t("Document per imprimir")}
            </button>
            {!DEMO && (
              <a className="boto boto-secundari boto-petit" href={`/api/donatius/inventari/export.csv?data=${dataRef}${baixes ? '&baixes=1' : ''}&idioma=${idioma()}`}>
                {t("Descarrega el CSV")}
              </a>
            )}
            <VisorCsv csv={csv} />
          </div>
          {imprimint ? (
            <Imprimible titolBoto={t("Imprimeix l'inventari")}>
              <CapEntitat config={config} titol={t("Inventari de béns")} subtitol={t("Situació a {0}", dataLlarga(dataRef))} />
              {taula(true)}
              <p className="apagat petit">{t("Valors en euros. Amortització lineal segons la vida útil de cada bé; els béns sense vida útil no s'amortitzen.")}</p>
            </Imprimible>
          ) : (
            taula(false)
          )}
        </>
      )}
      {editant && (
        <FormBe
          be={editant === 'nou' ? null : editant}
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

function FormBe({ be, onClose, onFet }: { be: Be | null; onClose: () => void; onFet: () => void }) {
  const [f, setF] = useState({
    descripcio: be?.descripcio ?? '',
    categoria: be?.categoria ?? 'altres',
    data_adquisicio: be?.data_adquisicio ?? avui(),
    valor: be ? centsAText(be.valor_adquisicio_cents) : '',
    procedencia: be?.procedencia ?? 'compra',
    ubicacio: be?.ubicacio ?? '',
    estat: be?.estat ?? 'bo',
    vida_util_anys: be?.vida_util_anys ? String(be.vida_util_anys) : '',
    data_baixa: be?.data_baixa ?? '',
    motiu_baixa: be?.motiu_baixa ?? '',
    notes: be?.notes ?? '',
    foto: be?.foto ?? null,
  });
  const [baixa, setBaixa] = useState(Boolean(be?.data_baixa));
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function triaFoto(fitxer: File | undefined) {
    if (!fitxer) return;
    try {
      const foto = await redueixImatge(fitxer, 1024, 768, 0.8);
      if (foto.length > 1_900_000) throw new Error(t("La foto és massa gran (màxim 1,4 MB)."));
      setF({ ...f, foto });
    } catch (e) {
      avisaError(e);
    }
  }

  async function envia(e: FormEvent) {
    e.preventDefault();
    const cos = {
      ...f,
      valor_adquisicio_cents: textACents(f.valor) ?? 0,
      data_baixa: baixa ? f.data_baixa : null,
      motiu_baixa: baixa ? f.motiu_baixa : null,
      donatiu_id: be?.donatiu_id ?? null,
      moviment_id: be?.moviment_id ?? null,
    };
    try {
      if (be) await api.put(`/donatius/inventari/${be.id}`, cos);
      else await api.post('/donatius/inventari', cos);
      avisa(t("Bé desat."));
      onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function elimina() {
    if (!be || !(await confirma(t("Segur que vols eliminar aquest bé de l'inventari? Si l'heu venut, llençat o regalat, és millor donar-lo de baixa.")))) return;
    try {
      await api.del(`/donatius/inventari/${be.id}`);
      avisa(t("Bé eliminat."));
      onFet();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <Modal titol={be ? t("Bé de l'inventari") : t("Nou bé")} onClose={onClose} ample>
      <form className="formulari-modal" onSubmit={envia}>
        <Camp etiqueta={t("Descripció")} ample>
          <input value={f.descripcio} onChange={set('descripcio')} required />
        </Camp>
        <Camp etiqueta={t("Categoria")}>
          <select value={f.categoria} onChange={set('categoria')}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Procedència")}>
          <select value={f.procedencia} onChange={set('procedencia')}>
            {Object.entries(PROCEDENCIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Data d'adquisició")}>
          <input type="date" value={f.data_adquisicio} onChange={set('data_adquisicio')} required />
        </Camp>
        <Camp etiqueta={t("Valor d'adquisició (€)")} ajuda={t("Preu de compra o valoració (donacions i cessions).")}>
          <input className="input-import" value={f.valor} onChange={set('valor')} inputMode="decimal" />
        </Camp>
        <Camp etiqueta={t("Vida útil (anys)")} ajuda={t("Orientativa: informàtica 4, equips 5–8, mobiliari 10. Buit: no s'amortitza.")}>
          <input type="number" min={1} max={100} value={f.vida_util_anys} onChange={set('vida_util_anys')} />
        </Camp>
        <Camp etiqueta={t("Estat")}>
          <select value={f.estat} onChange={set('estat')}>
            {Object.entries(ESTATS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Camp>
        <Camp etiqueta={t("Ubicació")} ample>
          <input value={f.ubicacio} onChange={set('ubicacio')} />
        </Camp>
        {be?.donant_nom && <p className="apagat petit camp-ample">{t("Donació de {0}.", be.donant_nom)}</p>}
        <Camp etiqueta={t("Foto (opcional)")} ample grup>
          <div className="don-foto">
            {f.foto ? <img src={f.foto} alt="" /> : <span className="apagat petit">{t("Sense foto")}</span>}
            <input type="file" accept="image/*" onChange={(e) => triaFoto(e.target.files?.[0])} aria-label={t("Tria una foto")} />
            {f.foto && (
              <button type="button" className="boto boto-petit boto-secundari" onClick={() => setF({ ...f, foto: null })}>
                {t("Treu la foto")}
              </button>
            )}
          </div>
        </Camp>
        <label className="casella camp-ample">
          <input type="checkbox" checked={baixa} onChange={(e) => setBaixa(e.target.checked)} />
          {t("Donat de baixa (venut, llençat, perdut o regalat)")}
        </label>
        {baixa && (
          <>
            <Camp etiqueta={t("Data de baixa")}>
              <input type="date" value={f.data_baixa} onChange={set('data_baixa')} required />
            </Camp>
            <Camp etiqueta={t("Motiu de la baixa")}>
              <input value={f.motiu_baixa} onChange={set('motiu_baixa')} />
            </Camp>
          </>
        )}
        <Camp etiqueta={t("Notes")} ample>
          <textarea value={f.notes} onChange={set('notes')} rows={2} />
        </Camp>
        {error && <p className="error camp-ample">{error}</p>}
        <div className="formulari-peu camp-ample">
          {be && (
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
