import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../api';
import { Buit, Capcalera, Carregant, EstatQuota, Xip } from '../components/ui';
import { useEntitat } from '../entitat';
import { data, edat, nomComplet } from '../format';
import { DEMO } from '../mode';
import { imprimeixCarnet } from '../components/Carnet';
import type { SociLlista } from '../../shared/types';
import { idioma, t } from '../i18n';
import type { CategoriaSoci, SociRegistre } from '../components/socis/tipus';
import { CategoriesSoci } from '../components/socis/Categories';
import { LlibreRegistre } from '../components/socis/LlibreRegistre';
import { ImportaSocis } from '../components/socis/Importa';
import '../styles/socis.css';

type Fila = SociLlista & SociRegistre;
const ESTATS = ['actius', 'baixes', 'tots', 'sollicituds', 'denegades'];

export default function Socis() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const estat = ESTATS.includes(params.get('estat') ?? '') ? params.get('estat')! : 'actius';
  const setEstat = (e: string) => setParams(e === 'actius' ? {} : { estat: e }, { replace: true });
  const [q, setQ] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [categoria, setCategoria] = useState('');
  const [modal, setModal] = useState<'categories' | 'llibre' | 'importa' | null>(null);
  const { etiquetes, pot } = useEntitat();
  const potEditar = pot('socis');
  const { data: categories, reload: recarregaCategories } = useApi<CategoriaSoci[]>('/socis/categories');
  const { data: socis, error, reload } = useApi<Fila[]>(
    `/socis?estat=${estat}&q=${encodeURIComponent(q)}${etiqueta ? `&etiqueta=${etiqueta}` : ''}${categoria ? `&categoria=${categoria}` : ''}`,
  );
  const etiquetaPerId = (id: string) => etiquetes.find((e) => String(e.id) === id);
  const any = new Date().getFullYear();
  const admissio = estat === 'sollicituds' || estat === 'denegades';

  return (
    <>
      <Capcalera titol={t("Socis")} subtitol={t("Registre de persones associades")}>
        <button type="button" className="boto boto-secundari" onClick={() => setModal('llibre')}>
          {t("Llibre registre")}
        </button>
        <button type="button" className="boto boto-secundari" onClick={() => setModal('categories')}>
          {t("Categories")}
        </button>
        {potEditar && (
          <button type="button" className="boto boto-secundari" onClick={() => setModal('importa')}>
            {t("Importa socis")}
          </button>
        )}
        {!DEMO && (
          <a className="boto boto-secundari" href={`/api/socis/export.csv?estat=${estat}&idioma=${idioma()}`}>
            {t("Exporta CSV")}
          </a>
        )}
        {potEditar && (
          <Link className="boto" to="/socis/nou">
            {t("+ Nou soci")}
          </Link>
        )}
      </Capcalera>

      <div className="filtres">
        <input
          type="search"
          placeholder={t("Cerca per nom, DNI, correu, telèfon o número…")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t("Cerca")}
        />
        <select value={estat} onChange={(e) => setEstat(e.target.value)} aria-label={t("Estat")}>
          <option value="actius">{t("Actius")}</option>
          <option value="baixes">{t("Baixes")}</option>
          <option value="tots">{t("Tots")}</option>
          <option value="sollicituds">{t("Sol·licituds d'admissió")}</option>
          <option value="denegades">{t("Sol·licituds denegades")}</option>
        </select>
        {categories && categories.length > 0 && (
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label={t("Categoria")}>
            <option value="">{t("Totes les categories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
            <option value="cap">{t("Sense categoria")}</option>
          </select>
        )}
        {etiquetes.length > 0 && (
          <select value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} aria-label={t("Etiqueta")}>
            <option value="">{t("Totes les etiquetes")}</option>
            {etiquetes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}
              </option>
            ))}
          </select>
        )}
      </div>

      {!socis ? (
        <Carregant error={error} />
      ) : socis.length === 0 ? (
        <Buit>
          {q || categoria || estat !== 'actius' ? (
            t("Cap soci coincideix amb la cerca.")
          ) : (
            <>
              {t("Encara no hi ha socis registrats.")}{' '}
              {potEditar && (
                <>
                  <Link to="/socis/nou">{t("Dona d'alta el primer soci")}</Link>{' '}
                  {t("o")}{' '}
                  <button type="button" className="boto-enllac" onClick={() => setModal('importa')}>
                    {t("importa'ls d'un full de càlcul")}
                  </button>
                </>
              )}
            </>
          )}
        </Buit>
      ) : (
        <div className="taula-contenidor">
          <table className="taula taula-clicable">
            <thead>
              <tr>
                <th className="num">{t("Núm.")}</th>
                <th>{t("Nom i llinatges")}</th>
                <th className="num">{t("Edat")}</th>
                <th className="opcional">{t("Telèfon")}</th>
                <th className="opcional">{t("Correu")}</th>
                <th>{t("Categoria")}</th>
                {admissio ? (
                  <th>{estat === 'sollicituds' ? t("Sol·licitada el") : t("Denegada el")}</th>
                ) : (
                  <>
                    <th className="opcional">{t("Tipus de quota")}</th>
                    <th>{t("Quota")} {any}</th>
                  </>
                )}
                {(estat === 'baixes' || estat === 'tots') && <th>{t("Baixa")}</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {socis.map((s) => {
                const anys = edat(s.data_naixement);
                return (
                  <tr key={s.id} onClick={() => navigate(`/socis/${s.id}`)}>
                    <td className="num">{s.num_soci}</td>
                    <td>
                      <Link to={`/socis/${s.id}`} onClick={(e) => e.stopPropagation()}>
                        {nomComplet(s)}
                      </Link>
                      {s.etiquetes && (
                        <div className="xips">
                          {s.etiquetes.split(',').map((id) => {
                            const e = etiquetaPerId(id);
                            return e ? <Xip key={id} nom={e.nom} color={e.color} /> : null;
                          })}
                        </div>
                      )}
                    </td>
                    <td className="num">{anys ?? '—'}</td>
                    <td className="opcional">{s.telefon}</td>
                    <td className="opcional">{s.email}</td>
                    <td>
                      {s.categoria_nom ?? <span className="apagat">—</span>}
                      {s.estat_admissio === 'admesa' && !s.data_baixa && !s.te_vot && (
                        <>
                          {' '}
                          <span
                            className="insignia insignia-sense-vot"
                            title={anys !== null && anys < 18 ? t("Menor d'edat: els menors de 18 anys no voten") : t("La seva categoria no té dret a vot")}
                          >
                            {t("sense vot")}
                          </span>
                        </>
                      )}
                    </td>
                    {admissio ? (
                      <td>{data(estat === 'sollicituds' ? s.data_alta : s.data_admissio)}</td>
                    ) : (
                      <>
                        <td className="opcional">{s.tipus_quota_nom?.replace(/ \(.*\)$/, '')}</td>
                        <td>
                          <EstatQuota estat={s.quota_estat} />
                        </td>
                      </>
                    )}
                    {(estat === 'baixes' || estat === 'tots') && <td>{data(s.data_baixa)}</td>}
                    <td className="accions-fila">
                      {s.estat_admissio === 'admesa' && (
                        <button
                          type="button"
                          className="boto boto-petit boto-secundari"
                          title={t("Imprimeix el carnet de {0}", nomComplet(s))}
                          onClick={(e) => {
                            e.stopPropagation();
                            imprimeixCarnet(s.id);
                          }}
                        >
                          {t("Carnet")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="apagat petit">
            {admissio ? t("{0} sol·licituds", socis.length) : `${socis.length} ${t("socis")}`}
            {!admissio && estat === 'actius' && <> · {t("{0} amb dret a vot", socis.filter((s) => s.te_vot).length)}</>}
          </p>
        </div>
      )}

      {modal === 'categories' && (
        <CategoriesSoci
          potEditar={potEditar}
          onClose={() => setModal(null)}
          onCanvi={() => {
            recarregaCategories();
            reload();
          }}
        />
      )}
      {modal === 'llibre' && <LlibreRegistre onClose={() => setModal(null)} />}
      {modal === 'importa' && <ImportaSocis onClose={() => setModal(null)} onFet={reload} />}
    </>
  );
}
