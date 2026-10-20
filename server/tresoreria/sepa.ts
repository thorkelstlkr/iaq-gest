// Adeudos directos SEPA (esquema Core): identificador de creditor i fitxer pain.008.001.02.
// Funcions pures (sense base de dades) perquè es puguin provar i fer servir a la demostració.

import { netejaIban } from '../../shared/iban.ts';

// ---------- Identificador de creditor ----------

/** Lletres → números (A=10 … Z=35) i càlcul mod 97 sobre el resultat (ISO 7064 MOD 97-10). */
function mod97(text: string): number {
  let resta = 0;
  for (const c of text) {
    const v = /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c;
    for (const d of v) resta = (resta * 10 + Number(d)) % 97;
  }
  return resta;
}

/**
 * Identificador de creditor SEPA: país + 2 dígits de control + codi comercial (3 caràcters) + identificador nacional.
 * Els dígits es calculen sobre l'identificador nacional seguit del país i «00» (el codi comercial no hi entra).
 * Exemple: NIF G12345678 → «ES..ZZZG12345678».
 */
export function identificadorCreditor(nif: string, pais = 'ES', codiComercial = 'ZZZ'): string {
  const id = nif.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!id) return '';
  const control = 98 - mod97(id + pais + '00');
  return `${pais}${String(control).padStart(2, '0')}${codiComercial}${id}`;
}

/** Comprova el format i els dígits de control d'un identificador de creditor. */
export function identificadorCreditorValid(v: string): boolean {
  const s = v.toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z0-9]{1,28}$/.test(s)) return false;
  return mod97(s.slice(7) + s.slice(0, 4)) === 1;
}

// ---------- Text admès pels bancs ----------

/** Caràcters admesos en SEPA: lletres llatines bàsiques, xifres, espai i / - ? : ( ) . , ' + */
export function textSepa(s: string, max: number): string {
  const net = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ñÑ]/g, (c) => (c === 'ñ' ? 'n' : 'N'))
    .replace(/[çÇ]/g, (c) => (c === 'ç' ? 'c' : 'C'))
    .replace(/·/g, '.')
    .replace(/[’‘`´]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^A-Za-z0-9/\-?:().,'+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return net.slice(0, max).trim();
}

/** Identificadors (MsgId, EndToEndId, MndtId…): sense espais, sense «//» i sense «/» a l'inici ni al final. */
export function idSepa(s: string, max = 35): string {
  return textSepa(s, 200)
    .replace(/ /g, '')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .slice(0, max);
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;');
const imports = (c: number) => (c / 100).toFixed(2);

// ---------- Fitxer pain.008.001.02 ----------

export type Sequencia = 'FRST' | 'RCUR';

export interface OperacioSepa {
  endToEnd: string;
  importCents: number;
  mandat: string;
  dataMandat: string; // YYYY-MM-DD
  sequencia: Sequencia;
  nom: string;
  iban: string;
  bic?: string | null;
  concepte: string;
}

export interface RemesaSepa {
  msgId: string;
  creacio: string; // YYYY-MM-DDThh:mm:ss (hora local)
  dataCobrament: string; // YYYY-MM-DD
  creditor: { nom: string; identificador: string; iban: string; bic?: string | null };
  operacions: OperacioSepa[];
}

const agent = (bic?: string | null, sagnat = '') =>
  bic
    ? `${sagnat}<FinInstnId><BIC>${xml(bic.toUpperCase().replace(/\s/g, ''))}</BIC></FinInstnId>`
    : `${sagnat}<FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId>`;

/** Genera el fitxer XML de la remesa: un bloc PmtInf per a cada tipus de seqüència (FRST, RCUR). */
export function generaPain008(r: RemesaSepa): string {
  if (!r.operacions.length) throw new Error('La remesa no té cap operació.');
  const total = r.operacions.reduce((s, o) => s + o.importCents, 0);
  const nomCreditor = textSepa(r.creditor.nom, 70);
  const idCreditor = idSepa(r.creditor.identificador);
  const msgId = idSepa(r.msgId);
  const grups = (['FRST', 'RCUR'] as const)
    .map((seq) => ({ seq, ops: r.operacions.filter((o) => o.sequencia === seq) }))
    .filter((g) => g.ops.length);

  const pmtInf = grups.map(({ seq, ops }) => {
    const suma = ops.reduce((s, o) => s + o.importCents, 0);
    const txs = ops.map(
      (o) => `      <DrctDbtTxInf>
        <PmtId><EndToEndId>${xml(idSepa(o.endToEnd))}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${imports(o.importCents)}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${xml(idSepa(o.mandat))}</MndtId>
            <DtOfSgntr>${o.dataMandat}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>${agent(o.bic)}</DbtrAgt>
        <Dbtr><Nm>${xml(textSepa(o.nom, 70))}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${netejaIban(o.iban)}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>${xml(textSepa(o.concepte, 140))}</Ustrd></RmtInf>
      </DrctDbtTxInf>`,
    );
    return `    <PmtInf>
      <PmtInfId>${xml(idSepa(`${msgId}-${seq}`))}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${ops.length}</NbOfTxs>
      <CtrlSum>${imports(suma)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
        <LclInstrm><Cd>CORE</Cd></LclInstrm>
        <SeqTp>${seq}</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${r.dataCobrament}</ReqdColltnDt>
      <Cdtr><Nm>${xml(nomCreditor)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${netejaIban(r.creditor.iban)}</IBAN></Id></CdtrAcct>
      <CdtrAgt>${agent(r.creditor.bic)}</CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId>
        <Id><PrvtId><Othr><Id>${xml(idCreditor)}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id>
      </CdtrSchmeId>
${txs.join('\n')}
    </PmtInf>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${xml(msgId)}</MsgId>
      <CreDtTm>${r.creacio}</CreDtTm>
      <NbOfTxs>${r.operacions.length}</NbOfTxs>
      <CtrlSum>${imports(total)}</CtrlSum>
      <InitgPty>
        <Nm>${xml(nomCreditor)}</Nm>
        <Id><OrgId><Othr><Id>${xml(idCreditor)}</Id></Othr></OrgId></Id>
      </InitgPty>
    </GrpHdr>
${pmtInf.join('\n')}
  </CstmrDrctDbtInitn>
</Document>
`;
}

/** Codis de devolució més habituals (ISO 20022 / EPC). */
export const MOTIUS_DEVOLUCIO: Record<string, string> = {
  AC01: 'Compte incorrecte',
  AC04: 'Compte cancel·lat',
  AC06: 'Compte bloquejat',
  AG01: 'Operació no permesa en aquest compte',
  AM04: 'Fons insuficients',
  MD01: 'Sense mandat',
  MD06: 'Devolució a petició del deutor',
  MD07: 'Deutor mort',
  MS02: 'Refusada pel deutor',
  MS03: 'Motiu no especificat',
  SL01: 'Servei específic del banc del deutor',
};
