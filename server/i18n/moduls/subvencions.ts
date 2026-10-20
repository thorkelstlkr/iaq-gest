// Missatges del servidor del mòdul «subvencions»: català → castellà / anglès.
export const es: Record<string, string> = {
  'El fitxer ha de ser una imatge (JPG, PNG, WebP) o un PDF.': 'El archivo debe ser una imagen (JPG, PNG, WebP) o un PDF.',
  'El fitxer és massa gran (màxim 1,4 MB).': 'El archivo es demasiado grande (máximo 1,4 MB).',
  "El període d'execució acaba abans de començar.": 'El periodo de ejecución termina antes de empezar.',
  "Cal indicar l'import concedit.": 'Hay que indicar el importe concedido.',
  "Una subvenció justificada no es pot eliminar: s'ha de conservar almenys quatre anys.":
    'Una subvención justificada no se puede eliminar: debe conservarse al menos cuatro años.',
  "La subvenció ja està justificada: per canviar les despeses imputades, torna-la a l'estat «Concedida» o «Cobrada».":
    'La subvención ya está justificada: para cambiar los gastos imputados, devuélvela al estado «Concedida» o «Cobrada».',
  "L'import imputat ha de ser més gran que zero.": 'El importe imputado debe ser mayor que cero.',
  'Moviment inexistent.': 'Movimiento inexistente.',
  'Només es poden imputar moviments de despesa.': 'Solo se pueden imputar movimientos de gasto.',
  "No es pot imputar més de l'import del moviment: en queden {0} € disponibles.":
    'No se puede imputar más del importe del movimiento: quedan {0} € disponibles.',
  'Cal triar un moviment.': 'Hay que elegir un movimiento.',
  "Aquesta despesa ja està imputada a la subvenció: modifica'n l'import.": 'Este gasto ya está imputado a la subvención: modifica su importe.',
  "Els cobraments han de ser moviments d'ingrés.": 'Los cobros deben ser movimientos de ingreso.',
  'Només es poden justificar subvencions concedides o cobrades.': 'Solo se pueden justificar subvenciones concedidas o cobradas.',
  'Cal imputar alguna despesa abans de justificar la subvenció.': 'Hay que imputar algún gasto antes de justificar la subvención.',
  'Estat de la subvenció no vàlid.': 'Estado de la subvención no válido.',
  'Subvenció inexistent.': 'Subvención inexistente.',
  "Aquesta despesa està imputada a una subvenció: no se'n pot canviar el tipus.": 'Este gasto está imputado a una subvención: no se puede cambiar su tipo.',
  "Aquesta despesa té {0} € imputats a subvencions: l'import no pot ser inferior.":
    'Este gasto tiene {0} € imputados a subvenciones: el importe no puede ser inferior.',
  "Aquesta despesa forma part d'una subvenció ja justificada: no se'n pot canviar l'import ni la data.":
    'Este gasto forma parte de una subvención ya justificada: no se puede cambiar su importe ni su fecha.',
  "Aquesta despesa forma part d'una subvenció ja justificada: no es pot eliminar.":
    'Este gasto forma parte de una subvención ya justificada: no se puede eliminar.',
  "La suma de les imputacions a subvencions supera l'import del moviment.":
    'La suma de las imputaciones a subvenciones supera el importe del movimiento.',
  "Exercici tancat: els justificants dels moviments d'un exercici tancat no es poden eliminar ni modificar.":
    'Ejercicio cerrado: los justificantes de los movimientos de un ejercicio cerrado no se pueden eliminar ni modificar.',
  // Camps i columnes
  'Núm.': 'Núm.',
  Creditor: 'Acreedor',
  'Núm. de factura / justificant': 'Núm. de factura / justificante',
  "Data d'emissió": 'Fecha de emisión',
  'Data de pagament': 'Fecha de pago',
  'Import imputat (€)': 'Importe imputado (€)',
  'Justificant adjunt': 'Justificante adjunto',
  Organisme: 'Organismo',
  'Import sol·licitat': 'Importe solicitado',
  'Import concedit': 'Importe concedido',
  'Pressupost del projecte': 'Presupuesto del proyecto',
  'Data de sol·licitud': 'Fecha de solicitud',
  'Data de resolució': 'Fecha de resolución',
  "Inici del període d'execució": 'Inicio del periodo de ejecución',
  "Fi del període d'execució": 'Fin del periodo de ejecución',
  'Termini de justificació': 'Plazo de justificación',
  'Import imputat': 'Importe imputado',
  Moviment: 'Movimiento',
  'Data de justificació': 'Fecha de justificación',
  Subvenció: 'Subvención',
  'Fitxers adjunts': 'Archivos adjuntos',
  'Saldo inicial': 'Saldo inicial',
  Sí: 'Sí',
  No: 'No',
};

export const en: Record<string, string> = {
  'El fitxer ha de ser una imatge (JPG, PNG, WebP) o un PDF.': 'The file must be an image (JPG, PNG, WebP) or a PDF.',
  'El fitxer és massa gran (màxim 1,4 MB).': 'The file is too large (maximum 1.4 MB).',
  "El període d'execució acaba abans de començar.": 'The execution period ends before it starts.',
  "Cal indicar l'import concedit.": 'Please enter the amount granted.',
  "Una subvenció justificada no es pot eliminar: s'ha de conservar almenys quatre anys.":
    'A justified grant cannot be deleted: it must be kept for at least four years.',
  "La subvenció ja està justificada: per canviar les despeses imputades, torna-la a l'estat «Concedida» o «Cobrada».":
    'The grant has already been justified: to change the allocated expenses, set it back to “Granted” or “Collected”.',
  "L'import imputat ha de ser més gran que zero.": 'The allocated amount must be greater than zero.',
  'Moviment inexistent.': 'Transaction not found.',
  'Només es poden imputar moviments de despesa.': 'Only expense transactions can be allocated.',
  "No es pot imputar més de l'import del moviment: en queden {0} € disponibles.":
    'You cannot allocate more than the transaction amount: €{0} still available.',
  'Cal triar un moviment.': 'Please choose a transaction.',
  "Aquesta despesa ja està imputada a la subvenció: modifica'n l'import.": 'This expense is already allocated to the grant: edit its amount instead.',
  "Els cobraments han de ser moviments d'ingrés.": 'Payments received must be income transactions.',
  'Només es poden justificar subvencions concedides o cobrades.': 'Only granted or collected grants can be justified.',
  'Cal imputar alguna despesa abans de justificar la subvenció.': 'Allocate some expenses before justifying the grant.',
  'Estat de la subvenció no vàlid.': 'Invalid grant status.',
  'Subvenció inexistent.': 'Grant not found.',
  "Aquesta despesa està imputada a una subvenció: no se'n pot canviar el tipus.": 'This expense is allocated to a grant: its type cannot be changed.',
  "Aquesta despesa té {0} € imputats a subvencions: l'import no pot ser inferior.":
    'This expense has €{0} allocated to grants: the amount cannot be lower.',
  "Aquesta despesa forma part d'una subvenció ja justificada: no se'n pot canviar l'import ni la data.":
    'This expense is part of a grant that has already been justified: its amount and date cannot be changed.',
  "Aquesta despesa forma part d'una subvenció ja justificada: no es pot eliminar.":
    'This expense is part of a grant that has already been justified: it cannot be deleted.',
  "La suma de les imputacions a subvencions supera l'import del moviment.":
    'The total allocated to grants exceeds the transaction amount.',
  "Exercici tancat: els justificants dels moviments d'un exercici tancat no es poden eliminar ni modificar.":
    'Closed financial year: receipts of transactions in a closed year cannot be deleted or changed.',
  'Núm.': 'No.',
  Creditor: 'Creditor',
  'Núm. de factura / justificant': 'Invoice / receipt no.',
  "Data d'emissió": 'Issue date',
  'Data de pagament': 'Payment date',
  'Import imputat (€)': 'Allocated amount (€)',
  'Justificant adjunt': 'Receipt attached',
  Organisme: 'Funding body',
  'Import sol·licitat': 'Amount requested',
  'Import concedit': 'Amount granted',
  'Pressupost del projecte': 'Project budget',
  'Data de sol·licitud': 'Application date',
  'Data de resolució': 'Decision date',
  "Inici del període d'execució": 'Execution period start',
  "Fi del període d'execució": 'Execution period end',
  'Termini de justificació': 'Justification deadline',
  'Import imputat': 'Allocated amount',
  Moviment: 'Transaction',
  'Data de justificació': 'Justification date',
  Subvenció: 'Grant',
  'Fitxers adjunts': 'Attachments',
  'Saldo inicial': 'Opening balance',
  Sí: 'Yes',
  No: 'No',
};
