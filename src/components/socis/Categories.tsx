// Gestió de les categories de soci (numerari, fundador, d'honor, juvenil…): dret a vot i quota.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { Camp, Carregant, Modal, avisa, avisaError, confirma } from '../ui';
import { t } from '../../i18n';
import type { CategoriaSoci } from './tipus';

type Form = { id: number | null; nom: string; te_vot: boolean; paga_quota: boolean; descripcio: string };
const NOVA: Form = { id: null, nom: '', te_vot: true, paga_quota: true, descripcio: '' };

export function CategoriesSoci({ onClose, onCanvi, potEditar }: { onClose: () => void; onCanvi: () => void; potEditar: boolean }) {
  const { data: categories, error, reload } = useApi<CategoriaSoci[]>('/socis/categories');
  const [form, setForm] = useState<Form | null>(null);

  async function desa(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    try {
      if (form.id) await api.put(`/socis/categories/${form.id}`, form);
      else await api.post('/socis/categories', form);
      avisa(t("Categoria desada."));
      setForm(null);
      reload();
      onCanvi();
    } catch (err) {
      avisaError(err);
    }
  }

  async function elimina(c: CategoriaSoci) {
    if (!(await confirma(t("Segur que vols eliminar la categoria «{0}»?", c.nom)))) return;
    try {
      await api.del(`/socis/categories/${c.id}`);
      avisa(t("Categoria eliminada."));
      reload();
      onCanvi();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <Modal titol={t("Categories de soci")} onClose={onClose} ample>
      <div className="formulari-modal">
        <p className="camp-ample apagat petit">
          {t("La categoria determina si la persona té dret a vot a l'assemblea i si paga quota. Els menors de 18 anys mai no voten, sigui quina sigui la seva categoria.")}
        </p>
        <div className="camp-ample">
          {!categories ? (
            <Carregant error={error} />
          ) : (
            <table className="taula taula-compacta">
              <thead>
                <tr>
                  <th>{t("Categoria")}</th>
                  <th>{t("Vot")}</th>
                  <th>{t("Quota")}</th>
                  <th className="num">{t("Socis actius")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.nom}</strong>
                      {c.descripcio && <div className="apagat petit">{c.descripcio}</div>}
                    </td>
                    <td>{c.te_vot ? t("Sí") : <span className="insignia insignia-sense-vot">{t("sense vot")}</span>}</td>
                    <td>{c.paga_quota ? t("Sí") : t("No")}</td>
                    <td className="num">{c.actius ?? 0}</td>
                    <td className="accions-fila">
                      {potEditar && (
                        <>
                          <button
                            type="button"
                            className="boto boto-petit boto-secundari"
                            onClick={() => setForm({ id: c.id, nom: c.nom, te_vot: Boolean(c.te_vot), paga_quota: Boolean(c.paga_quota), descripcio: c.descripcio ?? '' })}
                          >
                            {t("Edita")}
                          </button>
                          {!c.socis && (
                            <button type="button" className="boto boto-petit boto-perill" onClick={() => elimina(c)}>
                              {t("Elimina")}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {potEditar && !form && (
          <div className="formulari-peu camp-ample">
            <span className="espai" />
            <button type="button" className="boto" onClick={() => setForm({ ...NOVA })}>
              {t("+ Nova categoria")}
            </button>
          </div>
        )}

        {form && (
          <form className="camp-ample targeta categoria-form" onSubmit={desa}>
            <h3 className="sense-marge">{form.id ? t("Edita la categoria") : t("Nova categoria")}</h3>
            <Camp etiqueta={t("Nom")}>
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required autoFocus />
            </Camp>
            <Camp etiqueta={t("Descripció")}>
              <input value={form.descripcio} onChange={(e) => setForm({ ...form, descripcio: e.target.value })} />
            </Camp>
            <label className="casella">
              <input type="checkbox" checked={form.te_vot} onChange={(e) => setForm({ ...form, te_vot: e.target.checked })} />
              {t("Té dret a vot a l'assemblea")}
            </label>
            <label className="casella">
              <input type="checkbox" checked={form.paga_quota} onChange={(e) => setForm({ ...form, paga_quota: e.target.checked })} />
              {t("Paga quota")}
            </label>
            <div className="formulari-peu">
              <span className="espai" />
              <button type="button" className="boto boto-secundari" onClick={() => setForm(null)}>
                {t("Cancel·la")}
              </button>
              <button className="boto">{t("Desa")}</button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
