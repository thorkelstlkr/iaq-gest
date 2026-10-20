// Informació del programa per a l'ajuda («Quant al programa») i per demanar suport.
import { Router } from 'express';
import { get, getConfig } from '../db.ts';
import { DB_PATH } from '../db.ts';
import { usuariDe } from './auth.ts';
import { llistaCopies, versioApp } from '../copies.ts';

export const ajudaRouter = Router();

const compta = (taula: string, on = '') => {
  try {
    return get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${taula} ${on}`)?.n ?? 0;
  } catch {
    return null;
  }
};

ajudaRouter.get('/sistema', (req, res) => {
  const admin = usuariDe(req)?.rol === 'admin';
  let copies: ReturnType<typeof llistaCopies> = [];
  try {
    copies = llistaCopies();
  } catch {
    copies = [];
  }
  res.json({
    versio: versioApp(),
    entitat: getConfig('nom_complet') || getConfig('nom'),
    instal_lat_el: getConfig('inicialitzat'),
    node: typeof process !== 'undefined' ? process.version : null,
    plataforma: typeof process !== 'undefined' ? `${process.platform} ${process.arch}` : null,
    // La ubicació de les dades només la veu l'administració.
    base_dades: admin ? DB_PATH : null,
    darrera_copia: copies[0]?.modificada ?? null,
    copies: copies.length,
    dades: {
      socis: compta('socis', 'WHERE anonimitzat_el IS NULL'),
      activitats: compta('activitats'),
      moviments: compta('moviments'),
      factures: compta('factures'),
      usuaris: compta('usuaris', 'WHERE actiu = 1'),
    },
  });
});
