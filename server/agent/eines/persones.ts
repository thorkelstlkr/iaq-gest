// Eines del domini «persones» per als agents d'IA: socis, persones interessades, contactes i tasques,
// comunicacions, òrgans de govern (reunions, assistència, acords, actes, junta, certificats),
// voluntariat i entitats col·laboradores.
//
// Totes fan servir només l'API interna (mateixes validacions, permisos i auditoria que la interfície).
// Mai no llegeixen ni escriuen dades sensibles (DNI, IBAN, adreça, telèfon, correu, data de naixement…).
import { avui } from '../../../shared/dates.ts';
import type { ApiInterna, Eina } from '../tipus.ts';

// ---------- Utilitats ----------

type Fila = Record<string, any>;

/** Query string amb els valors definits. */
function qs(o: Record<string, unknown>): string {
  const p = Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return p.length ? `?${p.join('&')}` : '';
}

const nomDe = (s: { nom?: string | null; llinatges?: string | null }) => `${s.nom ?? ''} ${s.llinatges ?? ''}`.trim();
const dma = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const def = (v: unknown) => v !== undefined && v !== null;
const limitDe = (v: unknown, perDefecte = 50) => Math.max(1, Math.min(500, Number(v) || perDefecte));

/** Edat a partir d'una data AAAA-MM-DD (l'agent veu l'edat, mai la data de naixement). */
function edat(iso: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return null;
  const ara = avui();
  const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const [ra, rm, rd] = ara.split('-').map(Number);
  return ra - a - (rm < mes || (rm === mes && rd < dia) ? 1 : 0);
}

/** Retalla una llista i diu quantes n'hi ha en total. */
function retalla<T>(llista: T[], limit: number) {
  return { total: llista.length, returned: Math.min(llista.length, limit), truncated: llista.length > limit, items: llista.slice(0, limit) };
}

const sociDescripcio = async (api: ApiInterna, id: number) => {
  const { soci } = await api.get<{ soci: Fila }>(`/socis/${Number(id)}`);
  return `núm. ${soci.num_soci} ${nomDe(soci)}`;
};

const ORGAN_CA: Record<string, string> = { assemblea: 'Assemblea general', junta: 'Reunió de la junta directiva', comissio: 'Comissió' };
const titolReunio = (r: Fila) =>
  r.organ === 'comissio'
    ? `Comissió${r.titol ? ` «${r.titol}»` : ''}`
    : `${ORGAN_CA[r.organ] ?? r.organ} ${r.tipus === 'extraordinaria' ? 'extraordinària' : 'ordinària'}`;

const MOTIUS_CA: Record<string, string> = {
  voluntaria: 'baixa voluntària', impagament: 'impagament de quotes', expulsio: 'expulsió', defuncio: 'defunció', altres: 'altres motius',
};

// Esquemes compartits
const tData = (descripcio: string) => ({ type: 'string', description: `${descripcio} (YYYY-MM-DD).` });
const tId = (descripcio: string) => ({ type: 'integer', description: descripcio });
const tLimit = { type: 'integer', description: 'Maximum number of items to return (default 50).' };

const SEGMENT_PROPS = {
  segment: {
    type: 'string',
    enum: ['all', 'tag', 'age_group', 'fee_pending', 'activity'],
    description:
      'Recipients: all = all active members; tag = active members with a tag (tag_id); age_group = active members in an age band (age_group); fee_pending = members with the fee of a year unpaid (year); activity = members registered in an activity (activity_id).',
  },
  tag_id: tId('Tag id, for segment "tag".'),
  age_group: { type: 'string', enum: ['infants', 'joves', 'adults', 'gent_gran'], description: 'For segment "age_group": infants 0-13, joves 14-29, adults 30-64, gent_gran 65+.' },
  year: { type: 'integer', description: 'For segment "fee_pending": fee year (default current year).' },
  activity_id: tId('Activity id, for segment "activity".'),
};

function segmentDe(a: Fila) {
  switch (a.segment) {
    case 'tag':
      return { tipus: 'etiqueta', id: Number(a.tag_id) };
    case 'age_group':
      return { tipus: 'franja', valor: a.age_group };
    case 'fee_pending':
      return { tipus: 'quota_pendent', exercici: Number(a.year ?? new Date().getFullYear()) };
    case 'activity':
      return { tipus: 'activitat', id: Number(a.activity_id) };
    default:
      return { tipus: 'tots' };
  }
}

// ---------- Socis ----------

const ESTATS_LLISTAT: Record<string, string> = { active: 'actius', left: 'baixes', applications: 'sollicituds', denied: 'denegades', all: 'tots' };

const fitxaCompacta = (s: Fila, etiquetes: Map<number, string>) => ({
  id: s.id,
  member_number: s.num_soci,
  name: nomDe(s),
  age: edat(s.data_naixement),
  gender: s.genere ?? null,
  town: s.poblacio ?? null,
  category: s.categoria_nom ?? null,
  category_id: s.categoria_id ?? null,
  has_vote: Boolean(s.te_vot),
  admission_status: s.estat_admissio,
  join_date: s.data_alta,
  leave_date: s.estat_admissio === 'admesa' ? (s.data_baixa ?? null) : null,
  fee_status_current_year: s.quota_estat ?? null,
  tags: String(s.etiquetes ?? '')
    .split(',')
    .filter(Boolean)
    .map((id) => etiquetes.get(Number(id)) ?? `#${id}`),
});

const etiquetesMap = async (api: ApiInterna) =>
  new Map((await api.get<Fila[]>('/crm/etiquetes')).map((e) => [Number(e.id), String(e.nom)] as [number, string]));

const EINES_SOCIS: Eina[] = [
  {
    nom: 'search_members',
    descripcio:
      'Search and list members (socis) of the association. Filters: free text (name, surnames or exact member number), status (active by default; left = former members; applications = pending membership applications; denied; all = every admitted member), category and tag. Returns per member: id (use it in other tools), member_number, name, age, gender, town, category, has_vote (adult active member of a voting category), admission_status (admesa/sollicitada/denegada), join_date, leave_date, fee_status_current_year (pendent/pagada/exempta or null) and tag names. Also returns the total count.',
    parametres: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to search in name and surnames, or an exact member number.' },
        status: { type: 'string', enum: ['active', 'left', 'applications', 'denied', 'all'], description: 'Default: active.' },
        category_id: tId('Only members of this category (see list_member_categories_and_tags).'),
        tag_id: tId('Only members with this tag (see list_member_categories_and_tags).'),
        limit: tLimit,
      },
    },
    nivell: 'lectura',
    modul: 'socis',
    executa: async (a, api) => {
      const [llista, etiquetes] = await Promise.all([
        api.get<Fila[]>(`/socis${qs({ estat: ESTATS_LLISTAT[a.status] ?? 'actius', q: a.text, categoria: a.category_id, etiqueta: a.tag_id })}`),
        etiquetesMap(api),
      ]);
      const r = retalla(llista.map((s) => fitxaCompacta(s, etiquetes)), limitDe(a.limit));
      return { total: r.total, returned: r.returned, truncated: r.truncated, members: r.items };
    },
  },
  {
    nom: 'list_member_categories_and_tags',
    descripcio:
      'Lists member categories (id, name, has_vote, pays_fee, members, active_members) and tags/labels used to group members (id, name, active_members). Use the ids to filter search_members, to create/update members or to target communications.',
    parametres: { type: 'object', properties: {} },
    nivell: 'lectura',
    modul: 'socis',
    executa: async (_a, api) => {
      const [categories, etiquetes] = await Promise.all([api.get<Fila[]>('/socis/categories'), api.get<Fila[]>('/crm/etiquetes')]);
      return {
        categories: categories.map((c) => ({
          id: c.id, name: c.nom, has_vote: Boolean(c.te_vot), pays_fee: Boolean(c.paga_quota), description: c.descripcio ?? null,
          members: c.socis, active_members: c.actius,
        })),
        tags: etiquetes.map((e) => ({ id: e.id, name: e.nom, active_members: e.socis })),
      };
    },
  },
  {
    nom: 'get_member',
    descripcio:
      'Full (non-sensitive) record of one member: basic data (member_number, name, age, gender, town, category, has_vote, admission status and agreement, join/leave dates, consents: data processing, image rights, accepts communications, notes), tags, membership periods, fees by year (amount_cents in euro cents, status pendent/pagada/exempta), the 10 latest contacts/interactions, tasks and the 10 latest activity participations. Contact data, ID numbers, bank data and birth date are never available.',
    parametres: { type: 'object', properties: { member_id: tId('Member id (from search_members).') }, required: ['member_id'] },
    nivell: 'lectura',
    modul: 'socis',
    executa: async (a, api) => {
      const id = Number(a.member_id);
      const [fitxa, etiquetes, interaccions, tasques, participacions] = await Promise.all([
        api.get<Fila>(`/socis/${id}`),
        etiquetesMap(api),
        api.get<Fila[]>(`/crm/interaccions?soci_id=${id}`),
        api.get<Fila[]>(`/crm/tasques?estat=totes&soci_id=${id}`),
        api.get<Fila[]>(`/crm/socis/${id}/participacions`),
      ]);
      const s = fitxa.soci;
      return {
        id: s.id,
        member_number: s.num_soci,
        name: nomDe(s),
        first_name: s.nom,
        surnames: s.llinatges,
        age: edat(s.data_naixement),
        gender: s.genere ?? null,
        town: s.poblacio ?? null,
        category: s.categoria_nom ?? null,
        category_id: s.categoria_id ?? null,
        fee_type_id: s.tipus_quota_id ?? null,
        has_vote: Boolean(s.te_vot),
        admission_status: s.estat_admissio,
        admission_date: s.data_admissio ?? null,
        admission_agreement: s.acord_admissio ?? null,
        join_date: s.data_alta,
        leave_date: s.estat_admissio === 'admesa' ? (s.data_baixa ?? null) : null,
        anonymised: Boolean(s.anonimitzat_el),
        data_consent: Boolean(s.consentiment_dades),
        image_rights: Boolean(s.drets_imatge),
        accepts_communications: Boolean(s.accepta_comunicacions),
        notes: s.notes ?? null,
        tags: (fitxa.etiquetes as number[]).map((e) => ({ id: e, name: etiquetes.get(e) ?? null })),
        periods: (fitxa.periodes as Fila[]).map((p) => ({
          join_date: p.data_alta, leave_date: p.data_baixa ?? null, leave_type: p.motiu_tipus ?? null, agreement: p.acord ?? null, leave_agreement: p.acord_baixa ?? null,
        })),
        fees: (fitxa.quotes as Fila[]).map((q) => ({ year: q.exercici, amount_cents: q.import_cents, status: q.estat, paid_on: q.data_pagament ?? null })),
        interactions: interaccions.slice(0, 10).map((i) => ({ id: i.id, date: i.data, type: i.tipus, summary: i.resum, author: i.autor })),
        tasks: tasques.map((t) => ({ id: t.id, title: t.titol, due_date: t.data_limit ?? null, done: Boolean(t.feta), notes: t.notes ?? null })),
        participations: participacions.slice(0, 10).map((p) => ({ activity_id: p.id, activity: p.nom, date: p.data_inici, status: p.estat, attended: Boolean(p.assistit) })),
      };
    },
  },
  {
    nom: 'create_member',
    descripcio:
      'Registers a new member. By default it is created as a pending membership application (as_application = true), which the board must later admit with change_membership_status; set as_application = false only when the person has already been admitted. Only non-sensitive data can be set: contact data, ID numbers, bank account and birth date must be entered by a person in the program. Returns the new member id and member_number.',
    parametres: {
      type: 'object',
      properties: {
        first_name: { type: 'string', description: 'First name.' },
        surnames: { type: 'string', description: 'Surnames.' },
        gender: { type: 'string', enum: ['dona', 'home', 'altre', 'nc'], description: 'dona = woman, home = man, altre = other, nc = not stated.' },
        category_id: tId('Member category id (see list_member_categories_and_tags).'),
        fee_type_id: tId('Fee type id (optional).'),
        join_date: tData('Application or join date; default today'),
        as_application: { type: 'boolean', description: 'true (default) = pending application; false = already admitted member.' },
        member_number: { type: 'integer', description: 'Member number; default: next free number.' },
        town: { type: 'string', description: 'Town/city.' },
        notes: { type: 'string', description: 'Internal notes.' },
        accepts_communications: { type: 'boolean', description: 'Whether the person accepts receiving communications (default true).' },
      },
      required: ['first_name'],
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const s = await api.post<Fila>('/socis', {
        nom: a.first_name,
        llinatges: a.surnames ?? '',
        genere: a.gender ?? null,
        categoria_id: a.category_id ?? null,
        tipus_quota_id: a.fee_type_id ?? null,
        data_alta: a.join_date ?? avui(),
        sollicitud: a.as_application === false ? 0 : 1,
        num_soci: a.member_number ?? null,
        poblacio: a.town ?? null,
        notes: a.notes ?? null,
        accepta_comunicacions: a.accepts_communications === false ? 0 : 1,
      });
      return { id: s.id, member_number: s.num_soci, name: nomDe(s), admission_status: s.estat_admissio, join_date: s.data_alta };
    },
  },
  {
    nom: 'update_member',
    descripcio:
      'Updates non-sensitive data of a member: name, surnames, gender, category, fee type, town, notes, communications preference and tags (add_tag_ids / remove_tag_ids, or tag_ids to replace them all). Only the given fields change. Membership status changes (admission, leaving, readmission) use change_membership_status instead.',
    parametres: {
      type: 'object',
      properties: {
        member_id: tId('Member id.'),
        first_name: { type: 'string' },
        surnames: { type: 'string' },
        gender: { type: 'string', enum: ['dona', 'home', 'altre', 'nc'] },
        category_id: tId('Member category id; 0 to remove the category.'),
        fee_type_id: tId('Fee type id; 0 to remove it.'),
        town: { type: 'string' },
        notes: { type: 'string', description: 'Replaces the internal notes.' },
        append_note: { type: 'string', description: 'Text appended at the end of the notes (keeps the existing notes).' },
        accepts_communications: { type: 'boolean' },
        tag_ids: { type: 'array', items: { type: 'integer' }, description: 'Replaces all tags with these tag ids.' },
        add_tag_ids: { type: 'array', items: { type: 'integer' }, description: 'Tag ids to add.' },
        remove_tag_ids: { type: 'array', items: { type: 'integer' }, description: 'Tag ids to remove.' },
      },
      required: ['member_id'],
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const id = Number(a.member_id);
      const fitxa = await api.get<Fila>(`/socis/${id}`);
      const s = { ...fitxa.soci };
      const canvis: Fila = {};
      if (def(a.first_name)) canvis.nom = a.first_name;
      if (def(a.surnames)) canvis.llinatges = a.surnames;
      if (def(a.gender)) canvis.genere = a.gender;
      if (def(a.category_id)) canvis.categoria_id = Number(a.category_id) || null;
      if (def(a.fee_type_id)) canvis.tipus_quota_id = Number(a.fee_type_id) || null;
      if (def(a.town)) canvis.poblacio = a.town;
      if (def(a.notes)) canvis.notes = a.notes;
      if (def(a.append_note)) canvis.notes = [canvis.notes ?? s.notes, a.append_note].filter(Boolean).join('\n');
      if (def(a.accepts_communications)) canvis.accepta_comunicacions = a.accepts_communications ? 1 : 0;
      if (Object.keys(canvis).length) {
        // L'API desa la fitxa sencera: s'hi envien les dades actuals amb els canvis (mai la foto).
        const cos: Fila = {};
        for (const [k, v] of Object.entries({ ...s, ...canvis })) if (k !== 'foto') cos[k] = v;
        await api.put(`/socis/${id}`, cos);
      }
      if (def(a.tag_ids) || def(a.add_tag_ids) || def(a.remove_tag_ids)) {
        let ids = new Set<number>(def(a.tag_ids) ? (a.tag_ids as unknown[]).map(Number) : (fitxa.etiquetes as number[]));
        for (const t of (a.add_tag_ids as unknown[] | undefined) ?? []) ids.add(Number(t));
        for (const t of (a.remove_tag_ids as unknown[] | undefined) ?? []) ids.delete(Number(t));
        ids = new Set([...ids].filter(Number.isInteger));
        await api.put(`/crm/socis/${id}/etiquetes`, { ids: [...ids] });
      }
      const [despres, etiquetes] = await Promise.all([api.get<Fila>(`/socis/${id}`), etiquetesMap(api)]);
      return {
        updated: true,
        member: {
          ...fitxaCompacta({ ...despres.soci, etiquetes: (despres.etiquetes as number[]).join(',') }, etiquetes),
          notes: despres.soci.notes ?? null,
          accepts_communications: Boolean(despres.soci.accepta_comunicacions),
        },
      };
    },
  },
  {
    nom: 'change_membership_status',
    descripcio:
      'Board decisions about membership: admit or deny a pending application, give a member baixa (leave), or readmit a former member (opens a new membership period). For "leave" a leave_type is required (voluntaria = voluntary, impagament = unpaid fees, expulsio = expulsion (needs the agreement), defuncio = death, altres = other). Optionally reference the board/assembly agreement.',
    parametres: {
      type: 'object',
      properties: {
        member_id: tId('Member id.'),
        action: { type: 'string', enum: ['admit', 'deny', 'leave', 'readmit'] },
        date: tData('Effective date; default today'),
        leave_type: { type: 'string', enum: ['voluntaria', 'impagament', 'expulsio', 'defuncio', 'altres'], description: 'Required for action "leave".' },
        agreement: { type: 'string', description: 'Reference of the agreement of the governing body (e.g. "Junta 12/03/2026, acord 4").' },
      },
      required: ['member_id', 'action'],
    },
    nivell: 'proposta',
    modul: 'socis',
    resum: async (a, api) => {
      const qui = await sociDescripcio(api, a.member_id);
      const d = dma(a.date ?? avui());
      const acord = a.agreement ? ` (acord: ${a.agreement})` : '';
      switch (a.action) {
        case 'admit':
          return `Admetre com a soci/sòcia ${qui} amb data ${d}${acord}.`;
        case 'deny':
          return `Denegar la sol·licitud d'admissió de ${qui} amb data ${d}${acord}.`;
        case 'leave':
          return `Donar de baixa el soci/sòcia ${qui} amb data ${d} per ${MOTIUS_CA[a.leave_type] ?? 'motiu no indicat'}${acord}.`;
        case 'readmit':
          return `Readmetre el soci/sòcia ${qui} amb data ${d}${acord}.`;
        default:
          return `Acció desconeguda sobre ${qui}.`;
      }
    },
    executa: async (a, api) => {
      const id = Number(a.member_id);
      const d = a.date ?? avui();
      const cami = { admit: 'admet', deny: 'denega', leave: 'baixa', readmit: 'readmissio' }[String(a.action)];
      if (!cami) throw new Error('Unknown action.');
      const cos =
        a.action === 'leave'
          ? { data_baixa: d, motiu_tipus: a.leave_type, acord: a.agreement ?? null }
          : a.action === 'readmit'
            ? { data_alta: d, acord: a.agreement ?? null }
            : { data: d, acord: a.agreement ?? null };
      const s = await api.post<Fila>(`/socis/${id}/${cami}`, cos);
      return { id: s.id, member_number: s.num_soci, name: nomDe(s), admission_status: s.estat_admissio, join_date: s.data_alta, leave_date: s.data_baixa ?? null };
    },
  },
];

// ---------- Persones interessades, contactes i tasques ----------

const interessatCompacte = (i: Fila) => ({
  id: i.id, name: nomDe(i), date: i.data, origin: i.origen ?? null, interests: i.interessos ?? null, status: i.estat,
  notes: i.notes ?? null, consent: Boolean(i.consentiment), member_id: i.soci_id ?? null,
});

const tascaCompacta = (t: Fila) => ({
  id: t.id, title: t.titol, due_date: t.data_limit ?? null, done: Boolean(t.feta), done_on: t.feta_el ?? null,
  member_id: t.soci_id ?? null, member: t.soci_nom ?? null, activity_id: t.activitat_id ?? null, activity: t.activitat_nom ?? null, notes: t.notes ?? null,
});

const EINES_CRM: Eina[] = [
  {
    nom: 'list_prospects',
    descripcio:
      'Lists prospects (persones interessades): people interested in joining or in the activities who are not members yet. Returns id, name, date, origin, interests, status (nou = new, contactat = contacted, convertit = became a member, descartat = discarded), notes (follow-up log), consent and member_id when converted.',
    parametres: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'all', 'nou', 'contactat', 'convertit', 'descartat'], description: 'open (default) = nou + contactat.' },
        text: { type: 'string', description: 'Filter by name, origin or interests.' },
        limit: tLimit,
      },
    },
    nivell: 'lectura',
    modul: 'socis',
    executa: async (a, api) => {
      const estat = a.status ?? 'open';
      let llista = await api.get<Fila[]>(`/crm/interessats${estat === 'open' ? '?estat=oberts' : ''}`);
      if (!['open', 'all'].includes(estat)) llista = llista.filter((i) => i.estat === estat);
      if (a.text) {
        const t = String(a.text).toLowerCase();
        llista = llista.filter((i) => [nomDe(i), i.origen, i.interessos].some((x) => String(x ?? '').toLowerCase().includes(t)));
      }
      const r = retalla(llista.map(interessatCompacte), limitDe(a.limit));
      return { total: r.total, truncated: r.truncated, prospects: r.items };
    },
  },
  {
    nom: 'save_prospect',
    descripcio:
      'Creates a prospect (if prospect_id is omitted) or updates one: status, origin, interests, notes. Use follow_up to log a follow-up: it is appended to the notes with today\'s date and, if the status was "nou", it becomes "contactat". Contact data cannot be set by the agent.',
    parametres: {
      type: 'object',
      properties: {
        prospect_id: tId('Prospect id to update; omit to create a new prospect.'),
        first_name: { type: 'string', description: 'Required when creating.' },
        surnames: { type: 'string' },
        origin: { type: 'string', description: 'How they knew about us (e.g. "Fira", "Web", "Amic").' },
        interests: { type: 'string' },
        status: { type: 'string', enum: ['nou', 'contactat', 'descartat'] },
        notes: { type: 'string', description: 'Replaces the notes.' },
        follow_up: { type: 'string', description: 'Follow-up note appended to the notes, dated today.' },
        date: tData('Date of first contact (default today, only when creating)'),
      },
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const seguiment = a.follow_up ? `${avui()}: ${a.follow_up}` : null;
      if (!a.prospect_id) {
        if (!a.first_name) throw new Error('first_name is required to create a prospect.');
        const nou = await api.post<Fila>('/crm/interessats', {
          nom: a.first_name, llinatges: a.surnames ?? '', origen: a.origin ?? null, interessos: a.interests ?? null,
          estat: a.status ?? (seguiment ? 'contactat' : 'nou'), notes: [a.notes, seguiment].filter(Boolean).join('\n') || null, data: a.date ?? avui(),
        });
        return { created: true, prospect: interessatCompacte(nou) };
      }
      const id = Number(a.prospect_id);
      const actual = (await api.get<Fila[]>('/crm/interessats')).find((i) => i.id === id);
      if (!actual) throw new Error(`Prospect ${id} not found.`);
      if (actual.estat === 'convertit') throw new Error('This prospect is already a member: update the member instead.');
      const cos: Fila = { ...actual };
      if (def(a.first_name)) cos.nom = a.first_name;
      if (def(a.surnames)) cos.llinatges = a.surnames;
      if (def(a.origin)) cos.origen = a.origin;
      if (def(a.interests)) cos.interessos = a.interests;
      if (def(a.notes)) cos.notes = a.notes;
      if (seguiment) {
        cos.notes = [cos.notes, seguiment].filter(Boolean).join('\n');
        if (cos.estat === 'nou') cos.estat = 'contactat';
      }
      if (def(a.status)) cos.estat = a.status;
      const desat = await api.put<Fila>(`/crm/interessats/${id}`, cos);
      return { updated: true, prospect: interessatCompacte(desat) };
    },
  },
  {
    nom: 'convert_prospect_to_member',
    descripcio:
      'Converts a prospect into a member: creates the member record (next member number, join date today) with the data we have, marks the prospect as "convertit" and logs a note. Returns the new member_id.',
    parametres: { type: 'object', properties: { prospect_id: tId('Prospect id (from list_prospects).') }, required: ['prospect_id'] },
    nivell: 'proposta',
    modul: 'socis',
    resum: async (a, api) => {
      const i = (await api.get<Fila[]>('/crm/interessats')).find((x) => x.id === Number(a.prospect_id));
      return i
        ? `Donar d'alta com a soci/sòcia la persona interessada ${nomDe(i)} (amb data d'alta d'avui, ${dma(avui())}).`
        : `Donar d'alta com a soci la persona interessada #${a.prospect_id} (no trobada).`;
    },
    executa: async (a, api) => {
      const r = await api.post<{ soci_id: number }>(`/crm/interessats/${Number(a.prospect_id)}/convertir`);
      return { member_id: r.soci_id };
    },
  },
  {
    nom: 'log_member_interaction',
    descripcio:
      'Logs a contact/interaction with a member in their history (call, email, meeting, message or note), e.g. "Called to remind the 2026 fee; will pay next week".',
    parametres: {
      type: 'object',
      properties: {
        member_id: tId('Member id.'),
        type: { type: 'string', enum: ['trucada', 'correu', 'reunio', 'missatge', 'nota'], description: 'trucada = phone call, correu = email, reunio = meeting, missatge = message, nota = note.' },
        summary: { type: 'string', description: 'What was said or done.' },
        date: tData('Date (default today)'),
      },
      required: ['member_id', 'type', 'summary'],
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const i = await api.post<Fila>('/crm/interaccions', { soci_id: Number(a.member_id), tipus: a.type, resum: a.summary, data: a.date ?? avui() });
      return { id: i.id, member_id: i.soci_id, date: i.data, type: i.tipus, summary: i.resum };
    },
  },
  {
    nom: 'list_tasks',
    descripcio:
      'Lists follow-up tasks of the association (pending by default), ordered by due date. Returns id, title, due_date, done, member and activity linked, notes. Use overdue_only to get tasks whose due date has passed.',
    parametres: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'done', 'all'], description: 'Default: pending.' },
        member_id: tId('Only tasks linked to this member.'),
        activity_id: tId('Only tasks linked to this activity.'),
        overdue_only: { type: 'boolean', description: 'Only pending tasks with a due date before today.' },
        limit: tLimit,
      },
    },
    nivell: 'lectura',
    modul: 'socis',
    executa: async (a, api) => {
      const estat = { pending: 'pendents', done: 'fetes', all: 'totes' }[String(a.status ?? 'pending')] ?? 'pendents';
      let llista = await api.get<Fila[]>(`/crm/tasques${qs({ estat, soci_id: a.member_id, activitat_id: a.activity_id })}`);
      if (a.overdue_only) llista = llista.filter((t) => !t.feta && t.data_limit && t.data_limit < avui());
      const r = retalla(llista.map(tascaCompacta), limitDe(a.limit));
      return { total: r.total, truncated: r.truncated, tasks: r.items };
    },
  },
  {
    nom: 'save_task',
    descripcio:
      'Creates a follow-up task (if task_id is omitted) or updates one: title, due date, linked member or activity, notes, and done = true to complete it (false to reopen). Only the given fields change.',
    parametres: {
      type: 'object',
      properties: {
        task_id: tId('Task id to update; omit to create.'),
        title: { type: 'string', description: 'Required when creating.' },
        due_date: tData('Due date; empty string to remove it'),
        member_id: tId('Linked member id; 0 to unlink.'),
        activity_id: tId('Linked activity id; 0 to unlink.'),
        notes: { type: 'string' },
        done: { type: 'boolean', description: 'true = mark as done; false = pending.' },
      },
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      if (!a.task_id) {
        if (!a.title) throw new Error('title is required to create a task.');
        let t = await api.post<Fila>('/crm/tasques', {
          titol: a.title, data_limit: a.due_date || null, soci_id: a.member_id || null, activitat_id: a.activity_id || null, notes: a.notes ?? null,
        });
        if (a.done) t = await api.put<Fila>(`/crm/tasques/${t.id}`, { ...t, feta: 1 });
        return { created: true, task: tascaCompacta(t) };
      }
      const id = Number(a.task_id);
      const actual = (await api.get<Fila[]>('/crm/tasques?estat=totes')).find((t) => t.id === id);
      if (!actual) throw new Error(`Task ${id} not found.`);
      const cos: Fila = {
        titol: a.title ?? actual.titol,
        data_limit: def(a.due_date) ? a.due_date || null : actual.data_limit,
        soci_id: def(a.member_id) ? Number(a.member_id) || null : actual.soci_id,
        activitat_id: def(a.activity_id) ? Number(a.activity_id) || null : actual.activitat_id,
        notes: def(a.notes) ? a.notes : actual.notes,
        feta: def(a.done) ? (a.done ? 1 : 0) : actual.feta,
      };
      const t = await api.put<Fila>(`/crm/tasques/${id}`, cos);
      return { updated: true, task: tascaCompacta(t) };
    },
  },
];

// ---------- Comunicacions ----------

const EINES_COMUNICACIONS: Eina[] = [
  {
    nom: 'preview_communication_recipients',
    descripcio:
      'Shows who would receive a communication to a group of members, before sending it: description of the group, total recipients, members excluded because they opted out of communications, how many have / do not have an email address (names only, never addresses), whether email sending is configured, and the latest communications sent (subject, group, date, recipients).',
    parametres: { type: 'object', properties: { ...SEGMENT_PROPS, limit: { type: 'integer', description: 'Maximum names listed (default 50).' } }, required: ['segment'] },
    nivell: 'lectura',
    modul: 'socis',
    executa: async (a, api) => {
      const [d, historial] = await Promise.all([
        api.post<Fila>('/crm/comunicacions/destinataris', { segment: segmentDe(a) }),
        api.get<Fila[]>('/crm/comunicacions'),
      ]);
      const limit = limitDe(a.limit);
      return {
        group: d.descripcio,
        total_recipients: d.total,
        excluded_opted_out: d.exclosos,
        with_email: d.amb_correu.length,
        without_email: d.sense_correu.length,
        names_with_email: (d.amb_correu as Fila[]).slice(0, limit).map((x) => x.nom),
        names_without_email: (d.sense_correu as Fila[]).slice(0, limit).map((x) => x.nom),
        email_configured: Boolean(d.correu_configurat),
        recent_communications: historial.slice(0, 10).map((c) => ({
          date: c.data, subject: c.assumpte, group: c.segment, recipients: c.destinataris, emails_sent: c.enviats, method: c.metode, author: c.autor,
        })),
      };
    },
  },
  {
    nom: 'send_communication',
    descripcio:
      'Sends a communication (email) to a group of members, personalised with {nom} (first name) and {nom_complet} (full name) placeholders, and logs it in each member\'s history. Members who opted out are excluded. Use method "manual" to only record a communication already sent by other means (no email is sent). Check recipients first with preview_communication_recipients.',
    parametres: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Email subject.' },
        body: { type: 'string', description: 'Message body (plain text / Markdown). May contain {nom} and {nom_complet}.' },
        ...SEGMENT_PROPS,
        method: { type: 'string', enum: ['email', 'manual'], description: 'email (default) = sent by the program; manual = only recorded.' },
      },
      required: ['subject', 'body', 'segment'],
    },
    nivell: 'proposta',
    modul: 'socis',
    resum: async (a, api) => {
      const d = await api.post<Fila>('/crm/comunicacions/destinataris', { segment: segmentDe(a) });
      if (a.method === 'manual')
        return `Registrar (sense enviar cap correu) la comunicació «${a.subject}» a ${d.total} socis (${d.descripcio}).`;
      return `Enviar per correu la comunicació «${a.subject}» a ${d.amb_correu.length} socis (${d.descripcio})${d.sense_correu.length ? `; ${d.sense_correu.length} no tenen correu i no la rebran` : ''}${d.exclosos ? `; ${d.exclosos} exclosos per no voler comunicacions` : ''}.`;
    },
    executa: async (a, api) => {
      const r = await api.post<Fila>('/crm/comunicacions', {
        assumpte: a.subject, cos: a.body, segment: segmentDe(a), metode: a.method === 'manual' ? 'manual' : 'correu',
      });
      return { recipients: r.destinataris, emails_sent: r.enviats, errors: (r.errors as Fila[]).length };
    },
  },
];

// ---------- Òrgans de govern ----------

const reunioCompacta = (r: Fila) => ({
  id: r.id,
  body: r.organ,
  type: r.tipus,
  title: r.titol ?? null,
  name: titolReunio(r),
  date: r.data,
  time_1st_call: r.hora_1a ?? null,
  time_2nd_call: r.hora_2a ?? null,
  place: r.lloc ?? null,
  status: r.estat,
  convocation_date: r.data_convocatoria ?? null,
  agenda: r.ordre_dia,
  attendees: r.n_assistents,
  agreements: r.n_acords,
  convened_people: r.n_convocats,
  minutes: r.acta_id ? { id: r.acta_id, number: r.acta_numero, approved: Boolean(r.acta_tancada) } : null,
  notice_warning: r.antelacio ? `Convened ${r.antelacio.dies} days in advance; minimum is ${r.antelacio.minim}.` : null,
});

const acordCompacte = (x: Fila) => ({
  id: x.id, point: x.punt ?? null, text: x.text, votes_for: x.vots_favor ?? null, votes_against: x.vots_contra ?? null,
  abstentions: x.abstencions ?? null, result: x.resultat,
});

function detallCompacte(d: Fila) {
  const assistents = d.assistents as Fila[];
  const convocats = d.convocats as Fila[];
  return {
    ...reunioCompacta({ ...d, n_assistents: assistents.length, n_acords: (d.acords as Fila[]).length, n_convocats: convocats.length, acta_id: d.acta?.id, acta_numero: d.acta?.numero, acta_tancada: d.acta?.tancada }),
    convocation_held: d.convocatoria_celebrada ?? null,
    notes: d.notes ?? null,
    attendance: assistents.map((x) => ({ member_id: x.soci_id, member_number: x.num_soci, name: x.nom, form: x.forma, represented_by: x.representant ?? null, representative_id: x.representant_id ?? null })),
    quorum: {
      census: d.quorum.cens, present: d.quorum.presents, represented: d.quorum.representats, total: d.quorum.total, percentage: d.quorum.percentatge,
      required_1st_call: d.quorum.necessaris_1a, reached_1st_call: d.quorum.arriba_1a, reached_2nd_call: d.quorum.arriba_2a,
    },
    agreements_list: (d.acords as Fila[]).map(acordCompacte),
    minutes: d.acta
      ? { id: d.acta.id, number: `${d.acta.numero}/${d.acta.any}`, approved: Boolean(d.acta.tancada), approval_date: d.acta.data_aprovacio ?? null, chair: d.acta.presidencia, secretary: d.acta.secretaria, text: d.acta.text }
      : null,
    convocation: {
      sent_by_email: convocats.filter((c) => c.canal === 'email' && !c.error).length,
      email_errors: convocats.filter((c) => c.canal === 'email' && c.error).length,
      letters: convocats.filter((c) => c.canal === 'carta').length,
    },
  };
}

const detallReunio = async (api: ApiInterna, id: number) => api.get<Fila>(`/governanca/reunions/${Number(id)}`);

const EINES_GOVERN: Eina[] = [
  {
    nom: 'list_meetings',
    descripcio:
      'Lists meetings of the governing bodies (general assembly, board, committees), newest first. Returns id, body (assemblea/junta/comissio), type (ordinaria/extraordinaria), date, times of 1st and 2nd call, place, status (prevista = planned, convocada = convened, celebrada = held, anullada = cancelled), agenda points, counts of attendees, agreements and convened people, minutes (number, approved) and a warning if the legal notice period is not met.',
    parametres: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: 'Only meetings of this year.' },
        body: { type: 'string', enum: ['assemblea', 'junta', 'comissio'] },
        limit: tLimit,
      },
    },
    nivell: 'lectura',
    modul: 'socis',
    executa: async (a, api) => {
      const llista = await api.get<Fila[]>(`/governanca/reunions${qs({ any: a.year, organ: a.body })}`);
      const r = retalla(llista.map(reunioCompacta), limitDe(a.limit));
      return { total: r.total, truncated: r.truncated, meetings: r.items };
    },
  },
  {
    nom: 'get_meeting',
    descripcio:
      'Full detail of a meeting: data and agenda, attendance list (present / represented and by whom), quorum (census = members with vote or board members, present, represented, percentage, required and reached on 1st/2nd call), agreements with votes and result, minutes (number, approved or draft, signatories and text) and convocation status (emails sent, errors, printed letters).',
    parametres: { type: 'object', properties: { meeting_id: tId('Meeting id.') }, required: ['meeting_id'] },
    nivell: 'lectura',
    modul: 'socis',
    executa: async (a, api) => detallCompacte(await detallReunio(api, a.meeting_id)),
  },
  {
    nom: 'save_meeting',
    descripcio:
      'Creates a meeting (omit meeting_id) or updates one (only the given fields change): body, type, title, date, times of 1st/2nd call (HH:MM), place, agenda (list of points, replaces the whole agenda), status and notes. To officially convene it by email use convoke_meeting. Set status "celebrada" once held (needed before writing the minutes). Meetings with approved minutes cannot be changed.',
    parametres: {
      type: 'object',
      properties: {
        meeting_id: tId('Meeting id to update; omit to create.'),
        body: { type: 'string', enum: ['assemblea', 'junta', 'comissio'], description: 'Required when creating.' },
        type: { type: 'string', enum: ['ordinaria', 'extraordinaria'], description: 'Default ordinaria.' },
        title: { type: 'string', description: 'Optional title (name of the committee).' },
        date: tData('Meeting date; required when creating'),
        time_1st_call: { type: 'string', description: 'HH:MM' },
        time_2nd_call: { type: 'string', description: 'HH:MM' },
        place: { type: 'string' },
        agenda: { type: 'array', items: { type: 'string' }, description: 'Agenda points, in order.' },
        status: { type: 'string', enum: ['prevista', 'convocada', 'celebrada', 'anullada'] },
        convocation_held: { type: 'string', enum: ['1a', '2a'], description: 'For held meetings: on which call it was held.' },
        notes: { type: 'string' },
      },
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const camps: Fila = {};
      if (def(a.body)) camps.organ = a.body;
      if (def(a.type)) camps.tipus = a.type;
      if (def(a.title)) camps.titol = a.title;
      if (def(a.date)) camps.data = a.date;
      if (def(a.time_1st_call)) camps.hora_1a = a.time_1st_call;
      if (def(a.time_2nd_call)) camps.hora_2a = a.time_2nd_call;
      if (def(a.place)) camps.lloc = a.place;
      if (def(a.agenda)) camps.ordre_dia = a.agenda;
      if (def(a.status)) camps.estat = a.status;
      if (def(a.convocation_held)) camps.convocatoria_celebrada = a.convocation_held;
      if (def(a.notes)) camps.notes = a.notes;
      if (!a.meeting_id) return { created: true, meeting: detallCompacte(await api.post<Fila>('/governanca/reunions', camps)) };
      const d = await detallReunio(api, a.meeting_id);
      const cos = {
        organ: d.organ, tipus: d.tipus, titol: d.titol, data: d.data, hora_1a: d.hora_1a, hora_2a: d.hora_2a, lloc: d.lloc, ordre_dia: d.ordre_dia,
        estat: d.estat, data_convocatoria: d.data_convocatoria, convocatoria_celebrada: d.convocatoria_celebrada, notes: d.notes, ...camps,
      };
      return { updated: true, meeting: detallCompacte(await api.put<Fila>(`/governanca/reunions/${d.id}`, cos)) };
    },
  },
  {
    nom: 'record_meeting_attendance',
    descripcio:
      'Records who attended a meeting: present_member_ids, and members represented by proxy (represented_member_ids with representative_ids in the same order; each representative must be present). By default it replaces the whole attendance list; set append = true to add to the existing list. Returns the updated quorum.',
    parametres: {
      type: 'object',
      properties: {
        meeting_id: tId('Meeting id.'),
        present_member_ids: { type: 'array', items: { type: 'integer' }, description: 'Member ids present in person.' },
        represented_member_ids: { type: 'array', items: { type: 'integer' }, description: 'Member ids represented by proxy.' },
        representative_ids: { type: 'array', items: { type: 'integer' }, description: 'For each represented member (same order), the member id of the present person who represents them.' },
        append: { type: 'boolean', description: 'true = add to the current attendance instead of replacing it.' },
      },
      required: ['meeting_id'],
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const id = Number(a.meeting_id);
      const presents = ((a.present_member_ids as unknown[]) ?? []).map(Number);
      const representats = ((a.represented_member_ids as unknown[]) ?? []).map(Number);
      const representants = ((a.representative_ids as unknown[]) ?? []).map(Number);
      if (representats.length !== representants.length) throw new Error('represented_member_ids and representative_ids must have the same length.');
      const llista = new Map<number, Fila>();
      if (a.append) {
        const d = await detallReunio(api, id);
        for (const x of d.assistents as Fila[]) llista.set(x.soci_id, { soci_id: x.soci_id, forma: x.forma, representant_id: x.representant_id });
      }
      for (const p of presents) llista.set(p, { soci_id: p, forma: 'present' });
      representats.forEach((s, i) => llista.set(s, { soci_id: s, forma: 'representat', representant_id: representants[i] }));
      const d = await api.put<Fila>(`/governanca/reunions/${id}/assistents`, { assistents: [...llista.values()] });
      const c = detallCompacte(d);
      return { meeting_id: id, attendees: c.attendance.length, quorum: c.quorum };
    },
  },
  {
    nom: 'save_meeting_agreement',
    descripcio:
      'Adds an agreement (decision) to a meeting, or updates one (agreement_id): agenda point number, text, votes for / against / abstentions and result (aprovat = approved, rebutjat = rejected, informatiu = information only, no vote). Not possible once the minutes are approved.',
    parametres: {
      type: 'object',
      properties: {
        meeting_id: tId('Meeting id (required when adding).'),
        agreement_id: tId('Agreement id to update; omit to add a new one.'),
        point: { type: 'integer', description: 'Agenda point number (1-based).' },
        text: { type: 'string', description: 'Text of the agreement (required when adding).' },
        votes_for: { type: 'integer' },
        votes_against: { type: 'integer' },
        abstentions: { type: 'integer' },
        result: { type: 'string', enum: ['aprovat', 'rebutjat', 'informatiu'], description: 'Default aprovat.' },
      },
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const camps: Fila = {};
      if (def(a.point)) camps.punt = a.point;
      if (def(a.text)) camps.text = a.text;
      if (def(a.votes_for)) camps.vots_favor = a.votes_for;
      if (def(a.votes_against)) camps.vots_contra = a.votes_against;
      if (def(a.abstentions)) camps.abstencions = a.abstentions;
      if (def(a.result)) camps.resultat = a.result;
      let d: Fila;
      if (a.agreement_id) {
        const actual = (await api.get<Fila[]>('/governanca/acords')).find((x) => x.id === Number(a.agreement_id));
        if (!actual) throw new Error(`Agreement ${a.agreement_id} not found.`);
        d = await api.put<Fila>(`/governanca/acords/${actual.id}`, {
          punt: actual.punt, text: actual.text, vots_favor: actual.vots_favor, vots_contra: actual.vots_contra, abstencions: actual.abstencions, resultat: actual.resultat, ...camps,
        });
      } else {
        if (!a.meeting_id || !a.text) throw new Error('meeting_id and text are required to add an agreement.');
        d = await api.post<Fila>(`/governanca/reunions/${Number(a.meeting_id)}/acords`, camps);
      }
      return { meeting_id: d.id, agreements: (d.acords as Fila[]).map(acordCompacte) };
    },
  },
  {
    nom: 'save_meeting_minutes',
    descripcio:
      'Writes or updates the DRAFT minutes (acta) of a held meeting (status must be "celebrada"). The first time it creates the numbered minutes; afterwards it updates the text (append = true adds text at the end). Optionally sets the chair and secretary names that sign them. Approving/closing the minutes is a separate action (approve_meeting_minutes).',
    parametres: {
      type: 'object',
      properties: {
        meeting_id: tId('Meeting id.'),
        text: { type: 'string', description: 'Minutes text (plain text / Markdown).' },
        append: { type: 'boolean', description: 'true = append the text to the existing draft.' },
        chair_name: { type: 'string', description: 'Name of the person chairing (signs the minutes).' },
        secretary_name: { type: 'string', description: 'Name of the secretary (signs the minutes).' },
      },
      required: ['meeting_id'],
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const d = await detallReunio(api, a.meeting_id);
      let acta: Fila;
      if (!d.acta) {
        acta = (await api.post<Fila>(`/governanca/reunions/${d.id}/acta`, { text: a.text ?? '' })).acta;
        if (!def(a.chair_name) && !def(a.secretary_name)) return { minutes_id: acta.id, number: `${acta.numero}/${acta.any}`, approved: false, chair: acta.presidencia, secretary: acta.secretaria, text_length: acta.text.length };
      } else acta = d.acta;
      if (acta.tancada) throw new Error('The minutes are already approved and cannot be changed.');
      const text = def(a.text) ? (a.append && d.acta ? [acta.text, a.text].filter(Boolean).join('\n\n') : a.text) : acta.text;
      const r = await api.put<Fila>(`/governanca/actes/${acta.id}`, {
        text, data_aprovacio: acta.data_aprovacio, presidencia: a.chair_name ?? acta.presidencia, secretaria: a.secretary_name ?? acta.secretaria,
      });
      const x = r.acta;
      return { minutes_id: x.id, number: `${x.numero}/${x.any}`, approved: Boolean(x.tancada), chair: x.presidencia, secretary: x.secretaria, text_length: String(x.text).length };
    },
  },
  {
    nom: 'convoke_meeting',
    descripcio:
      'Officially convenes a general assembly or board meeting by email: sends the convocation (date, place, times, agenda) to every member with voting rights (assembly) or to the board members (board), records it and marks the meeting as "convocada". Members without email need a printed letter (done by a person in the program). Requires email to be configured and a future date.',
    parametres: { type: 'object', properties: { meeting_id: tId('Meeting id.') }, required: ['meeting_id'] },
    nivell: 'proposta',
    modul: 'socis',
    resum: async (a, api) => {
      const [d, dest] = await Promise.all([detallReunio(api, a.meeting_id), api.get<Fila>(`/governanca/reunions/${Number(a.meeting_id)}/destinataris`)]);
      const qui = d.organ === 'assemblea' ? 'socis amb dret a vot' : 'membres de la junta';
      return `Enviar per correu la convocatòria de la ${titolReunio(d)} del ${dma(d.data)} a ${dest.amb_email.length} ${qui}${dest.sense_email.length ? ` (${dest.sense_email.length} no tenen correu: caldrà enviar-los carta)` : ''}.`;
    },
    executa: async (a, api) => {
      const r = await api.post<Fila>(`/governanca/reunions/${Number(a.meeting_id)}/convoca`);
      return { emails_sent: r.enviats, errors: r.errors, without_email: r.sense_email, notice_warning: r.antelacio ? `Only ${r.antelacio.dies} days of notice (minimum ${r.antelacio.minim}).` : null };
    },
  },
  {
    nom: 'approve_meeting_minutes',
    descripcio:
      'Approves and closes (locks) the minutes of a meeting: after this, neither the minutes, the agreements nor the attendance can be modified. The approval date cannot be before the meeting nor in the future.',
    parametres: {
      type: 'object',
      properties: { meeting_id: tId('Meeting id.'), approval_date: tData('Approval date (default today)') },
      required: ['meeting_id'],
    },
    nivell: 'proposta',
    modul: 'socis',
    resum: async (a, api) => {
      const d = await detallReunio(api, a.meeting_id);
      if (!d.acta) return `Aprovar l'acta de la ${titolReunio(d)} del ${dma(d.data)} (encara no té acta redactada).`;
      return `Aprovar i tancar definitivament l'acta núm. ${d.acta.numero}/${d.acta.any} de la ${titolReunio(d)} del ${dma(d.data)}, amb data d'aprovació ${dma(a.approval_date ?? avui())}. Després ja no es podrà modificar.`;
    },
    executa: async (a, api) => {
      const d = await detallReunio(api, a.meeting_id);
      if (!d.acta) throw new Error('This meeting has no minutes yet.');
      const r = await api.post<Fila>(`/governanca/actes/${d.acta.id}/tanca`, { data_aprovacio: a.approval_date ?? avui() });
      return { minutes_id: r.acta.id, number: `${r.acta.numero}/${r.acta.any}`, approved: Boolean(r.acta.tancada), approval_date: r.acta.data_aprovacio };
    },
  },
  {
    nom: 'get_board',
    descripcio:
      'Current board of directors (junta directiva): for each position (presidencia, vicepresidencia, secretaria, tresoreria, vocal) the member id, name, election date and end of mandate (flagged if expired), plus the board composition on a given date if requested.',
    parametres: { type: 'object', properties: { date: tData('Date to check the board composition (default today)') } },
    nivell: 'lectura',
    modul: 'socis',
    executa: async (a, api) => {
      const data = a.date ?? avui();
      const [junta, carrecs] = await Promise.all([api.get<Fila>(`/governanca/junta-actual?data=${encodeURIComponent(data)}`), api.get<Fila[]>('/governanca/carrecs')]);
      const vigents = carrecs.filter((c) => c.data_eleccio <= data && (!c.data_cessament || c.data_cessament > data));
      return {
        date: data,
        summary: junta,
        positions: vigents.map((c) => ({
          position: c.carrec, member_id: c.soci_id, member_number: c.num_soci, name: nomDe(c), elected_on: c.data_eleccio,
          mandate_ends: c.data_fi_mandat ?? null, mandate_expired: Boolean(c.data_fi_mandat && c.data_fi_mandat < avui()),
          registry_notified_on: c.comunicat_registre_el ?? null,
        })),
      };
    },
  },
  {
    nom: 'issue_certificate',
    descripcio:
      'Issues an official numbered certificate signed by the secretary: type "soci" (membership certificate of a member: member_id), "acord" (certifies an agreement of a meeting: agreement_id, from get_meeting) or "junta" (current board composition). Requires the secretary position to be registered. Returns the certificate number; the printable document is generated in the program.',
    parametres: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['soci', 'acord', 'junta'] },
        member_id: tId('For type "soci".'),
        agreement_id: tId('For type "acord".'),
        purpose: { type: 'string', description: 'Purpose of the certificate (e.g. "Per presentar a l\'Ajuntament").' },
        date: tData('Certificate date (default today)'),
      },
      required: ['type'],
    },
    nivell: 'proposta',
    modul: 'socis',
    resum: async (a, api) => {
      const d = dma(a.date ?? avui());
      const finalitat = a.purpose ? `, per a: ${a.purpose}` : '';
      if (a.type === 'soci') return `Emetre un certificat numerat de condició de soci de ${await sociDescripcio(api, a.member_id)} amb data ${d}${finalitat}.`;
      if (a.type === 'acord') {
        const ac = (await api.get<Fila[]>('/governanca/acords')).find((x) => x.id === Number(a.agreement_id));
        const t = ac ? String(ac.text) : `#${a.agreement_id}`;
        return `Emetre un certificat numerat de l'acord «${t.length > 120 ? `${t.slice(0, 120)}…` : t}»${ac ? ` (reunió del ${dma(ac.data_reunio)})` : ''} amb data ${d}${finalitat}.`;
      }
      return `Emetre un certificat numerat de la composició de la junta directiva amb data ${d}${finalitat}.`;
    },
    executa: async (a, api) => {
      const c = await api.post<Fila>('/governanca/certificats', {
        tipus: a.type, soci_id: a.member_id ?? null, acord_id: a.agreement_id ?? null, finalitat: a.purpose ?? null, data: a.date ?? avui(),
      });
      return { certificate_id: c.id, number: `${c.numero}/${c.any}`, type: c.tipus, date: c.data, secretary: c.secretaria, chair: c.presidencia };
    },
  },
];

// ---------- Voluntariat i entitats col·laboradores ----------

const EINES_COMUNITAT: Eina[] = [
  {
    nom: 'list_volunteers',
    descripcio:
      'Lists volunteers (active by default) with their compliance status: volunteering agreement signed date, works_with_minors, sexual-offences registry certificate status (no_cal = not needed, falta = missing, caducat = expired, caduca_aviat = expires within 30 days, vigent = valid) and expiry, insurance coverage (accidents and civil liability), and hours in the year and in total. With include_summary = true it also returns the yearly volunteering summary (total hours, estimated value in euro cents, people, joins/leavings, hours by person, activity and month).',
    parametres: {
      type: 'object',
      properties: {
        include_inactive: { type: 'boolean', description: 'Also former volunteers.' },
        year: { type: 'integer', description: 'Year for hours and summary (default current year).' },
        include_summary: { type: 'boolean', description: 'Add the yearly volunteering summary.' },
        limit: tLimit,
      },
    },
    nivell: 'lectura',
    modul: 'socis',
    executa: async (a, api) => {
      const any = a.year ?? new Date().getFullYear();
      const [llista, resum] = await Promise.all([
        api.get<Fila[]>(`/comunitat/voluntaris${qs({ tots: a.include_inactive ? 1 : undefined, exercici: any })}`),
        a.include_summary ? api.get<Fila>(`/comunitat/voluntariat/resum?exercici=${any}`) : Promise.resolve(null),
      ]);
      const r = retalla(
        llista.map((v) => ({
          id: v.id, member_id: v.soci_id ?? null, member_number: v.num_soci ?? null, name: nomDe(v), age: edat(v.data_naixement), active: v.actiu,
          joined_on: v.data_incorporacio, left_on: v.data_baixa ?? null, functions: v.funcions ?? null, skills: v.habilitats ?? null, availability: v.disponibilitat ?? null,
          agreement_signed_on: v.acord_signat_el ?? null, works_with_minors: Boolean(v.treballa_amb_menors),
          certificate_status: v.certificat?.estat, certificate_expires: v.certificat?.caduca ?? null,
          insured_accidents: Boolean(v.cobertura?.accidents), insured_civil_liability: Boolean(v.cobertura?.rc),
          hours_year: v.hores_exercici, hours_total: v.hores_totals,
        })),
        limitDe(a.limit),
      );
      return {
        year: any,
        total: r.total,
        truncated: r.truncated,
        volunteers: r.items,
        ...(resum
          ? {
              summary: {
                active_volunteers: resum.voluntaris_actius, non_member_volunteers: resum.voluntaris_no_socis, joins: resum.altes, leavings: resum.baixes,
                people_with_hours: resum.persones_amb_hores, total_hours: resum.hores_totals, hour_value_cents: resum.valor_hora_cents, estimated_value_cents: resum.valor_estimat_cents,
                by_person: (resum.per_persona as Fila[]).slice(0, 50).map((p) => ({ volunteer_id: p.voluntari_id, name: nomDe(p), hours: p.hores, activities: p.activitats, days: p.dies })),
                by_activity: (resum.per_activitat as Fila[]).map((p) => ({ activity_id: p.activitat_id, activity: p.nom ?? null, hours: p.hores, people: p.persones })),
                by_month: resum.per_mes,
              },
            }
          : {}),
      };
    },
  },
  {
    nom: 'log_volunteer_hours',
    descripcio: 'Logs volunteering hours for one or several volunteers on a date (same hours for each), optionally linked to an activity and with a task description. Hours: number between 0 and 24 (decimals allowed, e.g. 2.5).',
    parametres: {
      type: 'object',
      properties: {
        volunteer_ids: { type: 'array', items: { type: 'integer' }, description: 'Volunteer ids (from list_volunteers, not member ids).' },
        date: tData('Date (default today)'),
        hours: { type: 'number', description: 'Hours per person.' },
        activity_id: tId('Activity id (optional).'),
        task: { type: 'string', description: 'What they did.' },
      },
      required: ['volunteer_ids', 'hours'],
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const r = await api.post<{ ids: number[] }>('/comunitat/hores', {
        voluntari_ids: a.volunteer_ids, data: a.date ?? avui(), hores: a.hours, activitat_id: a.activity_id ?? null, tasca: a.task ?? null,
      });
      return { records_created: r.ids.length, ids: r.ids };
    },
  },
  {
    nom: 'list_partners',
    descripcio:
      'Lists partner entities (entitats col·laboradores: town council, schools, companies, other associations…) with type, contact person name, active flag, number of shared activities and last one, agreements (convenis) count and contributions in euro cents; and the collaboration agreements with title, entity, status (esborrany = draft, vigent = in force, finalitzat = ended), dates and amount_cents. Contact details are not available.',
    parametres: { type: 'object', properties: { include_inactive: { type: 'boolean', description: 'Also inactive entities.' } } },
    nivell: 'lectura',
    modul: 'socis',
    executa: async (a, api) => {
      const [entitats, convenis] = await Promise.all([api.get<Fila[]>('/comunitat/entitats'), api.get<Fila[]>('/comunitat/convenis')]);
      return {
        partners: entitats
          .filter((e) => a.include_inactive || e.actiu)
          .map((e) => ({
            id: e.id, name: e.nom, type: e.tipus, contact_person: e.persona_contacte ?? null, contact_role: e.carrec ?? null, web: e.web ?? null, active: Boolean(e.actiu),
            notes: e.notes ?? null, shared_activities: e.activitats, last_activity: e.darrera_activitat ?? null, agreements: e.convenis,
            agreements_in_force: e.convenis_vigents, contributions_cents: e.aportacions_cents,
          })),
        agreements: convenis.map((c) => ({
          id: c.id, partner_id: c.entitat_id, partner: c.entitat, title: c.titol, purpose: c.objecte ?? null, status: c.estat, signed_on: c.data_signatura ?? null,
          starts: c.data_inici ?? null, ends: c.data_fi ?? null, auto_renewal: Boolean(c.renovacio_automatica), amount_cents: c.import_cents ?? null,
          obligations: c.obligacions ?? null, has_document: Boolean(c.te_document),
        })),
      };
    },
  },
  {
    nom: 'create_partner',
    descripcio: 'Registers a new partner entity (entitat col·laboradora). Contact details (email, phone, address, tax id) must be added by a person in the program.',
    parametres: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['ajuntament', 'consell', 'govern', 'escola', 'entitat', 'empresa', 'altres'], description: 'ajuntament = town council, consell = island council, govern = regional government, escola = school, entitat = association, empresa = company.' },
        contact_person: { type: 'string', description: 'Name of the contact person.' },
        contact_role: { type: 'string', description: 'Role of the contact person.' },
        web: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['name'],
    },
    nivell: 'escriptura',
    modul: 'socis',
    executa: async (a, api) => {
      const e = await api.post<Fila>('/comunitat/entitats', {
        nom: a.name, tipus: a.type ?? 'entitat', persona_contacte: a.contact_person ?? null, carrec: a.contact_role ?? null, web: a.web ?? null, notes: a.notes ?? null,
      });
      return { id: e.id, name: e.nom, type: e.tipus, active: Boolean(e.actiu) };
    },
  },
];

export const EINES: Eina[] = [...EINES_SOCIS, ...EINES_CRM, ...EINES_COMUNICACIONS, ...EINES_GOVERN, ...EINES_COMUNITAT];
