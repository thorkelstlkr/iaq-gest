// Llicència (MIT) i exempció de responsabilitat, en tres idiomes. Font única per a:
// - l'instal·lador (scripts/genera-llicencies.ts en fa build/license_ca.txt, _es.txt i _en.txt);
// - l'assistent de primera configuració (cal acceptar-la abans de començar).

export type IdiomaLlicencia = 'ca' | 'es' | 'en';

const MIT = `MIT License

Copyright (c) 2026 Associació I ara qué? i les persones que hi han contribuït

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export const TITOL_LLICENCIA: Record<IdiomaLlicencia, string> = {
  ca: 'Llicència i exempció de responsabilitat',
  es: 'Licencia y exención de responsabilidad',
  en: 'Licence and disclaimer',
};

const COS: Record<IdiomaLlicencia, string> = {
  ca: `PROGRAMARI LLIURE
Aquest programa és programari lliure, distribuït amb la llicència MIT (text complet al final). Qualsevol persona o entitat el pot fer servir, copiar, modificar i distribuir, també per adaptar-lo a la seva associació, sempre que mantingui l'avís de copyright i de llicència.

EXEMPCIÓ DE RESPONSABILITAT
1. Eina d'ajuda, no assessorament. El programa ajuda a gestionar una associació (socis, comptabilitat, fiscalitat, protecció de dades, facturació, òrgans de govern…), però no constitueix assessorament jurídic, fiscal, comptable ni de protecció de dades. Els textos, terminis, percentatges i models que mostra són orientatius i poden quedar desfasats si canvia la normativa. Consulteu-ho amb una gestoria o un professional abans de presentar qualsevol declaració o document oficial.
2. Responsabilitat de l'entitat. L'entitat que el fa servir és la responsable del tractament de les dades personals que hi introdueix (Reglament general de protecció de dades i Llei orgànica 3/2018), del compliment de les seves obligacions legals, fiscals i comptables, i de la veracitat de les dades.
3. Facturació. La facturació electrònica (VERI*FACTU) i l'enviament de registres a l'Agència Tributària es fan sota la responsabilitat de l'entitat i amb el seu certificat. Comproveu-ne el funcionament en l'entorn de proves abans de fer-lo servir de debò.
4. Còpies de seguretat. Les dades es guarden a l'ordinador on s'instal·la el programa. L'entitat és responsable de fer i conservar còpies de seguretat (el programa les fa cada dia; configureu també una còpia externa, per exemple a Google Drive).
5. Agents d'intel·ligència artificial i serveis externs. Si connecteu assistents d'IA, publicació per FTP, xarxes socials o correu, les dades que hi passin queden subjectes a les condicions d'aquells serveis. Reviseu-ne els acords de tractament de dades.
6. Sense garanties. El programa es lliura «tal com és», sense cap garantia de funcionament, d'adequació a una finalitat concreta ni d'absència d'errors. Els autors i l'Associació I ara qué? no responen de cap dany, pèrdua de dades, sanció o perjudici derivat del seu ús.

En instal·lar o fer servir el programa, accepteu aquestes condicions.`,
  es: `SOFTWARE LIBRE
Este programa es software libre, distribuido con la licencia MIT (texto completo al final). Cualquier persona o entidad puede usarlo, copiarlo, modificarlo y distribuirlo, también para adaptarlo a su asociación, siempre que mantenga el aviso de copyright y de licencia.

EXENCIÓN DE RESPONSABILIDAD
1. Herramienta de ayuda, no asesoramiento. El programa ayuda a gestionar una asociación (socios, contabilidad, fiscalidad, protección de datos, facturación, órganos de gobierno…), pero no constituye asesoramiento jurídico, fiscal, contable ni de protección de datos. Los textos, plazos, porcentajes y modelos que muestra son orientativos y pueden quedar desfasados si cambia la normativa. Consultadlo con una gestoría o un profesional antes de presentar cualquier declaración o documento oficial.
2. Responsabilidad de la entidad. La entidad que lo usa es la responsable del tratamiento de los datos personales que introduce (Reglamento general de protección de datos y Ley Orgánica 3/2018), del cumplimiento de sus obligaciones legales, fiscales y contables, y de la veracidad de los datos.
3. Facturación. La facturación electrónica (VERI*FACTU) y el envío de registros a la Agencia Tributaria se hacen bajo la responsabilidad de la entidad y con su certificado. Comprobad su funcionamiento en el entorno de pruebas antes de usarlo de verdad.
4. Copias de seguridad. Los datos se guardan en el ordenador donde se instala el programa. La entidad es responsable de hacer y conservar copias de seguridad (el programa las hace cada día; configurad también una copia externa, por ejemplo en Google Drive).
5. Agentes de inteligencia artificial y servicios externos. Si conectáis asistentes de IA, publicación por FTP, redes sociales o correo, los datos que pasen por ellos quedan sujetos a las condiciones de esos servicios. Revisad sus acuerdos de tratamiento de datos.
6. Sin garantías. El programa se entrega «tal cual», sin ninguna garantía de funcionamiento, de adecuación a un fin concreto ni de ausencia de errores. Los autores y la Associació I ara qué? no responden de ningún daño, pérdida de datos, sanción o perjuicio derivado de su uso.

Al instalar o usar el programa, aceptáis estas condiciones.`,
  en: `FREE SOFTWARE
This program is free software, distributed under the MIT licence (full text at the end). Anyone, person or organisation, may use, copy, modify and distribute it, including adapting it to their own association, as long as the copyright and licence notice is kept.

DISCLAIMER
1. A support tool, not advice. The program helps manage an association (members, accounts, tax, data protection, invoicing, governing bodies…), but it is not legal, tax, accounting or data-protection advice. The texts, deadlines, percentages and forms it shows are for guidance and may become outdated if regulations change. Check with an adviser before filing any return or official document.
2. The organisation's responsibility. The organisation using it is the controller of the personal data it enters (General Data Protection Regulation and Spanish Organic Law 3/2018), and is responsible for meeting its legal, tax and accounting obligations and for the accuracy of the data.
3. Invoicing. Electronic invoicing (VERI*FACTU) and sending records to the Spanish Tax Agency are done under the organisation's responsibility and with its certificate. Test them in the test environment before real use.
4. Backups. Data is stored on the computer where the program is installed. The organisation is responsible for making and keeping backups (the program makes one every day; also set up an external copy, for example to Google Drive).
5. AI agents and external services. If you connect AI assistants, FTP publishing, social media or email, the data passing through them is subject to those services' terms. Review their data processing agreements.
6. No warranty. The program is provided “as is”, without any warranty of operation, fitness for a particular purpose or freedom from errors. The authors and the Associació I ara qué? accept no liability for any damage, data loss, penalty or harm arising from its use.

By installing or using the program, you accept these terms.`,
};

/** Text complet per a l'idioma: condicions i, a continuació, la llicència MIT original (en anglès). */
export const textLlicencia = (idioma: IdiomaLlicencia) => `${TITOL_LLICENCIA[idioma]}\n\n${COS[idioma]}\n\n────────────────────────────────────────\n\n${MIT}\n`;
