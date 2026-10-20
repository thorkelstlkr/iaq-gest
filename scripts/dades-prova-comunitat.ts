// Dades de prova del mòdul «comunitat»: persones voluntàries (sòcies i externes, una que treballa amb menors
// sense certificat), hores a les activitats, dues pòlisses (una que venç aviat), entitats col·laboradores,
// convenis i col·laboracions a les activitats. Es crida des de scripts/dades-prova.ts.

import { get, run, setConfig } from '../server/db.ts';
import { avui, sumaDies } from '../shared/dates.ts';
import { afegeixHores, baixaVoluntari, creaEntitat, creaVoluntari, desaConveni, vinculaActivitat } from '../server/routes/comunitat.ts';

export function dadesProva() {
  if (get('SELECT 1 FROM voluntaris LIMIT 1') || get('SELECT 1 FROM entitats_collaboradores LIMIT 1')) return;
  const soci = (nom: string, llinatges: string) =>
    get<{ id: number }>('SELECT id FROM socis WHERE nom = ? AND llinatges = ?', nom, llinatges)?.id ?? null;
  const act = (nom: string) => get<{ id: number; data_inici: string }>('SELECT id, data_inici FROM activitats WHERE nom LIKE ? ORDER BY data_inici DESC', `${nom}%`);
  const any = Number(avui().slice(0, 4));

  // Sense transacció global: les funcions del mòdul ja n'obren quan cal (SQLite no les permet niuades).
  {
    setConfig('vol_validesa_certificat_mesos', '12');
    setConfig('vol_valor_hora_cents', '1050');

    // ---------- Persones voluntàries ----------
    const nova = (b: Record<string, unknown>) => (b.soci_id === null ? null : creaVoluntari(b));
    const aina = nova({
      soci_id: soci('Aina', 'Llompart Cifre'), data_incorporacio: `${any - 2}-02-01`, acord_signat_el: `${any - 2}-02-01`,
      funcions: 'Dinamització dels tallers intergeneracionals amb infants', habilitats: 'Mestra jubilada; contacontes',
      disponibilitat: 'Dissabtes al matí, unes 4 hores al mes', formacio: 'Curs de monitora de lleure (2019)',
      treballa_amb_menors: 1, certificat_delictes_data: sumaDies(-120),
    });
    const catalina = nova({
      soci_id: soci('Catalina', 'Torrandell Reus'), data_incorporacio: `${any - 2}-03-01`, acord_signat_el: `${any - 2}-03-01`,
      funcions: 'Padrina que ensenya rondalles i cançons de feina', habilitats: 'Rondalles, cançons de batre i de collir olives',
      disponibilitat: 'Quan hi ha taller', treballa_amb_menors: 1, certificat_delictes_data: sumaDies(-340),
    });
    const miquel = nova({
      soci_id: soci('Miquel', 'Siquier Crespí'), data_incorporacio: `${any - 1}-01-15`, acord_signat_el: `${any - 1}-01-15`,
      funcions: 'Logística, muntatge i so a les activitats', habilitats: 'Electricista; carnet de furgoneta', disponibilitat: 'Caps de setmana',
    });
    const joana = nova({
      soci_id: soci('Joana', 'Ferrer Serra'), data_incorporacio: `${any}-02-10`, acord_signat_el: `${any}-02-10`,
      funcions: 'Fotografia i suport als tallers amb infants', habilitats: 'Fotografia, xarxes socials', disponibilitat: '2 hores setmanals',
      treballa_amb_menors: 1, // sense certificat: genera un avís
    });
    const rafel = nova({
      soci_id: soci('Rafel', 'Cànaves Vicens'), data_incorporacio: sumaDies(-25),
      funcions: 'Digitalització de fotografies antigues', disponibilitat: 'Dimecres horabaixa', // acord pendent de signar
    });
    const llucia = creaVoluntari({
      nom: 'Llúcia', llinatges: 'Vives Cànaves', dni: '43187654R', data_naixement: '1994-08-03', email: 'llucia.vives@exemple.cat',
      telefon: '611 20 33 44', adreca: 'Carrer del Temple, 12, 07460 Pollença', data_incorporacio: `${any}-06-01`, acord_signat_el: `${any}-06-01`,
      funcions: 'Acompanyament musical als tallers de cançons de feina', habilitats: 'Guitarra i veu; xeremies',
      disponibilitat: 'Un dissabte al mes', notes: 'No és sòcia: va venir al taller de cançons de feina.',
    });
    const antoni = creaVoluntari({
      nom: 'Antoni', llinatges: 'Cerdà Mir', dni: '43098712T', data_naixement: '1981-02-17', telefon: '622 45 67 89',
      adreca: 'Carrer de Sant Jordi, 5, 07470 Port de Pollença', data_incorporacio: `${any - 1}-04-01`, acord_signat_el: `${any - 1}-04-01`,
      funcions: 'Suport a les excursions i visites', disponibilitat: 'Diumenges',
    });
    baixaVoluntari(antoni, `${any}-06-30`, "Trasllat a Palma per feina");

    // ---------- Hores ----------
    const hores = (ids: (number | null)[], activitat: { id: number; data_inici: string } | undefined, h: number, tasca: string, data?: string) => {
      const vids = ids.filter((x): x is number => Boolean(x));
      const d = data ?? activitat?.data_inici;
      if (!vids.length || !d || d > avui()) return;
      afegeixHores({ voluntari_ids: vids, activitat_id: activitat?.id ?? null, data: d, hores: h, tasca });
    };
    const rondalles = act('Taller de rondalles');
    const cancons = act('Taller de cançons de feina');
    const molins = act('Xerrada: la Pollença');
    const visita = act('Visita al molí');
    hores([aina, catalina], rondalles, 3, 'Monitoratge del taller');
    hores([miquel], rondalles, 2, 'Muntatge de la sala');
    hores([catalina], cancons, 2.5, 'Ensenyar cançons de feina');
    hores([llucia], cancons, 3, 'Acompanyament musical');
    hores([miquel], cancons, 1.5, 'So i llums');
    hores([joana], cancons, 2, 'Fotografia');
    hores([miquel, antoni], molins, 2, 'Muntatge i acollida');
    hores([antoni], undefined, 4, 'Preparació de la ruta dels molins', `${any}-04-12`);
    hores([aina, miquel], visita, 3, 'Acompanyament del grup');
    hores([rafel], undefined, 2, 'Escaneig de fotografies del fons de can Siquier', sumaDies(-14));
    hores([rafel], undefined, 2.5, 'Escaneig de fotografies del fons de can Siquier', sumaDies(-7));
    hores([aina], undefined, 1.5, "Reunió de preparació de l'agenda de tardor", sumaDies(-30));

    // ---------- Assegurances ----------
    run(
      `INSERT INTO assegurances (asseguradora, num_polissa, tipus, cobertura, data_inici, data_venciment, prima_cents, mediador, contacte)
       VALUES ('Mútua Insular d''Assegurances', 'AV-2025-118734', 'accidents_voluntaris', ?, ?, ?, 18600, 'Corredoria Puig Pollença', '971 53 10 20')`,
      'Accidents de les persones voluntàries en l’exercici de les seves activitats: mort i invalidesa 12.000 €, assistència sanitària il·limitada en centres concertats.',
      sumaDies(-150), sumaDies(215),
    );
    run(
      `INSERT INTO assegurances (asseguradora, num_polissa, tipus, cobertura, data_inici, data_venciment, prima_cents, mediador, contacte)
       VALUES ('Assegurances Tramuntana', 'RC-77120', 'responsabilitat_civil', ?, ?, ?, 24500, 'Corredoria Puig Pollença', '971 53 10 20')`,
      "Responsabilitat civil general de l'associació i de les persones voluntàries fins a 300.000 € per sinistre.",
      sumaDies(-345), sumaDies(20),
    );

    // ---------- Entitats col·laboradores ----------
    const ajuntament = creaEntitat({
      nom: 'Ajuntament de Pollença', tipus: 'ajuntament', persona_contacte: 'Regidoria de Cultura', carrec: 'Tècnica de cultura',
      email: 'cultura@exemple-ajpollenca.cat', telefon: '971 53 00 15', adreca: 'Calvari, 2, 07460 Pollença',
      notes: 'Cedeix el Claustre de Sant Domingo i la plaça per a les activitats grans.',
    });
    const ceip = creaEntitat({
      nom: 'CEIP Joan Mas', tipus: 'escola', persona_contacte: 'Equip directiu', carrec: 'Cap d’estudis',
      email: 'direccio@exemple-ceipjoanmas.cat', telefon: '971 53 02 40', adreca: 'Pollença',
      notes: 'Hi fem el taller de rondalles amb els alumnes de 3r i 4t.',
    });
    const gentGran = creaEntitat({
      nom: 'Associació de Gent Gran de Pollença', tipus: 'entitat', persona_contacte: 'Bartomeu Vicens', carrec: 'President',
      telefon: '971 53 11 22', adreca: 'Pollença', notes: 'Hi trobam padrins i padrines per als tallers intergeneracionals.',
    });
    const consell = creaEntitat({
      nom: 'Consell de Mallorca', tipus: 'consell', persona_contacte: 'Departament de Cultura i Patrimoni', carrec: 'Servei de Cultura Popular',
      email: 'culturapopular@exemple-conselldemallorca.cat', telefon: '971 17 30 00', adreca: 'Palau Reial, 1, 07001 Palma', web: 'https://www.conselldemallorca.cat',
    });

    desaConveni({
      entitat_id: consell, titol: 'Conveni per a la recerca i difusió del patrimoni immaterial de Pollença',
      objecte: 'Recollida de rondalles, cançons de feina i oficis antics i difusió als centres educatius del municipi.',
      data_signatura: `${any}-01-20`, data_inici: `${any}-01-01`, data_fi: sumaDies(45), import_cents: 300000, estat: 'vigent',
      obligacions: "Justificar l'aportació abans del 31 de gener de l'any següent amb la memòria d'activitats i les factures. Fer constar el logotip del Consell a la difusió.",
    }, null);
    desaConveni({
      entitat_id: ajuntament, titol: "Cessió d'espais municipals per a activitats culturals",
      objecte: 'Ús gratuït del Claustre de Sant Domingo i de la sala d’actes per a les activitats obertes al públic.',
      data_signatura: `${any - 1}-09-15`, data_inici: `${any - 1}-10-01`, data_fi: `${any}-09-30`, renovacio_automatica: 1, estat: 'vigent',
      obligacions: 'Sol·licitar cada ús amb 15 dies d’antelació i deixar els espais nets.',
    }, null);
    desaConveni({
      entitat_id: ceip, titol: 'Projecte «Padrins a l’escola»', objecte: 'Tallers de rondalles i jocs tradicionals a l’hora de tutoria.',
      data_inici: `${any + 1}-01-01`, data_fi: `${any + 1}-06-20`, estat: 'esborrany',
    }, null);

    const vincula = (e: number, a: { id: number } | undefined, rol: string, notes: string | null = null) => a && vinculaActivitat(e, a.id, rol, notes);
    vincula(ceip, rondalles, 'collaborador', "Alumnes de 3r i 4t");
    vincula(gentGran, rondalles, 'collaborador', 'Padrins i padrines contacontes');
    vincula(ajuntament, molins, 'espai_cedit', 'Claustre de Sant Domingo');
    vincula(consell, molins, 'patrocinador');
    vincula(gentGran, cancons, 'collaborador');
    vincula(ajuntament, cancons, 'espai_cedit', 'Sala d’actes');
    vincula(ajuntament, act('Taller de llata'), 'espai_cedit', 'Casal de cultura');
  }
}
