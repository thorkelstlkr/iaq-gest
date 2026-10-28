// Novetats del programa (de la més recent a la més antiga).
import type { Text3 } from './tipus';

export interface Novetat {
  data: string;
  titol: Text3;
  punts: Text3[];
}

export const NOVETATS: Novetat[] = [
  {
    data: '2026-10-28',
    titol: { ca: 'Nou nom, icona i logotip: IAQ Gest', es: 'Nuevo nombre, icono y logotipo: IAQ Gest', en: 'New name, icon and logo: IAQ Gest' },
    punts: [
      { ca: 'El programa passa a dir-se IAQ Gest, amb icona i logotip nous. Les dades de les instal·lacions anteriors es traslladen soles a la carpeta nova.', es: 'El programa pasa a llamarse IAQ Gest, con icono y logotipo nuevos. Los datos de las instalaciones anteriores se trasladan solos a la carpeta nueva.', en: 'The program is now called IAQ Gest, with a new icon and logo. Data from earlier installations moves to the new folder automatically.' },
      { ca: 'Al mòbil, el menú queda en una barra superior prima i s’obre a pantalla completa.', es: 'En el móvil, el menú queda en una barra superior fina y se abre a pantalla completa.', en: 'On mobile, the menu sits in a slim top bar and opens full screen.' },
    ],
  },
  {
    data: '2026-10-20',
    titol: { ca: 'Instal·lador per a Windows, Mac i Linux', es: 'Instalador para Windows, Mac y Linux', en: 'Installer for Windows, Mac and Linux' },
    punts: [
      { ca: 'El programa s’instal·la com qualsevol altre, sense haver d’instal·lar Node.js ni res més, i s’obre en la seva pròpia finestra.', es: 'El programa se instala como cualquier otro, sin tener que instalar Node.js ni nada más, y se abre en su propia ventana.', en: 'The program installs like any other, with no need to install Node.js or anything else, and opens in its own window.' },
      { ca: 'Una icona al costat del rellotge el manté en marxa en tancar la finestra, i permet obrir-lo en engegar l’ordinador i obrir la carpeta de dades.', es: 'Un icono junto al reloj lo mantiene en marcha al cerrar la ventana, y permite abrirlo al encender el ordenador y abrir la carpeta de datos.', en: 'An icon next to the clock keeps it running when you close the window, and lets you start it with the computer and open the data folder.' },
      { ca: 'Assistent inicial: idioma, llicència, dades de l’entitat, administrador i usuaris de la junta amb les seves contrasenyes inicials.', es: 'Asistente inicial: idioma, licencia, datos de la entidad, administrador y usuarios de la junta con sus contraseñas iniciales.', en: 'Setup wizard: language, licence, organisation details, administrator and board users with their initial passwords.' },
    ],
  },
  {
    data: '2026-10-20',
    titol: { ca: 'Guia per treballar des de casa', es: 'Guía para trabajar desde casa', en: 'Working-from-home guide' },
    punts: [
      { ca: 'Nou article d’ajuda: com fer que cada membre de la junta faci servir el programa des de casa amb Tailscale.', es: 'Nuevo artículo de ayuda: cómo hacer que cada miembro de la junta use el programa desde casa con Tailscale.', en: 'New help article: how each board member can use the program from home with Tailscale.' },
    ],
  },
  {
    data: '2026-10-20',
    titol: { ca: 'Còpies de seguretat a Google Drive', es: 'Copias de seguridad en Google Drive', en: 'Backups to Google Drive' },
    punts: [
      { ca: 'El programa detecta Google Drive, OneDrive i Dropbox en aquest ordinador i, amb un clic, hi desa cada còpia diària.', es: 'El programa detecta Google Drive, OneDrive y Dropbox en este ordenador y, con un clic, guarda allí cada copia diaria.', en: 'The program detects Google Drive, OneDrive and Dropbox on this computer and, with one click, saves every daily backup there.' },
    ],
  },
  {
    data: '2026-10-18',
    titol: { ca: 'Agents d’IA des de fora', es: 'Agentes de IA desde fuera', en: 'AI agents remotely' },
    punts: [
      { ca: 'Configuració → Accés remot: obrir el programa a la xarxa privada (Tailscale) o local.', es: 'Configuración → Acceso remoto: abrir el programa a la red privada (Tailscale) o local.', en: 'Settings → Remote access: open the program to your private (Tailscale) or local network.' },
      { ca: 'Entrada separada per als agents, pensada per exposar-la amb un túnel sense exposar el programa.', es: 'Entrada separada para los agentes, pensada para exponerla con un túnel sin exponer el programa.', en: 'Separate entrance for agents, designed to be exposed through a tunnel without exposing the program.' },
      { ca: 'Connexió de Claude (web i mòbil) i ChatGPT per OAuth amb un codi de connexió d’un sol ús.', es: 'Conexión de Claude (web y móvil) y ChatGPT por OAuth con un código de conexión de un solo uso.', en: 'Claude (web and mobile) and ChatGPT connect via OAuth with a one-time connection code.' },
    ],
  },
  {
    data: '2026-10-18',
    titol: { ca: 'Menú per categories i ajuda', es: 'Menú por categorías y ayuda', en: 'Categorised menu and help' },
    punts: [
      { ca: 'El menú lateral s’agrupa en categories plegables.', es: 'El menú lateral se agrupa en categorías plegables.', en: 'The side menu is grouped into collapsible categories.' },
      { ca: 'Nou apartat d’ajuda: manual d’usuari, cerca, preguntes freqüents, glossari i informació del programa.', es: 'Nuevo apartado de ayuda: manual de usuario, búsqueda, preguntas frecuentes, glosario e información del programa.', en: 'New help section: user manual, search, FAQ, glossary and program information.' },
      { ca: 'Botó «?» a cada pantalla per anar directament a la seva ajuda.', es: 'Botón «?» en cada pantalla para ir directamente a su ayuda.', en: '“?” button on every screen that opens its help.' },
    ],
  },
  {
    data: '2026-10-18',
    titol: { ca: 'Agents d’IA personals', es: 'Agentes de IA personales', en: 'Personal AI agents' },
    punts: [
      { ca: 'Cada persona pot connectar el seu assistent d’IA (Claude, ChatGPT, Gemini, Copilot…) al seu compte.', es: 'Cada persona puede conectar su asistente de IA (Claude, ChatGPT, Gemini, Copilot…) a su cuenta.', en: 'Everyone can connect their own AI assistant (Claude, ChatGPT, Gemini, Copilot…) to their account.' },
      { ca: 'Les accions importants queden com a propostes que s’aproven amb un clic; l’agent mai no veu dades sensibles.', es: 'Las acciones importantes quedan como propuestas que se aprueban con un clic; el agente nunca ve datos sensibles.', en: 'Important actions become proposals approved with one click; the agent never sees sensitive data.' },
    ],
  },
  {
    data: '2026-10-18',
    titol: { ca: 'Disseny de la web personalitzable', es: 'Diseño de la web personalizable', en: 'Customisable website design' },
    punts: [
      { ca: 'Temes, colors, fonts, capçalera, peu, logotip, imatge de portada, ordre dels blocs i del menú, amb previsualització en directe.', es: 'Temas, colores, fuentes, cabecera, pie, logotipo, imagen de portada, orden de los bloques y del menú, con vista previa en directo.', en: 'Themes, colours, fonts, header, footer, logo, cover image, block and menu order, with live preview.' },
    ],
  },
  {
    data: '2026-10-18',
    titol: { ca: 'Voluntariat, subvencions, fiscalitat i donatius', es: 'Voluntariado, subvenciones, fiscalidad y donativos', en: 'Volunteering, grants, tax and donations' },
    punts: [
      { ca: 'Voluntariat (Llei 45/2015), col·laboradors i convenis.', es: 'Voluntariado (Ley 45/2015), colaboradores y convenios.', en: 'Volunteering (Law 45/2015), partners and agreements.' },
      { ca: 'Subvencions amb compte justificatiu i justificants adjunts als moviments.', es: 'Subvenciones con cuenta justificativa y justificantes adjuntos a los movimientos.', en: 'Grants with justification report and receipts attached to movements.' },
      { ca: 'Tercers i retencions (models 111, 115, 190, 180, 347) i importació d’extractes bancaris.', es: 'Terceros y retenciones (modelos 111, 115, 190, 180, 347) e importación de extractos bancarios.', en: 'Third parties and withholdings (forms 111, 115, 190, 180, 347) and bank statement import.' },
      { ca: 'Donatius, certificats i model 182; inventari; calendari d’obligacions al tauler.', es: 'Donativos, certificados y modelo 182; inventario; calendario de obligaciones en el panel.', en: 'Donations, certificates and form 182; inventory; obligations calendar on the dashboard.' },
    ],
  },
  {
    data: '2026-10-17',
    titol: { ca: 'Òrgans de govern, tresoreria i seguretat', es: 'Órganos de gobierno, tesorería y seguridad', en: 'Governance, treasury and security' },
    punts: [
      { ca: 'Assemblees i juntes, llibre d’actes, càrrecs i certificats.', es: 'Asambleas y juntas, libro de actas, cargos y certificados.', en: 'General meetings and board meetings, minutes book, officers and certificates.' },
      { ca: 'Registre de socis amb històric d’altes i baixes, categories i importació des de full de càlcul.', es: 'Registro de socios con histórico de altas y bajas, categorías e importación desde hoja de cálculo.', en: 'Member register with join/leave history, categories and spreadsheet import.' },
      { ca: 'Remeses SEPA, pressupost, tancament de l’exercici i comprovació del model 200.', es: 'Remesas SEPA, presupuesto, cierre del ejercicio y comprobación del modelo 200.', en: 'SEPA direct debits, budget, year-end closing and corporate tax (form 200) check.' },
      { ca: 'Inscripcions amb places i llista d’espera, i indicadors d’impacte.', es: 'Inscripciones con plazas y lista de espera, e indicadores de impacto.', en: 'Registrations with places and waiting list, and impact indicators.' },
      { ca: 'Còpies de seguretat automàtiques, contrasenyes xifrades i bloqueig d’accessos.', es: 'Copias de seguridad automáticas, contraseñas cifradas y bloqueo de accesos.', en: 'Automatic backups, encrypted passwords and login lockout.' },
    ],
  },
  {
    data: '2026-10-16',
    titol: { ca: 'Multilingüe i editor visual', es: 'Multilingüe y editor visual', en: 'Multilingual and visual editor' },
    punts: [
      { ca: 'El programa en català, castellà i anglès.', es: 'El programa en catalán, castellano e inglés.', en: 'The program in Catalan, Spanish and English.' },
      { ca: 'Editor de text visual per a notícies, pàgines i activitats.', es: 'Editor de texto visual para noticias, páginas y actividades.', en: 'Visual text editor for news, pages and activities.' },
    ],
  },
  {
    data: '2026-10-16',
    titol: { ca: 'CRM, web, xarxes, protecció de dades i facturació', es: 'CRM, web, redes, protección de datos y facturación', en: 'CRM, website, social media, data protection and invoicing' },
    punts: [
      { ca: 'Seguiment de socis i interessats, tasques i comunicacions.', es: 'Seguimiento de socios e interesados, tareas y comunicaciones.', en: 'Member and prospect follow-up, tasks and communications.' },
      { ca: 'Web pública generada pel programa i publicada per FTP; publicació a xarxes socials.', es: 'Web pública generada por el programa y publicada por FTP; publicación en redes sociales.', en: 'Public website generated by the program and published by FTP; social media posting.' },
      { ca: 'Compliment del RGPD i facturació VERI*FACTU.', es: 'Cumplimiento del RGPD y facturación VERI*FACTU.', en: 'GDPR compliance and VERI*FACTU invoicing.' },
    ],
  },
  {
    data: '2026-09-26',
    titol: { ca: 'Primera versió', es: 'Primera versión', en: 'First version' },
    punts: [{ ca: 'Socis, quotes, comptabilitat, activitats i informes.', es: 'Socios, cuotas, contabilidad, actividades e informes.', en: 'Members, fees, accounting, activities and reports.' }],
  },
];
