// Eines d'agent del domini «persones»: socis, CRM, comunicacions, òrgans de govern i voluntariat.
// Arrenca un servidor temporal amb dades de prova (mai no toca data/).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { arrencaServidor } from './prova-servidor.ts';
import type { ServidorProva } from './prova-servidor.ts';
import { EINES } from './eines/persones.ts';

let srv: ServidorProva;
before(async () => {
  srv = await arrencaServidor();
});
after(async () => {
  await srv?.atura();
});

const SENSIBLES = ['dni', 'iban', 'email', 'data_naixement', 'telefon', 'adreca', 'codi_postal', 'foto', 'tutor_legal'];

/** Cap objecte (a cap nivell) no porta claus sensibles. */
function senseSensibles(v: unknown, cami = '$') {
  if (Array.isArray(v)) return v.forEach((x, i) => senseSensibles(x, `${cami}[${i}]`));
  if (!v || typeof v !== 'object') return;
  for (const [k, x] of Object.entries(v)) {
    assert.ok(!SENSIBLES.includes(k.toLowerCase()), `clau sensible «${k}» a ${cami}`);
    senseSensibles(x, `${cami}.${k}`);
  }
}

async function eina(nom: string, args: Record<string, unknown> = {}) {
  const r = await srv.eina(nom, args);
  assert.equal(r.status, 200, `${nom}: ${JSON.stringify(r.cos)}`);
  senseSensibles(r.cos);
  return r.cos.result;
}

async function aprova(resposta: { proposal_id: number; status: string }) {
  assert.equal(resposta.status, 'pending_approval');
  const r = await srv.api('POST', `/agent/propostes/${resposta.proposal_id}/aprova`);
  assert.equal(r.status, 200, JSON.stringify(r.cos));
  assert.equal(r.cos.estat, 'executada', r.cos.resultat);
  return r.cos;
}

const sociPerNom = async (text: string) => (await eina('search_members', { text })).members[0];

test('les eines del domini tenen nom, descripció i nivell coherents', () => {
  assert.ok(EINES.length >= 20 && EINES.length <= 30);
  for (const e of EINES) {
    assert.match(e.nom, /^[a-z]+(_[a-z]+)+$/);
    assert.ok(e.descripcio.length > 40, e.nom);
    if (e.nivell === 'proposta') assert.ok(e.resum, `${e.nom} necessita resum`);
  }
});

test('cerca i fitxa de socis sense dades sensibles', async () => {
  const llista = await eina('search_members');
  assert.ok(llista.total > 5);
  const m = llista.members[0];
  for (const k of ['id', 'member_number', 'name', 'age', 'has_vote', 'tags']) assert.ok(k in m, k);

  const { tags } = await eina('list_member_categories_and_tags');
  const junta = tags.find((t: { name: string }) => t.name === 'Junta');
  const ambEtiqueta = await eina('search_members', { tag_id: junta.id });
  assert.ok(ambEtiqueta.members.length >= 3);
  assert.ok(ambEtiqueta.members.every((x: { tags: string[] }) => x.tags.includes('Junta')));

  const margalida = await sociPerNom('Margalida');
  assert.equal(margalida.name, 'Margalida Cerdà Vives');
  const fitxa = await eina('get_member', { member_id: margalida.id });
  assert.ok(fitxa.interactions.length >= 2);
  assert.ok(fitxa.tags.some((t: { name: string }) => t.name === 'Cuina'));
  assert.ok(Array.isArray(fitxa.fees));
});

test('modificar un soci conserva les dades sensibles que l’agent no veu', async () => {
  const joan = await sociPerNom('Joan Bennàsar');
  const abans = (await srv.api('GET', `/socis/${joan.id}`)).cos.soci;
  const { tags } = await eina('list_member_categories_and_tags');
  const voluntariat = tags.find((t: { name: string }) => t.name === 'Voluntariat');
  const r = await eina('update_member', { member_id: joan.id, append_note: 'Vol col·laborar a la Mostra.', add_tag_ids: [voluntariat.id] });
  assert.ok(r.member.tags.includes('Voluntariat'));
  assert.ok(r.member.tags.includes('Música'));
  assert.match(r.member.notes, /Mostra/);
  const despres = (await srv.api('GET', `/socis/${joan.id}`)).cos.soci;
  for (const k of ['dni', 'iban', 'email', 'telefon', 'adreca', 'data_naixement']) assert.equal(despres[k], abans[k], k);
});

test('alta com a sol·licitud i admissió per proposta', async () => {
  const nou = await eina('create_member', { first_name: 'Pere', surnames: 'Prova Agent', gender: 'home' });
  assert.equal(nou.admission_status, 'sollicitada');
  const sol = await eina('search_members', { status: 'applications' });
  assert.ok(sol.members.some((m: { id: number }) => m.id === nou.id));
  const p = await eina('change_membership_status', { member_id: nou.id, action: 'admit', agreement: 'Junta 18/10/2026', reason: 'Prova' });
  assert.match(p.summary, /Admetre .*Pere Prova Agent/);
  await aprova(p);
  const actius = await eina('search_members', { text: 'Pere Prova' });
  assert.equal(actius.members[0]?.admission_status, 'admesa');
});

test('baixa: la proposta no s’executa fins que s’aprova', async () => {
  const catalina = await sociPerNom('Catalina');
  const p = await eina('change_membership_status', { member_id: catalina.id, action: 'leave', leave_type: 'voluntaria', date: '2026-10-01' });
  assert.match(p.summary, /Donar de baixa .*Catalina/);
  assert.equal((await srv.api('GET', `/socis/${catalina.id}`)).cos.soci.data_baixa, null);
  await aprova(p);
  assert.equal((await srv.api('GET', `/socis/${catalina.id}`)).cos.soci.data_baixa, '2026-10-01');
  const baixes = await eina('search_members', { status: 'left' });
  assert.ok(baixes.members.some((m: { id: number }) => m.id === catalina.id));
});

test('CRM: contactes, tasques i persones interessades', async () => {
  const bartomeu = await sociPerNom('Bartomeu');
  const i = await eina('log_member_interaction', { member_id: bartomeu.id, type: 'trucada', summary: 'Quedam dijous per veure les eines.' });
  assert.equal(i.type, 'trucada');

  const t = await eina('save_task', { title: 'Portar la càmera', due_date: '2026-10-30', member_id: bartomeu.id });
  assert.equal(t.task.done, false);
  const feta = await eina('save_task', { task_id: t.task.id, done: true });
  assert.equal(feta.task.done, true);
  assert.equal(feta.task.title, 'Portar la càmera');
  const pendents = await eina('list_tasks', { member_id: bartomeu.id });
  assert.ok(!pendents.tasks.some((x: { id: number }) => x.id === t.task.id));

  const { prospects } = await eina('list_prospects');
  const llucia = prospects.find((p: { name: string }) => p.name.startsWith('Llúcia'));
  const s = await eina('save_prospect', { prospect_id: llucia.id, follow_up: 'Li he enviat el programa de tallers.' });
  assert.equal(s.prospect.status, 'contactat');
  assert.match(s.prospect.notes, /programa de tallers/);
  // El correu que l'agent no veu s'ha conservat.
  const raw = (await srv.api('GET', '/crm/interessats')).cos.find((x: { id: number }) => x.id === llucia.id);
  assert.equal(raw.email, 'llucia.vives@exemple.cat');

  const p = await eina('convert_prospect_to_member', { prospect_id: llucia.id });
  assert.match(p.summary, /Llúcia/);
  const aprovada = await aprova(p);
  assert.match(aprovada.resultat, /member_id/);
});

test('comunicacions: previsualització sense adreces i proposta d’enviament', async () => {
  const r = await eina('preview_communication_recipients', { segment: 'all' });
  assert.ok(r.total_recipients > 0);
  assert.ok(!JSON.stringify(r).includes('@'));
  const p = await eina('send_communication', { subject: 'Xerrada dels molins', body: 'Hola {nom}!', segment: 'all' });
  assert.equal(p.status, 'pending_approval');
  assert.match(p.summary, /Xerrada dels molins/);
});

test('govern: reunió, assistència, acords, acta i aprovació per proposta', async () => {
  const socis = (await eina('search_members', { limit: 5 })).members;
  const reunio = await eina('save_meeting', {
    body: 'junta', date: '2026-10-01', time_1st_call: '19:00', place: 'Claustre', agenda: ['Lectura de l’acta anterior', 'Mostra de cuina'], status: 'celebrada',
  });
  const id = reunio.meeting.id;
  assert.equal(reunio.meeting.agenda.length, 2);

  const assist = await eina('record_meeting_attendance', {
    meeting_id: id, present_member_ids: [socis[0].id, socis[1].id], represented_member_ids: [socis[2].id], representative_ids: [socis[0].id],
  });
  assert.equal(assist.attendees, 3);
  assert.ok('quorum' in assist); // el quòrum de junta només compta els membres de la junta (no n'hi ha a les dades de prova)

  const acords = await eina('save_meeting_agreement', { meeting_id: id, point: 2, text: 'Organitzar la Mostra el 15 de novembre.', votes_for: 3, votes_against: 0, abstentions: 0 });
  assert.equal(acords.agreements.length, 1);

  const acta = await eina('save_meeting_minutes', { meeting_id: id, text: 'Es reuneix la junta…' });
  assert.equal(acta.approved, false);
  await eina('save_meeting_minutes', { meeting_id: id, text: 'S’aixeca la sessió.', append: true });

  const detall = await eina('get_meeting', { meeting_id: id });
  assert.match(detall.minutes.text, /reuneix[\s\S]*aixeca/);
  assert.equal(detall.agreements_list[0].votes_for, 3);
  const representat = detall.attendance.find((x: { member_id: number }) => x.member_id === socis[2].id);
  assert.equal(representat.form, 'representat');
  assert.equal(representat.representative_id, socis[0].id);

  const p = await eina('approve_meeting_minutes', { meeting_id: id, approval_date: '2026-10-15' });
  assert.match(p.summary, /Aprovar i tancar definitivament l'acta/);
  await aprova(p);
  const tancada = await eina('get_meeting', { meeting_id: id });
  assert.equal(tancada.minutes.approved, true);
  // Una acta aprovada ja no es pot tocar.
  const r = await srv.eina('save_meeting_minutes', { meeting_id: id, text: 'canvi' });
  assert.notEqual(r.status, 200);

  const llista = await eina('list_meetings', { year: 2026 });
  assert.ok(llista.meetings.some((m: { id: number; minutes: { approved: boolean } }) => m.id === id && m.minutes.approved));
  const junta = await eina('get_board');
  assert.ok(Array.isArray(junta.positions));
});

test('voluntariat i entitats col·laboradores', async () => {
  const v = await eina('list_volunteers', { include_summary: true });
  assert.ok('summary' in v);
  const e = await eina('create_partner', { name: 'Escola de Prova', type: 'escola', contact_person: 'Direcció' });
  const { partners } = await eina('list_partners');
  assert.ok(partners.some((x: { id: number }) => x.id === e.id));
});
