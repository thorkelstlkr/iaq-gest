// Eines dels agents del domini «programa»: activitats, inscripcions, informes, web i xarxes.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { arrencaServidor } from './prova-servidor.ts';
import type { ServidorProva } from './prova-servidor.ts';

let srv: ServidorProva;
before(async () => {
  srv = await arrencaServidor();
});
after(async () => {
  await srv?.atura();
});

const PROHIBITS = ['email', 'telefon', 'contacte', 'data_naixement', 'tutor', 'tutor_telefon', 'imatge'];

/** Cap clau sensible en tot l'arbre de la resposta. */
function senseDadesSensibles(v: unknown, cami = '$') {
  if (Array.isArray(v)) return v.forEach((x, i) => senseDadesSensibles(x, `${cami}[${i}]`));
  if (!v || typeof v !== 'object') {
    if (typeof v === 'string') assert.ok(!/^data:image\//.test(v), `${cami}: imatge`);
    return;
  }
  for (const [k, x] of Object.entries(v)) {
    assert.ok(!PROHIBITS.includes(k.toLowerCase()), `${cami}.${k} no hauria d'arribar a l'agent`);
    senseDadesSensibles(x, `${cami}.${k}`);
  }
}

const eina = async (nom: string, args: Record<string, unknown> = {}) => {
  const r = await srv.eina(nom, args);
  assert.equal(r.status, 200, `${nom}: ${JSON.stringify(r.cos)}`);
  senseDadesSensibles(r.cos);
  return r.cos.result;
};

test('consulta d’activitats, finalitats, inscripcions i informes', async () => {
  const totes = await eina('list_activities', { all_years: true });
  assert.ok(totes.total > 0);
  const rondalles = totes.activities.find((a: { name: string }) => a.name.startsWith('Taller de rondalles'));
  assert.ok(rondalles);
  assert.ok(rondalles.registered > 0);

  const cerca = await eina('list_activities', { year: 2026, search: 'rondalles' });
  assert.equal(cerca.activities.length, 1);

  const detall = await eina('get_activity', { activity_id: rondalles.id });
  assert.equal(detall.name, rondalles.name);
  assert.ok(Array.isArray(detall.tasks));
  assert.ok(Array.isArray(detall.partners));
  assert.equal(typeof detall.image_rights.without_image_consent, 'number');

  const finalitats = await eina('list_objectives');
  assert.ok(finalitats.length > 0 && finalitats[0].code);

  const part = await eina('list_activity_participants', { activity_id: rondalles.id });
  assert.ok(part.participants.length > 0);
  assert.ok(part.participants.some((p: { minor: boolean }) => p.minor), 'hi ha infants inscrits');
  assert.equal(typeof part.participants[0].age_band, 'string');

  const indicadors = await eina('get_impact_indicators', { year: 2026 });
  assert.ok(indicadors.totals.activitats > 0);
  const memoria = await eina('get_annual_activity_report', { year: 2026 });
  assert.ok(memoria.activities.length > 0);

  const web = await eina('get_website_status');
  assert.equal(typeof web.pending_changes, 'boolean');
  await eina('list_news');
  await eina('list_social_posts');
  const suggeriment = await eina('suggest_social_post', { activity_id: rondalles.id });
  assert.match(suggeriment.by_network.facebook, /rondalles/i);
});

test('crear una activitat i inscriure-hi una persona de fora (amb llista d’espera)', async () => {
  const objectius = (await eina('list_objectives')).map((f: { code: string }) => f.code);
  const nova = await eina('create_activity', {
    name: 'Taller de prova de l’agent', start_date: '2026-12-12', place: 'Claustre', objectives: [objectius[0]], places: 1, budget_euros: 45.5,
  });
  assert.ok(nova.id);
  assert.equal(nova.budget_cents, 4550);
  assert.deepEqual(nova.objectives, [objectius[0]]);

  const primera = await eina('register_activity_participant', { activity_id: nova.id, external_name: 'Pere Prova', gender: 'home', birth_year: 2015 });
  assert.equal(primera.status, 'inscrit');
  assert.equal(primera.minor, true);
  assert.equal(primera.minor_without_guardian_authorisation, true);
  const segona = await eina('register_activity_participant', { activity_id: nova.id, external_name: 'Maria Prova' });
  assert.equal(segona.status, 'espera');

  // Cancel·lar la primera fa entrar la segona.
  const baixa = await eina('set_participant_status', { activity_id: nova.id, participant_id: primera.participant_id, status: 'cancel·lat' });
  assert.deepEqual(baixa.promoted_from_waiting_list.map((p: { name: string }) => p.name), ['Maria Prova']);

  const llista = await eina('mark_attendance', { activity_id: nova.id, all_registered: true });
  assert.equal(llista.updated, 1);

  const canvi = await eina('update_activity', { activity_id: nova.id, place: 'Sala gran' });
  assert.equal(canvi.place, 'Sala gran');
  assert.equal(canvi.budget_cents, 4550, 'els camps que no es passen es conserven');
  const upcoming = await eina('list_activities', { when: 'upcoming' });
  assert.ok(upcoming.activities.some((a: { id: number }) => a.id === nova.id));
});

test('proposta: publicar una notícia en esborrany després de l’aprovació', async () => {
  const esborrany = await eina('save_news_draft', { title: 'Notícia de prova', summary: 'Resum', content: 'Text **Markdown**' });
  assert.equal(esborrany.published, false);

  const proposta = await eina('publish_news', { news_id: esborrany.id, reason: 'Prova' });
  assert.equal(proposta.status, 'pending_approval');
  assert.match(proposta.summary, /Notícia de prova/);
  // Encara no s'ha publicat.
  assert.equal((await eina('list_news', { news_id: esborrany.id })).published, false);

  const aprovada = await srv.api('POST', `/agent/propostes/${proposta.proposal_id}/aprova`);
  assert.equal(aprovada.status, 200, JSON.stringify(aprovada.cos));
  assert.equal(aprovada.cos.estat, 'executada', aprovada.cos.resultat);
  const publicada = await eina('list_news', { news_id: esborrany.id });
  assert.equal(publicada.published, true);

  // Una notícia publicada ja no es pot editar com a esborrany.
  const r = await srv.eina('save_news_draft', { news_id: esborrany.id, title: 'Canvi' });
  assert.notEqual(r.status, 200);
});
