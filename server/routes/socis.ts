import { Router } from 'express';
import type { Request } from 'express';
import { all, get, run, tx } from '../db.ts';
import {
  HttpError, bool, data, dataObligatoria, enter, idParam, notFound, sendCsv, text, textObligatori, toCsv, columnesTraduides,
} from '../util.ts';

import { registra } from '../auditoria.ts';
import { usuariDe } from './auth.ts';
import { idiomaDe, tradueix } from '../i18n.ts';
import { avui } from '../../shared/dates.ts';
import { ibanValid, netejaIban } from '../../shared/iban.ts';

export const socisRouter = Router();

// ---------- Validació ----------

/** Comprova la lletra de control d'un DNI o NIE espanyol. Altres documents (passaports…) s'accepten tal qual. */
export function validaDni(dni: string | null) {
  if (!dni) return null;
  const net = dni.replace(/[\s.-]/g, '').toUpperCase();
  const m = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(net);
  if (!m) return net;
  const num = Number(({ X: '0', Y: '1', Z: '2' }[m[1]] ?? '') + m[2]);
  if ('TRWAGMYFPDXBNJZSQVHLCKE'[num % 23] !== m[3]) throw new HttpError(400, 'La lletra del DNI/NIE no és correcta.');
  return net;
}

/** IBAN opcional: es valida (dígits de control) i es desa sense espais. */
export function validaIban(iban: string | null) {
  if (!iban) return null;
  if (!ibanValid(iban)) throw new HttpError(400, "L'IBAN no és vàlid: revisa'n els dígits (el codi de control no quadra).");
  return netejaIban(iban);
}

/** Edat en anys complerts en una data (per defecte, avui). */
export function edatA(naixement: string | null, ref: string = avui()) {
  if (!naixement) return null;
  const [a, m, d] = naixement.split('-').map(Number);
  const [ra, rm, rd] = ref.split('-').map(Number);
  return ra - a - (rm < m || (rm === m && rd < d) ? 1 : 0);
}

/** Accepta AAAA-MM-DD i DD/MM/AAAA (també amb guions o punts). Torna AAAA-MM-DD o llança un error. */
export function normalitzaData(v: unknown): string | null {
  const s = text(v);
  if (!s) return null;
  let a: number, m: number, d: number;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s);
  if (r) [a, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) [d, m, a] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else throw new Error('format');
  const dt = new Date(a, m - 1, d);
  if (dt.getFullYear() !== a || dt.getMonth() !== m - 1 || dt.getDate() !== d || a < 1900) throw new Error('data');
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Condició SQL (sobre l'àlies «s») de soci actiu: admès i sense baixa vigent. */
export const ACTIU = "(s.estat_admissio = 'admesa' AND (s.data_baixa IS NULL OR s.data_baixa > date('now', 'localtime')))";

/**
 * Condició SQL (àlies «s») de dret a vot: soci actiu, de categoria amb vot (sense categoria = amb vot)
 * i major d'edat (els menors de 18 anys mai voten). La poden fer servir altres mòduls (quòrum, assemblees).
 */
export const TE_VOT = `(${ACTIU} AND COALESCE((SELECT c.te_vot FROM categories_soci c WHERE c.id = s.categoria_id), 1) = 1
  AND (s.data_naixement IS NULL OR s.data_naixement <= date('now', 'localtime', '-18 years')))`;

const GENERES = ['dona', 'home', 'altre', 'nc'];
export const MOTIUS_BAIXA = ['voluntaria', 'impagament', 'expulsio', 'defuncio', 'altres'] as const;
const NOM_MOTIU: Record<string, string> = {
  voluntaria: 'Baixa voluntària', impagament: 'Impagament de quotes', expulsio: 'Expulsió', defuncio: 'Defunció', altres: 'Altres',
};

function categoriaValida(v: unknown) {
  const id = enter(v, 'Categoria');
  if (id !== null && !get('SELECT 1 FROM categories_soci WHERE id = ?', id)) throw new HttpError(400, 'La categoria no existeix.');
  return id;
}

function llegirSoci(body: Request['body']) {
  const genere = text(body.genere);
  if (genere && !GENERES.includes(genere)) throw new HttpError(400, 'Gènere no vàlid.');
  const email = text(body.email);
  if (email && !EMAIL_RE.test(email)) throw new HttpError(400, 'El correu electrònic no és vàlid.');
  // Menors de 14 anys: el consentiment l'han de donar els pares o tutors (art. 7 LOPDGDD).
  const edat = edatA(data(body.data_naixement, 'Data de naixement'));
  const consentiment = bool(body.consentiment_dades);
  let signant = text(body.consentiment_signant);
  if (signant && signant !== 'soci' && signant !== 'tutor') throw new HttpError(400, 'Signant del consentiment no vàlid.');
  if (edat !== null && edat < 14) {
    if (consentiment && !text(body.tutor_legal))
      throw new HttpError(400, 'És menor de 14 anys: cal indicar el pare, la mare o el tutor legal que signa el consentiment.');
    if (consentiment) signant = 'tutor';
  }
  return {
    num_soci: enter(body.num_soci, 'Núm. de soci'),
    nom: textObligatori(body.nom, 'Nom'),
    llinatges: text(body.llinatges) ?? '',
    dni: validaDni(text(body.dni)),
    data_naixement: data(body.data_naixement, 'Data de naixement'),
    genere,
    adreca: text(body.adreca),
    codi_postal: text(body.codi_postal),
    poblacio: text(body.poblacio),
    telefon: text(body.telefon),
    email,
    data_alta: dataObligatoria(body.data_alta, "Data d'alta"),
    tipus_quota_id: enter(body.tipus_quota_id, 'Tipus de quota'),
    categoria_id: categoriaValida(body.categoria_id),
    iban: validaIban(text(body.iban)),
    tutor_legal: text(body.tutor_legal),
    consentiment_dades: consentiment,
    consentiment_data: consentiment ? (data(body.consentiment_data, 'Data del consentiment') ?? avui()) : null,
    consentiment_signant: consentiment ? (signant ?? 'soci') : null,
    drets_imatge: bool(body.drets_imatge),
    accepta_comunicacions: bool(body.accepta_comunicacions ?? 1),
    notes: text(body.notes),
  };
}

const FOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/** Desa (o elimina, si arriba buida) la foto del soci, si el cos de la petició la inclou. */
function desaFoto(sociId: number, body: Request['body']) {
  if (!('foto' in body)) return;
  const foto = text(body.foto);
  if (!foto) {
    run('DELETE FROM socis_fotos WHERE soci_id = ?', sociId);
    return;
  }
  if (!FOTO_RE.test(foto)) throw new HttpError(400, 'La foto no és una imatge vàlida.');
  if (foto.length > 1_500_000) throw new HttpError(400, 'La foto és massa gran.');
  run(
    'INSERT INTO socis_fotos (soci_id, foto) VALUES (?, ?) ON CONFLICT(soci_id) DO UPDATE SET foto = excluded.foto',
    sociId, foto,
  );
}

// Camps que es desen des del formulari. La data de baixa i el motiu es gestionen amb «Donar de baixa».
const CAMPS = [
  'num_soci', 'nom', 'llinatges', 'dni', 'data_naixement', 'genere', 'adreca', 'codi_postal', 'poblacio',
  'telefon', 'email', 'data_alta', 'tipus_quota_id', 'categoria_id', 'iban', 'tutor_legal',
  'consentiment_dades', 'consentiment_data', 'consentiment_signant', 'drets_imatge', 'accepta_comunicacions', 'notes',
] as const;

const seguentNumero = () => get<{ n: number }>('SELECT COALESCE(MAX(num_soci), 0) + 1 AS n FROM socis')!.n;

// ---------- Llistat ----------

function llistat(estat: string, q: string | null, etiqueta: number | null = null, categoria: string | null = null) {
  const where: string[] = [];
  const params: Record<string, string | number> = { exercici: new Date().getFullYear() };
  if (estat === 'actius') where.push(ACTIU);
  else if (estat === 'baixes') where.push(`s.estat_admissio = 'admesa' AND NOT ${ACTIU}`);
  else if (estat === 'sollicituds') where.push("s.estat_admissio = 'sollicitada'");
  else if (estat === 'denegades') where.push("s.estat_admissio = 'denegada'");
  else where.push("s.estat_admissio = 'admesa'");
  if (etiqueta) {
    where.push('EXISTS (SELECT 1 FROM socis_etiquetes se WHERE se.soci_id = s.id AND se.etiqueta_id = $etiqueta)');
    params.etiqueta = etiqueta;
  }
  if (categoria === 'cap') where.push('s.categoria_id IS NULL');
  else if (categoria && Number(categoria)) {
    where.push('s.categoria_id = $categoria');
    params.categoria = Number(categoria);
  }
  if (q) {
    where.push(`(s.nom || ' ' || s.llinatges LIKE $q OR s.dni LIKE $q OR s.email LIKE $q OR s.telefon LIKE $q OR CAST(s.num_soci AS TEXT) = $qexacte)`);
    params.q = `%${q}%`;
    params.qexacte = q;
  }
  return all(
    `SELECT s.*, t.nom AS tipus_quota_nom, qu.estat AS quota_estat, c.nom AS categoria_nom,
            CASE WHEN ${TE_VOT} THEN 1 ELSE 0 END AS te_vot,
            (SELECT GROUP_CONCAT(etiqueta_id) FROM socis_etiquetes WHERE soci_id = s.id) AS etiquetes
       FROM socis s
       LEFT JOIN tipus_quota t ON t.id = s.tipus_quota_id
       LEFT JOIN categories_soci c ON c.id = s.categoria_id
       LEFT JOIN quotes qu ON qu.soci_id = s.id AND qu.exercici = $exercici
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY s.num_soci`,
    params,
  );
}

socisRouter.get('/', (req, res) => {
  res.json(llistat(String(req.query.estat ?? 'actius'), text(req.query.q), enter(req.query.etiqueta, 'Etiqueta'), text(req.query.categoria)));
});

socisRouter.get('/export.csv', (req, res) => {
  const rows = llistat(String(req.query.estat ?? 'tots'), null);
  const csv = toCsv(rows, columnesTraduides(req, [
    ['num_soci', 'Núm.'], ['nom', 'Nom'], ['llinatges', 'Llinatges'], ['dni', 'DNI/NIE'],
    ['data_naixement', 'Data naixement'], ['genere', 'Gènere'], ['adreca', 'Adreça'],
    ['codi_postal', 'CP'], ['poblacio', 'Població'], ['telefon', 'Telèfon'], ['email', 'Correu'],
    ['data_alta', 'Data alta'], ['data_baixa', 'Data baixa'], ['motiu_baixa', 'Motiu baixa'],
    ['categoria_nom', 'Categoria'], ['te_vot', 'Dret a vot'],
    ['tipus_quota_nom', 'Tipus quota'], ['iban', 'IBAN'], ['tutor_legal', 'Tutor/a legal'],
    ['consentiment_dades', 'Consentiment dades'], ['drets_imatge', "Drets d'imatge"], ['notes', 'Notes'],
  ]));
  registra(req, 'exporta', 'soci', null, `Exportació CSV del llistat (${rows.length} socis)`);
  sendCsv(res, 'socis.csv', csv);
});

socisRouter.get('/seguent-numero', (_req, res) => {
  res.json({ num_soci: seguentNumero() });
});

// ---------- Categories de soci ----------

socisRouter.get('/categories', (_req, res) => {
  res.json(
    all(
      `SELECT c.*, (SELECT COUNT(*) FROM socis s WHERE s.categoria_id = c.id) AS socis,
              (SELECT COUNT(*) FROM socis s WHERE s.categoria_id = c.id AND ${ACTIU}) AS actius
         FROM categories_soci c ORDER BY c.id`,
    ),
  );
});

function llegirCategoria(body: Request['body']) {
  return {
    nom: textObligatori(body.nom, 'Nom'),
    te_vot: bool(body.te_vot),
    paga_quota: bool(body.paga_quota),
    descripcio: text(body.descripcio),
  };
}

socisRouter.post('/categories', (req, res) => {
  const c = llegirCategoria(req.body);
  if (get('SELECT 1 FROM categories_soci WHERE nom = ? COLLATE NOCASE', c.nom)) throw new HttpError(409, 'Ja hi ha una categoria amb aquest nom.');
  const { id } = run('INSERT INTO categories_soci (nom, te_vot, paga_quota, descripcio) VALUES ($nom, $te_vot, $paga_quota, $descripcio)', c);
  registra(req, 'crea', 'categoria_soci', id, `Categoria de soci «${c.nom}»`);
  res.status(201).json(get('SELECT * FROM categories_soci WHERE id = ?', id));
});

socisRouter.put('/categories/:id', (req, res) => {
  const id = idParam(req);
  const c = llegirCategoria(req.body);
  if (get('SELECT 1 FROM categories_soci WHERE nom = ? COLLATE NOCASE AND id <> ?', c.nom, id))
    throw new HttpError(409, 'Ja hi ha una categoria amb aquest nom.');
  const { changes } = run(
    'UPDATE categories_soci SET nom = $nom, te_vot = $te_vot, paga_quota = $paga_quota, descripcio = $descripcio WHERE id = $id',
    { ...c, id },
  );
  if (!changes) notFound();
  registra(req, 'modifica', 'categoria_soci', id, `Categoria de soci «${c.nom}»`);
  res.json(get('SELECT * FROM categories_soci WHERE id = ?', id));
});

socisRouter.delete('/categories/:id', (req, res) => {
  const id = idParam(req);
  const c = get<{ nom: string }>('SELECT nom FROM categories_soci WHERE id = ?', id) ?? notFound();
  const n = get<{ n: number }>('SELECT COUNT(*) AS n FROM socis WHERE categoria_id = ?', id)!.n;
  if (n) throw new HttpError(409, `No es pot eliminar: hi ha ${n} socis d'aquesta categoria.`);
  run('DELETE FROM categories_soci WHERE id = ?', id);
  registra(req, 'elimina', 'categoria_soci', id, `Categoria de soci «${c.nom}»`);
  res.status(204).end();
});

// ---------- Llibre registre de socis (art. 14 LO 1/2002) ----------

interface FilaLlibre {
  id: number;
  num_soci: number;
  nom: string;
  llinatges: string;
  dni: string | null;
  categoria_nom: string | null;
  anonimitzat: number;
  periodes: {
    data_alta: string; data_baixa: string | null; motiu_tipus: string | null; motiu: string | null; acord: string | null; acord_baixa: string | null;
  }[];
}

/** Tots els socis que han estat admesos mai, amb els seus períodes; opcionalment, tal com estava en una data. */
export function llibreRegistre(aData: string | null): FilaLlibre[] {
  const socis = all<Omit<FilaLlibre, 'periodes'>>(
    `SELECT s.id, s.num_soci, s.nom, s.llinatges, s.dni, c.nom AS categoria_nom,
            CASE WHEN s.anonimitzat_el IS NOT NULL THEN 1 ELSE 0 END AS anonimitzat
       FROM socis s LEFT JOIN categories_soci c ON c.id = s.categoria_id
      WHERE s.estat_admissio = 'admesa' ORDER BY s.num_soci`,
  );
  const periodes = all<FilaLlibre['periodes'][number] & { soci_id: number }>(
    `SELECT soci_id, data_alta, data_baixa, motiu_tipus, motiu, acord, acord_baixa FROM socis_periodes
      ${aData ? 'WHERE data_alta <= $a' : ''} ORDER BY data_alta, id`,
    ...(aData ? [{ a: aData }] : []),
  );
  const perSoci = new Map<number, FilaLlibre['periodes']>();
  for (const { soci_id, ...p } of periodes) {
    // En una data passada, una baixa posterior encara no s'havia produït.
    const vist = aData && p.data_baixa && p.data_baixa > aData ? { ...p, data_baixa: null, motiu_tipus: null, motiu: null, acord_baixa: null } : p;
    perSoci.set(soci_id, [...(perSoci.get(soci_id) ?? []), vist]);
  }
  return socis
    .filter((s) => perSoci.has(s.id))
    .map((s) => {
      const periodesSoci = perSoci.get(s.id)!;
      return s.anonimitzat
        ? { ...s, nom: 'Persona anonimitzada', llinatges: '', dni: null, periodes: periodesSoci.map((p) => ({ ...p, motiu: null })) }
        : { ...s, periodes: periodesSoci };
    });
}

socisRouter.get('/llibre-registre', (req, res) => {
  const aData = data(req.query.a_data, 'A data de');
  const files = llibreRegistre(aData);
  registra(req, 'exporta', 'soci', null, `Llibre registre de socis${aData ? ` a ${aData}` : ''} (${files.length} socis)`);
  res.json({ a_data: aData, generat: avui(), socis: files });
});

// ---------- Importació des d'un full de càlcul ----------

const MAX_IMPORTACIO = 5000;

interface ResultatFila {
  fila: number;
  nom: string;
  num_soci: number | null;
  errors: string[];
  avisos: string[];
}

const GENERES_IMPORT: Record<string, string> = {
  dona: 'dona', d: 'dona', f: 'dona', mujer: 'dona', woman: 'dona', female: 'dona', femeni: 'dona', 'femení': 'dona', femenino: 'dona',
  home: 'home', h: 'home', m: 'home', hombre: 'home', man: 'home', male: 'home', masculi: 'home', 'masculí': 'home', masculino: 'home',
  altre: 'altre', otro: 'altre', other: 'altre', nc: 'nc',
};

/**
 * Valida (i, si `confirma`, insereix) les files d'un full de càlcul ja associades als camps del soci.
 * Torna el resultat de cada fila amb errors (no s'importa) i avisos (s'importa igualment).
 */
export function importaSocis(req: Request, filesBrutes: unknown, confirma: boolean) {
  if (!Array.isArray(filesBrutes) || filesBrutes.length === 0) throw new HttpError(400, 'No hi ha cap fila per importar.');
  if (filesBrutes.length > MAX_IMPORTACIO) throw new HttpError(400, `Com a màxim es poden importar ${MAX_IMPORTACIO} files de cop.`);
  const idioma = idiomaDe(req);
  const tr = (s: string) => tradueix(s, idioma);

  const categories = all<{ id: number; nom: string }>('SELECT id, nom FROM categories_soci');
  const tipusQuota = all<{ id: number; nom: string }>('SELECT id, nom FROM tipus_quota');
  const dnisDb = new Set(all<{ dni: string }>('SELECT dni FROM socis WHERE dni IS NOT NULL').map((r) => r.dni.toUpperCase()));
  const numsDb = new Set(all<{ num_soci: number }>('SELECT num_soci FROM socis').map((r) => r.num_soci));
  const dnisFitxer = new Map<string, number>();
  const numsFitxer = new Map<number, number>();

  const preparades: { resultat: ResultatFila; valors: Record<string, unknown> }[] = filesBrutes.map((brut, i) => {
    const f = (brut && typeof brut === 'object' ? brut : {}) as Record<string, unknown>;
    const fila = Number.isInteger(f._fila) ? Number(f._fila) : i + 2; // la fila 1 és la capçalera
    const errors: string[] = [];
    const avisos: string[] = [];
    const camp = (k: string) => text(f[k]);
    const dataCamp = (k: string, nom: string) => {
      try {
        return normalitzaData(f[k]);
      } catch {
        errors.push(`${nom} no vàlida: «${camp(k)}» (format DD/MM/AAAA o AAAA-MM-DD).`);
        return null;
      }
    };

    const nom = camp('nom');
    if (!nom) errors.push('Falta el nom.');
    const naixement = dataCamp('data_naixement', 'Data de naixement');
    let alta = dataCamp('data_alta', "Data d'alta");
    if (!alta && !camp('data_alta')) {
      alta = avui();
      avisos.push("Sense data d'alta: s'hi posa la d'avui.");
    }
    if (naixement && naixement > avui()) errors.push('La data de naixement és posterior a avui.');

    const email = camp('email');
    if (email && !EMAIL_RE.test(email)) errors.push(`Correu electrònic no vàlid: «${email}».`);

    let dni: string | null = null;
    try {
      dni = validaDni(camp('dni'));
    } catch {
      errors.push(`La lletra del DNI/NIE no és correcta: «${camp('dni')}».`);
    }
    if (dni) {
      if (dnisDb.has(dni)) errors.push(`Ja hi ha un soci amb el DNI/NIE ${dni}.`);
      const previa = dnisFitxer.get(dni);
      if (previa) errors.push(`DNI/NIE repetit al fitxer (també a la fila ${previa}).`);
      else dnisFitxer.set(dni, fila);
    }

    let iban: string | null = null;
    if (camp('iban')) {
      if (ibanValid(camp('iban')!)) iban = netejaIban(camp('iban')!);
      else errors.push(`IBAN no vàlid: «${camp('iban')}».`);
    }

    let numSoci: number | null = null;
    if (camp('num_soci')) {
      const n = Number(camp('num_soci'));
      if (!Number.isInteger(n) || n <= 0) errors.push(`Número de soci no vàlid: «${camp('num_soci')}».`);
      else {
        numSoci = n;
        if (numsDb.has(n)) errors.push(`Ja hi ha un soci amb el número ${n}.`);
        const previa = numsFitxer.get(n);
        if (previa) errors.push(`Número de soci repetit al fitxer (també a la fila ${previa}).`);
        else numsFitxer.set(n, fila);
      }
    }

    let genere: string | null = null;
    if (camp('genere')) {
      genere = GENERES_IMPORT[camp('genere')!.toLowerCase()] ?? null;
      if (!genere) avisos.push(`Gènere «${camp('genere')}» no reconegut: es deixa en blanc.`);
    }

    let categoriaId: number | null = null;
    if (camp('categoria')) {
      const v = camp('categoria')!.toLowerCase();
      categoriaId = categories.find((c) => c.nom.toLowerCase() === v || String(c.id) === v)?.id ?? null;
      if (!categoriaId) avisos.push(`Categoria «${camp('categoria')}» desconeguda: es deixa sense categoria.`);
    }
    let quotaId: number | null = null;
    if (camp('tipus_quota')) {
      const v = camp('tipus_quota')!.toLowerCase();
      quotaId = tipusQuota.find((q) => q.nom.toLowerCase() === v || q.nom.toLowerCase().startsWith(v))?.id ?? null;
      if (!quotaId) avisos.push(`Tipus de quota «${camp('tipus_quota')}» desconegut: es deixa en blanc.`);
    }

    const edat = edatA(naixement);
    if (edat !== null && edat < 18 && !camp('tutor_legal')) avisos.push('És menor d’edat i no consta el tutor legal.');

    return {
      resultat: { fila, nom: [nom, camp('llinatges')].filter(Boolean).join(' '), num_soci: numSoci, errors, avisos },
      valors: {
        num_soci: numSoci, nom, llinatges: camp('llinatges') ?? '', dni, data_naixement: naixement, genere,
        adreca: camp('adreca'), codi_postal: camp('codi_postal'), poblacio: camp('poblacio'), telefon: camp('telefon'),
        email, data_alta: alta, tipus_quota_id: quotaId, categoria_id: categoriaId, iban, tutor_legal: camp('tutor_legal'),
        notes: camp('notes'),
      },
    };
  });

  // Números per a les files vàlides que no en porten.
  let seguent = Math.max(seguentNumero(), ...[...numsFitxer.keys()].map((n) => n + 1));
  for (const p of preparades) {
    if (p.resultat.errors.length || p.valors.num_soci !== null) continue;
    p.valors.num_soci = p.resultat.num_soci = seguent++;
    p.resultat.avisos.push(`S'hi assigna el número de soci ${p.resultat.num_soci}.`);
  }

  const valides = preparades.filter((p) => !p.resultat.errors.length);
  let importats = 0;
  if (confirma && valides.length) {
    const camps = Object.keys(valides[0].valors);
    tx(() => {
      for (const p of valides) {
        // El consentiment RGPD d'aquestes persones no consta: es deixa buit perquè els avisos ho recordin.
        run(`INSERT INTO socis (${camps.join(', ')}) VALUES (${camps.map((c) => '$' + c).join(', ')})`, p.valors);
        importats++;
      }
      const nums = valides.map((p) => p.valors.num_soci);
      registra(req, 'crea', 'soci', null, `Importació de ${importats} socis des d'un full de càlcul (núms. ${nums[0]}–${nums[nums.length - 1]})`);
    });
  }
  return {
    files: preparades.map((p) => ({ ...p.resultat, errors: p.resultat.errors.map(tr), avisos: p.resultat.avisos.map(tr) })),
    valides: valides.length,
    amb_errors: preparades.length - valides.length,
    importats,
  };
}

socisRouter.post('/importa', (req, res) => {
  res.json(importaSocis(req, req.body?.files, req.body?.confirma === true));
});

// ---------- Fitxa ----------

socisRouter.get('/:id', (req, res) => {
  const id = idParam(req);
  const soci = get(
    `SELECT s.*, c.nom AS categoria_nom, c.te_vot AS categoria_te_vot, CASE WHEN ${TE_VOT} THEN 1 ELSE 0 END AS te_vot
       FROM socis s LEFT JOIN categories_soci c ON c.id = s.categoria_id WHERE s.id = ?`,
    id,
  ) ?? notFound();
  const quotes = all('SELECT * FROM quotes WHERE soci_id = ? ORDER BY exercici DESC', id);
  const moviments = all(
    `SELECT m.*, c.nom AS categoria_nom FROM moviments m
       LEFT JOIN categories c ON c.id = m.categoria_id
      WHERE m.soci_id = ? ORDER BY m.data DESC`,
    id,
  );
  const foto = get<{ foto: string }>('SELECT foto FROM socis_fotos WHERE soci_id = ?', id)?.foto ?? null;
  const etiquetes = all<{ etiqueta_id: number }>('SELECT etiqueta_id FROM socis_etiquetes WHERE soci_id = ?', id).map((e) => e.etiqueta_id);
  const periodes = all('SELECT * FROM socis_periodes WHERE soci_id = ? ORDER BY data_alta, id', id);
  res.json({ soci, quotes, moviments, foto, etiquetes, periodes });
});

socisRouter.post('/', (req, res) => {
  const s = llegirSoci(req.body);
  const sollicitud = bool(req.body.sollicitud) === 1;
  if (s.num_soci === null) s.num_soci = seguentNumero();
  const id = tx(() => {
    const valors = {
      ...s,
      estat_admissio: sollicitud ? 'sollicitada' : 'admesa',
      // Una sol·licitud no compta com a sòcia activa fins que s'admet (vegeu server/esquema/socis.ts).
      data_baixa: sollicitud ? s.data_alta : null,
      data_admissio: sollicitud ? null : s.data_alta,
    };
    const camps = Object.keys(valors);
    const { id } = run(`INSERT INTO socis (${camps.join(', ')}) VALUES (${camps.map((c) => '$' + c).join(', ')})`, valors);
    desaFoto(id, req.body);
    registra(req, 'crea', 'soci', id, sollicitud ? `Sol·licitud d'admissió (núm. ${s.num_soci})` : `Alta del soci núm. ${s.num_soci}`);
    return id;
  });
  res.status(201).json(get('SELECT * FROM socis WHERE id = ?', id));
});

socisRouter.put('/:id', (req, res) => {
  const id = idParam(req);
  const s = llegirSoci(req.body);
  if (s.num_soci === null) throw new HttpError(400, 'El número de soci és obligatori.');
  const abans = get<Record<string, unknown>>('SELECT * FROM socis WHERE id = ?', id) ?? notFound();
  if (abans.anonimitzat_el) throw new HttpError(409, 'Aquest soci està anonimitzat: les seves dades no es poden modificar.');
  tx(() => {
    run(`UPDATE socis SET ${CAMPS.map((c) => `${c} = $${c}`).join(', ')} WHERE id = $id`, { ...s, id });
    // Mentre no és admesa, el període és de durada zero.
    if (abans.estat_admissio !== 'admesa') run('UPDATE socis SET data_baixa = data_alta WHERE id = ?', id);
    else if (abans.data_baixa && String(abans.data_baixa) < s.data_alta)
      throw new HttpError(400, "La data d'alta no pot ser posterior a la de baixa.");
    desaFoto(id, req.body);
    const canviats: string[] = CAMPS.filter((c) => String(abans[c] ?? '') !== String((s as Record<string, unknown>)[c] ?? ''));
    if ('foto' in req.body) canviats.push('foto');
    if (canviats.length) registra(req, 'modifica', 'soci', id, `Camps: ${canviats.join(', ')}`);
  });
  res.json(get('SELECT * FROM socis WHERE id = ?', id));
});

// ---------- Baixa, readmissió i admissió ----------

type SociEstat = { id: number; num_soci: number; estat_admissio: string; data_alta: string; data_baixa: string | null; anonimitzat_el: string | null };
const sociEstat = (id: number) =>
  get<SociEstat>('SELECT id, num_soci, estat_admissio, data_alta, data_baixa, anonimitzat_el FROM socis WHERE id = ?', id) ?? notFound();
const periodeActual = (id: number) =>
  get<{ id: number; data_alta: string; data_baixa: string | null; motiu_tipus: string | null }>(
    'SELECT id, data_alta, data_baixa, motiu_tipus FROM socis_periodes WHERE soci_id = ? ORDER BY id DESC LIMIT 1', id,
  );

/** Dona de baixa el soci (o corregeix la baixa del període actual). */
export function donaDeBaixa(req: Request, id: number, body: Record<string, unknown>) {
  const s = sociEstat(id);
  if (s.estat_admissio !== 'admesa') throw new HttpError(409, 'Només es poden donar de baixa els socis admesos.');
  if (s.anonimitzat_el) throw new HttpError(409, 'Aquest soci està anonimitzat: les seves dades no es poden modificar.');
  const dataBaixa = dataObligatoria(body.data_baixa, 'Data de baixa');
  const tipus = text(body.motiu_tipus);
  if (!tipus || !(MOTIUS_BAIXA as readonly string[]).includes(tipus)) throw new HttpError(400, 'Cal indicar el motiu de la baixa.');
  const motiu = text(body.motiu);
  const acord = text(body.acord);
  if (tipus === 'expulsio' && !acord) throw new HttpError(400, "Per a una expulsió cal indicar l'acord de l'òrgan que la va decidir.");
  if (dataBaixa < s.data_alta) throw new HttpError(400, "La data de baixa no pot ser anterior a la d'alta.");
  tx(() => {
    const p = periodeActual(id);
    if (p) run('UPDATE socis_periodes SET data_baixa = ?, motiu_tipus = ?, motiu = ?, acord_baixa = ? WHERE id = ?', dataBaixa, tipus, motiu, acord, p.id);
    else run('INSERT INTO socis_periodes (soci_id, data_alta, data_baixa, motiu_tipus, motiu, acord_baixa) VALUES (?, ?, ?, ?, ?, ?)', id, s.data_alta, dataBaixa, tipus, motiu, acord);
    run('UPDATE socis SET data_baixa = ?, motiu_baixa = ? WHERE id = ?', dataBaixa, motiu ?? NOM_MOTIU[tipus], id);
    registra(req, 'modifica', 'soci', id,
      `${s.data_baixa ? 'Correcció de la baixa' : 'Baixa'} del soci núm. ${s.num_soci} el ${dataBaixa} (${NOM_MOTIU[tipus]}${acord ? `; acord: ${acord}` : ''})`);
  });
}

/** Readmet un soci de baixa: obre un període nou i conserva els anteriors. */
export function readmet(req: Request, id: number, body: Record<string, unknown>) {
  const s = sociEstat(id);
  if (s.estat_admissio !== 'admesa') throw new HttpError(409, 'Només es poden readmetre persones que ja havien estat sòcies.');
  if (s.anonimitzat_el) throw new HttpError(409, "Un soci anonimitzat no es pot readmetre: dona'l d'alta com a soci nou.");
  if (!s.data_baixa) throw new HttpError(409, 'Aquest soci no està de baixa.');
  if (periodeActual(id)?.motiu_tipus === 'defuncio') throw new HttpError(409, 'Aquest soci consta com a difunt: no es pot readmetre.');
  const alta = dataObligatoria(body.data_alta, "Data d'alta");
  if (alta < s.data_baixa) throw new HttpError(400, 'La data de readmissió no pot ser anterior a la darrera baixa.');
  const acord = text(body.acord);
  tx(() => {
    run('INSERT INTO socis_periodes (soci_id, data_alta, acord) VALUES (?, ?, ?)', id, alta, acord);
    run('UPDATE socis SET data_alta = ?, data_baixa = NULL, motiu_baixa = NULL WHERE id = ?', alta, id);
    registra(req, 'modifica', 'soci', id, `Readmissió del soci núm. ${s.num_soci} el ${alta}${acord ? ` (acord: ${acord})` : ''}`);
  });
}

socisRouter.post('/:id/baixa', (req, res) => {
  const id = idParam(req);
  donaDeBaixa(req, id, req.body ?? {});
  res.json(get('SELECT * FROM socis WHERE id = ?', id));
});

socisRouter.post('/:id/readmissio', (req, res) => {
  const id = idParam(req);
  readmet(req, id, req.body ?? {});
  res.json(get('SELECT * FROM socis WHERE id = ?', id));
});

socisRouter.post('/:id/admet', (req, res) => {
  const id = idParam(req);
  const s = sociEstat(id);
  if (s.estat_admissio !== 'sollicitada') throw new HttpError(409, "Aquesta sol·licitud d'admissió ja està resolta.");
  const dataAdm = data(req.body.data, "Data d'admissió") ?? avui();
  const acord = text(req.body.acord);
  tx(() => {
    run(
      "UPDATE socis SET estat_admissio = 'admesa', data_admissio = ?, acord_admissio = ?, data_alta = ?, data_baixa = NULL, motiu_baixa = NULL WHERE id = ?",
      dataAdm, acord, dataAdm, id,
    );
    run('INSERT INTO socis_periodes (soci_id, data_alta, acord) VALUES (?, ?, ?)', id, dataAdm, acord);
    registra(req, 'modifica', 'soci', id, `Admissió del soci núm. ${s.num_soci} el ${dataAdm}${acord ? ` (acord: ${acord})` : ''}`);
  });
  res.json(get('SELECT * FROM socis WHERE id = ?', id));
});

socisRouter.post('/:id/denega', (req, res) => {
  const id = idParam(req);
  const s = sociEstat(id);
  if (s.estat_admissio !== 'sollicitada') throw new HttpError(409, "Aquesta sol·licitud d'admissió ja està resolta.");
  const dataRes = data(req.body.data, 'Data de resolució') ?? avui();
  const acord = text(req.body.acord);
  run("UPDATE socis SET estat_admissio = 'denegada', data_admissio = ?, acord_admissio = ? WHERE id = ?", dataRes, acord, id);
  registra(req, 'modifica', 'soci', id, `Sol·licitud d'admissió (núm. ${s.num_soci}) denegada el ${dataRes}${acord ? ` (acord: ${acord})` : ''}`);
  res.json(get('SELECT * FROM socis WHERE id = ?', id));
});

// ---------- Eliminació (només registres sense historial) ----------

// Taules que pengen d'un soci però no en formen l'historial (s'esborren amb ell).
const NO_HISTORIAL = new Set(['socis_fotos', 'socis_etiquetes', 'socis_periodes']);

/** Llista de taules (i nombre de registres) que vinculen el soci: si n'hi ha cap, forma part de l'historial. */
export function historialSoci(id: number): { taula: string; n: number }[] {
  const fks = all<{ taula: string; columna: string }>(
    `SELECT m.name AS taula, f."from" AS columna FROM sqlite_master m, pragma_foreign_key_list(m.name) f
      WHERE m.type = 'table' AND f."table" = 'socis'`,
  );
  const resultat: { taula: string; n: number }[] = [];
  for (const { taula, columna } of fks) {
    if (NO_HISTORIAL.has(taula)) continue;
    const n = get<{ n: number }>(`SELECT COUNT(*) AS n FROM "${taula}" WHERE "${columna}" = ?`, id)!.n;
    if (n) resultat.push({ taula, n });
  }
  const periodes = get<{ n: number; baixes: number }>(
    'SELECT COUNT(*) AS n, COUNT(data_baixa) AS baixes FROM socis_periodes WHERE soci_id = ?', id,
  )!;
  if (periodes.n > 1 || periodes.baixes) resultat.push({ taula: 'socis_periodes', n: periodes.n });
  return resultat;
}

socisRouter.delete('/:id', (req, res) => {
  const id = idParam(req);
  const s = get<{ num_soci: number; estat_admissio: string }>('SELECT num_soci, estat_admissio FROM socis WHERE id = ?', id) ?? notFound();
  if (usuariDe(req)?.rol !== 'admin')
    throw new HttpError(403, 'Només un administrador pot eliminar un registre del llibre de socis.');
  if (historialSoci(id).length)
    throw new HttpError(409,
      "Aquest soci té historial (quotes, moviments, activitats, contactes o períodes anteriors) i el llibre registre no el pot perdre. Fes servir «Donar de baixa» o, si cal esborrar-ne les dades personals, Protecció de dades → anonimitzar.");
  tx(() => {
    run('DELETE FROM socis WHERE id = ?', id);
    registra(req, 'elimina', 'soci', id, `Eliminat el registre del soci núm. ${s.num_soci} (sense historial; ${s.estat_admissio})`);
  });
  res.status(204).end();
});
