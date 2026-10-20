// Ajuda: articles, preguntes i termes del domini «economia».
import type { Article, Pregunta, Terme } from '../tipus';

export const ARTICLES: Article[] = [
  // ───────────────────────────── Quotes
  {
    id: 'quotes',
    seccio: 'economia',
    titol: { ca: 'Quotes dels socis', es: 'Cuotas de los socios', en: 'Membership fees' },
    resum: {
      ca: "Com generar les quotes de l'any, cobrar-les una a una o en bloc, imprimir rebuts i marcar exempcions.",
      es: 'Cómo generar las cuotas del año, cobrarlas una a una o en bloque, imprimir recibos y marcar exenciones.',
      en: 'How to generate the year’s fees, collect them one by one or in bulk, print receipts and mark exemptions.',
    },
    rutes: ['/quotes'],
    paraules: ['quota', 'quotes', 'cuota', 'cuotas', 'fee', 'fees', 'rebut', 'recibo', 'receipt', 'cobrar', 'cobro', 'collect', 'exempta', 'exenta', 'exempt', 'efectiu', 'efectivo', 'cash', 'transferència', 'transferencia', 'transfer'],
    cos: {
      ca: `La pantalla [Quotes](/quotes) recull la quota anual de cada soci de l'exercici triat a dalt. Cada quota pot estar **Pendent**, **Pagada** o **Exempta**, i a dalt veus el total **Previst**, **Cobrat** i **Pendent**.

# Abans de començar

Els imports surten del **Tipus de quota** de cada soci. Els tipus (ordinària, jove, familiar…) es defineixen a [Configuració](/configuracio), pestanya **Quotes i comptes**, i cada soci té el seu a la fitxa (vegeu [Socis](/ajuda/socis)).

# Generar les quotes de l'any

1. Comprova que l'exercici de dalt és l'any correcte.
2. Prem **Genera les quotes de** (any).
3. Es crea una quota per a cada soci actiu que encara no en tingui. Si el tipus de quota té import zero, la quota surt directament com a **Exempta**.

Pots tornar a prémer el botó quan entrin socis nous: només crea les que falten.

# Cobrar una quota o moltes

- **Una sola**: prem **Cobra** a la fila del soci, tria la **Data de cobrament**, la **Forma de pagament** (Efectiu, Transferència o Domiciliació) i el **Compte**, i prem **Registra el cobrament**.
- **Moltes alhora**: marca les caselles de l'esquerra (o la de la capçalera per triar-les totes) i prem **Cobra les seleccionades**.

Cada cobrament crea automàticament un ingrés a [Comptabilitat](/moviments) a la categoria «Quotes de socis». No l'has d'apuntar dues vegades.

> Consell: les quotes domiciliades no es cobren amb aquest botó, sinó amb una remesa SEPA. Vegeu [Domiciliacions SEPA](/ajuda/domiciliacions-sepa). Mentre una quota és dins una remesa hi veuràs «En remesa».

# Rebuts

A les quotes pagades hi ha el botó **Rebut**. Si en selecciones diverses, **Rebuts** les imprimeix totes seguides. Usa **Imprimeix / desa en PDF** per obtenir un PDF que pots enviar al soci.

# Exempcions, correccions i errors

- Per eximir un soci (per exemple, un soci d'honor), prem **Edita** i canvia l'**Estat** a **Exempta**. També hi pots canviar l'import o eliminar la quota.
- Si has registrat un cobrament per error, prem **Anul·la cobrament**: la quota torna a pendent i s'elimina l'ingrés associat.

> Compte: si l'exercici està tancat (vegeu [Tancament de l'exercici](/ajuda/tancament-exercici)), no es poden anul·lar cobraments perquè s'hauria de modificar la comptabilitat.

Les quotes ordinàries dels socis no necessiten factura: n'hi ha prou amb el rebut. Vegeu [Facturació](/ajuda/facturacio).`,
      es: `La pantalla [Cuotas](/quotes) recoge la cuota anual de cada socio del ejercicio elegido arriba. Cada cuota puede estar **Pendiente**, **Pagada** o **Exenta**, y arriba ves el total **Previsto**, **Cobrado** y **Pendiente**.

# Antes de empezar

Los importes salen del **Tipo de cuota** de cada socio. Los tipos (ordinaria, joven, familiar…) se definen en [Configuración](/configuracio), pestaña **Cuotas y cuentas**, y cada socio tiene el suyo en la ficha (ver [Socios](/ajuda/socis)).

# Generar las cuotas del año

1. Comprueba que el ejercicio de arriba es el año correcto.
2. Pulsa **Generar las cuotas de** (año).
3. Se crea una cuota para cada socio activo que todavía no la tenga. Si el tipo de cuota tiene importe cero, la cuota aparece directamente como **Exenta**.

Puedes volver a pulsar el botón cuando entren socios nuevos: solo crea las que faltan.

# Cobrar una cuota o muchas

- **Una sola**: pulsa **Cobrar** en la fila del socio, elige la **Fecha de cobro**, la **Forma de pago** (Efectivo, Transferencia o Domiciliación) y la **Cuenta**, y pulsa **Registrar el cobro**.
- **Muchas a la vez**: marca las casillas de la izquierda (o la de la cabecera para elegirlas todas) y pulsa **Cobrar las seleccionadas**.

Cada cobro crea automáticamente un ingreso en [Contabilidad](/moviments) en la categoría «Cuotas de socios». No hay que apuntarlo dos veces.

> Consejo: las cuotas domiciliadas no se cobran con este botón, sino con una remesa SEPA. Ver [Domiciliaciones SEPA](/ajuda/domiciliacions-sepa). Mientras una cuota está en una remesa verás «En remesa».

# Recibos

En las cuotas pagadas está el botón **Recibo**. Si seleccionas varias, **Recibos** las imprime todas seguidas. Usa **Imprimir / guardar en PDF** para obtener un PDF que puedes enviar al socio.

# Exenciones, correcciones y errores

- Para eximir a un socio (por ejemplo, un socio de honor), pulsa **Editar** y cambia el **Estado** a **Exenta**. También puedes cambiar el importe o eliminar la cuota.
- Si has registrado un cobro por error, pulsa **Anula el cobro**: la cuota vuelve a pendiente y se elimina el ingreso asociado.

> Atención: si el ejercicio está cerrado (ver [Cierre del ejercicio](/ajuda/tancament-exercici)), no se pueden anular cobros porque habría que modificar la contabilidad.

Las cuotas ordinarias de los socios no necesitan factura: basta con el recibo. Ver [Facturación](/ajuda/facturacio).`,
      en: `The [Fees](/quotes) screen lists each member’s annual fee for the financial year chosen at the top. Each fee is **Pending**, **Paid** or **Exempt**, and the top cards show the total **Expected**, **Collected** and **Pending**.

# Before you start

Amounts come from each member’s **Fee type**. Fee types (standard, youth, family…) are defined in [Settings](/configuracio), **Fees and accounts** tab, and each member has one on their record (see [Members](/ajuda/socis)).

# Generating the year’s fees

1. Check that the financial year at the top is the right one.
2. Press **Generate fees for** (year).
3. A fee is created for every active member who does not have one yet. If the fee type is zero, the fee is created directly as **Exempt**.

You can press the button again when new members join: it only creates the missing ones.

# Collecting one fee or many

- **Just one**: press **Collect** on the member’s row, choose the **Payment date**, the **Payment method** (Cash, Bank transfer or Direct debit) and the **Account**, then press **Record payment**.
- **Many at once**: tick the boxes on the left (or the header box to select all) and press **Collect selected**.

Each payment automatically creates an income entry in [Accounts](/moviments) in the “Membership fees” category. You do not need to record it twice.

> Tip: direct-debit fees are not collected with this button but with a SEPA batch. See [SEPA direct debits](/ajuda/domiciliacions-sepa). While a fee is in a batch you will see “In batch”.

# Receipts

Paid fees have a **Receipt** button. If you select several, **Receipts** prints them one after another. Use **Print / save as PDF** to get a PDF you can send to the member.

# Exemptions, corrections and mistakes

- To exempt a member (for example an honorary member), press **Edit** and change the **Status** to **Exempt**. You can also change the amount or delete the fee there.
- If you recorded a payment by mistake, press **Cancel payment**: the fee goes back to pending and the linked income entry is deleted.

> Warning: if the year is closed (see [Year-end closing](/ajuda/tancament-exercici)), payments cannot be cancelled because the accounts would have to change.

Ordinary membership fees do not need an invoice: the receipt is enough. See [Invoicing](/ajuda/facturacio).`,
    },
  },

  // ───────────────────────────── Comptabilitat
  {
    id: 'comptabilitat',
    seccio: 'economia',
    titol: { ca: 'Comptabilitat: moviments, comptes i categories', es: 'Contabilidad: movimientos, cuentas y categorías', en: 'Accounts: transactions, accounts and categories' },
    resum: {
      ca: 'El llibre de caixa i bancs: com apuntar ingressos, despeses i traspassos, adjuntar justificants i entendre els exercicis tancats.',
      es: 'El libro de caja y bancos: cómo apuntar ingresos, gastos y traspasos, adjuntar justificantes y entender los ejercicios cerrados.',
      en: 'The cash and bank book: how to record income, expenses and transfers, attach receipts and understand closed years.',
    },
    rutes: ['/moviments'],
    paraules: ['moviment', 'movimiento', 'transaction', 'ingrés', 'ingreso', 'income', 'despesa', 'gasto', 'expense', 'traspàs', 'traspaso', 'transfer', 'justificant', 'justificante', 'receipt', 'clip', 'adjunt', 'adjunto', 'attachment', 'compte', 'cuenta', 'account', 'categoria', 'categoría', 'category', 'saldo', 'balance', 'llibre de caixa'],
    cos: {
      ca: `La pantalla [Comptabilitat](/moviments) és el **llibre de caixa i bancs** de l'associació: hi ha tots els diners que entren i surten, exercici per exercici. A dalt veus el **saldo actual** de cada compte.

# Comptes i categories

Abans d'apuntar res, revisa a [Configuració](/configuracio), pestanya **Quotes i comptes**:

- **Comptes de tresoreria**: la caixa d'efectiu i cada compte bancari, amb el seu IBAN.
- **Categories d'ingressos i despeses**: quotes, subvencions, activitats, lloguer, material… Una categoria amb moviments no es pot eliminar; desactiva-la perquè no surti als formularis.

# Apuntar un moviment

1. Prem **+ Nou moviment**.
2. Tria el tipus: **Ingrés**, **Despesa** o **Traspàs**.
3. Omple la **Data**, l'**Import (€)**, el **Concepte**, la **Categoria** i el **Compte**.
4. Opcionalment, lliga'l a una **Activitat**, a un **Soci**, al **Cobrament de la subvenció** o escriu el **Núm. de factura / justificant**.
5. Desa.

Un **traspàs** mou diners entre comptes propis (per exemple, ingressar a la caixa d'estalvis l'efectiu de la festa): tries **Des del compte** i **Al compte**. No és ni ingrés ni despesa i no altera el resultat.

> Consell: molts moviments es creen sols: en cobrar quotes, remeses, factures o donacions, i en conciliar l'extracte del banc. Abans d'apuntar-ne un a mà, mira si ja hi és.

# Justificants (el clip)

Cada moviment té un clip a la taula que indica quants justificants té. Prem-lo per **Adjunta un justificant**: una foto del tiquet o el PDF de la factura (fins a 1,4 MB; les imatges es redueixen soles). Guardar-los aquí t'estalvia buscar papers quan arriba una subvenció o una inspecció.

# Cercar i exportar

Filtra per tipus, compte o categoria, o escriu a la cerca (concepte o justificant). **Exporta CSV** et dona la llista per obrir-la amb un full de càlcul o passar-la a la gestoria.

# Exercicis tancats

Quan un exercici està tancat (vegeu [Tancament de l'exercici](/ajuda/tancament-exercici)), surt un cadenat i els seus moviments es poden consultar però **no modificar ni eliminar**. Sí que s'hi poden afegir justificants.

> Compte: si descobreixes un error en un any tancat, la manera correcta és apuntar un moviment de regularització a l'any obert, o demanar a l'administració que reobri l'exercici (queda registrat).`,
      es: `La pantalla [Contabilidad](/moviments) es el **libro de caja y bancos** de la asociación: contiene todo el dinero que entra y sale, ejercicio por ejercicio. Arriba ves el **saldo actual** de cada cuenta.

# Cuentas y categorías

Antes de apuntar nada, revisa en [Configuración](/configuracio), pestaña **Cuotas y cuentas**:

- **Cuentas de tesorería**: la caja de efectivo y cada cuenta bancaria, con su IBAN.
- **Categorías de ingresos y gastos**: cuotas, subvenciones, actividades, alquiler, material… Una categoría con movimientos no se puede eliminar; desactívala para que no salga en los formularios.

# Apuntar un movimiento

1. Pulsa **+ Nuevo movimiento**.
2. Elige el tipo: **Ingreso**, **Gasto** o **Traspaso**.
3. Rellena la **Fecha**, el **Importe (€)**, el **Concepto**, la **Categoría** y la **Cuenta**.
4. Opcionalmente, vincúlalo a una **Actividad**, a un **Socio**, al **Cobro de la subvención** o escribe el **Núm. de factura / justificante**.
5. Guarda.

Un **traspaso** mueve dinero entre cuentas propias (por ejemplo, ingresar en el banco el efectivo de la fiesta): eliges **Desde la cuenta** y **A la cuenta**. No es ingreso ni gasto y no altera el resultado.

> Consejo: muchos movimientos se crean solos: al cobrar cuotas, remesas, facturas o donaciones, y al conciliar el extracto del banco. Antes de apuntar uno a mano, mira si ya está.

# Justificantes (el clip)

Cada movimiento tiene un clip en la tabla que indica cuántos justificantes tiene. Púlsalo para **Adjuntar un justificante**: una foto del tique o el PDF de la factura (hasta 1,4 MB; las imágenes se reducen solas). Guardarlos aquí te ahorra buscar papeles cuando llega una subvención o una inspección.

# Buscar y exportar

Filtra por tipo, cuenta o categoría, o escribe en la búsqueda (concepto o justificante). **Exportar CSV** te da la lista para abrirla con una hoja de cálculo o pasarla a la gestoría.

# Ejercicios cerrados

Cuando un ejercicio está cerrado (ver [Cierre del ejercicio](/ajuda/tancament-exercici)), aparece un candado y sus movimientos se pueden consultar pero **no modificar ni eliminar**. Sí se pueden añadir justificantes.

> Atención: si descubres un error en un año cerrado, lo correcto es apuntar un movimiento de regularización en el año abierto, o pedir a la administración que reabra el ejercicio (queda registrado).`,
      en: `The [Accounts](/moviments) screen is the association’s **cash and bank book**: all the money coming in and going out, year by year. The top cards show each account’s **current balance**.

# Accounts and categories

Before recording anything, check [Settings](/configuracio), **Fees and accounts** tab:

- **Cash and bank accounts**: the cash box and each bank account, with its IBAN.
- **Income and expense categories**: fees, grants, activities, rent, materials… A category with transactions cannot be deleted; deactivate it so it no longer appears in forms.

# Recording a transaction

1. Press **+ New transaction**.
2. Choose the type: **Income**, **Expense** or **Transfer**.
3. Fill in the **Date**, **Amount (€)**, **Description**, **Category** and **Account**.
4. Optionally link it to an **Activity**, a **Member**, a **Grant payment**, or enter the **Invoice / receipt no.**
5. Save.

A **transfer** moves money between your own accounts (for example, paying the cash from the festival into the bank): choose **From account** and **To account**. It is neither income nor expense and does not change the result.

> Tip: many transactions are created automatically: when you collect fees, batches, invoices or donations, and when you reconcile the bank statement. Before entering one by hand, check whether it is already there.

# Receipts (the paperclip)

Each transaction has a paperclip in the table showing how many receipts it has. Press it to **Attach a receipt**: a photo of the ticket or the invoice PDF (up to 1.4 MB; images are reduced automatically). Keeping them here saves you hunting for paper when a grant or an inspection comes along.

# Searching and exporting

Filter by type, account or category, or type in the search box (description or receipt). **Export CSV** gives you the list to open in a spreadsheet or send to your accountant.

# Closed years

When a year is closed (see [Year-end closing](/ajuda/tancament-exercici)), a padlock appears and its transactions can be viewed but **not changed or deleted**. Receipts can still be added.

> Warning: if you find a mistake in a closed year, the right way is to record an adjusting transaction in the open year, or ask an administrator to reopen the year (this is logged).`,
    },
  },

  // ───────────────────────────── Tresoreria (visió general)
  {
    id: 'tresoreria',
    seccio: 'economia',
    titol: { ca: 'Tresoreria: visió general', es: 'Tesorería: visión general', en: 'Treasury: overview' },
    resum: {
      ca: 'Què hi ha a cada pestanya de Tresoreria i en quin ordre convé fer-les servir al llarg de l’any.',
      es: 'Qué hay en cada pestaña de Tesorería y en qué orden conviene usarlas a lo largo del año.',
      en: 'What each Treasury tab contains and in what order to use them through the year.',
    },
    rutes: ['/tresoreria'],
    paraules: ['tresoreria', 'tesorería', 'treasury', 'treasurer', 'tresorer', 'tesorero', 'pestanyes', 'pestañas', 'tabs'],
    cos: {
      ca: `La pantalla [Tresoreria](/tresoreria) aplega les feines de la tresoreria que van més enllà d'apuntar moviments. Té sis pestanyes; cadascuna té el seu article:

- **Pressupost**: el pressupost de l'any, l'aprovació de l'assemblea i la comparació amb el real. Vegeu [Pressupost anual](/ajuda/pressupost).
- **Domiciliacions**: forma de pagament de cada soci, mandats SEPA i remeses de rebuts per al banc. Vegeu [Domiciliacions SEPA](/ajuda/domiciliacions-sepa).
- **Fiscalitat**: rendes exemptes i no exemptes i si cal presentar el model 200. Vegeu [Fiscalitat i model 200](/ajuda/fiscalitat).
- **Tercers i retencions**: pagaments a professionals, artistes i arrendadors, retencions d'IRPF i models 111, 115, 190, 180 i 347. Vegeu [Tercers i retencions](/ajuda/tercers-retencions).
- **Extractes bancaris**: importar l'extracte del banc i conciliar-lo. Vegeu [Extractes bancaris i conciliació](/ajuda/extractes-bancaris).
- **Tancament**: tancar l'exercici quan l'assemblea ha aprovat els comptes. Vegeu [Tancament de l'exercici](/ajuda/tancament-exercici).

Totes les pestanyes treballen amb l'**exercici** triat a la part de dalt del programa.

# Un any de tresoreria, en ordre

1. **Gener–febrer**: fer el pressupost, generar les [quotes](/ajuda/quotes) i preparar la primera remesa.
2. **Cada mes**: importar l'extracte i conciliar; adjuntar justificants als moviments.
3. **Cada trimestre**: revisar les retencions i, si n'hi ha, presentar els models 111 i 115.
4. **Final d'any**: cobrar quotes pendents, revisar la fiscalitat i preparar els [informes econòmics](/ajuda/informes-economics).
5. **Després de l'assemblea**: marcar el pressupost aprovat i tancar l'exercici anterior.

Les dates concretes són al [Calendari fiscal de l'associació](/ajuda/calendari-fiscal).

> Consell: el tauler d'inici avisa de feines pendents (per exemple, línies de l'extracte per conciliar) i et porta directament a la pestanya corresponent.`,
      es: `La pantalla [Tesorería](/tresoreria) reúne las tareas de tesorería que van más allá de apuntar movimientos. Tiene seis pestañas; cada una tiene su artículo:

- **Presupuesto**: el presupuesto del año, la aprobación de la asamblea y la comparación con el real. Ver [Presupuesto anual](/ajuda/pressupost).
- **Domiciliaciones**: forma de pago de cada socio, mandatos SEPA y remesas de recibos para el banco. Ver [Domiciliaciones SEPA](/ajuda/domiciliacions-sepa).
- **Fiscalidad**: rentas exentas y no exentas y si hay que presentar el modelo 200. Ver [Fiscalidad y modelo 200](/ajuda/fiscalitat).
- **Terceros y retenciones**: pagos a profesionales, artistas y arrendadores, retenciones de IRPF y modelos 111, 115, 190, 180 y 347. Ver [Terceros y retenciones](/ajuda/tercers-retencions).
- **Extractos bancarios**: importar el extracto del banco y conciliarlo. Ver [Extractos bancarios y conciliación](/ajuda/extractes-bancaris).
- **Cierre**: cerrar el ejercicio cuando la asamblea ha aprobado las cuentas. Ver [Cierre del ejercicio](/ajuda/tancament-exercici).

Todas las pestañas trabajan con el **ejercicio** elegido en la parte de arriba del programa.

# Un año de tesorería, en orden

1. **Enero–febrero**: hacer el presupuesto, generar las [cuotas](/ajuda/quotes) y preparar la primera remesa.
2. **Cada mes**: importar el extracto y conciliar; adjuntar justificantes a los movimientos.
3. **Cada trimestre**: revisar las retenciones y, si las hay, presentar los modelos 111 y 115.
4. **Final de año**: cobrar cuotas pendientes, revisar la fiscalidad y preparar los [informes económicos](/ajuda/informes-economics).
5. **Después de la asamblea**: marcar el presupuesto aprobado y cerrar el ejercicio anterior.

Las fechas concretas están en el [Calendario fiscal de la asociación](/ajuda/calendari-fiscal).

> Consejo: el panel de inicio avisa de tareas pendientes (por ejemplo, líneas del extracto por conciliar) y te lleva directamente a la pestaña correspondiente.`,
      en: `The [Treasury](/tresoreria) screen gathers the treasurer’s tasks that go beyond recording transactions. It has six tabs, each with its own article:

- **Budget**: the year’s budget, the general meeting’s approval and the comparison with actuals. See [Annual budget](/ajuda/pressupost).
- **Direct debits**: each member’s payment method, SEPA mandates and direct debit batches for the bank. See [SEPA direct debits](/ajuda/domiciliacions-sepa).
- **Tax**: exempt and non-exempt income and whether form 200 must be filed. See [Tax and form 200](/ajuda/fiscalitat).
- **Third parties and withholdings**: payments to professionals, artists and landlords, income tax withholdings and forms 111, 115, 190, 180 and 347. See [Third parties and withholdings](/ajuda/tercers-retencions).
- **Bank statements**: importing the bank statement and reconciling it. See [Bank statements and reconciliation](/ajuda/extractes-bancaris).
- **Year-end closing**: closing the year once the general meeting has approved the accounts. See [Year-end closing](/ajuda/tancament-exercici).

All tabs work with the **financial year** chosen at the top of the program.

# A treasurer’s year, in order

1. **January–February**: draw up the budget, generate the [fees](/ajuda/quotes) and prepare the first batch.
2. **Every month**: import the statement and reconcile; attach receipts to transactions.
3. **Every quarter**: review withholdings and, if there are any, file forms 111 and 115.
4. **End of the year**: collect pending fees, review the tax position and prepare the [financial reports](/ajuda/informes-economics).
5. **After the general meeting**: mark the budget as approved and close the previous year.

The exact dates are in the [Association tax calendar](/ajuda/calendari-fiscal).

> Tip: the home dashboard warns you about pending tasks (for example statement lines to reconcile) and takes you straight to the right tab.`,
    },
  },

  // ───────────────────────────── Pressupost
  {
    id: 'pressupost',
    seccio: 'economia',
    titol: { ca: 'Pressupost anual', es: 'Presupuesto anual', en: 'Annual budget' },
    resum: {
      ca: "Com preparar el pressupost per categories, registrar-ne l'aprovació per l'assemblea i seguir-ne l'execució.",
      es: 'Cómo preparar el presupuesto por categorías, registrar su aprobación por la asamblea y seguir su ejecución.',
      en: 'How to prepare the budget by category, record its approval by the general meeting and track how it is executed.',
    },
    paraules: ['pressupost', 'presupuesto', 'budget', 'aprovació', 'aprobación', 'approval', 'assemblea', 'asamblea', 'general meeting', 'desviació', 'desviación', 'variance', 'executat', 'ejecutado', 'real', 'actual'],
    cos: {
      ca: `El pressupost és la previsió d'ingressos i despeses de l'any. La Llei orgànica 1/2002 d'associacions encomana a l'assemblea general aprovar els comptes i, habitualment, també el pressupost. El trobaràs a [Tresoreria](/tresoreria), pestanya **Pressupost**.

# Preparar-lo

1. Tria l'exercici a dalt del programa.
2. Si encara no n'hi ha, tens tres opcions: **Copia el pressupost de** l'any anterior, **Parteix de les xifres reals de** l'any anterior, o fer-lo des de zero amb **Edita el pressupost**.
3. Escriu l'import previst a cada categoria d'ingrés i de despesa. A sota veuràs el **Total ingressos**, el **Total despeses** i el **Resultat previst**.
4. Prem **Desa el pressupost**.

Les categories són les mateixes que a [Comptabilitat](/ajuda/comptabilitat); si en necessites una de nova, crea-la a [Configuració](/configuracio).

> Consell: partir de les xifres reals de l'any anterior és la manera més ràpida de fer un pressupost realista. Després ajusta només el que canviarà.

# Aprovació per l'assemblea

Quan l'assemblea l'aprovi, prem **Marca'l com a aprovat** i indica la **Data de l'assemblea**. A partir d'aquí el pressupost ja no es pot modificar; si cal canviar-lo, prem **Desfés l'aprovació**, fes els canvis i torna'l a aprovar (convé que ho ratifiqui l'assemblea).

# Seguiment: pressupost contra real

La taula compara, per a cada categoria, el **Pressupost**, el **Real** (el que s'ha apuntat fins ara), la **Desviació** i el **% executat**. També hi veus les xifres de l'any anterior. Així pots detectar a mitjan any si una partida s'està disparant.

# Imprimir-lo

**Imprimeix / desa en PDF** genera el document «Pressupost i execució», amb l'estat d'aprovació i espai per a la signatura del tresorer i el vistiplau de la presidència. És el que sol presentar-se a l'assemblea juntament amb els [informes econòmics](/ajuda/informes-economics).`,
      es: `El presupuesto es la previsión de ingresos y gastos del año. La Ley Orgánica 1/2002 de asociaciones encomienda a la asamblea general aprobar las cuentas y, habitualmente, también el presupuesto. Lo encontrarás en [Tesorería](/tresoreria), pestaña **Presupuesto**.

# Prepararlo

1. Elige el ejercicio arriba del programa.
2. Si todavía no lo hay, tienes tres opciones: **Copiar el presupuesto de** el año anterior, **Partir de las cifras reales de** el año anterior, o hacerlo desde cero con **Editar el presupuesto**.
3. Escribe el importe previsto en cada categoría de ingreso y de gasto. Debajo verás el **Total ingresos**, el **Total gastos** y el **Resultado previsto**.
4. Pulsa **Guardar el presupuesto**.

Las categorías son las mismas que en [Contabilidad](/ajuda/comptabilitat); si necesitas una nueva, créala en [Configuración](/configuracio).

> Consejo: partir de las cifras reales del año anterior es la manera más rápida de hacer un presupuesto realista. Después ajusta solo lo que vaya a cambiar.

# Aprobación por la asamblea

Cuando la asamblea lo apruebe, pulsa **Marcarlo como aprobado** e indica la **Fecha de la asamblea**. A partir de ahí el presupuesto ya no se puede modificar; si hay que cambiarlo, pulsa **Deshacer la aprobación**, haz los cambios y vuelve a aprobarlo (conviene que lo ratifique la asamblea).

# Seguimiento: presupuesto frente a real

La tabla compara, para cada categoría, el **Presupuesto**, el **Real** (lo apuntado hasta ahora), la **Desviación** y el **% ejecutado**. También ves las cifras del año anterior. Así puedes detectar a mitad de año si una partida se está disparando.

# Imprimirlo

**Imprimir / guardar en PDF** genera el documento «Presupuesto y ejecución», con el estado de aprobación y espacio para la firma del tesorero y el visto bueno de la presidencia. Es lo que suele presentarse a la asamblea junto con los [informes económicos](/ajuda/informes-economics).`,
      en: `The budget is the forecast of the year’s income and expenses. Spain’s Associations Act (Organic Law 1/2002) gives the general meeting the job of approving the accounts and, usually, the budget too. You will find it in [Treasury](/tresoreria), **Budget** tab.

# Preparing it

1. Choose the financial year at the top of the program.
2. If there is no budget yet, you have three options: **Copy the budget** of the previous year, **Start from the actuals** of the previous year, or build it from scratch with **Edit budget**.
3. Enter the expected amount for each income and expense category. Below you will see **Total income**, **Total expenses** and the **Expected result**.
4. Press **Save budget**.

The categories are the same as in [Accounts](/ajuda/comptabilitat); if you need a new one, create it in [Settings](/configuracio).

> Tip: starting from last year’s actuals is the quickest way to get a realistic budget. Then adjust only what will change.

# Approval by the general meeting

When the general meeting approves it, press **Mark as approved** and enter the **Meeting date**. From then on the budget cannot be changed; if it must be, press **Undo approval**, make the changes and approve it again (ideally the general meeting should ratify it).

# Monitoring: budget versus actual

The table compares, for each category, the **Budget**, the **Actual** (what has been recorded so far), the **Variance** and the **% executed**. You also see last year’s figures. This lets you spot mid-year if a line is running away.

# Printing it

**Print / save as PDF** produces the “Budget and execution” document, with its approval status and space for the treasurer’s signature and the president’s approval. It is what is usually presented to the general meeting together with the [financial reports](/ajuda/informes-economics).`,
    },
  },

  // ───────────────────────────── Domiciliacions SEPA
  {
    id: 'domiciliacions-sepa',
    seccio: 'economia',
    titol: { ca: 'Domiciliacions SEPA', es: 'Domiciliaciones SEPA', en: 'SEPA direct debits' },
    resum: {
      ca: "Identificador de creditor, mandats dels socis, remeses XML per al banc i com registrar els rebuts retornats.",
      es: 'Identificador de acreedor, mandatos de los socios, remesas XML para el banco y cómo registrar los recibos devueltos.',
      en: 'Creditor identifier, members’ mandates, XML batches for the bank and how to record returned debits.',
    },
    paraules: ['sepa', 'domiciliació', 'domiciliación', 'direct debit', 'remesa', 'batch', 'mandat', 'mandato', 'mandate', 'iban', 'bic', 'xml', 'pain.008', 'core', 'frst', 'rcur', 'devolució', 'devolución', 'return', 'retornat', 'devuelto', 'returned', 'creditor', 'acreedor'],
    cos: {
      ca: `Domiciliar les quotes vol dir que el banc les carrega directament al compte del soci. Es fa amb l'esquema europeu **SEPA Core**: l'associació genera un fitxer XML (pain.008) amb tots els rebuts i el puja a la banca electrònica. Tot es fa a [Tresoreria](/tresoreria), pestanya **Domiciliacions**.

# 1. Dades del creditor (només la primera vegada)

A l'apartat **Dades del creditor (l'entitat)** omple:

- **Identificador de creditor SEPA**: el programa el calcula a partir del NIF de l'entitat (prem **Usa el suggerit**), però **confirma'l amb el banc**: és el banc qui l'activa.
- **Compte on s'abonen els rebuts**, **IBAN del compte** i, si el banc ho demana, **BIC (opcional)**.

# 2. Forma de pagament i mandat de cada soci

A **Forma de pagament i mandats SEPA**, obre el soci i indica:

- **Forma de pagament habitual**: Domiciliació.
- L'IBAN del soci, la **Referència del mandat** (única per soci; el programa en suggereix una) i la **Data de signatura del mandat**.
- **Pròxim cobrament**: FRST per al primer rebut o després d'una devolució; RCUR per als següents.

El **mandat** és l'autorització signada del soci. Guarda'n l'original: el banc te'l pot demanar si el soci reclama.

# 3. Generar la remesa

1. Prem **+ Nova remesa**. Surten les quotes pendents dels socis domiciliats.
2. Revisa la llista i la **Data de cobrament** (el dia que el banc carregarà els rebuts; envia el fitxer amb uns dies d'antelació).
3. Prem **Genera la remesa** i després **Descarrega el fitxer XML**.
4. Puja aquest fitxer a la banca electrònica, a l'apartat de remeses o adeudos SEPA.

# 4. Quan el banc abona la remesa

Obre la remesa i prem **Marca-la com a cobrada**, amb la **Data de l'abonament**. Es registra un sol ingrés pel total i les quotes queden pagades per domiciliació.

# 5. Rebuts retornats

Si un soci retorna el rebut (fins a 8 setmanes sense donar motius, segons la normativa SEPA), obre la remesa, prem **Devolució** a la seva línia, indica la **Data de la devolució**, el **Motiu** i la **Comissió del banc (€)**, i prem **Registra la devolució**. Es crea la despesa, la quota torna a pendent i el pròxim rebut serà FRST.

> Compte: si elimines una remesa no cobrada, les quotes tornen a estar disponibles; no l'eliminis si ja l'has enviada al banc.`,
      es: `Domiciliar las cuotas significa que el banco las carga directamente en la cuenta del socio. Se hace con el esquema europeo **SEPA Core**: la asociación genera un fichero XML (pain.008) con todos los recibos y lo sube a la banca electrónica. Todo se hace en [Tesorería](/tresoreria), pestaña **Domiciliaciones**.

# 1. Datos del acreedor (solo la primera vez)

En el apartado **Datos del acreedor (la entidad)** rellena:

- **Identificador de acreedor SEPA**: el programa lo calcula a partir del NIF de la entidad (pulsa **Usar el sugerido**), pero **confírmalo con el banco**: es el banco quien lo activa.
- **Cuenta donde se abonan los recibos**, **IBAN de la cuenta** y, si el banco lo pide, **BIC (opcional)**.

# 2. Forma de pago y mandato de cada socio

En **Forma de pago y mandatos SEPA**, abre el socio e indica:

- **Forma de pago habitual**: Domiciliación.
- El IBAN del socio, la **Referencia del mandato** (única por socio; el programa sugiere una) y la **Fecha de firma del mandato**.
- **Próximo cobro**: FRST para el primer recibo o después de una devolución; RCUR para los siguientes.

El **mandato** es la autorización firmada del socio. Guarda el original: el banco puede pedírtelo si el socio reclama.

# 3. Generar la remesa

1. Pulsa **+ Nueva remesa**. Aparecen las cuotas pendientes de los socios domiciliados.
2. Revisa la lista y la **Fecha de cobro** (el día que el banco cargará los recibos; envía el fichero con unos días de antelación).
3. Pulsa **Generar la remesa** y después **Descargar el fichero XML**.
4. Sube este fichero a la banca electrónica, en el apartado de remesas o adeudos SEPA.

# 4. Cuando el banco abona la remesa

Abre la remesa y pulsa **Marcarla como cobrada**, con la **Fecha del abono**. Se registra un solo ingreso por el total y las cuotas quedan pagadas por domiciliación.

# 5. Recibos devueltos

Si un socio devuelve el recibo (hasta 8 semanas sin dar motivos, según la normativa SEPA), abre la remesa, pulsa **Devolución** en su línea, indica la **Fecha de la devolución**, el **Motivo** y la **Comisión del banco (€)**, y pulsa **Registrar la devolución**. Se crea el gasto, la cuota vuelve a pendiente y el próximo recibo será FRST.

> Atención: si eliminas una remesa no cobrada, las cuotas vuelven a estar disponibles; no la elimines si ya la has enviado al banco.`,
      en: `Direct debit means the bank takes the fee straight from the member’s account. It uses the European **SEPA Core** scheme: the association creates an XML file (pain.008) with all the debits and uploads it to online banking. Everything is done in [Treasury](/tresoreria), **Direct debits** tab.

# 1. Creditor details (first time only)

In **Creditor details (the organisation)** fill in:

- **SEPA creditor identifier**: the program calculates it from the organisation’s tax ID (press **Use suggested**), but **confirm it with your bank**: the bank is the one that activates it.
- **Account credited with the debits**, **Account IBAN** and, if your bank asks for it, **BIC (optional)**.

# 2. Each member’s payment method and mandate

In **Payment method and SEPA mandates**, open the member and set:

- **Usual payment method**: Direct debit.
- The member’s IBAN, the **Mandate reference** (unique per member; the program suggests one) and the **Mandate signature date**.
- **Next debit**: FRST for the first debit or after a return; RCUR for the following ones.

The **mandate** is the member’s signed authorisation. Keep the original: the bank may ask for it if the member disputes a debit.

# 3. Creating the batch

1. Press **+ New batch**. The pending fees of direct-debit members are listed.
2. Check the list and the **Payment date** (the day the bank will debit the accounts; send the file a few days in advance).
3. Press **Create batch** and then **Download XML file**.
4. Upload that file to your online banking, in the SEPA direct debit or batch section.

# 4. When the bank credits the batch

Open the batch and press **Mark as collected**, with the **Credit date**. A single income entry is recorded for the total and the fees are marked as paid by direct debit.

# 5. Returned debits

If a member returns the debit (up to 8 weeks with no reason needed, under SEPA rules), open the batch, press **Return** on their line, enter the **Return date**, the **Reason** and the **Bank fee (€)**, and press **Record return**. The expense is created, the fee goes back to pending and the next debit will be FRST.

> Warning: if you delete an uncollected batch, its fees become available again; do not delete it if you have already sent it to the bank.`,
    },
  },

  // ───────────────────────────── Fiscalitat
  {
    id: 'fiscalitat',
    seccio: 'economia',
    titol: { ca: 'Fiscalitat i model 200', es: 'Fiscalidad y modelo 200', en: 'Tax and form 200' },
    resum: {
      ca: "Rendes exemptes i no exemptes i com saber si l'associació ha de presentar l'Impost de Societats (model 200).",
      es: 'Rentas exentas y no exentas y cómo saber si la asociación debe presentar el Impuesto sobre Sociedades (modelo 200).',
      en: 'Exempt and non-exempt income and how to tell whether the association must file corporate income tax (form 200).',
    },
    paraules: ['fiscalitat', 'fiscalidad', 'tax', 'impost de societats', 'impuesto sobre sociedades', 'corporate tax', 'model 200', 'modelo 200', 'form 200', 'renda exempta', 'renta exenta', 'exempt income', 'parcialment exempta', 'parcialmente exenta', 'partially exempt', '124.3', '75.000', '2.000', 'hisenda', 'hacienda', 'aeat'],
    cos: {
      ca: `Les associacions sense finalitat lucrativa que no estan acollides a la Llei 49/2002 són **entitats parcialment exemptes** de l'Impost de Societats (art. 9.3 de la Llei 27/2014, LIS). Vol dir que:

- **Són rendes exemptes** les quotes dels socis, les subvencions i els donatius destinats a l'activitat pròpia, sempre que no siguin contraprestació d'una activitat econòmica.
- **No són exemptes** els rendiments d'activitats econòmiques (vendre entrades o begudes a la barra, fer tallers de pagament oberts a tothom…), i els rendiments del patrimoni, com els interessos del compte o un lloguer cobrat.

# Estan obligades a presentar el model 200?

Segons l'art. 124.3 LIS, una entitat parcialment exempta **no** ha de presentar el model 200 si compleix les tres condicions:

1. Ingressos totals fins a 75.000 € l'any.
2. Rendes no exemptes fins a 2.000 €.
3. Totes les rendes no exemptes sotmeses a retenció.

Si se'n trenca una, cal presentar-lo, encara que surti a pagar zero.

# Com ho comprova el programa

A [Tresoreria](/tresoreria), pestanya **Fiscalitat**:

1. A **Classificació fiscal de les categories d'ingrés**, marca per a cada categoria si és **Renda exempta** i si és **Subjecta a retenció**. Fes-ho un cop i revisa-ho quan creïs categories noves.
2. A dalt veuràs els **Ingressos totals**, les **Rendes exemptes**, les **Rendes no exemptes** i les **No exemptes sense retenció**, cadascuna amb el seu límit. Els rebuts retornats ja es descompten.
3. El programa et diu si **Cal presentar l'Impost de Societats (model 200)** o si **Sembla que no cal**, i el termini (normalment fins al 25 de juliol de l'any següent).

> Consell: les quotes de socis i les subvencions solen ser exemptes; la barra de la festa o la venda d'entrades a no socis, no. Els interessos del banc són no exempts però ja duen retenció.

> Compte: aquest càlcul és orientatiu. La classificació d'una renda depèn de cada cas, i les entitats acollides a la Llei 49/2002 tenen un règim diferent i presenten sempre el model 200. Consulteu-ho amb la gestoria abans de decidir.`,
      es: `Las asociaciones sin ánimo de lucro que no están acogidas a la Ley 49/2002 son **entidades parcialmente exentas** del Impuesto sobre Sociedades (art. 9.3 de la Ley 27/2014, LIS). Significa que:

- **Son rentas exentas** las cuotas de los socios, las subvenciones y los donativos destinados a la actividad propia, siempre que no sean contraprestación de una actividad económica.
- **No son exentos** los rendimientos de actividades económicas (vender entradas o bebidas en la barra, hacer talleres de pago abiertos a todos…), ni los rendimientos del patrimonio, como los intereses de la cuenta o un alquiler cobrado.

# ¿Están obligadas a presentar el modelo 200?

Según el art. 124.3 LIS, una entidad parcialmente exenta **no** tiene que presentar el modelo 200 si cumple las tres condiciones:

1. Ingresos totales hasta 75.000 € al año.
2. Rentas no exentas hasta 2.000 €.
3. Todas las rentas no exentas sometidas a retención.

Si se incumple una, hay que presentarlo, aunque salga a pagar cero.

# Cómo lo comprueba el programa

En [Tesorería](/tresoreria), pestaña **Fiscalidad**:

1. En **Clasificación fiscal de las categorías de ingreso**, marca para cada categoría si es **Renta exenta** y si está **Sujeta a retención**. Hazlo una vez y revísalo cuando crees categorías nuevas.
2. Arriba verás los **Ingresos totales**, las **Rentas exentas**, las **Rentas no exentas** y las **No exentas sin retención**, cada una con su límite. Los recibos devueltos ya se descuentan.
3. El programa te dice si **Hay que presentar el Impuesto sobre Sociedades (modelo 200)** o si **Parece que no hay que presentarlo**, y el plazo (normalmente hasta el 25 de julio del año siguiente).

> Consejo: las cuotas de socios y las subvenciones suelen ser exentas; la barra de la fiesta o la venta de entradas a no socios, no. Los intereses del banco son no exentos pero ya llevan retención.

> Atención: este cálculo es orientativo. La clasificación de una renta depende de cada caso, y las entidades acogidas a la Ley 49/2002 tienen un régimen distinto y presentan siempre el modelo 200. Consultadlo con la gestoría antes de decidir.`,
      en: `Non-profit associations that are not covered by Law 49/2002 are **partially exempt entities** for Spanish corporate income tax (art. 9.3 of Law 27/2014, LIS). This means:

- **Exempt income** includes membership fees, grants and donations used for the association’s own purpose, as long as they are not payment for an economic activity.
- **Non-exempt income** includes income from economic activities (selling tickets or drinks at the bar, paid workshops open to everyone…) and income from assets, such as bank interest or rent received.

# Do they have to file form 200?

Under art. 124.3 LIS, a partially exempt entity does **not** have to file form 200 if it meets all three conditions:

1. Total income up to €75,000 a year.
2. Non-exempt income up to €2,000.
3. All non-exempt income subject to withholding.

If any one is not met, the return must be filed, even if no tax is due.

# How the program checks it

In [Treasury](/tresoreria), **Tax** tab:

1. In **Tax classification of income categories**, tick for each category whether it is **Exempt income** and whether it is **Subject to withholding**. Do this once and review it when you create new categories.
2. At the top you will see **Total income**, **Exempt income**, **Non-exempt income** and **Non-exempt without withholding**, each with its limit. Returned debits are already deducted.
3. The program tells you whether a corporate income tax return (form 200) must be filed or it seems it does not, and the deadline (normally 25 July of the following year).

> Tip: membership fees and grants are usually exempt; the festival bar or ticket sales to non-members are not. Bank interest is non-exempt but already has tax withheld.

> Warning: this calculation is for guidance only. How income is classified depends on each case, and entities covered by Law 49/2002 have a different regime and always file form 200. Check with your accountant before deciding.`,
    },
  },

  // ───────────────────────────── Tercers i retencions
  {
    id: 'tercers-retencions',
    seccio: 'economia',
    titol: { ca: 'Tercers i retencions (111, 115, 190, 180, 347)', es: 'Terceros y retenciones (111, 115, 190, 180, 347)', en: 'Third parties and withholdings (111, 115, 190, 180, 347)' },
    resum: {
      ca: "Com registrar pagaments a professionals, artistes i arrendadors amb retenció d'IRPF i preparar els models trimestrals i anuals.",
      es: 'Cómo registrar pagos a profesionales, artistas y arrendadores con retención de IRPF y preparar los modelos trimestrales y anuales.',
      en: 'How to record payments to professionals, artists and landlords with income tax withheld and prepare the quarterly and annual forms.',
    },
    paraules: ['retenció', 'retención', 'withholding', 'irpf', 'tercer', 'tercero', 'third party', 'proveïdor', 'proveedor', 'supplier', 'professional', 'artista', 'artist', 'lloguer', 'alquiler', 'rent', 'model 111', 'model 115', 'model 190', 'model 180', 'model 347', 'modelo 111', 'modelo 115', 'modelo 190', 'modelo 180', 'modelo 347', 'nif'],
    cos: {
      ca: `Quan l'associació paga un professional o un artista que factura amb retenció d'IRPF (un músic, un ponent, un dissenyador) o lloga un local, ha de **retenir** una part del pagament i ingressar-la a Hisenda. Ho trobaràs a [Tresoreria](/tresoreria), pestanya **Tercers i retencions**, que té tres apartats.

# Tercers

Un **tercer** és qualsevol persona o empresa a qui pagueu (o, si factureu, a qui cobreu). A **Tercers** prem **Nou tercer** i omple el **Nom o raó social**, el **NIF** (el programa comprova la lletra de control), si és **Persona física** o **Persona jurídica**, l'adreça i el **Codi postal** (en surt la província). Si ja teniu clients a Facturació, **Importa des dels clients de facturació** els crea de cop.

# Pagaments i retencions

Aquí surten les despeses de la comptabilitat. Per a cada pagament amb retenció:

1. Prem el pagament i tria el **Tercer (qui ha cobrat)**.
2. A **Retenció d'IRPF**, tria el tipus: **Professionals i artistes (model 111)**, **Lloguer d'immobles (model 115)** o **Altres rendiments (model 111)**.
3. Indica el **Percentatge de retenció**: habitualment el 15 % (el 7 % els primers anys d'activitat del professional) i el 19 % per als lloguers. Tria la **Clau del model 190** si escau.
4. La **Base** es calcula sola a partir del **Net pagat**. Comprova que coincideix amb la factura.

> Consell: a comptabilitat apunta només el que realment surt del banc (el net). La retenció es paga després, en el model trimestral.

# Models 111, 115, 190, 180 i 347

Aquest apartat resumeix, trimestre a trimestre, el que cal declarar:

- **Model 111** (professionals i artistes) i **model 115** (lloguers): trimestrals, fins al 20 d'abril, 20 de juliol, 20 d'octubre i 30 de gener.
- **Model 190** i **model 180**: resums anuals dels anteriors, al gener.
- **Model 347**: operacions amb un mateix tercer de més de 3.005,06 € l'any; només afecta les entitats amb activitats econòmiques. Es presenta al febrer.

Prem **Detall, impressió i CSV** per veure les dades de cada model, i **Comptabilitza el pagament a Hisenda** quan el banc carregui l'ingrés: es crea la despesa a la categoria «Retencions IRPF ingressades».

> Compte: el programa no presenta els models; són documents de treball per omplir-los a la seu electrònica de l'AEAT. Si un tercer no té NIF no es pot declarar. Consulteu-ho amb la gestoria.`,
      es: `Cuando la asociación paga a un profesional o un artista que factura con retención de IRPF (un músico, un ponente, un diseñador) o alquila un local, debe **retener** una parte del pago e ingresarla en Hacienda. Lo encontrarás en [Tesorería](/tresoreria), pestaña **Terceros y retenciones**, que tiene tres apartados.

# Terceros

Un **tercero** es cualquier persona o empresa a quien paguéis (o, si facturáis, a quien cobréis). En **Terceros** pulsa **Nuevo tercero** y rellena el **Nombre o razón social**, el **NIF** (el programa comprueba la letra de control), si es **Persona física** o **Persona jurídica**, la dirección y el **Código postal** (de él sale la provincia). Si ya tenéis clientes en Facturación, **Importar desde los clientes de facturación** los crea de golpe.

# Pagos y retenciones

Aquí aparecen los gastos de la contabilidad. Para cada pago con retención:

1. Pulsa el pago y elige el **Tercero (quién ha cobrado)**.
2. En **Retención de IRPF**, elige el tipo: **Profesionales y artistas (modelo 111)**, **Alquiler de inmuebles (modelo 115)** u **Otros rendimientos (modelo 111)**.
3. Indica el **Porcentaje de retención**: habitualmente el 15 % (el 7 % los primeros años de actividad del profesional) y el 19 % para los alquileres. Elige la **Clave del modelo 190** si procede.
4. La **Base** se calcula sola a partir del **Neto pagado**. Comprueba que coincide con la factura.

> Consejo: en contabilidad apunta solo lo que realmente sale del banco (el neto). La retención se paga después, en el modelo trimestral.

# Modelos 111, 115, 190, 180 y 347

Este apartado resume, trimestre a trimestre, lo que hay que declarar:

- **Modelo 111** (profesionales y artistas) y **modelo 115** (alquileres): trimestrales, hasta el 20 de abril, 20 de julio, 20 de octubre y 30 de enero.
- **Modelo 190** y **modelo 180**: resúmenes anuales de los anteriores, en enero.
- **Modelo 347**: operaciones con un mismo tercero de más de 3.005,06 € al año; solo afecta a las entidades con actividades económicas. Se presenta en febrero.

Pulsa **Detalle, impresión y CSV** para ver los datos de cada modelo, y **Contabilizar el pago a Hacienda** cuando el banco cargue el ingreso: se crea el gasto en la categoría «Retencions IRPF ingressades».

> Atención: el programa no presenta los modelos; son documentos de trabajo para rellenarlos en la sede electrónica de la AEAT. Si un tercero no tiene NIF no se puede declarar. Consultadlo con la gestoría.`,
      en: `When the association pays a professional or an artist who invoices with income tax (IRPF) withheld (a musician, a speaker, a designer) or rents premises, it must **withhold** part of the payment and pay it to the tax agency. You will find this in [Treasury](/tresoreria), **Third parties and withholdings** tab, which has three sections.

# Third parties

A **third party** is any person or company you pay (or, if you invoice, that pays you). In **Third parties** press **New third party** and fill in the **Name or company name**, the **Tax ID** (the program checks the control letter), whether it is an **Individual** or a **Legal entity**, the address and the **Postcode** (the province is taken from it). If you already have invoicing customers, **Import from invoicing customers** creates them all at once.

# Payments and withholdings

This lists the expenses from the accounts. For each payment with withholding:

1. Press the payment and choose the **Third party (recipient)**.
2. Under **Income tax withholding**, choose the type: **Professionals and artists (form 111)**, **Property rent (form 115)** or **Other income (form 111)**.
3. Enter the **Withholding percentage**: usually 15% (7% in the professional’s first years of activity) and 19% for rent. Choose the **Form 190 key** if applicable.
4. The **Base** is calculated automatically from the **Net paid**. Check it matches the invoice.

> Tip: in the accounts, record only what actually leaves the bank (the net amount). The withholding is paid later, with the quarterly form.

# Forms 111, 115, 190, 180 and 347

This section summarises, quarter by quarter, what has to be declared:

- **Form 111** (professionals and artists) and **form 115** (rent): quarterly, by 20 April, 20 July, 20 October and 30 January.
- **Form 190** and **form 180**: annual summaries of the above, in January.
- **Form 347**: transactions with the same third party over €3,005.06 a year; it only affects entities with economic activities. Filed in February.

Press **Details, print and CSV** to see each form’s data, and **Record the payment to the tax office** when the bank debits it: the expense is created in the “Retencions IRPF ingressades” category.

> Warning: the program does not file the forms; they are working documents to help you fill them in on the tax agency (AEAT) website. A third party without a tax ID cannot be declared. Check with your accountant.`,
    },
  },

  // ───────────────────────────── Extractes bancaris
  {
    id: 'extractes-bancaris',
    seccio: 'economia',
    titol: { ca: 'Extractes bancaris i conciliació', es: 'Extractos bancarios y conciliación', en: 'Bank statements and reconciliation' },
    resum: {
      ca: "Com importar l'extracte del banc (CSV o Norma 43) i comprovar que cada línia és a la comptabilitat.",
      es: 'Cómo importar el extracto del banco (CSV o Norma 43) y comprobar que cada línea está en la contabilidad.',
      en: 'How to import the bank statement (CSV or Norma 43) and check that every line is in the accounts.',
    },
    paraules: ['extracte', 'extracto', 'statement', 'banc', 'banco', 'bank', 'conciliació', 'conciliación', 'reconciliation', 'conciliar', 'reconcile', 'norma 43', 'cuaderno 43', 'aeb 43', 'csv', 'excel', 'importar', 'import', 'saldo', 'balance'],
    cos: {
      ca: `**Conciliar** vol dir comprovar que el que diu el banc i el que diu la comptabilitat coincideixen, línia per línia. És la millor manera de no deixar-se cap moviment i de detectar errors. Es fa a [Tresoreria](/tresoreria), pestanya **Extractes bancaris**.

# 1. Descarregar l'extracte

A la banca en línia, descarrega els moviments del compte en un d'aquests formats:

- **Norma 43** (també dit «Cuaderno 43» o «AEB 43»): el format estàndard dels bancs espanyols. És el més fiable.
- **CSV**, o un Excel que hagis desat com a CSV.

# 2. Importar-lo

1. Tria el **Compte** i prem **Importa un extracte**.
2. Selecciona el **Fitxer de l'extracte**.
3. Si és un CSV, indica les **Files a saltar al principi** i fes l'**Associació de columnes**: data, concepte i l'import amb signe (o bé càrrecs i abonaments per separat). El programa ho recorda per a aquest compte.
4. Prem **Comprova**: veuràs quantes línies són noves, quantes ja s'havien importat i quines tenen errors.
5. Prem **Importa** les línies.

Les línies ja importades no es dupliquen, així que pots importar extractes que se solapin. Amb Norma 43, el programa comprova també que el fitxer és del mateix IBAN i que els saldos quadren.

# 3. Conciliar

Les línies queden **Pendents de conciliar**. Per a cadascuna, prem **Concilia**:

- Si el moviment ja és a la comptabilitat, el programa et proposa els que tenen el mateix import (±5 dies). Prem **Vincula**.
- Si no hi és (una comissió, uns interessos), crea'l allà mateix: **O bé crea una despesa nova** (o un ingrés), amb la seva **Categoria**, i prem **Crea el moviment**.
- Si una línia no s'ha de comptabilitzar, prem **Ignora**.

Si t'equivoques, **Desfés** torna la línia a pendent.

# 4. Comprovar el saldo

A dalt veus el **Saldo del banc** segons l'últim extracte i el **Saldo a l'aplicació**. Si tot està conciliat, han de coincidir: hi posarà «quadra amb el banc». Si no, et mostra la diferència.

> Consell: concilia cada mes. Amb poques línies és una feina de deu minuts; amb un any sencer, d'una tarda.`,
      es: `**Conciliar** significa comprobar que lo que dice el banco y lo que dice la contabilidad coinciden, línea a línea. Es la mejor manera de no dejarse ningún movimiento y de detectar errores. Se hace en [Tesorería](/tresoreria), pestaña **Extractos bancarios**.

# 1. Descargar el extracto

En la banca en línea, descarga los movimientos de la cuenta en uno de estos formatos:

- **Norma 43** (también llamado «Cuaderno 43» o «AEB 43»): el formato estándar de los bancos españoles. Es el más fiable.
- **CSV**, o un Excel guardado como CSV.

# 2. Importarlo

1. Elige la **Cuenta** y pulsa **Importar un extracto**.
2. Selecciona el **Fichero del extracto**.
3. Si es un CSV, indica las **Filas a saltar al principio** y haz la **Asociación de columnas**: fecha, concepto y el importe con signo (o bien cargos y abonos por separado). El programa lo recuerda para esta cuenta.
4. Pulsa **Comprobar**: verás cuántas líneas son nuevas, cuántas ya se habían importado y cuáles tienen errores.
5. Pulsa **Importar** las líneas.

Las líneas ya importadas no se duplican, así que puedes importar extractos que se solapen. Con Norma 43, el programa comprueba también que el fichero es del mismo IBAN y que los saldos cuadran.

# 3. Conciliar

Las líneas quedan **Pendientes de conciliar**. Para cada una, pulsa **Conciliar**:

- Si el movimiento ya está en la contabilidad, el programa te propone los que tienen el mismo importe (±5 días). Pulsa **Vincular**.
- Si no está (una comisión, unos intereses), créalo allí mismo: **O bien crea un gasto nuevo** (o un ingreso), con su **Categoría**, y pulsa **Crear el movimiento**.
- Si una línea no se debe contabilizar, pulsa **Ignorar**.

Si te equivocas, **Deshacer** devuelve la línea a pendiente.

# 4. Comprobar el saldo

Arriba ves el **Saldo del banco** según el último extracto y el **Saldo en la aplicación**. Si todo está conciliado, deben coincidir: pondrá «cuadra con el banco». Si no, te muestra la diferencia.

> Consejo: concilia cada mes. Con pocas líneas es un trabajo de diez minutos; con un año entero, de una tarde.`,
      en: `**Reconciling** means checking that what the bank says and what your accounts say match, line by line. It is the best way not to miss any transaction and to catch mistakes. It is done in [Treasury](/tresoreria), **Bank statements** tab.

# 1. Download the statement

In online banking, download the account’s transactions in one of these formats:

- **Norma 43** (also called “Cuaderno 43” or “AEB 43”): the standard format of Spanish banks. It is the most reliable.
- **CSV**, or an Excel file saved as CSV.

# 2. Import it

1. Choose the **Account** and press **Import a statement**.
2. Select the **Statement file**.
3. If it is a CSV, set the **Rows to skip at the start** and the **Column mapping**: date, description and the signed amount (or debits and credits separately). The program remembers this for the account.
4. Press **Check**: you will see how many lines are new, how many were already imported and which have errors.
5. Press **Import** to bring in the lines.

Lines already imported are not duplicated, so you can import overlapping statements. With Norma 43 the program also checks that the file belongs to the same IBAN and that the balances add up.

# 3. Reconcile

The lines are **Awaiting reconciliation**. For each one press **Reconcile**:

- If the transaction is already in the accounts, the program suggests those with the same amount (±5 days). Press **Link**.
- If it is not (a bank fee, some interest), create it right there: **Or create a new expense** (or income), with its **Category**, and press **Create transaction**.
- If a line should not be recorded, press **Ignore**.

If you make a mistake, **Undo** sets the line back to pending.

# 4. Check the balance

At the top you see the **Bank balance** according to the latest statement and the **Balance in the app**. If everything is reconciled they should match and it will say “matches the bank”. If not, it shows the difference.

> Tip: reconcile every month. With a few lines it takes ten minutes; with a whole year, an afternoon.`,
    },
  },

  // ───────────────────────────── Tancament
  {
    id: 'tancament-exercici',
    seccio: 'economia',
    titol: { ca: "Tancament de l'exercici", es: 'Cierre del ejercicio', en: 'Year-end closing' },
    resum: {
      ca: "Quan i com tancar l'any perquè els comptes aprovats per l'assemblea ja no es puguin modificar.",
      es: 'Cuándo y cómo cerrar el año para que las cuentas aprobadas por la asamblea ya no se puedan modificar.',
      en: 'When and how to close the year so that the accounts approved by the general meeting can no longer be changed.',
    },
    paraules: ['tancament', 'cierre', 'closing', 'tancar', 'cerrar', 'close', 'reobrir', 'reabrir', 'reopen', 'exercici tancat', 'ejercicio cerrado', 'closed year', 'cadenat', 'candado', 'padlock', 'comptes anuals', 'cuentas anuales', 'annual accounts'],
    cos: {
      ca: `Quan l'assemblea general ha aprovat els comptes d'un any, aquests comptes han de quedar com es van aprovar. **Tancar l'exercici** ho garanteix: els seus moviments ja no es poden afegir, modificar ni eliminar. Es fa a [Tresoreria](/tresoreria), pestanya **Tancament**.

# Abans de tancar

Revisa aquesta llista. La taula t'avisa de les coses més habituals a la columna **Pendents**:

1. Totes les **quotes** de l'any estan cobrades o marcades com a exemptes (o sabeu que es cobraran l'any següent).
2. No queden **remeses per cobrar**.
3. L'extracte del banc està **conciliat** i el saldo quadra (vegeu [Extractes bancaris i conciliació](/ajuda/extractes-bancaris)).
4. Els moviments tenen els **justificants** adjunts.
5. Heu imprès els [informes econòmics](/ajuda/informes-economics) i l'assemblea els ha aprovat.

# Tancar

1. A la fila de l'exercici, prem **Tanca l'exercici**.
2. Veuràs el resultat de l'any i el nombre de moviments, i un avís si encara hi ha quotes pendents.
3. A **Notes**, escriu per exemple la data de l'assemblea que va aprovar els comptes.
4. Confirma. L'estat passa a «Tancat el» (data).

A partir d'aquí, a [Comptabilitat](/moviments) els moviments d'aquell any surten amb un cadenat. Es poden consultar i s'hi poden afegir justificants, però no canviar.

# I si he de corregir alguna cosa?

- **Opció recomanada**: apunta un moviment de regularització a l'exercici obert, amb un concepte clar («Correcció de…»).
- **Si cal tocar l'any tancat**: només un usuari amb rol d'administració pot prémer **Reobre**, i ha d'explicar-ne el **Motiu**, que queda al registre d'activitat. Després de corregir, torna'l a tancar.

> Compte: reobrir un any ja aprovat vol dir que els comptes deixen de coincidir amb els que va aprovar l'assemblea. Fes-ho només per errors greus i informa'n la junta.`,
      es: `Cuando la asamblea general ha aprobado las cuentas de un año, esas cuentas deben quedar como se aprobaron. **Cerrar el ejercicio** lo garantiza: sus movimientos ya no se pueden añadir, modificar ni eliminar. Se hace en [Tesorería](/tresoreria), pestaña **Cierre**.

# Antes de cerrar

Revisa esta lista. La tabla te avisa de lo más habitual en la columna **Pendientes**:

1. Todas las **cuotas** del año están cobradas o marcadas como exentas (o sabéis que se cobrarán el año siguiente).
2. No quedan **remesas por cobrar**.
3. El extracto del banco está **conciliado** y el saldo cuadra (ver [Extractos bancarios y conciliación](/ajuda/extractes-bancaris)).
4. Los movimientos tienen los **justificantes** adjuntos.
5. Habéis impreso los [informes económicos](/ajuda/informes-economics) y la asamblea los ha aprobado.

# Cerrar

1. En la fila del ejercicio, pulsa **Cerrar el ejercicio**.
2. Verás el resultado del año y el número de movimientos, y un aviso si aún hay cuotas pendientes.
3. En **Notas**, escribe por ejemplo la fecha de la asamblea que aprobó las cuentas.
4. Confirma. El estado pasa a «Cerrado el» (fecha).

A partir de ahí, en [Contabilidad](/moviments) los movimientos de ese año aparecen con un candado. Se pueden consultar y se les pueden añadir justificantes, pero no cambiar.

# ¿Y si tengo que corregir algo?

- **Opción recomendada**: apunta un movimiento de regularización en el ejercicio abierto, con un concepto claro («Corrección de…»).
- **Si hay que tocar el año cerrado**: solo un usuario con rol de administración puede pulsar **Reabrir**, y debe explicar el **Motivo**, que queda en el registro de actividad. Después de corregir, vuelve a cerrarlo.

> Atención: reabrir un año ya aprobado significa que las cuentas dejan de coincidir con las que aprobó la asamblea. Hazlo solo por errores graves e informa a la junta.`,
      en: `Once the general meeting has approved a year’s accounts, they should stay exactly as approved. **Closing the year** guarantees this: its transactions can no longer be added, changed or deleted. It is done in [Treasury](/tresoreria), **Year-end closing** tab.

# Before closing

Go through this list. The table warns you about the most common issues in the **Pending** column:

1. All the year’s **fees** are collected or marked exempt (or you know they will be collected next year).
2. There are no **batches to collect**.
3. The bank statement is **reconciled** and the balance matches (see [Bank statements and reconciliation](/ajuda/extractes-bancaris)).
4. Transactions have their **receipts** attached.
5. You have printed the [financial reports](/ajuda/informes-economics) and the general meeting has approved them.

# Closing

1. On the year’s row, press **Close year**.
2. You will see the year’s result and number of transactions, and a warning if there are still pending fees.
3. In **Notes**, write for example the date of the meeting that approved the accounts.
4. Confirm. The status changes to “Closed on” (date).

From then on, in [Accounts](/moviments) that year’s transactions show a padlock. They can be viewed and receipts can be added, but they cannot be changed.

# What if I need to correct something?

- **Recommended**: record an adjusting transaction in the open year, with a clear description (“Correction of…”).
- **If the closed year really must change**: only a user with the administrator role can press **Reopen**, and must give a **Reason**, which is kept in the activity log. After correcting, close it again.

> Warning: reopening an approved year means the accounts no longer match those the general meeting approved. Do it only for serious errors and tell the board.`,
    },
  },

  // ───────────────────────────── Facturació
  {
    id: 'facturacio',
    seccio: 'economia',
    titol: { ca: 'Facturació i VERI*FACTU', es: 'Facturación y VERI*FACTU', en: 'Invoicing and VERI*FACTU' },
    resum: {
      ca: "Quan necessita factures una associació, com emetre-les amb sèries, rectificar-les i enviar-les a l'AEAT.",
      es: 'Cuándo necesita facturas una asociación, cómo emitirlas con series, rectificarlas y enviarlas a la AEAT.',
      en: 'When an association needs invoices, how to issue them in series, correct them and send them to the tax agency.',
    },
    rutes: ['/facturacio'],
    paraules: ['factura', 'invoice', 'facturació', 'facturación', 'invoicing', 'verifactu', 'veri*factu', 'rectificativa', 'corrective', 'sèrie', 'serie', 'series', 'qr', 'aeat', 'iva', 'vat', 'exempta', 'exenta', 'exempt', 'certificat electrònic', 'certificado electrónico', 'digital certificate', 'client', 'cliente', 'customer'],
    cos: {
      ca: `# Quan cal fer factura?

La majoria d'ingressos d'una associació cultural **no necessiten factura**: les quotes dels socis, els donatius i les subvencions es justifiquen amb un rebut o amb la resolució. Cal factura quan l'associació **ven un servei o un bé** a una empresa, un ajuntament o una altra entitat: una actuació contractada, el lloguer d'un equip, un patrocini amb contraprestació…

Moltes d'aquestes operacions estan **exemptes d'IVA** (art. 20 de la Llei 37/1992), per exemple els serveis culturals d'entitats de caràcter social; la factura ha d'indicar el motiu legal de l'exempció. Consulteu-ho amb la gestoria abans de començar a facturar.

# Configurar (una sola vegada)

A [Facturació](/facturacio), pestanya **Configuració**: les **Dades de l'emissor** (NIF i domicili fiscal), les **Sèries de facturació** (cada sèrie té numeració correlativa pròpia per any; les rectificatives i les simplificades han d'anar en sèries separades) i la **Remissió a l'AEAT**.

# Fer una factura

1. A **Factures**, prem **+ Nova factura** i tria la **Sèrie** i el **Client** (els clients es gestionen a la pestanya **Clients**; per a una factura completa calen nom, NIF i adreça).
2. Afegeix les línies: quantitat, preu sense IVA, descompte i IVA. Si és exempta, tria el **Motiu legal de l'exempció**.
3. **Desa l'esborrany**. Mentre és esborrany la pots canviar o eliminar.
4. Quan sigui correcta, prem **Emet la factura**.

> Compte: un cop emesa, la factura rep un número correlatiu i ja **no es pot modificar ni esborrar**. Per corregir-la cal una **factura rectificativa**: prem **Fes una rectificativa**, ajusta les línies i el **Motiu de la rectificació**, i emet-la. **Anul·la** només és per a factures fetes per error que no corresponen a cap operació real.

Quan el client pagui, prem **Registra el cobrament**: es crea l'ingrés a comptabilitat.

# Verifactu

El sistema Verifactu (RD 1007/2023) exigeix que cada factura emesa generi un registre encadenat amb una empremta digital i un **codi QR tributari** imprès a la factura, i que els registres s'enviïn a l'AEAT. Segons el calendari vigent, serà obligatori a partir de 2027.

- Pestanya «Registre VERI*FACTU»: hi ha tots els registres. **Verifica la integritat de la cadena** comprova que no s'ha alterat cap.
- Per enviar-los cal pujar a **Configuració** el **Certificat electrònic de l'entitat** (.p12 o .pfx) i triar l'**Entorn**: **Proves** per assajar, **Producció** per a les factures reals.
- Prem **Envia a l'AEAT** (o activa **Envia automàticament després d'emetre**) i revisa la resposta: acceptat, acceptat amb errors o rebutjat.

> Consell: feu sempre primer unes quantes factures a l'entorn de proves; aquestes no tenen validesa fiscal.`,
      es: `# ¿Cuándo hay que hacer factura?

La mayoría de ingresos de una asociación cultural **no necesitan factura**: las cuotas de los socios, los donativos y las subvenciones se justifican con un recibo o con la resolución. Hace falta factura cuando la asociación **vende un servicio o un bien** a una empresa, un ayuntamiento u otra entidad: una actuación contratada, el alquiler de un equipo, un patrocinio con contraprestación…

Muchas de estas operaciones están **exentas de IVA** (art. 20 de la Ley 37/1992), por ejemplo los servicios culturales de entidades de carácter social; la factura debe indicar el motivo legal de la exención. Consultadlo con la gestoría antes de empezar a facturar.

# Configurar (una sola vez)

En [Facturación](/facturacio), pestaña **Configuración**: los **Datos del emisor** (NIF y domicilio fiscal), las **Series de facturación** (cada serie tiene numeración correlativa propia por año; las rectificativas y las simplificadas deben ir en series separadas) y la **Remisión a la AEAT**.

# Hacer una factura

1. En **Facturas**, pulsa **+ Nueva factura** y elige la **Serie** y el **Cliente** (los clientes se gestionan en la pestaña **Clientes**; para una factura completa hacen falta nombre, NIF y dirección).
2. Añade las líneas: cantidad, precio sin IVA, descuento e IVA. Si es exenta, elige el **Motivo legal de la exención**.
3. **Guardar el borrador**. Mientras es borrador puedes cambiarla o eliminarla.
4. Cuando sea correcta, pulsa **Emitir la factura**.

> Atención: una vez emitida, la factura recibe un número correlativo y ya **no se puede modificar ni borrar**. Para corregirla hace falta una **factura rectificativa**: pulsa **Hacer una rectificativa**, ajusta las líneas y el **Motivo de la rectificación**, y emítela. **Anula** solo es para facturas hechas por error que no corresponden a ninguna operación real.

Cuando el cliente pague, pulsa **Registrar el cobro**: se crea el ingreso en contabilidad.

# Verifactu

El sistema Verifactu (RD 1007/2023) exige que cada factura emitida genere un registro encadenado con una huella digital y un **código QR tributario** impreso en la factura, y que los registros se envíen a la AEAT. Según el calendario vigente, será obligatorio a partir de 2027.

- Pestaña «Registro VERI*FACTU»: están todos los registros. **Verificar la integridad de la cadena** comprueba que no se ha alterado ninguno.
- Para enviarlos hay que subir en **Configuración** el **Certificado electrónico de la entidad** (.p12 o .pfx) y elegir el **Entorno**: **Pruebas** para ensayar, **Producción** para las facturas reales.
- Pulsa **Enviar a la AEAT** (o activa **Enviar automáticamente después de emitir**) y revisa la respuesta: aceptado, aceptado con errores o rechazado.

> Consejo: haced siempre primero unas cuantas facturas en el entorno de pruebas; estas no tienen validez fiscal.`,
      en: `# When is an invoice needed?

Most of a cultural association’s income **does not need an invoice**: membership fees, donations and grants are supported by a receipt or the award decision. An invoice is needed when the association **sells a service or goods** to a company, a town council or another organisation: a booked performance, equipment hire, sponsorship with something in return…

Many of these transactions are **VAT-exempt** (art. 20 of Law 37/1992), for example cultural services by social organisations; the invoice must state the legal reason for the exemption. Check with your accountant before you start invoicing.

# Setting up (once)

In [Invoicing](/facturacio), **Settings** tab: the **Issuer details** (tax ID and tax address), the **Invoice series** (each series has its own consecutive numbering per year; corrective and simplified invoices must go in separate series) and **Reporting to the tax agency**.

# Making an invoice

1. In **Invoices**, press **+ New invoice** and choose the **Series** and the **Customer** (customers are managed in the **Customers** tab; a full invoice needs name, tax ID and address).
2. Add the lines: quantity, price excluding VAT, discount and VAT. If it is exempt, choose the **Legal reason for the exemption**.
3. **Save draft**. While it is a draft you can change or delete it.
4. When it is correct, press **Issue invoice**.

> Warning: once issued, the invoice gets a consecutive number and **can no longer be changed or deleted**. To correct it you need a **corrective invoice**: press **Issue a corrective invoice**, adjust the lines and the **Reason for the correction**, and issue it. **Cancel** is only for invoices made in error that do not match any real transaction.

When the customer pays, press **Record payment**: the income is created in the accounts.

# Verifactu

The Verifactu system (Royal Decree 1007/2023) requires each issued invoice to generate a chained record with a digital fingerprint and a **tax QR code** printed on the invoice, and those records to be sent to the tax agency (AEAT). Under the current timetable it becomes mandatory from 2027.

- Tab “VERI*FACTU log”: all the records are there. **Check the chain integrity** verifies that none has been altered.
- To send them, upload the **Organisation’s digital certificate** (.p12 or .pfx) in **Settings** and choose the **Environment**: **Test** for practice, **Production** for real invoices.
- Press **Send to the tax agency** (or turn on **Send automatically after issuing**) and check the response: accepted, accepted with errors or rejected.

> Tip: always make a few invoices in the test environment first; they have no tax validity.`,
    },
  },

  // ───────────────────────────── Subvencions
  {
    id: 'subvencions',
    seccio: 'economia',
    titol: { ca: 'Subvencions', es: 'Subvenciones', en: 'Grants' },
    resum: {
      ca: 'Seguiment de cada subvenció des de la sol·licitud fins a la justificació, amb el compte justificatiu simplificat.',
      es: 'Seguimiento de cada subvención desde la solicitud hasta la justificación, con la cuenta justificativa simplificada.',
      en: 'Tracking each grant from application to justification, with the simplified justification account.',
    },
    rutes: ['/subvencions'],
    paraules: ['subvenció', 'subvención', 'grant', 'ajut', 'ayuda', 'justificació', 'justificación', 'justification', 'compte justificatiu', 'cuenta justificativa', 'imputar', 'imputación', 'allocate', 'reintegrament', 'reintegro', 'repayment', 'ajuntament', 'ayuntamiento', 'consell', 'govern', 'memòria', 'memoria', 'report', 'rd 887/2006', 'llei 38/2003'],
    cos: {
      ca: `Les subvencions públiques (Ajuntament, Consell de Mallorca, Govern…) es regeixen per la Llei 38/2003 general de subvencions i el seu reglament (RD 887/2006). L'entitat ha de **justificar** que ha fet l'activitat i que ha gastat els diners, normalment amb un **compte justificatiu**. La pantalla [Subvencions](/subvencions) us ajuda en tot el procés.

# El cicle d'una subvenció

Cada subvenció passa per aquests estats: **En preparació**, **Sol·licitada**, **Concedida** (o **Denegada**), **Cobrada**, **Justificada** i **Tancada**. Si l'organisme demana tornar diners, **Reintegrament**.

1. Prem **+ Nova subvenció** i omple l'**Organisme**, la **Convocatòria**, el **Núm. d'expedient**, l'activitat o projecte, el **Pressupost del projecte (€)** i l'**Import sol·licitat (€)**.
2. Quan arribi la resolució, edita-la: **Import concedit (€)**, **Data de resolució**, **Període d'execució** i **Data de justificació** (el termini). A **Dades** pots adjuntar la **Resolució de concessió**.
3. Quan cobreu, a **Cobraments** prem **Vincula un ingrés** (o tria la subvenció en registrar l'ingrés a [Comptabilitat](/moviments)).

# Imputar despeses

**Imputar** vol dir assignar a la subvenció les despeses que paga. A **Despeses imputades**, prem **+ Imputa despeses**, tria la despesa i indica quina part s'imputa (pot ser tota o una part). Hi pots afegir la **Data d'emissió de la factura** i el **Creditor / proveïdor**.

- Una mateixa despesa no es pot imputar per sobre del seu import entre totes les subvencions.
- El programa avisa de les despeses **sense justificant**: adjunta la factura amb el clip.
- Per defecte només surten les despeses del període d'execució.

# Justificar

A **Justificació** escriu la **Memòria d'actuació** (activitats fetes i resultats) i els altres ingressos que han finançat l'activitat. El programa genera el **Compte justificatiu simplificat** de l'art. 75 del RD 887/2006: memòria, relació classificada de despeses, altres ingressos, desviacions respecte del pressupost i declaració responsable per signar.

Quan l'hàgiu presentat, prem **Marca com a justificada** amb la **Data de presentació**. Les despeses imputades queden bloquejades.

> Compte: si les despeses imputades no arriben a l'import concedit, el programa ho avisa: potser caldrà reintegrar la diferència. Llegiu sempre les bases de la convocatòria, que mana per sobre d'aquest model, i guardeu els originals almenys quatre anys.`,
      es: `Las subvenciones públicas (Ayuntamiento, Consell de Mallorca, Govern…) se rigen por la Ley 38/2003 general de subvenciones y su reglamento (RD 887/2006). La entidad debe **justificar** que ha realizado la actividad y que ha gastado el dinero, normalmente con una **cuenta justificativa**. La pantalla [Subvenciones](/subvencions) te ayuda en todo el proceso.

# El ciclo de una subvención

Cada subvención pasa por estos estados: **En preparación**, **Solicitada**, **Concedida** (o **Denegada**), **Cobrada**, **Justificada** y **Cerrada**. Si el organismo pide devolver dinero, **Reintegro**.

1. Pulsa **+ Nueva subvención** y rellena el **Organismo**, la **Convocatoria**, el **Núm. de expediente**, la actividad o proyecto, el **Presupuesto del proyecto (€)** y el **Importe solicitado (€)**.
2. Cuando llegue la resolución, edítala: **Importe concedido (€)**, **Fecha de resolución**, **Periodo de ejecución** y **Fecha de justificación** (el plazo). En **Datos** puedes adjuntar la **Resolución de concesión**.
3. Cuando cobréis, en **Cobros** pulsa **Vincular un ingreso** (o elige la subvención al registrar el ingreso en [Contabilidad](/moviments)).

# Imputar gastos

**Imputar** significa asignar a la subvención los gastos que paga. En **Gastos imputados**, pulsa **+ Imputar gastos**, elige el gasto e indica qué parte se imputa (puede ser todo o una parte). Puedes añadir la **Fecha de emisión de la factura** y el **Acreedor / proveedor**.

- Un mismo gasto no se puede imputar por encima de su importe entre todas las subvenciones.
- El programa avisa de los gastos **sin justificante**: adjunta la factura con el clip.
- Por defecto solo aparecen los gastos del periodo de ejecución.

# Justificar

En **Justificación** escribe la **Memoria de actuación** (actividades realizadas y resultados) y los otros ingresos que han financiado la actividad. El programa genera la **Cuenta justificativa simplificada** del art. 75 del RD 887/2006: memoria, relación clasificada de gastos, otros ingresos, desviaciones respecto del presupuesto y declaración responsable para firmar.

Cuando la hayáis presentado, pulsa **Marcar como justificada** con la **Fecha de presentación**. Los gastos imputados quedan bloqueados.

> Atención: si los gastos imputados no llegan al importe concedido, el programa lo avisa: quizá haya que reintegrar la diferencia. Leed siempre las bases de la convocatoria, que mandan por encima de este modelo, y guardad los originales al menos cuatro años.`,
      en: `Public grants (town council, Consell de Mallorca, Balearic Government…) are governed by Spain’s General Grants Act (Law 38/2003) and its regulation (Royal Decree 887/2006). The organisation must **justify** that it carried out the activity and spent the money, usually with a **justification account**. The [Grants](/subvencions) screen helps you through the whole process.

# A grant’s life cycle

Each grant goes through these statuses: **In preparation**, **Applied**, **Awarded** (or **Rejected**), **Collected**, **Justified** and **Closed**. If the funding body asks for money back, **Repayment**.

1. Press **+ New grant** and fill in the **Funding body**, the call, the **File no.**, the activity or project, the **Project budget (€)** and the **Amount requested (€)**.
2. When the decision arrives, edit it: **Amount granted (€)**, **Resolution date**, **Execution period** and **Justification date** (the deadline). In **Details** you can attach the **Award decision**.
3. When the money arrives, in **Payments received** press **Link an income** (or choose the grant when recording the income in [Accounts](/moviments)).

# Allocating expenses

**Allocating** means assigning to the grant the expenses it pays for. In **Allocated expenses**, press **+ Allocate expenses**, choose the expense and set how much of it is allocated (all or part). You can add the **Invoice issue date** and the **Creditor / supplier**.

- The same expense cannot be allocated beyond its amount across all grants.
- The program flags expenses with **no receipt**: attach the invoice with the paperclip.
- By default only expenses within the execution period are shown.

# Justifying

In **Justification**, write the **Activity report** (activities carried out and results) and the other income that funded the activity. The program produces the **Simplified justification account** of art. 75 of Royal Decree 887/2006: report, classified list of expenses, other income, deviations from the budget and a signed responsible declaration.

Once you have submitted it, press **Mark as justified** with the **Submission date**. The allocated expenses are then locked.

> Warning: if allocated expenses do not reach the amount granted, the program warns you: you may have to repay the difference. Always read the call’s rules, which prevail over this template, and keep the originals for at least four years.`,
    },
  },

  // ───────────────────────────── Donatius
  {
    id: 'donatius',
    seccio: 'economia',
    titol: { ca: 'Donatius i model 182', es: 'Donativos y modelo 182', en: 'Donations and form 182' },
    resum: {
      ca: 'Com registrar donacions, emetre certificats o rebuts segons el règim de la Llei 49/2002 i preparar el model 182.',
      es: 'Cómo registrar donaciones, emitir certificados o recibos según el régimen de la Ley 49/2002 y preparar el modelo 182.',
      en: 'How to record donations, issue certificates or receipts depending on the Law 49/2002 regime and prepare form 182.',
    },
    rutes: ['/donatius'],
    paraules: ['donatiu', 'donativo', 'donation', 'donació', 'donación', 'donant', 'donante', 'donor', 'certificat', 'certificado', 'certificate', 'model 182', 'modelo 182', 'form 182', 'llei 49/2002', 'ley 49/2002', 'law 49/2002', 'mecenatge', 'mecenazgo', 'deducció', 'deducción', 'deduction', 'recurrència', 'recurrencia', 'recurrence', 'espècie', 'especie', 'in kind', 'utilitat pública', 'utilidad pública', 'public utility'],
    cos: {
      ca: `La pantalla [Donatius](/donatius) registra les donacions que rep l'associació. El que podeu fer amb elles depèn del vostre **règim fiscal**, que es tria a la pestanya **Configuració**.

# Acollida o no a la Llei 49/2002?

- **Acollida a la Llei 49/2002**: només si l'associació és declarada d'utilitat pública (o compleix els requisits de l'art. 3 de la llei) i ha comunicat a l'Agència Tributària que hi opta (model 036). Pot emetre **certificats** amb dret a deducció per als donants i ha de presentar el **model 182** cada gener.
- **No acollida**: és el cas de la majoria d'associacions petites. Podeu registrar les donacions i lliurar un **rebut**, que acredita la donació però **no dona dret a deducció**.

Si no sabeu en quina situació esteu, consulteu-ho amb la gestoria. A **Configuració** també hi indiqueu el compte i la categoria habituals de les donacions.

# Registrar una donació

1. A **Donacions**, prem **+ Nova donació**.
2. Si el donant és soci, tria'l i les dades s'omplen soles. Si no, indica **Tipus de donant**, nom, **NIF** (imprescindible per al certificat i el model 182) i **Codi postal** (en surt la província).
3. Tria el **Tipus de donació**: dinerària o **En espècie (béns)**, amb la descripció i la **Valoració (€)**.
4. Marca **Registra l'ingrés a la tresoreria** perquè es creï l'ingrés a comptabilitat.

Les donacions en espècie es poden passar a l'[inventari](/ajuda/inventari) amb el botó **A l'inventari**.

# Certificats i rebuts

- Un **Certificat** o **Rebut** per a una donació concreta, des de la mateixa fila.
- A **Certificats**, un **certificat anual** per donant amb totes les donacions de l'any, que és el que necessiten per a la declaració de la renda. Prem **Emet el certificat**.

Un cop emès el document, ja no es poden canviar el donant, la data ni l'import. Si un donant revoca la donació, marca-la com a revocada.

# Model 182

La pestanya **Model 182** resumeix per donant l'import, la província, la naturalesa (F/J), si és **recurrent** i la deducció estimada. Des de 2024: persones físiques, 80 % dels primers 250 € i 40 % de la resta (45 % si és recurrent); persones jurídiques, 40 % (50 % si és recurrent). És **recurrent** qui ha donat a l'entitat els dos anys anteriors un import igual o superior cada any.

> Compte: el programa no presenta el model 182; us dona el resum i un CSV per omplir-lo a la seu electrònica de l'AEAT abans del 31 de gener. Els donants sense NIF no es poden declarar.`,
      es: `La pantalla [Donativos](/donatius) registra las donaciones que recibe la asociación. Lo que podéis hacer con ellas depende de vuestro **régimen fiscal**, que se elige en la pestaña **Configuración**.

# ¿Acogida o no a la Ley 49/2002?

- **Acogida a la Ley 49/2002**: solo si la asociación está declarada de utilidad pública (o cumple los requisitos del art. 3 de la ley) y ha comunicado a la Agencia Tributaria que opta por ella (modelo 036). Puede emitir **certificados** con derecho a deducción para los donantes y debe presentar el **modelo 182** cada enero.
- **No acogida**: es el caso de la mayoría de asociaciones pequeñas. Podéis registrar las donaciones y entregar un **recibo**, que acredita la donación pero **no da derecho a deducción**.

Si no sabéis en qué situación estáis, consultadlo con la gestoría. En **Configuración** también indicáis la cuenta y la categoría habituales de las donaciones.

# Registrar una donación

1. En **Donaciones**, pulsa **+ Nueva donación**.
2. Si el donante es socio, elígelo y los datos se rellenan solos. Si no, indica **Tipo de donante**, nombre, **NIF** (imprescindible para el certificado y el modelo 182) y **Código postal** (de él sale la provincia).
3. Elige el **Tipo de donación**: dineraria o **En especie (bienes)**, con la descripción y la **Valoración (€)**.
4. Marca **Registrar el ingreso en la tesorería** para que se cree el ingreso en contabilidad.

Las donaciones en especie se pueden pasar al [inventario](/ajuda/inventari) con el botón **Al inventario**.

# Certificados y recibos

- Un **Certificado** o **Recibo** para una donación concreta, desde la misma fila.
- En **Certificados**, un **certificado anual** por donante con todas las donaciones del año, que es lo que necesitan para la declaración de la renta. Pulsa **Emitir el certificado**.

Una vez emitido el documento, ya no se pueden cambiar el donante, la fecha ni el importe. Si un donante revoca la donación, márcala como revocada.

# Modelo 182

La pestaña **Modelo 182** resume por donante el importe, la provincia, la naturaleza (F/J), si es **recurrente** y la deducción estimada. Desde 2024: personas físicas, 80 % de los primeros 250 € y 40 % del resto (45 % si es recurrente); personas jurídicas, 40 % (50 % si es recurrente). Es **recurrente** quien ha donado a la entidad los dos años anteriores un importe igual o superior cada año.

> Atención: el programa no presenta el modelo 182; os da el resumen y un CSV para rellenarlo en la sede electrónica de la AEAT antes del 31 de enero. Los donantes sin NIF no se pueden declarar.`,
      en: `The [Donations](/donatius) screen records the donations the association receives. What you can do with them depends on your **tax regime**, chosen in the **Settings** tab.

# Covered by Law 49/2002 or not?

- **Covered by Law 49/2002**: only if the association has been declared of public utility (or meets the requirements of art. 3 of the law) and has told the tax agency it opts for this regime (form 036). It can issue **certificates** giving donors a tax deduction and must file **form 182** every January.
- **Not covered**: this is the case for most small associations. You can record donations and give a **receipt**, which proves the donation but **gives no right to a deduction**.

If you are not sure which applies to you, check with your accountant. In **Settings** you also set the usual account and category for donations.

# Recording a donation

1. In **Donations**, press **+ New donation**.
2. If the donor is a member, choose them and the details fill in automatically. Otherwise enter the **Donor type**, name, **Tax ID** (required for the certificate and form 182) and **Postcode** (the province is taken from it).
3. Choose the **Donation type**: monetary or **In kind (goods)**, with a description and the **Valuation (€)**.
4. Tick **Record the income in the treasury** so the income is created in the accounts.

In-kind donations can be moved to the [inventory](/ajuda/inventari) with the **To inventory** button.

# Certificates and receipts

- A **Certificate** or **Receipt** for a single donation, from its row.
- In **Certificates**, an **annual certificate** per donor with all their donations for the year, which is what they need for their income tax return. Press **Issue the certificate**.

Once the document is issued, the donor, date and amount can no longer be changed. If a donor revokes a donation, mark it as revoked.

# Form 182

The **Form 182** tab summarises per donor the amount, province, type (F/J), whether it is **recurring** and the estimated deduction. Since 2024: individuals, 80% of the first €250 and 40% of the rest (45% if recurring); legal entities, 40% (50% if recurring). A donor is **recurring** if they gave to the organisation in the two previous years, each year at least as much as the year before.

> Warning: the program does not file form 182; it gives you the summary and a CSV to fill it in on the tax agency (AEAT) website before 31 January. Donors without a tax ID cannot be reported.`,
    },
  },

  // ───────────────────────────── Inventari
  {
    id: 'inventari',
    seccio: 'economia',
    titol: { ca: 'Inventari de béns', es: 'Inventario de bienes', en: 'Inventory of assets' },
    resum: {
      ca: "Com dur l'inventari obligatori dels béns de l'associació, amb amortització, donacions en espècie i baixes.",
      es: 'Cómo llevar el inventario obligatorio de los bienes de la asociación, con amortización, donaciones en especie y bajas.',
      en: 'How to keep the association’s mandatory inventory of assets, with depreciation, in-kind donations and disposals.',
    },
    rutes: ['/inventari'],
    paraules: ['inventari', 'inventario', 'inventory', 'bé', 'bien', 'item', 'asset', 'amortització', 'amortización', 'depreciation', 'vida útil', 'useful life', 'baixa', 'baja', 'disposal', 'cessió', 'cesión', 'loan', 'material', 'equip', 'equipo', 'equipment', 'mobiliari', 'mobiliario', 'furniture'],
    cos: {
      ca: `La Llei orgànica 1/2002 d'associacions (art. 14) obliga a dur un **inventari dels béns**. A [Inventari](/inventari) hi anotareu el material que és de l'associació: equip de so, mobiliari, ordinadors, material de tallers, vestuari…

# Afegir un bé

1. Prem **+ Nou bé**.
2. Omple la **Descripció**, la **Categoria**, la **Data d'adquisició** i el **Valor d'adquisició (€)**: el preu de compra o, si és una donació o una cessió, una valoració raonable.
3. Indica la **Procedència** (Compra, Donació o Cessió), la **Ubicació** (on és guardat) i l'**Estat** (Bo, Regular o Dolent).
4. Si vols que s'amortitzi, posa la **Vida útil (anys)**. Orientativament: informàtica 4 anys, equips 5–8, mobiliari 10. Si la deixes buida, el bé no s'amortitza.
5. Opcionalment, afegeix-hi una foto. Desa.

> Consell: no cal inventariar cada boli. Una pràctica habitual és incloure-hi els béns duradors d'un cert valor i els que heu de poder localitzar (per exemple, el material comprat amb una subvenció).

# Amortització

L'**amortització** reparteix el cost d'un bé entre els anys que dura. El programa la calcula de manera lineal: un altaveu de 800 € amb vida útil de 8 anys s'amortitza 100 € l'any. La taula mostra l'**Amortització de l'any**, l'**Amortització acumulada** i el **Valor net comptable** a la data que triïs a **Valor a data**.

L'amortització és informativa: no crea moviments a la comptabilitat de caixa. La compra ja és una despesa a [Comptabilitat](/ajuda/comptabilitat) l'any que es paga.

# Donacions en espècie

Si algú dona un bé, registra la donació a [Donatius](/ajuda/donatius) com a donació en espècie amb la seva valoració i prem **A l'inventari**: el bé s'hi afegeix amb procedència «Donació».

# Baixes

Quan un bé es ven, es llença, es perd o es regala, no l'eliminis: edita'l, marca **Donat de baixa** i indica la **Data de baixa** i el **Motiu de la baixa**. Així en queda constància. Marca **Inclou els béns donats de baixa** per tornar-los a veure.

# Imprimir

**Imprimeix l'inventari** genera el document «Inventari de béns» a la data triada, i **Descarrega el CSV** us dona la llista per a un full de càlcul. Convé presentar-lo a l'assemblea amb els comptes anuals.`,
      es: `La Ley Orgánica 1/2002 de asociaciones (art. 14) obliga a llevar un **inventario de los bienes**. En [Inventario](/inventari) anotaréis el material que es de la asociación: equipo de sonido, mobiliario, ordenadores, material de talleres, vestuario…

# Añadir un bien

1. Pulsa **+ Nuevo bien**.
2. Rellena la **Descripción**, la **Categoría**, la **Fecha de adquisición** y el **Valor de adquisición (€)**: el precio de compra o, si es una donación o una cesión, una valoración razonable.
3. Indica la **Procedencia** (Compra, Donación o Cesión), la **Ubicación** (dónde está guardado) y el **Estado** (Bueno, Regular o Malo).
4. Si quieres que se amortice, pon la **Vida útil (años)**. Orientativamente: informática 4 años, equipos 5–8, mobiliario 10. Si la dejas vacía, el bien no se amortiza.
5. Opcionalmente, añade una foto. Guarda.

> Consejo: no hace falta inventariar cada bolígrafo. Una práctica habitual es incluir los bienes duraderos de cierto valor y los que debéis poder localizar (por ejemplo, el material comprado con una subvención).

# Amortización

La **amortización** reparte el coste de un bien entre los años que dura. El programa la calcula de forma lineal: un altavoz de 800 € con vida útil de 8 años se amortiza 100 € al año. La tabla muestra la **Amortización del año**, la **Amortización acumulada** y el **Valor neto contable** en la fecha que elijas en **Valor a fecha**.

La amortización es informativa: no crea movimientos en la contabilidad de caja. La compra ya es un gasto en [Contabilidad](/ajuda/comptabilitat) el año en que se paga.

# Donaciones en especie

Si alguien dona un bien, registra la donación en [Donativos](/ajuda/donatius) como donación en especie con su valoración y pulsa **Al inventario**: el bien se añade con procedencia «Donación».

# Bajas

Cuando un bien se vende, se tira, se pierde o se regala, no lo elimines: edítalo, marca **Dado de baja** e indica la **Fecha de baja** y el **Motivo de la baja**. Así queda constancia. Marca **Incluir los bienes dados de baja** para volver a verlos.

# Imprimir

**Imprimir el inventario** genera el documento «Inventario de bienes» en la fecha elegida, y **Descargar el CSV** os da la lista para una hoja de cálculo. Conviene presentarlo a la asamblea con las cuentas anuales.`,
      en: `Spain’s Associations Act (Organic Law 1/2002, art. 14) requires associations to keep an **inventory of their assets**. In [Inventory](/inventari) you record the items the association owns: sound equipment, furniture, computers, workshop materials, costumes…

# Adding an item

1. Press **+ New item**.
2. Fill in the **Description**, **Category**, **Acquisition date** and **Acquisition value (€)**: the purchase price or, for a donation or loan, a reasonable valuation.
3. Set the **Origin** (Purchase, Donation or Loan), the **Location** (where it is kept) and the **Status** (Good, Fair or Poor).
4. If it should be depreciated, enter the **Useful life (years)**. As a guide: IT 4 years, equipment 5–8, furniture 10. Leave it empty and the item is not depreciated.
5. Optionally add a photo. Save.

> Tip: you do not need to list every pen. A common practice is to include durable items of some value and anything you must be able to locate (for example, equipment bought with a grant).

# Depreciation

**Depreciation** spreads an item’s cost over the years it lasts. The program uses straight-line depreciation: an €800 speaker with an 8-year useful life depreciates by €100 a year. The table shows the **Depreciation for the year**, the **Accumulated depreciation** and the **Net book value** at the date you choose in **Value at date**.

Depreciation is for information only: it does not create transactions in the cash accounts. The purchase was already an expense in [Accounts](/ajuda/comptabilitat) in the year it was paid.

# In-kind donations

If someone donates an item, record it in [Donations](/ajuda/donatius) as an in-kind donation with its valuation and press **To inventory**: the item is added with origin “Donation”.

# Disposals

When an item is sold, thrown away, lost or given away, do not delete it: edit it, tick **Disposed of** and enter the **Leaving date** and **Reason for leaving**. That way there is a record. Tick **Include disposed items** to see them again.

# Printing

**Print the inventory** produces the “Inventory of assets” document at the chosen date, and **Download the CSV** gives you the list for a spreadsheet. It is good practice to present it to the general meeting with the annual accounts.`,
    },
  },

  // ───────────────────────────── Informes econòmics
  {
    id: 'informes-economics',
    seccio: 'economia',
    titol: { ca: "Informes econòmics per a l'assemblea", es: 'Informes económicos para la asamblea', en: 'Financial reports for the general meeting' },
    resum: {
      ca: "El compte de resultats i l'estat de tresoreria que el tresorer presenta a l'assemblea general per aprovar els comptes.",
      es: 'La cuenta de resultados y el estado de tesorería que el tesorero presenta a la asamblea general para aprobar las cuentas.',
      en: 'The income statement and cash position the treasurer presents to the general meeting for the accounts to be approved.',
    },
    paraules: ['informe', 'report', 'compte de resultats', 'cuenta de resultados', 'income statement', 'estat de tresoreria', 'estado de tesorería', 'cash position', 'comptes anuals', 'cuentas anuales', 'annual accounts', 'assemblea', 'asamblea', 'general meeting', 'superàvit', 'superávit', 'surplus', 'dèficit', 'déficit', 'deficit', 'resultat', 'resultado', 'result'],
    cos: {
      ca: `Un cop l'any, la junta ha de presentar els comptes a l'assemblea general perquè els aprovi (Llei orgànica 1/2002). El programa genera els documents a partir de la comptabilitat. Els trobaràs a [Informes](/informes), pestanya **Compte de resultats** (les altres pestanyes es descriuen a l'article [Informes](/ajuda/informes)).

# Què hi surt

El document «Compte de resultats i estat de tresoreria» de l'exercici triat té tres parts:

1. **Compte de resultats**: els **Ingressos** i les **Despeses** de l'any agrupats per categoria, amb el **Resultat de l'exercici** (superàvit si és positiu, dèficit si és negatiu). Els traspassos entre comptes no hi compten.
2. **Estat de tresoreria**: per a cada compte, el **Saldo a 1/1**, les **Entrades**, les **Sortides** i el **Saldo a 31/12**. Aquí sí que hi compten els traspassos, perquè mouen diners d'un compte a l'altre.
3. **Resultat per activitat**: quant ha costat i quant ha ingressat cada activitat, si heu lligat els moviments a les activitats.

Al final hi ha espai per a la signatura de la secretaria i el vistiplau de la presidència.

# Com preparar-lo

1. Assegura't que l'any està complet: quotes cobrades, remeses tancades i, sobretot, l'extracte **conciliat** (vegeu [Extractes bancaris i conciliació](/ajuda/extractes-bancaris)). El **Saldo a 31/12** ha de coincidir amb el del banc.
2. Revisa que les despeses estiguin ben classificades. Si una categoria surt estranya, corregeix els moviments a [Comptabilitat](/moviments).
3. Tria l'exercici i prem **Imprimeix / desa en PDF**.
4. Presenta'l a l'assemblea juntament amb el pressupost de l'any següent (vegeu [Pressupost anual](/ajuda/pressupost)) i, si cal, l'[inventari](/ajuda/inventari).

Després de l'aprovació, tanca l'exercici (vegeu [Tancament de l'exercici](/ajuda/tancament-exercici)).

> Consell: és un compte de caixa (ingressos i despeses quan es cobren i paguen), suficient per a la majoria d'associacions petites. Si l'associació està acollida a la Llei 49/2002, rep subvencions grans o ha de presentar comptes anuals en un registre o protectorat amb un format concret (pla de comptabilitat de les entitats sense finalitat lucrativa), consulteu-ho amb la gestoria.`,
      es: `Una vez al año, la junta debe presentar las cuentas a la asamblea general para que las apruebe (Ley Orgánica 1/2002). El programa genera los documentos a partir de la contabilidad. Los encontrarás en [Informes](/informes), pestaña **Cuenta de resultados** (las otras pestañas se describen en el artículo [Informes](/ajuda/informes)).

# Qué contiene

El documento «Cuenta de resultados y estado de tesorería» del ejercicio elegido tiene tres partes:

1. **Cuenta de resultados**: los **Ingresos** y los **Gastos** del año agrupados por categoría, con el **Resultado del ejercicio** (superávit si es positivo, déficit si es negativo). Los traspasos entre cuentas no cuentan.
2. **Estado de tesorería**: para cada cuenta, el **Saldo a 1/1**, las **Entradas**, las **Salidas** y el **Saldo a 31/12**. Aquí sí cuentan los traspasos, porque mueven dinero de una cuenta a otra.
3. **Resultado por actividad**: cuánto ha costado y cuánto ha ingresado cada actividad, si habéis vinculado los movimientos a las actividades.

Al final hay espacio para la firma de la secretaría y el visto bueno de la presidencia.

# Cómo prepararlo

1. Asegúrate de que el año está completo: cuotas cobradas, remesas cerradas y, sobre todo, el extracto **conciliado** (ver [Extractos bancarios y conciliación](/ajuda/extractes-bancaris)). El **Saldo a 31/12** debe coincidir con el del banco.
2. Revisa que los gastos estén bien clasificados. Si una categoría sale extraña, corrige los movimientos en [Contabilidad](/moviments).
3. Elige el ejercicio y pulsa **Imprimir / guardar en PDF**.
4. Preséntalo a la asamblea junto con el presupuesto del año siguiente (ver [Presupuesto anual](/ajuda/pressupost)) y, si procede, el [inventario](/ajuda/inventari).

Después de la aprobación, cierra el ejercicio (ver [Cierre del ejercicio](/ajuda/tancament-exercici)).

> Consejo: es una cuenta de caja (ingresos y gastos cuando se cobran y pagan), suficiente para la mayoría de asociaciones pequeñas. Si la asociación está acogida a la Ley 49/2002, recibe subvenciones grandes o debe presentar cuentas anuales en un registro o protectorado con un formato concreto (plan de contabilidad de las entidades sin fines lucrativos), consultadlo con la gestoría.`,
      en: `Once a year the board must present the accounts to the general meeting for approval (Organic Law 1/2002). The program produces the documents from the accounts. You will find them in [Reports](/informes), **Income statement** tab (the other tabs are described in the [Reports](/ajuda/informes) article).

# What it contains

The “Income statement and cash position” document for the chosen year has three parts:

1. **Income statement**: the year’s **Income** and **Expenses** grouped by category, with the **Result for the year** (a surplus if positive, a deficit if negative). Transfers between accounts are not included.
2. **Cash position**: for each account, the **Balance at 1/1**, money **In**, money **Out** and the **Balance at 31/12**. Here transfers are included, because they move money from one account to another.
3. **Result by activity**: how much each activity cost and brought in, if you linked transactions to activities.

At the end there is space for the secretary’s signature and the president’s approval.

# How to prepare it

1. Make sure the year is complete: fees collected, batches settled and, above all, the statement **reconciled** (see [Bank statements and reconciliation](/ajuda/extractes-bancaris)). The **Balance at 31/12** must match the bank’s.
2. Check that expenses are correctly categorised. If a category looks odd, correct the transactions in [Accounts](/moviments).
3. Choose the year and press **Print / save as PDF**.
4. Present it to the general meeting together with next year’s budget (see [Annual budget](/ajuda/pressupost)) and, if relevant, the [inventory](/ajuda/inventari).

After approval, close the year (see [Year-end closing](/ajuda/tancament-exercici)).

> Tip: this is a cash-basis account (income and expenses when received and paid), which is enough for most small associations. If the association is covered by Law 49/2002, receives large grants or must file annual accounts with a registry in a specific format (the Spanish non-profit accounting plan), check with your accountant.`,
    },
  },

  // ───────────────────────────── Calendari fiscal
  {
    id: 'calendari-fiscal',
    seccio: 'economia',
    titol: { ca: "Calendari fiscal de l'associació", es: 'Calendario fiscal de la asociación', en: 'Association tax calendar' },
    resum: {
      ca: "Els terminis de l'any, mes a mes: models d'Hisenda, assemblea, quotes, subvencions i tancament.",
      es: 'Los plazos del año, mes a mes: modelos de Hacienda, asamblea, cuotas, subvenciones y cierre.',
      en: 'The year’s deadlines, month by month: tax forms, general meeting, fees, grants and closing.',
    },
    paraules: ['calendari', 'calendario', 'calendar', 'terminis', 'plazos', 'deadlines', 'venciment', 'vencimiento', 'due date', 'gener', 'enero', 'january', 'juliol', 'julio', 'july', 'trimestre', 'quarter', 'model 111', 'model 115', 'model 182', 'model 190', 'model 180', 'model 347', 'model 200'],
    cos: {
      ca: `Aquest és el calendari habitual d'una associació que segueix l'any natural. **Només us afecten els models que corresponguin** a la vostra situació: si no heu pagat cap professional amb retenció, per exemple, no heu de presentar el 111. Quan un termini cau en dissabte, diumenge o festiu, es passa al dia hàbil següent.

# Gener

- Fins al **20 de gener** (o el **30** si cal pagar): **models 111 i 115** del quart trimestre.
- Fins al **31 de gener**: **model 190** (resum anual de retencions de professionals i artistes), **model 180** (resum anual de lloguers) i, si l'entitat està acollida a la Llei 49/2002, **model 182** de donatius.
- Lliurar als donants els certificats de l'any anterior (vegeu [Donatius i model 182](/ajuda/donatius)).
- Generar les [quotes](/ajuda/quotes) de l'any i preparar el pressupost.

# Febrer

- Fins a final de febrer: **model 347**, només si l'entitat té activitats econòmiques i operacions de més de 3.005,06 € amb un mateix tercer.

# Primavera: assemblea general

- Assemblea ordinària: aprovació dels comptes de l'any anterior (vegeu [Informes econòmics](/ajuda/informes-economics)) i del pressupost. Després, [tancar l'exercici](/ajuda/tancament-exercici).
- **1–20 d'abril**: **models 111 i 115** del primer trimestre.

# Juliol

- **1–20 de juliol**: **models 111 i 115** del segon trimestre.
- Fins al **25 de juliol**: **model 200** (Impost de Societats), si l'entitat no compleix les condicions d'exempció de l'art. 124.3 LIS o està acollida a la Llei 49/2002 (vegeu [Fiscalitat i model 200](/ajuda/fiscalitat)).

# Octubre

- **1–20 d'octubre**: **models 111 i 115** del tercer trimestre.

# Durant tot l'any

- Cada mes: importar l'extracte i conciliar.
- Subvencions: vigileu la **Data de justificació** de cadascuna a [Subvencions](/subvencions); el termini el fixa cada convocatòria.
- A partir de 2027: si emeteu factures, el sistema Verifactu (vegeu [Facturació](/ajuda/facturacio)).

> Compte: aquest calendari és orientatiu i les dates poden canviar. Comproveu-les cada any al calendari del contribuent de l'Agència Tributària o consulteu-ho amb la gestoria.`,
      es: `Este es el calendario habitual de una asociación que sigue el año natural. **Solo os afectan los modelos que correspondan** a vuestra situación: si no habéis pagado a ningún profesional con retención, por ejemplo, no tenéis que presentar el 111. Cuando un plazo cae en sábado, domingo o festivo, pasa al día hábil siguiente.

# Enero

- Hasta el **20 de enero** (o el **30** si hay que pagar): **modelos 111 y 115** del cuarto trimestre.
- Hasta el **31 de enero**: **modelo 190** (resumen anual de retenciones de profesionales y artistas), **modelo 180** (resumen anual de alquileres) y, si la entidad está acogida a la Ley 49/2002, **modelo 182** de donativos.
- Entregar a los donantes los certificados del año anterior (ver [Donativos y modelo 182](/ajuda/donatius)).
- Generar las [cuotas](/ajuda/quotes) del año y preparar el presupuesto.

# Febrero

- Hasta final de febrero: **modelo 347**, solo si la entidad tiene actividades económicas y operaciones de más de 3.005,06 € con un mismo tercero.

# Primavera: asamblea general

- Asamblea ordinaria: aprobación de las cuentas del año anterior (ver [Informes económicos](/ajuda/informes-economics)) y del presupuesto. Después, [cerrar el ejercicio](/ajuda/tancament-exercici).
- **1–20 de abril**: **modelos 111 y 115** del primer trimestre.

# Julio

- **1–20 de julio**: **modelos 111 y 115** del segundo trimestre.
- Hasta el **25 de julio**: **modelo 200** (Impuesto sobre Sociedades), si la entidad no cumple las condiciones de exención del art. 124.3 LIS o está acogida a la Ley 49/2002 (ver [Fiscalidad y modelo 200](/ajuda/fiscalitat)).

# Octubre

- **1–20 de octubre**: **modelos 111 y 115** del tercer trimestre.

# Durante todo el año

- Cada mes: importar el extracto y conciliar.
- Subvenciones: vigilad la **Fecha de justificación** de cada una en [Subvenciones](/subvencions); el plazo lo fija cada convocatoria.
- A partir de 2027: si emitís facturas, el sistema Verifactu (ver [Facturación](/ajuda/facturacio)).

> Atención: este calendario es orientativo y las fechas pueden cambiar. Comprobadlas cada año en el calendario del contribuyente de la Agencia Tributaria o consultadlo con la gestoría.`,
      en: `This is the usual calendar for an association whose financial year is the calendar year. **Only the forms that match your situation apply**: if you have not paid any professional with tax withheld, for example, you do not file form 111. When a deadline falls on a Saturday, Sunday or public holiday, it moves to the next working day.

# January

- By **20 January** (or **30 January** if there is tax to pay): **forms 111 and 115** for the fourth quarter.
- By **31 January**: **form 190** (annual summary of withholdings on professionals and artists), **form 180** (annual summary of rent) and, if the organisation is covered by Law 49/2002, **form 182** for donations.
- Give donors their certificates for the previous year (see [Donations and form 182](/ajuda/donatius)).
- Generate the year’s [fees](/ajuda/quotes) and prepare the budget.

# February

- By the end of February: **form 347**, only if the organisation has economic activities and transactions over €3,005.06 with the same third party.

# Spring: general meeting

- Ordinary general meeting: approval of the previous year’s accounts (see [Financial reports](/ajuda/informes-economics)) and of the budget. Afterwards, [close the year](/ajuda/tancament-exercici).
- **1–20 April**: **forms 111 and 115** for the first quarter.

# July

- **1–20 July**: **forms 111 and 115** for the second quarter.
- By **25 July**: **form 200** (corporate income tax), if the organisation does not meet the exemption conditions of art. 124.3 LIS or is covered by Law 49/2002 (see [Tax and form 200](/ajuda/fiscalitat)).

# October

- **1–20 October**: **forms 111 and 115** for the third quarter.

# All year round

- Every month: import the statement and reconcile.
- Grants: keep an eye on each grant’s **Justification date** in [Grants](/subvencions); each call sets its own deadline.
- From 2027: if you issue invoices, the Verifactu system (see [Invoicing](/ajuda/facturacio)).

> Warning: this calendar is a guide and dates may change. Check them each year in the tax agency’s taxpayer calendar or with your accountant.`,
    },
  },
];

export const PREGUNTES: Pregunta[] = [
  {
    pregunta: { ca: 'He d’emetre factura per les quotes dels socis?', es: '¿Tengo que emitir factura por las cuotas de los socios?', en: 'Do I have to issue an invoice for membership fees?' },
    resposta: {
      ca: 'Normalment no. Les quotes ordinàries que paguen els socis per formar part de l’associació estan exemptes d’IVA i n’hi ha prou amb un **rebut**, que pots imprimir des de [Quotes](/quotes). La factura és per quan veneu un servei a algú. Si en teniu dubtes, consulteu-ho amb la gestoria.',
      es: 'Normalmente no. Las cuotas ordinarias que pagan los socios por formar parte de la asociación están exentas de IVA y basta con un **recibo**, que puedes imprimir desde [Cuotas](/quotes). La factura es para cuando vendéis un servicio a alguien. Si tenéis dudas, consultadlo con la gestoría.',
      en: 'Usually not. Ordinary fees members pay to belong to the association are VAT-exempt and a **receipt** is enough; you can print it from [Fees](/quotes). Invoices are for when you sell a service to someone. If in doubt, check with your accountant.',
    },
    article: 'facturacio',
  },
  {
    pregunta: { ca: 'Hem de presentar el model 200 (Impost de Societats)?', es: '¿Tenemos que presentar el modelo 200 (Impuesto sobre Sociedades)?', en: 'Do we have to file form 200 (corporate income tax)?' },
    resposta: {
      ca: 'Depèn. Una associació parcialment exempta no l’ha de presentar si té ingressos totals de fins a 75.000 €, rendes no exemptes de fins a 2.000 € i totes amb retenció. La pestanya **Fiscalitat** de [Tresoreria](/tresoreria) ho comprova amb les vostres xifres. Si esteu acollits a la Llei 49/2002, sí que l’heu de presentar.',
      es: 'Depende. Una asociación parcialmente exenta no tiene que presentarlo si tiene ingresos totales de hasta 75.000 €, rentas no exentas de hasta 2.000 € y todas con retención. La pestaña **Fiscalidad** de [Tesorería](/tresoreria) lo comprueba con vuestras cifras. Si estáis acogidos a la Ley 49/2002, sí tenéis que presentarlo.',
      en: 'It depends. A partially exempt association does not have to file it if total income is up to €75,000, non-exempt income up to €2,000 and all of it subject to withholding. The **Tax** tab in [Treasury](/tresoreria) checks this with your figures. If you are covered by Law 49/2002, you must file it.',
    },
    article: 'fiscalitat',
  },
  {
    pregunta: { ca: 'Com corregeixo un moviment d’un exercici tancat?', es: '¿Cómo corrijo un movimiento de un ejercicio cerrado?', en: 'How do I correct a transaction in a closed year?' },
    resposta: {
      ca: 'Els moviments d’un any tancat no es poden canviar. El més net és apuntar un moviment de regularització a l’any obert. Si de debò cal tocar l’any tancat, un usuari administrador el pot reobrir a **Tresoreria › Tancament**, indicant-ne el motiu, i tornar-lo a tancar després.',
      es: 'Los movimientos de un año cerrado no se pueden cambiar. Lo más limpio es apuntar un movimiento de regularización en el año abierto. Si de verdad hay que tocar el año cerrado, un usuario administrador puede reabrirlo en **Tesorería › Cierre**, indicando el motivo, y volver a cerrarlo después.',
      en: 'Transactions in a closed year cannot be changed. The cleanest way is to record an adjusting transaction in the open year. If the closed year really must change, an administrator can reopen it in **Treasury › Year-end closing**, giving a reason, and close it again afterwards.',
    },
    article: 'tancament-exercici',
  },
  {
    pregunta: { ca: 'El banc ens ha retornat un rebut domiciliat. Què faig?', es: 'El banco nos ha devuelto un recibo domiciliado. ¿Qué hago?', en: 'The bank has returned a direct debit. What do I do?' },
    resposta: {
      ca: 'Obre la remesa a **Tresoreria › Domiciliacions**, prem **Devolució** a la línia del soci i indica la data, el motiu i la comissió del banc. La quota torna a pendent i es registra la despesa. Parla amb el soci: podeu tornar-la a incloure en una remesa (sortirà com a FRST) o cobrar-la per un altre mitjà.',
      es: 'Abre la remesa en **Tesorería › Domiciliaciones**, pulsa **Devolución** en la línea del socio e indica la fecha, el motivo y la comisión del banco. La cuota vuelve a pendiente y se registra el gasto. Habla con el socio: podéis volver a incluirla en una remesa (saldrá como FRST) o cobrarla por otro medio.',
      en: 'Open the batch in **Treasury › Direct debits**, press **Return** on the member’s line and enter the date, reason and bank fee. The fee goes back to pending and the expense is recorded. Talk to the member: you can include it in a new batch (it will go as FRST) or collect it another way.',
    },
    article: 'domiciliacions-sepa',
  },
  {
    pregunta: { ca: 'Podem fer certificats de donació perquè els donants desgravin?', es: '¿Podemos hacer certificados de donación para que los donantes desgraven?', en: 'Can we issue donation certificates so donors get a tax deduction?' },
    resposta: {
      ca: 'Només si l’associació està acollida al règim de la Llei 49/2002 (per exemple, declarada d’utilitat pública i amb l’opció comunicada a Hisenda). Si no, podeu lliurar un rebut, que acredita la donació però no dona dret a deducció. El règim es tria a **Donatius › Configuració**.',
      es: 'Solo si la asociación está acogida al régimen de la Ley 49/2002 (por ejemplo, declarada de utilidad pública y con la opción comunicada a Hacienda). Si no, podéis entregar un recibo, que acredita la donación pero no da derecho a deducción. El régimen se elige en **Donativos › Configuración**.',
      en: 'Only if the association is covered by the Law 49/2002 regime (for example, declared of public utility and having notified the tax agency). Otherwise you can give a receipt, which proves the donation but gives no deduction. The regime is set in **Donations › Settings**.',
    },
    article: 'donatius',
  },
  {
    pregunta: { ca: 'Hem pagat un músic que factura amb retenció. Com ho apunto?', es: 'Hemos pagado a un músico que factura con retención. ¿Cómo lo apunto?', en: 'We paid a musician whose invoice has tax withheld. How do I record it?' },
    resposta: {
      ca: 'A comptabilitat apunta la despesa pel que realment pagueu (el net). Després, a **Tresoreria › Tercers i retencions › Pagaments i retencions**, obre el pagament, tria el músic com a tercer i indica la retenció (normalment 15 %). Sortirà al model 111 del trimestre i al 190 de l’any.',
      es: 'En contabilidad apunta el gasto por lo que realmente pagáis (el neto). Después, en **Tesorería › Terceros y retenciones › Pagos y retenciones**, abre el pago, elige al músico como tercero e indica la retención (normalmente 15 %). Saldrá en el modelo 111 del trimestre y en el 190 del año.',
      en: 'In the accounts, record the expense for what you actually pay (the net amount). Then in **Treasury › Third parties and withholdings › Payments and withholdings**, open the payment, choose the musician as third party and set the withholding (usually 15%). It will appear in that quarter’s form 111 and the year’s form 190.',
    },
    article: 'tercers-retencions',
  },
  {
    pregunta: { ca: 'M’he equivocat en una factura emesa. La puc esborrar?', es: 'Me he equivocado en una factura emitida. ¿La puedo borrar?', en: 'I made a mistake on an issued invoice. Can I delete it?' },
    resposta: {
      ca: 'No. Una factura emesa no es pot modificar ni esborrar: cal fer una **factura rectificativa** amb el botó **Fes una rectificativa**. Només si la factura es va fer per error i no correspon a cap operació real la podeu **anul·lar**.',
      es: 'No. Una factura emitida no se puede modificar ni borrar: hay que hacer una **factura rectificativa** con el botón **Hacer una rectificativa**. Solo si la factura se hizo por error y no corresponde a ninguna operación real la podéis **anular**.',
      en: 'No. An issued invoice cannot be changed or deleted: you must issue a **corrective invoice** with the **Issue a corrective invoice** button. Only if the invoice was made in error and matches no real transaction can you **cancel** it.',
    },
    article: 'facturacio',
  },
  {
    pregunta: { ca: 'El saldo del programa no coincideix amb el del banc. Per què?', es: 'El saldo del programa no coincide con el del banco. ¿Por qué?', en: 'The balance in the program does not match the bank. Why?' },
    resposta: {
      ca: 'Normalment falta algun moviment (comissions, interessos, un rebut retornat) o n’hi ha un de duplicat. Importa l’extracte a **Tresoreria › Extractes bancaris** i concilia les línies pendents: el programa et proposa els moviments que hi coincideixen i et deixa crear els que falten.',
      es: 'Normalmente falta algún movimiento (comisiones, intereses, un recibo devuelto) o hay uno duplicado. Importa el extracto en **Tesorería › Extractos bancarios** y concilia las líneas pendientes: el programa te propone los movimientos que coinciden y te deja crear los que faltan.',
      en: 'Usually a transaction is missing (bank fees, interest, a returned debit) or one is duplicated. Import the statement in **Treasury › Bank statements** and reconcile the pending lines: the program suggests matching transactions and lets you create the missing ones.',
    },
    article: 'extractes-bancaris',
  },
  {
    pregunta: { ca: 'Quines despeses puc imputar a una subvenció?', es: '¿Qué gastos puedo imputar a una subvención?', en: 'Which expenses can I allocate to a grant?' },
    resposta: {
      ca: 'Les que diguin les bases de la convocatòria: en general, despeses de l’activitat subvencionada, fetes dins el període d’execució i pagades abans de justificar. A [Subvencions](/subvencions), pestanya **Despeses imputades**, pots imputar-ne tota o una part. Adjunta sempre la factura.',
      es: 'Las que digan las bases de la convocatoria: en general, gastos de la actividad subvencionada, realizados dentro del periodo de ejecución y pagados antes de justificar. En [Subvenciones](/subvencions), pestaña **Gastos imputados**, puedes imputar todo o una parte. Adjunta siempre la factura.',
      en: 'Whatever the call’s rules allow: generally, expenses of the funded activity, incurred within the execution period and paid before justifying. In [Grants](/subvencions), **Allocated expenses** tab, you can allocate all or part of each expense. Always attach the invoice.',
    },
    article: 'subvencions',
  },
  {
    pregunta: { ca: 'Un soci no ha de pagar quota aquest any. Com ho indico?', es: 'Un socio no tiene que pagar cuota este año. ¿Cómo lo indico?', en: 'A member does not have to pay a fee this year. How do I show that?' },
    resposta: {
      ca: 'A [Quotes](/quotes), prem **Edita** a la seva quota i canvia l’estat a **Exempta**. Si ha de ser així cada any, assigna-li a la fitxa un tipus de quota d’import zero: les quotes noves ja sortiran exemptes.',
      es: 'En [Cuotas](/quotes), pulsa **Editar** en su cuota y cambia el estado a **Exenta**. Si debe ser así cada año, asígnale en la ficha un tipo de cuota de importe cero: las cuotas nuevas ya saldrán exentas.',
      en: 'In [Fees](/quotes), press **Edit** on their fee and change the status to **Exempt**. If it should be like this every year, give them a zero-amount fee type on their record: new fees will be created as exempt.',
    },
    article: 'quotes',
  },
];

export const GLOSSARI: Terme[] = [
  {
    terme: { ca: 'Exempt d’IVA', es: 'Exento de IVA', en: 'VAT-exempt' },
    definicio: {
      ca: 'Operació que la Llei de l’IVA (art. 20) deixa sense impost, com els serveis d’entitats sense finalitat lucrativa als seus socis o certs serveis culturals. La factura, si n’hi ha, ha d’indicar el motiu legal.',
      es: 'Operación que la Ley del IVA (art. 20) deja sin impuesto, como los servicios de entidades sin ánimo de lucro a sus socios o ciertos servicios culturales. La factura, si la hay, debe indicar el motivo legal.',
      en: 'A transaction the VAT Act (art. 20) leaves untaxed, such as services by non-profits to their members or certain cultural services. Any invoice must state the legal reason.',
    },
  },
  {
    terme: { ca: 'Entitat parcialment exempta', es: 'Entidad parcialmente exenta', en: 'Partially exempt entity' },
    definicio: {
      ca: 'Règim de l’Impost de Societats (art. 9.3 LIS) per a associacions no acollides a la Llei 49/2002: les quotes, subvencions i donatius són exempts; les activitats econòmiques i el patrimoni tributen.',
      es: 'Régimen del Impuesto sobre Sociedades (art. 9.3 LIS) para asociaciones no acogidas a la Ley 49/2002: las cuotas, subvenciones y donativos están exentos; las actividades económicas y el patrimonio tributan.',
      en: 'Corporate income tax regime (art. 9.3 LIS) for associations not covered by Law 49/2002: fees, grants and donations are exempt; economic activities and asset income are taxed.',
    },
  },
  {
    terme: { ca: 'Model 200', es: 'Modelo 200', en: 'Form 200' },
    definicio: {
      ca: 'Declaració anual de l’Impost de Societats. Una entitat parcialment exempta se n’estalvia si no supera 75.000 € d’ingressos ni 2.000 € de rendes no exemptes, totes amb retenció (art. 124.3 LIS). Termini habitual: 25 de juliol.',
      es: 'Declaración anual del Impuesto sobre Sociedades. Una entidad parcialmente exenta se libra si no supera 75.000 € de ingresos ni 2.000 € de rentas no exentas, todas con retención (art. 124.3 LIS). Plazo habitual: 25 de julio.',
      en: 'Annual corporate income tax return. A partially exempt entity is excused if it has no more than €75,000 income and €2,000 non-exempt income, all subject to withholding (art. 124.3 LIS). Usual deadline: 25 July.',
    },
  },
  {
    terme: { ca: 'Retenció d’IRPF', es: 'Retención de IRPF', en: 'Income tax withholding (IRPF)' },
    definicio: {
      ca: 'Part del pagament a un professional, artista o arrendador que l’associació es queda i ingressa a Hisenda en nom seu: habitualment el 15 % (7 % els primers anys) o el 19 % en lloguers.',
      es: 'Parte del pago a un profesional, artista o arrendador que la asociación retiene e ingresa en Hacienda en su nombre: habitualmente el 15 % (7 % los primeros años) o el 19 % en alquileres.',
      en: 'Part of a payment to a professional, artist or landlord that the association keeps and pays to the tax agency on their behalf: usually 15% (7% in the first years) or 19% for rent.',
    },
  },
  {
    terme: { ca: 'Models 111 i 190', es: 'Modelos 111 y 190', en: 'Forms 111 and 190' },
    definicio: {
      ca: 'El 111 és la declaració trimestral de les retencions a professionals i artistes; el 190 n’és el resum anual, amb cada perceptor, que es presenta al gener.',
      es: 'El 111 es la declaración trimestral de las retenciones a profesionales y artistas; el 190 es su resumen anual, con cada perceptor, que se presenta en enero.',
      en: 'Form 111 is the quarterly return for withholdings on professionals and artists; form 190 is its annual summary listing each recipient, filed in January.',
    },
  },
  {
    terme: { ca: 'Models 115 i 180', es: 'Modelos 115 y 180', en: 'Forms 115 and 180' },
    definicio: {
      ca: 'El 115 és la declaració trimestral de les retencions sobre lloguers de locals; el 180 n’és el resum anual, al gener.',
      es: 'El 115 es la declaración trimestral de las retenciones sobre alquileres de locales; el 180 es su resumen anual, en enero.',
      en: 'Form 115 is the quarterly return for withholdings on rent of premises; form 180 is its annual summary, filed in January.',
    },
  },
  {
    terme: { ca: 'Model 347', es: 'Modelo 347', en: 'Form 347' },
    definicio: {
      ca: 'Declaració anual d’operacions amb tercers que superen 3.005,06 € en un any. Afecta les entitats que fan activitats econòmiques. Es presenta al febrer.',
      es: 'Declaración anual de operaciones con terceros que superan 3.005,06 € en un año. Afecta a las entidades que realizan actividades económicas. Se presenta en febrero.',
      en: 'Annual return of transactions with third parties exceeding €3,005.06 in a year. It affects entities with economic activities. Filed in February.',
    },
  },
  {
    terme: { ca: 'Model 182', es: 'Modelo 182', en: 'Form 182' },
    definicio: {
      ca: 'Declaració informativa anual de donatius que presenten les entitats acollides a la Llei 49/2002, amb el NIF de cada donant. Termini: 31 de gener.',
      es: 'Declaración informativa anual de donativos que presentan las entidades acogidas a la Ley 49/2002, con el NIF de cada donante. Plazo: 31 de enero.',
      en: 'Annual information return on donations filed by entities covered by Law 49/2002, with each donor’s tax ID. Deadline: 31 January.',
    },
  },
  {
    terme: { ca: 'Llei 49/2002', es: 'Ley 49/2002', en: 'Law 49/2002' },
    definicio: {
      ca: 'Llei de règim fiscal de les entitats sense finalitat lucrativa i del mecenatge. Les entitats que hi opten (p. ex., d’utilitat pública) poden emetre certificats amb deducció; la reforma de 2024 va apujar les deduccions.',
      es: 'Ley de régimen fiscal de las entidades sin fines lucrativos y del mecenazgo. Las entidades que optan por ella (p. ej., de utilidad pública) pueden emitir certificados con deducción; la reforma de 2024 subió las deducciones.',
      en: 'Spanish law on the tax regime of non-profits and patronage. Entities that opt in (e.g. of public utility) can issue certificates with tax deductions; the 2024 reform increased the deductions.',
    },
  },
  {
    terme: { ca: 'Recurrència (donatius)', es: 'Recurrencia (donativos)', en: 'Recurrence (donations)' },
    definicio: {
      ca: 'Un donant és recurrent si ha donat a la mateixa entitat els dos anys anteriors un import igual o superior cada any. Té una deducció més alta (45 % o 50 %).',
      es: 'Un donante es recurrente si ha donado a la misma entidad los dos años anteriores un importe igual o superior cada año. Tiene una deducción más alta (45 % o 50 %).',
      en: 'A donor is recurring if they gave to the same organisation in the two previous years, each year at least as much as before. They get a higher deduction (45% or 50%).',
    },
  },
  {
    terme: { ca: 'Mandat SEPA', es: 'Mandato SEPA', en: 'SEPA mandate' },
    definicio: {
      ca: 'Autorització signada pel soci perquè l’associació li carregui les quotes al compte. Té una referència única i una data de signatura; cal conservar-la.',
      es: 'Autorización firmada por el socio para que la asociación le cargue las cuotas en la cuenta. Tiene una referencia única y una fecha de firma; hay que conservarla.',
      en: 'Authorisation signed by a member allowing the association to debit fees from their account. It has a unique reference and a signature date; it must be kept.',
    },
  },
  {
    terme: { ca: 'Remesa', es: 'Remesa', en: 'Direct debit batch' },
    definicio: {
      ca: 'Conjunt de rebuts domiciliats que s’envien junts al banc en un fitxer XML SEPA (pain.008) perquè els carregui en una data.',
      es: 'Conjunto de recibos domiciliados que se envían juntos al banco en un fichero XML SEPA (pain.008) para que los cargue en una fecha.',
      en: 'A set of direct debits sent together to the bank in a SEPA XML file (pain.008) to be collected on a given date.',
    },
  },
  {
    terme: { ca: 'Identificador de creditor SEPA', es: 'Identificador de acreedor SEPA', en: 'SEPA creditor identifier' },
    definicio: {
      ca: 'Codi que identifica l’associació com a emissora de rebuts domiciliats (a Espanya, ES + dígits de control + sufix + NIF). L’activa el banc.',
      es: 'Código que identifica a la asociación como emisora de recibos domiciliados (en España, ES + dígitos de control + sufijo + NIF). Lo activa el banco.',
      en: 'Code identifying the association as a direct debit creditor (in Spain, ES + check digits + suffix + tax ID). It is activated by the bank.',
    },
  },
  {
    terme: { ca: 'Conciliació bancària', es: 'Conciliación bancaria', en: 'Bank reconciliation' },
    definicio: {
      ca: 'Comprovació, línia per línia, que els moviments de l’extracte del banc coincideixen amb els de la comptabilitat i que els saldos quadren.',
      es: 'Comprobación, línea a línea, de que los movimientos del extracto del banco coinciden con los de la contabilidad y de que los saldos cuadran.',
      en: 'Checking, line by line, that the bank statement’s transactions match those in the accounts and that the balances agree.',
    },
  },
  {
    terme: { ca: 'Norma 43', es: 'Norma 43', en: 'Norma 43' },
    definicio: {
      ca: 'Format estàndard dels bancs espanyols per descarregar extractes (també «Cuaderno 43» o «AEB 43»). Inclou saldos, cosa que permet comprovar que el fitxer és complet.',
      es: 'Formato estándar de los bancos españoles para descargar extractos (también «Cuaderno 43» o «AEB 43»). Incluye saldos, lo que permite comprobar que el fichero está completo.',
      en: 'Standard Spanish bank format for downloading statements (also “Cuaderno 43” or “AEB 43”). It includes balances, so you can check the file is complete.',
    },
  },
  {
    terme: { ca: 'Compte justificatiu', es: 'Cuenta justificativa', en: 'Justification account' },
    definicio: {
      ca: 'Document amb què l’entitat demostra a l’organisme que ha fet l’activitat subvencionada i com ha gastat els diners. La versió simplificada (art. 75 RD 887/2006) inclou memòria, relació de despeses i desviacions.',
      es: 'Documento con el que la entidad demuestra al organismo que ha realizado la actividad subvencionada y cómo ha gastado el dinero. La versión simplificada (art. 75 RD 887/2006) incluye memoria, relación de gastos y desviaciones.',
      en: 'Document showing the funding body that the grant-funded activity was carried out and how the money was spent. The simplified version (art. 75 RD 887/2006) includes a report, list of expenses and deviations.',
    },
  },
  {
    terme: { ca: 'Imputació (subvencions)', es: 'Imputación (subvenciones)', en: 'Allocation (grants)' },
    definicio: {
      ca: 'Assignar una despesa, o una part, a una subvenció concreta perquè compti en la seva justificació. Una despesa no es pot imputar per sobre del seu import.',
      es: 'Asignar un gasto, o una parte, a una subvención concreta para que cuente en su justificación. Un gasto no se puede imputar por encima de su importe.',
      en: 'Assigning an expense, or part of it, to a specific grant so it counts in its justification. An expense cannot be allocated beyond its amount.',
    },
  },
  {
    terme: { ca: 'VERI*FACTU', es: 'VERI*FACTU', en: 'VERI*FACTU' },
    definicio: {
      ca: 'Sistema de l’AEAT (RD 1007/2023) pel qual el programa de facturació genera registres encadenats i inalterables de cada factura, amb un QR, i els envia a Hisenda. Previst com a obligatori a partir de 2027.',
      es: 'Sistema de la AEAT (RD 1007/2023) por el que el programa de facturación genera registros encadenados e inalterables de cada factura, con un QR, y los envía a Hacienda. Previsto como obligatorio a partir de 2027.',
      en: 'Spanish tax agency system (RD 1007/2023) under which invoicing software creates chained, tamper-proof records of each invoice, with a QR code, and sends them to the agency. Planned to be mandatory from 2027.',
    },
  },
  {
    terme: { ca: 'Factura rectificativa', es: 'Factura rectificativa', en: 'Corrective invoice' },
    definicio: {
      ca: 'Factura que corregeix una d’emesa abans (import, dades, devolució). Va en una sèrie pròpia i fa referència a la factura original, que no es pot esborrar.',
      es: 'Factura que corrige otra emitida antes (importe, datos, devolución). Va en una serie propia y hace referencia a la factura original, que no se puede borrar.',
      en: 'An invoice correcting one issued earlier (amount, details, refund). It goes in its own series and refers to the original invoice, which cannot be deleted.',
    },
  },
  {
    terme: { ca: 'Amortització', es: 'Amortización', en: 'Depreciation' },
    definicio: {
      ca: 'Repartiment del cost d’un bé durador entre els anys de vida útil. El programa la calcula de manera lineal a l’inventari, només com a informació.',
      es: 'Reparto del coste de un bien duradero entre los años de vida útil. El programa la calcula de forma lineal en el inventario, solo como información.',
      en: 'Spreading the cost of a durable item over its useful life. The program calculates it on a straight-line basis in the inventory, for information only.',
    },
  },
];
