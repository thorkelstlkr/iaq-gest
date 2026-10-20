// Certificat de donació (art. 24 Llei 49/2002 i art. 6 RD 1270/2003) i rebut sense efectes fiscals, a punt per imprimir.
// Es fan servir les dades desades en emetre'l: el document no canvia encara que després canviïn l'entitat o el donant.
import { euros } from '../../format';
import { t } from '../../i18n';
import { dataLlarga, Signatures } from '../governanca/Impresos';
import type { CertificatDonacio } from './comuns';

export function DocumentCertificat({ c }: { c: CertificatDonacio }) {
  const { entitat, donant, donacions, regim } = c.contingut;
  const fiscal = c.tipus !== 'rebut';
  const destinacions = [...new Set(donacions.map((d) => d.destinacio).filter(Boolean))].join('; ');
  const adrecaEntitat = [entitat.adreca, [entitat.codi_postal, entitat.poblacio].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const adrecaDonant = [donant.adreca, [donant.codi_postal, donant.poblacio].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const titol = c.tipus === 'anual' ? t("Certificat de donacions de l'any {0}", c.exercici) : fiscal ? t("Certificat de donació") : t("Rebut de donació");
  return (
    <section className="don-document">
      <header className="document-cap">
        <p className="document-entitat">{entitat.nom}</p>
        <p className="apagat petit">
          {[
            entitat.nif && t("NIF {0}", entitat.nif),
            entitat.num_registre && t("Registre d'Associacions núm. {0}", entitat.num_registre),
            adrecaEntitat,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <h2>{titol}</h2>
        <p className="don-num">{t("Núm. {0}/{1}", c.numero, c.any)}</p>
      </header>

      {fiscal ? (
        <>
          <p>
            {t("{0}, secretari/ària de l'entitat {1}, amb NIF {2},", c.secretaria ?? '________________', entitat.nom, entitat.nif || '—')}
          </p>
          <p className="don-certifico">{t("CERTIFICO:")}</p>
          <ol className="don-punts">
            <li>
              {t("Que l'entitat és una de les entitats beneficiàries del mecenatge a què es refereix l'article 16 de la Llei 49/2002, de 23 de desembre, de règim fiscal de les entitats sense finalitats lucratives i dels incentius fiscals al mecenatge, i que està acollida al règim fiscal especial del títol II d'aquesta llei.")}
              {regim.data && ' ' + t("Data d'acolliment al règim: {0}.", dataLlarga(regim.data))}
            </li>
            <li>
              {donant.tipus_persona === 'juridica'
                ? t("Que l'entitat {0}, amb NIF {1}, ha fet a aquesta associació les donacions següents:", donant.nom, donant.nif ?? '—')
                : t("Que {0}, amb NIF {1}, ha fet a aquesta associació les donacions següents:", donant.nom, donant.nif ?? '—')}
              {adrecaDonant && <span className="apagat"> ({adrecaDonant})</span>}
            </li>
          </ol>
        </>
      ) : (
        <p>
          {t("L'entitat {0}, amb NIF {1}, fa constar que ha rebut de {2}{3} la donació següent:", entitat.nom, entitat.nif || '—', donant.nom, donant.nif ? ` (${t("NIF {0}", donant.nif)})` : '')}
        </p>
      )}

      <table className="taula taula-compacta don-taula-doc">
        <thead>
          <tr>
            <th>{t("Data")}</th>
            <th>{t("Concepte")}</th>
            <th className="num">{t("Import")}</th>
          </tr>
        </thead>
        <tbody>
          {donacions.map((d) => (
            <tr key={d.id}>
              <td className="nowrap">{dataLlarga(d.data)}</td>
              <td>{d.en_especie ? t("Donació en espècie: {0} (valoració)", d.descripcio_especie ?? '') : t("Donació dinerària")}</td>
              <td className="num">{euros(d.valor_cents)}</td>
            </tr>
          ))}
        </tbody>
        {donacions.length > 1 && (
          <tfoot>
            <tr>
              <th colSpan={2}>{t("Total")}</th>
              <th className="num">{euros(c.total_cents)}</th>
            </tr>
          </tfoot>
        )}
      </table>

      {fiscal ? (
        <ol className="don-punts" start={3}>
          <li>
            {destinacions
              ? t("Que les donacions es destinen a la realització de les finalitats pròpies de l'entitat, concretament: {0}.", destinacions)
              : t("Que les donacions es destinen a la realització de les finalitats pròpies de l'entitat.")}
          </li>
          <li>
            {t("Que les donacions tenen caràcter irrevocable, sens perjudici del que estableixen les normes imperatives civils que regulen la revocació de les donacions.")}
          </li>
        </ol>
      ) : (
        <>
          {destinacions && <p>{t("Destinació: {0}.", destinacions)}</p>}
          <p className="don-avis-rebut">
            {t("Aquest document acredita la recepció de la donació. L'entitat no està acollida al règim fiscal especial de la Llei 49/2002 i, per tant, aquesta donació no dona dret a les deduccions fiscals que preveu aquesta llei.")}
          </p>
        </>
      )}

      <p>
        {fiscal
          ? t("I, perquè consti als efectes de l'article 24 de la Llei 49/2002, expedeixo aquest certificat amb el vist i plau de la presidència, a {0}, {1}.", entitat.poblacio || '________', dataLlarga(c.data))
          : `${entitat.poblacio || '________'}, ${dataLlarga(c.data)}.`}
      </p>
      <Signatures secretaria={c.secretaria} presidencia={c.presidencia} />
    </section>
  );
}
