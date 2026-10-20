// Missatges del servidor del mòdul «tresoreria»: català → castellà / anglès.
export const es: Record<string, string> = {
  "Exercici tancat: no es poden afegir, modificar ni eliminar moviments d'un exercici tancat. Cal reobrir-lo primer.":
    'Ejercicio cerrado: no se pueden añadir, modificar ni eliminar movimientos de un ejercicio cerrado. Hay que reabrirlo primero.',
  "L'exercici {0} està tancat: no es poden afegir, modificar ni eliminar els seus moviments.":
    'El ejercicio {0} está cerrado: no se pueden añadir, modificar ni eliminar sus movimientos.',
  "Cal configurar un identificador de creditor SEPA vàlid (o el NIF de l'entitat).":
    'Hay que configurar un identificador de acreedor SEPA válido (o el NIF de la entidad).',
  "Cal indicar el nom de l'entitat a Configuració.": 'Hay que indicar el nombre de la entidad en Configuración.',
  "Cal triar el compte bancari de l'entitat i indicar-ne un IBAN vàlid.": 'Hay que elegir la cuenta bancaria de la entidad e indicar un IBAN válido.',
  "L'IBAN no és vàlid.": 'El IBAN no es válido.',
  "L'identificador de creditor no és vàlid (format ESxxZZZ + NIF, amb dígits de control).":
    'El identificador de acreedor no es válido (formato ESxxZZZ + NIF, con dígitos de control).',
  'Només es poden tancar exercicis acabats.': 'Solo se pueden cerrar ejercicios terminados.',
  'Cal triar almenys una quota.': 'Hay que elegir al menos una cuota.',
  'Compte inexistent.': 'Cuenta inexistente.',
  'El BIC no és vàlid (8 o 11 caràcters).': 'El BIC no es válido (8 u 11 caracteres).',
  'El pressupost és buit.': 'El presupuesto está vacío.',
  'Forma de pagament no vàlida.': 'Forma de pago no válida.',
  'La data de cobrament ha de ser posterior a avui.': 'La fecha de cobro debe ser posterior a hoy.',
  'La data de signatura no pot ser futura.': 'La fecha de firma no puede ser futura.',
  'La referència del mandat només pot tenir lletres sense accents, xifres i els signes - . / (màxim 35).':
    'La referencia del mandato solo puede tener letras sin acentos, cifras y los signos - . / (máximo 35).',
  'Per domiciliar cal la referència i la data de signatura del mandat.': 'Para domiciliar hace falta la referencia y la fecha de firma del mandato.',
  "Només l'administració pot reobrir un exercici tancat.": 'Solo la administración puede reabrir un ejercicio cerrado.',
  "Alguna quota de la remesa ja no està pendent (s'ha cobrat o eliminat). Elimina la remesa i genera'n una de nova.":
    'Alguna cuota de la remesa ya no está pendiente (se ha cobrado o eliminado). Elimina la remesa y genera una nueva.',
  "Aquest moviment és l'abonament d'una remesa de rebuts: no es pot eliminar. Registra les devolucions des de Tresoreria.":
    'Este movimiento es el abono de una remesa de recibos: no se puede eliminar. Registra las devoluciones desde Tesorería.',
  "Aquesta quota es va cobrar dins d'una remesa: si el banc l'ha retornada, registra'n la devolució a Tresoreria.":
    'Esta cuota se cobró dentro de una remesa: si el banco la ha devuelto, registra la devolución en Tesorería.',
  "El pressupost d'aquest exercici ja està aprovat: desfés l'aprovació per modificar-lo.":
    'El presupuesto de este ejercicio ya está aprobado: deshaz la aprobación para modificarlo.',
  "Hi ha remeses de l'exercici pendents de marcar com a cobrades.": 'Hay remesas del ejercicio pendientes de marcar como cobradas.',
  'Aquest exercici ja està tancat.': 'Este ejercicio ya está cerrado.',
  'Aquest rebut ja està retornat.': 'Este recibo ya está devuelto.',
  'Aquesta quota és en una remesa pendent de cobrar: elimina primer la remesa.': 'Esta cuota está en una remesa pendiente de cobro: elimina primero la remesa.',
  'Aquesta remesa ja està cobrada.': 'Esta remesa ya está cobrada.',
  'Només es poden retornar rebuts de remeses cobrades.': 'Solo se pueden devolver recibos de remesas cobradas.',
  'Una remesa cobrada no es pot eliminar.': 'Una remesa cobrada no se puede eliminar.',
  'La quota del soci núm. {0} ja està cobrada.': 'La cuota del socio n.º {0} ya está cobrada.',
  'La quota del soci núm. {0} és en una remesa pendent de cobrar.': 'La cuota del socio n.º {0} está en una remesa pendiente de cobro.',
  'Soci núm. {0}: {1}': 'Socio n.º {0}: {1}',
  'La quota no està pendent.': 'La cuota no está pendiente.',
  'El soci no paga per domiciliació.': 'El socio no paga por domiciliación.',
  'Sense mandat SEPA actiu.': 'Sin mandato SEPA activo.',
  'IBAN absent o no vàlid.': 'IBAN ausente o no válido.',
  'Ja és en una remesa pendent de cobrar.': 'Ya está en una remesa pendiente de cobro.',
  'La remesa no té cap operació.': 'La remesa no tiene ninguna operación.',
  "L'any anterior no té moviments.": 'El año anterior no tiene movimientos.',
  "L'any anterior no té pressupost.": 'El año anterior no tiene presupuesto.',
  // Noms de camps
  'Comissió': 'Comisión',
  "Data d'abonament": 'Fecha de abono',
  "Data d'aprovació": 'Fecha de aprobación',
  'Data de devolució': 'Fecha de devolución',
  'Data de cobrament': 'Fecha de cobro',
  'Data de signatura': 'Fecha de firma',
  'Motiu': 'Motivo',
};

export const en: Record<string, string> = {
  "Exercici tancat: no es poden afegir, modificar ni eliminar moviments d'un exercici tancat. Cal reobrir-lo primer.":
    'Closed financial year: transactions of a closed year cannot be added, changed or deleted. Reopen it first.',
  "L'exercici {0} està tancat: no es poden afegir, modificar ni eliminar els seus moviments.":
    'The {0} financial year is closed: its transactions cannot be added, changed or deleted.',
  "Cal configurar un identificador de creditor SEPA vàlid (o el NIF de l'entitat).":
    "A valid SEPA creditor identifier (or the organisation's tax ID) must be set up.",
  "Cal indicar el nom de l'entitat a Configuració.": "The organisation's name must be entered in Settings.",
  "Cal triar el compte bancari de l'entitat i indicar-ne un IBAN vàlid.": "Choose the organisation's bank account and enter a valid IBAN.",
  "L'IBAN no és vàlid.": 'The IBAN is not valid.',
  "L'identificador de creditor no és vàlid (format ESxxZZZ + NIF, amb dígits de control).":
    'The creditor identifier is not valid (format ESxxZZZ + tax ID, with check digits).',
  'Només es poden tancar exercicis acabats.': 'Only finished financial years can be closed.',
  'Cal triar almenys una quota.': 'Choose at least one fee.',
  'Compte inexistent.': 'Account does not exist.',
  'El BIC no és vàlid (8 o 11 caràcters).': 'The BIC is not valid (8 or 11 characters).',
  'El pressupost és buit.': 'The budget is empty.',
  'Forma de pagament no vàlida.': 'Invalid payment method.',
  'La data de cobrament ha de ser posterior a avui.': 'The collection date must be later than today.',
  'La data de signatura no pot ser futura.': 'The signature date cannot be in the future.',
  'La referència del mandat només pot tenir lletres sense accents, xifres i els signes - . / (màxim 35).':
    'The mandate reference may only contain unaccented letters, digits and the signs - . / (35 max).',
  'Per domiciliar cal la referència i la data de signatura del mandat.': 'Direct debit requires the mandate reference and signature date.',
  "Només l'administració pot reobrir un exercici tancat.": 'Only administrators can reopen a closed financial year.',
  "Alguna quota de la remesa ja no està pendent (s'ha cobrat o eliminat). Elimina la remesa i genera'n una de nova.":
    'Some fee in the batch is no longer pending (it was collected or deleted). Delete the batch and create a new one.',
  "Aquest moviment és l'abonament d'una remesa de rebuts: no es pot eliminar. Registra les devolucions des de Tresoreria.":
    'This transaction is the credit of a direct debit batch: it cannot be deleted. Record returns from Treasury.',
  "Aquesta quota es va cobrar dins d'una remesa: si el banc l'ha retornada, registra'n la devolució a Tresoreria.":
    'This fee was collected in a direct debit batch: if the bank returned it, record the return in Treasury.',
  "El pressupost d'aquest exercici ja està aprovat: desfés l'aprovació per modificar-lo.":
    "This year's budget is already approved: undo the approval to change it.",
  "Hi ha remeses de l'exercici pendents de marcar com a cobrades.": 'There are batches in this year still to be marked as collected.',
  'Aquest exercici ja està tancat.': 'This financial year is already closed.',
  'Aquest rebut ja està retornat.': 'This debit has already been returned.',
  'Aquesta quota és en una remesa pendent de cobrar: elimina primer la remesa.': 'This fee is in a batch pending collection: delete the batch first.',
  'Aquesta remesa ja està cobrada.': 'This batch has already been collected.',
  'Només es poden retornar rebuts de remeses cobrades.': 'Only debits of collected batches can be returned.',
  'Una remesa cobrada no es pot eliminar.': 'A collected batch cannot be deleted.',
  'La quota del soci núm. {0} ja està cobrada.': 'The fee of member no. {0} has already been collected.',
  'La quota del soci núm. {0} és en una remesa pendent de cobrar.': 'The fee of member no. {0} is in a batch pending collection.',
  'Soci núm. {0}: {1}': 'Member no. {0}: {1}',
  'La quota no està pendent.': 'The fee is not pending.',
  'El soci no paga per domiciliació.': 'The member does not pay by direct debit.',
  'Sense mandat SEPA actiu.': 'No active SEPA mandate.',
  'IBAN absent o no vàlid.': 'Missing or invalid IBAN.',
  'Ja és en una remesa pendent de cobrar.': 'Already in a batch pending collection.',
  'La remesa no té cap operació.': 'The batch has no transactions.',
  "L'any anterior no té moviments.": 'The previous year has no transactions.',
  "L'any anterior no té pressupost.": 'The previous year has no budget.',
  'Comissió': 'Fee',
  "Data d'abonament": 'Credit date',
  "Data d'aprovació": 'Approval date',
  'Data de devolució': 'Return date',
  'Data de cobrament': 'Collection date',
  'Data de signatura': 'Signature date',
  'Motiu': 'Reason',
};
