import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, useApi } from '../api';
import { Camp, Carregant, Xip, avisa, avisaError, confirma } from '../components/ui';
import { useEntitat } from '../entitat';
import { DEMO } from '../mode';
import type { Etiqueta, Finalitat, Usuari } from '../../shared/types';
import { PERFILS, ROLS } from '../../shared/permisos';
import type { Rol } from '../../shared/permisos';
import { t } from '../i18n';

// Seccions de Configuració: finalitats, etiquetes, correu i usuaris.

// ---------- Finalitats estatutàries ----------

export function Finalitats() {
  const { finalitats, recarrega } = useEntitat();
  const [llista, setLlista] = useState<Finalitat[]>(finalitats);
  useEffect(() => setLlista(finalitats), [finalitats]);
  const canvia = (i: number, k: keyof Finalitat, v: string) =>
    setLlista(llista.map((f, j) => (j === i ? { ...f, [k]: v } : f)));
  const seguentCodi = () => {
    for (const c of 'abcdefghijklmnopqrstuvwxyz') if (!llista.some((f) => f.codi === c)) return c;
    return String(llista.length + 1);
  };

  async function desa() {
    try {
      await api.put('/config/finalitats', llista);
      recarrega();
      avisa(t("Finalitats desades."));
    } catch (e) {
      avisaError(e);
    }
  }

  return (
    <section className="targeta">
      <h2>{t("Finalitats estatutàries")}</h2>
      <p className="apagat petit">
        {t("Les finalitats de l'entitat segons els Estatuts. Cada activitat s'hi vincula i la memòria anual s'organitza per finalitats. Si n'elimines una, les activitats que la tenien la deixen de mostrar.")}
      </p>
      <div className="llista-finalitats">
        {llista.map((f, i) => (
          <div key={i} className="finalitat-fila">
            <input
              id={`fin-codi-${i}`}
              className="finalitat-codi"
              value={f.codi}
              onChange={(e) => canvia(i, 'codi', e.target.value)}
              aria-label={t("Codi")}
              maxLength={3}
            />
            <div className="finalitat-textos">
              <input
                id={`fin-curt-${i}`}
                value={f.curt}
                onChange={(e) => canvia(i, 'curt', e.target.value)}
                placeholder={t("Nom curt (p. ex. Patrimoni i tradicions)")}
                aria-label={t("Nom curt")}
              />
              <textarea
                id={`fin-text-${i}`}
                rows={2}
                value={f.text}
                onChange={(e) => canvia(i, 'text', e.target.value)}
                placeholder={t("Text complet dels Estatuts")}
                aria-label={t("Text complet")}
              />
            </div>
            <button
              type="button"
              className="boto-icona"
              onClick={() => setLlista(llista.filter((_, j) => j !== i))}
              aria-label={t("Elimina la finalitat {0}", f.codi)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="formulari-peu">
        <button
          type="button"
          className="boto boto-secundari"
          onClick={() => setLlista([...llista, { codi: seguentCodi(), curt: '', text: '' }])}
        >
          {t("+ Afegeix una finalitat")}
        </button>
        <span className="espai" />
        <button type="button" className="boto" onClick={desa}>
          {t("Desa les finalitats")}
        </button>
      </div>
    </section>
  );
}

// ---------- Etiquetes ----------

const COLORS = ['#56662c', '#9a3b25', '#b7802a', '#2f6f8f', '#7a4a8c', '#3d6b5e', '#a34d6d', '#5a5a5a'];

type Accio = (fn: () => Promise<unknown>, missatge: string) => Promise<boolean>;

export function Etiquetes() {
  const { etiquetes, recarrega } = useEntitat();
  const [nova, setNova] = useState({ nom: '', color: COLORS[0] });

  const accio: Accio = async (fn, missatge) => {
    try {
      await fn();
      recarrega();
      avisa(missatge);
      return true;
    } catch (e) {
      avisaError(e);
      return false;
    }
  };

  async function crea(ev: FormEvent) {
    ev.preventDefault();
    if (await accio(() => api.post('/crm/etiquetes', nova), t("Etiqueta creada.")))
      setNova({ nom: '', color: COLORS[(etiquetes.length + 1) % COLORS.length] });
  }

  return (
    <section className="targeta">
      <h2>{t("Etiquetes de socis")}</h2>
      <p className="apagat petit">
        {t("Serveixen per agrupar socis (Junta, Voluntariat, Música, Cuina, Fotografia…), filtrar-los i enviar-los comunicacions.")}
      </p>
      <ul className="llista-etiquetes">
        {etiquetes.map((e) => (
          <FilaEtiqueta key={e.id} e={e} accio={accio} />
        ))}
      </ul>
      <form className="afegeix-linia" onSubmit={crea}>
        <input
          id="etq-nova"
          value={nova.nom}
          onChange={(e) => setNova({ ...nova, nom: e.target.value })}
          placeholder={t("Nova etiqueta")}
          aria-label={t("Nom de l'etiqueta")}
          required
        />
        <SelectorColor valor={nova.color} onChange={(color) => setNova({ ...nova, color })} />
        <button className="boto boto-petit">{t("Afegeix")}</button>
      </form>
    </section>
  );
}

function SelectorColor({ valor, onChange }: { valor: string; onChange: (c: string) => void }) {
  return (
    <span className="selector-color" role="radiogroup" aria-label={t("Color")}>
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={valor === c}
          aria-label={c}
          className={valor === c ? 'actiu' : ''}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </span>
  );
}

function FilaEtiqueta({ e, accio }: { e: Etiqueta; accio: Accio }) {
  const [editant, setEditant] = useState(false);
  const [f, setF] = useState({ nom: e.nom, color: e.color });

  if (!editant)
    return (
      <li>
        <Xip nom={e.nom} color={e.color} />
        <span className="apagat petit">{e.socis ?? 0} {t("socis")}</span>
        <span className="espai" />
        <button type="button" className="boto boto-petit boto-secundari" onClick={() => setEditant(true)}>
          {t("Edita")}
        </button>
        <button
          type="button"
          className="boto boto-petit boto-secundari"
          onClick={async () => {
            if (await confirma(t("Eliminar l'etiqueta «{0}»? Es traurà de tots els socis.", e.nom)))
              await accio(() => api.del(`/crm/etiquetes/${e.id}`), t("Etiqueta eliminada."));
          }}
        >
          {t("Elimina")}
        </button>
      </li>
    );
  return (
    <li>
      <input id={`etq-${e.id}`} value={f.nom} onChange={(ev) => setF({ ...f, nom: ev.target.value })} aria-label={t("Nom")} />
      <SelectorColor valor={f.color} onChange={(color) => setF({ ...f, color })} />
      <span className="espai" />
      <button
        type="button"
        className="boto boto-petit"
        onClick={async () => {
          if (await accio(() => api.put(`/crm/etiquetes/${e.id}`, f), t("Etiqueta desada."))) setEditant(false);
        }}
      >
        {t("Desa")}
      </button>
      <button type="button" className="boto boto-petit boto-secundari" onClick={() => setEditant(false)}>
        {t("Cancel·la")}
      </button>
    </li>
  );
}

// ---------- Correu (SMTP) ----------

interface ConfigCorreu {
  smtp_host: string;
  smtp_port: string;
  smtp_segur: string;
  smtp_usuari: string;
  smtp_remitent: string;
  te_contrasenya: boolean;
}

export function Correu() {
  const { config } = useEntitat();
  const { data, error, reload } = useApi<ConfigCorreu>('/config/correu');
  const [f, setF] = useState<ConfigCorreu | null>(null);
  const [contrasenya, setContrasenya] = useState('');
  const [provaA, setProvaA] = useState('');
  const [provant, setProvant] = useState(false);
  useEffect(() => setF(data), [data]);
  useEffect(() => setProvaA((a) => a || config?.email || ''), [config?.email]);
  if (!f) return <Carregant error={error} />;
  const set = (k: keyof ConfigCorreu) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  function predefinit(tipus: 'gmail' | 'servidor') {
    if (!f) return;
    if (tipus === 'gmail') setF({ ...f, smtp_host: 'smtp.gmail.com', smtp_port: '465', smtp_segur: '1' });
    else setF({ ...f, smtp_host: f.smtp_host.includes('gmail') ? '' : f.smtp_host, smtp_port: '465', smtp_segur: '1' });
  }

  async function desa(e: FormEvent) {
    e.preventDefault();
    try {
      await api.put('/config/correu', { ...f, smtp_contrasenya: contrasenya || undefined });
      setContrasenya('');
      reload();
      avisa(t("Configuració del correu desada."));
    } catch (err) {
      avisaError(err);
    }
  }

  async function prova() {
    setProvant(true);
    try {
      await api.post('/config/correu/prova', { a: provaA });
      avisa(t("Correu de prova enviat a {0}. Comprova la safata d'entrada (i el correu brossa).", provaA));
    } catch (err) {
      avisaError(err);
    } finally {
      setProvant(false);
    }
  }

  return (
    <form className="formulari targeta" onSubmit={desa}>
      <h2 className="camp-ample">{t("Compte de correu per enviar comunicacions")}</h2>
      <p className="apagat petit camp-ample">
        {t("Pots usar el correu del servidor de la vostra web (recomanat: els missatges surten amb el domini de l'entitat i és menys probable que acabin al correu brossa) o un compte de Gmail. Amb Gmail cal activar la verificació en dos passos i crear una")} <em>{t("contrasenya d'aplicació")}</em> {t("al compte de Google: la contrasenya normal no funciona.")}
      </p>
      <div className="accions camp-ample">
        <span className="apagat petit">{t("Valors habituals:")}</span>
        <button type="button" className="boto boto-petit boto-secundari" onClick={() => predefinit('servidor')}>
          {t("Servidor de la web")}
        </button>
        <button type="button" className="boto boto-petit boto-secundari" onClick={() => predefinit('gmail')}>
          {t("Gmail")}
        </button>
      </div>
      <Camp etiqueta={t("Servidor SMTP")} ajuda={t("p. ex. mail.lavostraweb.cat o smtp.gmail.com")}>
        <input id="smtp-host" value={f.smtp_host} onChange={set('smtp_host')} />
      </Camp>
      <Camp etiqueta={t("Port")}>
        <input id="smtp-port" inputMode="numeric" value={f.smtp_port} onChange={set('smtp_port')} />
      </Camp>
      <Camp etiqueta={t("Connexió")}>
        <select id="smtp-segur" value={f.smtp_segur} onChange={set('smtp_segur')}>
          <option value="1">{t("SSL/TLS (normalment, port 465)")}</option>
          <option value="0">{t("STARTTLS (normalment, port 587)")}</option>
        </select>
      </Camp>
      <Camp etiqueta={t("Usuari")} ajuda={t("Normalment, l'adreça de correu sencera")}>
        <input id="smtp-usuari" value={f.smtp_usuari} onChange={set('smtp_usuari')} autoComplete="off" />
      </Camp>
      <Camp
        etiqueta={t("Contrasenya")}
        ajuda={f.te_contrasenya ? t("Ja n'hi ha una de desada. Deixa-ho en blanc per mantenir-la.") : undefined}
      >
        <input
          id="smtp-contrasenya"
          type="password"
          value={contrasenya}
          onChange={(e) => setContrasenya(e.target.value)}
          autoComplete="new-password"
        />
      </Camp>
      <Camp etiqueta={t("Remitent")} ajuda={t("Com el veuen els socis, p. ex. «Associació <info@…>»")}>
        <input id="smtp-remitent" value={f.smtp_remitent} onChange={set('smtp_remitent')} />
      </Camp>
      <div className="formulari-peu camp-ample">
        <input
          id="smtp-prova"
          className="input-prova"
          type="email"
          value={provaA}
          onChange={(e) => setProvaA(e.target.value)}
          placeholder={t("Adreça per a la prova")}
          aria-label={t("Adreça per a la prova")}
        />
        <button
          type="button"
          className="boto boto-secundari"
          onClick={prova}
          disabled={!provaA || provant || !f.te_contrasenya || DEMO}
          title={!f.te_contrasenya ? t("Desa primer la configuració amb la contrasenya") : undefined}
        >
          {provant ? t("Enviant…") : t("Envia una prova")}
        </button>
        <span className="espai" />
        <button className="boto">{t("Desa")}</button>
      </div>
    </form>
  );
}

// ---------- Usuaris ----------

export function Usuaris() {
  const { usuari: jo } = useEntitat();
  const esAdmin = jo?.rol === 'admin' && !DEMO;
  const { data: usuaris, error, reload } = useApi<Usuari[]>(esAdmin ? '/usuaris' : null);
  const [nou, setNou] = useState({ nom: '', usuari: '', contrasenya: '', rol: 'junta' as Rol });

  async function crea(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post('/usuaris', nou);
      setNou({ nom: '', usuari: '', contrasenya: '', rol: 'junta' });
      reload();
      avisa(t("Usuari creat."));
    } catch (err) {
      avisaError(err);
    }
  }

  if (DEMO) return <p className="apagat">{t("A la demostració no hi ha usuaris.")}</p>;

  return (
    <>
      <CanviContrasenya />
      {esAdmin && (
        <section className="targeta">
          <h2>{t("Usuaris del programa")}</h2>
          <dl className="perfils">
            {ROLS.map((r) => (
              <div key={r}>
                <dt>{t(PERFILS[r].nom)}</dt>
                <dd>{t(PERFILS[r].descripcio)}</dd>
              </div>
            ))}
          </dl>
          {!usuaris ? (
            <Carregant error={error} />
          ) : (
            <div className="taula-contenidor">
              <table className="taula taula-edicio">
                <thead>
                  <tr>
                    <th>{t("Nom")}</th>
                    <th>{t("Usuari")}</th>
                    <th>{t("Perfil")}</th>
                    <th>{t("Actiu")}</th>
                    <th>{t("Nova contrasenya")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {usuaris.map((u) => (
                    <FilaUsuari key={u.id} u={u} jo={u.id === jo!.id} reload={reload} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h3>{t("Nou usuari")}</h3>
          <form className="afegeix-linia" onSubmit={crea}>
            <input id="nou-u-nom" value={nou.nom} onChange={(e) => setNou({ ...nou, nom: e.target.value })} placeholder={t("Nom")} aria-label={t("Nom")} required />
            <input
              id="nou-u-usuari"
              value={nou.usuari}
              onChange={(e) => setNou({ ...nou, usuari: e.target.value })}
              placeholder={t("Usuari")}
              aria-label={t("Usuari")}
              autoComplete="off"
              required
            />
            <input
              id="nou-u-contrasenya"
              type="password"
              value={nou.contrasenya}
              onChange={(e) => setNou({ ...nou, contrasenya: e.target.value })}
              placeholder={t("Contrasenya (8+ caràcters)")}
              aria-label={t("Contrasenya")}
              autoComplete="new-password"
              required
            />
            <select id="nou-u-rol" value={nou.rol} onChange={(e) => setNou({ ...nou, rol: e.target.value as Rol })} aria-label={t("Perfil")}>
              {ROLS.map((r) => (
                <option key={r} value={r}>
                  {t(PERFILS[r].nom)}
                </option>
              ))}
            </select>
            <button className="boto boto-petit">{t("Crea")}</button>
          </form>
        </section>
      )}
    </>
  );
}

function FilaUsuari({ u, jo, reload }: { u: Usuari; jo: boolean; reload: () => void }) {
  const [f, setF] = useState({ nom: u.nom, rol: u.rol, actiu: Boolean(u.actiu), contrasenya: '' });

  async function desa() {
    try {
      await api.put(`/usuaris/${u.id}`, f);
      setF({ ...f, contrasenya: '' });
      reload();
      avisa(t("Usuari desat."));
    } catch (err) {
      avisaError(err);
    }
  }

  async function elimina() {
    if (!(await confirma(t("Eliminar l'usuari «{0}»?", u.usuari)))) return;
    try {
      await api.del(`/usuaris/${u.id}`);
      reload();
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <tr>
      <td>
        <input id={`u-nom-${u.id}`} value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} aria-label={t("Nom")} />
      </td>
      <td>{u.usuari}</td>
      <td>
        <select
          id={`u-rol-${u.id}`}
          value={f.rol}
          onChange={(e) => setF({ ...f, rol: e.target.value as Usuari['rol'] })}
          disabled={jo}
          aria-label={t("Perfil")}
        >
          {ROLS.map((r) => (
            <option key={r} value={r}>
              {t(PERFILS[r].nom)}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input type="checkbox" checked={f.actiu} onChange={(e) => setF({ ...f, actiu: e.target.checked })} disabled={jo} aria-label={t("Actiu")} />
      </td>
      <td>
        <input
          id={`u-pass-${u.id}`}
          type="password"
          value={f.contrasenya}
          onChange={(e) => setF({ ...f, contrasenya: e.target.value })}
          placeholder={t("Sense canvis")}
          autoComplete="new-password"
          aria-label={t("Nova contrasenya")}
        />
      </td>
      <td className="accions-fila">
        <button type="button" className="boto boto-petit" onClick={desa}>
          {t("Desa")}
        </button>
        {!jo && (
          <button type="button" className="boto boto-petit boto-secundari" onClick={elimina}>
            {t("Elimina")}
          </button>
        )}
      </td>
    </tr>
  );
}

function CanviContrasenya() {
  const [f, setF] = useState({ actual: '', nova: '', repeteix: '' });

  async function desa(e: FormEvent) {
    e.preventDefault();
    if (f.nova !== f.repeteix) return avisa(t("Les contrasenyes noves no coincideixen."), 'error');
    try {
      await api.put('/usuaris/jo/contrasenya', f);
      setF({ actual: '', nova: '', repeteix: '' });
      avisa(t("Contrasenya canviada."));
    } catch (err) {
      avisaError(err);
    }
  }

  return (
    <form className="formulari targeta" onSubmit={desa}>
      <h2 className="camp-ample">{t("La meva contrasenya")}</h2>
      <Camp etiqueta={t("Contrasenya actual")}>
        <input id="cc-actual" type="password" value={f.actual} onChange={(e) => setF({ ...f, actual: e.target.value })} autoComplete="current-password" required />
      </Camp>
      <Camp etiqueta={t("Contrasenya nova")} ajuda={t("Almenys 8 caràcters")}>
        <input id="cc-nova" type="password" value={f.nova} onChange={(e) => setF({ ...f, nova: e.target.value })} autoComplete="new-password" required />
      </Camp>
      <Camp etiqueta={t("Repeteix la nova")}>
        <input id="cc-repeteix" type="password" value={f.repeteix} onChange={(e) => setF({ ...f, repeteix: e.target.value })} autoComplete="new-password" required />
      </Camp>
      <div className="formulari-peu camp-ample">
        <span className="espai" />
        <button className="boto">{t("Canvia la contrasenya")}</button>
      </div>
    </form>
  );
}
