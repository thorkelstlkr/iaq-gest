import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../../api';
import { Camp, Carregant, Modal, avisa, avisaError, confirma, useExercici } from '../ui';
import { Imprimible } from '../Rgpd';
import { useEntitat } from '../../entitat';
import { avui, centsAText, data, euros, textACents } from '../../format';
import { t } from '../../i18n';
import type { CategoriaPressupost, Pressupost } from './tipus';

/** Desviació i percentatge d'execució. */
function percentatge(real: number, previst: number) {
  if (!previst) return '—';
  return `${Math.round((real / previst) * 100)} %`;
}

export function PressupostAnual() {
  const [exercici] = useExercici();
  const { data: p, error, reload } = useApi<Pressupost>(`/tresoreria/pressupost?exercici=${exercici}`);
  const [editant, setEditant] = useState(false);
  const [aprovant, setAprovant] = useState(false);

  if (!p || p.exercici !== exercici) return <Carregant error={error} />;

  async function copia(origen: 'pressupost' | 'real') {
    if (p!.te_pressupost && !(await confirma(t("Se substituirà el pressupost actual de {0}. Vols continuar?", exercici)))) return;
    try {
      await api.post('/tresoreria/pressupost/copia', { exercici, origen });
      avisa(t("Pressupost copiat. Revisa'l i ajusta les xifres."));
      reload();
      setEditant(true);
    } catch (e) {
      avisaError(e);
    }
  }

  async function desaprova() {
    if (!(await confirma(t("Desfer l'aprovació del pressupost de {0}?", exercici)))) return;
    try {
      await api.post('/tresoreria/pressupost/desaprova', { exercici });
      reload();
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <>
      <div className="barra-accions barra-tresoreria no-imprimir">
        {p.aprovat_el ? (
          <>
            <span className="insignia insignia-pagada">{t("Aprovat per l'assemblea el {0}", data(p.aprovat_el))}</span>
            <span className="espai" />
            <button className="boto boto-secundari" onClick={desaprova}>
              {t("Desfés l'aprovació")}
            </button>
          </>
        ) : (
          <>
            {p.te_pressupost && <span className="insignia insignia-pendent">{t("Pendent d'aprovació")}</span>}
            <span className="espai" />
            <button className="boto boto-secundari" onClick={() => copia('pressupost')}>
              {t("Copia el pressupost de {0}", exercici - 1)}
            </button>
            <button className="boto boto-secundari" onClick={() => copia('real')}>
              {t("Parteix de les xifres reals de {0}", exercici - 1)}
            </button>
            {!editant && (
              <button className="boto boto-secundari" onClick={() => setEditant(true)}>
                {t("Edita el pressupost")}
              </button>
            )}
            {p.te_pressupost && !editant && (
              <button className="boto" onClick={() => setAprovant(true)}>
                {t("Marca'l com a aprovat")}
              </button>
            )}
          </>
        )}
      </div>

      {editant && !p.aprovat_el ? (
        <EditaPressupost
          pressupost={p}
          onClose={() => setEditant(false)}
          onFet={() => {
            setEditant(false);
            reload();
          }}
        />
      ) : !p.te_pressupost ? (
        <div className="buit">
          {t("Encara no hi ha pressupost per a {0}. Pots partir del pressupost o de les xifres reals de l'any anterior, o escriure'l des de zero.", exercici)}
        </div>
      ) : (
        <Liquidacio p={p} />
      )}

      {aprovant && (
        <Aprovacio
          exercici={exercici}
          onClose={() => setAprovant(false)}
          onFet={() => {
            setAprovant(false);
            reload();
          }}
        />
      )}
    </>
  );
}

function EditaPressupost(props: { pressupost: Pressupost; onClose: () => void; onFet: () => void }) {
  const { exercici, categories } = props.pressupost;
  const [valors, setValors] = useState<Record<number, string>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, c.pressupost_cents ? centsAText(c.pressupost_cents) : ''])),
  );
  const [error, setError] = useState<string | null>(null);
  const visibles = categories.filter((c) => c.actiu || c.pressupost_cents);
  const total = (tipus: string) =>
    visibles.filter((c) => c.tipus === tipus).reduce((s, c) => s + (textACents(valors[c.id] ?? '') ?? 0), 0);

  async function envia(e: FormEvent) {
    e.preventDefault();
    const linies = [];
    for (const c of visibles) {
      const v = textACents(valors[c.id] ?? '');
      if (v !== null && v < 0) return setError(t("L'import de «{0}» no és vàlid.", c.nom));
      linies.push({ categoria_id: c.id, import_cents: v ?? 0 });
    }
    try {
      await api.put('/tresoreria/pressupost', { exercici, linies });
      avisa(t("Pressupost desat."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const files = (tipus: 'ingres' | 'despesa') =>
    visibles
      .filter((c) => c.tipus === tipus)
      .map((c) => (
        <tr key={c.id}>
          <td>{c.nom}</td>
          <td className="num apagat">{c.anterior_pressupost_cents ? euros(c.anterior_pressupost_cents) : '—'}</td>
          <td className="num apagat">{c.anterior_real_cents ? euros(c.anterior_real_cents) : '—'}</td>
          <td className="num">
            <input
              className="input-import"
              inputMode="decimal"
              placeholder="0,00"
              value={valors[c.id] ?? ''}
              onChange={(e) => setValors({ ...valors, [c.id]: e.target.value })}
              aria-label={t("Pressupost per a {0}", c.nom)}
            />
          </td>
        </tr>
      ));

  const capcalera = (titol: string) => (
    <tr>
      <th>{titol}</th>
      <th className="num">{t("Pressupost {0}", exercici - 1)}</th>
      <th className="num">{t("Real {0}", exercici - 1)}</th>
      <th className="num">{t("Pressupost {0}", exercici)}</th>
    </tr>
  );

  return (
    <form onSubmit={envia}>
      <div className="taula-contenidor">
        <table className="taula taula-edicio">
          <thead>{capcalera(t("Ingressos"))}</thead>
          <tbody>{files('ingres')}</tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>{t("Total ingressos")}</td>
              <td className="num">{euros(total('ingres'))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="taula-contenidor">
        <table className="taula taula-edicio">
          <thead>{capcalera(t("Despeses"))}</thead>
          <tbody>{files('despesa')}</tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>{t("Total despeses")}</td>
              <td className="num">{euros(total('despesa'))}</td>
            </tr>
            <tr>
              <td colSpan={3}>{t("Resultat previst")}</td>
              <td className={`num ${total('ingres') - total('despesa') < 0 ? 'negatiu' : 'positiu'}`}>
                {euros(total('ingres') - total('despesa'))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="formulari-peu">
        <span className="espai" />
        <button type="button" className="boto boto-secundari" onClick={props.onClose}>
          {t("Cancel·la")}
        </button>
        <button className="boto">{t("Desa el pressupost")}</button>
      </div>
    </form>
  );
}

/** Pressupost i execució (real) per categoria: document per a l'assemblea. */
function Liquidacio({ p }: { p: Pressupost }) {
  const { config } = useEntitat();
  const visibles = p.categories.filter((c) => c.pressupost_cents || c.real_cents);
  const suma = (tipus: string, camp: 'pressupost_cents' | 'real_cents') =>
    visibles.filter((c) => c.tipus === tipus).reduce((s, c) => s + c[camp], 0);
  const anyEnCurs = Number(avui().slice(0, 4)) === p.exercici;

  const bloc = (tipus: 'ingres' | 'despesa', titol: string, titolTotal: string) => {
    const pres = suma(tipus, 'pressupost_cents');
    const real = suma(tipus, 'real_cents');
    return (
      <table className="taula pressupost-taula">
        <thead>
          <tr>
            <th>{titol}</th>
            <th className="num">{t("Pressupost")}</th>
            <th className="num">{t("Real")}</th>
            <th className="num">{t("Desviació")}</th>
            <th className="num">{t("% executat")}</th>
          </tr>
        </thead>
        <tbody>
          {visibles
            .filter((c) => c.tipus === tipus)
            .map((c) => (
              <Fila key={c.id} c={c} tipus={tipus} />
            ))}
        </tbody>
        <tfoot>
          <tr>
            <td>{titolTotal}</td>
            <td className="num">{euros(pres)}</td>
            <td className="num">{euros(real)}</td>
            <td className={`num ${desviacioClasse(real - pres, tipus)}`}>{euros(real - pres)}</td>
            <td className="num">{percentatge(real, pres)}</td>
          </tr>
        </tfoot>
      </table>
    );
  };

  const resultatPres = suma('ingres', 'pressupost_cents') - suma('despesa', 'pressupost_cents');
  const resultatReal = suma('ingres', 'real_cents') - suma('despesa', 'real_cents');

  return (
    <Imprimible titolBoto={t("Imprimeix / desa en PDF")}>
      <header className="document-cap">
        <p className="document-entitat">{config?.nom_complet || config?.nom}</p>
        <p className="apagat petit">{config?.nif && t("NIF {0}", config.nif)}</p>
        <h2>{t("Pressupost {0} i execució", p.exercici)}</h2>
        <p className="apagat petit">
          {p.aprovat_el ? t("Pressupost aprovat per l'assemblea general el {0}.", data(p.aprovat_el)) : t("Pressupost pendent d'aprovació.")}{' '}
          {anyEnCurs && t("Xifres reals a {0}.", data(avui()))}
        </p>
      </header>
      {bloc('ingres', t("Ingressos"), t("Total ingressos"))}
      {bloc('despesa', t("Despeses"), t("Total despeses"))}
      <table className="taula pressupost-taula">
        <tbody>
          <tr className="pressupost-resultat">
            <td>{t("Resultat (ingressos − despeses)")}</td>
            <td className="num">{euros(resultatPres)}</td>
            <td className={`num ${resultatReal < 0 ? 'negatiu' : 'positiu'}`}>{euros(resultatReal)}</td>
            <td className="num">{euros(resultatReal - resultatPres)}</td>
            <td className="num" />
          </tr>
        </tbody>
      </table>
      <div className="signatures">
        <div>
          <span>{t("El/la tresorer/a")}</span>
        </div>
        <div>
          <span>{t("Vist i plau, el/la president/a")}</span>
        </div>
      </div>
    </Imprimible>
  );
}

/** Més ingressos o menys despeses del previst és favorable. */
function desviacioClasse(desviacio: number, tipus: 'ingres' | 'despesa') {
  if (!desviacio) return '';
  return (tipus === 'ingres' ? desviacio > 0 : desviacio < 0) ? 'positiu' : 'negatiu';
}

function Fila({ c, tipus }: { c: CategoriaPressupost; tipus: 'ingres' | 'despesa' }) {
  const desviacio = c.real_cents - c.pressupost_cents;
  return (
    <tr>
      <td>{c.nom}</td>
      <td className="num">{euros(c.pressupost_cents)}</td>
      <td className="num">{euros(c.real_cents)}</td>
      <td className={`num ${desviacioClasse(desviacio, tipus)}`}>{euros(desviacio)}</td>
      <td className="num">{percentatge(c.real_cents, c.pressupost_cents)}</td>
    </tr>
  );
}

function Aprovacio(props: { exercici: number; onClose: () => void; onFet: () => void }) {
  const [dataAprov, setDataAprov] = useState(avui());
  const [error, setError] = useState<string | null>(null);
  async function envia(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post('/tresoreria/pressupost/aprova', { exercici: props.exercici, data: dataAprov });
      avisa(t("Pressupost marcat com a aprovat."));
      props.onFet();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }
  return (
    <Modal titol={t("Aprovació del pressupost {0}", props.exercici)} onClose={props.onClose}>
      <form className="formulari formulari-modal" onSubmit={envia}>
        <p className="camp-ample">{t("Indica la data de l'assemblea general que va aprovar el pressupost. Un cop aprovat, ja no es pot modificar sense desfer l'aprovació.")}</p>
        <Camp etiqueta={t("Data de l'assemblea")}>
          <input type="date" value={dataAprov} onChange={(e) => setDataAprov(e.target.value)} required />
        </Camp>
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
