// Ajuda: articles, preguntes i termes del domini «persones» (primers passos, persones i govern).
import type { Article, Pregunta, Terme } from '../tipus';

export const ARTICLES: Article[] = [
  // ---------------------------------------------------------------- Primers passos
  {
    id: 'organitzacio-programa',
    seccio: 'primers-passos',
    titol: {
      ca: 'Com està organitzat el programa',
      es: 'Cómo está organizado el programa',
      en: 'How the program is organised',
    },
    resum: {
      ca: 'El menú per categories, el tauler, el selector d\'exercici i d\'idioma, el botó «?» i els perfils.',
      es: 'El menú por categorías, el panel, el selector de ejercicio y de idioma, el botón «?» y los perfiles.',
      en: 'The menu by categories, the dashboard, the year and language selectors, the «?» button and profiles.',
    },
    paraules: ['menú', 'menu', 'navegació', 'navegación', 'navigation', 'exercici', 'ejercicio', 'year', 'idioma', 'language', 'tauler', 'panel', 'dashboard', 'ajuda', 'help'],
    cos: {
      ca: `La primera vegada que s'obre, l'[assistent inicial](/ajuda/assistent-inicial) deixa creats l'entitat, el vostre usuari d'administració i els usuaris de la junta. A partir d'aquí, el programa s'organitza així.

# El menú lateral

A l'esquerra hi ha el menú, agrupat per categories:

- **Persones**: Socis, Interessats, Seguiment, Comunicacions, Voluntariat i Col·laboradors.
- **Activitats i difusió**: Activitats, Web i Xarxes socials.
- **Economia**: Quotes, Comptabilitat, Tresoreria, Facturació, Subvencions, Donatius i Inventari.
- **Govern i compliment**: Òrgans de govern, Protecció de dades i Informes.
- **Eines i ajuda**: El meu agent d'IA, Configuració i Ajuda.

Cada persona només veu les parts que li permet el seu perfil (vegeu [Perfils i permisos](/ajuda/perfils-i-permisos)). Si una categoria no surt, és que el vostre perfil no hi té accés.

# El tauler

La primera pantalla és el **Tauler**: socis actius, quotes pendents, saldo dels comptes, properes activitats, tasques i avisos. És un resum per saber d'un cop d'ull com va l'entitat; en trobareu el detall a [El tauler](/ajuda/tauler).

# L'exercici i l'idioma

A la part de baix del menú hi ha el desplegable **Exercici**. Indica l'any amb què treballeu: les quotes, la comptabilitat, les activitats i els informes mostren les dades d'aquest any. El programa recorda l'últim exercici triat.

Al costat del vostre nom hi ha el selector d'**Idioma** (català, castellà o anglès). L'elecció es desa com a preferència vostra: la propera vegada que entreu ja sortirà en aquest idioma. El botó **Surt** tanca la sessió.

# El botó «?»

A dalt de cada pantalla hi ha un botó **?** que obre directament l'article d'ajuda d'aquella pantalla. Des de l'**Ajuda** també podeu cercar per paraules, consultar les preguntes freqüents i el glossari.

> Consell: si no sabeu on és una cosa, escriviu-la al cercador de l'Ajuda (per exemple «assemblea» o «carnet»).`,
      es: `La primera vez que se abre, el [asistente inicial](/ajuda/assistent-inicial) deja creados la entidad, vuestro usuario de administración y los usuarios de la junta. A partir de ahí, el programa se organiza así.

# El menú lateral

A la izquierda está el menú, agrupado por categorías:

- **Personas**: Socios, Interesados, Seguimiento, Comunicaciones, Voluntariado y Colaboradores.
- **Actividades y difusión**: Actividades, Web y Redes sociales.
- **Economía**: Cuotas, Contabilidad, Tesorería, Facturación, Subvenciones, Donativos e Inventario.
- **Gobierno y cumplimiento**: Órganos de gobierno, Protección de datos e Informes.
- **Herramientas y ayuda**: Mi agente de IA, Configuración y Ayuda.

Cada persona solo ve las partes que le permite su perfil (véase [Perfiles y permisos](/ajuda/perfils-i-permisos)). Si una categoría no aparece, es que vuestro perfil no tiene acceso.

# El panel

La primera pantalla es el **Panel**: socios activos, cuotas pendientes, saldo de las cuentas, próximas actividades, tareas y avisos. Es un resumen para saber de un vistazo cómo va la entidad; encontraréis el detalle en [El panel](/ajuda/tauler).

# El ejercicio y el idioma

En la parte inferior del menú está el desplegable **Ejercicio**. Indica el año con el que trabajáis: las cuotas, la contabilidad, las actividades y los informes muestran los datos de ese año. El programa recuerda el último ejercicio elegido.

Junto a vuestro nombre está el selector de **Idioma** (catalán, castellano o inglés). La elección se guarda como preferencia vuestra: la próxima vez que entréis ya saldrá en ese idioma. El botón **Salir** cierra la sesión.

# El botón «?»

Arriba de cada pantalla hay un botón **?** que abre directamente el artículo de ayuda de esa pantalla. Desde la **Ayuda** también podéis buscar por palabras y consultar las preguntas frecuentes y el glosario.

> Consejo: si no sabéis dónde está algo, escribidlo en el buscador de la Ayuda (por ejemplo «asamblea» o «carné»).`,
      en: `The first time the program opens, the [setup wizard](/ajuda/assistent-inicial) creates the organisation, your administrator user and the board members' users. From then on, the program is organised as follows.

# The side menu

The menu on the left is grouped by categories:

- **People**: Members, Prospects, Follow-up, Communications, Volunteering and Partners.
- **Activities and outreach**: Activities, Web and Social media.
- **Finance**: Fees, Accounts, Treasury, Invoicing, Grants, Donations and Inventory.
- **Governance and compliance**: Governing bodies, Data protection and Reports.
- **Tools and help**: My AI agent, Settings and Help.

Each person only sees the parts their profile allows (see [Profiles and permissions](/ajuda/perfils-i-permisos)). If a category is missing, your profile has no access to it.

# The dashboard

The first screen is the **Dashboard**: active members, unpaid fees, account balances, upcoming activities, tasks and alerts. It is a summary to see at a glance how the organisation is doing; details in [The dashboard](/ajuda/tauler).

# Financial year and language

At the bottom of the menu there is the **Financial year** drop-down. It sets the year you are working with: fees, accounts, activities and reports show that year's data. The program remembers the last year you chose.

Next to your name is the **Language** selector (Catalan, Spanish or English). Your choice is saved as your preference, so next time you sign in it will already be in that language. **Sign out** ends the session.

# The «?» button

At the top of every screen there is a **?** button that opens the help article for that screen. From **Help** you can also search by keyword and read the FAQs and the glossary.

> Tip: if you cannot find something, type it in the Help search box (for example «meeting» or «card»).`,
    },
  },
  {
    id: 'primers-passos-entitat-nova',
    seccio: 'primers-passos',
    titol: {
      ca: 'Primers passos per a una entitat nova',
      es: 'Primeros pasos para una entidad nueva',
      en: 'First steps for a new organisation',
    },
    resum: {
      ca: 'Què cal configurar el primer dia: dades de l\'entitat, logotip, finalitats, quotes, comptes, usuaris i socis.',
      es: 'Qué hay que configurar el primer día: datos de la entidad, logotipo, finalidades, cuotas, cuentas, usuarios y socios.',
      en: 'What to set up on day one: organisation details, logo, purposes, fees, accounts, users and members.',
    },
    paraules: ['començar', 'empezar', 'start', 'inici', 'configurar', 'setup', 'instal·lació', 'instalación', 'logotip', 'logo', 'finalitats', 'importar'],
    cos: {
      ca: `El primer cop que s'obre el programa, l'[assistent inicial](/ajuda/assistent-inicial) us demana el nom i les dades bàsiques de l'entitat, crea el vostre usuari d'administració i els usuaris de les persones de la junta. Després, completeu la resta seguint aquest ordre. Els passos 1 a 4 els ha de fer una persona amb el perfil **Administració**.

1. **Dades de l'entitat.** A [Configuració](/configuracio), pestanya **Entitat**, ompliu **Dades de l'entitat**: nom, NIF, adreça, número del Registre d'Associacions… Aquestes dades surten als certificats, les actes, els carnets i els rebuts. Amb **Puja el logotip** hi afegiu el logotip.
2. **Finalitats estatutàries.** A la mateixa pestanya, copieu les finalitats dels vostres estatuts. Serveixen per classificar les activitats i per a la memòria anual.
3. **Quotes i comptes.** A la pestanya **Quotes i comptes**, creeu els **Tipus de quota** (per exemple «General», «Jove», «Familiar») amb l'import anual, els **Comptes de tresoreria** (caixa, banc) i revisau les **Categories d'ingressos i despeses**. Vegeu [Quotes](/ajuda/quotes) i [Comptabilitat](/ajuda/comptabilitat).
4. **Correu i usuaris.** A **Correu** configurau el compte per enviar comunicacions i convocatòries. A **Usuaris** revisau els usuaris creats amb l'assistent i creau-ne per a qualsevol altra persona de la junta que hagi de treballar amb el programa.
5. **Categories de soci.** A [Socis](/socis), botó **Categories**, definiu quines categories teniu (numerari, d'honor, juvenil…) i si voten i paguen quota. Vegeu [Categories de soci i dret de vot](/ajuda/categories-i-dret-de-vot).
6. **Socis.** Si ja teniu la llista en un full de càlcul, importau-la ([Importar socis d'un full de càlcul](/ajuda/importar-socis)). Si no, donau-los d'alta un per un.
7. **Junta i estatuts.** A [Òrgans de govern](/governanca), pestanya **Junta directiva**, registrau els càrrecs actuals, i amb **Requisits dels estatuts** indicau els dies d'antelació i el quòrum de les assemblees.
8. **Protecció de dades.** A [Protecció de dades](/proteccio-dades), pestanya **Configuració**, revisau el correu per exercir els drets i els terminis de conservació.

> Consell: feu una **Còpia de seguretat** (a Configuració) quan hàgiu acabat la configuració inicial. Més detalls a [Configuració](/ajuda/configuracio).`,
      es: `La primera vez que se abre el programa, el [asistente inicial](/ajuda/assistent-inicial) os pide el nombre y los datos básicos de la entidad, crea vuestro usuario de administración y los usuarios de las personas de la junta. Después, completad el resto siguiendo este orden. Los pasos 1 a 4 debe hacerlos una persona con el perfil **Administración**.

1. **Datos de la entidad.** En [Configuración](/configuracio), pestaña **Entidad**, rellenad **Datos de la entidad**: nombre, NIF, dirección, número del Registro de Asociaciones… Estos datos aparecen en los certificados, las actas, los carnés y los recibos. Con **Subir el logotipo** añadís el logotipo.
2. **Finalidades estatutarias.** En la misma pestaña, copiad las finalidades de vuestros estatutos. Sirven para clasificar las actividades y para la memoria anual.
3. **Cuotas y cuentas.** En la pestaña **Cuotas y cuentas**, cread los **Tipos de cuota** (por ejemplo «General», «Joven», «Familiar») con el importe anual, las **Cuentas de tesorería** (caja, banco) y revisad las **Categorías de ingresos y gastos**. Véase [Cuotas](/ajuda/quotes) y [Contabilidad](/ajuda/comptabilitat).
4. **Correo y usuarios.** En **Correo** configurad la cuenta para enviar comunicaciones y convocatorias. En **Usuarios** revisad los usuarios creados con el asistente y cread otros para cualquier persona de la junta que deba trabajar con el programa.
5. **Categorías de socio.** En [Socios](/socis), botón **Categorías**, definid qué categorías tenéis (numerario, de honor, juvenil…) y si votan y pagan cuota. Véase [Categorías de socio y derecho de voto](/ajuda/categories-i-dret-de-vot).
6. **Socios.** Si ya tenéis la lista en una hoja de cálculo, importadla ([Importar socios de una hoja de cálculo](/ajuda/importar-socis)). Si no, dadlos de alta uno a uno.
7. **Junta y estatutos.** En [Órganos de gobierno](/governanca), pestaña **Junta directiva**, registrad los cargos actuales, y con **Requisitos de los estatutos** indicad los días de antelación y el quórum de las asambleas.
8. **Protección de datos.** En [Protección de datos](/proteccio-dades), pestaña **Configuración**, revisad el correo para ejercer los derechos y los plazos de conservación.

> Consejo: haced una **Copia de seguridad** (en Configuración) cuando hayáis terminado la configuración inicial. Más detalles en [Configuración](/ajuda/configuracio).`,
      en: `The first time the program opens, the [setup wizard](/ajuda/assistent-inicial) asks for the organisation's name and basic details, and creates your administrator user and the board members' users. Then complete the rest in this order. Steps 1 to 4 must be done by someone with the **Administration** profile.

1. **Organisation details.** In [Settings](/configuracio), **Organisation** tab, fill in **Organisation details**: name, tax ID (NIF), address, Register of Associations number… These appear on certificates, minutes, membership cards and receipts. Use **Upload logo** to add your logo.
2. **Statutory purposes.** In the same tab, copy the purposes from your statutes. They are used to classify activities and for the annual report.
3. **Fees and accounts.** In the **Fees and accounts** tab, create the **Fee type** entries (for example «Standard», «Youth», «Family») with the annual amount, the **Cash and bank accounts**, and review the **Income and expense categories**. See [Fees](/ajuda/quotes) and [Accounts](/ajuda/comptabilitat).
4. **Email and users.** In **Email**, set up the account used to send communications and meeting notices. In **Users**, check the users created by the wizard and add any other board member who will work with the program.
5. **Member categories.** In [Members](/socis), **Categories** button, define your categories (full, honorary, youth…) and whether they vote and pay a fee. See [Member categories and voting rights](/ajuda/categories-i-dret-de-vot).
6. **Members.** If you already have a spreadsheet, import it ([Importing members from a spreadsheet](/ajuda/importar-socis)). Otherwise add them one by one.
7. **Board and statutes.** In [Governing bodies](/governanca), **Board** tab, record the current positions, and with **Statutory requirements** set the days of notice and the quorum for general meetings.
8. **Data protection.** In [Data protection](/proteccio-dades), **Settings** tab, check the email for exercising rights and the retention periods.

> Tip: make a **Backup** (in Settings) once the initial setup is finished. More in [Settings](/ajuda/configuracio).`,
    },
  },
  {
    id: 'perfils-i-permisos',
    seccio: 'primers-passos',
    titol: { ca: 'Perfils i permisos', es: 'Perfiles y permisos', en: 'Profiles and permissions' },
    resum: {
      ca: 'Què pot fer cada perfil (Administració, Junta/Secretaria, Tresoreria, Comunicació) i com es creen els usuaris.',
      es: 'Qué puede hacer cada perfil (Administración, Junta/Secretaría, Tesorería, Comunicación) y cómo se crean los usuarios.',
      en: 'What each profile can do (Administration, Board/Secretary, Treasurer, Communications) and how users are created.',
    },
    paraules: ['usuari', 'usuario', 'user', 'contrasenya', 'contraseña', 'password', 'rol', 'role', 'accés', 'acceso', 'access', 'perfil', 'profile'],
    cos: {
      ca: `Cada persona entra al programa amb el seu usuari i contrasenya. El **perfil** de l'usuari decideix què veu i què pot fer. Així es compleix el principi de mínim accés del RGPD: qui no necessita dades personals no les veu.

# Els quatre perfils

- **Administració**: accés total, inclosos els usuaris i la configuració. Normalment, una o dues persones (la secretaria o qui porta el programa).
- **Junta / Secretaria**: socis, quotes, comptabilitat, activitats, web i informes. No pot gestionar usuaris ni configuració.
- **Tresoreria**: quotes, comptabilitat i informes. No gestiona els socis.
- **Comunicació**: web, notícies i activitats, pensat per a qui porta les xarxes. No veu dades personals ni comptes.

Algunes accions delicades estan reservades a Administració encara que la pantalla la vegin altres perfils: per exemple, el botó **Elimina** de la fitxa d'un soci o modificar els terminis de conservació a Protecció de dades.

# Com crear un usuari

1. Entrau amb un usuari d'Administració a [Configuració](/configuracio) → **Usuaris**.
2. A **Nou usuari**, escriviu el **Nom**, l'**Usuari** (amb què entrarà) i una **Contrasenya** de 8 caràcters o més.
3. Triau el **Perfil** i premeu **Crea**.
4. Comunicau la contrasenya a la persona de manera privada i demanau-li que la canviï a **La meva contrasenya**.

Quan algú deixa la junta, desactivau-ne l'usuari o canviau-li el perfil: no compartiu mai usuaris entre persones, perquè el [registre d'activitat](/ajuda/proteccio-dades) ha de mostrar qui ha fet cada cosa.

> Compte: un usuari d'Administració pot veure i modificar-ho tot. Doneu aquest perfil només a qui realment el necessiti.

# Agent d'IA personal

Cada usuari pot connectar el seu propi assistent d'intel·ligència artificial amb una clau personal, que té els mateixos permisos que el seu perfil. Ho trobareu explicat a [El meu agent d'IA](/ajuda/agent-ia).`,
      es: `Cada persona entra en el programa con su usuario y contraseña. El **perfil** del usuario decide qué ve y qué puede hacer. Así se cumple el principio de mínimo acceso del RGPD: quien no necesita datos personales no los ve.

# Los cuatro perfiles

- **Administración**: acceso total, incluidos los usuarios y la configuración. Normalmente, una o dos personas (la secretaría o quien lleva el programa).
- **Junta / Secretaría**: socios, cuotas, contabilidad, actividades, web e informes. No puede gestionar usuarios ni configuración.
- **Tesorería**: cuotas, contabilidad e informes. No gestiona los socios.
- **Comunicación**: web, noticias y actividades, pensado para quien lleva las redes. No ve datos personales ni cuentas.

Algunas acciones delicadas están reservadas a Administración aunque la pantalla la vean otros perfiles: por ejemplo, el botón **Eliminar** de la ficha de un socio o modificar los plazos de conservación en Protección de datos.

# Cómo crear un usuario

1. Entrad con un usuario de Administración en [Configuración](/configuracio) → **Usuarios**.
2. En **Nuevo usuario**, escribid el **Nombre**, el **Usuario** (con el que entrará) y una **Contraseña** de 8 caracteres o más.
3. Elegid el **Perfil** y pulsad **Crear**.
4. Comunicad la contraseña a la persona de forma privada y pedidle que la cambie en **Mi contraseña**.

Cuando alguien deja la junta, desactivad su usuario o cambiadle el perfil: no compartáis nunca usuarios entre personas, porque el [registro de actividad](/ajuda/proteccio-dades) debe mostrar quién ha hecho cada cosa.

> Cuidado: un usuario de Administración puede ver y modificarlo todo. Dad este perfil solo a quien realmente lo necesite.

# Agente de IA personal

Cada usuario puede conectar su propio asistente de inteligencia artificial con una clave personal, que tiene los mismos permisos que su perfil. Lo encontraréis explicado en [Mi agente de IA](/ajuda/agent-ia).`,
      en: `Everyone signs in with their own user name and password. The user's **profile** decides what they see and can do. This follows the GDPR principle of minimum access: people who do not need personal data do not see it.

# The four profiles

- **Administration**: full access, including users and settings. Usually one or two people (the secretary or whoever runs the program).
- **Board / Secretary**: members, fees, accounts, activities, web and reports. Cannot manage users or settings.
- **Treasurer**: fees, accounts and reports. Does not manage members.
- **Communications**: web, news and activities, meant for whoever runs social media. Sees no personal data or accounts.

Some sensitive actions are reserved for Administration even when other profiles can see the screen: for example the **Delete** button on a member record, or changing retention periods in Data protection.

# Creating a user

1. Sign in as an Administration user and go to [Settings](/configuracio) → **Users**.
2. Under **New user**, type the **Name**, the **User name** they will sign in with, and a **Password** of 8 characters or more.
3. Choose the **Profile** and press **Create**.
4. Give the password to the person privately and ask them to change it under **My password**.

When someone leaves the board, deactivate their user or change their profile. Never share users between people: the [activity log](/ajuda/proteccio-dades) must show who did what.

> Warning: an Administration user can see and change everything. Only give this profile to people who really need it.

# Personal AI agent

Each user can connect their own AI assistant with a personal key, which has the same permissions as their profile. See [My AI agent](/ajuda/agent-ia).`,
    },
  },
  {
    id: 'feina-de-cada-carrec',
    seccio: 'primers-passos',
    titol: { ca: 'La feina de cada càrrec', es: 'El trabajo de cada cargo', en: 'What each board role does' },
    resum: {
      ca: 'Què fan habitualment la presidència, la secretaria, la tresoreria i les vocalies amb el programa al llarg de l\'any.',
      es: 'Qué hacen habitualmente la presidencia, la secretaría, la tesorería y las vocalías con el programa a lo largo del año.',
      en: 'What the president, secretary, treasurer and board members usually do with the program during the year.',
    },
    paraules: ['president', 'presidenta', 'secretari', 'secretària', 'secretario', 'tresorer', 'tesorero', 'treasurer', 'vocal', 'calendari', 'calendario', 'any', 'tasques'],
    cos: {
      ca: `Cada entitat s'organitza a la seva manera, però aquest és el repartiment habitual en una associació petita.

# Presidència

- Representa l'entitat i dona el **vist i plau** als certificats i a les actes que signa la secretaria.
- Convoca (amb la secretaria) l'assemblea i la junta: vegeu [Òrgans de govern](/ajuda/organs-de-govern).
- Consulta el [Tauler](/) i els [Informes](/ajuda/informes) per seguir com van els socis i els comptes.

# Secretaria

És el càrrec que més fa servir el programa:

- Porta el [registre de socis](/ajuda/socis): altes, baixes, fulls d'inscripció i carnets.
- Prepara les reunions, envia les convocatòries, passa llista i redacta les actes al [Llibre d'actes](/ajuda/llibre-actes).
- Expedeix els [Certificats](/ajuda/certificats).
- Manté la [Junta directiva](/ajuda/junta-directiva) al dia i comunica els canvis al Registre d'Associacions.
- Atén les sol·licituds de [protecció de dades](/ajuda/proteccio-dades).

# Tresoreria

- Genera i cobra les [quotes](/ajuda/quotes) i fa les remeses bancàries.
- Apunta ingressos i despeses a la [Comptabilitat](/ajuda/comptabilitat) i quadra els comptes amb el banc.
- Prepara el pressupost i el tancament de l'exercici per a l'assemblea.

# Vocalies

Les persones vocals solen coordinar [activitats](/ajuda/activitats), [voluntariat](/ajuda/voluntariat) o comunicació. Amb el perfil adequat poden inscriure participants, apuntar hores de voluntariat o publicar al [web](/ajuda/web).

# Calendari orientatiu de l'any

1. **Inici d'any**: generar les quotes del nou exercici i revisar les baixes.
2. **Primer semestre**: assemblea general ordinària (aprovació de comptes, pressupost i memòria). Després, aprovar i tancar l'acta.
3. **Tot l'any**: altes de socis, activitats, comunicacions i seguiment.
4. **Final d'any**: tancament comptable, revisió de la conservació de dades i, si toca, renovació de càrrecs.

> Consell: la LO 1/2002 obliga a dur la relació actualitzada de socis, la comptabilitat i el llibre d'actes. Si cada càrrec fa la seva part al programa, aquestes obligacions queden cobertes sense feina extra.`,
      es: `Cada entidad se organiza a su manera, pero este es el reparto habitual en una asociación pequeña.

# Presidencia

- Representa a la entidad y da el **visto bueno** a los certificados y actas que firma la secretaría.
- Convoca (con la secretaría) la asamblea y la junta: véase [Órganos de gobierno](/ajuda/organs-de-govern).
- Consulta el [Panel](/) y los [Informes](/ajuda/informes) para seguir cómo van los socios y las cuentas.

# Secretaría

Es el cargo que más usa el programa:

- Lleva el [registro de socios](/ajuda/socis): altas, bajas, hojas de inscripción y carnés.
- Prepara las reuniones, envía las convocatorias, pasa lista y redacta las actas en el [Libro de actas](/ajuda/llibre-actes).
- Expide los [Certificados](/ajuda/certificats).
- Mantiene la [Junta directiva](/ajuda/junta-directiva) al día y comunica los cambios al Registro de Asociaciones.
- Atiende las solicitudes de [protección de datos](/ajuda/proteccio-dades).

# Tesorería

- Genera y cobra las [cuotas](/ajuda/quotes) y hace las remesas bancarias.
- Anota ingresos y gastos en la [Contabilidad](/ajuda/comptabilitat) y cuadra las cuentas con el banco.
- Prepara el presupuesto y el cierre del ejercicio para la asamblea.

# Vocalías

Las personas vocales suelen coordinar [actividades](/ajuda/activitats), [voluntariado](/ajuda/voluntariat) o comunicación. Con el perfil adecuado pueden inscribir participantes, anotar horas de voluntariado o publicar en la [web](/ajuda/web).

# Calendario orientativo del año

1. **Inicio de año**: generar las cuotas del nuevo ejercicio y revisar las bajas.
2. **Primer semestre**: asamblea general ordinaria (aprobación de cuentas, presupuesto y memoria). Después, aprobar y cerrar el acta.
3. **Todo el año**: altas de socios, actividades, comunicaciones y seguimiento.
4. **Final de año**: cierre contable, revisión de la conservación de datos y, si toca, renovación de cargos.

> Consejo: la LO 1/2002 obliga a llevar la relación actualizada de socios, la contabilidad y el libro de actas. Si cada cargo hace su parte en el programa, estas obligaciones quedan cubiertas sin trabajo extra.`,
      en: `Every organisation works its own way, but this is the usual split in a small association.

# President

- Represents the organisation and gives the **approval («vist i plau»)** on certificates and minutes signed by the secretary.
- Calls the general meeting and board meetings (with the secretary): see [Governing bodies](/ajuda/organs-de-govern).
- Checks the [Dashboard](/) and [Reports](/ajuda/informes) to follow members and finances.

# Secretary

The role that uses the program most:

- Keeps the [members register](/ajuda/socis): joining, leaving, membership forms and cards.
- Prepares meetings, sends notices, takes attendance and writes the minutes in the [Minutes book](/ajuda/llibre-actes).
- Issues [Certificates](/ajuda/certificats).
- Keeps the [Board](/ajuda/junta-directiva) up to date and notifies changes to the Register of Associations.
- Handles [data protection](/ajuda/proteccio-dades) requests.

# Treasurer

- Generates and collects [fees](/ajuda/quotes) and prepares bank direct debits.
- Records income and expenses in [Accounts](/ajuda/comptabilitat) and reconciles them with the bank.
- Prepares the budget and year-end accounts for the general meeting.

# Board members

Board members usually coordinate [activities](/ajuda/activitats), [volunteering](/ajuda/voluntariat) or communications. With the right profile they can register participants, record volunteering hours or publish on the [website](/ajuda/web).

# A typical year

1. **Start of the year**: generate the new year's fees and review leavers.
2. **First half**: ordinary general meeting (approval of accounts, budget and annual report). Then approve and close the minutes.
3. **All year**: new members, activities, communications and follow-up.
4. **End of the year**: closing the accounts, reviewing data retention and, when due, renewing board positions.

> Tip: Spanish law (LO 1/2002) requires an up-to-date list of members, accounts and a minutes book. If each role does its part in the program, these obligations are covered with no extra work.`,
    },
  },

  // ---------------------------------------------------------------- Persones
  {
    id: 'socis',
    seccio: 'persones',
    titol: { ca: 'La llista de socis', es: 'La lista de socios', en: 'The members list' },
    resum: {
      ca: 'Cercar i filtrar socis, veure qui té dret a vot, imprimir carnets i exportar la llista.',
      es: 'Buscar y filtrar socios, ver quién tiene derecho a voto, imprimir carnés y exportar la lista.',
      en: 'Searching and filtering members, seeing who can vote, printing cards and exporting the list.',
    },
    rutes: ['/socis'],
    paraules: ['soci', 'sòcia', 'socio', 'member', 'llistat', 'listado', 'list', 'filtre', 'filtro', 'filter', 'cerca', 'buscar', 'search', 'csv', 'excel', 'exportar', 'export', 'etiqueta', 'tag'],
    cos: {
      ca: `La pantalla [Socis](/socis) és el registre de les persones associades. La poden gestionar els perfils Administració i Junta / Secretaria.

# Cercar i filtrar

- El quadre **Cerca per nom, DNI, correu, telèfon o número…** troba un soci en escriure qualsevol d'aquestes dades.
- El primer desplegable tria l'estat: **Actius**, **Baixes**, **Tots**, **Sol·licituds d'admissió** o **Sol·licituds denegades**.
- També podeu filtrar per **Categoria** (o **Sense categoria**) i per **Etiqueta**, si n'heu creat.

A la taula es veu el número, el nom, l'edat, el contacte, la categoria, el tipus de quota i si la quota de l'any està pagada. La insígnia **sense vot** indica que la persona és menor d'edat o que la seva categoria no vota. A sota hi ha el total de socis i quants tenen dret a vot.

Feu clic en una fila per obrir la fitxa del soci (vegeu [Com donar d'alta un soci](/ajuda/alta-soci)).

# Botons de la capçalera

- **Llibre registre**: el llibre registre de socis obligatori, a qualsevol data ([Llibre registre de socis](/ajuda/llibre-registre-socis)).
- **Categories**: les categories de soci i el dret de vot ([Categories de soci i dret de vot](/ajuda/categories-i-dret-de-vot)).
- **Importa socis**: carregar socis des d'un full de càlcul ([Importar socis](/ajuda/importar-socis)).
- **Exporta CSV**: descarrega la llista que teniu en pantalla (segons l'estat triat) en un fitxer que s'obre amb Excel o LibreOffice.
- **+ Nou soci**: dona d'alta una persona.

El botó **Carnet** de cada fila imprimeix el carnet de soci d'aquella persona.

> Compte: un fitxer CSV exportat conté dades personals. Guardau-lo en un lloc segur, no l'envieu per correu sense necessitat i esborrau-lo quan ja no el necessiteu (RGPD, principi de confidencialitat).`,
      es: `La pantalla [Socios](/socis) es el registro de las personas asociadas. La pueden gestionar los perfiles Administración y Junta / Secretaría.

# Buscar y filtrar

- El cuadro **Busca por nombre, DNI, correo, teléfono o número…** encuentra a un socio al escribir cualquiera de estos datos.
- El primer desplegable elige el estado: **Activos**, **Bajas**, **Todos**, **Solicitudes de admisión** o **Solicitudes denegadas**.
- También podéis filtrar por **Categoría** (o **Sin categoría**) y por **Etiqueta**, si habéis creado alguna.

En la tabla se ve el número, el nombre, la edad, el contacto, la categoría, el tipo de cuota y si la cuota del año está pagada. La insignia **sin voto** indica que la persona es menor de edad o que su categoría no vota. Debajo aparece el total de socios y cuántos tienen derecho a voto.

Haced clic en una fila para abrir la ficha del socio (véase [Cómo dar de alta a un socio](/ajuda/alta-soci)).

# Botones de la cabecera

- **Libro registro**: el libro registro de socios obligatorio, en cualquier fecha ([Libro registro de socios](/ajuda/llibre-registre-socis)).
- **Categorías**: las categorías de socio y el derecho de voto ([Categorías de socio y derecho de voto](/ajuda/categories-i-dret-de-vot)).
- **Importar socios**: cargar socios desde una hoja de cálculo ([Importar socios](/ajuda/importar-socis)).
- **Exportar CSV**: descarga la lista que tenéis en pantalla (según el estado elegido) en un archivo que se abre con Excel o LibreOffice.
- **+ Nuevo socio**: da de alta a una persona.

El botón **Carné** de cada fila imprime el carné de socio de esa persona.

> Cuidado: un archivo CSV exportado contiene datos personales. Guardadlo en un lugar seguro, no lo enviéis por correo sin necesidad y borradlo cuando ya no lo necesitéis (RGPD, principio de confidencialidad).`,
      en: `The [Members](/socis) screen is the register of the people who belong to the association. It can be managed by the Administration and Board / Secretary profiles.

# Searching and filtering

- The **Search by name, ID, email, phone or number…** box finds a member as you type any of these.
- The first drop-down chooses the status: **Active**, **Former members**, **All**, **Membership applications** or **Rejected applications**.
- You can also filter by **Category** (or **No category**) and by **Tag**, if you have created any.

The table shows number, name, age, contact details, category, fee type and whether this year's fee is paid. The **no vote** badge means the person is under 18 or their category has no vote. Below the table you see the number of members and how many can vote.

Click a row to open the member record (see [How to add a member](/ajuda/alta-soci)).

# Header buttons

- **Register of members**: the legally required register, at any date ([Register of members](/ajuda/llibre-registre-socis)).
- **Categories**: member categories and voting rights ([Member categories and voting rights](/ajuda/categories-i-dret-de-vot)).
- **Import members**: load members from a spreadsheet ([Importing members](/ajuda/importar-socis)).
- **Export CSV**: downloads the list on screen (for the chosen status) as a file that opens in Excel or LibreOffice.
- **+ New member**: adds a person.

The **Card** button on each row prints that person's membership card.

> Warning: an exported CSV file contains personal data. Keep it somewhere safe, do not email it unless necessary and delete it when you no longer need it (GDPR confidentiality principle).`,
    },
  },
  {
    id: 'alta-soci',
    seccio: 'persones',
    titol: { ca: 'Com donar d\'alta un soci', es: 'Cómo dar de alta a un socio', en: 'How to add a member' },
    resum: {
      ca: 'Pas a pas: la fitxa del soci, la foto i el carnet, el full d\'inscripció, els consentiments i els menors.',
      es: 'Paso a paso: la ficha del socio, la foto y el carné, la hoja de inscripción, los consentimientos y los menores.',
      en: 'Step by step: the member record, photo and card, membership form, consents and minors.',
    },
    paraules: ['alta', 'nou soci', 'nuevo socio', 'new member', 'fitxa', 'ficha', 'record', 'foto', 'photo', 'carnet', 'carné', 'card', 'menor', 'minor', 'tutor', 'consentiment', 'consentimiento', 'consent', 'imatge', 'imagen', 'image', 'iban'],
    cos: {
      ca: `# Pas a pas

1. A [Socis](/socis), premeu **+ Nou soci**.
2. **Dades personals**: el programa proposa el **Núm. de soci** següent. Escriviu el nom, els llinatges, el DNI/NIE i la data de naixement. Amb **Afegeix una foto** hi posau la foto (es retalla en format carnet).
3. **Contacte**: telèfon, correu electrònic i adreça.
4. **Associació i quota**: la **Data d'alta**, la **Categoria** i el **Tipus de quota**. Si cobrau per domiciliació, l'IBAN (el programa en comprova els dígits).
5. **Protecció de dades**: marcau les caselles segons el que la persona hagi signat (vegeu més avall).
6. Premeu **Dona d'alta**.

Si els vostres estatuts diuen que la junta ha d'admetre els socis nous, marcau **Registra-ho com a sol·licitud d'admissió**: la persona no comptarà com a sòcia fins que la junta l'admeti (vegeu [Baixes, readmissions i admissions](/ajuda/baixa-i-readmissio)).

# El full d'inscripció i els consentiments

El RGPD obliga a informar cada persona de com es tracten les seves dades. A la fitxa, a l'apartat **Protecció de dades**, el botó **Full d'inscripció** genera el full amb la informació legal i les caselles de consentiment; imprimiu-lo amb **Imprimeix el full** i feu-lo signar. Després marcau:

- **Ha signat el full d'inscripció…**, amb la data i qui el signa.
- **Autoritza l'ús de la seva imatge…** només si ho ha acceptat.
- **Vol rebre comunicacions de l'entitat…**: si es desmarca, la persona queda fora de tots els enviaments (però continua rebent les convocatòries oficials).

# Menors d'edat

- Si la persona té menys de 18 anys, apareix el camp **Pare, mare o tutor/a legal**, que és obligatori. Els menors no tenen dret a vot.
- Si té menys de 14 anys, el consentiment l'ha de signar el pare, la mare o el tutor legal (art. 7 de la LOPDGDD); el programa ho fixa automàticament.

# El carnet i la resta de la fitxa

Amb **Imprimeix carnet** obteniu el carnet de soci amb la foto i el logotip (la plantilla es tria a Configuració → **Socis i carnet**). Més avall de la fitxa hi ha el **Seguiment** (etiquetes, tasques i contactes), l'**Historial de quotes**, la participació en activitats i els moviments vinculats.

> Consell: si us equivocau, corregiu les dades i premeu **Desa els canvis**. No elimineu un soci que se'n va: donau-lo de baixa.`,
      es: `# Paso a paso

1. En [Socios](/socis), pulsad **+ Nuevo socio**.
2. **Datos personales**: el programa propone el **Núm. de socio** siguiente. Escribid el nombre, los apellidos, el DNI/NIE y la fecha de nacimiento. Con **Añade una foto** ponéis la foto (se recorta en formato carné).
3. **Contacto**: teléfono, correo electrónico y dirección.
4. **Asociación y cuota**: la **Fecha de alta**, la **Categoría** y el **Tipo de cuota**. Si cobráis por domiciliación, el IBAN (el programa comprueba sus dígitos).
5. **Protección de datos**: marcad las casillas según lo que la persona haya firmado (véase más abajo).
6. Pulsad **Dar de alta**.

Si vuestros estatutos dicen que la junta debe admitir a los socios nuevos, marcad **Registrarlo como solicitud de admisión**: la persona no contará como socia hasta que la junta la admita (véase [Bajas, readmisiones y admisiones](/ajuda/baixa-i-readmissio)).

# La hoja de inscripción y los consentimientos

El RGPD obliga a informar a cada persona de cómo se tratan sus datos. En la ficha, en el apartado **Protección de datos**, el botón **Hoja de inscripción** genera la hoja con la información legal y las casillas de consentimiento; imprimidla con **Imprimir la hoja** y haced que la firme. Después marcad:

- **Ha firmado la hoja de inscripción…**, con la fecha y quién la firma.
- **Autoriza el uso de su imagen…** solo si lo ha aceptado.
- **Quiere recibir comunicaciones de la entidad…**: si se desmarca, la persona queda fuera de todos los envíos (pero sigue recibiendo las convocatorias oficiales).

# Menores de edad

- Si la persona tiene menos de 18 años, aparece el campo **Padre, madre o tutor/a legal**, que es obligatorio. Los menores no tienen derecho a voto.
- Si tiene menos de 14 años, el consentimiento lo debe firmar el padre, la madre o el tutor legal (art. 7 de la LOPDGDD); el programa lo fija automáticamente.

# El carné y el resto de la ficha

Con **Imprimir carné** obtenéis el carné de socio con la foto y el logotipo (la plantilla se elige en Configuración → **Socios y carné**). Más abajo en la ficha están el **Seguimiento** (etiquetas, tareas y contactos), el **Historial de cuotas**, la participación en actividades y los movimientos vinculados.

> Consejo: si os equivocáis, corregid los datos y pulsad **Guardar los cambios**. No eliminéis a un socio que se va: dadlo de baja.`,
      en: `# Step by step

1. In [Members](/socis), press **+ New member**.
2. **Personal details**: the program suggests the next **Membership no.** Type the first name, surnames, ID (DNI/NIE) and date of birth. Use **Add a photo** to add a photo (it is cropped to card format).
3. **Contact**: phone, email and address.
4. **Membership and fee**: the **Join date**, **Category** and **Fee type**. If you collect by direct debit, the IBAN (the program checks its digits).
5. **Data protection**: tick the boxes according to what the person has signed (see below).
6. Press **Add member**.

If your statutes say the board must admit new members, tick **Record it as a membership application**: the person will not count as a member until the board admits them (see [Leaving, readmission and admission](/ajuda/baixa-i-readmissio)).

# Membership form and consents

The GDPR requires telling each person how their data is used. In the record, under **Data protection**, the **Membership form** button produces the form with the legal information and consent boxes; print it with **Print form** and have it signed. Then tick:

- **Has signed the membership form…**, with the date and who signs.
- **Allows the use of their image…** only if they agreed.
- **Wants to receive communications from the organisation…**: if unticked, the person is left out of all mailings (but still receives official meeting notices).

# Minors

- If the person is under 18, the **Parent or legal guardian** field appears and is required. Minors cannot vote.
- If they are under 14, consent must be signed by a parent or legal guardian (art. 7 of the Spanish LOPDGDD); the program sets this automatically.

# The card and the rest of the record

**Print card** produces the membership card with photo and logo (the template is chosen in Settings → **Members and card**). Further down the record you find **Follow-up** (tags, tasks and contacts), the **Fee history**, participation in activities and linked transactions.

> Tip: if you make a mistake, correct it and press **Save changes**. Do not delete a member who leaves: record them as having left.`,
    },
  },
  {
    id: 'categories-i-dret-de-vot',
    seccio: 'persones',
    titol: {
      ca: 'Categories de soci i dret de vot',
      es: 'Categorías de socio y derecho de voto',
      en: 'Member categories and voting rights',
    },
    resum: {
      ca: 'Com crear categories (numerari, d\'honor, juvenil…) i decidir qui vota a l\'assemblea i qui paga quota.',
      es: 'Cómo crear categorías (numerario, de honor, juvenil…) y decidir quién vota en la asamblea y quién paga cuota.',
      en: 'How to create categories (full, honorary, youth…) and decide who votes at the general meeting and who pays.',
    },
    paraules: ['categoria', 'categoría', 'category', 'vot', 'voto', 'vote', 'honor', 'numerari', 'numerario', 'juvenil', 'votants', 'votantes', 'voters'],
    cos: {
      ca: `La categoria d'un soci determina dues coses: si té **dret a vot a l'assemblea** i si **paga quota**. Les categories les defineixen els vostres estatuts (per exemple: soci numerari, soci d'honor, soci juvenil, soci col·laborador).

# Crear o editar categories

1. A [Socis](/socis), premeu **Categories**.
2. Premeu **+ Nova categoria**.
3. Escriviu el **Nom** i una **Descripció** (podeu copiar l'article dels estatuts).
4. Marcau si **Té dret a vot a l'assemblea** i si **Paga quota**.
5. Premeu **Desa**.

La llista mostra quants socis actius té cada categoria. Una categoria que encara té socis no es pot eliminar: canviau-los abans de categoria.

# Qui pot votar

El programa considera que una persona té dret a vot en una data si:

- és sòcia admesa i no està de baixa en aquella data,
- és major d'edat (els menors de 18 anys mai no voten, sigui quina sigui la categoria),
- i la seva categoria té vot (o no en té cap d'assignada).

Aquest càlcul s'utilitza per a la llista de [Socis](/socis) (insígnia **sense vot**), per al cens i el quòrum de les assemblees i per als destinataris de les convocatòries (vegeu [Òrgans de govern](/ajuda/organs-de-govern)).

> Consell: si teniu socis d'honor que no paguen quota però sí que voten, creau una categoria amb el vot marcat i la quota desmarcada. Si un soci no ha de pagar quota, deixau també el **Tipus de quota** buit a la seva fitxa.`,
      es: `La categoría de un socio determina dos cosas: si tiene **derecho a voto en la asamblea** y si **paga cuota**. Las categorías las definen vuestros estatutos (por ejemplo: socio numerario, socio de honor, socio juvenil, socio colaborador).

# Crear o editar categorías

1. En [Socios](/socis), pulsad **Categorías**.
2. Pulsad **+ Nueva categoría**.
3. Escribid el **Nombre** y una **Descripción** (podéis copiar el artículo de los estatutos).
4. Marcad si **Tiene derecho a voto en la asamblea** y si **Paga cuota**.
5. Pulsad **Guardar**.

La lista muestra cuántos socios activos tiene cada categoría. Una categoría que todavía tiene socios no se puede eliminar: cambiadlos antes de categoría.

# Quién puede votar

El programa considera que una persona tiene derecho a voto en una fecha si:

- es socia admitida y no está de baja en esa fecha,
- es mayor de edad (los menores de 18 años nunca votan, sea cual sea la categoría),
- y su categoría tiene voto (o no tiene ninguna asignada).

Este cálculo se usa en la lista de [Socios](/socis) (insignia **sin voto**), en el censo y el quórum de las asambleas y en los destinatarios de las convocatorias (véase [Órganos de gobierno](/ajuda/organs-de-govern)).

> Consejo: si tenéis socios de honor que no pagan cuota pero sí votan, cread una categoría con el voto marcado y la cuota desmarcada. Si un socio no debe pagar cuota, dejad también vacío el **Tipo de cuota** en su ficha.`,
      en: `A member's category decides two things: whether they have **a vote at the general meeting** and whether they **pay a fee**. Categories come from your statutes (for example full member, honorary member, youth member, supporting member).

# Creating or editing categories

1. In [Members](/socis), press **Categories**.
2. Press **+ New category**.
3. Type the **Name** and a **Description** (you can copy the article of the statutes).
4. Tick whether it **has a vote at the general meeting** and whether it **Pays a fee**.
5. Press **Save**.

The list shows how many active members each category has. A category that still has members cannot be deleted: move them to another category first.

# Who can vote

The program considers that a person can vote on a given date if:

- they are an admitted member and had not left on that date,
- they are 18 or over (minors never vote, whatever their category),
- and their category has a vote (or they have no category).

This is used in the [Members](/socis) list (**no vote** badge), for the electoral roll and quorum of general meetings, and for the recipients of meeting notices (see [Governing bodies](/ajuda/organs-de-govern)).

> Tip: if honorary members do not pay but do vote, create a category with the vote ticked and the fee unticked. If a member must not pay, also leave the **Fee type** empty in their record.`,
    },
  },
  {
    id: 'baixa-i-readmissio',
    seccio: 'persones',
    titol: {
      ca: 'Baixes, readmissions i admissions',
      es: 'Bajas, readmisiones y admisiones',
      en: 'Leaving, readmission and admission',
    },
    resum: {
      ca: 'Com donar de baixa un soci, corregir una baixa, readmetre\'l i resoldre les sol·licituds d\'admissió.',
      es: 'Cómo dar de baja a un socio, corregir una baja, readmitirlo y resolver las solicitudes de admisión.',
      en: 'How to record a member leaving, correct it, readmit them and decide on membership applications.',
    },
    paraules: ['baixa', 'baja', 'leave', 'leaving', 'readmissió', 'readmisión', 'readmit', 'expulsió', 'expulsión', 'expulsion', 'defunció', 'impagament', 'admissió', 'admisión', 'admission', 'sol·licitud', 'esborrar', 'borrar', 'eliminar', 'delete'],
    cos: {
      ca: `La LO 1/2002 obliga a mantenir la relació de socis amb les altes i les baixes. Per això, quan algú deixa l'entitat **no s'elimina**: es registra la baixa i en queda l'historial.

# Donar de baixa un soci

1. Obriu la fitxa del soci des de [Socis](/socis).
2. A dalt, a **Historial d'altes i baixes**, premeu **Donar de baixa**.
3. Indicau la **Data de baixa** i el **Motiu de la baixa**: baixa voluntària, impagament de quotes, expulsió, defunció o altres. Podeu afegir-hi un detall.
4. A **Acord o referència** anotau, si cal, l'acord de la junta (per exemple «Junta directiva, acta 12/2026»). Per a una **expulsió** és obligatori: òrgan, data i número de l'acord.
5. Confirmau.

El soci passa a la llista **Baixes**, deixa de votar i de rebre quotes noves, però les seves dades i quotes antigues es conserven. Si us heu equivocat de data o motiu, feu servir **Corregeix la baixa**.

# Readmetre un soci

Si una persona torna, no la doneu d'alta de nou: obriu la seva fitxa i premeu **Readmet**. Indicau la **Data de la nova alta** i, si n'hi ha, l'acord. S'obre un període nou al llibre registre i els anteriors es conserven, amb el mateix número de soci. No es pot readmetre una persona difunta ni una d'anonimitzada.

# Sol·licituds d'admissió

Si heu registrat algú com a sol·licitud d'admissió, surt al filtre **Sol·licituds d'admissió**. Mentre no s'admeti no compta com a sòcia: no vota, no paga quota i no surt al llibre registre. A la seva fitxa, premeu **Admet com a soci** (amb la data i l'acord de la junta) o **Denega**.

# I eliminar?

El botó **Elimina** (només per a Administració) serveix per a registres fets per error i sense cap historial. Si la persona demana que se suprimeixin les seves dades, feu servir l'anonimització: vegeu [Protecció de dades](/ajuda/proteccio-dades).`,
      es: `La LO 1/2002 obliga a mantener la relación de socios con las altas y las bajas. Por eso, cuando alguien deja la entidad **no se elimina**: se registra la baja y queda el historial.

# Dar de baja a un socio

1. Abrid la ficha del socio desde [Socios](/socis).
2. Arriba, en **Historial de altas y bajas**, pulsad **Dar de baja**.
3. Indicad la **Fecha de baja** y el **Motivo de la baja**: baja voluntaria, impago de cuotas, expulsión, defunción u otros. Podéis añadir un detalle.
4. En **Acuerdo o referencia** anotad, si hace falta, el acuerdo de la junta (por ejemplo «Junta directiva, acta 12/2026»). Para una **expulsión** es obligatorio: órgano, fecha y número del acuerdo.
5. Confirmad.

El socio pasa a la lista **Bajas**, deja de votar y de recibir cuotas nuevas, pero sus datos y cuotas antiguas se conservan. Si os habéis equivocado de fecha o motivo, usad **Corregir la baja**.

# Readmitir a un socio

Si una persona vuelve, no la deis de alta de nuevo: abrid su ficha y pulsad **Readmitir**. Indicad la **Fecha de la nueva alta** y, si lo hay, el acuerdo. Se abre un periodo nuevo en el libro registro y los anteriores se conservan, con el mismo número de socio. No se puede readmitir a una persona fallecida ni a una anonimizada.

# Solicitudes de admisión

Si habéis registrado a alguien como solicitud de admisión, aparece en el filtro **Solicitudes de admisión**. Mientras no se admita no cuenta como socia: no vota, no paga cuota y no aparece en el libro registro. En su ficha, pulsad **Admitir como socio** (con la fecha y el acuerdo de la junta) o **Denegar**.

# ¿Y eliminar?

El botón **Eliminar** (solo para Administración) sirve para registros hechos por error y sin ningún historial. Si la persona pide que se supriman sus datos, usad la anonimización: véase [Protección de datos](/ajuda/proteccio-dades).`,
      en: `Spanish law (LO 1/2002) requires keeping the list of members with joining and leaving dates. So when someone leaves, they are **not deleted**: you record that they left and the history is kept.

# Recording that a member left

1. Open the member record from [Members](/socis).
2. At the top, under **Membership history**, press **Remove from membership**.
3. Enter the end date and the **Reason for leaving**: voluntary, unpaid fees, expulsion, death or other. You can add details.
4. Under **Resolution or reference**, note the board resolution if there is one (for example «Board, minutes 12/2026»). For an **expulsion** it is required: body, date and number of the resolution.
5. Confirm.

The member moves to **Former members**, stops voting and getting new fees, but their data and past fees are kept. If the date or reason is wrong, use **Correct the leaving**.

# Readmitting a member

If someone comes back, do not add them again: open their record and press **Readmit**. Enter the new join date and the resolution, if any. A new period opens in the register, previous ones are kept and the membership number stays the same. A deceased or anonymised person cannot be readmitted.

# Membership applications

If you recorded someone as an application, they appear under the **Membership applications** filter. Until admitted they do not count as a member: they do not vote, pay fees or appear in the register. In their record, press **Admit as member** (with the date and board resolution) or **Reject**.

# What about deleting?

The **Delete** button (Administration only) is for records created by mistake with no history. If the person asks for their data to be erased, use anonymisation: see [Data protection](/ajuda/proteccio-dades).`,
    },
  },
  {
    id: 'llibre-registre-socis',
    seccio: 'persones',
    titol: { ca: 'Llibre registre de socis', es: 'Libro registro de socios', en: 'Register of members' },
    resum: {
      ca: 'El registre obligatori de socis amb altes i baixes, a qualsevol data, llest per imprimir i signar.',
      es: 'El registro obligatorio de socios con altas y bajas, en cualquier fecha, listo para imprimir y firmar.',
      en: 'The legally required register of members with joining and leaving dates, at any date, ready to print and sign.',
    },
    paraules: ['llibre', 'libro', 'book', 'registre', 'registro', 'register', 'relació de socis', 'relación de socios', 'obligatori', 'imprimir', 'print'],
    cos: {
      ca: `L'article 14 de la LO 1/2002, reguladora del dret d'associació, obliga totes les associacions a disposar d'una **relació actualitzada dels seus associats**. El programa la genera sola a partir de les altes i baixes que registrau.

# Consultar-lo i imprimir-lo

1. A [Socis](/socis), premeu **Llibre registre**.
2. Al camp **A data de**, deixau-ho en blanc per veure la situació actual, o posau-hi una data passada (per exemple, el dia d'una assemblea) per veure qui era soci aquell dia.
3. Premeu **Imprimeix el llibre registre**.

El document mostra, per a cada persona: número, nom i llinatges, categoria, data d'alta, data de baixa i motiu, i els acords corresponents. Al peu hi ha l'espai per a la signatura de la secretaria i el vist i plau de la presidència.

# Com es manté al dia

No cal fer res especial: cada **Dona d'alta**, **Donar de baixa**, **Readmet** o **Admet com a soci** queda anotat (vegeu [Baixes, readmissions i admissions](/ajuda/baixa-i-readmissio)). Si una persona ha estat sòcia en diversos períodes, hi surten tots.

Les sol·licituds d'admissió pendents o denegades no hi surten, perquè aquelles persones no són sòcies. Els socis anonimitzats hi surten com a «Persona anonimitzada»: es conserva la línia (per no deixar forats a la numeració) però sense dades personals.

> Consell: imprimiu-lo i signau-lo almenys un cop l'any, per exemple el dia de l'assemblea ordinària, i guardau-lo amb el llibre d'actes. És el document que us demanaran si cal acreditar qui forma part de l'entitat.`,
      es: `El artículo 14 de la LO 1/2002, reguladora del derecho de asociación, obliga a todas las asociaciones a disponer de una **relación actualizada de sus asociados**. El programa la genera sola a partir de las altas y bajas que registráis.

# Consultarlo e imprimirlo

1. En [Socios](/socis), pulsad **Libro registro**.
2. En el campo **A fecha de**, dejadlo en blanco para ver la situación actual, o poned una fecha pasada (por ejemplo, el día de una asamblea) para ver quién era socio ese día.
3. Pulsad **Imprimir el libro registro**.

El documento muestra, para cada persona: número, nombre y apellidos, categoría, fecha de alta, fecha de baja y motivo, y los acuerdos correspondientes. Al pie está el espacio para la firma de la secretaría y el visto bueno de la presidencia.

# Cómo se mantiene al día

No hace falta hacer nada especial: cada **Dar de alta**, **Dar de baja**, **Readmitir** o **Admitir como socio** queda anotado (véase [Bajas, readmisiones y admisiones](/ajuda/baixa-i-readmissio)). Si una persona ha sido socia en varios periodos, aparecen todos.

Las solicitudes de admisión pendientes o denegadas no aparecen, porque esas personas no son socias. Los socios anonimizados aparecen como «Persona anonimizada»: se conserva la línea (para no dejar huecos en la numeración) pero sin datos personales.

> Consejo: imprimidlo y firmadlo al menos una vez al año, por ejemplo el día de la asamblea ordinaria, y guardadlo con el libro de actas. Es el documento que os pedirán si hay que acreditar quién forma parte de la entidad.`,
      en: `Article 14 of the Spanish law on associations (LO 1/2002) requires every association to keep an **up-to-date list of its members**. The program produces it automatically from the joining and leaving you record.

# Viewing and printing it

1. In [Members](/socis), press **Register of members**.
2. In the **As at** field, leave it empty for the current situation, or enter a past date (for example the day of a general meeting) to see who was a member that day.
3. Press **Print the register**.

For each person the document shows number, name, category, join date, leaving date and reason, and the related resolutions. At the bottom there is space for the secretary's signature and the president's approval.

# Keeping it up to date

Nothing special is needed: every **Add member**, **Remove from membership**, **Readmit** or **Admit as member** is recorded (see [Leaving, readmission and admission](/ajuda/baixa-i-readmissio)). If someone was a member in several periods, all of them appear.

Pending or rejected applications are not included, because those people are not members. Anonymised members appear as an anonymised person: the line is kept (so the numbering has no gaps) but without personal data.

> Tip: print and sign it at least once a year, for example on the day of the ordinary general meeting, and keep it with the minutes book. It is the document you will be asked for to prove who belongs to the organisation.`,
    },
  },
  {
    id: 'importar-socis',
    seccio: 'persones',
    titol: {
      ca: 'Importar socis d\'un full de càlcul',
      es: 'Importar socios de una hoja de cálculo',
      en: 'Importing members from a spreadsheet',
    },
    resum: {
      ca: 'Com passar la llista de socis d\'Excel o LibreOffice al programa, comprovant-ne els errors abans.',
      es: 'Cómo pasar la lista de socios de Excel o LibreOffice al programa, comprobando los errores antes.',
      en: 'How to move your member list from Excel or LibreOffice into the program, checking errors first.',
    },
    paraules: ['importar', 'import', 'excel', 'csv', 'full de càlcul', 'hoja de cálculo', 'spreadsheet', 'libreoffice', 'carregar', 'cargar', 'migrar'],
    cos: {
      ca: `Si ja teniu els socis en un full de càlcul, no cal escriure'ls un per un.

# 1. Preparau el fitxer

- Obriu el full a Excel o LibreOffice i comprovau que la primera fila tingui els noms de les columnes (Nom, Llinatges, DNI, Correu…).
- Desau-lo com a CSV: a Excel, «Desa com a» → «CSV UTF-8» o «CSV delimitat per punt i coma».
- Les dates poden anar en format DD/MM/AAAA o AAAA-MM-DD.

# 2. Importau-lo

1. A [Socis](/socis), premeu **Importa socis** (perfils Administració i Junta / Secretaria).
2. **Tria el fitxer CSV**. El programa detecta el separador.
3. A **Associació de columnes**, indicau de quina columna del fitxer surt cada dada del soci. Com a mínim cal el nom. Podeu associar també número de soci, DNI, naixement, gènere, adreça, telèfon, correu, data d'alta, categoria, tipus de quota, IBAN i tutor legal.
4. Premeu **Comprova les dades**.

# 3. Revisau el resultat

Cada fila surt marcada com a correcta, amb avisos o amb errors. Amb **Mostra només les files amb errors o avisos** les trobau ràpidament. Els errors habituals són:

- DNI amb la lletra incorrecta, o repetit al fitxer o a la base de dades.
- Número de soci repetit.
- Correu, IBAN o dates no vàlids.

Els avisos no impedeixen importar: per exemple, una categoria o tipus de quota que no existeix (es deixa en blanc), una fila sense data d'alta (es posa la d'avui) o un menor sense tutor. Les files amb errors no s'importen: corregiu-les al full i torneu-ho a provar, o donau-les d'alta a mà. Finalment premeu **Importa … socis**.

> Compte: el programa no sap si aquestes persones han signat el full de protecció de dades, i les deixa «sense consentiment». A [Protecció de dades](/proteccio-dades), pestanya **Resum**, veureu qui falta: imprimiu-los el full d'inscripció i feu-lo signar.`,
      es: `Si ya tenéis los socios en una hoja de cálculo, no hace falta escribirlos uno a uno.

# 1. Preparad el archivo

- Abrid la hoja en Excel o LibreOffice y comprobad que la primera fila tenga los nombres de las columnas (Nombre, Apellidos, DNI, Correo…).
- Guardadla como CSV: en Excel, «Guardar como» → «CSV UTF-8» o «CSV delimitado por punto y coma».
- Las fechas pueden ir en formato DD/MM/AAAA o AAAA-MM-DD.

# 2. Importadlo

1. En [Socios](/socis), pulsad **Importar socios** (perfiles Administración y Junta / Secretaría).
2. **Elige el archivo CSV**. El programa detecta el separador.
3. En **Asociación de columnas**, indicad de qué columna del archivo sale cada dato del socio. Como mínimo hace falta el nombre. Podéis asociar también número de socio, DNI, nacimiento, género, dirección, teléfono, correo, fecha de alta, categoría, tipo de cuota, IBAN y tutor legal.
4. Pulsad **Comprobar los datos**.

# 3. Revisad el resultado

Cada fila aparece marcada como correcta, con avisos o con errores. Con **Mostrar solo las filas con errores o avisos** las encontráis rápido. Los errores habituales son:

- DNI con la letra incorrecta, o repetido en el archivo o en la base de datos.
- Número de socio repetido.
- Correo, IBAN o fechas no válidos.

Los avisos no impiden importar: por ejemplo, una categoría o tipo de cuota que no existe (se deja en blanco), una fila sin fecha de alta (se pone la de hoy) o un menor sin tutor. Las filas con errores no se importan: corregidlas en la hoja y volved a probar, o dadlas de alta a mano. Finalmente pulsad **Importar … socios**.

> Cuidado: el programa no sabe si estas personas han firmado la hoja de protección de datos, y las deja «sin consentimiento». En [Protección de datos](/proteccio-dades), pestaña **Resumen**, veréis quién falta: imprimidles la hoja de inscripción y haced que la firmen.`,
      en: `If your members are already in a spreadsheet, you do not need to type them one by one.

# 1. Prepare the file

- Open the sheet in Excel or LibreOffice and check that the first row has the column names (First name, Surnames, ID, Email…).
- Save it as CSV: in Excel, «Save as» → «CSV UTF-8» or «CSV (semicolon delimited)».
- Dates can be DD/MM/YYYY or YYYY-MM-DD.

# 2. Import it

1. In [Members](/socis), press **Import members** (Administration and Board / Secretary profiles).
2. **Choose the CSV file**. The program detects the separator.
3. In the column mapping, say which column of the file holds each member field. At least the name is required. You can also map membership number, ID, date of birth, gender, address, phone, email, join date, category, fee type, IBAN and legal guardian.
4. Press **Check the data**.

# 3. Review the result

Each row is marked as correct, with warnings or with errors. **Show only rows with errors or warnings** helps you find them. Common errors:

- ID number with a wrong check letter, or repeated in the file or the database.
- Repeated membership number.
- Invalid email, IBAN or dates.

Warnings do not stop the import: for example an unknown category or fee type (left empty), a row with no join date (today's date is used) or a minor with no guardian. Rows with errors are not imported: fix them in the sheet and try again, or add them by hand. Finally press **Import … members**.

> Warning: the program cannot know whether these people signed the data protection form, so they are marked «without consent». In [Data protection](/proteccio-dades), **Summary** tab, you will see who is missing: print their membership form and have it signed.`,
    },
  },
  {
    id: 'interessats',
    seccio: 'persones',
    titol: { ca: 'Persones interessades', es: 'Personas interesadas', en: 'Prospects' },
    resum: {
      ca: 'Apuntar qui s\'interessa per l\'entitat, fer-ne el seguiment i convertir-lo en soci.',
      es: 'Anotar quién se interesa por la entidad, hacer su seguimiento y convertirlo en socio.',
      en: 'Recording people interested in the organisation, following them up and turning them into members.',
    },
    rutes: ['/interessats'],
    paraules: ['interessat', 'interesado', 'prospect', 'contacte', 'lead', 'possible soci', 'posible socio', 'captació', 'captación'],
    cos: {
      ca: `A [Interessats](/interessats) hi apuntau la gent que s'ha interessat per l'entitat i encara no n'és sòcia: algú que pregunta en una activitat, per xarxes o pel carrer.

# Afegir una persona

1. Premeu **+ Nova persona**.
2. Escriviu nom, llinatges, telèfon i correu.
3. A **Com ens ha conegut**, anotau l'origen (una activitat, les xarxes, un altre soci…), i a **Interessos**, què li agrada (música tradicional, cuina, fotografia…).
4. Marcau la casella de consentiment només si la persona ha acceptat que guardem les seves dades i la contactem, després d'haver-la informat de la clàusula de protecció de dades.
5. Premeu **Desa**.

# Fer-ne el seguiment

Cada persona té un **Estat**: **Nou**, **Contactat**, **Descartat** o **Ja és soci**. El filtre **Pendents de seguiment** mostra només les que encara cal atendre; **Totes** les mostra totes. Canviau l'estat a mesura que hi parlau i afegiu notes del que s'ha dit.

# Convertir-la en soci

Quan decideix fer-se'n, premeu **Fes-lo soci**: el programa la dona d'alta com a soci amb les dades que ja teníeu i obre la fitxa perquè la completeu (DNI, quota, full d'inscripció…). Vegeu [Com donar d'alta un soci](/ajuda/alta-soci).

# Quant de temps es guarden

Segons el RGPD, no es poden guardar dades indefinidament. Les persones interessades que no es fan sòcies s'han de suprimir passat el termini configurat a [Protecció de dades](/proteccio-dades) (per defecte, 12 mesos). El programa us les mostra a la pestanya **Conservació**.

> Consell: la clàusula informativa per posar en un cartell o formulari la trobareu a Protecció de dades → **Documents**.`,
      es: `En [Interesados](/interessats) anotáis a la gente que se ha interesado por la entidad y todavía no es socia: alguien que pregunta en una actividad, por redes o por la calle.

# Añadir una persona

1. Pulsad **+ Nueva persona**.
2. Escribid nombre, apellidos, teléfono y correo.
3. En **Cómo nos ha conocido**, anotad el origen (una actividad, las redes, otro socio…), y en **Intereses**, qué le gusta (música tradicional, cocina, fotografía…).
4. Marcad la casilla de consentimiento solo si la persona ha aceptado que guardemos sus datos y la contactemos, después de haberla informado de la cláusula de protección de datos.
5. Pulsad **Guardar**.

# Hacer su seguimiento

Cada persona tiene un **Estado**: **Nuevo**, **Contactado**, **Descartado** o **Ya es socio**. El filtro **Pendientes de seguimiento** muestra solo las que todavía hay que atender; **Todas** las muestra todas. Cambiad el estado a medida que habláis con ella y añadid notas de lo que se ha dicho.

# Convertirla en socia

Cuando decide hacerse socia, pulsad **Hacerlo socio**: el programa la da de alta como socio con los datos que ya teníais y abre la ficha para que la completéis (DNI, cuota, hoja de inscripción…). Véase [Cómo dar de alta a un socio](/ajuda/alta-soci).

# Cuánto tiempo se guardan

Según el RGPD, no se pueden guardar datos indefinidamente. Las personas interesadas que no se hacen socias deben suprimirse pasado el plazo configurado en [Protección de datos](/proteccio-dades) (por defecto, 12 meses). El programa os las muestra en la pestaña **Conservación**.

> Consejo: la cláusula informativa para poner en un cartel o formulario la encontraréis en Protección de datos → **Documentos**.`,
      en: `In [Prospects](/interessats) you record people who have shown interest in the organisation but are not members yet: someone who asks at an activity, on social media or in the street.

# Adding a person

1. Press **+ New person**.
2. Type first name, surnames, phone and email.
3. Under **How they found us**, note the source (an activity, social media, another member…), and under **Interests**, what they like (traditional music, cooking, photography…).
4. Tick the consent box only if the person has agreed that we keep their data and contact them, after being given the data protection notice.
5. Press **Save**.

# Following up

Each person has a **Status**: **New**, **Contacted**, **Discarded** or **Already a member**. The **Awaiting follow-up** filter shows only those still to be dealt with; **All** shows everyone. Change the status as you talk to them and add notes.

# Turning them into a member

When they decide to join, press **Make member**: the program adds them as a member with the data you already had and opens the record for you to complete (ID, fee, membership form…). See [How to add a member](/ajuda/alta-soci).

# How long they are kept

Under the GDPR data cannot be kept forever. Prospects who do not join must be erased after the period set in [Data protection](/proteccio-dades) (12 months by default). The program lists them in the **Retention** tab.

> Tip: the privacy notice to put on a poster or form is in Data protection → **Documents**.`,
    },
  },
  {
    id: 'seguiment',
    seccio: 'persones',
    titol: { ca: 'Seguiment: tasques i contactes', es: 'Seguimiento: tareas y contactos', en: 'Follow-up: tasks and contacts' },
    resum: {
      ca: 'Apuntar tasques pendents i l\'historial de trucades, correus i reunions amb cada soci.',
      es: 'Anotar tareas pendientes y el historial de llamadas, correos y reuniones con cada socio.',
      en: 'Recording pending tasks and the history of calls, emails and meetings with each member.',
    },
    rutes: ['/seguiment'],
    paraules: ['tasca', 'tarea', 'task', 'pendent', 'pendiente', 'to do', 'trucada', 'llamada', 'call', 'historial', 'history', 'contacte', 'interacció', 'recordatori', 'recordatorio', 'reminder'],
    cos: {
      ca: `El seguiment serveix perquè la junta no oblidi res i perquè qualsevol persona pugui saber què s'ha parlat amb un soci, encara que no hi fos.

# Tasques

Una tasca és una cosa que cal fer: «Trucar per confirmar l'assistència», «Demanar el full signat», «Tornar el material».

- Des de la fitxa d'un soci (apartat **Seguiment** → **Tasques**), escriviu la tasca, posau-hi una **Data límit** si en té i premeu **Afegeix**. Queda lligada a aquell soci.
- A la pantalla [Seguiment](/seguiment) hi ha totes les tasques pendents de l'entitat. També n'hi podeu afegir de generals, sense soci.
- Marcau la casella quan estigui feta. Amb **Mostra també les fetes** veureu les completades.
- Les tasques amb la data passada surten marcades com a vençudes, i les properes apareixen al [Tauler](/).

# Historial de contactes

A la fitxa del soci, a **Historial de contactes**, registrau cada contacte important: triau el tipus (**Trucada**, **Correu**, **Reunió**, **Missatge** o **Nota**), la data i un resum del que s'ha parlat o fet. La pantalla [Seguiment](/seguiment) mostra els **Darrers contactes** de tots els socis.

Les comunicacions enviades des de [Comunicacions](/ajuda/comunicacions) també s'anoten a l'historial de cada destinatari.

# Etiquetes

A la mateixa secció de la fitxa podeu assignar **Etiquetes** al soci (per exemple Junta, Voluntariat, Música, Cuina). Les etiquetes es creen a [Configuració](/configuracio) → **Socis i carnet** i serveixen per filtrar la llista de socis i per enviar comunicacions a un grup.

> Compte: escriviu només el que és necessari i objectiu. La persona sòcia té dret a veure tot el que hi ha sobre ella (dret d'accés del RGPD), i l'exportació de les seves dades inclou aquest historial.`,
      es: `El seguimiento sirve para que la junta no olvide nada y para que cualquier persona pueda saber qué se ha hablado con un socio, aunque no estuviera.

# Tareas

Una tarea es algo que hay que hacer: «Llamar para confirmar la asistencia», «Pedir la hoja firmada», «Devolver el material».

- Desde la ficha de un socio (apartado **Seguimiento** → **Tareas**), escribid la tarea, ponedle una **Fecha límite** si la tiene y pulsad **Añade**. Queda ligada a ese socio.
- En la pantalla [Seguimiento](/seguiment) están todas las tareas pendientes de la entidad. También podéis añadir tareas generales, sin socio.
- Marcad la casilla cuando esté hecha. Con **Mostrar también las hechas** veréis las completadas.
- Las tareas con la fecha pasada aparecen marcadas como vencidas, y las próximas aparecen en el [Panel](/).

# Historial de contactos

En la ficha del socio, en **Historial de contactos**, registrad cada contacto importante: elegid el tipo (**Llamada**, **Correo**, **Reunión**, **Mensaje** o **Nota**), la fecha y un resumen de lo que se ha hablado o hecho. La pantalla [Seguimiento](/seguiment) muestra los **Últimos contactos** de todos los socios.

Las comunicaciones enviadas desde [Comunicaciones](/ajuda/comunicacions) también se anotan en el historial de cada destinatario.

# Etiquetas

En la misma sección de la ficha podéis asignar **Etiquetas** al socio (por ejemplo Junta, Voluntariado, Música, Cocina). Las etiquetas se crean en [Configuración](/configuracio) → **Socios y carné** y sirven para filtrar la lista de socios y para enviar comunicaciones a un grupo.

> Cuidado: escribid solo lo necesario y objetivo. La persona socia tiene derecho a ver todo lo que hay sobre ella (derecho de acceso del RGPD), y la exportación de sus datos incluye este historial.`,
      en: `Follow-up helps the board not to forget anything and lets anyone know what was discussed with a member, even if they were not there.

# Tasks

A task is something to do: «Call to confirm attendance», «Ask for the signed form», «Return the equipment».

- From a member record (**Follow-up** → **Tasks**), type the task, add a **Due date** if it has one and press **Add**. It is linked to that member.
- The [Follow-up](/seguiment) screen shows all the organisation's pending tasks. You can also add general tasks there, with no member.
- Tick the box when it is done. **Also show completed** shows finished ones.
- Tasks past their date are marked overdue, and upcoming ones appear on the [Dashboard](/).

# Contact history

In the member record, under **Contact history**, record each important contact: choose the type (**Call**, **Email**, **Meeting**, **Message** or **Note**), the date and a summary of what was said or done. The [Follow-up](/seguiment) screen shows **Recent contacts** with all members.

Messages sent from [Communications](/ajuda/comunicacions) are also recorded in each recipient's history.

# Tags

In the same section of the record you can assign **Labels** to the member (for example Board, Volunteering, Music, Cooking). Tags are created in [Settings](/configuracio) → **Members and card** and are used to filter the members list and to send communications to a group.

> Warning: write only what is necessary and factual. Members have the right to see everything held about them (GDPR right of access), and exporting their data includes this history.`,
    },
  },
  {
    id: 'comunicacions',
    seccio: 'persones',
    titol: { ca: 'Comunicacions a grups de socis', es: 'Comunicaciones a grupos de socios', en: 'Communications to groups of members' },
    resum: {
      ca: 'Enviar correus a tots els socis o a un grup, qui en queda fora i per què les convocatòries van a part.',
      es: 'Enviar correos a todos los socios o a un grupo, quién queda fuera y por qué las convocatorias van aparte.',
      en: 'Emailing all members or a group, who is left out and why meeting notices are separate.',
    },
    rutes: ['/comunicacions'],
    paraules: ['correu', 'correo', 'email', 'mail', 'enviament', 'envío', 'mailing', 'butlletí', 'boletín', 'newsletter', 'segment', 'grup', 'grupo', 'group', 'baixa de comunicacions', 'oposició', 'opt-out', 'cco', 'bcc'],
    cos: {
      ca: `A [Comunicacions](/comunicacions) enviau correus i avisos a grups de socis, i en queda constància.

# Enviar una comunicació

1. A **A qui va dirigit**, triau el grup: **Tots els socis actius**, els d'una etiqueta, els inscrits a una activitat de l'exercici, una franja d'edat (infants, joves, adults, gent gran) o els que tenen la quota pendent.
2. El programa us diu quantes persones hi ha, quantes tenen correu i qui no en té (a aquestes caldrà avisar-les per telèfon o en persona).
3. Escriviu l'**Assumpte** i el **Missatge**. L'expressió {nom} se substitueix pel nom de cada soci.
4. Triau com enviar-ho:
   - **Envia per correu**: el programa l'envia a cada persona per separat. Cal tenir el compte configurat a [Configuració](/configuracio) → **Correu**.
   - **Copia les adreces**: les enganxau al camp «Cco» del vostre correu i l'enviau vosaltres. Després premeu **Només registra-ho** perquè quedi a l'historial.

A **Comunicacions enviades** hi ha la llista de tot el que s'ha enviat, quan, a quin grup i a quantes persones. Cada enviament també queda a l'historial de contactes de cada soci.

# Qui en queda fora

Els socis que tenen desmarcada la casella **Vol rebre comunicacions de l'entitat** a la seva fitxa no s'hi inclouen mai: és el seu dret d'oposició (RGPD, art. 21). El programa us indica quants n'hi ha al grup triat. Si algú us demana que no li envieu més correus, desmarcau aquesta casella.

# Les convocatòries oficials van a part

Les convocatòries de l'assemblea general i de la junta **no** s'envien des d'aquí, sinó des de cada reunió a [Òrgans de govern](/ajuda/organs-de-govern). Allà s'envien a tots els socis amb dret a vot, també als que no volen rebre comunicacions, perquè una convocatòria estatutària no és publicitat: és un dret i una obligació de la persona sòcia.

> Consell: quan envieu des del vostre correu, posau sempre les adreces a «Cco» (còpia oculta). Si les posau a «Per a» o «Cc», tothom veu el correu de tothom, i això és una infracció de protecció de dades.`,
      es: `En [Comunicaciones](/comunicacions) enviáis correos y avisos a grupos de socios, y queda constancia.

# Enviar una comunicación

1. En **A quién va dirigido**, elegid el grupo: **Todos los socios activos**, los de una etiqueta, los inscritos en una actividad del ejercicio, una franja de edad (niños, jóvenes, adultos, mayores) o los que tienen la cuota pendiente.
2. El programa os dice cuántas personas hay, cuántas tienen correo y quién no lo tiene (a estas habrá que avisarlas por teléfono o en persona).
3. Escribid el **Asunto** y el **Mensaje**. La expresión {nom} se sustituye por el nombre de cada socio.
4. Elegid cómo enviarlo:
   - **Enviar por correo**: el programa lo envía a cada persona por separado. Hace falta tener la cuenta configurada en [Configuración](/configuracio) → **Correo**.
   - **Copiar las direcciones**: las pegáis en el campo «CCO» de vuestro correo y lo enviáis vosotros. Después pulsad **Solo registrarlo** para que quede en el historial.

En **Comunicaciones enviadas** está la lista de todo lo enviado, cuándo, a qué grupo y a cuántas personas. Cada envío también queda en el historial de contactos de cada socio.

# Quién queda fuera

Los socios que tienen desmarcada la casilla **Quiere recibir comunicaciones de la entidad** en su ficha no se incluyen nunca: es su derecho de oposición (RGPD, art. 21). El programa os indica cuántos hay en el grupo elegido. Si alguien os pide que no le enviéis más correos, desmarcad esta casilla.

# Las convocatorias oficiales van aparte

Las convocatorias de la asamblea general y de la junta **no** se envían desde aquí, sino desde cada reunión en [Órganos de gobierno](/ajuda/organs-de-govern). Allí se envían a todos los socios con derecho a voto, también a los que no quieren recibir comunicaciones, porque una convocatoria estatutaria no es publicidad: es un derecho y una obligación de la persona socia.

> Consejo: cuando enviéis desde vuestro correo, poned siempre las direcciones en «CCO» (copia oculta). Si las ponéis en «Para» o «CC», todo el mundo ve el correo de todos, y eso es una infracción de protección de datos.`,
      en: `In [Communications](/comunicacions) you send emails and notices to groups of members, and a record is kept.

# Sending a communication

1. Under **Who it is for**, choose the group: **All active members**, those with a tag, those registered for an activity this year, an age band (children, young people, adults, seniors) or those with unpaid fees.
2. The program shows how many people are included, how many have an email address and who has none (contact them by phone or in person).
3. Type the **Subject** and the **Message**. The placeholder {nom} is replaced by each member's name.
4. Choose how to send it:
   - **Send by email**: the program sends it to each person separately. The account must be set up in [Settings](/configuracio) → **Email**.
   - **Copy addresses**: paste them into the «Bcc» field of your own email and send it yourself. Then press **Just record it** so it is kept in the history.

**Sent communications** lists everything sent: when, to which group and to how many people. Each sending is also added to every recipient's contact history.

# Who is left out

Members whose record has **Wants to receive communications from the organisation** unticked are never included: it is their right to object (GDPR art. 21). The program tells you how many there are in the chosen group. If someone asks you to stop emailing them, untick that box.

# Official meeting notices are separate

Notices of general meetings and board meetings are **not** sent from here but from each meeting in [Governing bodies](/ajuda/organs-de-govern). They go to all voting members, including those who opted out of communications, because a statutory notice is not marketing: attending is a member's right and duty.

> Tip: when sending from your own email, always put the addresses in «Bcc». If you put them in «To» or «Cc», everyone sees everyone's address, which breaches data protection rules.`,
    },
  },
  {
    id: 'voluntariat',
    seccio: 'persones',
    titol: { ca: 'Voluntariat', es: 'Voluntariado', en: 'Volunteering' },
    resum: {
      ca: 'Persones voluntàries, acord d\'incorporació, certificat de delictes sexuals, assegurances, hores i registre (Llei 45/2015).',
      es: 'Personas voluntarias, acuerdo de incorporación, certificado de delitos sexuales, seguros, horas y registro (Ley 45/2015).',
      en: 'Volunteers, volunteering agreement, sex offences clearance, insurance, hours and register (Spanish Law 45/2015).',
    },
    rutes: ['/voluntariat'],
    paraules: ['voluntari', 'voluntària', 'voluntario', 'volunteer', 'hores', 'horas', 'hours', 'assegurança', 'seguro', 'insurance', 'pòlissa', 'póliza', 'policy', 'delictes sexuals', 'delitos sexuales', 'menors', 'acord d\'incorporació', 'acuerdo de incorporación'],
    cos: {
      ca: `La Llei 45/2015 del voluntariat (i la normativa balear) imposa obligacions a les entitats que tenen persones voluntàries. La pantalla [Voluntariat](/voluntariat) us ajuda a complir-les. Té quatre pestanyes.

# Persones

Premeu **+ Nova persona voluntària**. Pot ser un soci (les dades personals es prenen de la seva fitxa) o una persona no sòcia. Indicau la data d'incorporació, les funcions i activitats, la disponibilitat, les habilitats i la formació. A l'apartat **Requisits legals** es controla:

- **Acord d'incorporació** per escrit (art. 12): imprimiu-lo amb **Imprimeix l'acord**, feu-lo signar i anotau-ne la data.
- **Assegurança** d'accidents i de responsabilitat civil (art. 10).
- **Certificat del Registre Central de Delinqüents Sexuals** (art. 8.4): si marcau que **treballa habitualment amb menors**, cal indicar la data d'expedició del certificat negatiu. El programa avisa quan caduca segons la validesa configurada.

Quan una persona deixa de col·laborar, premeu **Registra la baixa** (no l'elimineu). Si torna, **Reincorpora**: caldrà signar un acord nou. Amb **Prepara el certificat** expediu el certificat de voluntariat amb les hores fetes.

# Hores

Amb **Registra hores** apuntau d'un cop les hores de diverses persones en una activitat o en tasques de suport a l'entitat. Podeu veure el resum per persona i per activitat, amb la **valoració en espècie** (hores per valor de l'hora), útil per a la memòria i la justificació de subvencions. **Imprimeix el resum** o **Descarrega CSV**.

# Assegurances

Amb **+ Nova pòlissa** registrau les pòlisses d'accidents i de responsabilitat civil, amb el venciment. El programa us diu si hi ha persones voluntàries actives sense cobertura.

# Registre

És el registre d'altes i baixes de persones voluntàries que exigeix la llei, per ordre de data. **Imprimeix el registre** per tenir-lo en paper.

> Consell: amb el botó **Paràmetres** fixau la validesa del certificat de delictes sexuals (en mesos) i el valor d'una hora de voluntariat.`,
      es: `La Ley 45/2015 del voluntariado (y la normativa balear) impone obligaciones a las entidades que tienen personas voluntarias. La pantalla [Voluntariado](/voluntariat) os ayuda a cumplirlas. Tiene cuatro pestañas.

# Personas

Pulsad **+ Nueva persona voluntaria**. Puede ser un socio (los datos personales se toman de su ficha) o una persona no socia. Indicad la fecha de incorporación, las funciones y actividades, la disponibilidad, las habilidades y la formación. En el apartado **Requisitos legales** se controla:

- **Acuerdo de incorporación** por escrito (art. 12): imprimidlo con **Imprimir el acuerdo**, haced que lo firme y anotad la fecha.
- **Seguro** de accidentes y de responsabilidad civil (art. 10).
- **Certificado del Registro Central de Delincuentes Sexuales** (art. 8.4): si marcáis que **trabaja habitualmente con menores**, hay que indicar la fecha de expedición del certificado negativo. El programa avisa cuando caduca según la validez configurada.

Cuando una persona deja de colaborar, pulsad **Registrar la baja** (no la eliminéis). Si vuelve, **Reincorporar**: habrá que firmar un acuerdo nuevo. Con **Preparar el certificado** expedís el certificado de voluntariado con las horas hechas.

# Horas

Con **Registrar horas** anotáis de una vez las horas de varias personas en una actividad o en tareas de apoyo a la entidad. Podéis ver el resumen por persona y por actividad, con la **valoración en especie** (horas por valor de la hora), útil para la memoria y la justificación de subvenciones. **Imprimir el resumen** o **Descargar CSV**.

# Seguros

Con **+ Nueva póliza** registráis las pólizas de accidentes y de responsabilidad civil, con el vencimiento. El programa os dice si hay personas voluntarias activas sin cobertura.

# Registro

Es el registro de altas y bajas de personas voluntarias que exige la ley, por orden de fecha. **Imprimir el registro** para tenerlo en papel.

> Consejo: con el botón **Parámetros** fijáis la validez del certificado de delitos sexuales (en meses) y el valor de una hora de voluntariado.`,
      en: `Spanish Law 45/2015 on volunteering (and Balearic regulations) sets obligations for organisations with volunteers. The [Volunteering](/voluntariat) screen helps you meet them. It has four tabs.

# People

Press **+ New volunteer**. It can be a member (personal details are taken from their record) or a non-member. Enter the start date, roles and activities, availability, skills and training. Under **Legal requirements** the program tracks:

- The written **Volunteering agreement** (art. 12): print it with **Print the agreement**, have it signed and record the date.
- Accident and civil liability **insurance** (art. 10).
- The **Central Register of Sex Offenders clearance certificate** (art. 8.4): if you tick that they **regularly work with minors**, enter the issue date of the clearance certificate. The program warns when it expires according to the configured validity.

When a volunteer stops helping, press **Record leaving** (do not delete them). If they come back, **Rejoin**: a new agreement must be signed. **Prepare the certificate** issues a volunteering certificate with their hours.

# Hours

**Record hours** logs the hours of several people at once for an activity or for general support tasks. You can see totals per person and per activity, with the **in-kind value** (hours times the value of an hour), useful for the annual report and grant reporting. **Print the summary** or **Download CSV**.

# Insurance

**+ New policy** records accident and civil liability policies with their expiry date. The program tells you whether any active volunteers are not covered.

# Register

This is the legally required register of volunteers joining and leaving, in date order. **Print the register** to keep a paper copy.

> Tip: the **Settings** button sets the validity of the sex offences clearance certificate (in months) and the value of one volunteering hour.`,
    },
  },
  {
    id: 'collaboradors',
    seccio: 'persones',
    titol: { ca: 'Col·laboradors i convenis', es: 'Colaboradores y convenios', en: 'Partners and agreements' },
    resum: {
      ca: 'Entitats, administracions i escoles amb què col·laborau, i els convenis signats amb elles.',
      es: 'Entidades, administraciones y escuelas con las que colaboráis, y los convenios firmados con ellas.',
      en: 'Organisations, public bodies and schools you work with, and the agreements signed with them.',
    },
    rutes: ['/collaboradors'],
    paraules: ['col·laborador', 'colaborador', 'partner', 'conveni', 'convenio', 'agreement', 'ajuntament', 'ayuntamiento', 'council', 'escola', 'escuela', 'school', 'entitat', 'patrocinador', 'sponsor'],
    cos: {
      ca: `A [Col·laboradors](/collaboradors) hi teniu les entitats, administracions i escoles amb què treballau: l'Ajuntament, altres associacions, centres educatius, empreses que us donen suport… Té dues pestanyes.

# Entitats

1. Premeu **+ Nova entitat**.
2. Escriviu el nom, el tipus, el NIF, l'adreça i el web.
3. Afegiu la persona de contacte amb el seu càrrec, telèfon i correu.
4. Premeu **Desa**.

A la fitxa de cada entitat veureu les **Activitats en què ha col·laborat** (podeu afegir-n'hi amb el seu rol, per exemple «cedeix l'espai» o «coorganitza») i els seus convenis. La llista es pot cercar per nom o persona de contacte i filtrar per tipus. Les entitats sense col·laboració recent surten com a inactives.

# Convenis

Un conveni és un acord signat amb una altra entitat o administració. Premeu **+ Nou conveni** (o **+ Conveni** des de la fitxa de l'entitat) i indicau:

- l'entitat, el títol i l'objecte del conveni,
- la data de signatura, l'inici i el final,
- si **es renova automàticament**,
- l'aportació econòmica, si n'hi ha,
- les **obligacions de l'entitat** (justificació, difusió amb el logotip, memòria…),
- i el document signat, en PDF o foto.

El programa avisa quan un conveni **acaba aviat** o **ha acabat**, perquè el pugueu renovar a temps, i suma les aportacions dels convenis vigents.

> Consell: apuntau bé les obligacions. Molts convenis amb administracions exigeixen posar el seu logotip a la difusió o presentar una memòria: si no ho feu, pot ser que hàgiu de tornar l'aportació. Els ingressos que en rebeu s'anoten a [Comptabilitat](/ajuda/comptabilitat).`,
      es: `En [Colaboradores](/collaboradors) tenéis las entidades, administraciones y escuelas con las que trabajáis: el Ayuntamiento, otras asociaciones, centros educativos, empresas que os apoyan… Tiene dos pestañas.

# Entidades

1. Pulsad **+ Nueva entidad**.
2. Escribid el nombre, el tipo, el NIF, la dirección y la web.
3. Añadid la persona de contacto con su cargo, teléfono y correo.
4. Pulsad **Guardar**.

En la ficha de cada entidad veréis las **Actividades en las que ha colaborado** (podéis añadir más con su rol, por ejemplo «cede el espacio» o «coorganiza») y sus convenios. La lista se puede buscar por nombre o persona de contacto y filtrar por tipo. Las entidades sin colaboración reciente aparecen como inactivas.

# Convenios

Un convenio es un acuerdo firmado con otra entidad o administración. Pulsad **+ Nuevo convenio** (o **+ Convenio** desde la ficha de la entidad) e indicad:

- la entidad, el título y el objeto del convenio,
- la fecha de firma, el inicio y el final,
- si **se renueva automáticamente**,
- la aportación económica, si la hay,
- las **obligaciones de la entidad** (justificación, difusión con el logotipo, memoria…),
- y el documento firmado, en PDF o foto.

El programa avisa cuando un convenio **acaba pronto** o **ha terminado**, para que podáis renovarlo a tiempo, y suma las aportaciones de los convenios vigentes.

> Consejo: anotad bien las obligaciones. Muchos convenios con administraciones exigen poner su logotipo en la difusión o presentar una memoria: si no lo hacéis, puede que tengáis que devolver la aportación. Los ingresos que recibáis se anotan en [Contabilidad](/ajuda/comptabilitat).`,
      en: `[Partners](/collaboradors) holds the organisations, public bodies and schools you work with: the town council, other associations, schools, supporting businesses… It has two tabs.

# Organisations

1. Press **+ New organisation**.
2. Type the name, type, tax ID, address and website.
3. Add the contact person with their position, phone and email.
4. Press **Save**.

Each organisation's record shows the **Activities it has taken part in** (you can add more with their role, for example «provides the venue» or «co-organiser») and its agreements. The list can be searched by name or contact person and filtered by type. Organisations with no recent collaboration are shown as inactive.

# Agreements

An agreement is a signed arrangement with another organisation or public body. Press **+ New agreement** (or **+ Agreement** from the organisation's record) and enter:

- the organisation, title and purpose,
- the signing, start and end dates,
- whether it **renews automatically**,
- the financial contribution, if any,
- **our obligations** (reporting, publicity with their logo, annual report…),
- and the signed document, as a PDF or photo.

The program warns when an agreement **ends soon** or **has ended**, so you can renew it in time, and totals the contributions of current agreements.

> Tip: record the obligations carefully. Many agreements with public bodies require their logo in your publicity or a final report; otherwise you may have to return the money. Income received is recorded in [Accounts](/ajuda/comptabilitat).`,
    },
  },

  // ---------------------------------------------------------------- Govern
  {
    id: 'organs-de-govern',
    seccio: 'govern',
    titol: {
      ca: 'Assemblees i reunions de la junta',
      es: 'Asambleas y reuniones de la junta',
      en: 'General meetings and board meetings',
    },
    resum: {
      ca: 'Preparar una reunió, enviar la convocatòria, passar llista amb delegacions de vot, comprovar el quòrum i registrar els acords.',
      es: 'Preparar una reunión, enviar la convocatoria, pasar lista con delegaciones de voto, comprobar el quórum y registrar los acuerdos.',
      en: 'Preparing a meeting, sending the notice, taking attendance with proxies, checking the quorum and recording resolutions.',
    },
    rutes: ['/governanca'],
    paraules: ['assemblea', 'asamblea', 'general meeting', 'junta', 'board', 'reunió', 'reunión', 'meeting', 'convocatòria', 'convocatoria', 'notice', 'quòrum', 'quórum', 'quorum', 'delegació', 'delegación', 'proxy', 'vot', 'voto', 'vote', 'acord', 'acuerdo', 'resolution', 'ordre del dia', 'orden del día', 'agenda', 'comissió'],
    cos: {
      ca: `A [Òrgans de govern](/governanca), pestanya **Reunions**, es gestionen les reunions de l'assemblea general, de la junta directiva i de les comissions.

# Abans de començar: els requisits dels estatuts

Premeu **Requisits dels estatuts** i copiau el que diuen els vostres estatuts: els **dies d'antelació de la convocatòria** (per defecte 15) i el **quòrum en primera convocatòria** en percentatge (per defecte 50 %). En segona convocatòria, l'assemblea es pot fer amb qualsevol nombre d'assistents.

# 1. Crear la reunió

Premeu **+ Nova reunió** i triau l'**Òrgan** (Assemblea general, Junta directiva o Comissió), el **Tipus** (Ordinària o Extraordinària), la data, les hores de primera i segona convocatòria, el lloc i l'**Ordre del dia** (un punt per línia). L'estat serà **Prevista**.

# 2. Enviar la convocatòria

Obriu la reunió. A l'apartat **Convocatòria**:

- **Envia per correu** l'envia a tots els socis amb dret a vot que tenen correu (a la junta, als seus membres). També la reben els que no volen comunicacions, perquè és una convocatòria estatutària.
- Per a qui no té correu, **Imprimeix les cartes** (i **Imprimeix les etiquetes** per als sobres) i, un cop enviades, **Registra les cartes enviades**.

La reunió passa a **Convocada** amb la data. Si entre la convocatòria i la reunió hi ha menys dies dels que exigeixen els estatuts, el programa us avisa: una assemblea mal convocada es pot impugnar.

# 3. El dia de la reunió: assistència i quòrum

A **Assistència i quòrum**, premeu **Passa llista**. Surten els socis amb dret a vot en la data de la reunió (o els membres de la junta). Per a cadascun triau **Present**, **Representat** o **No hi és**. Si és representat, triau qui el representa: ha de ser una persona present amb l'escrit de delegació signat (la carta de convocatòria ja inclou el model).

El programa calcula el cens, els presents més els representats i el percentatge, i us diu si s'arriba al quòrum en 1a o en 2a convocatòria. A la junta cal la majoria dels seus membres.

# 4. Els acords

Premeu **+ Acord** per a cada decisió: el punt de l'ordre del dia, el text, el resultat (**Aprovat**, **Rebutjat** o **Informatiu**) i els vots a favor, en contra i abstencions. Si hi ha més vots que persones amb vot presents o representades, el programa us avisa.

Després, marcau la reunió com a **Celebrada** i redactau l'acta: vegeu [Llibre d'actes](/ajuda/llibre-actes).

> Consell: per al quòrum i el cens compta la data de la reunió. Si heu de donar d'alta socis nous, feu-ho abans de passar llista.`,
      es: `En [Órganos de gobierno](/governanca), pestaña **Reuniones**, se gestionan las reuniones de la asamblea general, de la junta directiva y de las comisiones.

# Antes de empezar: los requisitos de los estatutos

Pulsad **Requisitos de los estatutos** y copiad lo que dicen vuestros estatutos: los **días de antelación de la convocatoria** (por defecto 15) y el **quórum en primera convocatoria** en porcentaje (por defecto 50 %). En segunda convocatoria, la asamblea puede celebrarse con cualquier número de asistentes.

# 1. Crear la reunión

Pulsad **+ Nueva reunión** y elegid el **Órgano** (Asamblea general, Junta directiva o Comisión), el **Tipo** (Ordinaria o Extraordinaria), la fecha, las horas de primera y segunda convocatoria, el lugar y el **Orden del día** (un punto por línea). El estado será **Prevista**.

# 2. Enviar la convocatoria

Abrid la reunión. En el apartado **Convocatoria**:

- **Enviar por correo** la envía a todos los socios con derecho a voto que tienen correo (en la junta, a sus miembros). También la reciben los que no quieren comunicaciones, porque es una convocatoria estatutaria.
- Para quien no tiene correo, **Imprimir las cartas** (e **Imprimir las etiquetas** para los sobres) y, una vez enviadas, **Registrar las cartas enviadas**.

La reunión pasa a **Convocada** con la fecha. Si entre la convocatoria y la reunión hay menos días de los que exigen los estatutos, el programa os avisa: una asamblea mal convocada puede impugnarse.

# 3. El día de la reunión: asistencia y quórum

En **Asistencia y quórum**, pulsad **Pasar lista**. Aparecen los socios con derecho a voto en la fecha de la reunión (o los miembros de la junta). Para cada uno elegid **Presente**, **Representado** o **No asiste**. Si está representado, elegid quién lo representa: debe ser una persona presente con el escrito de delegación firmado (la carta de convocatoria ya incluye el modelo).

El programa calcula el censo, los presentes más los representados y el porcentaje, y os dice si se alcanza el quórum en 1.ª o en 2.ª convocatoria. En la junta hace falta la mayoría de sus miembros.

# 4. Los acuerdos

Pulsad **+ Acuerdo** para cada decisión: el punto del orden del día, el texto, el resultado (**Aprobado**, **Rechazado** o **Informativo**) y los votos a favor, en contra y abstenciones. Si hay más votos que personas con voto presentes o representadas, el programa os avisa.

Después, marcad la reunión como **Celebrada** y redactad el acta: véase [Libro de actas](/ajuda/llibre-actes).

> Consejo: para el quórum y el censo cuenta la fecha de la reunión. Si tenéis que dar de alta socios nuevos, hacedlo antes de pasar lista.`,
      en: `In [Governing bodies](/governanca), **Meetings** tab, you manage meetings of the general meeting, the board and committees.

# Before you start: statutory requirements

Press **Statutory requirements** and copy what your statutes say: the **Days of notice** (15 by default) and the **Quorum at first call** as a percentage (50 % by default). At second call, the general meeting can be held with any number of attendees.

# 1. Create the meeting

Press **+ New meeting** and choose the **Body** (General meeting, Board or Committee), the **Type** (Standard or Extraordinary), the date, first and second call times, the place and the **Agenda** (one item per line). Its status will be **Planned**.

# 2. Send the notice

Open the meeting. Under the notice section:

- **Send by email** sends it to every voting member with an email address (for the board, to its members). Members who opted out of communications also receive it, because it is a statutory notice.
- For people without email, **Print letters** (and **Print labels** for the envelopes) and, once posted, **Record letters sent**.

The meeting becomes **Called**, with the date. If the notice period is shorter than your statutes require, the program warns you: a badly called general meeting can be challenged.

# 3. On the day: attendance and quorum

Under **Attendance and quorum**, press **Take attendance**. The list shows members with a vote on the meeting date (or board members). For each one choose **Present**, **Represented** or **Absent**. For a represented member, choose the proxy: it must be someone present holding a signed proxy form (the notice letter already includes the template).

The program calculates the roll, present plus represented, and the percentage, and tells you whether the quorum is reached at first or second call. A board meeting needs a majority of its members.

# 4. Resolutions

Press **+ Resolution** for each decision: agenda item, text, result (**Approved**, **Rejected** or **For information**) and votes for, against and abstentions. If there are more votes than voting people present or represented, the program warns you.

Then mark the meeting as **Held** and write the minutes: see [Minutes book](/ajuda/llibre-actes).

> Tip: the roll and quorum are calculated for the meeting date. If you need to add new members, do it before taking attendance.`,
    },
  },
  {
    id: 'llibre-actes',
    seccio: 'govern',
    titol: { ca: 'Llibre d\'actes', es: 'Libro de actas', en: 'Minutes book' },
    resum: {
      ca: 'Redactar l\'acta d\'una reunió, aprovar-la i tancar-la (ja no es pot canviar) i imprimir el llibre d\'actes.',
      es: 'Redactar el acta de una reunión, aprobarla y cerrarla (ya no se puede cambiar) e imprimir el libro de actas.',
      en: 'Writing the minutes of a meeting, approving and closing them (they can no longer change) and printing the minutes book.',
    },
    paraules: ['acta', 'actas', 'minutes', 'llibre', 'libro', 'book', 'aprovar', 'aprobar', 'approve', 'tancar', 'cerrar', 'close', 'numeració', 'numeración'],
    cos: {
      ca: `L'article 14 de la LO 1/2002 obliga les associacions a dur un **llibre d'actes** de les reunions dels seus òrgans de govern. El programa el construeix a partir de les reunions.

# Redactar l'acta

1. A [Òrgans de govern](/governanca), obriu una reunió que consti com a **Celebrada**.
2. A l'apartat **Acta**, premeu **Redacta l'acta**. Rep un número correlatiu per òrgan i any (per exemple 3/2026 de l'assemblea).
3. Escriviu el desenvolupament de la sessió i indicau qui presideix i qui fa de secretari/ària. Els assistents, el quòrum, l'ordre del dia i els acords s'afegeixen sols al document.
4. Premeu **Desa l'esborrany** tantes vegades com calgui. Amb **Imprimeix l'acta** la podeu revisar en paper.

# Aprovar i tancar l'acta

Normalment l'acta s'aprova al final de la mateixa reunió o a la següent. Quan estigui aprovada:

1. Indicau la **Data d'aprovació** (no pot ser anterior a la reunió ni futura).
2. Premeu **Aprova i tanca**.

> Compte: un cop aprovada, ni l'acta, ni els acords, ni l'assistència, ni les dades de la reunió es poden modificar ni esborrar. Així es garanteix que el llibre d'actes és fidel i no es pot alterar després. Revisau-la bé abans de tancar-la.

Queda anotat quan i qui l'ha tancat. Si després es detecta un error, s'ha de corregir en una acta posterior, com es faria en un llibre de paper.

# El llibre d'actes

A la pestanya **Llibre d'actes** triau l'òrgan i l'any i veureu totes les actes amb el seu estat (**Esborrany** o **Aprovada el …**). Amb **Imprimeix el llibre** obteniu el llibre complet per signar i arxivar. Les actes pendents d'aprovar no hi surten.

Si la numeració té salts, el programa us avisa. Només es pot esborrar l'esborrany de l'última acta de l'any, perquè la numeració ha de ser correlativa.

> Consell: les actes aprovades són la base dels [certificats d'acords](/ajuda/certificats) que us demanaran el banc, el Registre d'Associacions o les subvencions.`,
      es: `El artículo 14 de la LO 1/2002 obliga a las asociaciones a llevar un **libro de actas** de las reuniones de sus órganos de gobierno. El programa lo construye a partir de las reuniones.

# Redactar el acta

1. En [Órganos de gobierno](/governanca), abrid una reunión que conste como **Celebrada**.
2. En el apartado **Acta**, pulsad **Redactar el acta**. Recibe un número correlativo por órgano y año (por ejemplo 3/2026 de la asamblea).
3. Escribid el desarrollo de la sesión e indicad quién preside y quién hace de secretario/a. Los asistentes, el quórum, el orden del día y los acuerdos se añaden solos al documento.
4. Pulsad **Guardar el borrador** tantas veces como haga falta. Con **Imprimir el acta** podéis revisarla en papel.

# Aprobar y cerrar el acta

Normalmente el acta se aprueba al final de la misma reunión o en la siguiente. Cuando esté aprobada:

1. Indicad la **Fecha de aprobación** (no puede ser anterior a la reunión ni futura).
2. Pulsad **Aprobar y cerrar**.

> Cuidado: una vez aprobada, ni el acta, ni los acuerdos, ni la asistencia, ni los datos de la reunión pueden modificarse ni borrarse. Así se garantiza que el libro de actas es fiel y no puede alterarse después. Revisadla bien antes de cerrarla.

Queda anotado cuándo y quién la ha cerrado. Si después se detecta un error, debe corregirse en un acta posterior, como se haría en un libro de papel.

# El libro de actas

En la pestaña **Libro de actas** elegid el órgano y el año y veréis todas las actas con su estado (**Borrador** o **Aprobada el …**). Con **Imprimir el libro** obtenéis el libro completo para firmar y archivar. Las actas pendientes de aprobar no aparecen.

Si la numeración tiene saltos, el programa os avisa. Solo se puede borrar el borrador de la última acta del año, porque la numeración debe ser correlativa.

> Consejo: las actas aprobadas son la base de los [certificados de acuerdos](/ajuda/certificats) que os pedirán el banco, el Registro de Asociaciones o las subvenciones.`,
      en: `Article 14 of the Spanish law on associations (LO 1/2002) requires associations to keep a **minutes book** of the meetings of their governing bodies. The program builds it from your meetings.

# Writing the minutes

1. In [Governing bodies](/governanca), open a meeting whose status is **Held**.
2. In the minutes section, press **Write the minutes**. They get a consecutive number per body and year (for example 3/2026 for the general meeting).
3. Write how the meeting went and state who chaired and who acted as secretary. Attendees, quorum, agenda and resolutions are added to the document automatically.
4. Press **Save draft** as often as needed. **Print minutes** lets you check them on paper.

# Approving and closing the minutes

Minutes are usually approved at the end of the same meeting or at the next one. Once approved:

1. Enter the **Approval date** (it cannot be before the meeting or in the future).
2. Press **Approve and close**.

> Warning: once approved, the minutes, resolutions, attendance and meeting details can no longer be changed or deleted. This guarantees the minutes book is accurate and cannot be altered afterwards. Check them carefully before closing.

The program records when and by whom they were closed. If a mistake is found later, it must be corrected in later minutes, as in a paper book.

# The minutes book

In the **Minutes book** tab, choose the body and the year to see all minutes with their status (**Draft** or **Approved on …**). **Print book** produces the complete book to sign and file. Minutes pending approval are not included.

If the numbering has gaps, the program warns you. Only the draft of the last minutes of the year can be deleted, because numbering must be consecutive.

> Tip: approved minutes are the basis of the [resolution certificates](/ajuda/certificats) that banks, the Register of Associations or grant bodies will ask for.`,
    },
  },
  {
    id: 'junta-directiva',
    seccio: 'govern',
    titol: { ca: 'Junta directiva', es: 'Junta directiva', en: 'The board' },
    resum: {
      ca: 'Registrar els càrrecs de la junta, els mandats i els cessaments, i controlar la comunicació al Registre d\'Associacions.',
      es: 'Registrar los cargos de la junta, los mandatos y los ceses, y controlar la comunicación al Registro de Asociaciones.',
      en: 'Recording board positions, terms and departures, and tracking notification to the Register of Associations.',
    },
    paraules: ['junta', 'board', 'càrrec', 'cargo', 'position', 'president', 'presidente', 'secretari', 'secretario', 'tresorer', 'tesorero', 'vocal', 'mandat', 'mandato', 'term', 'cessament', 'cese', 'registre d\'associacions', 'registro de asociaciones', 'elecció', 'elección'],
    cos: {
      ca: `A [Òrgans de govern](/governanca), pestanya **Junta directiva**, hi ha la composició actual de la junta i l'historial de càrrecs.

# Registrar un càrrec

1. Premeu **+ Nou càrrec**.
2. Triau la **Persona sòcia** i el **Càrrec**: Presidència, Vicepresidència, Secretaria, Tresoreria o Vocal.
3. Indicau la **Data d'elecció** i, si voleu, la reunió en què es va elegir (així queda lligat a l'acta).
4. A **Fi del mandat** posau la data en què acaba; el botó **+4 anys** la calcula a partir de l'elecció (canviau-la si els vostres estatuts diuen una altra cosa).
5. Premeu **Desa**.

Un càrrec únic (per exemple la presidència) no pot estar ocupat per dues persones a la vegada: abans d'entrar la persona nova, registrau el cessament de l'anterior.

# Cessaments i mandats vençuts

Quan una persona deixa el càrrec, editau-lo i indicau la **Data de cessament** i el **Motiu del cessament** (fi del mandat, dimissió…). No l'esborreu: passa a l'**Historial de càrrecs**.

Si el mandat ha vençut, el càrrec surt marcat com a **vençut**, però continua en funcions fins que l'assemblea n'elegeixi un altre. El programa també avisa quan falten pocs dies per al venciment.

# Comunicar-ho al Registre d'Associacions

Els canvis en la composició de la junta s'han de comunicar al Registre d'Associacions de les Illes Balears (o al de la vostra comunitat autònoma). Per a cada nomenament i cada cessament, el programa mostra **Pendent · marca com a comunicat**. Quan hàgiu presentat la comunicació, feu-hi clic: quedarà la data a **Comunicat al Registre**.

> Consell: per presentar el canvi us demanaran un certificat de l'acord d'elecció. El podeu treure des de [Certificats](/ajuda/certificats) (certificat d'acord o de composició de la junta). La persona que ocupa la secretaria ha d'estar registrada aquí perquè el programa pugui emetre certificats.`,
      es: `En [Órganos de gobierno](/governanca), pestaña **Junta directiva**, está la composición actual de la junta y el historial de cargos.

# Registrar un cargo

1. Pulsad **+ Nuevo cargo**.
2. Elegid la **Persona socia** y el **Cargo**: Presidencia, Vicepresidencia, Secretaría, Tesorería o Vocal.
3. Indicad la **Fecha de elección** y, si queréis, la reunión en la que se eligió (así queda ligado al acta).
4. En **Fin del mandato** poned la fecha en que termina; el botón **+4 años** la calcula a partir de la elección (cambiadla si vuestros estatutos dicen otra cosa).
5. Pulsad **Guardar**.

Un cargo único (por ejemplo la presidencia) no puede estar ocupado por dos personas a la vez: antes de introducir a la persona nueva, registrad el cese de la anterior.

# Ceses y mandatos vencidos

Cuando una persona deja el cargo, editadlo e indicad la **Fecha de cese** y el **Motivo del cese** (fin del mandato, dimisión…). No lo borréis: pasa al **Historial de cargos**.

Si el mandato ha vencido, el cargo aparece marcado como **vencido**, pero continúa en funciones hasta que la asamblea elija a otra persona. El programa también avisa cuando faltan pocos días para el vencimiento.

# Comunicarlo al Registro de Asociaciones

Los cambios en la composición de la junta deben comunicarse al Registro de Asociaciones de las Illes Balears (o al de vuestra comunidad autónoma). Para cada nombramiento y cada cese, el programa muestra **Pendiente · marcar como comunicado**. Cuando hayáis presentado la comunicación, haced clic: quedará la fecha en **Comunicado al Registro**.

> Consejo: para presentar el cambio os pedirán un certificado del acuerdo de elección. Podéis sacarlo desde [Certificados](/ajuda/certificats) (certificado de acuerdo o de composición de la junta). La persona que ocupa la secretaría debe estar registrada aquí para que el programa pueda emitir certificados.`,
      en: `In [Governing bodies](/governanca), **Board** tab, you find the current board and the history of positions.

# Recording a position

1. Press **+ New position**.
2. Choose the **Member** and the position: President, Vice-president, Secretary, Treasurer or Board member.
3. Enter the **Election date** and, optionally, the meeting where they were elected (this links it to the minutes).
4. Under **End of term**, enter the end date; the **+4 years** button calculates it from the election (change it if your statutes say otherwise).
5. Press **Save**.

A single position (for example president) cannot be held by two people at once: before entering the new person, record the previous holder's end date.

# Departures and expired terms

When someone leaves a position, edit it and enter the **End date** and the **Reason for leaving** (end of term, resignation…). Do not delete it: it moves to the **Position history**.

If the term has expired, the position is marked **expired** but the person stays in office until the general meeting elects someone else. The program also warns when the end of a term is near.

# Notifying the Register of Associations

Changes in the board must be notified to the Register of Associations of the Balearic Islands (or of your region). For each appointment and departure, the program shows **Pending · mark as notified**. When you have filed the notification, click it: the date is saved under **Notified to the Register**.

> Tip: to file the change you will be asked for a certificate of the election resolution. You can produce it in [Certificates](/ajuda/certificats) (resolution certificate or board composition certificate). The person holding the secretary position must be recorded here for the program to issue certificates.`,
    },
  },
  {
    id: 'certificats',
    seccio: 'govern',
    titol: { ca: 'Certificats', es: 'Certificados', en: 'Certificates' },
    resum: {
      ca: 'Expedir certificats numerats de condició de soci, d\'acords i de composició de la junta.',
      es: 'Expedir certificados numerados de condición de socio, de acuerdos y de composición de la junta.',
      en: 'Issuing numbered certificates of membership, of resolutions and of board composition.',
    },
    paraules: ['certificat', 'certificado', 'certificate', 'banc', 'banco', 'bank', 'acord', 'acuerdo', 'resolution', 'condició de soci', 'subvenció', 'subvención', 'grant', 'vist i plau', 'visto bueno'],
    cos: {
      ca: `Sovint us demanaran certificats: el banc per canviar les signatures, el Registre d'Associacions quan canvia la junta, una administració per a una subvenció, o un soci que vol acreditar que ho és. A [Òrgans de govern](/governanca), pestanya **Certificats**, els podeu expedir en un minut.

# Emetre un certificat

1. Premeu **+ Nou certificat**.
2. Triau el **Tipus de certificat** (vegeu els tipus més avall).
3. Segons el tipus, triau la persona sòcia o l'acord.
4. Opcionalment, escriviu la **Finalitat** (per exemple «obrir un compte bancari» o «sol·licitud de subvenció»).
5. Premeu **Emet el certificat** i després **Imprimeix el certificat**.

# Tipus de certificat

- **Condició de soci**: certifica que una persona és (o ha estat) sòcia, amb el número i les dates d'alta i baixa.
- **Acord d'un òrgan**: reprodueix un acord d'una reunió, amb la data, la convocatòria, l'assistència i el resultat de la votació.
- **Composició de la junta directiva**: llista les persones que formen la junta actual i els seus càrrecs.

El certificat el signa la secretaria amb el **vist i plau** de la presidència, com és habitual en les associacions. Hi surten les dades de l'entitat (nom, NIF, número de registre) que heu configurat.

# Numeració i registre

Cada certificat queda numerat (per exemple 4/2026) i registrat a la llista amb la data, el tipus, a qui es refereix i qui l'ha emès. Així sempre sabreu quins certificats heu lliurat.

Un acord del qual s'ha emès un certificat ja no es pot esborrar, ni tampoc la reunió on es va prendre.

> Compte: per emetre certificats cal tenir registrada la persona que ocupa la secretaria a la [Junta directiva](/ajuda/junta-directiva). I per a un certificat d'acord és millor que l'acta estigui aprovada; si no, el certificat ho fa constar.`,
      es: `A menudo os pedirán certificados: el banco para cambiar las firmas, el Registro de Asociaciones cuando cambia la junta, una administración para una subvención, o un socio que quiere acreditar que lo es. En [Órganos de gobierno](/governanca), pestaña **Certificados**, podéis expedirlos en un minuto.

# Emitir un certificado

1. Pulsad **+ Nuevo certificado**.
2. Elegid el **Tipo de certificado** (véanse los tipos más abajo).
3. Según el tipo, elegid la persona socia o el acuerdo.
4. Opcionalmente, escribid la **Finalidad** (por ejemplo «abrir una cuenta bancaria» o «solicitud de subvención»).
5. Pulsad **Emitir el certificado** y después **Imprimir el certificado**.

# Tipos de certificado

- **Condición de socio**: certifica que una persona es (o ha sido) socia, con el número y las fechas de alta y baja.
- **Acuerdo de un órgano**: reproduce un acuerdo de una reunión, con la fecha, la convocatoria, la asistencia y el resultado de la votación.
- **Composición de la junta directiva**: lista las personas que forman la junta actual y sus cargos.

El certificado lo firma la secretaría con el **visto bueno** de la presidencia, como es habitual en las asociaciones. Aparecen los datos de la entidad (nombre, NIF, número de registro) que habéis configurado.

# Numeración y registro

Cada certificado queda numerado (por ejemplo 4/2026) y registrado en la lista con la fecha, el tipo, a quién se refiere y quién lo ha emitido. Así siempre sabréis qué certificados habéis entregado.

Un acuerdo del que se ha emitido un certificado ya no puede borrarse, ni tampoco la reunión en la que se tomó.

> Cuidado: para emitir certificados hay que tener registrada a la persona que ocupa la secretaría en la [Junta directiva](/ajuda/junta-directiva). Y para un certificado de acuerdo es mejor que el acta esté aprobada; si no, el certificado lo hace constar.`,
      en: `You will often be asked for certificates: by the bank to change signatories, by the Register of Associations when the board changes, by a public body for a grant, or by a member who needs proof of membership. In [Governing bodies](/governanca), **Certificates** tab, you can issue them in a minute.

# Issuing a certificate

1. Press **+ New certificate**.
2. Choose the **Certificate type** (see the types below).
3. Depending on the type, choose the member or the resolution.
4. Optionally, type the **Purpose** (for example «opening a bank account» or «grant application»).
5. Press **Issue the certificate** and then **Print certificate**.

# Certificate types

- **Membership**: certifies that a person is (or was) a member, with their number and joining and leaving dates.
- **Resolution of a body**: reproduces a resolution of a meeting, with the date, call, attendance and voting result.
- **Board composition**: lists the people on the current board and their positions.

The certificate is signed by the secretary with the president's **approval («vist i plau»)**, as is usual in Spanish associations. It shows the organisation details (name, tax ID, registration number) from your settings.

# Numbering and record

Each certificate is numbered (for example 4/2026) and listed with the date, type, who it refers to and who issued it, so you always know which certificates have been given out.

A resolution that has a certificate can no longer be deleted, nor can the meeting where it was adopted.

> Warning: to issue certificates, the person holding the secretary position must be recorded in [The board](/ajuda/junta-directiva). For a resolution certificate it is better if the minutes are approved; otherwise the certificate says so.`,
    },
  },
  {
    id: 'proteccio-dades',
    seccio: 'govern',
    titol: { ca: 'Protecció de dades', es: 'Protección de datos', en: 'Data protection' },
    resum: {
      ca: 'Consentiments, sol·licituds de drets en un mes, conservació i anonimització, documents RGPD i registre d\'activitat.',
      es: 'Consentimientos, solicitudes de derechos en un mes, conservación y anonimización, documentos RGPD y registro de actividad.',
      en: 'Consents, rights requests within one month, retention and anonymisation, GDPR documents and activity log.',
    },
    rutes: ['/proteccio-dades'],
    paraules: ['rgpd', 'gdpr', 'lopd', 'lopdgdd', 'privacitat', 'privacidad', 'privacy', 'consentiment', 'consentimiento', 'consent', 'drets', 'derechos', 'rights', 'supressió', 'supresión', 'erasure', 'anonimitzar', 'anonimizar', 'anonymise', 'auditoria', 'audit', 'log', 'aepd', 'conservació', 'retention'],
    cos: {
      ca: `Les associacions tracten dades personals i han de complir el Reglament general de protecció de dades (RGPD) i la Llei orgànica 3/2018 (LOPDGDD). L'entitat n'és la **responsable del tractament**. La pantalla [Protecció de dades](/proteccio-dades) reuneix tot el que cal, en sis pestanyes.

# Resum

Un control ràpid amb quatre punts: socis que no han signat el **full d'inscripció**, **menors de 14 anys** sense tutor legal indicat, **sol·licituds de drets** pendents i dades que han superat el **termini de conservació**. Tot en verd vol dir que anau bé. També us diu quants socis han demanat no rebre comunicacions (el programa ja els exclou).

# Sol·licituds de drets

Qualsevol persona pot demanar accés, rectificació, supressió, oposició, limitació del tractament, portabilitat o retirar el consentiment. Premeu **+ Nova sol·licitud**, indicau la persona, el dret, la data de recepció i, quan la resolgueu, la data de resposta i què s'ha fet. Cal respondre en **un mes** (art. 12.3 RGPD): el programa calcula el termini i us avisa.

Per atendre-les, a la fitxa del soci hi ha **Exporta totes les seves dades** (accés i portabilitat) i **Suprimeix les dades (anonimitza)** (supressió).

# Conservació

Les dades no es poden guardar per sempre. Segons la configuració, les dels socis es guarden uns anys després de la baixa (habitualment 5, el termini general de prescripció) i les de les persones interessades uns mesos. Aquesta pestanya llista els **Socis per anonimitzar** i les **Persones interessades per eliminar**; amb **Aplica la supressió** es fa tot d'un cop. L'anonimització esborra nom, contacte, foto i historial, però conserva les quotes i els moviments comptables sense el nom, perquè la llei obliga a guardar-los. No es pot desfer.

# Documents

Models adaptats a una associació petita, amb les dades de la vostra entitat: el **Registre d'activitats de tractament (art. 30 RGPD)**, la **Clàusula informativa** per a formularis i cartells i el **Full d'inscripció en blanc** amb els consentiments. Convé que la junta els revisi.

# Registre d'activitat

Mostra qui ha creat, modificat, exportat o suprimit dades personals, i quan, així com les entrades al programa. Serveix per demostrar que les dades es tracten correctament (responsabilitat proactiva) i per detectar usos indeguts.

# Configuració

El correu per exercir els drets, els anys i mesos de conservació, el delegat de protecció de dades (una associació petita normalment no n'ha de tenir) i els destinataris habituals. Només Administració ho pot modificar.

> Compte: si hi ha una fuita de dades (per exemple, un correu enviat amb totes les adreces visibles o un portàtil robat), cal valorar si s'ha de notificar a l'AEPD en 72 hores.`,
      es: `Las asociaciones tratan datos personales y deben cumplir el Reglamento general de protección de datos (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD). La entidad es la **responsable del tratamiento**. La pantalla [Protección de datos](/proteccio-dades) reúne todo lo necesario, en seis pestañas.

# Resumen

Un control rápido con cuatro puntos: socios que no han firmado la **hoja de inscripción**, **menores de 14 años** sin tutor legal indicado, **solicitudes de derechos** pendientes y datos que han superado el **plazo de conservación**. Todo en verde significa que vais bien. También os dice cuántos socios han pedido no recibir comunicaciones (el programa ya los excluye).

# Solicitudes de derechos

Cualquier persona puede pedir acceso, rectificación, supresión, oposición, limitación del tratamiento, portabilidad o retirar el consentimiento. Pulsad **+ Nueva solicitud**, indicad la persona, el derecho, la fecha de recepción y, cuando la resolváis, la fecha de respuesta y qué se ha hecho. Hay que responder en **un mes** (art. 12.3 RGPD): el programa calcula el plazo y os avisa.

Para atenderlas, en la ficha del socio están **Exportar todos sus datos** (acceso y portabilidad) y **Suprimir los datos (anonimizar)** (supresión).

# Conservación

Los datos no pueden guardarse para siempre. Según la configuración, los de los socios se guardan unos años después de la baja (habitualmente 5, el plazo general de prescripción) y los de las personas interesadas unos meses. Esta pestaña lista los **Socios por anonimizar** y las **Personas interesadas por eliminar**; con **Aplica la supresión** se hace todo de una vez. La anonimización borra nombre, contacto, foto e historial, pero conserva las cuotas y los movimientos contables sin el nombre, porque la ley obliga a guardarlos. No se puede deshacer.

# Documentos

Modelos adaptados a una asociación pequeña, con los datos de vuestra entidad: el **Registro de actividades de tratamiento (art. 30 RGPD)**, la **Cláusula informativa** para formularios y carteles y la **Hoja de inscripción en blanco** con los consentimientos. Conviene que la junta los revise.

# Registro de actividad

Muestra quién ha creado, modificado, exportado o suprimido datos personales, y cuándo, así como las entradas al programa. Sirve para demostrar que los datos se tratan correctamente (responsabilidad proactiva) y para detectar usos indebidos.

# Configuración

El correo para ejercer los derechos, los años y meses de conservación, el delegado de protección de datos (una asociación pequeña normalmente no debe tenerlo) y los destinatarios habituales. Solo Administración puede modificarlo.

> Cuidado: si hay una fuga de datos (por ejemplo, un correo enviado con todas las direcciones visibles o un portátil robado), hay que valorar si debe notificarse a la AEPD en 72 horas.`,
      en: `Associations process personal data and must comply with the GDPR and the Spanish data protection act (LOPDGDD, Organic Law 3/2018). The organisation is the **data controller**. The [Data protection](/proteccio-dades) screen brings together everything you need, in six tabs.

# Summary

A quick check of four points: members who have not signed the **membership form**, **under-14s** with no legal guardian recorded, pending **rights requests**, and data past its **retention period**. All green means you are fine. It also shows how many members asked not to receive communications (the program already excludes them).

# Rights requests

Anyone can ask for access, rectification, erasure, objection, restriction of processing, portability or withdrawal of consent. Press **+ New request**, enter the person, the right, the date received and, when resolved, the reply date and what was done. You must reply within **one month** (GDPR art. 12.3): the program calculates the deadline and warns you.

To handle them, the member record has **Export all their data** (access and portability) and **Erase data (anonymise)** (erasure).

# Retention

Data cannot be kept forever. According to your settings, members' data is kept some years after they leave (usually 5, the general limitation period) and prospects' data some months. This tab lists **Members to anonymise** and **Prospects to delete**; **Apply erasure** does it all at once. Anonymisation removes name, contact details, photo and history, but keeps fees and accounting entries without the name, because the law requires keeping them. It cannot be undone.

# Documents

Templates suited to a small association, filled with your organisation's details: the **Record of processing activities (art. 30 GDPR)**, the **Privacy notice** for forms and posters, and the **Blank membership form** with consents. The board should review them.

# Activity log

Shows who created, changed, exported or erased personal data and when, as well as sign-ins. It helps prove data is handled correctly (accountability) and detect misuse.

# Settings

The email for exercising rights, retention years and months, the data protection officer (a small association usually does not need one) and usual recipients. Only Administration can change them.

> Warning: if there is a data breach (for example an email sent with all addresses visible, or a stolen laptop), you must assess whether to notify the Spanish data protection agency (AEPD) within 72 hours.`,
    },
  },
];

export const PREGUNTES: Pregunta[] = [
  {
    pregunta: { ca: 'Puc esborrar un soci?', es: '¿Puedo borrar a un socio?', en: 'Can I delete a member?' },
    resposta: {
      ca: 'Normalment no: si deixa l\'entitat, registrau-ne la baixa amb «Donar de baixa» i en quedarà l\'historial al llibre registre. «Elimina» (només Administració) és per a registres fets per error. Si la persona demana suprimir les seves dades, anonimitzau-la.',
      es: 'Normalmente no: si deja la entidad, registrad su baja con «Dar de baja» y quedará el historial en el libro registro. «Eliminar» (solo Administración) es para registros hechos por error. Si la persona pide suprimir sus datos, anonimizadla.',
      en: 'Usually not: if they leave, use «Remove from membership» so the history stays in the register. «Delete» (Administration only) is for records created by mistake. If the person asks for erasure, anonymise them.',
    },
    article: 'baixa-i-readmissio',
  },
  {
    pregunta: {
      ca: 'Un soci no vol rebre correus, però hi ha assemblea. L\'he de convocar?',
      es: 'Un socio no quiere recibir correos, pero hay asamblea. ¿Debo convocarlo?',
      en: 'A member opted out of emails, but there is a general meeting. Must I send them the notice?',
    },
    resposta: {
      ca: 'Sí. L\'oposició a rebre comunicacions l\'exclou dels enviaments de Comunicacions, però la convocatòria oficial s\'envia des de la reunió a tots els socis amb dret a vot, perquè és un dret seu i no publicitat.',
      es: 'Sí. La oposición a recibir comunicaciones lo excluye de los envíos de Comunicaciones, pero la convocatoria oficial se envía desde la reunión a todos los socios con derecho a voto, porque es un derecho suyo y no publicidad.',
      en: 'Yes. Opting out excludes them from Communications mailings, but the official notice is sent from the meeting to every voting member, because attending is their right and it is not marketing.',
    },
    article: 'comunicacions',
  },
  {
    pregunta: {
      ca: 'Com faig una assemblea amb delegacions de vot?',
      es: '¿Cómo hago una asamblea con delegaciones de voto?',
      en: 'How do I run a general meeting with proxy votes?',
    },
    resposta: {
      ca: 'En passar llista, marcau la persona absent com a «Representat» i triau qui la representa, que ha d\'estar marcat com a «Present» i dur l\'escrit de delegació signat. El quòrum compta presents més representats.',
      es: 'Al pasar lista, marcad a la persona ausente como «Representado» y elegid quién la representa, que debe estar marcado como «Presente» y llevar el escrito de delegación firmado. El quórum cuenta presentes más representados.',
      en: 'When taking attendance, mark the absent member as «Represented» and choose their proxy, who must be marked «Present» and hold the signed proxy form. The quorum counts present plus represented.',
    },
    article: 'organs-de-govern',
  },
  {
    pregunta: {
      ca: 'He tancat una acta i hi ha un error. La puc corregir?',
      es: 'He cerrado un acta y hay un error. ¿Puedo corregirla?',
      en: 'I closed the minutes and found a mistake. Can I fix it?',
    },
    resposta: {
      ca: 'No: una acta aprovada no es pot modificar, igual que en un llibre de paper. La correcció s\'ha de fer constar a l\'acta d\'una reunió posterior.',
      es: 'No: un acta aprobada no puede modificarse, igual que en un libro de papel. La corrección debe hacerse constar en el acta de una reunión posterior.',
      en: 'No: approved minutes cannot be changed, as in a paper book. The correction must be recorded in the minutes of a later meeting.',
    },
    article: 'llibre-actes',
  },
  {
    pregunta: {
      ca: 'Per què un soci surt «sense vot»?',
      es: '¿Por qué un socio aparece «sin voto»?',
      en: 'Why is a member shown as «no vote»?',
    },
    resposta: {
      ca: 'Perquè és menor de 18 anys o perquè la seva categoria no té dret a vot. Ho podeu revisar al botó «Categories» de la llista de socis.',
      es: 'Porque es menor de 18 años o porque su categoría no tiene derecho a voto. Podéis revisarlo en el botón «Categorías» de la lista de socios.',
      en: 'Because they are under 18 or their category has no vote. You can check this with the «Categories» button in the members list.',
    },
    article: 'categories-i-dret-de-vot',
  },
  {
    pregunta: {
      ca: 'Un antic soci torna. El dono d\'alta de nou?',
      es: 'Un antiguo socio vuelve. ¿Lo doy de alta de nuevo?',
      en: 'A former member is coming back. Do I add them again?',
    },
    resposta: {
      ca: 'No. Obriu la seva fitxa (filtre «Baixes») i premeu «Readmet». Conserva el número i al llibre registre s\'obre un període nou.',
      es: 'No. Abrid su ficha (filtro «Bajas») y pulsad «Readmitir». Conserva el número y en el libro registro se abre un periodo nuevo.',
      en: 'No. Open their record (filter «Former members») and press «Readmit». They keep their number and a new period opens in the register.',
    },
    article: 'baixa-i-readmissio',
  },
  {
    pregunta: {
      ca: 'Algú ens demana quines dades tenim seves. Què he de fer?',
      es: 'Alguien nos pide qué datos tenemos suyos. ¿Qué debo hacer?',
      en: 'Someone asks what data we hold about them. What should I do?',
    },
    resposta: {
      ca: 'Registrau la sol·licitud a Protecció de dades → Sol·licituds de drets i, des de la seva fitxa, feu «Exporta totes les seves dades». Cal respondre en un mes com a màxim.',
      es: 'Registrad la solicitud en Protección de datos → Solicitudes de derechos y, desde su ficha, usad «Exportar todos sus datos». Hay que responder en un mes como máximo.',
      en: 'Record the request in Data protection → Rights requests and, from their record, use «Export all their data». You must reply within one month.',
    },
    article: 'proteccio-dades',
  },
  {
    pregunta: {
      ca: 'Un menor es vol fer soci. Què necessito?',
      es: 'Un menor quiere hacerse socio. ¿Qué necesito?',
      en: 'A minor wants to join. What do I need?',
    },
    resposta: {
      ca: 'El nom del pare, la mare o el tutor legal a la fitxa. Si té menys de 14 anys, el full d\'inscripció l\'ha de signar el tutor. Els menors no voten a l\'assemblea.',
      es: 'El nombre del padre, la madre o el tutor legal en la ficha. Si tiene menos de 14 años, la hoja de inscripción la debe firmar el tutor. Los menores no votan en la asamblea.',
      en: 'The name of a parent or legal guardian in the record. If under 14, the guardian must sign the membership form. Minors do not vote at the general meeting.',
    },
    article: 'alta-soci',
  },
  {
    pregunta: {
      ca: 'Hem canviat de president. Què he de fer al programa?',
      es: 'Hemos cambiado de presidente. ¿Qué debo hacer en el programa?',
      en: 'We have a new president. What do I do in the program?',
    },
    resposta: {
      ca: 'A Junta directiva, posau la data de cessament a l\'anterior i creau el càrrec nou. Emeteu un certificat de l\'acord, presentau-lo al Registre d\'Associacions i marcau els canvis com a comunicats.',
      es: 'En Junta directiva, poned la fecha de cese al anterior y cread el cargo nuevo. Emitid un certificado del acuerdo, presentadlo en el Registro de Asociaciones y marcad los cambios como comunicados.',
      en: 'In the Board tab, enter the end date for the previous president and create the new position. Issue a resolution certificate, file it with the Register of Associations and mark the changes as notified.',
    },
    article: 'junta-directiva',
  },
  {
    pregunta: {
      ca: 'Un voluntari treballa amb infants. Què he de demanar-li?',
      es: 'Un voluntario trabaja con niños. ¿Qué debo pedirle?',
      en: 'A volunteer works with children. What must I ask for?',
    },
    resposta: {
      ca: 'El certificat negatiu del Registre Central de Delinqüents Sexuals (art. 8.4 de la Llei 45/2015), a més de l\'acord d\'incorporació signat i l\'assegurança. Anotau-ne la data a la seva fitxa de voluntariat.',
      es: 'El certificado negativo del Registro Central de Delincuentes Sexuales (art. 8.4 de la Ley 45/2015), además del acuerdo de incorporación firmado y el seguro. Anotad la fecha en su ficha de voluntariado.',
      en: 'A clearance certificate from the Central Register of Sex Offenders (art. 8.4 of Law 45/2015), plus the signed volunteering agreement and insurance. Record the date in their volunteer record.',
    },
    article: 'voluntariat',
  },
];

export const GLOSSARI: Terme[] = [
  {
    terme: { ca: 'Quòrum', es: 'Quórum', en: 'Quorum' },
    definicio: {
      ca: 'Nombre mínim de persones amb vot (presents o representades) perquè una reunió es pugui constituir vàlidament. Els estatuts el fixen per a la primera convocatòria; en segona, sovint n\'hi ha prou amb qualsevol nombre.',
      es: 'Número mínimo de personas con voto (presentes o representadas) para que una reunión pueda constituirse válidamente. Los estatutos lo fijan para la primera convocatoria; en segunda, a menudo basta cualquier número.',
      en: 'Minimum number of voting people (present or represented) for a meeting to be validly held. Statutes set it for the first call; at second call any number is often enough.',
    },
  },
  {
    terme: { ca: 'Assemblea general ordinària', es: 'Asamblea general ordinaria', en: 'Ordinary general meeting' },
    definicio: {
      ca: 'Reunió de tots els socis que s\'ha de fer almenys un cop l\'any per aprovar els comptes, el pressupost i la gestió de la junta (LO 1/2002, art. 11).',
      es: 'Reunión de todos los socios que debe celebrarse al menos una vez al año para aprobar las cuentas, el presupuesto y la gestión de la junta (LO 1/2002, art. 11).',
      en: 'Meeting of all members that must be held at least once a year to approve the accounts, budget and the board\'s management (LO 1/2002, art. 11).',
    },
  },
  {
    terme: { ca: 'Assemblea general extraordinària', es: 'Asamblea general extraordinaria', en: 'Extraordinary general meeting' },
    definicio: {
      ca: 'Assemblea convocada fora de l\'ordinària per a temes especials que fixen els estatuts, com modificar-los, dissoldre l\'entitat o, sovint, elegir la junta.',
      es: 'Asamblea convocada fuera de la ordinaria para temas especiales que fijan los estatutos, como modificarlos, disolver la entidad o, a menudo, elegir la junta.',
      en: 'General meeting called outside the ordinary one for special matters set by the statutes, such as amending them, dissolving the organisation or often electing the board.',
    },
  },
  {
    terme: { ca: 'Delegació de vot', es: 'Delegación de voto', en: 'Proxy vote' },
    definicio: {
      ca: 'Escrit signat amb què un soci que no pot assistir autoritza un altre soci present a representar-lo i votar per ell, si els estatuts ho permeten.',
      es: 'Escrito firmado con el que un socio que no puede asistir autoriza a otro socio presente a representarlo y votar por él, si los estatutos lo permiten.',
      en: 'Signed document by which a member who cannot attend authorises another member who is present to represent them and vote on their behalf, if the statutes allow it.',
    },
  },
  {
    terme: { ca: 'Acta', es: 'Acta', en: 'Minutes' },
    definicio: {
      ca: 'Document que recull què es va tractar i acordar en una reunió: assistents, ordre del dia, deliberacions i acords. Un cop aprovada, no es pot modificar.',
      es: 'Documento que recoge qué se trató y acordó en una reunión: asistentes, orden del día, deliberaciones y acuerdos. Una vez aprobada, no puede modificarse.',
      en: 'Document recording what was discussed and decided at a meeting: attendees, agenda, discussion and resolutions. Once approved, it cannot be changed.',
    },
  },
  {
    terme: { ca: 'Llibre registre de socis', es: 'Libro registro de socios', en: 'Register of members' },
    definicio: {
      ca: 'Relació actualitzada de les persones associades amb les dates d\'alta i baixa, obligatòria segons l\'article 14 de la LO 1/2002.',
      es: 'Relación actualizada de las personas asociadas con las fechas de alta y baja, obligatoria según el artículo 14 de la LO 1/2002.',
      en: 'Up-to-date list of members with joining and leaving dates, required by article 14 of LO 1/2002.',
    },
  },
  {
    terme: { ca: 'RGPD', es: 'RGPD', en: 'GDPR' },
    definicio: {
      ca: 'Reglament (UE) 2016/679, general de protecció de dades. Regula com s\'han de recollir, guardar i usar les dades personals a tota la Unió Europea.',
      es: 'Reglamento (UE) 2016/679, general de protección de datos. Regula cómo deben recogerse, guardarse y usarse los datos personales en toda la Unión Europea.',
      en: 'Regulation (EU) 2016/679, the General Data Protection Regulation. It governs how personal data is collected, kept and used across the European Union.',
    },
  },
  {
    terme: { ca: 'LOPDGDD', es: 'LOPDGDD', en: 'LOPDGDD' },
    definicio: {
      ca: 'Llei orgànica 3/2018, de protecció de dades personals i garantia dels drets digitals. Adapta el RGPD a l\'Estat espanyol; per exemple, fixa en 14 anys l\'edat per consentir.',
      es: 'Ley Orgánica 3/2018, de protección de datos personales y garantía de los derechos digitales. Adapta el RGPD a España; por ejemplo, fija en 14 años la edad para consentir.',
      en: 'Spanish Organic Law 3/2018 on data protection and digital rights. It adapts the GDPR to Spain; for example, it sets 14 as the age of consent for data processing.',
    },
  },
  {
    terme: { ca: 'Responsable i encarregat del tractament', es: 'Responsable y encargado del tratamiento', en: 'Data controller and processor' },
    definicio: {
      ca: 'El responsable decideix per a què i com es tracten les dades (l\'associació). L\'encarregat les tracta per compte del responsable, per exemple el proveïdor de correu o una gestoria.',
      es: 'El responsable decide para qué y cómo se tratan los datos (la asociación). El encargado los trata por cuenta del responsable, por ejemplo el proveedor de correo o una gestoría.',
      en: 'The controller decides why and how data is processed (the association). The processor handles it on the controller\'s behalf, for example the email provider or an accountant.',
    },
  },
  {
    terme: { ca: 'Drets d\'accés, rectificació, supressió…', es: 'Derechos de acceso, rectificación, supresión…', en: 'Rights of access, rectification, erasure…' },
    definicio: {
      ca: 'Drets de tota persona sobre les seves dades: accés, rectificació, supressió, oposició, limitació del tractament i portabilitat. L\'entitat ha de respondre en un mes.',
      es: 'Derechos de toda persona sobre sus datos: acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad. La entidad debe responder en un mes.',
      en: 'Everyone\'s rights over their data: access, rectification, erasure, objection, restriction of processing and portability. The organisation must reply within one month.',
    },
  },
  {
    terme: { ca: 'Anonimització', es: 'Anonimización', en: 'Anonymisation' },
    definicio: {
      ca: 'Eliminar de manera irreversible les dades que identifiquen una persona, conservant només la informació que la llei obliga a guardar (com els moviments comptables) sense el seu nom.',
      es: 'Eliminar de forma irreversible los datos que identifican a una persona, conservando solo la información que la ley obliga a guardar (como los movimientos contables) sin su nombre.',
      en: 'Irreversibly removing the data that identifies a person, keeping only what the law requires (such as accounting entries) without their name.',
    },
  },
  {
    terme: { ca: 'Registre d\'Associacions', es: 'Registro de Asociaciones', en: 'Register of Associations' },
    definicio: {
      ca: 'Registre públic on s\'inscriuen les associacions, els seus estatuts i la composició de la junta. A Mallorca és el de la comunitat autònoma de les Illes Balears; els canvis de junta s\'hi han de comunicar.',
      es: 'Registro público donde se inscriben las asociaciones, sus estatutos y la composición de la junta. En Mallorca es el de la comunidad autónoma de las Illes Balears; los cambios de junta deben comunicarse.',
      en: 'Public register where associations, their statutes and board composition are recorded. In Mallorca it is the Balearic Islands regional register; board changes must be notified to it.',
    },
  },
  {
    terme: { ca: 'Voluntariat', es: 'Voluntariado', en: 'Volunteering' },
    definicio: {
      ca: 'Activitat d\'interès general feta de manera lliure, altruista i sense retribució. La Llei 45/2015 obliga a signar un acord d\'incorporació, assegurar les persones voluntàries i dur-ne un registre.',
      es: 'Actividad de interés general realizada de forma libre, altruista y sin retribución. La Ley 45/2015 obliga a firmar un acuerdo de incorporación, asegurar a las personas voluntarias y llevar un registro.',
      en: 'Activity of general interest done freely, altruistically and unpaid. Spanish Law 45/2015 requires a signed agreement, insurance for volunteers and a register.',
    },
  },
  {
    terme: { ca: 'Certificat de delictes sexuals', es: 'Certificado de delitos sexuales', en: 'Sex offences clearance certificate' },
    definicio: {
      ca: 'Certificat negatiu del Registre Central de Delinqüents Sexuals, obligatori per a qualsevol persona (voluntària o no) que tingui contacte habitual amb menors.',
      es: 'Certificado negativo del Registro Central de Delincuentes Sexuales, obligatorio para cualquier persona (voluntaria o no) que tenga contacto habitual con menores.',
      en: 'Clearance certificate from the Spanish Central Register of Sex Offenders, required for anyone (volunteer or not) in regular contact with minors.',
    },
  },
  {
    terme: { ca: 'Soci numerari i soci d\'honor', es: 'Socio numerario y socio de honor', en: 'Full member and honorary member' },
    definicio: {
      ca: 'Categories habituals als estatuts. El soci numerari paga quota i té veu i vot; el soci d\'honor rep la distinció per mèrits i sovint no paga quota i pot no tenir vot.',
      es: 'Categorías habituales en los estatutos. El socio numerario paga cuota y tiene voz y voto; el socio de honor recibe la distinción por méritos y a menudo no paga cuota y puede no tener voto.',
      en: 'Common categories in statutes. A full member pays a fee and can speak and vote; an honorary member is recognised for merit, often pays nothing and may have no vote.',
    },
  },
  {
    terme: { ca: 'Vist i plau', es: 'Visto bueno', en: 'Vist i plau (approval)' },
    definicio: {
      ca: 'Signatura de la presidència que acompanya la de la secretaria en certificats i actes, i que en confirma el contingut.',
      es: 'Firma de la presidencia que acompaña a la de la secretaría en certificados y actas, y que confirma su contenido.',
      en: 'The president\'s signature accompanying the secretary\'s on certificates and minutes, confirming their content.',
    },
  },
];
