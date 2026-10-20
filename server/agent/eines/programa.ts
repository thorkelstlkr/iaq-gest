// Eines del domini «programa» per als agents d'IA: activitats, inscripcions, indicadors i memòria,
// web (notícies, pàgines, publicació) i xarxes socials.
//
// Totes les eines fan servir només l'API interna (les mateixes rutes que la interfície). Mai no tornen
// imatges ni dades de contacte: les inscripcions es redueixen a nom, edat/franja, gènere i estat.
import { avui } from '../../../shared/dates.ts';
import type { ApiInterna, Eina } from '../tipus.ts';

// ---------- Ajudes ----------

const anyActual = () => new Date().getFullYear();
const LIMIT = 50;
const limitDe = (v: unknown, def = LIMIT) => Math.max(1, Math.min(200, Number(v) || def));
const id = (v: unknown, camp: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid ${camp}.`);
  return n;
};

type Fila = Record<string, any>;

const ESTATS_ACTIVITAT = ['idea', 'preparacio', 'confirmada', 'feta', 'anul·lada'];

/** Activitat en format compacte (sense imatge). */
const activitatCompacta = (a: Fila) => ({
  id: a.id,
  name: a.nom,
  start_date: a.data_inici,
  end_date: a.data_fi,
  place: a.lloc,
  state: a.estat,
  objectives: a.objectius ? String(a.objectius).split(',').filter(Boolean) : [],
  public_on_web: Boolean(a.web_publica),
  places: a.places,
  registered: a.inscrits,
  waiting_list: a.en_espera,
  attended: a.assistents,
  anonymous_attendees: a.assistents_anonims,
  pending_tasks: a.tasques_pendents,
  responsible_member_id: a.responsable_soci_id,
  responsible_name: a.responsable_nom,
  budget_cents: a.pressupost_cents,
  income_cents: a.ingressos_cents,
  expenses_cents: a.despeses_cents,
});

/** Inscripció sense cap dada de contacte, tutor ni data de naixement. */
const participantCompacte = (p: Fila) => ({
  participant_id: p.id,
  name: p.nom,
  type: p.tipus, // soci | interessat | extern
  member_id: p.soci_id,
  member_number: p.num_soci,
  prospect_id: p.interessat_id,
  status: p.estat, // inscrit | espera | cancel·lat
  registered_at: p.inscrit_el,
  attended: Boolean(p.assistit),
  age: p.edat,
  age_band: p.franja,
  gender: p.genere,
  minor: Boolean(p.menor),
  minor_without_guardian_authorisation: Boolean(p.menor && !p.autoritzacio_tutor && p.estat !== 'cancel·lat'),
  image_consent: p.drets_imatge_consta ? Boolean(p.drets_imatge) : null,
});

const nomsPromocionats = (llista: Fila[] | undefined) => (llista ?? []).map((p) => ({ participant_id: p.id, name: p.nom }));

/** Persones sense consentiment d'imatge en una activitat (per avisar abans de publicar). */
async function senseDretsImatge(api: ApiInterna, activitatId: number | null | undefined) {
  if (!activitatId) return null;
  try {
    const r = await api.get<Fila>(`/activitats/${activitatId}/sense-drets-imatge`);
    return { without_image_consent: r.total, minors_without_image_consent: r.menors };
  } catch {
    return null;
  }
}
const avisImatge = (d: { without_image_consent: number; minors_without_image_consent: number } | null) =>
  d && d.without_image_consent > 0
    ? ` ATENCIÓ: ${d.without_image_consent} participant(s) de l'activitat${d.minors_without_image_consent ? ` (${d.minors_without_image_consent} menors)` : ''} no tenen consentiment d'imatge: comprova que no surtin a les fotos.`
    : d
      ? " Tots els participants de l'activitat tenen consentiment d'imatge."
      : '';

/** Cos complet per a PUT /activitats/:id a partir de l'activitat actual (el PUT substitueix els camps). */
const CAMPS_ACTIVITAT = [
  'nom', 'data_inici', 'data_fi', 'lloc', 'descripcio', 'objectius', 'participants', 'notes', 'web_publica',
  'estat', 'places', 'assistents_anonims', 'responsable_soci_id', 'pressupost_cents', 'materials', 'public_objectiu',
];
async function cosActivitat(api: ApiInterna, activitatId: number) {
  const a = await api.get<Fila>(`/activitats/${activitatId}`);
  const cos: Fila = {};
  for (const c of CAMPS_ACTIVITAT) cos[c] = a[c];
  return { actual: a, cos }; // sense «imatge»: el servidor conserva la que hi ha
}

/** Converteix els paràmetres de l'agent als camps de l'activitat (només els que hi són). */
function campsActivitat(a: Fila): Fila {
  const c: Fila = {};
  const map: [string, string][] = [
    ['name', 'nom'], ['start_date', 'data_inici'], ['end_date', 'data_fi'], ['place', 'lloc'],
    ['description', 'descripcio'], ['state', 'estat'], ['places', 'places'], ['responsible_member_id', 'responsable_soci_id'],
    ['notes', 'notes'], ['materials', 'materials'], ['target_audience', 'public_objectiu'],
  ];
  for (const [k, camp] of map) if (a[k] !== undefined) c[camp] = a[k];
  if (a.objectives !== undefined) c.objectius = Array.isArray(a.objectives) ? a.objectives : String(a.objectives).split(',');
  if (a.budget_euros !== undefined) c.pressupost_cents = a.budget_euros === null ? null : Math.round(Number(a.budget_euros) * 100);
  if (a.public_on_web !== undefined) c.web_publica = a.public_on_web ? 1 : 0;
  return c;
}

const propsActivitat = {
  name: { type: 'string', description: 'Activity name.' },
  start_date: { type: 'string', description: 'Start date YYYY-MM-DD.' },
  end_date: { type: 'string', description: 'End date YYYY-MM-DD (optional, for multi-day activities).' },
  place: { type: 'string' },
  description: { type: 'string', description: 'Public description in Markdown (shown on the website if public).' },
  objectives: { type: 'array', items: { type: 'string' }, description: 'Statutory objective codes (see list_objectives), e.g. ["a","c"].' },
  places: { type: 'integer', description: 'Maximum number of places (omit or null = unlimited). When full, new registrations go to the waiting list.' },
  state: { type: 'string', enum: ESTATS_ACTIVITAT.filter((e) => e !== 'anul·lada'), description: 'idea, preparacio (in preparation), confirmada (confirmed), feta (done). To cancel use cancel_activity.' },
  responsible_member_id: { type: 'integer', description: 'Member id of the person responsible.' },
  budget_euros: { type: 'number', description: 'Planned budget in euros (e.g. 120.50).' },
  public_on_web: { type: 'boolean', description: 'Show it on the public website agenda (default true).' },
  target_audience: { type: 'string', description: 'Target audience (planning note).' },
  materials: { type: 'string', description: 'Materials needed (planning note).' },
  notes: { type: 'string', description: 'Internal notes.' },
};

const noticiaCompacta = (n: Fila) => ({
  id: n.id,
  title: n.titol,
  slug: n.slug,
  date: n.data,
  summary: n.resum,
  published: Boolean(n.publicada),
  activity_id: n.activitat_id,
  activity_name: n.activitat_nom,
  has_image: Boolean(n.te_imatge ?? n.imatge),
});

async function estatWebCompacte(api: ApiInterna) {
  const e = await api.get<Fila>('/web/estat');
  return {
    pending_changes: e.pendent,
    last_change_at: e.canvis_el,
    last_published_at: e.publicada_el,
    publishing_now: e.publicant,
    last_error: e.error,
    auto_publish: e.auto,
    ftp_configured: e.ftp_configurat,
    files: e.fitxers,
  };
}

/** Adapta el text proposat a cada xarxa. */
function textosPerXarxa(text: string, enllac: string | null) {
  const net = text.trim();
  const ambEnllac = enllac ? `${net}\n\n${enllac}` : net;
  const x = (() => {
    const max = 280 - (enllac ? 24 : 0); // X compta els enllaços com 23 caràcters
    const cos = net.length > max ? `${net.slice(0, max - 1).trimEnd()}…` : net;
    return enllac ? `${cos} ${enllac}` : cos;
  })();
  return {
    instagram: enllac ? `${net}\n\n(Enllaç a la bio)` : net,
    facebook: ambEnllac,
    x,
    tiktok: net,
    youtube: ambEnllac,
  };
}

// ---------- Eines ----------

export const EINES: Eina[] = [
  // ----- Activitats: consulta -----
  {
    nom: 'list_activities',
    descripcio:
      'List or search activities. Filters: year (or all years), when (upcoming = start date today or later, past = before today), state, statutory objective code, free-text search on name/place. Returns per activity: id, name, start_date/end_date (YYYY-MM-DD), place, state (idea, preparacio, confirmada, feta, anul·lada), objectives (codes), places, registered, waiting_list, attended, anonymous_attendees, pending_tasks, responsible, budget_cents/income_cents/expenses_cents (euro cents). Sorted by date (upcoming ascending, otherwise descending).',
    parametres: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: 'Year (e.g. 2026). Defaults to the current year; ignored if all_years is true.' },
        all_years: { type: 'boolean', description: 'Search all years.' },
        when: { type: 'string', enum: ['upcoming', 'past', 'all'], description: 'Default all.' },
        state: { type: 'string', enum: ESTATS_ACTIVITAT },
        objective: { type: 'string', description: 'Statutory objective code (see list_objectives).' },
        search: { type: 'string', description: 'Text contained in the name or place (case-insensitive).' },
        limit: { type: 'integer', description: 'Max results (default 50).' },
      },
    },
    nivell: 'lectura',
    modul: 'activitats',
    executa: async (a, api) => {
      const tot = a.all_years || a.when === 'upcoming';
      let llista = await api.get<Fila[]>(`/activitats?exercici=${tot ? 'totes' : Number(a.year) || anyActual()}`);
      if (a.when === 'upcoming' && !a.all_years && a.year) llista = llista.filter((x) => String(x.data_inici).startsWith(String(a.year)));
      const ara = avui();
      if (a.when === 'upcoming') llista = llista.filter((x) => (x.data_fi ?? x.data_inici) >= ara).reverse();
      if (a.when === 'past') llista = llista.filter((x) => (x.data_fi ?? x.data_inici) < ara);
      if (a.state) llista = llista.filter((x) => x.estat === a.state);
      if (a.objective) llista = llista.filter((x) => String(x.objectius ?? '').split(',').includes(String(a.objective)));
      if (a.search) {
        const q = String(a.search).toLowerCase();
        llista = llista.filter((x) => `${x.nom} ${x.lloc ?? ''}`.toLowerCase().includes(q));
      }
      const limit = limitDe(a.limit);
      return { total: llista.length, activities: llista.slice(0, limit).map(activitatCompacta) };
    },
  },
  {
    nom: 'get_activity',
    descripcio:
      'Full detail of one activity: planning (description in Markdown, objectives, target audience, materials, notes, responsible), places, registered/waiting list/attendance counts, anonymous attendees, budget vs actual (budget_cents, income_cents, expenses_cents, balance_cents; euro cents), tasks (if your profile can see them), partner organisations and how many participants lack image consent. Use list_activity_participants for the people.',
    parametres: { type: 'object', properties: { activity_id: { type: 'integer' } }, required: ['activity_id'] },
    nivell: 'lectura',
    modul: 'activitats',
    executa: async (a, api) => {
      const aid = id(a.activity_id, 'activity_id');
      const act = await api.get<Fila>(`/activitats/${aid}`);
      const tasques = await api.get<Fila[]>(`/crm/tasques?activitat_id=${aid}&estat=totes`).then(
        (t) => t.map((x) => ({ task_id: x.id, title: x.titol, due_date: x.data_limit, done: Boolean(x.feta), member_id: x.soci_id, member_name: x.soci_nom, notes: x.notes })),
        () => 'not available for your profile',
      );
      const entitats = await api.get<Fila[]>(`/comunitat/activitats/${aid}/entitats`).then(
        (l) => l.map((e) => ({ organisation_id: e.entitat_id, name: e.nom, type: e.tipus, role: e.rol, notes: e.notes })),
        () => 'not available for your profile',
      );
      return {
        ...activitatCompacta(act),
        description: act.descripcio,
        target_audience: act.public_objectiu,
        materials: act.materials,
        notes: act.notes,
        participants_manual_count: act.participants,
        has_image: Boolean(act.imatge),
        balance_cents: (act.ingressos_cents ?? 0) - (act.despeses_cents ?? 0),
        budget_deviation_cents: act.pressupost_cents === null ? null : (act.despeses_cents ?? 0) - act.pressupost_cents,
        image_rights: await senseDretsImatge(api, aid),
        tasks: tasques,
        partners: entitats,
      };
    },
  },
  {
    nom: 'list_objectives',
    descripcio: "The association's statutory objectives (finalitats): code, short name and full text. Activities are linked to these codes.",
    parametres: { type: 'object', properties: {} },
    nivell: 'lectura',
    modul: 'activitats',
    executa: async (_a, api) =>
      (await api.get<Fila[]>('/config/finalitats')).map((f) => ({ code: f.codi, short_name: f.curt, text: f.text })),
  },

  // ----- Activitats: modificació -----
  {
    nom: 'create_activity',
    descripcio:
      'Create an activity (internal; shown on the website agenda only after the website is published). Returns the created activity in compact form (with its id). Default state: confirmada.',
    parametres: { type: 'object', properties: propsActivitat, required: ['name', 'start_date'] },
    nivell: 'escriptura',
    modul: 'activitats',
    executa: async (a, api) => {
      const cos = { estat: 'confirmada', web_publica: 1, ...campsActivitat(a) };
      return activitatCompacta(await api.post<Fila>('/activitats', cos));
    },
  },
  {
    nom: 'update_activity',
    descripcio:
      'Update fields of an existing activity; only the fields you pass change. Cannot cancel it (use cancel_activity). If places are increased, people on the waiting list are moved in automatically; their names are returned in promoted_from_waiting_list (tell the user to notify them).',
    parametres: { type: 'object', properties: { activity_id: { type: 'integer' }, ...propsActivitat }, required: ['activity_id'] },
    nivell: 'escriptura',
    modul: 'activitats',
    executa: async (a, api) => {
      const aid = id(a.activity_id, 'activity_id');
      if (a.state === 'anul·lada') throw new Error('To cancel an activity use cancel_activity.');
      const { cos } = await cosActivitat(api, aid);
      const r = await api.put<Fila>(`/activitats/${aid}`, { ...cos, ...campsActivitat(a) });
      return { ...activitatCompacta(r), promoted_from_waiting_list: nomsPromocionats(r.promocionats) };
    },
  },
  {
    nom: 'cancel_activity',
    descripcio:
      'Cancel an activity (state anul·lada): it disappears from the website agenda and from the annual report. Registrations are kept. Requires human approval because registered people may need to be told.',
    parametres: { type: 'object', properties: { activity_id: { type: 'integer' } }, required: ['activity_id'] },
    nivell: 'proposta',
    modul: 'activitats',
    resum: async (a, api) => {
      const act = await api.get<Fila>(`/activitats/${id(a.activity_id, 'activity_id')}`);
      const n = (act.inscrits ?? 0) + (act.en_espera ?? 0);
      return `Anul·lar l'activitat «${act.nom}» (${act.data_inici})${n ? `: hi ha ${act.inscrits} persones inscrites i ${act.en_espera} en llista d'espera, caldrà avisar-les` : ''}.`;
    },
    executa: async (a, api) => {
      const aid = id(a.activity_id, 'activity_id');
      const { cos } = await cosActivitat(api, aid);
      return activitatCompacta(await api.put<Fila>(`/activitats/${aid}`, { ...cos, estat: 'anul·lada' }));
    },
  },
  {
    nom: 'set_anonymous_attendees',
    descripcio: 'Set the number of anonymous attendees of an activity (people who came without registering, e.g. public events). Only a count is stored; it adds to the impact indicators.',
    parametres: {
      type: 'object',
      properties: { activity_id: { type: 'integer' }, count: { type: 'integer', description: 'Number of anonymous attendees (0 or more).' } },
      required: ['activity_id', 'count'],
    },
    nivell: 'escriptura',
    modul: 'activitats',
    executa: async (a, api) =>
      api.put(`/activitats/${id(a.activity_id, 'activity_id')}/assistents-anonims`, { assistents_anonims: Number(a.count) }),
  },
  {
    nom: 'save_activity_task',
    descripcio:
      'Create a task for an activity (no task_id) or update an existing one (with task_id; only fields passed change). Use done=true to mark it completed. Returns the task.',
    parametres: {
      type: 'object',
      properties: {
        activity_id: { type: 'integer', description: 'Required when creating.' },
        task_id: { type: 'integer', description: 'Existing task id to update.' },
        title: { type: 'string' },
        due_date: { type: 'string', description: 'YYYY-MM-DD' },
        member_id: { type: 'integer', description: 'Member responsible for the task.' },
        notes: { type: 'string' },
        done: { type: 'boolean' },
      },
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      let r: Fila;
      if (a.task_id) {
        const tid = id(a.task_id, 'task_id');
        const filtre = a.activity_id ? `activitat_id=${id(a.activity_id, 'activity_id')}&` : '';
        const actual = (await api.get<Fila[]>(`/crm/tasques?${filtre}estat=totes`)).find((t) => t.id === tid);
        if (!actual) throw new Error('Task not found.');
        r = await api.put<Fila>(`/crm/tasques/${tid}`, {
          titol: a.title ?? actual.titol,
          data_limit: a.due_date !== undefined ? a.due_date : actual.data_limit,
          soci_id: a.member_id !== undefined ? a.member_id : actual.soci_id,
          notes: a.notes !== undefined ? a.notes : actual.notes,
          activitat_id: actual.activitat_id,
          feta: a.done !== undefined ? Boolean(a.done) : Boolean(actual.feta),
        });
      } else {
        if (!a.activity_id || !a.title) throw new Error('activity_id and title are required to create a task.');
        r = await api.post<Fila>('/crm/tasques', {
          titol: a.title, data_limit: a.due_date ?? null, soci_id: a.member_id ?? null, notes: a.notes ?? null,
          activitat_id: id(a.activity_id, 'activity_id'),
        });
        if (a.done) r = await api.put<Fila>(`/crm/tasques/${r.id}`, { ...r, feta: true });
      }
      return { task_id: r.id, title: r.titol, due_date: r.data_limit, done: Boolean(r.feta), member_id: r.soci_id, member_name: r.soci_nom, activity_id: r.activitat_id, notes: r.notes };
    },
  },

  // ----- Inscripcions -----
  {
    nom: 'list_activity_participants',
    descripcio:
      'People registered in an activity: participant_id, name, type (soci = member, interessat = prospect, extern = external person), member_number, status (inscrit = registered, espera = waiting list in order, cancel·lat = cancelled), attended, age and age_band at the activity date, gender, minor, minor_without_guardian_authorisation (needs the signed authorisation) and image_consent (true/false/null = unknown). No contact data. Also returns totals.',
    parametres: {
      type: 'object',
      properties: {
        activity_id: { type: 'integer' },
        status: { type: 'string', enum: ['inscrit', 'espera', 'cancel·lat', 'active'], description: 'Filter; active = registered + waiting list.' },
        limit: { type: 'integer', description: 'Max people returned (default 200).' },
      },
      required: ['activity_id'],
    },
    nivell: 'lectura',
    modul: 'socis',
    executa: async (a, api) => {
      const tots = (await api.get<Fila[]>(`/crm/activitats/${id(a.activity_id, 'activity_id')}/participants`)).map(participantCompacte);
      const llista = !a.status ? tots : tots.filter((p) => (a.status === 'active' ? p.status !== 'cancel·lat' : p.status === a.status));
      return {
        totals: {
          registered: tots.filter((p) => p.status === 'inscrit').length,
          waiting_list: tots.filter((p) => p.status === 'espera').length,
          cancelled: tots.filter((p) => p.status === 'cancel·lat').length,
          attended: tots.filter((p) => p.attended).length,
          minors_without_guardian_authorisation: tots.filter((p) => p.minor_without_guardian_authorisation).length,
          without_image_consent: tots.filter((p) => p.status !== 'cancel·lat' && p.image_consent !== true).length,
        },
        participants: llista.slice(0, limitDe(a.limit, 200)),
      };
    },
  },
  {
    nom: 'register_activity_participant',
    descripcio:
      'Register a person in an activity. Give exactly one of: member_id (association member), prospect_id (interested person from the CRM) or external_name (someone else, e.g. a grandchild). For external people you may give gender and birth_year (stored as an approximate date YYYY-01-01, only used for age statistics; leave empty if unknown). Never ask for or store contact data here. If the activity is full the person goes to the waiting list (status espera) unless attended=true. Returns the registration (status, age_band, minor flags).',
    parametres: {
      type: 'object',
      properties: {
        activity_id: { type: 'integer' },
        member_id: { type: 'integer' },
        prospect_id: { type: 'integer' },
        external_name: { type: 'string', description: 'Full name of an external person.' },
        gender: { type: 'string', enum: ['dona', 'home', 'altre', 'nc'], description: 'External/prospect only: dona (woman), home (man), altre (other), nc (not stated).' },
        birth_year: { type: 'integer', description: 'External/prospect only, optional (approximate age).' },
        attended: { type: 'boolean', description: 'Already attended (registration at the door).' },
        notes: { type: 'string' },
      },
      required: ['activity_id'],
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const quants = [a.member_id, a.prospect_id, a.external_name].filter((v) => v !== undefined && v !== null && v !== '').length;
      if (quants !== 1) throw new Error('Give exactly one of member_id, prospect_id or external_name.');
      const cos: Fila = { assistit: Boolean(a.attended), notes: a.notes ?? null };
      if (a.member_id) cos.soci_id = id(a.member_id, 'member_id');
      else {
        if (a.prospect_id) cos.interessat_id = id(a.prospect_id, 'prospect_id');
        else cos.nom_extern = String(a.external_name);
        if (a.gender) cos.genere = a.gender;
        if (a.birth_year) {
          const y = Number(a.birth_year);
          if (!Number.isInteger(y) || y < 1900 || y > anyActual()) throw new Error('Invalid birth_year.');
          cos.data_naixement = `${y}-01-01`;
        }
      }
      const p = await api.post<Fila>(`/crm/activitats/${id(a.activity_id, 'activity_id')}/participants`, cos);
      return participantCompacte(p);
    },
  },
  {
    nom: 'set_participant_status',
    descripcio:
      'Cancel a registration (status cancel·lat) or reinstate it (inscrit / espera). The record is kept (reversible). When a place becomes free, the first people on the waiting list are moved in automatically: their names come in promoted_from_waiting_list (tell the user to notify them).',
    parametres: {
      type: 'object',
      properties: {
        activity_id: { type: 'integer' },
        participant_id: { type: 'integer', description: 'participant_id from list_activity_participants.' },
        status: { type: 'string', enum: ['cancel·lat', 'inscrit', 'espera'] },
      },
      required: ['activity_id', 'participant_id', 'status'],
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const r = await api.put<Fila>(
        `/crm/activitats/${id(a.activity_id, 'activity_id')}/participants/${id(a.participant_id, 'participant_id')}`,
        { estat: a.status },
      );
      return { participant: participantCompacte(r.participant), promoted_from_waiting_list: nomsPromocionats(r.promocionats) };
    },
  },
  {
    nom: 'mark_attendance',
    descripcio:
      'Mark attendance for several participants of an activity at once (attended true, or false to undo). Pass participant_ids, or all_registered=true to mark everybody with status inscrit. Returns how many were updated.',
    parametres: {
      type: 'object',
      properties: {
        activity_id: { type: 'integer' },
        participant_ids: { type: 'array', items: { type: 'integer' } },
        all_registered: { type: 'boolean' },
        attended: { type: 'boolean', description: 'Default true.' },
      },
      required: ['activity_id'],
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const aid = id(a.activity_id, 'activity_id');
      let ids: number[] = Array.isArray(a.participant_ids) ? a.participant_ids.map((x: unknown) => id(x, 'participant_id')) : [];
      if (a.all_registered) {
        const tots = await api.get<Fila[]>(`/crm/activitats/${aid}/participants`);
        ids = [...new Set([...ids, ...tots.filter((p) => p.estat === 'inscrit').map((p) => p.id as number)])];
      }
      if (!ids.length) throw new Error('Give participant_ids or all_registered=true.');
      const assistit = a.attended === undefined ? true : Boolean(a.attended);
      const errors: { participant_id: number; error: string }[] = [];
      for (const pid of ids) {
        try {
          await api.put(`/crm/activitats/${aid}/participants/${pid}`, { assistit });
        } catch (e) {
          errors.push({ participant_id: pid, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return { updated: ids.length - errors.length, attended: assistit, errors };
    },
  },

  // ----- Indicadors i memòria -----
  {
    nom: 'get_impact_indicators',
    descripcio:
      'Impact indicators of the activities of a year (cancelled excluded), based on real attendance: per activity total_assistents, registered/anonymous attendees, per age band and gender, members vs non-members, intergenerational flag, budget/income/expenses (cents); and totals (unique people, intergenerational activities, attendance by age band and gender). Useful for grant justifications.',
    parametres: { type: 'object', properties: { year: { type: 'integer', description: 'Defaults to the current year.' } } },
    nivell: 'lectura',
    modul: 'informes',
    executa: (a, api) => api.get(`/informes/indicadors?exercici=${Number(a.year) || anyActual()}`),
  },
  {
    nom: 'get_annual_activity_report',
    descripcio:
      "Data for the annual activity report (memòria d'activitats) of a year: member base composition (aggregated counts), the year's activities (not cancelled) with dates, place, objectives, registrations and attendance, and the impact indicators totals. Write the report text from this.",
    parametres: { type: 'object', properties: { year: { type: 'integer', description: 'Defaults to the current year.' } } },
    nivell: 'lectura',
    modul: 'informes',
    executa: async (a, api) => {
      const m = await api.get<Fila>(`/informes/memoria?exercici=${Number(a.year) || anyActual()}`);
      return {
        year: m.exercici,
        members: m.socis,
        activities: (m.activitats as Fila[]).map((x) => ({ ...activitatCompacta(x), description: x.descripcio })),
        indicators_totals: m.indicadors?.totals,
      };
    },
  },

  // ----- Web -----
  {
    nom: 'get_website_status',
    descripcio:
      'Public website status: pending_changes (changes not yet uploaded), last_change_at / last_published_at (ISO timestamps), last_error, auto_publish, ftp_configured; plus news counts (published/drafts) and the list of custom pages (id, title, slug, order, published).',
    parametres: { type: 'object', properties: {} },
    nivell: 'lectura',
    modul: 'web',
    executa: async (_a, api) => {
      const noticies = await api.get<Fila[]>('/web/noticies');
      const pagines = await api.get<Fila[]>('/web/pagines');
      return {
        ...(await estatWebCompacte(api)),
        news: { published: noticies.filter((n) => n.publicada).length, drafts: noticies.filter((n) => !n.publicada).length },
        pages: pagines.map((p) => ({ id: p.id, title: p.titol, slug: p.slug, order: p.ordre, published: Boolean(p.publicada) })),
      };
    },
  },
  {
    nom: 'list_news',
    descripcio:
      'List website news (id, title, slug, date YYYY-MM-DD, summary, published, linked activity). Filter by published/draft. Pass news_id to get one news item with its full Markdown content.',
    parametres: {
      type: 'object',
      properties: {
        news_id: { type: 'integer', description: 'Return this news item with its content.' },
        status: { type: 'string', enum: ['published', 'draft', 'all'], description: 'Default all.' },
        limit: { type: 'integer', description: 'Default 50.' },
      },
    },
    nivell: 'lectura',
    modul: 'web',
    executa: async (a, api) => {
      if (a.news_id) {
        const n = await api.get<Fila>(`/web/noticies/${id(a.news_id, 'news_id')}`);
        return { ...noticiaCompacta(n), content: n.contingut };
      }
      let l = await api.get<Fila[]>('/web/noticies');
      if (a.status === 'published') l = l.filter((n) => n.publicada);
      if (a.status === 'draft') l = l.filter((n) => !n.publicada);
      return { total: l.length, news: l.slice(0, limitDe(a.limit)).map(noticiaCompacta) };
    },
  },
  {
    nom: 'save_news_draft',
    descripcio:
      'Create a news item as an unpublished draft (no news_id), or update a draft (with news_id; only fields passed change). Published news cannot be edited here (ask the user to do it in the program). To make it public use publish_news. Content is Markdown. Returns the news item.',
    parametres: {
      type: 'object',
      properties: {
        news_id: { type: 'integer' },
        title: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD (default today).' },
        summary: { type: 'string', description: 'Short summary (1-2 sentences).' },
        content: { type: 'string', description: 'Body in Markdown.' },
        activity_id: { type: 'integer', description: 'Linked activity (optional).' },
      },
    },
    nivell: 'escriptura',
    modul: 'web',
    executa: async (a, api) => {
      if (a.news_id) {
        const nid = id(a.news_id, 'news_id');
        const n = await api.get<Fila>(`/web/noticies/${nid}`);
        if (n.publicada) throw new Error('This news item is already published; it cannot be edited by the agent.');
        const r = await api.put<Fila>(`/web/noticies/${nid}`, {
          titol: a.title ?? n.titol, slug: n.slug, data: a.date ?? n.data, resum: a.summary !== undefined ? a.summary : n.resum,
          contingut: a.content ?? n.contingut, imatge: n.imatge, activitat_id: a.activity_id !== undefined ? a.activity_id : n.activitat_id,
          publicada: 0,
        });
        return { ...noticiaCompacta(r), content: r.contingut };
      }
      if (!a.title) throw new Error('title is required to create a news item.');
      const r = await api.post<Fila>('/web/noticies', {
        titol: a.title, data: a.date ?? null, resum: a.summary ?? null, contingut: a.content ?? '', activitat_id: a.activity_id ?? null, publicada: 0,
      });
      return { ...noticiaCompacta(r), content: r.contingut };
    },
  },
  {
    nom: 'publish_news',
    descripcio:
      'Make a draft news item public and (by default) upload the website by FTP so it appears online. The approver is shown how many people of the linked activity lack image consent.',
    parametres: {
      type: 'object',
      properties: {
        news_id: { type: 'integer' },
        upload_website: { type: 'boolean', description: 'Also upload the website now (default true; skipped if FTP is not configured).' },
      },
      required: ['news_id'],
    },
    nivell: 'proposta',
    modul: 'web',
    resum: async (a, api) => {
      const n = await api.get<Fila>(`/web/noticies/${id(a.news_id, 'news_id')}`);
      const pujar = a.upload_website !== false;
      return `Publicar a la web la notícia «${n.titol}»${pujar ? ' i pujar la web per FTP' : ''}.${avisImatge(await senseDretsImatge(api, n.activitat_id))}`;
    },
    executa: async (a, api) => {
      const nid = id(a.news_id, 'news_id');
      const n = await api.get<Fila>(`/web/noticies/${nid}`);
      const r = await api.put<Fila>(`/web/noticies/${nid}`, { ...n, publicada: 1 });
      let pujada: unknown = 'not requested';
      if (a.upload_website !== false) {
        const e = await estatWebCompacte(api);
        pujada = e.ftp_configured ? await api.post('/web/publica').then(() => 'uploaded') : 'FTP not configured: publish the website from the program';
      }
      return { ...noticiaCompacta(r), website_upload: pujada };
    },
  },
  {
    nom: 'save_page_draft',
    descripcio:
      'Create a custom website page as an unpublished draft (no page_id), or update an unpublished page (with page_id; only fields passed change). Published pages cannot be edited by the agent. Content is Markdown.',
    parametres: {
      type: 'object',
      properties: {
        page_id: { type: 'integer' },
        title: { type: 'string' },
        content: { type: 'string', description: 'Markdown.' },
        order: { type: 'integer', description: 'Menu order.' },
      },
    },
    nivell: 'escriptura',
    modul: 'web',
    executa: async (a, api) => {
      let r: Fila;
      if (a.page_id) {
        const pid = id(a.page_id, 'page_id');
        const p = await api.get<Fila>(`/web/pagines/${pid}`);
        if (p.publicada) throw new Error('This page is published; it cannot be edited by the agent.');
        r = await api.put<Fila>(`/web/pagines/${pid}`, {
          titol: a.title ?? p.titol, slug: p.slug, contingut: a.content ?? p.contingut, ordre: a.order ?? p.ordre, publicada: 0,
        });
      } else {
        if (!a.title) throw new Error('title is required to create a page.');
        r = await api.post<Fila>('/web/pagines', { titol: a.title, contingut: a.content ?? '', ordre: a.order ?? 0, publicada: 0 });
      }
      return { id: r.id, title: r.titol, slug: r.slug, order: r.ordre, published: Boolean(r.publicada), content: r.contingut };
    },
  },
  {
    nom: 'publish_website',
    descripcio: 'Generate the public website and upload it by FTP (all pending changes: activities, news, pages). Requires FTP to be configured.',
    parametres: { type: 'object', properties: {} },
    nivell: 'proposta',
    modul: 'web',
    resum: async (_a, api) => {
      const e = await estatWebCompacte(api);
      return `Generar la web pública i pujar-la per FTP${e.pending_changes ? ' (hi ha canvis pendents de publicar)' : ' (no consta cap canvi pendent)'}.${e.ftp_configured ? '' : " Atenció: l'FTP no està configurat."}`;
    },
    executa: async (_a, api) => {
      const r = await api.post<Fila>('/web/publica');
      return { ok: true, status: r.estat };
    },
  },

  // ----- Xarxes socials -----
  {
    nom: 'suggest_social_post',
    descripcio:
      'Suggested social media text for an activity or a news item (name, date, place, summary, hashtags, link to its web page), adapted per network: instagram (no clickable links), facebook, x (≤280 chars), tiktok, youtube. Also says whether a picture exists and how many participants lack image consent. Use it before create_social_post_draft.',
    parametres: {
      type: 'object',
      properties: { activity_id: { type: 'integer' }, news_id: { type: 'integer' } },
    },
    nivell: 'lectura',
    modul: 'web',
    executa: async (a, api) => {
      if (!a.activity_id && !a.news_id) throw new Error('Give activity_id or news_id.');
      const q = a.activity_id ? `activitat_id=${id(a.activity_id, 'activity_id')}` : `noticia_id=${id(a.news_id, 'news_id')}`;
      const p = await api.get<Fila>(`/xarxes/proposta?${q}`);
      let activitat = a.activity_id ? Number(a.activity_id) : null;
      if (!activitat && a.news_id) activitat = (await api.get<Fila>(`/web/noticies/${Number(a.news_id)}`)).activitat_id ?? null;
      return {
        base_text: p.text,
        link: p.enllac,
        has_image: Boolean(p.imatge),
        by_network: textosPerXarxa(String(p.text ?? ''), p.enllac ?? null),
        image_rights: await senseDretsImatge(api, activitat),
      };
    },
  },
  {
    nom: 'create_social_post_draft',
    descripcio:
      'Save a social media post draft (internal, nothing is posted). Optionally linked to an activity or news item; with use_suggested_image=true the picture of that activity/news is attached. Returns the post id; publish it with publish_social_post.',
    parametres: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        link: { type: 'string', description: 'https:// link (optional).' },
        activity_id: { type: 'integer' },
        news_id: { type: 'integer' },
        use_suggested_image: { type: 'boolean', description: 'Attach the activity/news picture (default false).' },
      },
      required: ['text'],
    },
    nivell: 'escriptura',
    modul: 'web',
    executa: async (a, api) => {
      let imatge: string | null = null;
      if (a.use_suggested_image && (a.activity_id || a.news_id)) {
        const q = a.activity_id ? `activitat_id=${Number(a.activity_id)}` : `noticia_id=${Number(a.news_id)}`;
        imatge = (await api.get<Fila>(`/xarxes/proposta?${q}`)).imatge ?? null;
      }
      const r = await api.post<{ id: number }>('/xarxes/publicacions', {
        text: a.text, enllac: a.link ?? null, imatge, activitat_id: a.activity_id ?? null, noticia_id: a.news_id ?? null,
      });
      return { post_id: r.id, has_image: Boolean(imatge) };
    },
  },
  {
    nom: 'list_social_posts',
    descripcio:
      'Social media posts history (drafts and sent): post_id, text, link, has_image, linked activity/news, author, created_at, and sends per network (network, status publicada/error, method api/manual, url, date). Also which accounts are connected for direct publishing (Instagram, Facebook).',
    parametres: { type: 'object', properties: { limit: { type: 'integer', description: 'Default 50.' } } },
    nivell: 'lectura',
    modul: 'web',
    executa: async (a, api) => {
      const l = await api.get<Fila[]>('/xarxes/publicacions');
      const c = await api.get<Fila>('/xarxes/comptes');
      return {
        connected_accounts: { instagram: c.instagram ? { user: c.instagram.usuari, expires: c.instagram.caduca } : null, facebook: c.facebook ? { page: c.facebook.pagina } : null },
        posts: l.slice(0, limitDe(a.limit)).map((p) => ({
          post_id: p.id, text: p.text, link: p.enllac, has_image: Boolean(p.te_imatge), activity_id: p.activitat_id, activity_name: p.activitat_nom,
          news_id: p.noticia_id, news_title: p.noticia_titol, author: p.autor, created_at: p.creat_el,
          sends: (p.enviaments as Fila[]).map((e) => ({ network: e.xarxa, status: e.estat, method: e.metode, url: e.url, error: e.error, date: e.data })),
        })),
      };
    },
  },
  {
    nom: 'publish_social_post',
    descripcio:
      'Publish a saved post draft now on Instagram (needs a picture) or the Facebook page, through the connected account. Other networks must be posted by hand. Optional text overrides the draft text. The approver is shown how many participants of the linked activity lack image consent.',
    parametres: {
      type: 'object',
      properties: {
        post_id: { type: 'integer' },
        network: { type: 'string', enum: ['instagram', 'facebook'] },
        text: { type: 'string', description: 'Final text (default: the draft text).' },
      },
      required: ['post_id', 'network'],
    },
    nivell: 'proposta',
    modul: 'web',
    resum: async (a, api) => {
      const p = await api.get<Fila>(`/xarxes/publicacions/${id(a.post_id, 'post_id')}`);
      const text = String(a.text ?? p.text);
      const xarxa = a.network === 'instagram' ? 'Instagram' : 'Facebook';
      return `Publicar a ${xarxa}${p.imatge ? ' (amb imatge)' : ''}: «${text.length > 140 ? `${text.slice(0, 139)}…` : text}».${avisImatge(await senseDretsImatge(api, p.activitat_id))}`;
    },
    executa: async (a, api) => {
      const pid = id(a.post_id, 'post_id');
      const text = a.text ?? (await api.get<Fila>(`/xarxes/publicacions/${pid}`)).text;
      return api.post(`/xarxes/publicacions/${pid}/publica`, { xarxa: a.network, text });
    },
  },
];
