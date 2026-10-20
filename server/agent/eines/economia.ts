// Eines del domini «economia» per als agents d'IA: comptes, moviments, quotes, pressupost, tancament,
// fiscalitat, extractes bancaris, subvencions, donatius, facturació, inventari i remeses SEPA.
//
// Totes passen per l'API normal del programa (mateixes validacions, permisos i auditoria). Els imports
// que arriben de l'agent són euros amb decimals (paràmetres *_eur) i es converteixen a cèntims aquí.
// Les dades sensibles (NIF, IBAN, adreces, referències de mandat…) no es demanen mai ni es tornen.
import type { ApiInterna, Eina } from '../tipus.ts';

// ---------- Utilitats ----------

const pad = (n: number) => String(n).padStart(2, '0');
const avui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const anyActual = () => new Date().getFullYear();

/** Euros (amb decimals) → cèntims enters. */
function aCents(v: unknown, camp: string): number {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid amount in "${camp}".`);
  return Math.round(n * 100);
}

/** 24000 → «240,00 €». */
export function euros(c: number): string {
  const neg = c < 0;
  const [enter, dec] = (Math.abs(c) / 100).toFixed(2).split('.');
  return `${neg ? '-' : ''}${enter.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec} €`;
}
/** 2026-10-18 → 18/10/2026. */
const dataCat = (iso: string) => iso.split('-').reverse().join('/');

/** Cadena de consulta amb els valors definits. */
function qs(p: Record<string, unknown>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== null && v !== '') u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : '';
}

const limitDe = (a: Record<string, any>, def = 50) => Math.max(1, Math.min(500, Number(a.limit) || def));
const ids = (v: unknown): number[] =>
  [...new Set((Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]).map(Number))].filter((n) => Number.isInteger(n) && n > 0);
const any = (a: Record<string, any>) => Number(a.year) || anyActual();
const mapa = <T extends string>(m: Record<string, T>, v: unknown, camp: string): T | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const r = m[String(v)];
  if (!r) throw new Error(`Invalid value for "${camp}": ${v}. Allowed: ${Object.keys(m).join(', ')}.`);
  return r;
};

async function nomCompte(api: ApiInterna, id: number): Promise<string> {
  const comptes = await api.get<{ id: number; nom: string }[]>('/comptabilitat/comptes');
  return comptes.find((c) => c.id === Number(id))?.nom ?? `compte #${id}`;
}

// ---------- Esquemes reutilitzats ----------

const pYear = { type: 'integer', description: 'Financial year (e.g. 2026). Defaults to the current year.' };
const pLimit = { type: 'integer', description: 'Maximum number of rows to return (default 50).' };
const pDate = (d: string) => ({ type: 'string', description: `${d} (YYYY-MM-DD).` });

const TIPUS_MOV: Record<string, string> = { income: 'ingres', expense: 'despesa', transfer: 'traspas' };
const TIPUS_MOV_EN: Record<string, string> = { ingres: 'income', despesa: 'expense', traspas: 'transfer' };
const METODES: Record<string, string> = { cash: 'efectiu', bank_transfer: 'transferencia', direct_debit: 'domiciliacio' };
const METODES_CAT: Record<string, string> = { efectiu: 'en efectiu', transferencia: 'per transferència', domiciliacio: 'per domiciliació' };

// ---------- Moviments ----------

interface Moviment {
  id: number;
  data: string;
  tipus: string;
  import_cents: number;
  concepte: string;
  categoria_id: number | null;
  categoria_nom: string | null;
  compte_id: number;
  compte_nom: string;
  compte_desti_id: number | null;
  compte_desti_nom: string | null;
  activitat_id: number | null;
  activitat_nom: string | null;
  soci_id: number | null;
  soci_nom: string | null;
  subvencio_id: number | null;
  subvencio_nom: string | null;
  justificant: string | null;
  notes: string | null;
  n_justificants: number;
  imputat_cents: number;
}

const movimentCompacte = (m: Moviment) => ({
  id: m.id,
  date: m.data,
  type: TIPUS_MOV_EN[m.tipus] ?? m.tipus,
  amount_cents: m.import_cents,
  concept: m.concepte,
  category_id: m.categoria_id,
  category: m.categoria_nom,
  account_id: m.compte_id,
  account: m.compte_nom,
  destination_account: m.compte_desti_nom,
  activity_id: m.activitat_id,
  activity: m.activitat_nom,
  member_id: m.soci_id,
  member: m.soci_nom,
  grant_id: m.subvencio_id,
  grant: m.subvencio_nom,
  receipt_ref: m.justificant,
  notes: m.notes,
  attachments: m.n_justificants,
  imputed_to_grants_cents: m.imputat_cents,
});

const propietatsMoviment = {
  type: { type: 'string', enum: ['income', 'expense', 'transfer'], description: 'Movement type. A transfer moves money between two own accounts.' },
  date: pDate('Date of the movement'),
  amount_eur: { type: 'number', description: 'Amount in euros, positive, with decimals (e.g. 45.90).' },
  concept: { type: 'string', description: 'Short description of the movement.' },
  account_id: { type: 'integer', description: 'Account id (see get_accounts_and_categories). For transfers, the source account.' },
  category_id: { type: 'integer', description: 'Category id; must match the type (income/expense). Not used for transfers.' },
  destination_account_id: { type: 'integer', description: 'Only for transfers: destination account id.' },
  activity_id: { type: 'integer', description: 'Optional activity id this movement belongs to.' },
  member_id: { type: 'integer', description: 'Optional member id related to the movement.' },
  grant_id: { type: 'integer', description: 'Only for income: id of the grant this income is a payment of.' },
  receipt_ref: { type: 'string', description: 'Optional invoice/receipt number.' },
  notes: { type: 'string', description: 'Optional notes.' },
};

// ---------- Quotes ----------

interface Quota {
  id: number;
  soci_id: number;
  exercici: number;
  import_cents: number;
  estat: string;
  data_pagament: string | null;
  metode: string | null;
  num_soci: number;
  nom_soci: string;
  metode_preferit: string;
  en_remesa: number;
}

async function quotesPerIds(api: ApiInterna, idsQ: number[], anys: number[]): Promise<Quota[]> {
  const trobades = new Map<number, Quota>();
  for (const a of [...new Set(anys)]) {
    if (trobades.size === idsQ.length) break;
    for (const q of await api.get<Quota[]>(`/quotes?exercici=${a}`)) if (idsQ.includes(q.id)) trobades.set(q.id, q);
  }
  return [...trobades.values()];
}

// ---------- Eines ----------

export const EINES: Eina[] = [
  // ----- Comptes i categories -----
  {
    nom: 'get_accounts_and_categories',
    descripcio:
      'Lists the association accounts (cash box, bank accounts) with their current balance (balance_cents, initial_balance_cents) and all income/expense categories (id, name, type ingres=income / despesa=expense, active). Use it to find account_id and category_id before creating or filtering movements. Amounts in euro cents.',
    parametres: { type: 'object', properties: {} },
    nivell: 'lectura',
    modul: 'economia',
    executa: async (_a, api) => {
      const [comptes, categories] = await Promise.all([
        api.get<{ id: number; nom: string; saldo_cents: number; saldo_inicial_cents: number; actiu: number }[]>('/comptabilitat/comptes'),
        api.get<{ id: number; nom: string; tipus: string; actiu: number }[]>('/comptabilitat/categories'),
      ]);
      return {
        accounts: comptes.map((c) => ({ id: c.id, name: c.nom, balance_cents: c.saldo_cents, initial_balance_cents: c.saldo_inicial_cents, active: Boolean(c.actiu) })),
        total_balance_cents: comptes.reduce((s, c) => s + c.saldo_cents, 0),
        categories: categories.map((c) => ({ id: c.id, name: c.nom, type: c.tipus === 'ingres' ? 'income' : 'expense', active: Boolean(c.actiu) })),
      };
    },
  },

  // ----- Moviments -----
  {
    nom: 'list_movements',
    descripcio:
      'Searches accounting movements (income, expenses, transfers) of one financial year, newest first. Filters: account, category, type, free text (concept, receipt number, notes), activity and grant (grant_id returns both the grant payments received and the expenses imputed to it). Returns total_matching, sum_income_cents, sum_expense_cents and up to "limit" movements with id, date, type, amount_cents, concept, category, account, activity, member, grant, receipt_ref, attachments count and imputed_to_grants_cents.',
    parametres: {
      type: 'object',
      properties: {
        year: pYear,
        account_id: { type: 'integer' },
        category_id: { type: 'integer' },
        type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
        text: { type: 'string', description: 'Text to search in concept, receipt number and notes.' },
        activity_id: { type: 'integer' },
        grant_id: { type: 'integer', description: 'Only movements linked to this grant (payments received or imputed expenses).' },
        limit: pLimit,
      },
    },
    nivell: 'lectura',
    modul: 'economia',
    executa: async (a, api) => {
      let movs = await api.get<Moviment[]>(
        `/comptabilitat/moviments${qs({
          exercici: any(a), compte_id: a.account_id, categoria_id: a.category_id, tipus: mapa(TIPUS_MOV, a.type, 'type'),
          activitat_id: a.activity_id, q: a.text,
        })}`,
      );
      if (a.grant_id) {
        const imputades = await api.get<{ moviment_id: number }[]>(`/subvencions/${Number(a.grant_id)}/imputacions`);
        const set = new Set(imputades.map((i) => i.moviment_id));
        movs = movs.filter((m) => m.subvencio_id === Number(a.grant_id) || set.has(m.id));
      }
      const limit = limitDe(a);
      return {
        year: any(a),
        total_matching: movs.length,
        sum_income_cents: movs.filter((m) => m.tipus === 'ingres').reduce((s, m) => s + m.import_cents, 0),
        sum_expense_cents: movs.filter((m) => m.tipus === 'despesa').reduce((s, m) => s + m.import_cents, 0),
        returned: Math.min(limit, movs.length),
        movements: movs.slice(0, limit).map(movimentCompacte),
      };
    },
  },
  {
    nom: 'create_movement',
    descripcio:
      'Records a new accounting movement (income, expense or transfer between own accounts). Income and expenses need a category of the same type; transfers need destination_account_id. Fails if the date belongs to a closed financial year. Returns the created movement (amounts in cents).',
    parametres: {
      type: 'object',
      properties: propietatsMoviment,
      required: ['type', 'date', 'amount_eur', 'concept', 'account_id'],
    },
    nivell: 'escriptura',
    modul: 'economia',
    executa: async (a, api) => {
      const m = await api.post<Moviment>('/comptabilitat/moviments', {
        tipus: mapa(TIPUS_MOV, a.type, 'type'),
        data: a.date,
        import_cents: aCents(a.amount_eur, 'amount_eur'),
        concepte: a.concept,
        compte_id: a.account_id,
        categoria_id: a.category_id,
        compte_desti_id: a.destination_account_id,
        activitat_id: a.activity_id,
        soci_id: a.member_id,
        subvencio_id: a.grant_id,
        justificant: a.receipt_ref,
        notes: a.notes,
      });
      return movimentCompacte(m);
    },
  },
  {
    nom: 'update_movement',
    descripcio:
      'Changes an existing movement: only the fields you pass are modified, the rest keep their value. Use list_movements to find movement_id. Fee collections cannot change amount here, and expenses of justified grants cannot change amount or date. Pass 0 in activity_id/member_id/grant_id to clear them. Returns the updated movement.',
    parametres: {
      type: 'object',
      properties: { movement_id: { type: 'integer' }, ...propietatsMoviment },
      required: ['movement_id'],
    },
    nivell: 'escriptura',
    modul: 'economia',
    executa: async (a, api) => {
      const id = Number(a.movement_id);
      const m = await api.get<Moviment>(`/comptabilitat/moviments/${id}`);
      const tria = <T>(v: unknown, actual: T) => (v === undefined ? actual : v === 0 ? null : v);
      const tipus = mapa(TIPUS_MOV, a.type, 'type') ?? m.tipus;
      const nou = await api.put<Moviment>(`/comptabilitat/moviments/${id}`, {
        tipus,
        data: a.date ?? m.data,
        import_cents: a.amount_eur === undefined ? m.import_cents : aCents(a.amount_eur, 'amount_eur'),
        concepte: a.concept ?? m.concepte,
        compte_id: a.account_id ?? m.compte_id,
        categoria_id: a.category_id ?? m.categoria_id,
        compte_desti_id: a.destination_account_id ?? m.compte_desti_id,
        activitat_id: tria(a.activity_id, m.activitat_id),
        soci_id: tria(a.member_id, m.soci_id),
        ...(a.grant_id === undefined ? {} : { subvencio_id: a.grant_id === 0 ? null : a.grant_id }),
        justificant: a.receipt_ref ?? m.justificant,
        notes: a.notes ?? m.notes,
      });
      return movimentCompacte(nou);
    },
  },

  // ----- Informes -----
  {
    nom: 'get_income_statement',
    descripcio:
      'Income statement and cash report of a financial year: income and expenses per category, totals and result, and for each account the opening balance at 1 January, money in, money out and closing balance; also income/expenses per activity. Amounts in euro cents.',
    parametres: { type: 'object', properties: { year: pYear } },
    nivell: 'lectura',
    modul: 'informes',
    executa: async (a, api) => {
      const r = await api.get<{
        exercici: number;
        ingressos: { categoria: string; total_cents: number }[];
        despeses: { categoria: string; total_cents: number }[];
        total_ingressos_cents: number;
        total_despeses_cents: number;
        comptes: { nom: string; saldo_inicial_cents: number; entrades_cents: number; sortides_cents: number; saldo_final_cents: number }[];
        activitats: { nom: string; ingressos_cents: number; despeses_cents: number }[];
      }>(`/informes/economic?exercici=${any(a)}`);
      return {
        year: r.exercici,
        income_by_category: r.ingressos.map((x) => ({ category: x.categoria, total_cents: x.total_cents })),
        expenses_by_category: r.despeses.map((x) => ({ category: x.categoria, total_cents: x.total_cents })),
        total_income_cents: r.total_ingressos_cents,
        total_expenses_cents: r.total_despeses_cents,
        result_cents: r.total_ingressos_cents - r.total_despeses_cents,
        accounts: r.comptes.map((c) => ({
          account: c.nom, opening_balance_cents: c.saldo_inicial_cents, money_in_cents: c.entrades_cents,
          money_out_cents: c.sortides_cents, closing_balance_cents: c.saldo_final_cents,
        })),
        activities: r.activitats.map((x) => ({ activity: x.nom, income_cents: x.ingressos_cents, expenses_cents: x.despeses_cents })),
      };
    },
  },

  // ----- Quotes -----
  {
    nom: 'list_fees',
    descripcio:
      'Membership fees of a financial year with a summary (count and cents per status) and the list of fees: fee id, member_id, member_number, member name, amount_cents, status (pendent = pending/unpaid, pagada = paid, exempta = exempt), payment_date, payment method, preferred method and in_remittance (already in a pending SEPA remittance). Filter by status. Use the fee ids with collect_fees.',
    parametres: {
      type: 'object',
      properties: {
        year: pYear,
        status: { type: 'string', enum: ['pending', 'paid', 'exempt'], description: 'Only fees with this status.' },
        limit: { type: 'integer', description: 'Maximum number of fees to list (default 200).' },
      },
    },
    nivell: 'lectura',
    modul: 'economia',
    executa: async (a, api) => {
      const quotes = await api.get<Quota[]>(`/quotes?exercici=${any(a)}`);
      const resum: Record<string, { count: number; amount_cents: number }> = {};
      for (const q of quotes) {
        const r = (resum[q.estat] ??= { count: 0, amount_cents: 0 });
        r.count++;
        r.amount_cents += q.import_cents;
      }
      const estat = mapa({ pending: 'pendent', paid: 'pagada', exempt: 'exempta' }, a.status, 'status');
      const llista = estat ? quotes.filter((q) => q.estat === estat) : quotes;
      const limit = limitDe(a, 200);
      return {
        year: any(a),
        summary: resum,
        total_matching: llista.length,
        fees: llista.slice(0, limit).map((q) => ({
          id: q.id, member_id: q.soci_id, member_number: q.num_soci, member: q.nom_soci, amount_cents: q.import_cents,
          status: q.estat, payment_date: q.data_pagament, method: q.metode, preferred_method: q.metode_preferit, in_remittance: Boolean(q.en_remesa),
        })),
      };
    },
  },
  {
    nom: 'collect_fees',
    descripcio:
      'Registers the payment of one or several pending membership fees: for each fee an income movement is created in the chosen account and the fee becomes paid. Use list_fees (status pending) to get fee ids. Fees in a pending SEPA remittance cannot be collected this way.',
    parametres: {
      type: 'object',
      properties: {
        fee_ids: { type: 'array', items: { type: 'integer' }, description: 'Ids of the fees to collect (from list_fees).' },
        year: { type: 'integer', description: 'Financial year of the fees (defaults to the year of the payment date).' },
        method: { type: 'string', enum: ['cash', 'bank_transfer', 'direct_debit'], description: "Payment method. Defaults to each member's preferred method." },
        account_id: { type: 'integer', description: 'Account where the money comes in.' },
        date: pDate('Payment date, defaults to today'),
      },
      required: ['fee_ids', 'account_id'],
    },
    nivell: 'proposta',
    modul: 'economia',
    resum: async (a, api) => {
      const llista = ids(a.fee_ids);
      const data = a.date || avui();
      const anys = [Number(a.year) || Number(data.slice(0, 4)), Number(data.slice(0, 4)), Number(data.slice(0, 4)) - 1];
      const quotes = await quotesPerIds(api, llista, anys);
      const total = quotes.reduce((s, q) => s + q.import_cents, 0);
      const exercicis = [...new Set(quotes.map((q) => q.exercici))].join(', ') || String(anys[0]);
      const qui = quotes.length <= 5 ? ` (${quotes.map((q) => `núm. ${q.num_soci} ${q.nom_soci}`).join('; ')})` : '';
      const metode = METODES_CAT[mapa(METODES, a.method, 'method') ?? ''] ?? 'amb la forma de pagament preferida de cada soci';
      const noTrobades = llista.length - quotes.length;
      return `Cobrar ${llista.length} ${llista.length === 1 ? 'quota' : 'quotes'} de ${exercicis} (${euros(total)})${qui} ${metode} al compte ${await nomCompte(api, a.account_id)} amb data ${dataCat(data)}${noTrobades ? ` — atenció: ${noTrobades} quota(es) no trobada(es)` : ''}.`;
    },
    executa: async (a, api) => {
      const llista = ids(a.fee_ids);
      if (!llista.length) throw new Error('fee_ids is empty.');
      const cos = { data: a.date || avui(), compte_id: a.account_id, metode: mapa(METODES, a.method, 'method') };
      if (llista.length === 1) {
        const q = await api.post<{ id: number; estat: string; import_cents: number; data_pagament: string }>(`/quotes/${llista[0]}/cobrar`, cos);
        return { collected: 1, fee_id: q.id, status: q.estat, amount_cents: q.import_cents, payment_date: q.data_pagament };
      }
      const r = await api.post<{ cobrades: number }>('/quotes/cobrar-lot', { ...cos, ids: llista });
      return { collected: r.cobrades };
    },
  },
  {
    nom: 'generate_year_fees',
    descripcio:
      "Creates the membership fees of a financial year for every active admitted member that does not have one yet, using each member's fee type amount (members with a 0 € fee type get an exempt fee). Run it once at the start of the year.",
    parametres: { type: 'object', properties: { year: { type: 'integer', description: 'Financial year to generate (e.g. 2027).' } }, required: ['year'] },
    nivell: 'proposta',
    modul: 'economia',
    resum: async (a, api) => {
      const ja = await api.get<Quota[]>(`/quotes?exercici=${Number(a.year)}`);
      return `Generar les quotes de l'exercici ${a.year} per a tots els socis actius que encara no en tenen (ara n'hi ha ${ja.length} de creades per a ${a.year}).`;
    },
    executa: async (a, api) => {
      const r = await api.post<{ creades: number }>('/quotes/generar', { exercici: Number(a.year) });
      return { created: r.creades, year: Number(a.year) };
    },
  },

  // ----- Pressupost -----
  {
    nom: 'get_budget',
    descripcio:
      'Budget versus actual for a financial year, per category: budget_cents, actual_cents, previous year budget and actual, plus totals of income and expenses and whether the budget was approved by the assembly (approved_on). Amounts in euro cents. By default only categories with some figure are listed.',
    parametres: { type: 'object', properties: { year: pYear, include_empty: { type: 'boolean', description: 'Also list categories with all figures at zero.' } } },
    nivell: 'lectura',
    modul: 'economia',
    executa: async (a, api) => {
      const r = await api.get<{
        exercici: number;
        aprovat_el: string | null;
        te_pressupost: boolean;
        categories: { id: number; nom: string; tipus: string; pressupost_cents: number; real_cents: number; anterior_pressupost_cents: number; anterior_real_cents: number }[];
      }>(`/tresoreria/pressupost?exercici=${any(a)}`);
      const total = (t: string, k: 'pressupost_cents' | 'real_cents') => r.categories.filter((c) => c.tipus === t).reduce((s, c) => s + c[k], 0);
      const cats = a.include_empty
        ? r.categories
        : r.categories.filter((c) => c.pressupost_cents || c.real_cents || c.anterior_pressupost_cents || c.anterior_real_cents);
      return {
        year: r.exercici,
        has_budget: r.te_pressupost,
        approved_on: r.aprovat_el,
        totals: {
          income_budget_cents: total('ingres', 'pressupost_cents'),
          income_actual_cents: total('ingres', 'real_cents'),
          expense_budget_cents: total('despesa', 'pressupost_cents'),
          expense_actual_cents: total('despesa', 'real_cents'),
        },
        categories: cats.map((c) => ({
          category_id: c.id, category: c.nom, type: c.tipus === 'ingres' ? 'income' : 'expense', budget_cents: c.pressupost_cents,
          actual_cents: c.real_cents, difference_cents: c.real_cents - c.pressupost_cents,
          previous_budget_cents: c.anterior_pressupost_cents, previous_actual_cents: c.anterior_real_cents,
        })),
      };
    },
  },
  {
    nom: 'set_budget_lines',
    descripcio:
      'Sets the budgeted amount of one or more categories for a financial year. Only the categories passed change; the other budget lines are kept. Pass amount 0 to remove a line. Not possible if the budget of that year is already approved. category_ids and amounts_eur are parallel arrays (same length, same order).',
    parametres: {
      type: 'object',
      properties: {
        year: { type: 'integer' },
        category_ids: { type: 'array', items: { type: 'integer' } },
        amounts_eur: { type: 'array', items: { type: 'number' }, description: 'Budgeted amount in euros for each category, same order.' },
      },
      required: ['year', 'category_ids', 'amounts_eur'],
    },
    nivell: 'escriptura',
    modul: 'economia',
    executa: async (a, api) => {
      const cats = (a.category_ids as unknown[]).map(Number);
      const imports = (a.amounts_eur as unknown[]).map((v, i) => aCents(v, `amounts_eur[${i}]`));
      if (cats.length !== imports.length) throw new Error('category_ids and amounts_eur must have the same length.');
      if (imports.some((c) => c < 0)) throw new Error('Budget amounts cannot be negative.');
      const actual = await api.get<{ categories: { id: number; nom: string; pressupost_cents: number }[] }>(`/tresoreria/pressupost?exercici=${Number(a.year)}`);
      const linies = new Map(actual.categories.filter((c) => c.pressupost_cents > 0).map((c) => [c.id, c.pressupost_cents]));
      cats.forEach((c, i) => {
        if (!actual.categories.some((x) => x.id === c)) throw new Error(`Category ${c} does not exist.`);
        linies.set(c, imports[i]);
      });
      await api.put('/tresoreria/pressupost', {
        exercici: Number(a.year),
        linies: [...linies].map(([categoria_id, import_cents]) => ({ categoria_id, import_cents })),
      });
      return {
        ok: true,
        year: Number(a.year),
        updated: cats.map((c, i) => ({ category_id: c, category: actual.categories.find((x) => x.id === c)?.nom, budget_cents: imports[i] })),
      };
    },
  },

  // ----- Tancament -----
  {
    nom: 'get_year_closing_status',
    descripcio:
      'For each financial year: whether it is closed (closed_on, by whom), number of movements, income_cents, expenses_cents, pending fees and pending SEPA remittances (these block or should be solved before closing). A closed year cannot have movements added, changed or deleted.',
    parametres: { type: 'object', properties: {} },
    nivell: 'lectura',
    modul: 'economia',
    executa: async (_a, api) => {
      const r = await api.get<{ exercici: number; tancat: boolean; tancat_el: string | null; usuari: string | null; notes: string | null; moviments: number; ingressos_cents: number; despeses_cents: number; quotes_pendents: number; remeses_pendents: number }[]>('/tresoreria/tancaments');
      return r.map((t) => ({
        year: t.exercici, closed: t.tancat, closed_on: t.tancat_el, closed_by: t.usuari, notes: t.notes, movements: t.moviments,
        income_cents: t.ingressos_cents, expenses_cents: t.despeses_cents, pending_fees: t.quotes_pendents, pending_remittances: t.remeses_pendents,
      }));
    },
  },
  {
    nom: 'close_year',
    descripcio:
      'Closes a finished financial year: afterwards its movements can no longer be added, modified or deleted (only an administrator can reopen it). Check get_year_closing_status first: pending SEPA remittances of that year block the closing.',
    parametres: { type: 'object', properties: { year: { type: 'integer' }, notes: { type: 'string', description: 'Optional notes about the closing.' } }, required: ['year'] },
    nivell: 'proposta',
    modul: 'economia',
    resum: async (a, api) => {
      const t = (await api.get<{ exercici: number; moviments: number; ingressos_cents: number; despeses_cents: number; quotes_pendents: number }[]>('/tresoreria/tancaments')).find((x) => x.exercici === Number(a.year));
      const xifres = t
        ? ` (${t.moviments} moviments; ingressos ${euros(t.ingressos_cents)}, despeses ${euros(t.despeses_cents)}${t.quotes_pendents ? `; ${t.quotes_pendents} quotes pendents` : ''})`
        : '';
      return `Tancar l'exercici ${a.year}${xifres}. Després ja no se'n podran afegir, modificar ni eliminar moviments.`;
    },
    executa: async (a, api) => {
      await api.post('/tresoreria/tancaments', { exercici: Number(a.year), notes: a.notes });
      return { closed: true, year: Number(a.year) };
    },
  },

  // ----- Fiscalitat -----
  {
    nom: 'get_tax_overview',
    descripcio:
      'Tax information of a financial year. section "corporate_tax" (modelo 200, Impuesto de Sociedades): income per category with exempt flag, totals (total_cents, no_exempts_cents), whether the association must file (obligat) with reasons (motius) and deadline (termini). section "withholdings": modelo 111 and 115 per quarter (base, withholding, payment registered), annual summaries 190 and 180 per payee and 347 (third parties above the threshold, llindar_347_cents); payee tax IDs are never shown, sense_nif counts payees without tax ID. Default "all". Amounts in euro cents.',
    parametres: {
      type: 'object',
      properties: { year: pYear, section: { type: 'string', enum: ['all', 'corporate_tax', 'withholdings'] }, limit: pLimit },
    },
    nivell: 'lectura',
    modul: 'economia',
    executa: async (a, api) => {
      const seccio = a.section ?? 'all';
      const limit = limitDe(a);
      const sortida: Record<string, unknown> = { year: any(a) };
      if (seccio !== 'withholdings') sortida.corporate_tax_200 = await api.get(`/tresoreria/fiscalitat?exercici=${any(a)}`);
      if (seccio !== 'corporate_tax') {
        const m = await api.get<Record<string, unknown>>(`/fiscal/models?exercici=${any(a)}`);
        const tall = (v: unknown) => (Array.isArray(v) ? v.slice(0, limit) : v);
        sortida.withholdings = {
          m111: m.m111, m115: m.m115, m190: tall(m.m190), m180: tall(m.m180), m347: tall(m.m347),
          llindar_347_cents: m.llindar_347_cents, sense_nif: m.sense_nif,
        };
      }
      return sortida;
    },
  },

  // ----- Extractes bancaris -----
  {
    nom: 'list_bank_statement_lines',
    descripcio:
      'Bank statement reconciliation. Without account_id: per account, number of imported statement lines (total, pendents = pending, conciliades = reconciled), last statement date, balance according to the statement (saldo_extracte_cents) and according to the program (saldo_aplicacio_cents). With account_id: statement lines (id, date, concept, amount_cents positive = money in / negative = money out, status, linked movement, suggeriments = number of matching movements), pending ones by default. With line_id: candidate movements to link to that line (same amount and direction within ±5 days; wide=true for ±15 days and any amount).',
    parametres: {
      type: 'object',
      properties: {
        account_id: { type: 'integer' },
        status: { type: 'string', enum: ['pending', 'reconciled', 'ignored', 'all'], description: 'Default pending.' },
        line_id: { type: 'integer', description: 'Return suggested movements for this statement line.' },
        wide: { type: 'boolean' },
        limit: pLimit,
      },
    },
    nivell: 'lectura',
    modul: 'economia',
    executa: async (a, api) => {
      if (a.line_id) {
        const s = await api.get<unknown[]>(`/fiscal/extractes/linies/${Number(a.line_id)}/suggeriments${a.wide ? '?amplia=1' : ''}`);
        return { line_id: Number(a.line_id), suggestions: s };
      }
      if (!a.account_id) {
        const comptes = await api.get<Record<string, unknown>[]>('/fiscal/extractes/comptes');
        return comptes.map(({ iban: _i, mapa: _m, ...c }) => c);
      }
      const estat = a.status === 'all' ? undefined : (mapa({ pending: 'pendent', reconciled: 'conciliat', ignored: 'ignorat' }, a.status ?? 'pending', 'status'));
      const linies = await api.get<unknown[]>(`/fiscal/extractes/linies${qs({ compte_id: a.account_id, estat })}`);
      const limit = limitDe(a);
      return { account_id: Number(a.account_id), total_matching: linies.length, lines: linies.slice(0, limit) };
    },
  },
  {
    nom: 'reconcile_bank_line',
    descripcio:
      'Acts on one bank statement line: "link" links it to an existing movement (movement_id, see list_bank_statement_lines with line_id); "create_movement" creates the income/expense movement from the line (date and amount from the line; needs concept and optionally category_id of the right type) and links it; "ignore" marks it as not needing a movement (e.g. internal bank operations); "undo" returns it to pending (the movement is not deleted).',
    parametres: {
      type: 'object',
      properties: {
        line_id: { type: 'integer' },
        action: { type: 'string', enum: ['link', 'create_movement', 'ignore', 'undo'] },
        movement_id: { type: 'integer', description: 'For "link".' },
        concept: { type: 'string', description: 'For "create_movement".' },
        category_id: { type: 'integer', description: 'For "create_movement" (income category if money in, expense category if money out).' },
      },
      required: ['line_id', 'action'],
    },
    nivell: 'escriptura',
    modul: 'economia',
    executa: async (a, api) => {
      const base = `/fiscal/extractes/linies/${Number(a.line_id)}`;
      switch (a.action) {
        case 'link':
          if (!a.movement_id) throw new Error('movement_id is required for "link".');
          await api.post(`${base}/vincula`, { moviment_id: a.movement_id });
          return { ok: true, line_id: Number(a.line_id), status: 'reconciled', movement_id: Number(a.movement_id) };
        case 'create_movement': {
          const r = await api.post<{ moviment_id: number }>(`${base}/crea`, { concepte: a.concept, categoria_id: a.category_id });
          return { ok: true, line_id: Number(a.line_id), status: 'reconciled', movement_id: r.moviment_id };
        }
        case 'ignore':
          await api.post(`${base}/ignora`);
          return { ok: true, line_id: Number(a.line_id), status: 'ignored' };
        case 'undo':
          await api.post(`${base}/desfes`);
          return { ok: true, line_id: Number(a.line_id), status: 'pending' };
        default:
          throw new Error('Invalid action.');
      }
    },
  },

  // ----- Subvencions -----
  {
    nom: 'list_grants',
    descripcio:
      'Grants (subvencions). Without grant_id: list of grants of a year plus the still-open ones (id, funder/organisme, call, year, status: preparacio, sollicitada = applied, concedida = granted, denegada, cobrada = paid, justificada = justified, tancada = closed, reintegrament = refund; requested, granted, received and imputed amounts, justification deadline, expenses without receipt). With grant_id: detail plus justification summary (totals: granted, received, pending to receive, imputed, executed cost, budget deviation, missing to impute; per category; imputed expenses) and, with include_candidates, expenses that could still be imputed. Amounts in euro cents.',
    parametres: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: 'Year filter for the list (also returns open grants of other years). Omit for all.' },
        grant_id: { type: 'integer' },
        include_candidates: { type: 'boolean', description: 'With grant_id: also list candidate expense movements to impute.' },
        limit: pLimit,
      },
    },
    nivell: 'lectura',
    modul: 'economia',
    executa: async (a, api) => {
      const compacta = (s: Record<string, any>) => ({
        id: s.id, funder: s.organisme, call: s.convocatoria, line: s.linia, file_ref: s.expedient, year: s.exercici, status: s.estat,
        requested_cents: s.import_sollicitat_cents, granted_cents: s.import_concedit_cents, project_budget_cents: s.pressupost_projecte_cents,
        received_cents: s.cobrat_cents, imputed_cents: s.imputat_cents, imputed_expenses: s.n_imputacions, expenses_without_receipt: s.n_sense_justificant,
        period_start: s.periode_inici, period_end: s.periode_fi, justification_deadline: s.termini_justificacio, justified_on: s.data_justificacio,
        activity_id: s.activitat_id, activity: s.activitat_nom,
      });
      const limit = limitDe(a);
      if (!a.grant_id) {
        const llista = await api.get<Record<string, any>[]>(`/subvencions${qs({ exercici: a.year })}`);
        return { total: llista.length, grants: llista.slice(0, limit).map(compacta) };
      }
      const id = Number(a.grant_id);
      const j = await api.get<Record<string, any>>(`/subvencions/${id}/justificacio`);
      const sortida: Record<string, unknown> = {
        grant: { ...compacta(j.subvencio), requirements: j.subvencio.requisits, notes: j.subvencio.notes },
        totals: j.totals,
        per_category: j.per_categoria,
        payments_received: j.cobraments,
        imputed_expenses: (j.despeses as Record<string, any>[]).slice(0, limit).map((d) => ({
          imputation_id: d.id, movement_id: d.moviment_id, date: d.data, concept: d.concepte, creditor: d.creditor, category: d.categoria_nom,
          movement_cents: d.moviment_cents, imputed_cents: d.import_cents, attachments: d.n_justificants,
        })),
      };
      if (a.include_candidates) {
        const c = await api.get<Record<string, any>[]>(`/subvencions/${id}/candidats`);
        sortida.candidate_expenses = c.slice(0, limit).map((m) => ({
          movement_id: m.id, date: m.data, concept: m.concepte, amount_cents: m.import_cents, already_imputed_cents: m.imputat_cents,
          category: m.categoria_nom, activity: m.activitat_nom, attachments: m.n_justificants,
        }));
      }
      return sortida;
    },
  },
  {
    nom: 'impute_expense_to_grant',
    descripcio:
      'Imputes (assigns) an expense movement, totally or partially, to a grant so it counts in its justification. amount_eur defaults to the part of the expense not yet imputed to any grant. Not allowed once the grant is justified. Returns the imputation (amounts in cents).',
    parametres: {
      type: 'object',
      properties: {
        grant_id: { type: 'integer' },
        movement_id: { type: 'integer', description: 'Expense movement id (see list_grants with include_candidates, or list_movements).' },
        amount_eur: { type: 'number', description: 'Amount to impute in euros. Defaults to the remaining amount of the expense.' },
        creditor: { type: 'string', description: 'Optional supplier name for the justification account.' },
      },
      required: ['grant_id', 'movement_id'],
    },
    nivell: 'escriptura',
    modul: 'economia',
    executa: async (a, api) => {
      let importCents: number;
      if (a.amount_eur !== undefined && a.amount_eur !== null) importCents = aCents(a.amount_eur, 'amount_eur');
      else {
        const m = await api.get<Moviment>(`/comptabilitat/moviments/${Number(a.movement_id)}`);
        importCents = m.import_cents - m.imputat_cents;
      }
      const r = await api.post<Record<string, any>>(`/subvencions/${Number(a.grant_id)}/imputacions`, {
        moviment_id: a.movement_id, import_cents: importCents, creditor: a.creditor,
      });
      return { imputation_id: r.id, grant_id: r.subvencio_id, movement_id: r.moviment_id, imputed_cents: r.import_cents, movement_cents: r.moviment_cents, concept: r.concepte };
    },
  },
  {
    nom: 'mark_grant_justified',
    descripcio:
      'Marks a granted or paid grant as justified (the justification was submitted to the funder) on a date. Afterwards its imputed expenses are frozen. The grant needs at least one imputed expense. Review list_grants with grant_id first.',
    parametres: { type: 'object', properties: { grant_id: { type: 'integer' }, date: pDate('Justification date, defaults to today') }, required: ['grant_id'] },
    nivell: 'proposta',
    modul: 'economia',
    resum: async (a, api) => {
      const s = await api.get<Record<string, any>>(`/subvencions/${Number(a.grant_id)}`);
      const nom = [s.organisme, s.convocatoria, s.exercici].filter(Boolean).join(' · ');
      return `Marcar com a justificada la subvenció «${nom}» (imputat ${euros(s.imputat_cents)} de ${euros(s.import_concedit_cents ?? 0)} concedits, ${s.n_imputacions} despeses) amb data ${dataCat(a.date || avui())}.`;
    },
    executa: async (a, api) => {
      const s = await api.post<Record<string, any>>(`/subvencions/${Number(a.grant_id)}/justifica`, { data: a.date || avui() });
      return { grant_id: s.id, status: s.estat, justified_on: s.data_justificacio };
    },
  },

  // ----- Donatius -----
  {
    nom: 'list_donations',
    descripcio:
      'Donations received. view "donations" (default): donations of the year (id, donor name, person type fisica/juridica, date, amount_cents, in-kind description and valuation, revoked, linked movement, certificates issued). view "donors": per donor totals of the year and whether an annual certificate exists. view "certificates": issued donation certificates (number/year, type donacio/anual/rebut, donor name, total). view "model_182": summary of tax form 182 (per donor: total, deduction %, recurrence, declarable or why not; totals and deadline). Donor tax IDs and addresses are never shown; has_tax_id tells whether the donor has one (needed for tax-deductible certificates). Amounts in euro cents.',
    parametres: {
      type: 'object',
      properties: { year: pYear, view: { type: 'string', enum: ['donations', 'donors', 'certificates', 'model_182'] }, limit: pLimit },
    },
    nivell: 'lectura',
    modul: 'economia',
    executa: async (a, api) => {
      const limit = limitDe(a);
      const vista = a.view ?? 'donations';
      if (vista === 'donors') {
        const d = await api.get<Record<string, any>[]>(`/donatius/donants?exercici=${any(a)}`);
        return {
          year: any(a),
          donors: d.slice(0, limit).map((x) => ({
            name: x.nom, person_type: x.tipus_persona, has_tax_id: Boolean(x.nif), donations: x.donacions, total_cents: x.total_cents, annual_certificate_id: x.certificat_id,
          })),
        };
      }
      if (vista === 'certificates') {
        const c = await api.get<Record<string, any>[]>(`/donatius/certificats?exercici=${any(a)}`);
        return c.slice(0, limit).map((x) => ({ id: x.id, number: `${x.numero}/${x.any}`, type: x.tipus, donation_id: x.donatiu_id, year: x.exercici, donor: x.nom, date: x.data, total_cents: x.total_cents, issued_by: x.emes_per }));
      }
      if (vista === 'model_182') {
        const m = await api.get<Record<string, any>>(`/donatius/model182?exercici=${any(a)}`);
        return {
          year: m.exercici, regime_49_2002: m.regim, deadline: m.termini, revoked: m.revocades, totals: m.totals,
          donors: (m.donants as Record<string, any>[]).slice(0, limit).map((f) => ({
            name: f.nom, nature: f.naturalesa, province_code: f.codi_provincia, total_cents: f.total_cents, donations: f.donacions, in_kind: f.en_especie,
            recurrent: f.recurrent, deduction_pct_first_250: f.percentatge_250, deduction_pct_rest: f.percentatge_resta, deduction_cents: f.deduccio_cents,
            previous_year_cents: f.import_anterior_cents, two_years_ago_cents: f.import_anterior2_cents, declarable: f.declarable, issues: f.motius,
          })),
        };
      }
      const d = await api.get<Record<string, any>[]>(`/donatius?exercici=${any(a)}`);
      return {
        year: any(a),
        total: d.length,
        total_cents: d.filter((x) => !x.revocada).reduce((s, x) => s + (x.en_especie ? x.valoracio_cents ?? 0 : x.import_cents), 0),
        donations: d.slice(0, limit).map((x) => ({
          id: x.id, donor: x.nom, member_id: x.soci_id, person_type: x.tipus_persona, has_tax_id: Boolean(x.nif), date: x.data, amount_cents: x.import_cents,
          in_kind: Boolean(x.en_especie), in_kind_description: x.descripcio_especie, valuation_cents: x.valoracio_cents, purpose: x.destinacio,
          revoked: Boolean(x.revocada), movement_id: x.moviment_id, certificates: x.certificats, notes: x.notes,
        })),
      };
    },
  },
  {
    nom: 'create_donation',
    descripcio:
      'Records a donation received (money or in kind). For money donations, create_movement=true also records the income movement (account_id and category_id default to the ones configured for donations). The donor tax ID and address cannot be set by agents: if a tax-deductible certificate is needed, the user must add them in the program. Returns the donation (amounts in cents).',
    parametres: {
      type: 'object',
      properties: {
        donor_name: { type: 'string' },
        person_type: { type: 'string', enum: ['individual', 'legal_entity'], description: 'Default individual.' },
        member_id: { type: 'integer', description: 'If the donor is a member.' },
        date: pDate('Donation date'),
        amount_eur: { type: 'number', description: 'Money donation amount in euros (not for in-kind).' },
        in_kind: { type: 'boolean' },
        in_kind_description: { type: 'string', description: 'Required for in-kind donations.' },
        valuation_eur: { type: 'number', description: 'Value in euros of an in-kind donation (required for in-kind).' },
        purpose: { type: 'string', description: 'What the donation is for.' },
        create_movement: { type: 'boolean', description: 'Money donations: also create the income movement.' },
        account_id: { type: 'integer' },
        category_id: { type: 'integer' },
        notes: { type: 'string' },
      },
      required: ['donor_name', 'date'],
    },
    nivell: 'escriptura',
    modul: 'economia',
    executa: async (a, api) => {
      const especie = Boolean(a.in_kind);
      const d = await api.post<Record<string, any>>('/donatius', {
        nom: a.donor_name,
        tipus_persona: a.person_type === 'legal_entity' ? 'juridica' : 'fisica',
        soci_id: a.member_id,
        data: a.date,
        en_especie: especie,
        import_cents: especie ? undefined : aCents(a.amount_eur, 'amount_eur'),
        descripcio_especie: a.in_kind_description,
        valoracio_cents: especie ? aCents(a.valuation_eur, 'valuation_eur') : undefined,
        destinacio: a.purpose,
        crea_moviment: !especie && Boolean(a.create_movement),
        compte_id: a.account_id,
        categoria_id: a.category_id,
        notes: a.notes,
      });
      return {
        id: d.id, donor: d.nom, date: d.data, amount_cents: d.import_cents, in_kind: Boolean(d.en_especie), valuation_cents: d.valoracio_cents,
        movement_id: d.moviment_id, has_tax_id: Boolean(d.nif),
      };
    },
  },
  {
    nom: 'issue_donation_certificate',
    descripcio:
      'Issues a donation certificate. kind "donation": tax-deductible certificate (Llei 49/2002) of a single donation; "annual": tax-deductible certificate with all the donations of the donor of donation_id in the given year; "receipt": simple receipt without tax effects. Tax-deductible kinds need the association under the 49/2002 regime, a registered secretary and the donor tax ID (has_tax_id in list_donations). Issued certificates are numbered and cannot be deleted.',
    parametres: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['donation', 'annual', 'receipt'] },
        donation_id: { type: 'integer', description: 'The donation (for "annual", any donation of that donor identifies the donor).' },
        year: { type: 'integer', description: 'For "annual": year of the donations (defaults to the year of donation_id).' },
        date: pDate('Certificate date, defaults to today'),
      },
      required: ['kind', 'donation_id'],
    },
    nivell: 'proposta',
    modul: 'economia',
    resum: async (a, api) => {
      const d = await api.get<Record<string, any>>(`/donatius/${Number(a.donation_id)}`);
      const valor = d.en_especie ? d.valoracio_cents ?? 0 : d.import_cents;
      const data = dataCat(a.date || avui());
      if (a.kind === 'annual') {
        const exercici = Number(a.year) || Number(String(d.data).slice(0, 4));
        const donants = await api.get<Record<string, any>[]>(`/donatius/donants?exercici=${exercici}`);
        const g = donants.find((x) => x.nif && d.nif && String(x.nif).toUpperCase() === String(d.nif).toUpperCase());
        return `Emetre el certificat anual de donacions de ${exercici} (amb efectes fiscals) a nom de ${d.nom}: ${g?.donacions ?? '?'} donacions, ${euros(g?.total_cents ?? valor)}, amb data ${data}.`;
      }
      return a.kind === 'receipt'
        ? `Emetre un rebut de donació (sense efectes fiscals) a nom de ${d.nom} per ${euros(valor)} (donació del ${dataCat(d.data)}), amb data ${data}.`
        : `Emetre el certificat de donació amb efectes fiscals a nom de ${d.nom} per ${euros(valor)} (donació del ${dataCat(d.data)}), amb data ${data}.`;
    },
    executa: async (a, api) => {
      const tipus = mapa({ donation: 'donacio', annual: 'anual', receipt: 'rebut' }, a.kind, 'kind');
      const cos: Record<string, unknown> = { tipus, data: a.date || avui() };
      if (tipus === 'anual') {
        const d = await api.get<Record<string, any>>(`/donatius/${Number(a.donation_id)}`);
        if (!d.nif) throw new Error('The donor has no tax ID: the user must add it in the program before issuing an annual certificate.');
        cos.nif = d.nif;
        cos.exercici = Number(a.year) || Number(String(d.data).slice(0, 4));
      } else cos.donatiu_id = Number(a.donation_id);
      const c = await api.post<Record<string, any>>('/donatius/certificats', cos);
      return { certificate_id: c.id, number: `${c.numero}/${c.any}`, type: c.tipus, donor: c.nom, total_cents: c.total_cents, date: c.data };
    },
  },

  // ----- Facturació -----
  {
    nom: 'list_invoices',
    descripcio:
      'Invoices: drafts (esborrany) and invoices issued in the year (emesa = issued, anullada = cancelled) with id, number, type (F1 full, F2 simplified, R* corrective), issue date, client name, base/VAT/total cents and paid date. Also returns the available invoice series (id, code, type) and clients (id, name, has_tax_id) needed by create_invoice_draft.',
    parametres: {
      type: 'object',
      properties: { year: pYear, status: { type: 'string', enum: ['draft', 'issued', 'cancelled'] }, limit: pLimit },
    },
    nivell: 'lectura',
    modul: 'economia',
    executa: async (a, api) => {
      const [factures, series, clients] = await Promise.all([
        api.get<Record<string, any>[]>(`/facturacio/factures?exercici=${any(a)}`),
        api.get<Record<string, any>[]>('/facturacio/series'),
        api.get<Record<string, any>[]>('/facturacio/clients'),
      ]);
      const estat = mapa({ draft: 'esborrany', issued: 'emesa', cancelled: 'anullada' }, a.status, 'status');
      const llista = estat ? factures.filter((f) => f.estat === estat) : factures;
      return {
        year: any(a),
        total: llista.length,
        invoices: llista.slice(0, limitDe(a)).map((f) => ({
          id: f.id, number: f.num_serie, type: f.tipus_factura, status: f.estat, issue_date: f.data_expedicio, client: f.client_nom,
          description: f.descripcio_operacio, base_cents: f.base_cents, vat_cents: f.quota_cents, total_cents: f.total_cents, paid_on: f.cobrada_el,
        })),
        series: series.filter((s) => s.actiu !== 0).map((s) => ({ id: s.id, code: s.codi, description: s.descripcio, type: s.tipus })),
        clients: clients.map((c) => ({ id: c.id, name: c.nom, has_tax_id: Boolean(c.nif), member_id: c.soci_id })),
      };
    },
  },
  {
    nom: 'create_invoice_draft',
    descripcio:
      'Creates an invoice DRAFT (not issued, can be edited or deleted in the program). Lines are given as parallel arrays: line_concepts, line_quantities (default 1), line_unit_prices_eur (unit price WITHOUT VAT, in euros) and line_vat_rates (0, 4, 5, 10 or 21; default 21). For VAT-exempt or not-subject operations set vat_qualification (E1-E6 exempt, N1-N2 not subject) and exemption_reason. Full invoices (ordinary series) need a client_id with tax ID and address. Returns id and totals in cents. Issue it later with issue_invoice.',
    parametres: {
      type: 'object',
      properties: {
        series_id: { type: 'integer', description: 'Invoice series (see list_invoices).' },
        client_id: { type: 'integer', description: 'Client (see list_invoices). Optional for simplified invoices.' },
        description: { type: 'string', description: 'Description of the operation.' },
        operation_date: pDate('Optional date of the operation if different from issue date'),
        notes: { type: 'string', description: 'Observations printed on the invoice.' },
        line_concepts: { type: 'array', items: { type: 'string' } },
        line_quantities: { type: 'array', items: { type: 'number' } },
        line_unit_prices_eur: { type: 'array', items: { type: 'number' } },
        line_vat_rates: { type: 'array', items: { type: 'integer' } },
        vat_qualification: { type: 'string', enum: ['S1', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'N1', 'N2'], description: 'S1 = subject to VAT (default).' },
        exemption_reason: { type: 'string', description: 'Legal reason for exemption/non-subjection (required if not S1).' },
      },
      required: ['series_id', 'line_concepts', 'line_unit_prices_eur'],
    },
    nivell: 'escriptura',
    modul: 'economia',
    executa: async (a, api) => {
      const conceptes = a.line_concepts as string[];
      const preus = a.line_unit_prices_eur as unknown[];
      if (!conceptes.length || conceptes.length !== preus.length) throw new Error('line_concepts and line_unit_prices_eur must have the same, non-zero length.');
      const qualificacio = a.vat_qualification ?? 'S1';
      const linies = conceptes.map((concepte, i) => ({
        concepte,
        quantitat: Number(a.line_quantities?.[i] ?? 1),
        preu_cents: aCents(preus[i], `line_unit_prices_eur[${i}]`),
        descompte: 0,
        qualificacio,
        tipus_iva: Number(a.line_vat_rates?.[i] ?? 21),
        causa_exempcio: qualificacio === 'S1' ? null : a.exemption_reason,
      }));
      const { id } = await api.post<{ id: number }>('/facturacio/factures', {
        serie_id: a.series_id, client_id: a.client_id, descripcio_operacio: a.description, data_operacio: a.operation_date, observacions: a.notes, linies,
      });
      const f = (await api.get<{ factura: Record<string, any> }>(`/facturacio/factures/${id}`)).factura;
      return { id, status: f.estat, type: f.tipus_factura, client: f.client_nom, base_cents: f.base_cents, vat_cents: f.quota_cents, total_cents: f.total_cents };
    },
  },
  {
    nom: 'issue_invoice',
    descripcio:
      'Issues a draft invoice: assigns the next correlative number of its series, freezes it and generates the chained VERI*FACTU invoicing record sent to the tax agency. This is legally irreversible (it can only be corrected with a corrective invoice). The issue date cannot be in the future nor earlier than the last invoice of the series.',
    parametres: { type: 'object', properties: { invoice_id: { type: 'integer' }, issue_date: pDate('Issue date, defaults to today') }, required: ['invoice_id'] },
    nivell: 'proposta',
    modul: 'economia',
    resum: async (a, api) => {
      const { factura: f, linies } = await api.get<{ factura: Record<string, any>; linies: unknown[] }>(`/facturacio/factures/${Number(a.invoice_id)}`);
      return `Emetre la factura (esborrany #${f.id}, sèrie ${f.serie_codi}) ${f.client_nom ? `a nom de ${f.client_nom} ` : ''}per ${euros(f.total_cents)} (base ${euros(f.base_cents)}, IVA ${euros(f.quota_cents)}, ${linies.length} línies) amb data ${dataCat(a.issue_date || avui())}. És irreversible: es genera el registre VERI*FACTU.`;
    },
    executa: async (a, api) => {
      const r = await api.post<{ num_serie: string }>(`/facturacio/factures/${Number(a.invoice_id)}/emet`, { data_expedicio: a.issue_date || avui() });
      return { invoice_id: Number(a.invoice_id), number: r.num_serie, status: 'emesa' };
    },
  },

  // ----- Inventari -----
  {
    nom: 'list_inventory',
    descripcio:
      'Inventory of the association assets at a date (default today): id, description, category, acquisition date and value, origin (compra = purchase, donacio = donation, cessio = loan), location, condition, useful life, depreciation of the year, accumulated depreciation and net book value (net_cents). Amounts in euro cents.',
    parametres: {
      type: 'object',
      properties: { date: pDate('Reference date, defaults to today'), include_disposed: { type: 'boolean', description: 'Also list disposed items.' }, limit: pLimit },
    },
    nivell: 'lectura',
    modul: 'economia',
    executa: async (a, api) => {
      const r = await api.get<Record<string, any>[]>(`/donatius/inventari${qs({ data: a.date, baixes: a.include_disposed ? 1 : undefined })}`);
      return {
        total: r.length,
        total_value_cents: r.reduce((s, b) => s + (b.valor_adquisicio_cents ?? 0), 0),
        total_net_cents: r.reduce((s, b) => s + (b.net_cents ?? 0), 0),
        items: r.slice(0, limitDe(a)).map(({ foto: _f, motiu_baixa: _m, ...b }) => b),
      };
    },
  },
  {
    nom: 'add_inventory_item',
    descripcio: 'Adds an asset to the inventory (equipment, furniture, computers…). Returns its id.',
    parametres: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        category: { type: 'string', enum: ['equip_so', 'mobiliari', 'informatica', 'material_tallers', 'vestuari', 'altres'], description: 'equip_so = sound equipment, mobiliari = furniture, informatica = IT, material_tallers = workshop material, vestuari = costumes, altres = other.' },
        acquisition_date: pDate('Acquisition date'),
        value_eur: { type: 'number', description: 'Acquisition value in euros.' },
        origin: { type: 'string', enum: ['purchase', 'donation', 'loan'] },
        location: { type: 'string' },
        condition: { type: 'string', enum: ['good', 'fair', 'poor'] },
        useful_life_years: { type: 'integer', description: 'For depreciation (1-100).' },
        movement_id: { type: 'integer', description: 'Purchase movement, if any.' },
        donation_id: { type: 'integer', description: 'Donation it comes from, if any.' },
        notes: { type: 'string' },
      },
      required: ['description', 'acquisition_date'],
    },
    nivell: 'escriptura',
    modul: 'economia',
    executa: async (a, api) => {
      const r = await api.post<{ id: number }>('/donatius/inventari', {
        descripcio: a.description,
        categoria: a.category,
        data_adquisicio: a.acquisition_date,
        valor_adquisicio_cents: a.value_eur === undefined ? 0 : aCents(a.value_eur, 'value_eur'),
        procedencia: mapa({ purchase: 'compra', donation: 'donacio', loan: 'cessio' }, a.origin, 'origin'),
        ubicacio: a.location,
        estat: mapa({ good: 'bo', fair: 'regular', poor: 'dolent' }, a.condition, 'condition'),
        vida_util_anys: a.useful_life_years,
        moviment_id: a.movement_id,
        donatiu_id: a.donation_id,
        notes: a.notes,
      });
      return { id: r.id, description: a.description };
    },
  },

  // ----- Remeses SEPA -----
  {
    nom: 'list_remittances',
    descripcio:
      'SEPA direct-debit remittances: existing remittances (id, reference, collection date, account, number of debits, total_cents, status generada = generated/waiting for the bank, cobrada = collected, returned debits) and the pending fees of the year of members paying by direct debit (fee id, member number and name, amount_cents, eligible, exclusion_reason when it cannot be included, e.g. no active mandate). Bank account numbers and mandates are never shown. earliest_collection_date is the first allowed date for a new remittance.',
    parametres: { type: 'object', properties: { year: pYear, limit: pLimit } },
    nivell: 'lectura',
    modul: 'economia',
    executa: async (a, api) => {
      const [remeses, q] = await Promise.all([
        api.get<Record<string, any>[]>('/tresoreria/remeses'),
        api.get<{ quotes: Record<string, any>[]; data_minima: string }>(`/tresoreria/remeses/quotes?exercici=${any(a)}`),
      ]);
      const limit = limitDe(a);
      const elegibles = q.quotes.filter((x) => !x.motiu);
      return {
        remittances: remeses.slice(0, limit).map((r) => ({
          id: r.id, reference: r.referencia, collection_date: r.data_cobrament, account: r.compte_nom, debits: r.num_operacions, total_cents: r.total_cents,
          status: r.estat, collected_on: r.cobrada_el, returned: r.retornats, created_by: r.usuari,
        })),
        year: any(a),
        earliest_collection_date: q.data_minima,
        eligible_count: elegibles.length,
        eligible_total_cents: elegibles.reduce((s, x) => s + x.import_cents, 0),
        direct_debit_fees: q.quotes.slice(0, limit).map((x) => ({
          fee_id: x.id, member_number: x.num_soci, member: `${x.nom} ${x.llinatges}`.trim(), amount_cents: x.import_cents, eligible: !x.motiu, exclusion_reason: x.motiu,
        })),
      };
    },
  },
  {
    nom: 'generate_remittance',
    descripcio:
      'Generates a SEPA direct-debit remittance (pain.008 file to upload to the bank) for pending fees of members with an active mandate. fee_ids defaults to all eligible fees of the year (see list_remittances). The collection date must be after today. After approval the user downloads the file in the program and uploads it to the bank.',
    parametres: {
      type: 'object',
      properties: {
        year: pYear,
        fee_ids: { type: 'array', items: { type: 'integer' }, description: 'Fees to include. Defaults to all eligible fees of the year.' },
        collection_date: pDate('Date the bank will charge the debits'),
      },
      required: ['collection_date'],
    },
    nivell: 'proposta',
    modul: 'economia',
    resum: async (a, api) => {
      const q = await api.get<{ quotes: Record<string, any>[] }>(`/tresoreria/remeses/quotes?exercici=${any(a)}`);
      const triats = ids(a.fee_ids);
      const llista = triats.length ? q.quotes.filter((x) => triats.includes(x.id)) : q.quotes.filter((x) => !x.motiu);
      const total = llista.reduce((s, x) => s + x.import_cents, 0);
      const excloses = llista.filter((x) => x.motiu).length;
      return `Generar una remesa SEPA de ${llista.length} rebuts de quotes de ${any(a)} (${euros(total)}) amb data de cobrament ${dataCat(a.collection_date)}${excloses ? ` — atenció: ${excloses} quota(es) no es poden remesar` : ''}.`;
    },
    executa: async (a, api) => {
      let triats = ids(a.fee_ids);
      if (!triats.length) {
        const q = await api.get<{ quotes: Record<string, any>[] }>(`/tresoreria/remeses/quotes?exercici=${any(a)}`);
        triats = q.quotes.filter((x) => !x.motiu).map((x) => x.id);
      }
      const { id } = await api.post<{ id: number }>('/tresoreria/remeses', { quota_ids: triats, data_cobrament: a.collection_date });
      const r = (await api.get<Record<string, any>[]>('/tresoreria/remeses')).find((x) => x.id === id);
      return { remittance_id: id, reference: r?.referencia, debits: r?.num_operacions, total_cents: r?.total_cents, collection_date: r?.data_cobrament };
    },
  },
];
