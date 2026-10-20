// Tipus i peces comunes del mòdul de donatius (donacions, certificats, model 182 i inventari).
import { useState } from 'react';
import { t } from '../../i18n';
import { avisa } from '../ui';

export interface ConfigDonatius {
  regim_49_2002: 'si' | 'no';
  regim_49_2002_data: string | null;
  utilitat_publica_data: string | null;
  donatius_categoria_id: number | null;
  donatius_compte_id: number | null;
}

export interface Donacio {
  id: number;
  soci_id: number | null;
  nom: string;
  nif: string | null;
  tipus_persona: 'fisica' | 'juridica';
  adreca: string | null;
  codi_postal: string | null;
  poblacio: string | null;
  codi_provincia: string | null;
  data: string;
  import_cents: number;
  en_especie: number;
  descripcio_especie: string | null;
  valoracio_cents: number | null;
  destinacio: string | null;
  revocada: number;
  data_revocacio: string | null;
  moviment_id: number | null;
  notes: string | null;
  certificats: number;
  inventari_ids: string | null;
}

export interface LiniaCertificat {
  id: number;
  data: string;
  import_cents: number;
  en_especie: boolean;
  descripcio_especie: string | null;
  valoracio_cents: number | null;
  valor_cents: number;
  destinacio: string | null;
}

export interface CertificatDonacio {
  id: number;
  any: number;
  numero: number;
  tipus: 'donacio' | 'anual' | 'rebut';
  donatiu_id: number | null;
  exercici: number;
  nom: string;
  nif: string | null;
  data: string;
  total_cents: number;
  secretaria: string | null;
  presidencia: string | null;
  emes_per: string | null;
  contingut: {
    entitat: { nom: string; nif: string; num_registre: string; adreca: string; codi_postal: string; poblacio: string };
    regim: { acollida: boolean; data: string | null; utilitat_publica_data: string | null };
    donant: { nom: string; nif: string | null; tipus_persona: 'fisica' | 'juridica'; adreca: string | null; codi_postal: string | null; poblacio: string | null };
    exercici: number;
    donacions: LiniaCertificat[];
    total_cents: number;
    irrevocable: boolean;
  };
}

export const valorDonacio = (d: Pick<Donacio, 'en_especie' | 'import_cents' | 'valoracio_cents'>) =>
  d.en_especie ? (d.valoracio_cents ?? 0) : d.import_cents;

export const TIPUS_CERT: Record<CertificatDonacio['tipus'], string> = {
  donacio: t("Certificat de donació"),
  anual: t("Certificat anual"),
  rebut: t("Rebut de donació"),
};

export const TIPUS_PERSONA: Record<string, string> = { fisica: t("Persona física"), juridica: t("Persona jurídica") };

/** Explicació del règim fiscal de la Llei 49/2002 (es mostra a diverses pestanyes). */
export function ExplicacioRegim({ acollida, compacta }: { acollida: boolean; compacta?: boolean }) {
  return (
    <div className={`don-explicacio ${acollida ? 'don-explicacio-si' : ''}`}>
      {acollida ? (
        <p>
          {t("L'entitat està acollida al règim fiscal especial de la Llei 49/2002: pot emetre certificats de donació amb dret a deducció i ha de presentar el model 182 cada mes de gener.")}
        </p>
      ) : (
        <>
          <p>
            <strong>{t("L'entitat no està acollida al règim de la Llei 49/2002.")}</strong>{' '}
            {t("Només les entitats acollides a aquest règim (per exemple, les declarades d'utilitat pública que hi han optat davant l'Agència Tributària) poden emetre certificats amb dret a deducció a l'IRPF o a l'Impost de Societats, i han de presentar el model 182.")}
          </p>
          {!compacta && (
            <p>
              {t("Mentrestant, podeu registrar les donacions i lliurar als donants un rebut, que acredita la donació però no té efectes fiscals.")}
            </p>
          )}
        </>
      )}
      <p className="apagat petit">{t("Aquesta informació és orientativa: consulteu-ho amb la gestoria.")}</p>
    </div>
  );
}

/** Text CSV (separat per punts i comes, com els fitxers del servidor) per veure'l o copiar-lo. */
export function aCsv(capcaleres: string[], files: (string | number | null | undefined)[][]): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [capcaleres, ...files].map((f) => f.map(esc).join(';')).join('\n');
}

export const eurosCsv = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

export async function copiaText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    avisa(t("Copiat al porta-retalls."));
  } catch {
    avisa(t("No s'ha pogut copiar: selecciona el text i copia'l a mà."), 'error');
  }
}

/** Mostra un text CSV en un quadre per seleccionar-lo i copiar-lo (les descàrregues no sempre funcionen). */
export function VisorCsv({ csv }: { csv: string }) {
  const [obert, setObert] = useState(false);
  return (
    <div className="don-csv no-imprimir">
      <button type="button" className="boto boto-secundari boto-petit" onClick={() => setObert(!obert)}>
        {obert ? t("Amaga el CSV") : t("Mostra el CSV")}
      </button>{' '}
      <button type="button" className="boto boto-secundari boto-petit" onClick={() => copiaText(csv)}>
        {t("Copia el CSV")}
      </button>
      {obert && <textarea readOnly value={csv} rows={Math.min(14, csv.split('\n').length + 1)} onFocus={(e) => e.target.select()} />}
    </div>
  );
}
