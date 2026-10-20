// Eines d'economia dels agents d'IA: lectures, escriptures i una proposta aprovada de punta a punta.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { arrencaServidor } from './prova-servidor.ts';
import type { ServidorProva } from './prova-servidor.ts';
import { EINES, euros } from './eines/economia.ts';

let srv: ServidorProva;
before(async () => {
  srv = await arrencaServidor({ rol: 'tresoreria' });
});
after(async () => {
  await srv?.atura();
});

const PROHIBITS = new Set(['iban', 'nif', 'dni', 'adreca', 'bic', 'mandat_referencia', 'clau_donant', 'email', 'telefon']);
function senseSensibles(v: unknown, cami = '$') {
  if (Array.isArray(v)) return v.forEach((x, i) => senseSensibles(x, `${cami}[${i}]`));
  if (!v || typeof v !== 'object') return;
  for (const [k, x] of Object.entries(v)) {
    assert.ok(!PROHIBITS.has(k.toLowerCase()) && !k.toLowerCase().endsWith('_nif'), `camp sensible «${k}» a ${cami}`);
    senseSensibles(x, `${cami}.${k}`);
  }
}

const crida = async (nom: string, args: Record<string, unknown> = {}) => {
  const r = await srv.eina(nom, args);
  assert.equal(r.status, 200, `${nom}: ${JSON.stringify(r.cos)}`);
  senseSensibles(r.cos.result);
  return r.cos.result;
};

test('les eines tenen noms snake_case, descripció i resum a les propostes', () => {
  for (const e of EINES) {
    assert.match(e.nom, /^[a-z]+(_[a-z0-9]+)+$/);
    assert.ok(e.descripcio.length > 40, e.nom);
    if (e.nivell === 'proposta') assert.ok(e.resum, `${e.nom} sense resum`);
  }
  assert.equal(euros(123456), '1.234,56 €');
  assert.equal(euros(-500), '-5,00 €');
});

test('el perfil de tresoreria veu les eines d’economia', async () => {
  const r = await fetch(`${srv.base}/api/agent-ia/eines`, { headers: { Authorization: `Bearer ${srv.clau}` } });
  const noms = ((await r.json()) as { name: string }[]).map((e) => e.name);
  for (const n of ['list_movements', 'collect_fees', 'issue_invoice', 'get_income_statement']) assert.ok(noms.includes(n), n);
});

test('eines de lectura', async () => {
  const comptes = await crida('get_accounts_and_categories');
  assert.ok(comptes.accounts.length > 0);
  assert.ok(comptes.categories.some((c: { type: string }) => c.type === 'expense'));

  const movs = await crida('list_movements', { year: 2026, type: 'income', limit: 5 });
  assert.ok(movs.total_matching > 0);
  assert.ok(movs.movements.length <= 5);
  assert.ok(movs.movements.every((m: { type: string }) => m.type === 'income'));

  const informe = await crida('get_income_statement', { year: 2026 });
  assert.equal(informe.result_cents, informe.total_income_cents - informe.total_expenses_cents);

  const quotes = await crida('list_fees', { year: 2026, status: 'pending' });
  assert.ok(quotes.fees.length > 0);
  assert.ok(quotes.fees.every((q: { status: string }) => q.status === 'pendent'));

  await crida('get_budget', { year: 2026 });
  const tancaments = await crida('get_year_closing_status');
  assert.ok(Array.isArray(tancaments));
  const fiscal = await crida('get_tax_overview', { year: 2025 });
  assert.ok(fiscal.corporate_tax_200 && fiscal.withholdings);
  const extractes = await crida('list_bank_statement_lines');
  assert.ok(Array.isArray(extractes));
  const subv = await crida('list_grants');
  if (subv.grants.length) {
    const det = await crida('list_grants', { grant_id: subv.grants[0].id, include_candidates: true });
    assert.ok(det.totals);
  }
  for (const view of ['donations', 'donors', 'certificates', 'model_182']) await crida('list_donations', { year: 2025, view });
  const factures = await crida('list_invoices', { year: 2026 });
  assert.ok(Array.isArray(factures.series));
  await crida('list_inventory');
  const remeses = await crida('list_remittances', { year: 2026 });
  assert.ok('earliest_collection_date' in remeses);
});

test('escriptura: crear i modificar un moviment', async () => {
  const { accounts, categories } = await crida('get_accounts_and_categories');
  const despesa = categories.find((c: { type: string; active: boolean }) => c.type === 'expense' && c.active);
  const any = new Date().getFullYear();
  const data = `${any}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const m = await crida('create_movement', {
    type: 'expense', date: data, amount_eur: 45.9, concept: 'Material de prova (agent)', account_id: accounts[0].id, category_id: despesa.id,
  });
  assert.equal(m.amount_cents, 4590);
  assert.equal(m.type, 'expense');
  const nou = await crida('update_movement', { movement_id: m.id, amount_eur: '50,10', notes: 'Revisat' });
  assert.equal(nou.amount_cents, 5010);
  assert.equal(nou.concept, 'Material de prova (agent)');
  assert.equal(nou.notes, 'Revisat');
  const cerca = await crida('list_movements', { year: any, text: 'Material de prova (agent)' });
  assert.equal(cerca.total_matching, 1);

  // Pressupost: fixar una línia conserva les altres.
  const abans = await crida('get_budget', { year: any + 1, include_empty: true });
  const r = await crida('set_budget_lines', { year: any + 1, category_ids: [despesa.id], amounts_eur: [300] });
  assert.equal(r.updated[0].budget_cents, 30000);
  const despres = await crida('get_budget', { year: any + 1 });
  assert.equal(despres.categories.find((c: { category_id: number }) => c.category_id === despesa.id).budget_cents, 30000);
  assert.ok(abans.categories.length >= despres.categories.length);

  // Error de validació llegible.
  const mal = await srv.eina('create_movement', { type: 'expense', date: data, amount_eur: 10, concept: 'x', account_id: accounts[0].id });
  assert.equal(mal.status, 400);
});

test('proposta: cobrar una quota queda pendent i s’executa quan la persona l’aprova', async () => {
  const any = new Date().getFullYear();
  const { fees } = await crida('list_fees', { year: 2026, status: 'pending' });
  const quota = fees.find((q: { in_remittance: boolean }) => !q.in_remittance);
  const { accounts } = await crida('get_accounts_and_categories');
  const data = `${any}-${String(new Date().getMonth() + 1).padStart(2, '0')}-02`;
  const p = await crida('collect_fees', { fee_ids: [quota.id], year: 2026, method: 'cash', account_id: accounts[0].id, date: data, reason: 'Ha pagat en mà' });
  assert.equal(p.status, 'pending_approval');
  assert.match(p.summary, /Cobrar 1 quota de 2026/);
  assert.ok(p.summary.includes(euros(quota.amount_cents)));
  assert.match(p.summary, /en efectiu/);

  // Encara no s'ha cobrat.
  let ara = await crida('list_fees', { year: 2026 });
  assert.equal(ara.fees.find((q: { id: number }) => q.id === quota.id).status, 'pendent');

  const aprovada = await srv.api('POST', `/agent/propostes/${p.proposal_id}/aprova`);
  assert.equal(aprovada.status, 200);
  assert.equal(aprovada.cos.estat, 'executada', aprovada.cos.resultat);
  ara = await crida('list_fees', { year: 2026 });
  const cobrada = ara.fees.find((q: { id: number }) => q.id === quota.id);
  assert.equal(cobrada.status, 'pagada');
  assert.equal(cobrada.payment_date, data);
  assert.equal(cobrada.method, 'efectiu');

  const estat = await crida('get_proposal_status', { proposal_id: p.proposal_id });
  assert.equal(estat.status, 'executada');
});

test('les altres propostes generen un resum sense executar res', async () => {
  const tancat = async () => (await crida('get_year_closing_status')).find((t: { year: number }) => t.year === 2025)?.closed;
  const abans = await tancat();
  const p = await crida('close_year', { year: 2025 });
  assert.match(p.summary, /Tancar l'exercici 2025/);
  assert.equal(await tancat(), abans);
  const g = await crida('generate_year_fees', { year: 2027 });
  assert.match(g.summary, /2027/);
  assert.equal((await crida('list_fees', { year: 2027 })).fees.length, 0);
});

test('altres escriptures i resums de propostes', async () => {
  const any = new Date().getFullYear();
  const avui = new Date().toISOString().slice(0, 10);
  const d = await crida('create_donation', { donor_name: 'Donant de prova', date: avui, amount_eur: 25 });
  assert.equal(d.amount_cents, 2500);
  const cert = await crida('issue_donation_certificate', { kind: 'receipt', donation_id: d.id });
  assert.match(cert.summary, /25,00 €/);

  const inv = await crida('add_inventory_item', { description: 'Altaveu de prova', acquisition_date: avui, value_eur: 199.99, category: 'equip_so', condition: 'good' });
  assert.ok(inv.id);
  const llista = await crida('list_inventory', { limit: 500 });
  assert.equal(llista.items.find((b: { id: number }) => b.id === inv.id).valor_adquisicio_cents, 19999);

  const { series } = await crida('list_invoices', { year: any });
  const simple = series.find((s: { type: string }) => s.type === 'simplificada');
  assert.ok(simple, "sèrie simplificada");
  if (simple) {
    const f = await crida('create_invoice_draft', { series_id: simple.id, description: 'Lloguer de prova', line_concepts: ['Lloguer'], line_unit_prices_eur: [100] });
    assert.equal(f.total_cents, 12100);
    const p = await crida('issue_invoice', { invoice_id: f.id });
    assert.match(p.summary, /121,00 €/);
  }

  const comptes = await crida('list_bank_statement_lines');
  const amb = comptes.find((c: { pendents: number }) => c.pendents > 0);
  assert.ok(amb, "extracte amb pendents");
  if (amb) {
    const { lines } = await crida('list_bank_statement_lines', { account_id: amb.id });
    await crida('list_bank_statement_lines', { line_id: lines[0].id, wide: true });
    assert.equal((await crida('reconcile_bank_line', { line_id: lines[0].id, action: 'ignore' })).status, 'ignored');
    assert.equal((await crida('reconcile_bank_line', { line_id: lines[0].id, action: 'undo' })).status, 'pending');
  }

  const { grants } = await crida('list_grants');
  const oberta = grants.find((g: { status: string }) => g.status === 'concedida' || g.status === 'cobrada');
  assert.ok(oberta, "subvenció oberta");
  if (oberta) {
    const det = await crida('list_grants', { grant_id: oberta.id, include_candidates: true });
    const cand = det.candidate_expenses.find((m: { amount_cents: number; already_imputed_cents: number }) => m.amount_cents > m.already_imputed_cents);
    assert.ok(cand, "despesa candidata");
    if (cand) {
      const i = await crida('impute_expense_to_grant', { grant_id: oberta.id, movement_id: cand.movement_id });
      assert.equal(i.imputed_cents, cand.amount_cents - cand.already_imputed_cents);
    }
    const p = await crida('mark_grant_justified', { grant_id: oberta.id });
    assert.match(p.summary, /Marcar com a justificada/);
  }
  const rem = await crida('generate_remittance', { year: 2026, collection_date: `${any + 1}-01-15` });
  assert.match(rem.summary, /remesa SEPA/);
});
