# IAQ Gest

### Solución integral de gestión para asociaciones sin ánimo de lucro

Programa libre y gratuito (licencia MIT) para que una asociación lleve **todo en un solo lugar**: socios, cuotas, contabilidad, actividades, web, redes sociales, órganos de gobierno y cumplimiento legal. Funciona en el ordenador de la entidad (Windows, macOS y Linux), los datos son vuestros y la junta puede trabajar desde casa. En catalán, castellano e inglés.

Nació para la **Associació I ara qué?** (Pollença, Mallorca), dedicada a la transmisión intergeneracional de la cultura y las tradiciones, pero no tiene nada fijo de esa entidad: cualquier asociación lo puede instalar y configurar con sus datos.

**[Probar la demostración en línea](https://claude.ai/artifact/KyUKUttbR9KYZXHkJRbFPF)** · **[Descargar](../../releases)** · [Licencia MIT](LICENSE)

| Área | Qué incluye |
|---|---|
| 👥 **Personas** | Registro de socios con historial de altas y bajas, categorías y derecho a voto, carné con foto, importación desde Excel, interesados y seguimiento (CRM), comunicaciones por correo, voluntariado (Ley 45/2015), colaboradores y convenios |
| 🎭 **Actividades y difusión** | Planificación, inscripciones con plazas y lista de espera, menores y derechos de imagen, pase de lista, indicadores de impacto; **web pública** generada por el programa con editor de diseño y publicación por FTP; asistente para **redes sociales** |
| € **Economía** | Cuotas y recibos, **domiciliaciones SEPA**, contabilidad con justificantes adjuntos, presupuesto, conciliación bancaria (Norma 43), subvenciones y cuenta justificativa, donativos y **modelo 182**, retenciones (111/115/190/180/347), comprobación del **modelo 200**, inventario, **facturación VERI\*FACTU** |
| ⚖ **Gobierno y cumplimiento** | Asambleas y juntas con quórum y delegaciones, **libro de actas** inalterable, cargos y mandatos, certificados, **protección de datos (RGPD/LOPDGDD)**, calendario de obligaciones legales y fiscales, memoria anual |
| ⚙ **Herramientas** | Copias de seguridad diarias (también en Google Drive), acceso remoto seguro (Tailscale), usuarios con perfiles, auditoría, **agentes de IA personales** (Claude, ChatGPT, Gemini, Copilot…) que nunca ven datos sensibles, manual integrado con 50+ artículos |

> El programa ayuda a cumplir las obligaciones de una asociación, pero no sustituye el asesoramiento de una gestoría. Consulta la [exención de responsabilidad](shared/llicencia.ts).

---

*La documentació completa és en català (la llengua de l'entitat que l'ha impulsat):*

Programa de gestió de socis (CRM), quotes, comptabilitat i activitats per a associacions sense ànim de lucre. Desenvolupat per a l'**Associació I ara qué?** (Pollença), però sense res fix de l'entitat: nom, logotip, finalitats estatutàries, quotes, comptes, correu… es configuren des del mateix programa, de manera que el pot fer servir qualsevol associació.

Funciona en local: és un programa d'escriptori per a Windows, macOS i Linux que guarda les dades en un fitxer SQLite en aquest ordinador i s'obre en la seva pròpia finestra, amb usuari i contrasenya. La resta de la junta hi pot entrar des del navegador (també des de casa, amb Tailscale).

## Instal·lació

Descarrega l'instal·lador del teu sistema de la pàgina de descàrregues del projecte (les *releases* de GitHub). No cal instal·lar Node.js ni res més.

| Sistema | Fitxer | Com s'instal·la |
|---|---|---|
| Windows | `.exe` | Instal·lador habitual: idioma, llicència i avís de responsabilitat (cal acceptar-los), carpeta d'instal·lació i dreceres a l'escriptori i al menú Inici. |
| macOS | `.dmg` | Obre'l i arrossega l'aplicació a **Aplicacions**. |
| Linux | `.AppImage` | Dona-li permís d'execució (botó dret → Propietats → Permet executar-lo, o `chmod +x` amb el nom del fitxer) i obre'l. |
| Linux (Debian/Ubuntu) | `.deb` | Doble clic, o `sudo apt install ./fitxer.deb`. |

**Els instal·ladors encara no estan signats digitalment:**

- **Windows**: si SmartScreen mostra «Windows ha protegit l'ordinador», clica **Més informació** → **Executa igualment**.
- **macOS**: la primera vegada, clic amb el botó dret (o Control + clic) a l'aplicació → **Obre** → **Obre**; o bé Configuració del Sistema → Privadesa i seguretat → **Obre igualment**.

### Primera vegada: l'assistent inicial

El primer cop que s'obre, un assistent guia la configuració: benvinguda i idioma → llicència i avís de responsabilitat (cal acceptar-los) → dades de l'entitat → compte d'administració → persones clau (presidència, secretaria, tresoreria, vocals, comunicació…, cadascuna amb nom d'usuari, contrasenya inicial i perfil suggerit) → resum. En acabar mostra la llista d'usuaris amb les contrasenyes inicials per lliurar-les a cada persona, que l'ha de canviar en entrar.

### La icona del costat del rellotge

El programa s'obre en la seva finestra (sense navegador ni finestra d'ordres). La icona a la safata del sistema (Windows), a la barra de menús (macOS) o a la safata (Linux) el manté en marxa quan es tanca la finestra, cosa necessària per a l'accés remot, els agents d'IA i les còpies diàries. El seu menú té: **Obre el programa**, **Obre al navegador**, **Inicia en engegar l'ordinador** (casella), **Obre la carpeta de dades** i **Surt** (l'única manera d'aturar-lo del tot).

Des d'altres equips s'hi entra amb l'adreça `http://<ip>:3000` (port 3000 per defecte), un cop activat l'accés a Configuració → Accés remot (vegeu més avall, «Des de fora»).

### Carpeta de dades

La base de dades (`iaraque.db`), la clau de xifratge (`clau.key`), el registre d'errors i les còpies de seguretat (subcarpeta `copies`) són a:

| Sistema | Carpeta |
|---|---|
| Windows | `%APPDATA%\IAQ Gest\dades` |
| macOS | `~/Library/Application Support/IAQ Gest/dades` |
| Linux | `~/.config/IAQ Gest/dades` |

S'hi arriba des de la icona → **Obre la carpeta de dades**. Desinstal·lar el programa no l'esborra.

### Actualitzar

Descarrega l'instal·lador de la versió nova i executa'l, amb el programa aturat (icona → **Surt**): a Windows s'actualitza al mateix lloc; a macOS, substitueix l'aplicació a Aplicacions; a Linux, fes servir el nou AppImage o instal·la el nou `.deb`. Les dades es conserven, i la primera vegada que s'obre una versió nova el programa en fa una còpia de seguretat automàtica (`copies/abans-actualitzar-<versió>-<data>.db`). La versió instal·lada es veu a Configuració → Còpia de seguretat.

### Passar de la instal·lació antiga (Iniciar.bat)

1. Tanca el programa antic.
2. Instal·la i obre el nou (no cal completar l'assistent), obre la carpeta de dades amb la icona → **Obre la carpeta de dades** i atura'l amb la icona → **Surt**.
3. Copia `iaraque.db` i `clau.key` de la carpeta `data` del programa antic a la carpeta de dades nova, substituint-hi els que hi ha.
4. Torna a obrir el programa.

### Recuperar l'accés d'administració

Si ningú no recorda la contrasenya d'administració, cal accés físic a l'ordinador. Amb el programa aturat (icona → **Surt**), executa'l des d'una finestra d'ordres amb `--restableix-admin <usuari> <nova-contrasenya>`:

```bat
:: Windows (Símbol del sistema). Si es va instal·lar per a tots els usuaris: "C:\Program Files\IAQ Gest\IAQ Gest.exe"
"%LOCALAPPDATA%\Programs\IAQ Gest\IAQ Gest.exe" --restableix-admin thorkel NovaContrasenya123
```

```bash
# macOS
"/Applications/IAQ Gest.app/Contents/MacOS/IAQ Gest" --restableix-admin thorkel NovaContrasenya123
# Linux (AppImage)
./IAQ-Gest.AppImage --restableix-admin thorkel NovaContrasenya123
```

Si l'usuari existeix, se'n canvia la contrasenya, passa a ser administrador i es reactiva; si no, es crea. Queda anotat al registre d'activitat.

## Què fa

**Socis i CRM**
- **Socis** — registre complet (foto, dades personals, contacte, tutor legal per a menors, IBAN, consentiment RGPD i drets d'imatge), altes i baixes, cerca, filtre per etiqueta i exportació a CSV.
- **Etiquetes** de colors per agrupar socis (Junta, Voluntariat, Música…).
- **Seguiment** — historial de contactes de cada soci (trucades, correus, reunions, notes) i tasques amb data límit.
- **Persones interessades** — gent que encara no és sòcia, amb el seu estat, i alta com a soci amb un clic.
- **Participació** — inscripció i assistència dels socis a cada activitat.
- **Comunicacions** — correus a grups (tots, una etiqueta, una franja d'edat, quota pendent, inscrits a una activitat), personalitzats amb el nom i enviats un per un per SMTP (servidor de la web o Gmail). Queden a l'historial de cada soci.
- **Carnet de soci** — format targeta (85,6 × 54 mm, anvers i revers) que s'imprimeix amb un clic des del llistat o la fitxa, amb plantilla pròpia opcional.

**Economia**
- **Quotes** — tipus de quota configurables, generació anual i cobrament en un clic, que crea automàticament l'ingrés comptable.
- **Comptabilitat** — llibre de caixa i bancs amb ingressos, despeses i traspassos, categories, justificants, vinculació a activitats i socis, saldos i exportació a CSV.
- **Facturació** — factures ordinàries, simplificades i rectificatives amb el contingut del RD 1619/2012, numeració correlativa per sèries, IVA o exempció amb la seva menció legal, i sistema **VERI\*FACTU** (RD 1007/2023): les factures emeses no es poden modificar ni esborrar (ho impedeix la mateixa base de dades), cada registre porta la «huella» SHA-256 encadenada, la factura du el QR tributari i els registres s'envien a l'AEAT amb el certificat de l'entitat (entorn de proves o de producció). Esquemes i especificacions oficials a `docs/verifactu`.

**Web i comunicació**
- **Web pública** generada a partir de les dades del programa (agenda d'activitats, notícies, qui som amb les finalitats, fes-te'n soci amb les quotes, contacte, avís legal i privacitat), amb previsualització i publicació per FTP, manual o automàtica quan hi ha canvis.

- **Xarxes socials** — es prepara una publicació una vegada (o a partir d'una activitat o notícia, amb l'enllaç a la seva pàgina web) i es publica a cada xarxa amb el text adaptat i el comptador de caràcters. Instagram i la pàgina de Facebook es publiquen directament des del programa (la imatge es puja a la web per FTP); per a X, TikTok i YouTube el programa obre la xarxa amb el text preparat. Historial de què s'ha publicat i on.

**Protecció de dades (RGPD i LOPDGDD)**
- Full d'inscripció amb la clàusula informativa i consentiments separats (imatge, comunicacions), consentiment del tutor per als menors de 14 anys, exportació de totes les dades d'una persona, supressió per anonimització (conservant els registres comptables), terminis de conservació, registre de sol·licituds de drets amb el termini d'un mes, registre d'activitat i registre d'activitats de tractament (art. 30).

**Entitat**
- **Activitats** vinculades a les finalitats estatutàries, amb inscrits i balanç econòmic.
- **Informes** imprimibles: compte de resultats i tresoreria, memòria d'activitats per finalitats i llibre registre de socis.
- **Tauler** amb el resum de l'exercici i un apartat «Per fer»: tasques, aniversaris, consentiments RGPD pendents, quotes endarrerides i persones interessades.
- **Configuració** de tot el que és propi de l'entitat, usuaris del programa i còpia de seguretat.
- **Perfils d'usuari**: Administració, Junta/Secretaria, Tresoreria i Comunicació (per a un community manager, sense accés a dades personals ni comptes).

## Protecció de dades i seguretat

L'aplicació conté dades personals de socis (incloent-hi menors). Mesures que hi ha:

- **Accés amb usuari i contrasenya** i **perfils** (Administració, Junta/Secretaria, Tresoreria, Comunicació): cada perfil només veu i modifica el que li toca. Les contrasenyes es guarden amb *scrypt* (mai en clar).
- **Sessions**: caduquen als 30 dies. Quan es canvia una contrasenya (la pròpia o restablerta per l'administració) o es desactiva un usuari, es tanquen totes les seves altres sessions.
- **Bloqueig**: després de 5 intents d'entrada fallits amb el mateix usuari (o 10 des del mateix ordinador), s'hi bloqueja l'entrada durant 15 minuts.
- **Registre d'activitat** (Protecció de dades → Registre): altes, modificacions, eliminacions i exportacions de dades personals; entrades i intents fallits; altes, canvis de perfil i contrasenyes d'usuaris; canvis de configuració (només el nom de les claus, mai els valors); descàrregues i restauracions de còpies.
- **Secrets xifrats**: les contrasenyes de correu i FTP, el certificat digital i els testimonis de les xarxes socials es guarden xifrats (AES-256-GCM) amb la clau del fitxer **`clau.key`** de la carpeta de dades, que es crea automàticament. Una còpia de la base de dades sense aquest fitxer no revela aquests secrets. **Guarda una còpia de `clau.key` en un lloc segur i separat de les còpies de seguretat**: per recuperar aquestes contrasenyes en un altre ordinador cal copiar-lo a la mateixa carpeta que la base de dades; si es perd, només cal tornar-les a escriure a Configuració.
- Per defecte el programa només és accessible des del mateix ordinador. No l'obris a la xarxa (Configuració → Accés remot, o `HOST=0.0.0.0` a la versió de codi font) si no és una xarxa de confiança. Protegeix també l'accés a l'ordinador (contrasenya de l'usuari i, si és possible, xifratge del disc: BitLocker a Windows, FileVault a macOS).
- Els errors interns es desen a `registre.log`, a la carpeta de dades (es rota a 1 MB i se'n conserven 3 fitxers).

## Agents d'IA personals

Cada persona de la junta pot connectar el seu propi assistent d'IA (Claude, ChatGPT, Gemini, GitHub Copilot, Cursor, LM Studio…) al seu compte, des del menú **«El meu agent d'IA»**:

1. Crea una **clau personal** (es mostra una sola vegada) i tria si l'agent només consulta o també gestiona.
2. Copia la configuració per a la teva aplicació (la pantalla la dona feta per a cada client).
3. Demana-li coses en llenguatge natural: «Què tenim pendent aquest mes?», «Apunta que en Joan ha pagat la quota en efectiu», «Prepara l'acta de la junta de dijous amb aquests acords»…

Com funciona i quins límits té:

- L'agent actua **com la persona propietària de la clau**, amb exactament els permisos del seu perfil (mai més). Tot queda al registre d'activitat de l'agent i a l'auditoria amb el nom de la persona.
- Només pot fer servir les **eines** del programa (`server/agent/eines/`), no la resta de l'API.
- **Mai no rep dades sensibles**: DNI/NIF, IBAN, adreces, dates de naixement (només l'edat), telèfons, correus ni fotos (`server/agent/filtre.ts`).
- Les accions amb efectes fora del programa o difícils de desfer (enviar correus i convocatòries, publicar a la web o a les xarxes, cobrar quotes, emetre factures o certificats, tancar actes o exercicis, donar de baixa…) **només queden proposades**: la persona les aprova o rebutja a «El meu agent d'IA → Propostes».
- Les claus es poden revocar en qualsevol moment; si es desactiva l'usuari, les seves claus deixen de funcionar.

Connexions disponibles:

| Client | Com |
|---|---|
| Claude Desktop, Claude Code, Gemini CLI, GitHub Copilot (VS Code), Cursor, Windsurf, LM Studio | MCP per stdio: la pantalla genera la configuració, que apunta al mateix programa instal·lat (no cal Node.js ni escriure rutes), amb les variables `IARAQUE_CLAU` i `IARAQUE_URL`. A la versió de codi font: `node scripts/mcp.ts` |
| Clients MCP per HTTP | `POST /api/agent-ia/mcp` amb `Authorization: Bearer <clau>` |
| ChatGPT (connectors o GPT amb accions), APIs amb *function calling* | `/api/agent-ia/openapi.json` i `POST /api/agent-ia/eines/<nom>` (cal una adreça https pública: opció avançada) |

### Des de fora (accés remot)

A **Configuració → Accés remot** (administració):

- **Accés des d'altres equips**: el programa escolta també a la xarxa (variable `HOST=0.0.0.0` equivalent; cal reiniciar-lo: icona → **Surt** i tornar-lo a obrir). Recomanat només amb **Tailscale** (xarxa privada xifrada); mai obrint el port al router.
- **Entrada per als agents** (port separat, per defecte 3001): només serveix `/api/agent-ia/*` i OAuth, mai el programa. És el port que s'exposa a internet amb un túnel (`tailscale funnel 3001` o `cloudflared tunnel --url http://localhost:3001`) per fer servir Claude (web i mòbil) o ChatGPT.
- **OAuth per als connectors al núvol** (`/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`, `/oauth/register|authorize|token`, amb PKCE): la pàgina d'autorització demana un **codi de connexió** d'un sol ús (10 minuts) que la persona genera a «El meu agent d'IA»; la contrasenya mai no passa pel túnel. El resultat és una clau personal com qualsevol altra, revocable.

Guia pas a pas a l'ajuda del programa: «Fer servir el programa i l'agent des de fora».

Protecció de dades: si el model funciona al núvol, el proveïdor d'IA actua com a encarregat del tractament. Feu servir plans amb acord de tractament de dades (DPA) i afegiu-ho al registre d'activitats de tractament (Protecció de dades → Documents). Amb un model local (LM Studio) les dades no surten de l'ordinador.

## Còpies de seguretat

- **Automàtiques**: cada dia que el programa està obert se'n fa una a `copies/<entitat>-AAAA-MM-DD.db`, dins la carpeta de dades. Es conserven les dels darrers 7 dies i la primera de cada mes dels darrers 12 mesos. El tauler avisa si fa més de 7 dies que no se'n fa cap.
- **Carpeta externa** (Configuració → Còpia de seguretat): un llapis USB o una carpeta sincronitzada amb el núvol (OneDrive, Google Drive…). Cada còpia s'hi desa també; el botó «Prova» comprova que s'hi pot escriure. Si falla, el tauler ho avisa.
- **Fes una còpia ara** i **Descarrega una còpia** des de la mateixa pantalla.
- **Verificar una còpia**: comprova que el fitxer és correcte i quants registres té (socis, moviments…) sense canviar res.
- **Restaurar** (només administració): puja el fitxer de la còpia; es valida i es restaura **en reiniciar el programa** (icona → **Surt** i tornar-lo a obrir). La base de dades anterior es conserva com a `iaraque.db.abans-restaurar-<data>`. Si la còpia ve d'un altre ordinador, copia-hi també `clau.key` o torna a escriure les contrasenyes guardades.

Restauració manual (si el programa no arrenca): atura'l (icona → **Surt**), mou `iaraque.db`, `iaraque.db-wal` i `iaraque.db-shm` de la carpeta de dades a una altra carpeta, copia el fitxer de la còpia com a `iaraque.db` i torna'l a obrir.

## Per a desenvolupadors

També es pot executar des del codi font, sense instal·lador. En aquesta versió les dades són a la carpeta `data/` del projecte.

### Requisits

[Node.js](https://nodejs.org) 22.18 o superior (s'usa el mòdul SQLite integrat de Node; no cal instal·lar cap base de dades).

### Executar des del codi font

A Windows, fes doble clic a **`Iniciar.bat`**. La primera vegada (i després de cada actualització) instal·la les dependències i prepara l'aplicació; després obre `http://localhost:3000` al navegador. Tanca la finestra d'ordres per aturar-la.

O des d'un terminal:

```bash
git clone <adreça del repositori>
cd iaraque-gestio
npm install
npm run build
npm start
```

Per provar la versió d'escriptori (Electron) des del codi font: `npm run escriptori`.

### Dades de prova

```bash
npm run dades-prova
```

Omple una base de dades buida amb socis, quotes, moviments i activitats d'exemple (2025–2026). Per començar de zero amb dades reals, atura l'aplicació i esborra la carpeta `data`.

### Actualitzar la versió de codi font

Fes doble clic a **`Actualitzar.bat`** amb el programa tancat. Si la carpeta és una còpia de Git, descarrega la versió nova (`git pull`); si no, descomprimeix el ZIP de la versió nova damunt de la carpeta (la carpeta `data` no s'hi inclou i es conserva). Després fa una còpia de seguretat, instal·la les dependències i compila la interfície.

`Iniciar.bat` també ho detecta sol: torna a instal·lar les dependències si ha canviat `package-lock.json`, torna a compilar la interfície si els fonts són més nous que la compilació i, si ha canviat la versió, fa una còpia `data/copies/abans-actualitzar-<versió>-<data>.db` abans d'obrir la base de dades.

### Recuperar l'accés d'administració (codi font)

Des d'un terminal a la carpeta del programa, amb el programa aturat:

```bash
npm run restableix-admin -- <usuari> <nova-contrasenya>
```

### Desenvolupament

```bash
npm run dev
```

Arrenca l'API a `http://localhost:3000` i la interfície amb recàrrega automàtica a `http://localhost:5173`.

Després de canviar el codi, torna a executar `npm run build` (o esborra la carpeta `dist`) perquè `Iniciar.bat` (o `npm start`) serveixi la versió nova.

#### Estructura

```
server/          API (Express + node:sqlite), s'executa directament en TypeScript
  db.ts          esquema i dades inicials
  routes/        socis, quotes, comptabilitat, activitats, informes, configuració
src/             interfície (React + Vite)
shared/          tipus i finalitats estatutàries compartits
data/            base de dades (no es puja a git)
```

Tots els imports es guarden en cèntims (enters) per evitar errors d'arrodoniment.

#### Proves

```bash
npm test
```

Comprova la huella amb els exemples oficials de l'AEAT i que la base de dades impedeix modificar factures emeses.

#### Idiomes

El programa està en català, castellà i anglès:

- **Idioma per defecte de l'entitat**: Configuració → Entitat → «Idioma del programa».
- **Idioma de cada usuari**: el selector del menú lateral (es desa al seu usuari).
- **Idioma de la web pública**: Web → Textos i aparença → «Idioma de la web» (independent del programa).

Els textos s'escriuen en català dins `t("…")` i les traduccions són a `src/i18n/` (interfície) i `server/i18n/` (missatges del servidor i textos de la web). Les dades que entra l'usuari (noms de comptes, categories, finalitats, notícies…) no es tradueixen.

```bash
npm run i18n
```

Llista els textos que encara no tenen traducció.

#### Variables d'entorn

| Variable  | Per defecte        | Ús                                                            |
|-----------|--------------------|---------------------------------------------------------------|
| `PORT`    | `3000`             | Port del servidor                                             |
| `HOST`    | `127.0.0.1`        | Posa `0.0.0.0` per accedir-hi des d'altres equips de la xarxa |
| `DB_PATH` | `data/iaraque.db`  | Ubicació del fitxer de dades (les còpies, `clau.key` i `registre.log` van a la mateixa carpeta) |

### Compilar els instal·ladors

```bash
npm run dist
```

Genera els instal·ladors del sistema operatiu actual (amb electron-builder) a la carpeta `release/`. També hi ha `npm run dist:win`, `npm run dist:mac` i `npm run dist:linux`, però en general cada sistema s'ha de compilar en el seu.

Els instal·ladors de Windows, macOS i Linux els genera el flux de GitHub Actions [`.github/workflows/compila.yml`](.github/workflows/compila.yml) quan es puja una etiqueta `v*`:

```bash
git tag v1.2.0
git push origin v1.2.0
```

## Llicència

Programari lliure amb llicència [MIT](LICENSE): qualsevol persona o entitat el pot fer servir, copiar, modificar i distribuir lliurement, també per adaptar-lo a la seva associació, sempre que es mantingui l'avís de copyright i de llicència. Es lliura tal com és, sense garanties.
