import { Router } from 'express';
import type { Request } from 'express';
import QRCode from 'qrcode';
import { all, get, getConfig, run, setConfig, tx } from '../db.ts';
import { HttpError, data, enter, idParam, notFound, text, textObligatori } from '../util.ts';
import { autor } from './auth.ts';
import { registra } from '../auditoria.ts';
import {
  QUALIFICACIONS, SISTEMA, calcula, emissor, registreAlta, registreAnulacio, urlQr, verificaCadena,
} from '../facturacio/registres.ts';
import type { Linia } from '../facturacio/registres.ts';
import { certificatConfigurat, enviaPendents, programaEnviament } from '../facturacio/aeat.ts';
import { avui } from '../../shared/dates.ts';

export const facturacioRouter = Router();

const LIMIT_SIMPLIFICADA = 40_000; // 400 € (art. 4 RD 1619/2012)

// ---------- Clients ----------

function validaNif(v: unknown): string | null {
  const n = text(v)?.toUpperCase().replace(/[\s-]/g, '') ?? null;
  if (n && n.length !== 9) throw new HttpError(400, 'El NIF ha de tenir 9 caràcters (p. ex. G12345678 o 12345678Z).');
  return n;
}

function llegirClient(body: Request['body']) {
  return {
    nom: textObligatori(body.nom, 'Nom o raó social'),
    nif: validaNif(body.nif),
    adreca: text(body.adreca),
    codi_postal: text(body.codi_postal),
    poblacio: text(body.poblacio),
    pais: text(body.pais)?.toUpperCase() ?? 'ES',
    email: text(body.email),
    soci_id: enter(body.soci_id, 'Soci'),
  };
}
const CAMPS_CLIENT = ['nom', 'nif', 'adreca', 'codi_postal', 'poblacio', 'pais', 'email', 'soci_id'];

facturacioRouter.get('/clients', (_req, res) => {
  res.json(all('SELECT * FROM clients ORDER BY nom'));
});

facturacioRouter.post('/clients', (req, res) => {
  const c = llegirClient(req.body);
  const { id } = run(`INSERT INTO clients (${CAMPS_CLIENT.join(', ')}) VALUES (${CAMPS_CLIENT.map((k) => '$' + k).join(', ')})`, c);
  res.status(201).json(get('SELECT * FROM clients WHERE id = ?', id));
});

facturacioRouter.put('/clients/:id', (req, res) => {
  const id = idParam(req);
  const { changes } = run(`UPDATE clients SET ${CAMPS_CLIENT.map((k) => `${k} = $${k}`).join(', ')} WHERE id = $id`, { ...llegirClient(req.body), id });
  if (!changes) notFound();
  res.json(get('SELECT * FROM clients WHERE id = ?', id));
});

facturacioRouter.delete('/clients/:id', (req, res) => {
  const { changes } = run('DELETE FROM clients WHERE id = ?', idParam(req));
  if (!changes) notFound();
  res.status(204).end();
});

// ---------- Sèries ----------

facturacioRouter.get('/series', (_req, res) => {
  res.json(all('SELECT * FROM series_factura ORDER BY codi'));
});

facturacioRouter.post('/series', (req, res) => {
  const codi = textObligatori(req.body.codi, 'Codi').toUpperCase();
  if (!/^[A-Z0-9]{1,6}$/.test(codi)) throw new HttpError(400, 'El codi de sèrie ha de ser de lletres o xifres (màxim 6).');
  const tipus = String(req.body.tipus);
  if (!['ordinaria', 'simplificada', 'rectificativa'].includes(tipus)) throw new HttpError(400, 'Tipus de sèrie no vàlid.');
  const { id } = run('INSERT INTO series_factura (codi, descripcio, tipus) VALUES (?, ?, ?)', codi, textObligatori(req.body.descripcio, 'Descripció'), tipus);
  res.status(201).json(get('SELECT * FROM series_factura WHERE id = ?', id));
});

// ---------- Factures ----------

const SELECT_FACTURES = `
  SELECT f.id, f.num_serie, f.tipus_factura, f.data_expedicio, f.estat, f.total_cents, f.base_cents, f.quota_cents,
         f.cobrada_el, f.descripcio_operacio, f.factura_rectificada_id, s.codi AS serie_codi,
         COALESCE(f.dest_nom, c.nom) AS client_nom
    FROM factures f JOIN series_factura s ON s.id = f.serie_id LEFT JOIN clients c ON c.id = f.client_id`;

facturacioRouter.get('/factures', (req, res) => {
  const exercici = enter(req.query.exercici, 'Exercici') ?? new Date().getFullYear();
  res.json(
    all(
      `${SELECT_FACTURES}
        WHERE f.estat = 'esborrany' OR f.data_expedicio BETWEEN ? AND ?
        ORDER BY f.estat = 'esborrany' DESC, f.data_expedicio DESC, f.numero DESC`,
      `${exercici}-01-01`, `${exercici}-12-31`,
    ),
  );
});

function carregaFactura(id: number) {
  const f = get<Record<string, unknown> & { estat: string; num_serie: string | null; data_expedicio: string | null; total_cents: number }>(
    `SELECT f.*, s.codi AS serie_codi, s.tipus AS serie_tipus, c.nom AS client_nom, c.nif AS client_nif,
            TRIM(COALESCE(c.adreca, '') || ' ' || COALESCE(c.codi_postal, '') || ' ' || COALESCE(c.poblacio, '')) AS client_adreca,
            r.num_serie AS rectificada_num_serie, r.data_expedicio AS rectificada_data
       FROM factures f JOIN series_factura s ON s.id = f.serie_id
       LEFT JOIN clients c ON c.id = f.client_id
       LEFT JOIN factures r ON r.id = f.factura_rectificada_id
      WHERE f.id = ?`,
    id,
  );
  if (!f) notFound();
  const linies = all<Linia & { id: number }>('SELECT * FROM factura_linies WHERE factura_id = ? ORDER BY ordre, id', id);
  return { f, linies };
}

facturacioRouter.get('/factures/:id', async (req, res) => {
  const { f, linies } = carregaFactura(idParam(req));
  const calc = calcula(linies);
  const registres = all(
    'SELECT id, tipus, huella, data_hora_gen, estat_aeat, csv_aeat, error_aeat, enviat_el FROM registres_facturacio WHERE factura_id = ? ORDER BY id',
    f.id,
  );
  let qr: string | null = null;
  if (f.estat !== 'esborrany' && f.num_serie && f.data_expedicio) {
    const url = urlQr({ num_serie: f.num_serie, data_expedicio_iso: f.data_expedicio, total_cents: f.total_cents });
    qr = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 0 });
  }
  res.json({
    factura: f,
    linies: calc.linies,
    desglossament: calc.desglossament,
    registres,
    qr,
    emissor: { ...emissor(), adreca: getConfig('fac_adreca') || getConfig('adreca') || '' },
    entorn: getConfig('fac_entorn') === 'produccio' ? 'produccio' : 'proves',
  });
});

function llegirLinies(body: Request['body']): Linia[] {
  const linies: unknown[] = Array.isArray(body.linies) ? body.linies : [];
  return linies.map((l, i) => {
    const o = (l ?? {}) as Record<string, unknown>;
    const qualificacio = String(o.qualificacio ?? 'S1');
    if (!QUALIFICACIONS[qualificacio]) throw new HttpError(400, `Línia ${i + 1}: qualificació d'IVA no vàlida.`);
    const tipus = Number(o.tipus_iva ?? 21);
    if (qualificacio === 'S1' && ![0, 4, 5, 10, 21].includes(tipus)) throw new HttpError(400, `Línia ${i + 1}: tipus d'IVA no vàlid.`);
    const quantitat = Number(o.quantitat ?? 1);
    const preu = Number(o.preu_cents);
    const descompte = Number(o.descompte ?? 0);
    if (!Number.isFinite(quantitat) || quantitat === 0) throw new HttpError(400, `Línia ${i + 1}: quantitat no vàlida.`);
    if (!Number.isInteger(preu)) throw new HttpError(400, `Línia ${i + 1}: preu no vàlid.`);
    if (!(descompte >= 0 && descompte <= 100)) throw new HttpError(400, `Línia ${i + 1}: descompte no vàlid.`);
    const causa = text(o.causa_exempcio);
    if (qualificacio !== 'S1' && !causa)
      throw new HttpError(400, `Línia ${i + 1}: cal indicar el motiu legal de l'exempció o de la no subjecció.`);
    return {
      concepte: textObligatori(o.concepte, `Concepte de la línia ${i + 1}`),
      quantitat,
      preu_cents: preu,
      descompte,
      qualificacio,
      tipus_iva: qualificacio === 'S1' ? tipus : 0,
      causa_exempcio: qualificacio === 'S1' ? null : causa,
    };
  });
}

function desaEsborrany(id: number | null, body: Request['body']) {
  const serie = get<{ id: number; tipus: string }>('SELECT id, tipus FROM series_factura WHERE id = ? AND actiu = 1', enter(body.serie_id, 'Sèrie'));
  if (!serie) throw new HttpError(400, 'Cal triar una sèrie de facturació.');
  const linies = llegirLinies(body);
  const calc = calcula(linies);
  const tipusFactura =
    serie.tipus === 'simplificada' ? 'F2' : serie.tipus === 'rectificativa' ? String(body.tipus_factura ?? 'R1') : 'F1';
  if (!['F1', 'F2', 'R1', 'R4', 'R5'].includes(tipusFactura)) throw new HttpError(400, 'Tipus de factura no vàlid.');
  const camps = {
    serie_id: serie.id,
    tipus_factura: tipusFactura,
    tipus_rectificativa: tipusFactura.startsWith('R') ? 'I' : null,
    factura_rectificada_id: tipusFactura.startsWith('R') ? enter(body.factura_rectificada_id, 'Factura rectificada') : null,
    motiu_rectificacio: tipusFactura.startsWith('R') ? text(body.motiu_rectificacio) : null,
    data_operacio: data(body.data_operacio, "Data de l'operació"),
    client_id: enter(body.client_id, 'Client'),
    descripcio_operacio: text(body.descripcio_operacio) ?? '',
    observacions: text(body.observacions),
    base_cents: calc.base_cents,
    quota_cents: calc.quota_cents,
    total_cents: calc.total_cents,
  };
  return tx(() => {
    let facturaId = id;
    if (facturaId) {
      const actual = get<{ estat: string }>('SELECT estat FROM factures WHERE id = ?', facturaId) ?? notFound();
      if (actual.estat !== 'esborrany') throw new HttpError(409, 'Una factura emesa no es pot modificar: fes-ne una de rectificativa.');
      run(`UPDATE factures SET ${Object.keys(camps).map((k) => `${k} = $${k}`).join(', ')} WHERE id = $id`, { ...camps, id: facturaId });
      run('DELETE FROM factura_linies WHERE factura_id = ?', facturaId);
    } else {
      facturaId = run(
        `INSERT INTO factures (${Object.keys(camps).join(', ')}) VALUES (${Object.keys(camps).map((k) => '$' + k).join(', ')})`,
        camps,
      ).id;
    }
    linies.forEach((l, i) =>
      run(
        `INSERT INTO factura_linies (factura_id, ordre, concepte, quantitat, preu_cents, descompte, qualificacio, tipus_iva, causa_exempcio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        facturaId, i, l.concepte, l.quantitat, l.preu_cents, l.descompte, l.qualificacio, l.tipus_iva, l.causa_exempcio,
      ),
    );
    return facturaId!;
  });
}

facturacioRouter.post('/factures', (req, res) => {
  res.status(201).json({ id: desaEsborrany(null, req.body) });
});

facturacioRouter.put('/factures/:id', (req, res) => {
  res.json({ id: desaEsborrany(idParam(req), req.body) });
});

facturacioRouter.delete('/factures/:id', (req, res) => {
  const id = idParam(req);
  const f = get<{ estat: string }>('SELECT estat FROM factures WHERE id = ?', id) ?? notFound();
  if (f.estat !== 'esborrany') throw new HttpError(409, 'Una factura emesa no es pot esborrar.');
  run('DELETE FROM factures WHERE id = ?', id);
  res.status(204).end();
});

/**
 * Emet la factura: li assigna número correlatiu dins la sèrie i l'any, en congela les dades
 * i genera el registre de facturació d'alta encadenat. A partir d'aquí ja no es pot modificar.
 */
facturacioRouter.post('/factures/:id/emet', (req, res) => {
  const id = idParam(req);
  const { nif, nom } = emissor();
  if (!nif || nif.length !== 9) throw new HttpError(400, "Falta el NIF de l'entitat (Facturació → Configuració).");
  if (!nom) throw new HttpError(400, "Falta el nom de l'entitat.");

  const resultat = tx(() => {
    const { f, linies } = carregaFactura(id);
    if (f.estat !== 'esborrany') throw new HttpError(409, 'Aquesta factura ja està emesa.');
    if (!linies.length) throw new HttpError(400, 'La factura no té cap línia.');
    const calc = calcula(linies);
    const tipus = String(f.tipus_factura);
    const dataExp = data(req.body.data_expedicio, "Data d'expedició") ?? avui();
    if (dataExp > avui()) throw new HttpError(400, "La data d'expedició no pot ser futura.");

    // Correlativitat: la data no pot ser anterior a la de l'última factura de la sèrie.
    const darrera = get<{ data_expedicio: string; numero: number }>(
      `SELECT data_expedicio, numero FROM factures WHERE serie_id = ? AND estat <> 'esborrany'
        AND substr(data_expedicio, 1, 4) = ? ORDER BY numero DESC LIMIT 1`,
      f.serie_id, dataExp.slice(0, 4),
    );
    if (darrera && darrera.data_expedicio > dataExp)
      throw new HttpError(400, `La data no pot ser anterior a la de l'última factura de la sèrie (${darrera.data_expedicio.split('-').reverse().join('/')}).`);
    const numero = (darrera?.numero ?? 0) + 1;
    const numSerie = `${f.serie_codi}${dataExp.slice(0, 4)}-${String(numero).padStart(4, '0')}`;

    // Destinatari obligatori a les factures completes (art. 6 RD 1619/2012).
    let destinatari: { nom: string; nif: string } | null = null;
    if (tipus !== 'F2' && tipus !== 'R5') {
      if (!f.client_id) throw new HttpError(400, 'Una factura completa ha de tenir destinatari.');
      if (!f.client_nif || String(f.client_nif).length !== 9) throw new HttpError(400, 'El destinatari ha de tenir NIF.');
      if (!f.client_adreca) throw new HttpError(400, 'El destinatari ha de tenir adreça.');
      destinatari = { nom: String(f.client_nom), nif: String(f.client_nif) };
    } else if (calc.total_cents > LIMIT_SIMPLIFICADA) {
      throw new HttpError(400, 'Una factura simplificada no pot superar els 400 € (IVA inclòs). Fes-ne una d’ordinària.');
    }
    if (tipus.startsWith('R')) {
      if (!f.factura_rectificada_id || !f.rectificada_num_serie) throw new HttpError(400, 'Cal indicar la factura que es rectifica.');
      if (!f.motiu_rectificacio) throw new HttpError(400, 'Cal indicar el motiu de la rectificació.');
    }

    const descripcio = String(f.descripcio_operacio || linies[0].concepte);
    const reg = registreAlta({
      num_serie: numSerie,
      data_expedicio_iso: dataExp,
      data_operacio_iso: (f.data_operacio as string | null) ?? null,
      tipus_factura: tipus,
      tipus_rectificativa: (f.tipus_rectificativa as string | null) ?? null,
      rectificada: f.rectificada_num_serie
        ? { num_serie: String(f.rectificada_num_serie), data_expedicio_iso: String(f.rectificada_data) }
        : null,
      descripcio,
      destinatari,
      desglossament: calc.desglossament,
      quota_cents: calc.quota_cents,
      total_cents: calc.total_cents,
    });

    run(
      `UPDATE factures SET numero = ?, num_serie = ?, data_expedicio = ?, dest_nom = ?, dest_nif = ?, dest_adreca = ?,
         descripcio_operacio = ?, base_cents = ?, quota_cents = ?, total_cents = ?, estat = 'emesa', emesa_per = ?
       WHERE id = ?`,
      numero, numSerie, dataExp, f.client_nom ?? null, f.client_nif ?? null, f.client_adreca || null,
      descripcio, calc.base_cents, calc.quota_cents, calc.total_cents, autor(req), id,
    );
    run(
      `INSERT INTO registres_facturacio (tipus, factura_id, nif_emissor, num_serie, data_expedicio, tipus_factura, quota_total,
         import_total, huella_anterior, data_hora_gen, huella, xml)
       VALUES ('alta', $factura_id, $nif_emissor, $num_serie, $data_expedicio, $tipus_factura, $quota_total, $import_total,
         $huella_anterior, $data_hora_gen, $huella, $xml)`,
      { ...reg, factura_id: id },
    );
    registra(req, 'crea', 'factura', id, `Factura ${numSerie} emesa (${(calc.total_cents / 100).toFixed(2)} €)`);
    return { num_serie: numSerie };
  });
  programaEnviament();
  res.json(resultat);
});

/** Anul·lació: per a factures emeses per error (no reflecteixen cap operació real). */
facturacioRouter.post('/factures/:id/anulla', (req, res) => {
  const id = idParam(req);
  const motiu = textObligatori(req.body.motiu, "Motiu de l'anul·lació");
  tx(() => {
    const f = get<{ estat: string; num_serie: string; data_expedicio: string }>('SELECT estat, num_serie, data_expedicio FROM factures WHERE id = ?', id) ?? notFound();
    if (f.estat !== 'emesa') throw new HttpError(409, 'Només es poden anul·lar factures emeses.');
    const reg = registreAnulacio({ num_serie: f.num_serie, data_expedicio_iso: f.data_expedicio });
    run("UPDATE factures SET estat = 'anullada' WHERE id = ?", id);
    run(
      `INSERT INTO registres_facturacio (tipus, factura_id, nif_emissor, num_serie, data_expedicio, tipus_factura, quota_total,
         import_total, huella_anterior, data_hora_gen, huella, xml)
       VALUES ('anulacio', $factura_id, $nif_emissor, $num_serie, $data_expedicio, $tipus_factura, $quota_total, $import_total,
         $huella_anterior, $data_hora_gen, $huella, $xml)`,
      { ...reg, factura_id: id },
    );
    registra(req, 'elimina', 'factura', id, `Factura ${f.num_serie} anul·lada. Motiu: ${motiu}`);
  });
  programaEnviament();
  res.json({ ok: true });
});

/** Crea l'esborrany d'una factura rectificativa (per diferències) a partir d'una d'emesa. */
facturacioRouter.post('/factures/:id/rectifica', (req, res) => {
  const id = idParam(req);
  const { f, linies } = carregaFactura(id);
  if (f.estat !== 'emesa') throw new HttpError(409, 'Només es poden rectificar factures emeses.');
  const serie = get<{ id: number }>("SELECT id FROM series_factura WHERE tipus = 'rectificativa' AND actiu = 1 ORDER BY id LIMIT 1");
  if (!serie) throw new HttpError(400, 'Cal una sèrie de factures rectificatives.');
  const nouId = desaEsborrany(null, {
    serie_id: serie.id,
    tipus_factura: f.tipus_factura === 'F2' ? 'R5' : 'R1',
    factura_rectificada_id: id,
    motiu_rectificacio: text(req.body.motiu) ?? '',
    client_id: f.client_id,
    descripcio_operacio: `Rectificació de la factura ${f.num_serie}`,
    // Per defecte, anul·la els imports de l'original (línies en negatiu); es poden ajustar abans d'emetre.
    linies: linies.map((l) => ({ ...l, quantitat: -l.quantitat })),
  });
  res.status(201).json({ id: nouId });
});

/** Registra el cobrament: crea l'ingrés a comptabilitat i el vincula a la factura. */
facturacioRouter.post('/factures/:id/cobra', (req, res) => {
  const id = idParam(req);
  const compte = enter(req.body.compte_id, 'Compte');
  const categoria = enter(req.body.categoria_id, 'Categoria');
  const dataCobr = data(req.body.data, 'Data') ?? avui();
  if (!compte || !categoria) throw new HttpError(400, 'Cal triar el compte i la categoria.');
  tx(() => {
    const f = get<{ estat: string; num_serie: string; total_cents: number; cobrada_el: string | null; dest_nom: string | null }>(
      'SELECT estat, num_serie, total_cents, cobrada_el, dest_nom FROM factures WHERE id = ?', id,
    ) ?? notFound();
    if (f.estat !== 'emesa') throw new HttpError(409, 'Només es poden cobrar factures emeses.');
    if (f.cobrada_el) throw new HttpError(409, 'Aquesta factura ja està cobrada.');
    if (f.total_cents <= 0) throw new HttpError(400, 'La factura no té import a cobrar.');
    const mov = run(
      "INSERT INTO moviments (data, tipus, import_cents, concepte, categoria_id, compte_id, justificant) VALUES (?, 'ingres', ?, ?, ?, ?, ?)",
      dataCobr, f.total_cents, `Factura ${f.num_serie}${f.dest_nom ? ` – ${f.dest_nom}` : ''}`, categoria, compte, f.num_serie,
    );
    run('UPDATE factures SET cobrada_el = ?, moviment_id = ? WHERE id = ?', dataCobr, mov.id, id);
  });
  res.json({ ok: true });
});

// ---------- Registres de facturació ----------

facturacioRouter.get('/registres', (_req, res) => {
  res.json(
    all(
      `SELECT id, tipus, factura_id, num_serie, data_expedicio, tipus_factura, import_total, huella, data_hora_gen,
              estat_aeat, csv_aeat, error_aeat, enviat_el
         FROM registres_facturacio ORDER BY id DESC LIMIT 500`,
    ),
  );
});

facturacioRouter.get('/registres/verifica', (_req, res) => {
  res.json(verificaCadena(all('SELECT * FROM registres_facturacio ORDER BY id')));
});

facturacioRouter.get('/registres/:id/xml', (req, res) => {
  const r = get<{ xml: string }>('SELECT xml FROM registres_facturacio WHERE id = ?', idParam(req)) ?? notFound();
  res.json({ xml: r.xml });
});

facturacioRouter.post('/registres/envia', async (_req, res) => {
  try {
    res.json(await enviaPendents());
  } catch (e) {
    throw new HttpError(502, e instanceof Error ? e.message : String(e));
  }
});

// ---------- Configuració ----------

function configFacturacio() {
  const pendents = get<{ n: number }>("SELECT COUNT(*) AS n FROM registres_facturacio WHERE estat_aeat = 'pendent'")!.n;
  return {
    fac_nif: getConfig('fac_nif') || getConfig('nif') || '',
    fac_nom: getConfig('fac_nom') || getConfig('nom_complet') || getConfig('nom') || '',
    fac_adreca: getConfig('fac_adreca') || getConfig('adreca') || '',
    fac_entorn: getConfig('fac_entorn') === 'produccio' ? 'produccio' : 'proves',
    fac_productor_nom: getConfig('fac_productor_nom') || '',
    fac_productor_nif: getConfig('fac_productor_nif') || '',
    fac_num_installacio: getConfig('fac_num_installacio') || '',
    fac_enviament_auto: getConfig('fac_enviament_auto') !== '0',
    te_certificat: certificatConfigurat(),
    darrer_error: getConfig('fac_darrer_error') || null,
    pendents,
    sistema: SISTEMA,
  };
}

facturacioRouter.get('/config', (_req, res) => {
  if (!getConfig('fac_num_installacio')) setConfig('fac_num_installacio', `GA-${Date.now().toString(36).toUpperCase()}`);
  res.json(configFacturacio());
});

facturacioRouter.put('/config', (req, res) => {
  const b = req.body;
  if ('fac_nif' in b) setConfig('fac_nif', validaNif(b.fac_nif) ?? '');
  if ('fac_productor_nif' in b) setConfig('fac_productor_nif', validaNif(b.fac_productor_nif) ?? '');
  for (const k of ['fac_nom', 'fac_adreca', 'fac_productor_nom']) if (k in b) setConfig(k, text(b[k]) ?? '');
  if ('fac_entorn' in b) {
    const entorn = b.fac_entorn === 'produccio' ? 'produccio' : 'proves';
    if (entorn !== getConfig('fac_entorn') && get<{ n: number }>('SELECT COUNT(*) AS n FROM registres_facturacio')!.n > 0)
      registra(req, 'modifica', 'facturacio', null, `Entorn AEAT canviat a «${entorn}»`);
    setConfig('fac_entorn', entorn);
  }
  if ('fac_enviament_auto' in b) setConfig('fac_enviament_auto', b.fac_enviament_auto ? '1' : '0');
  if (text(b.fac_cert)) {
    const cert = text(b.fac_cert)!.replace(/^data:[^,]*,/, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(cert) || cert.length > 50_000) throw new HttpError(400, 'El fitxer del certificat no és vàlid.');
    setConfig('fac_cert', cert);
    registra(req, 'modifica', 'facturacio', null, 'Certificat electrònic actualitzat');
  }
  if ('fac_cert_contrasenya' in b && text(b.fac_cert_contrasenya)) setConfig('fac_cert_contrasenya', text(b.fac_cert_contrasenya)!);
  if (b.esborra_certificat) {
    setConfig('fac_cert', '');
    setConfig('fac_cert_contrasenya', '');
  }
  registra(req, 'configura', 'facturacio', null, `Claus canviades: ${Object.keys(req.body ?? {}).join(', ')}`); // només els noms, mai els valors
  res.json(configFacturacio());
});
