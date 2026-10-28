// Ajuda: articles, preguntes i termes del domini «programa» (instal·lació, tauler, activitats, web,
// xarxes, informes, agent d'IA, configuració, còpies, actualitzacions, seguretat i correu).
import type { Article, Pregunta, Terme } from '../tipus';

export const ARTICLES: Article[] = [
  {
    id: 'treballar-des-de-casa',
    seccio: 'primers-passos',
    titol: { ca: 'Treballar des de casa (cada membre de la junta)', es: 'Trabajar desde casa (cada miembro de la junta)', en: 'Working from home (each board member)' },
    resum: {
      ca: 'Un ordinador fa de servidor i cada persona hi entra des de casa amb el navegador, de manera segura amb Tailscale.',
      es: 'Un ordenador hace de servidor y cada persona entra desde casa con el navegador, de forma segura con Tailscale.',
      en: 'One computer acts as the server and each person logs in from home with a browser, securely through Tailscale.',
    },
    cos: {
      ca: `El programa s'instal·la en **un sol ordinador** (el «servidor»), que guarda totes les dades. Cada persona de la junta hi entra des de casa amb el **navegador**, amb el seu usuari i contrasenya, i veu només el que li toca segons el seu perfil. No cal instal·lar el programa a cap altre lloc: funciona des d'un ordinador, una tauleta o el mòbil.

Per arribar-hi des de fora de casa farem servir **Tailscale**, una xarxa privada i xifrada. Internet no veu el programa: només hi poden arribar els dispositius que tu autoritzis.

# Part 1: l'ordinador del programa (una sola vegada)

Ho fa qui té l'ordinador on està instal·lat el programa.

1. Instal·la **Tailscale** (tailscale.com/download) i crea un compte, millor amb un correu de l'entitat.
2. Deixa'l **sempre encès**: a les opcions d'energia, tria que no se suspengui mai. Al menú de la **icona del programa** (al costat del rellotge), marca **Inicia en engegar l'ordinador** perquè el programa s'obri sol cada vegada que s'engegui l'ordinador.
3. Activa l'accés: [Configuració](/configuracio) → **Accés remot** → marca **Permetre l'accés des d'altres equips de la xarxa**. Després, al menú de la icona del programa, clica **Surt** i torna a obrir el programa.
4. A la mateixa pantalla surt l'**adreça a Tailscale**, per exemple http://100.101.102.103:3000. Aquesta és l'adreça que faran servir tots.
5. Crea un **usuari per a cada persona** a Configuració → **Usuaris**, amb el perfil que li correspon (Junta / Secretaria, Tresoreria, Comunicació…). Mai no compartiu un mateix usuari.

> Consell: activa la còpia de seguretat a **Google Drive** (Configuració → Còpia de seguretat → Carpeta externa). Si aquest ordinador s'espatlla, les dades no es perden.

# Part 2: donar accés a cada persona

La manera més neta és **compartir només aquest ordinador** amb cada persona, que farà servir el seu propi compte de Tailscale (gratuït):

1. Al tauler de Tailscale (login.tailscale.com), a **Machines**, obre el menú de l'ordinador del programa i tria **Share…**.
2. Envia la invitació al correu de la persona.
3. Així aquella persona només pot arribar a l'ordinador del programa, i a res més de la vostra xarxa.

També podeu convidar les persones com a usuaris del mateix compte de Tailscale (Users → Invite users). Consulteu a tailscale.com/pricing quantes persones admet el pla gratuït.

# Part 3: a casa de cada persona

1. Instal·la **Tailscale** a l'ordinador, la tauleta o el mòbil (també hi ha aplicació per a Android i iPhone) i entra-hi amb el teu compte.
2. Accepta la invitació que t'han enviat.
3. Amb Tailscale connectat, obre el navegador i escriu l'adreça del programa (la que comença per http://100.…).
4. Entra amb el teu usuari i contrasenya del programa.
5. Desa l'adreça als preferits (o, al mòbil, «Afegeix a la pantalla d'inici») per no haver-la d'escriure més.

Si no carrega: comprova que Tailscale està connectat al teu dispositiu i que l'ordinador del programa està encès i amb el programa en marxa (la seva icona surt al costat del rellotge).

# Una adreça més fàcil, amb https (opcional)

A l'ordinador del programa, amb Tailscale instal·lat, es pot executar en una finestra d'ordres: tailscale serve --bg 3000. Tailscale dona llavors una adreça amb nom i xifrada del tipus https://nom-de-l-ordinador.xxxx.ts.net, més fàcil de recordar. Cal tenir activats MagicDNS i els certificats HTTPS al tauler de Tailscale (DNS). Amb aquesta opció, ni tan sols cal marcar l'accés des d'altres equips a Configuració.

# Quan algú deixa la junta

1. A Tailscale, deixa de compartir l'ordinador amb aquella persona (o treu-la dels usuaris).
2. Al programa, a Configuració → **Usuaris**, desactiva el seu usuari.
3. Si tenia un agent d'IA connectat, les seves claus deixen de funcionar soles en desactivar l'usuari.

# Bones pràctiques

- **Mai** no obriu el port del programa al router de casa: feu servir sempre Tailscale.
- Cada persona amb el seu usuari i una contrasenya pròpia; tot queda al registre d'activitat.
- Si dues persones editen **la mateixa fitxa alhora**, es queda l'últim canvi desat: parleu-ne abans de tocar el mateix.
- Si l'ordinador del programa s'apaga, ningú no hi pot entrar fins que es torni a engegar.

Per connectar també el teu assistent d'IA des de casa, mira [Fer servir el programa i l'agent des de fora](/ajuda/acces-remot).`,
      es: `El programa se instala en **un solo ordenador** (el «servidor»), que guarda todos los datos. Cada persona de la junta entra desde casa con el **navegador**, con su usuario y contraseña, y ve solo lo que le toca según su perfil. No hay que instalar el programa en ningún otro sitio: funciona desde un ordenador, una tableta o el móvil.

Para llegar desde fuera de casa usaremos **Tailscale**, una red privada y cifrada. Internet no ve el programa: solo pueden llegar los dispositivos que tú autorices.

# Parte 1: el ordenador del programa (una sola vez)

Lo hace quien tiene el ordenador donde está instalado el programa.

1. Instala **Tailscale** (tailscale.com/download) y crea una cuenta, mejor con un correo de la entidad.
2. Déjalo **siempre encendido**: en las opciones de energía, elige que no se suspenda nunca. En el menú del **icono del programa** (junto al reloj), marca **Iniciar al encender el ordenador** para que el programa se abra solo cada vez que se encienda el ordenador.
3. Activa el acceso: [Configuración](/configuracio) → **Acceso remoto** → marca **Permitir el acceso desde otros equipos de la red**. Después, en el menú del icono del programa, haz clic en **Salir** y vuelve a abrir el programa.
4. En la misma pantalla sale la **dirección en Tailscale**, por ejemplo http://100.101.102.103:3000. Esta es la dirección que usaréis todos.
5. Crea un **usuario para cada persona** en Configuración → **Usuarios**, con el perfil que le corresponde (Junta / Secretaría, Tesorería, Comunicación…). Nunca compartáis un mismo usuario.

> Consejo: activa la copia de seguridad en **Google Drive** (Configuración → Copia de seguridad → Carpeta externa). Si este ordenador se estropea, los datos no se pierden.

# Parte 2: dar acceso a cada persona

La forma más limpia es **compartir solo este ordenador** con cada persona, que usará su propia cuenta de Tailscale (gratuita):

1. En el panel de Tailscale (login.tailscale.com), en **Machines**, abre el menú del ordenador del programa y elige **Share…**.
2. Envía la invitación al correo de la persona.
3. Así esa persona solo puede llegar al ordenador del programa, y a nada más de vuestra red.

También podéis invitar a las personas como usuarios de la misma cuenta de Tailscale (Users → Invite users). Consultad en tailscale.com/pricing cuántas personas admite el plan gratuito.

# Parte 3: en casa de cada persona

1. Instala **Tailscale** en el ordenador, la tableta o el móvil (también hay aplicación para Android y iPhone) y entra con tu cuenta.
2. Acepta la invitación que te han enviado.
3. Con Tailscale conectado, abre el navegador y escribe la dirección del programa (la que empieza por http://100.…).
4. Entra con tu usuario y contraseña del programa.
5. Guarda la dirección en favoritos (o, en el móvil, «Añadir a pantalla de inicio») para no tener que escribirla más.

Si no carga: comprueba que Tailscale está conectado en tu dispositivo y que el ordenador del programa está encendido y con el programa en marcha (su icono sale junto al reloj).

# Una dirección más fácil, con https (opcional)

En el ordenador del programa, con Tailscale instalado, se puede ejecutar en una ventana de órdenes: tailscale serve --bg 3000. Tailscale da entonces una dirección con nombre y cifrada del tipo https://nombre-del-ordenador.xxxx.ts.net, más fácil de recordar. Hay que tener activados MagicDNS y los certificados HTTPS en el panel de Tailscale (DNS). Con esta opción, ni siquiera hace falta marcar el acceso desde otros equipos en Configuración.

# Cuando alguien deja la junta

1. En Tailscale, deja de compartir el ordenador con esa persona (o quítala de los usuarios).
2. En el programa, en Configuración → **Usuarios**, desactiva su usuario.
3. Si tenía un agente de IA conectado, sus claves dejan de funcionar solas al desactivar el usuario.

# Buenas prácticas

- **Nunca** abráis el puerto del programa en el router de casa: usad siempre Tailscale.
- Cada persona con su usuario y una contraseña propia; todo queda en el registro de actividad.
- Si dos personas editan **la misma ficha a la vez**, se queda el último cambio guardado: habladlo antes de tocar lo mismo.
- Si el ordenador del programa se apaga, nadie puede entrar hasta que se vuelva a encender.

Para conectar también tu asistente de IA desde casa, mira [Usar el programa y el agente desde fuera](/ajuda/acces-remot).`,
      en: `The program is installed on **a single computer** (the “server”), which holds all the data. Each board member logs in from home with a **web browser**, using their own username and password, and sees only what their profile allows. Nothing needs to be installed anywhere else: it works from a computer, a tablet or a phone.

To reach it from outside we'll use **Tailscale**, a private, encrypted network. The internet can't see the program: only the devices you authorise can reach it.

# Part 1: the program's computer (once)

Done by whoever has the computer where the program is installed.

1. Install **Tailscale** (tailscale.com/download) and create an account, ideally with an organisation email address.
2. Keep it **always on**: in the power options, set it never to sleep. In the menu of the **program's icon** (next to the clock), tick **Start when the computer starts** so the program opens by itself every time the computer starts.
3. Enable access: [Settings](/configuracio) → **Remote access** → tick **Allow access from other computers on the network**. Then, in the program icon's menu, click **Quit** and open the program again.
4. The same screen shows the **Tailscale address**, for example http://100.101.102.103:3000. Everyone will use this address.
5. Create **one user per person** in Settings → **Users**, with the right profile (Board / Secretary, Treasury, Communications…). Never share a user.

> Tip: turn on backups to **Google Drive** (Settings → Backup → External folder). If this computer breaks, the data is safe.

# Part 2: giving each person access

The cleanest way is to **share only this computer** with each person, who uses their own (free) Tailscale account:

1. In the Tailscale admin console (login.tailscale.com), under **Machines**, open the menu of the program's computer and choose **Share…**.
2. Send the invitation to the person's email.
3. That person can then reach only the program's computer, and nothing else on your network.

You can also invite people as users of the same Tailscale account (Users → Invite users). Check tailscale.com/pricing for how many people the free plan allows.

# Part 3: at each person's home

1. Install **Tailscale** on the computer, tablet or phone (there are Android and iPhone apps too) and sign in with your account.
2. Accept the invitation you were sent.
3. With Tailscale connected, open the browser and type the program's address (the one starting with http://100.…).
4. Log in with your program username and password.
5. Bookmark the address (or, on a phone, “Add to Home screen”) so you don't have to type it again.

If it doesn't load: check that Tailscale is connected on your device and that the program's computer is on with the program running (its icon appears next to the clock).

# An easier address with https (optional)

On the program's computer, with Tailscale installed, you can run in a command window: tailscale serve --bg 3000. Tailscale then gives an encrypted, named address like https://computer-name.xxxx.ts.net, easier to remember. MagicDNS and HTTPS certificates must be enabled in the Tailscale admin console (DNS). With this option you don't even need to tick access from other computers in Settings.

# When someone leaves the board

1. In Tailscale, stop sharing the computer with that person (or remove them from the users).
2. In the program, under Settings → **Users**, deactivate their user.
3. If they had an AI agent connected, its keys stop working automatically when the user is deactivated.

# Good practice

- **Never** open the program's port on your home router: always use Tailscale.
- Everyone with their own user and password; everything is recorded in the activity log.
- If two people edit **the same record at the same time**, the last saved change wins: agree before working on the same thing.
- If the program's computer is switched off, nobody can get in until it's back on.

To connect your AI assistant from home as well, see [Using the program and your agent remotely](/ajuda/acces-remot).`,
    },
    paraules: ['casa', 'home', 'remot', 'remoto', 'remote', 'tailscale', 'servidor', 'server', 'junta', 'board', 'navegador', 'browser', 'mòbil', 'móvil', 'phone', 'compartir', 'share', 'accés', 'acceso', 'access'],
  },
  {
    id: 'acces-remot',
    seccio: 'sistema',
    titol: { ca: 'Fer servir el programa i l’agent des de fora', es: 'Usar el programa y el agente desde fuera', en: 'Using the program and your agent remotely' },
    resum: {
      ca: 'Tailscale, xarxa local o túnels per connectar el teu agent d’IA (també Claude web i mòbil i ChatGPT) quan no ets a l’ordinador del programa.',
      es: 'Tailscale, red local o túneles para conectar tu agente de IA (también Claude web y móvil y ChatGPT) cuando no estás en el ordenador del programa.',
      en: 'Tailscale, local network or tunnels to connect your AI agent (including Claude web and mobile and ChatGPT) when you are away from the program’s computer.',
    },
    cos: {
      ca: `El programa funciona a l'ordinador de l'entitat i, per seguretat, només s'obre en aquest ordinador. Si vols fer servir el teu agent d'IA (o el programa) des d'un altre lloc, hi ha tres camins, del més segur al menys.

> Compte: l'ordinador del programa ha d'estar **encès** i amb el programa **en marxa**. Al menú de la icona del programa (al costat del rellotge), marca **Inicia en engegar l'ordinador** i, a les opcions d'energia, tria que no se suspengui. Tancar la finestra del programa no l'atura.

# 1. Xarxa privada amb Tailscale (recomanat)

Tailscale crea una xarxa privada i xifrada entre els teus dispositius. Internet no veu el programa; només els teus equips.

1. Instal·la **Tailscale** (tailscale.com) a l'ordinador del programa i als altres dispositius, amb el mateix compte.
2. A [Configuració](/configuracio) → **Accés remot**, marca **Permetre l'accés des d'altres equips de la xarxa**. Després, al menú de la icona del programa, clica **Surt** i torna a obrir el programa.
3. La mateixa pantalla et mostra l'**adreça a Tailscale** (comença per 100.).
4. A [El meu agent d'IA](/agent-ia) → **Com connectar-lo** → **Des d'un altre ordinador** tens la configuració per a Claude Code, Gemini CLI, VS Code i Cursor, i les indicacions per a Claude Desktop.

També podràs obrir el programa sencer des del navegador de l'altre ordinador, amb el teu usuari i contrasenya. Per donar accés a tota la junta, mira [Treballar des de casa](/ajuda/treballar-des-de-casa).

# 2. Xarxa local

És el mateix sense Tailscale, amb l'adreça local (192.168…). Només funciona dins d'aquella xarxa i el trànsit no va xifrat: fes-ho només en una xarxa de confiança.

# 3. Des del núvol: Claude (web i mòbil) i ChatGPT

Aquestes aplicacions funcionen als servidors d'Anthropic o d'OpenAI, i necessiten una **adreça pública https**. Es fa amb un **túnel** que apunta a l'**entrada per als agents**, un port a part que només dona accés a les eines dels agents, mai al programa.

1. A Configuració → **Accés remot**, marca **Activa l'entrada per als agents** (per defecte, port 3001).
2. Crea el túnel en aquest ordinador. Amb **Tailscale Funnel**: tailscale funnel 3001 (et dona una adreça https://…ts.net). Amb **Cloudflare Tunnel**: cloudflared tunnel --url http://localhost:3001 per provar-ho (l'adreça canvia cada vegada), o un túnel amb nom i el vostre domini per fer-ho fix.
3. Escriu l'adreça https a **Adreça pública** i desa.
4. A Claude: Configuració → Connectors → afegeix un connector personalitzat amb l'adreça que surt a El meu agent d'IA → **Claude (web i mòbil)**. A ChatGPT, un connector o un GPT amb accions.
5. Quan l'aplicació obri la pàgina de connexió, genera un **Codi de connexió** a El meu agent d'IA i escriu-lo. Serveix una sola vegada i caduca en 10 minuts: la teva contrasenya no passa mai pel túnel.

> Consell: fes una clau per dispositiu, posa-hi data de caducitat i, si només vols consultar, tria **Només consultar**. Si perds un dispositiu, revoca'n la clau.

# Què no s'ha de fer

- Obrir el port del programa al router de casa.
- Exposar el port del programa (3000) amb un túnel: exposa només l'entrada per als agents.`,
      es: `El programa funciona en el ordenador de la entidad y, por seguridad, solo se abre en ese ordenador. Si quieres usar tu agente de IA (o el programa) desde otro sitio, hay tres caminos, del más seguro al menos.

> Cuidado: el ordenador del programa tiene que estar **encendido** y con el programa **en marcha**. En el menú del icono del programa (junto al reloj), marca **Iniciar al encender el ordenador** y, en las opciones de energía, elige que no se suspenda. Cerrar la ventana del programa no lo detiene.

# 1. Red privada con Tailscale (recomendado)

Tailscale crea una red privada y cifrada entre tus dispositivos. Internet no ve el programa; solo tus equipos.

1. Instala **Tailscale** (tailscale.com) en el ordenador del programa y en los demás dispositivos, con la misma cuenta.
2. En [Configuración](/configuracio) → **Acceso remoto**, marca **Permitir el acceso desde otros equipos de la red**. Después, en el menú del icono del programa, haz clic en **Salir** y vuelve a abrir el programa.
3. La misma pantalla te muestra la **dirección en Tailscale** (empieza por 100.).
4. En [Mi agente de IA](/agent-ia) → **Cómo conectarlo** → **Desde otro ordenador** tienes la configuración para Claude Code, Gemini CLI, VS Code y Cursor, y las indicaciones para Claude Desktop.

También podrás abrir el programa entero desde el navegador del otro ordenador, con tu usuario y contraseña. Para dar acceso a toda la junta, mira [Trabajar desde casa](/ajuda/treballar-des-de-casa).

# 2. Red local

Es lo mismo sin Tailscale, con la dirección local (192.168…). Solo funciona dentro de esa red y el tráfico no va cifrado: hazlo solo en una red de confianza.

# 3. Desde la nube: Claude (web y móvil) y ChatGPT

Estas aplicaciones funcionan en los servidores de Anthropic o de OpenAI, y necesitan una **dirección pública https**. Se hace con un **túnel** que apunta a la **entrada para los agentes**, un puerto aparte que solo da acceso a las herramientas de los agentes, nunca al programa.

1. En Configuración → **Acceso remoto**, marca **Activar la entrada para los agentes** (por defecto, puerto 3001).
2. Crea el túnel en este ordenador. Con **Tailscale Funnel**: tailscale funnel 3001 (te da una dirección https://…ts.net). Con **Cloudflare Tunnel**: cloudflared tunnel --url http://localhost:3001 para probarlo (la dirección cambia cada vez), o un túnel con nombre y vuestro dominio para que sea fija.
3. Escribe la dirección https en **Dirección pública** y guarda.
4. En Claude: Configuración → Conectores → añade un conector personalizado con la dirección que sale en Mi agente de IA → **Claude (web y móvil)**. En ChatGPT, un conector o un GPT con acciones.
5. Cuando la aplicación abra la página de conexión, genera un **Código de conexión** en Mi agente de IA y escríbelo. Sirve una sola vez y caduca en 10 minutos: tu contraseña nunca pasa por el túnel.

> Consejo: haz una clave por dispositivo, ponle fecha de caducidad y, si solo quieres consultar, elige **Solo consultar**. Si pierdes un dispositivo, revoca su clave.

# Qué no hay que hacer

- Abrir el puerto del programa en el router de casa.
- Exponer el puerto del programa (3000) con un túnel: expón solo la entrada para los agentes.`,
      en: `The program runs on the organisation's computer and, for security, only opens on that computer. If you want to use your AI agent (or the program) from somewhere else, there are three ways, from most to least secure.

> Careful: the program's computer must be **switched on** with the program **running**. In the program icon's menu (next to the clock), tick **Start when the computer starts** and set the power options so it doesn't go to sleep. Closing the program's window does not stop it.

# 1. Private network with Tailscale (recommended)

Tailscale creates a private, encrypted network between your devices. The internet can't see the program; only your devices can.

1. Install **Tailscale** (tailscale.com) on the program's computer and on your other devices, with the same account.
2. In [Settings](/configuracio) → **Remote access**, tick **Allow access from other computers on the network**. Then, in the program icon's menu, click **Quit** and open the program again.
3. The same screen shows the **Tailscale address** (it starts with 100.).
4. In [My AI agent](/agent-ia) → **How to connect it** → **From another computer** you'll find the setup for Claude Code, Gemini CLI, VS Code and Cursor, and the instructions for Claude Desktop.

You can also open the whole program in the other computer's browser, with your username and password. To give the whole board access, see [Working from home](/ajuda/treballar-des-de-casa).

# 2. Local network

The same without Tailscale, using the local address (192.168…). It only works inside that network and traffic is not encrypted: only do it on a trusted network.

# 3. From the cloud: Claude (web and mobile) and ChatGPT

These apps run on Anthropic's or OpenAI's servers and need a **public https address**. This is done with a **tunnel** pointing to the **entrance for agents**, a separate port that only gives access to the agents' tools, never to the program.

1. In Settings → **Remote access**, tick **Enable the entrance for agents** (port 3001 by default).
2. Create the tunnel on this computer. With **Tailscale Funnel**: tailscale funnel 3001 (it gives you an https://…ts.net address). With **Cloudflare Tunnel**: cloudflared tunnel --url http://localhost:3001 to try it (the address changes every time), or a named tunnel with your own domain to make it permanent.
3. Type the https address in **Public address** and save.
4. In Claude: Settings → Connectors → add a custom connector with the address shown in My AI agent → **Claude (web and mobile)**. In ChatGPT, a connector or a GPT with actions.
5. When the app opens the connection page, generate a **Connection code** in My AI agent and type it. It works once and expires in 10 minutes: your password never goes through the tunnel.

> Tip: create one key per device, give it an expiry date and, if you only want to look things up, choose **Read only**. If you lose a device, revoke its key.

# What not to do

- Open the program's port on your home router.
- Expose the program's port (3000) through a tunnel: expose only the entrance for agents.`,
    },
    paraules: ['remot', 'remoto', 'remote', 'tailscale', 'túnel', 'tunnel', 'cloudflare', 'funnel', 'oauth', 'connector', 'conector', 'mòbil', 'móvil', 'mobile', 'chatgpt', 'claude.ai', 'xarxa', 'red', 'network'],
  },
  // ───────────────────────────── Primers passos ─────────────────────────────
  {
    id: 'installar',
    seccio: 'primers-passos',
    titol: {
      ca: 'Instal·lar i obrir el programa',
      es: 'Instalar y abrir el programa',
      en: 'Installing and opening the program',
    },
    resum: {
      ca: 'L\'instal·lador per a Windows, Mac o Linux, els avisos de la primera vegada, la icona del costat del rellotge i on es guarden les dades.',
      es: 'El instalador para Windows, Mac o Linux, los avisos de la primera vez, el icono junto al reloj y dónde se guardan los datos.',
      en: 'The installer for Windows, Mac or Linux, the first-time warnings, the icon next to the clock and where the data is stored.',
    },
    paraules: ['instal·lació', 'instalación', 'install', 'instal·lador', 'instalador', 'installer', 'exe', 'dmg', 'AppImage', 'deb', 'Mac', 'Linux', 'SmartScreen', 'icona', 'icono', 'icon', 'safata', 'bandeja', 'tray', 'carpeta de dades', 'carpeta de datos', 'data folder', 'navegador', 'browser', 'demo', 'demostració', 'demostración', 'arrencar', 'start'],
    cos: {
      ca: `El programa funciona **en un sol ordinador** de l'entitat: les dades es guarden en aquest ordinador i no cal cap servidor a internet. S'instal·la com qualsevol altre programa i **no cal instal·lar res més**.

# Descarregar l'instal·lador

A la pàgina de descàrregues del projecte, tria el fitxer del teu sistema:

- **Windows**: el fitxer acabat en .exe.
- **Mac**: el fitxer acabat en .dmg.
- **Linux**: el fitxer .AppImage (funciona a gairebé totes les distribucions) o el .deb (Ubuntu, Debian, Linux Mint…).

# Instal·lar a Windows

1. Fes doble clic al fitxer .exe que has descarregat.
2. Tria l'idioma de l'instal·lador.
3. Llegeix la llicència i l'avís de responsabilitat i accepta'ls.
4. Tria la carpeta d'instal·lació (la que proposa ja va bé).
5. Deixa marcades les dreceres a l'**escriptori** i al **menú Inici** i acaba la instal·lació.

> Compte: l'instal·lador encara no està signat digitalment, i Windows pot mostrar l'avís «Windows ha protegit l'ordinador». Clica **Més informació** i després **Executa igualment**.

# Instal·lar a Mac

1. Obre el fitxer .dmg.
2. Arrossega la icona del programa a la carpeta **Aplicacions**.
3. La primera vegada, com que el programa encara no està signat, el Mac pot dir que no el pot obrir. Fes clic amb el botó dret (o Control + clic) a la icona del programa a Aplicacions, tria **Obre** i, al missatge, torna a clicar **Obre**. També es pot fer des de Configuració del Sistema → Privadesa i seguretat → **Obre igualment**. Només cal fer-ho la primera vegada.

# Instal·lar a Linux

- **AppImage**: dona-li permís d'execució (botó dret → Propietats → Permet executar el fitxer com un programa, o en un terminal: chmod +x i el nom del fitxer) i fes-hi doble clic.
- **.deb**: fes-hi doble clic per obrir-lo amb l'instal·lador de programes, o en un terminal: sudo apt install ./nom-del-fitxer.deb.

# La primera vegada

El primer cop que s'obre, el programa mostra l'**assistent inicial**: idioma, llicència, dades de l'entitat, el teu usuari d'administració i les persones de la junta. Ho trobareu explicat pas a pas a [L'assistent inicial](/ajuda/assistent-inicial). Tota la resta es configura després a [Configuració](/configuracio).

Si l'entitat ja feia servir el programa en un altre ordinador o amb la versió antiga (Iniciar.bat), mira com portar-hi les dades a [Actualitzar el programa](/ajuda/actualitzar).

# Obrir i tancar el programa

El programa s'obre en **la seva pròpia finestra**: no cal obrir el navegador ni deixar cap altra finestra oberta. Obre'l amb la drecera de l'escriptori o del menú Inici (al Mac, des d'Aplicacions o del Launchpad).

Al costat del rellotge (a la safata del sistema de Windows, a la barra de menús del Mac o a la safata de Linux) hi ha la **icona del programa**. Si tanques la finestra, el programa **continua funcionant**: ho necessiten les persones que hi entren des de casa, els agents d'IA i la còpia de seguretat diària. El menú de la icona té:

- **Obre el programa**: torna a obrir la finestra.
- **Obre al navegador**: obre el programa al navegador d'aquest ordinador.
- **Inicia en engegar l'ordinador**: si la marques, el programa s'obre sol cada vegada que s'engega l'ordinador.
- **Obre la carpeta de dades**: la carpeta on hi ha la base de dades, la clau i les còpies.
- **Surt**: atura el programa del tot.

> Compte: tancar la finestra **no atura** el programa. Per aturar-lo del tot (per exemple, abans d'apagar l'ordinador o de restaurar una còpia), fes servir **Surt** al menú de la icona.

# On es guarden les dades

Totes les dades (la base de dades, el fitxer de clau clau.key i les còpies automàtiques, a la subcarpeta copies) són a la **carpeta de dades**:

- Windows: %APPDATA%\\IAQ Gest\\dades
- Mac: ~/Library/Application Support/IAQ Gest/dades
- Linux: ~/.config/IAQ Gest/dades

La manera més fàcil d'arribar-hi és el menú de la icona → **Obre la carpeta de dades**. Desinstal·lar el programa **no esborra** aquesta carpeta. Vegeu també [Còpies de seguretat i restauració](/ajuda/copies-seguretat).

# El menú

A l'esquerra hi ha el menú agrupat per apartats (**Persones**, **Activitats i difusió**, **Economia**, **Govern i compliment**, **Eines i ajuda**). A sota hi ha el selector d'**Exercici** (l'any de treball), el teu nom, el selector d'idioma i **Surt** (que tanca la teva sessió, no el programa). A cada pantalla, l'ajuda explica el que hi veus.

# La versió de demostració

Hi ha una versió de demostració que funciona directament al navegador, amb dades inventades. Ho pots provar tot, però **els canvis es perden en tornar a carregar la pàgina**, no hi ha usuaris ni còpies de seguretat i no es pot publicar la web ni connectar cap agent d'IA. Serveix per conèixer el programa abans d'instal·lar-lo.`,
      es: `El programa funciona **en un solo ordenador** de la entidad: los datos se guardan en ese ordenador y no hace falta ningún servidor en internet. Se instala como cualquier otro programa y **no hay que instalar nada más**.

# Descargar el instalador

En la página de descargas del proyecto, elige el archivo de tu sistema:

- **Windows**: el archivo terminado en .exe.
- **Mac**: el archivo terminado en .dmg.
- **Linux**: el archivo .AppImage (funciona en casi todas las distribuciones) o el .deb (Ubuntu, Debian, Linux Mint…).

# Instalar en Windows

1. Haz doble clic en el archivo .exe que has descargado.
2. Elige el idioma del instalador.
3. Lee la licencia y el aviso de responsabilidad y acéptalos.
4. Elige la carpeta de instalación (la que propone ya va bien).
5. Deja marcados los accesos directos en el **escritorio** y en el **menú Inicio** y termina la instalación.

> Atención: el instalador todavía no está firmado digitalmente, y Windows puede mostrar el aviso «Windows protegió su PC». Haz clic en **Más información** y después en **Ejecutar de todas formas**.

# Instalar en Mac

1. Abre el archivo .dmg.
2. Arrastra el icono del programa a la carpeta **Aplicaciones**.
3. La primera vez, como el programa todavía no está firmado, el Mac puede decir que no lo puede abrir. Haz clic con el botón derecho (o Control + clic) en el icono del programa en Aplicaciones, elige **Abrir** y, en el mensaje, vuelve a hacer clic en **Abrir**. También se puede hacer desde Ajustes del Sistema → Privacidad y seguridad → **Abrir igualmente**. Solo hace falta la primera vez.

# Instalar en Linux

- **AppImage**: dale permiso de ejecución (botón derecho → Propiedades → Permitir ejecutar el archivo como un programa, o en un terminal: chmod +x y el nombre del archivo) y haz doble clic en él.
- **.deb**: haz doble clic para abrirlo con el instalador de programas, o en un terminal: sudo apt install ./nombre-del-archivo.deb.

# La primera vez

La primera vez que se abre, el programa muestra el **asistente inicial**: idioma, licencia, datos de la entidad, tu usuario de administración y las personas de la junta. Está explicado paso a paso en [El asistente inicial](/ajuda/assistent-inicial). Todo lo demás se configura después en [Configuración](/configuracio).

Si la entidad ya usaba el programa en otro ordenador o con la versión antigua (Iniciar.bat), mira cómo traer los datos en [Actualizar el programa](/ajuda/actualitzar).

# Abrir y cerrar el programa

El programa se abre en **su propia ventana**: no hace falta abrir el navegador ni dejar ninguna otra ventana abierta. Ábrelo con el acceso directo del escritorio o del menú Inicio (en el Mac, desde Aplicaciones o el Launchpad).

Junto al reloj (en la bandeja del sistema de Windows, en la barra de menús del Mac o en la bandeja de Linux) está el **icono del programa**. Si cierras la ventana, el programa **sigue funcionando**: lo necesitan las personas que entran desde casa, los agentes de IA y la copia de seguridad diaria. El menú del icono tiene:

- **Abrir el programa**: vuelve a abrir la ventana.
- **Abrir en el navegador**: abre el programa en el navegador de este ordenador.
- **Iniciar al encender el ordenador**: si la marcas, el programa se abre solo cada vez que se enciende el ordenador.
- **Abrir la carpeta de datos**: la carpeta donde están la base de datos, la clave y las copias.
- **Salir**: detiene el programa del todo.

> Atención: cerrar la ventana **no detiene** el programa. Para detenerlo del todo (por ejemplo, antes de apagar el ordenador o de restaurar una copia), usa **Salir** en el menú del icono.

# Dónde se guardan los datos

Todos los datos (la base de datos, el archivo de clave clau.key y las copias automáticas, en la subcarpeta copies) están en la **carpeta de datos**:

- Windows: %APPDATA%\\IAQ Gest\\dades
- Mac: ~/Library/Application Support/IAQ Gest/dades
- Linux: ~/.config/IAQ Gest/dades

La forma más fácil de llegar es el menú del icono → **Abrir la carpeta de datos**. Desinstalar el programa **no borra** esta carpeta. Véase también [Copias de seguridad y restauración](/ajuda/copies-seguretat).

# El menú

A la izquierda está el menú agrupado por apartados (**Personas**, **Actividades y difusión**, **Economía**, **Gobierno y cumplimiento**, **Herramientas y ayuda**). Debajo están el selector de **Ejercicio** (el año de trabajo), tu nombre, el selector de idioma y **Salir** (que cierra tu sesión, no el programa). En cada pantalla, la ayuda explica lo que ves.

# La versión de demostración

Hay una versión de demostración que funciona directamente en el navegador, con datos inventados. Puedes probarlo todo, pero **los cambios se pierden al volver a cargar la página**, no hay usuarios ni copias de seguridad y no se puede publicar la web ni conectar ningún agente de IA. Sirve para conocer el programa antes de instalarlo.`,
      en: `The program runs **on a single computer** belonging to the association: the data is stored on that computer and no internet server is needed. It installs like any other program and **nothing else needs to be installed**.

# Downloading the installer

On the project's downloads page, choose the file for your system:

- **Windows**: the file ending in .exe.
- **Mac**: the file ending in .dmg.
- **Linux**: the .AppImage file (works on almost every distribution) or the .deb (Ubuntu, Debian, Linux Mint…).

# Installing on Windows

1. Double-click the .exe file you downloaded.
2. Choose the installer's language.
3. Read the licence and the disclaimer and accept them.
4. Choose the installation folder (the suggested one is fine).
5. Leave the **desktop** and **Start menu** shortcuts ticked and finish the installation.

> Warning: the installer is not digitally signed yet, so Windows may show "Windows protected your PC". Click **More info** and then **Run anyway**.

# Installing on a Mac

1. Open the .dmg file.
2. Drag the program's icon to the **Applications** folder.
3. The first time, because the program is not signed yet, the Mac may say it cannot open it. Right-click (or Control-click) the program's icon in Applications, choose **Open** and, in the message, click **Open** again. You can also do it from System Settings → Privacy & Security → **Open Anyway**. This is only needed the first time.

# Installing on Linux

- **AppImage**: give it execute permission (right-click → Properties → Allow executing file as program, or in a terminal: chmod +x followed by the file name) and double-click it.
- **.deb**: double-click it to open it with the software installer, or in a terminal: sudo apt install ./file-name.deb.

# The first time

The first time it opens, the program shows the **setup wizard**: language, licence, organisation details, your administrator user and the board members. It is explained step by step in [The setup wizard](/ajuda/assistent-inicial). Everything else is set up later in [Settings](/configuracio).

If the association already used the program on another computer or with the old version (Iniciar.bat), see how to bring the data across in [Updating the program](/ajuda/actualitzar).

# Opening and closing the program

The program opens in **its own window**: there is no need to open the browser or keep any other window open. Open it with the desktop or Start menu shortcut (on a Mac, from Applications or Launchpad).

Next to the clock (in the Windows system tray, the Mac menu bar or the Linux tray) there is the **program's icon**. If you close the window, the program **keeps running**: people working from home, AI agents and the daily backup need it. The icon's menu has:

- **Open the program**: opens the window again.
- **Open in browser**: opens the program in this computer's browser.
- **Start when the computer starts**: if ticked, the program opens by itself every time the computer starts.
- **Open data folder**: the folder holding the database, the key and the backups.
- **Quit**: stops the program completely.

> Warning: closing the window **does not stop** the program. To stop it completely (for example, before switching off the computer or restoring a backup), use **Quit** in the icon's menu.

# Where the data is stored

All the data (the database, the clau.key key file and the automatic backups, in the copies subfolder) is in the **data folder**:

- Windows: %APPDATA%\\IAQ Gest\\dades
- Mac: ~/Library/Application Support/IAQ Gest/dades
- Linux: ~/.config/IAQ Gest/dades

The easiest way to get there is the icon's menu → **Open data folder**. Uninstalling the program **does not delete** this folder. See also [Backups and restoring](/ajuda/copies-seguretat).

# The menu

On the left is the menu, grouped into sections (**People**, **Activities and outreach**, **Finance**, **Governance and compliance**, **Tools and help**). Below it are the **Financial year** selector (the year you are working on), your name, the language selector and **Sign out** (which ends your session, not the program). On every screen, the help explains what you see.

# The demo version

There is a demo version that runs directly in the browser with made-up data. You can try everything, but **changes are lost when you reload the page**, there are no users or backups, and you cannot publish the website or connect an AI agent. It is meant for getting to know the program before installing it.`,
    },
  },
  {
    id: 'assistent-inicial',
    seccio: 'primers-passos',
    titol: {
      ca: 'L\'assistent inicial',
      es: 'El asistente inicial',
      en: 'The setup wizard',
    },
    resum: {
      ca: 'Els passos de la primera vegada: idioma, llicència, dades de l\'entitat, administrador i persones de la junta amb els seus usuaris.',
      es: 'Los pasos de la primera vez: idioma, licencia, datos de la entidad, administrador y personas de la junta con sus usuarios.',
      en: 'The first-time steps: language, licence, organisation details, administrator and board members with their users.',
    },
    paraules: ['assistent', 'asistente', 'wizard', 'primera vegada', 'primera vez', 'first run', 'configuració inicial', 'configuración inicial', 'setup', 'benvinguda', 'bienvenida', 'welcome', 'llicència', 'licencia', 'licence', 'contrasenya inicial', 'contraseña inicial', 'initial password'],
    cos: {
      ca: `El primer cop que s'obre el programa en un ordinador nou (amb la carpeta de dades buida), surt un assistent que us guia per deixar-lo a punt en pocs minuts. Ho ha de fer la persona que administrarà el programa.

# Pas a pas

1. **Benvinguda i idioma.** Tria l'idioma del programa (català, castellà o anglès). Serà l'idioma per defecte de l'entitat; cada persona el pot canviar després al menú lateral.
2. **Llicència i avís.** Llegeix la llicència i l'avís de responsabilitat i marca que els acceptes. Sense acceptar-los no es pot continuar.
3. **Dades de l'entitat.** El nom de l'entitat i les dades bàsiques. Tot es pot completar o canviar després a [Configuració](/configuracio), pestanya **Entitat**.
4. **Compte d'administració.** El teu nom, el nom d'usuari amb què entraràs i una contrasenya (almenys 8 caràcters). Aquest usuari té el perfil **Administració**: accés total, inclosos els usuaris i la configuració.
5. **Persones clau.** Afegeix les persones que treballaran amb el programa: presidència, secretaria, tresoreria, vocals, comunicació… Per a cadascuna hi ha un **nom d'usuari**, una **contrasenya inicial** i el **perfil** suggerit segons el càrrec (per exemple, **Tresoreria** per a qui porta els comptes o **Comunicació** per a qui porta la web i les xarxes). Ho pots canviar tot. Vegeu [Perfils i permisos](/ajuda/perfils-i-permisos).
6. **Resum.** Revisa-ho tot i confirma.

# En acabar

L'assistent mostra la llista dels usuaris creats amb les seves **contrasenyes inicials**. Apunta-la o imprimeix-la i dona a cada persona les seves dades d'entrada, de manera privada.

> Compte: les contrasenyes es guarden protegides i després no es poden tornar a consultar. Si algú perd la seva, l'administració n'hi pot posar una de nova a Configuració → **Usuaris**.

Cada persona ha de **canviar la contrasenya inicial** el primer cop que entri: [Configuració](/configuracio) → **Usuaris** → **La meva contrasenya**.

# I després?

- Completeu la configuració seguint [Primers passos per a una entitat nova](/ajuda/primers-passos-entitat-nova).
- Si la junta ha d'entrar des de casa, mireu [Treballar des de casa](/ajuda/treballar-des-de-casa).
- Les persones que no heu afegit a l'assistent es poden crear quan vulgueu a Configuració → **Usuaris**.`,
      es: `La primera vez que se abre el programa en un ordenador nuevo (con la carpeta de datos vacía), sale un asistente que os guía para dejarlo listo en pocos minutos. Debe hacerlo la persona que administrará el programa.

# Paso a paso

1. **Bienvenida e idioma.** Elige el idioma del programa (catalán, castellano o inglés). Será el idioma por defecto de la entidad; cada persona puede cambiarlo después en el menú lateral.
2. **Licencia y aviso.** Lee la licencia y el aviso de responsabilidad y marca que los aceptas. Sin aceptarlos no se puede continuar.
3. **Datos de la entidad.** El nombre de la entidad y los datos básicos. Todo se puede completar o cambiar después en [Configuración](/configuracio), pestaña **Entidad**.
4. **Cuenta de administración.** Tu nombre, el nombre de usuario con el que entrarás y una contraseña (al menos 8 caracteres). Este usuario tiene el perfil **Administración**: acceso total, incluidos los usuarios y la configuración.
5. **Personas clave.** Añade las personas que trabajarán con el programa: presidencia, secretaría, tesorería, vocales, comunicación… Para cada una hay un **nombre de usuario**, una **contraseña inicial** y el **perfil** sugerido según el cargo (por ejemplo, **Tesorería** para quien lleva las cuentas o **Comunicación** para quien lleva la web y las redes). Puedes cambiarlo todo. Véase [Perfiles y permisos](/ajuda/perfils-i-permisos).
6. **Resumen.** Revísalo todo y confirma.

# Al terminar

El asistente muestra la lista de los usuarios creados con sus **contraseñas iniciales**. Apúntala o imprímela y da a cada persona sus datos de entrada, de forma privada.

> Atención: las contraseñas se guardan protegidas y después no se pueden volver a consultar. Si alguien pierde la suya, la administración le puede poner una nueva en Configuración → **Usuarios**.

Cada persona debe **cambiar la contraseña inicial** la primera vez que entre: [Configuración](/configuracio) → **Usuarios** → **Mi contraseña**.

# ¿Y después?

- Completad la configuración siguiendo [Primeros pasos para una entidad nueva](/ajuda/primers-passos-entitat-nova).
- Si la junta tiene que entrar desde casa, mirad [Trabajar desde casa](/ajuda/treballar-des-de-casa).
- Las personas que no habéis añadido en el asistente se pueden crear cuando queráis en Configuración → **Usuarios**.`,
      en: `The first time the program opens on a new computer (with an empty data folder), a wizard guides you through getting it ready in a few minutes. It should be done by the person who will administer the program.

# Step by step

1. **Welcome and language.** Choose the program's language (Catalan, Spanish or English). It will be the association's default language; each person can change it later in the side menu.
2. **Licence and disclaimer.** Read the licence and the disclaimer and tick that you accept them. You cannot continue without accepting them.
3. **Organisation details.** The association's name and basic details. Everything can be completed or changed later in [Settings](/configuracio), **Organisation** tab.
4. **Administrator account.** Your name, the username you will sign in with and a password (at least 8 characters). This user has the **Administration** profile: full access, including users and settings.
5. **Key people.** Add the people who will work with the program: chair, secretary, treasurer, board members, communications… For each one there is a **username**, an **initial password** and a **profile** suggested from their role (for example, **Treasury** for whoever keeps the accounts or **Communications** for whoever runs the website and social media). You can change all of it. See [Profiles and permissions](/ajuda/perfils-i-permisos).
6. **Summary.** Check everything and confirm.

# When you finish

The wizard shows the list of users created with their **initial passwords**. Write it down or print it and give each person their sign-in details privately.

> Warning: passwords are stored protected and cannot be looked up again later. If someone loses theirs, the administrator can set a new one in Settings → **Users**.

Each person should **change their initial password** the first time they sign in: [Settings](/configuracio) → **Users** → **My password**.

# What next?

- Finish the setup following [First steps for a new organisation](/ajuda/primers-passos-entitat-nova).
- If the board needs to work from home, see [Working from home](/ajuda/treballar-des-de-casa).
- People you did not add in the wizard can be created at any time in Settings → **Users**.`,
    },
  },
  {
    id: 'idiomes',
    seccio: 'primers-passos',
    titol: { ca: 'Idiomes', es: 'Idiomas', en: 'Languages' },
    resum: {
      ca: 'El programa en català, castellà o anglès: per a cada usuari, per defecte per a l\'entitat i, a part, l\'idioma de la web.',
      es: 'El programa en catalán, castellano o inglés: para cada usuario, por defecto para la entidad y, aparte, el idioma de la web.',
      en: 'The program in Catalan, Spanish or English: per user, as the association default and, separately, the website language.',
    },
    paraules: ['idioma', 'language', 'català', 'castellano', 'english', 'traducció', 'traducción', 'translation', 'catalán', 'Catalan', 'Spanish'],
    cos: {
      ca: `El programa es pot fer servir en **català**, **castellà** i **anglès**. Hi ha tres preferències diferents, i cadascuna té el seu lloc.

# El teu idioma

A la part de baix del menú lateral, al costat del teu nom, hi ha un selector d'idioma. Tria-hi el que vulguis: la pantalla canvia a l'instant i **es desa al teu usuari**, de manera que la propera vegada que entris ja sortirà en aquest idioma, encara que sigui des d'un altre navegador. Cada persona de la junta pot tenir el seu.

# L'idioma per defecte de l'entitat

És l'idioma amb què surt el programa per a qui encara no n'ha triat cap (per exemple, la pantalla d'entrada o un usuari nou).

1. Ves a [Configuració](/configuracio), pestanya **Entitat**.
2. Al camp **Idioma del programa**, tria l'idioma.
3. Desa.

# L'idioma de la web pública

La web de l'entitat té el seu propi idioma, independent del programa: hi pots treballar en castellà i publicar la web en català.

1. Ves a [Web](/web), pestanya **Textos i xarxes**.
2. Al camp **Idioma de la web**, tria'n un o deixa **El del programa**.

Aquest idioma s'aplica als **textos fixos** de la web: el menú, els botons, l'avís legal, la política de privacitat…

# Què no es tradueix

Les dades que escriviu vosaltres **no es tradueixen soles**: noms de socis, activitats, notícies, finalitats, comptes, categories o textos de les pàgines surten tal com els vau escriure. Si voleu la web en dos idiomes, cal escriure els textos en tots dos.

> Consell: els documents oficials (memòria, llibre registre, compte de resultats) surten en l'idioma que tinguis triat en aquell moment. Canvia l'idioma abans d'imprimir-los si els necessites en un altre.`,
      es: `El programa se puede usar en **catalán**, **castellano** e **inglés**. Hay tres preferencias distintas, y cada una tiene su sitio.

# Tu idioma

En la parte de abajo del menú lateral, junto a tu nombre, hay un selector de idioma. Elige el que quieras: la pantalla cambia al instante y **se guarda en tu usuario**, de modo que la próxima vez que entres ya saldrá en ese idioma, aunque sea desde otro navegador. Cada persona de la junta puede tener el suyo.

# El idioma por defecto de la entidad

Es el idioma con el que sale el programa para quien aún no ha elegido ninguno (por ejemplo, la pantalla de entrada o un usuario nuevo).

1. Ve a [Configuración](/configuracio), pestaña **Entidad**.
2. En el campo **Idioma del programa**, elige el idioma.
3. Guarda.

# El idioma de la web pública

La web de la entidad tiene su propio idioma, independiente del programa: puedes trabajar en castellano y publicar la web en catalán.

1. Ve a [Web](/web), pestaña **Textos y redes**.
2. En el campo **Idioma de la web**, elige uno o deja **El del programa**.

Este idioma se aplica a los **textos fijos** de la web: el menú, los botones, el aviso legal, la política de privacidad…

# Qué no se traduce

Los datos que escribís vosotros **no se traducen solos**: nombres de socios, actividades, noticias, finalidades, cuentas, categorías o textos de las páginas salen tal como los escribisteis. Si queréis la web en dos idiomas, hay que escribir los textos en ambos.

> Consejo: los documentos oficiales (memoria, libro registro, cuenta de resultados) salen en el idioma que tengas elegido en ese momento. Cambia el idioma antes de imprimirlos si los necesitas en otro.`,
      en: `The program can be used in **Catalan**, **Spanish** and **English**. There are three separate preferences, each set in its own place.

# Your language

At the bottom of the side menu, next to your name, there is a language selector. Choose the one you want: the screen changes instantly and **it is saved to your user**, so the next time you sign in it will already be in that language, even from another browser. Each board member can have their own.

# The association's default language

This is the language the program uses for anyone who hasn't chosen one yet (for example, the sign-in screen or a new user).

1. Go to [Settings](/configuracio), **Organisation** tab.
2. In the **Program language** field, choose the language.
3. Save.

# The public website language

The association's website has its own language, independent of the program: you can work in English and publish the website in Catalan.

1. Go to [Website](/web), **Texts and social media** tab.
2. In the **Website language** field, choose one or leave **Same as the program**.

This language applies to the website's **fixed texts**: the menu, buttons, legal notice, privacy policy…

# What is not translated

The data you type in yourselves **is not translated automatically**: names of members, activities, news, purposes, accounts, categories or page texts appear exactly as you wrote them. If you want the website in two languages, you need to write the texts in both.

> Tip: official documents (activity report, register of members, income statement) come out in the language you have selected at that moment. Change the language before printing if you need them in another one.`,
    },
  },

  // ───────────────────────────── Activitats i difusió ─────────────────────────────
  {
    id: 'tauler',
    seccio: 'activitats',
    titol: { ca: 'El tauler', es: 'El panel', en: 'The dashboard' },
    resum: {
      ca: 'La pantalla d\'inici: xifres de l\'exercici, avisos, el que hi ha per fer i el calendari d\'obligacions.',
      es: 'La pantalla de inicio: cifras del ejercicio, avisos, lo que hay por hacer y el calendario de obligaciones.',
      en: 'The home screen: figures for the year, alerts, things to do and the obligations calendar.',
    },
    rutes: ['/'],
    paraules: ['inici', 'inicio', 'home', 'resum', 'resumen', 'summary', 'avisos', 'alerts', 'obligacions', 'obligaciones', 'calendari', 'calendario', 'aniversaris', 'cumpleaños', 'birthdays', 'per fer', 'dashboard', 'panel'],
    cos: {
      ca: `El **Tauler** és la primera pantalla que veus en entrar. Resumeix l'**exercici** triat al menú lateral i us diu què demana atenció. Només el veuen els perfils que tenen accés als informes; la resta entren directament a la seva primera pantalla.

# Les xifres

A dalt hi ha quatre xifres:

- **Socis actius**, amb les altes i baixes de l'exercici.
- **Saldo disponible**: la suma de tots els comptes, avui.
- **Ingressos** i despeses de l'exercici.
- **Resultat**: si l'any va amb superàvit o dèficit.

# Avisos

Són els avisos dels mòduls del programa: terminis legals que s'acosten, còpies de seguretat que fa dies que no es fan o que no s'han pogut desar a la carpeta externa, mandats de la junta que acaben… Els vermells són urgents. Clica'n un per anar directament a la pantalla on es resol.

# Per fer

Recull les coses del dia a dia:

- **Tasques properes** (de [Seguiment](/seguiment)), amb les vençudes en vermell.
- **Aniversaris (14 dies)** dels socis.
- **Avisos**: persones interessades pendents de seguiment, quotes d'anys anteriors sense cobrar i socis sense el consentiment RGPD signat.

Si no hi ha res pendent, aquest bloc no surt.

# Calendari d'obligacions

Llista, mes a mes, les obligacions habituals d'una associació: assemblea, models fiscals, Registre d'Associacions, assegurances, subvencions… Amb les fletxes canvies d'any. Cada una té un estat: **Fet**, **Pendent**, **No cal** o **Per comprovar**. Les que el programa no pot comprovar sol es poden marcar amb **Marca-ho com a fet**. La casella **Amaga les que no calen** treu les que no us afecten.

> Compte: són terminis generals; comproveu-los amb la vostra gestoria.

# Més avall

- **Composició intergeneracional**: socis actius per franja d'edat i per gènere.
- **Quotes**: quant s'ha cobrat del previst i quantes en queden de pendents.
- **Saldos per compte**, **Darrers moviments** i **Properes activitats**.`,
      es: `El **Panel** es la primera pantalla que ves al entrar. Resume el **ejercicio** elegido en el menú lateral y os dice qué requiere atención. Solo lo ven los perfiles con acceso a los informes; los demás entran directamente en su primera pantalla.

# Las cifras

Arriba hay cuatro cifras:

- **Socios activos**, con las altas y bajas del ejercicio.
- **Saldo disponible**: la suma de todas las cuentas, hoy.
- **Ingresos** y gastos del ejercicio.
- **Resultado**: si el año va con superávit o déficit.

# Avisos

Son los avisos de los módulos del programa: plazos legales que se acercan, copias de seguridad que hace días que no se hacen o que no se han podido guardar en la carpeta externa, mandatos de la junta que terminan… Los rojos son urgentes. Haz clic en uno para ir directamente a la pantalla donde se resuelve.

# Por hacer

Recoge las cosas del día a día:

- **Próximas tareas** (de [Seguimiento](/seguiment)), con las vencidas en rojo.
- **Cumpleaños (14 días)** de los socios.
- **Avisos**: personas interesadas pendientes de seguimiento, cuotas de años anteriores sin cobrar y socios sin el consentimiento RGPD firmado.

Si no hay nada pendiente, este bloque no aparece.

# Calendario de obligaciones

Lista, mes a mes, las obligaciones habituales de una asociación: asamblea, modelos fiscales, Registro de Asociaciones, seguros, subvenciones… Con las flechas cambias de año. Cada una tiene un estado: **Hecho**, **Pendiente**, **No es necesario** o **Por comprobar**. Las que el programa no puede comprobar solo se pueden marcar con **Marcarlo como hecho**. La casilla **Ocultar las que no son necesarias** quita las que no os afectan.

> Atención: son plazos generales; comprobadlos con vuestra gestoría.

# Más abajo

- **Composición intergeneracional**: socios activos por franja de edad y por género.
- **Cuotas**: cuánto se ha cobrado de lo previsto y cuántas quedan pendientes.
- **Saldos por cuenta**, **Últimos movimientos** y **Próximas actividades**.`,
      en: `The **Dashboard** is the first screen you see when you sign in. It summarises the **financial year** chosen in the side menu and tells you what needs attention. Only profiles with access to reports see it; everyone else goes straight to their first screen.

# The figures

At the top there are four figures:

- **Active members**, with the members who joined and left this year.
- **Available balance**: the total of all accounts, today.
- **Income** and expenses for the year.
- **Result**: whether the year shows a surplus or a deficit.

# Alerts

These are alerts from the program's modules: legal deadlines coming up, backups that haven't been made for days or couldn't be saved to the external folder, board terms ending… Red ones are urgent. Click one to go straight to the screen where you can deal with it.

# To do

Collects the day-to-day items:

- **Upcoming tasks** (from [Follow-up](/seguiment)), with overdue ones in red.
- Members' **Birthdays (14 days)**.
- **Alerts**: prospects awaiting follow-up, unpaid fees from previous years and members without a signed GDPR consent.

If nothing is pending, this block is hidden.

# Obligations calendar

Lists, month by month, the usual obligations of an association: general assembly, tax forms, Register of Associations, insurance, grants… Use the arrows to change year. Each item has a status: **Done**, **Pending**, **Not needed** or **To check**. Items the program cannot check by itself can be marked with **Mark as done**. The **Hide those not needed** box removes the ones that don't apply to you.

> Warning: these are general deadlines; check them with your accountant.

# Further down

- **Members by generation**: active members by age group and by gender.
- **Fees**: how much has been collected out of the expected total and how many are still pending.
- **Balances by account**, **Recent transactions** and **Upcoming activities**.`,
    },
  },
  {
    id: 'activitats',
    seccio: 'activitats',
    titol: { ca: 'Activitats', es: 'Actividades', en: 'Activities' },
    resum: {
      ca: 'Crear i planificar una activitat: dates, responsable, pressupost, finalitats estatutàries, tasques, documents i entitats col·laboradores.',
      es: 'Crear y planificar una actividad: fechas, responsable, presupuesto, finalidades estatutarias, tareas, documentos y entidades colaboradoras.',
      en: 'Creating and planning an activity: dates, person in charge, budget, statutory purposes, tasks, documents and partner organisations.',
    },
    rutes: ['/activitats'],
    paraules: ['activitat', 'actividad', 'activity', 'event', 'esdeveniment', 'taller', 'pressupost', 'presupuesto', 'budget', 'finalitats', 'finalidades', 'purposes', 'tasques', 'tareas', 'tasks', 'col·laboradors', 'partners', 'agenda'],
    cos: {
      ca: `A **Activitats** hi ha el programa d'activitats de l'exercici triat al menú. La llista mostra per a cada activitat la data, l'estat, les finalitats, els participants (inscrits i places, persones en espera, assistents) i el balanç econòmic.

# Crear una activitat

1. Clica **+ Nova activitat**.
2. Omple **Nom de l'activitat**, **Data d'inici**, **Data de fi (opcional)** i **Lloc**.
3. Tria l'**Estat**: Idea, En preparació, Confirmada, Feta o Anul·lada.
4. Escriu una **Descripció** (surt a l'agenda de la web) i, si vols, afegeix una imatge o cartell.
5. Clica **Desa**. A partir d'aquí apareixen les altres pestanyes.

# Planificació

Dins l'apartat **Planificació** hi ha:

- **Persona responsable** de l'activitat.
- **Places**: en blanc, sense límit. Quan és ple, les inscripcions van a la llista d'espera.
- **Pressupost previst (€)**: el programa el compara amb les despeses reals vinculades i avisa si s'ha superat.
- **Públic objectiu** i **Materials i necessitats**.

Els ingressos i les despeses de l'activitat surten dels moviments que hi vinculeu a [Comptabilitat](/moviments).

# Finalitats estatutàries

Marca a **Finalitats estatutàries a què respon** quins objectius dels Estatuts compleix l'activitat. És important: la memòria anual s'organitza per finalitats. Les finalitats es defineixen a [Configuració](/configuracio), pestanya Entitat.

# Les pestanyes de l'activitat

- **Fitxa**: les dades de l'activitat.
- **Inscripcions** i **Passar llista**: vegeu [Inscripcions, llista d'espera i menors](/ajuda/inscripcions).
- **Tasques**: coses per fer, amb responsable i data límit. Les pendents surten a la llista d'activitats.
- **Documents**: el **Full d'assistència** per signar i les **Autoritzacions de menors**, a punt per imprimir.
- **Col·laboradors**: entitats que hi participen i el seu paper.

# Web i xarxes

Marca **Mostra aquesta activitat a l'agenda de la web** perquè surti a la web pública en la propera publicació. Des de [Xarxes socials](/xarxes) pots preparar-ne una publicació a partir de l'activitat.

> Consell: el camp **Participants (recompte manual)** només cal si no feu servir ni la llista d'inscripcions ni el comptador d'assistents.`,
      es: `En **Actividades** está el programa de actividades del ejercicio elegido en el menú. La lista muestra para cada actividad la fecha, el estado, las finalidades, los participantes (inscritos y plazas, personas en espera, asistentes) y el balance económico.

# Crear una actividad

1. Haz clic en **+ Nueva actividad**.
2. Rellena **Nombre de la actividad**, **Fecha de inicio**, **Fecha de fin (opcional)** y **Lugar**.
3. Elige el **Estado**: Idea, En preparación, Confirmada, Realizada o Anulada.
4. Escribe una **Descripción** (sale en la agenda de la web) y, si quieres, añade una imagen o cartel.
5. Haz clic en **Guardar**. A partir de aquí aparecen las demás pestañas.

# Planificación

Dentro del apartado **Planificación** hay:

- **Persona responsable** de la actividad.
- **Plazas**: en blanco, sin límite. Cuando está lleno, las inscripciones van a la lista de espera.
- **Presupuesto previsto (€)**: el programa lo compara con los gastos reales vinculados y avisa si se ha superado.
- **Público objetivo** y **Materiales y necesidades**.

Los ingresos y gastos de la actividad salen de los movimientos que vinculéis en [Contabilidad](/moviments).

# Finalidades estatutarias

Marca en **Finalidades estatutarias a las que responde** qué objetivos de los Estatutos cumple la actividad. Es importante: la memoria anual se organiza por finalidades. Las finalidades se definen en [Configuración](/configuracio), pestaña Entidad.

# Las pestañas de la actividad

- **Ficha**: los datos de la actividad.
- **Inscripciones** y **Pasar lista**: véase [Inscripciones, lista de espera y menores](/ajuda/inscripcions).
- **Tareas**: cosas por hacer, con responsable y fecha límite. Las pendientes salen en la lista de actividades.
- **Documentos**: la **Hoja de asistencia** para firmar y las **Autorizaciones de menores**, listas para imprimir.
- **Colaboradores**: entidades que participan y su papel.

# Web y redes

Marca **Mostrar esta actividad en la agenda de la web** para que salga en la web pública en la próxima publicación. Desde [Redes sociales](/xarxes) puedes preparar una publicación a partir de la actividad.

> Consejo: el campo **Participantes (recuento manual)** solo hace falta si no usáis ni la lista de inscripciones ni el contador de asistentes.`,
      en: `**Activities** holds the activity programme for the financial year chosen in the menu. For each activity the list shows the date, status, purposes, participants (registered and places, people waiting, attendees) and the financial balance.

# Creating an activity

1. Click **+ New activity**.
2. Fill in **Activity name**, **Start date**, **End date (optional)** and **Place**.
3. Choose the **Status**: Idea, In preparation, Confirmed, Done or Cancelled.
4. Write a **Description** (shown in the website events) and, if you like, add an image or poster.
5. Click **Save**. The other tabs then appear.

# Planning

The **Planning** section contains:

- **Person in charge** of the activity.
- **Places**: blank means unlimited. When full, new registrations go to the waiting list.
- **Planned budget (€)**: the program compares it with the actual linked expenses and warns you if it has been exceeded.
- **Target audience** and **Materials and needs**.

The activity's income and expenses come from the transactions you link to it in [Accounts](/moviments).

# Statutory purposes

Under **Statutory purposes it serves**, tick which aims from the Statutes the activity fulfils. This matters: the annual activity report is organised by purpose. Purposes are defined in [Settings](/configuracio), Organisation tab.

# The activity tabs

- **Record**: the activity's details.
- **Registrations** and **Check-in**: see [Registrations, waiting list and minors](/ajuda/inscripcions).
- **Tasks**: things to do, with a person in charge and a due date. Pending ones are shown in the activity list.
- **Documents**: the **Attendance sheet** for signing and the **Authorisations for minors**, ready to print.
- **Partners**: organisations taking part and their role.

# Website and social media

Tick **Show this activity in the website events** so it appears on the public website the next time it is published. From [Social media](/xarxes) you can prepare a post based on the activity.

> Tip: the **Participants (manual count)** field is only needed if you use neither the registration list nor the attendee counter.`,
    },
  },
  {
    id: 'inscripcions',
    seccio: 'activitats',
    titol: {
      ca: 'Inscripcions, llista d\'espera i menors',
      es: 'Inscripciones, lista de espera y menores',
      en: 'Registrations, waiting list and minors',
    },
    resum: {
      ca: 'Inscriure socis i persones de fora, gestionar les places, autoritzacions dels tutors, drets d\'imatge i passar llista.',
      es: 'Inscribir socios y personas externas, gestionar las plazas, autorizaciones de los tutores, derechos de imagen y pasar lista.',
      en: 'Registering members and outsiders, managing places, guardian authorisations, image rights and checking people in.',
    },
    paraules: ['inscripció', 'inscripción', 'registration', 'llista d\'espera', 'lista de espera', 'waiting list', 'menors', 'menores', 'minors', 'tutor', 'autorització', 'autorización', 'drets d\'imatge', 'derechos de imagen', 'image rights', 'passar llista', 'pasar lista', 'check-in', 'assistència', 'asistencia', 'attendance'],
    cos: {
      ca: `Obre una activitat des de [Activitats](/activitats) i ves a la pestanya **Inscripcions**.

# Inscriure algú

1. A **Qui s'inscriu**, tria **Soci/sòcia**, **Persona interessada** o **Persona de fora** (algú que no és a la base de dades: n'escrius el nom, el telèfon, el correu i la data de naixement).
2. Tria la persona de la llista o omple les dades.
3. Si és menor d'edat, omple el **Pare, mare o tutor/a** i el **Telèfon del tutor/a**.
4. Indica els **Drets d'imatge**: si autoritza o no l'ús de la seva imatge en aquesta activitat.
5. Clica **Inscriu**.

Les dades personals d'un soci es canvien a la seva fitxa, no aquí.

# Places i llista d'espera

Si l'activitat té **Places** i ja és plena, la inscripció nova va a la **Llista d'espera (per ordre d'arribada)**. Quan algú cancel·la, el primer de la llista hi entra sol i el programa t'avisa: «Han entrat de la llista d'espera. Avisa'ls que ja tenen plaça». Quan els hagis avisat, clica **Ja els he avisat**. Amb **Dona plaça** pots fer entrar algú encara que l'activitat sigui plena.

> Consell: si algú es dona de baixa, millor **cancel·la** la inscripció que esborrar-la: així en queda constància.

# Menors i autoritzacions

A la llista, els menors sense autorització signada del tutor porten l'avís **⚠ Autorització**. A la pestanya **Documents**, a **Autoritzacions de menors**, s'imprimeix un full per a cada menor amb les dades ja emplenades (o **Imprimeix-ne una en blanc**). Quan el tornin signat, clica el nom a la llista i anota'n la data a **Autorització signada el**.

# Drets d'imatge

Qui no ha autoritzat l'ús de la imatge (o no en consta el consentiment) porta l'avís **⊘ Imatge**. Sense consentiment **no se'n poden publicar fotos ni vídeos** on se'l reconegui. La web i les xarxes us ho tornaran a recordar quan publiqueu alguna cosa d'aquesta activitat.

# Passar llista

El dia de l'activitat, a la pestanya **Passar llista**:

- Marca la casella de qui **Hi ha assistit**. A dalt veus «Han arribat X de Y».
- Si ve algú que no s'havia inscrit, escriu-ne el nom i clica **Afegeix com a assistent**.
- Si no voleu noms, fes servir el comptador **Un més** / **Un menys** dels assistents sense inscripció.

L'assistència és la base dels [indicadors d'impacte](/ajuda/informes) de la memòria.`,
      es: `Abre una actividad desde [Actividades](/activitats) y ve a la pestaña **Inscripciones**.

# Inscribir a alguien

1. En **Quién se inscribe**, elige **Socio/a**, **Persona interesada** o **Persona externa** (alguien que no está en la base de datos: escribes su nombre, teléfono, correo y fecha de nacimiento).
2. Elige la persona de la lista o rellena los datos.
3. Si es menor de edad, rellena **Padre, madre o tutor/a** y **Teléfono del tutor/a**.
4. Indica los **Derechos de imagen**: si autoriza o no el uso de su imagen en esta actividad.
5. Haz clic en **Inscribir**.

Los datos personales de un socio se cambian en su ficha, no aquí.

# Plazas y lista de espera

Si la actividad tiene **Plazas** y ya está llena, la nueva inscripción va a la **Lista de espera (por orden de llegada)**. Cuando alguien cancela, el primero de la lista entra solo y el programa te avisa: «Han entrado desde la lista de espera. Avísales de que ya tienen plaza». Cuando les hayas avisado, haz clic en **Ya les he avisado**. Con **Dar plaza** puedes hacer entrar a alguien aunque la actividad esté llena.

> Consejo: si alguien se da de baja, mejor **cancela** la inscripción que borrarla: así queda constancia.

# Menores y autorizaciones

En la lista, los menores sin autorización firmada del tutor llevan el aviso **⚠ Autorización**. En la pestaña **Documentos**, en **Autorizaciones de menores**, se imprime una hoja para cada menor con los datos ya rellenados (o **Imprimir una en blanco**). Cuando la devuelvan firmada, haz clic en el nombre en la lista y anota la fecha en **Autorización firmada el**.

# Derechos de imagen

Quien no ha autorizado el uso de su imagen (o no consta el consentimiento) lleva el aviso **⊘ Imagen**. Sin consentimiento **no se pueden publicar fotos ni vídeos** en los que se le reconozca. La web y las redes os lo volverán a recordar cuando publiquéis algo de esta actividad.

# Pasar lista

El día de la actividad, en la pestaña **Pasar lista**:

- Marca la casilla de quien **Ha asistido**. Arriba ves «Han llegado X de Y».
- Si viene alguien que no se había inscrito, escribe su nombre y haz clic en **Añadir como asistente**.
- Si no queréis nombres, usa el contador **Uno más** / **Uno menos** de los asistentes sin inscripción.

La asistencia es la base de los [indicadores de impacto](/ajuda/informes) de la memoria.`,
      en: `Open an activity from [Activities](/activitats) and go to the **Registrations** tab.

# Registering someone

1. Under **Who is registering**, choose **Member**, **Prospect** or **External person** (someone not in the database: you type their name, phone, email and date of birth).
2. Choose the person from the list or fill in the details.
3. If they are under 18, fill in **Parent or guardian** and **Guardian's phone**.
4. Set the **Image rights**: whether or not they allow their image to be used for this activity.
5. Click **Register**.

A member's personal details are changed on their record, not here.

# Places and waiting list

If the activity has **Places** and is already full, the new registration goes to the **Waiting list (in order of arrival)**. When someone cancels, the first person on the list moves up automatically and the program tells you: "These people have moved up from the waiting list. Let them know they have a place". Once you have told them, click **I've told them**. With **Give a place** you can let someone in even if the activity is full.

> Tip: if someone drops out, **cancel** the registration rather than deleting it, so there is a record.

# Minors and authorisations

In the list, minors without a signed guardian authorisation show the warning **⚠ Authorisation**. In the **Documents** tab, under **Authorisations for minors**, you can print one pre-filled sheet per minor (or **Print a blank one**). When it comes back signed, click the name in the list and enter the date in **Authorisation signed on**.

# Image rights

Anyone who has not allowed use of their image (or whose consent is not on record) shows the warning **⊘ Image**. Without consent **no photos or videos may be published** in which they can be recognised. The website and social media screens will remind you again when you publish something about this activity.

# Check-in

On the day of the activity, in the **Check-in** tab:

- Tick whoever **Attended**. At the top you see "X of Y have arrived".
- If someone turns up who hadn't registered, type their name and click **Add as attendee**.
- If you don't need names, use the **One more** / **One fewer** counter for attendees without registration.

Attendance is the basis of the [impact indicators](/ajuda/informes) in the activity report.`,
    },
  },
  {
    id: 'informes',
    seccio: 'activitats',
    titol: {
      ca: 'Informes, memòria i indicadors d\'impacte',
      es: 'Informes, memoria e indicadores de impacto',
      en: 'Reports, activity report and impact indicators',
    },
    resum: {
      ca: 'Compte de resultats, memòria d\'activitats amb indicadors per a subvencions i llibre registre de socis, a punt per imprimir.',
      es: 'Cuenta de resultados, memoria de actividades con indicadores para subvenciones y libro registro de socios, listos para imprimir.',
      en: 'Income statement, activity report with indicators for grants and register of members, ready to print.',
    },
    rutes: ['/informes'],
    paraules: ['memòria', 'memoria', 'activity report', 'indicadors', 'indicadores', 'indicators', 'impacte', 'impacto', 'impact', 'generacions', 'generaciones', 'intergeneracional', 'CSV', 'subvenció', 'subvención', 'grant', 'llibre registre', 'libro registro', 'register', 'compte de resultats', 'cuenta de resultados', 'income statement', 'assemblea', 'asamblea', 'PDF'],
    cos: {
      ca: `A **Informes** hi ha els documents per a l'Assemblea General i el Registre d'Associacions. Tots corresponen a l'**exercici** triat al menú lateral i s'imprimeixen amb el botó **Imprimeix / desa en PDF** (al diàleg d'impressió pots triar «Desa com a PDF»).

# Compte de resultats

La primera pestanya, **Compte de resultats**, mostra els ingressos i les despeses per categoria, el resultat de l'exercici (superàvit o dèficit), el resultat per activitat i l'**Estat de tresoreria**: el saldo de cada compte a 1/1 i a 31/12, amb les entrades i sortides. Surt dels moviments de [Comptabilitat](/ajuda/comptabilitat).

# Memòria d'activitats

La pestanya **Memòria d'activitats** explica què ha fet l'entitat durant l'any, **organitzat per les finalitats estatutàries**. Inclou la base social (socis per franja d'edat i gènere), cada activitat amb el seu lloc i participants, i el voluntariat.

## Impacte de les activitats

Aquest apartat calcula els indicadors que demanen sovint les subvencions:

- **Persones diferents** que hi han participat, i quantes són sòcies i quantes no.
- **Assistències totals**, separades en: amb inscripció i llista passada, sense inscripció (el comptador) i de recomptes manuals.
- **Franges d'edat i gènere** de qui hi ha assistit. Només es compten les persones inscrites que hi han assistit, perquè d'elles se'n sap l'edat.
- **Activitats intergeneracionals**: les que han tingut dues o més generacions presents. Al costat de cada activitat surt quantes generacions hi han coincidit.

Perquè els indicadors siguin bons, cal **passar llista** a cada activitat (vegeu [Inscripcions, llista d'espera i menors](/ajuda/inscripcions)).

Amb **Descarrega els indicadors per activitat (CSV)** obtens un full de càlcul amb aquestes dades per activitat, per enganxar-lo a la justificació d'una subvenció.

# Llibre registre de socis

La pestanya **Llibre registre de socis** és el registre obligatori: número, nom, DNI, data d'alta i de baixa de cada soci, amb espai per a la signatura del secretari o secretària i el vist i plau de la presidència. Les persones anonimitzades per protecció de dades hi surten com a «Persona anonimitzada».

> Consell: abans de l'assemblea, imprimeix el compte de resultats i la memòria de l'exercici anterior: triant l'any al menú lateral els tens tots dos.`,
      es: `En **Informes** están los documentos para la Asamblea General y el Registro de Asociaciones. Todos corresponden al **ejercicio** elegido en el menú lateral y se imprimen con el botón **Imprimir / guardar en PDF** (en el diálogo de impresión puedes elegir «Guardar como PDF»).

# Cuenta de resultados

La primera pestaña, **Cuenta de resultados**, muestra los ingresos y gastos por categoría, el resultado del ejercicio (superávit o déficit), el resultado por actividad y el **Estado de tesorería**: el saldo de cada cuenta a 1/1 y a 31/12, con las entradas y salidas. Sale de los movimientos de [Contabilidad](/ajuda/comptabilitat).

# Memoria de actividades

La pestaña **Memoria de actividades** explica qué ha hecho la entidad durante el año, **organizado por las finalidades estatutarias**. Incluye la base social (socios por franja de edad y género), cada actividad con su lugar y participantes, y el voluntariado.

## Impacto de las actividades

Este apartado calcula los indicadores que suelen pedir las subvenciones:

- **Personas distintas** que han participado, y cuántas son socias y cuántas no.
- **Asistencias totales**, separadas en: con inscripción y lista pasada, sin inscripción (el contador) y de recuentos manuales.
- **Franjas de edad y género** de quien ha asistido. Solo se cuentan las personas inscritas que han asistido, porque de ellas se sabe la edad.
- **Actividades intergeneracionales**: las que han tenido dos o más generaciones presentes. Junto a cada actividad sale cuántas generaciones han coincidido.

Para que los indicadores sean buenos, hay que **pasar lista** en cada actividad (véase [Inscripciones, lista de espera y menores](/ajuda/inscripcions)).

Con **Descargar los indicadores por actividad (CSV)** obtienes una hoja de cálculo con estos datos por actividad, para pegarla en la justificación de una subvención.

# Libro registro de socios

La pestaña **Libro registro de socios** es el registro obligatorio: número, nombre, DNI, fecha de alta y de baja de cada socio, con espacio para la firma del secretario o secretaria y el visto bueno de la presidencia. Las personas anonimizadas por protección de datos salen como «Persona anonimizada».

> Consejo: antes de la asamblea, imprime la cuenta de resultados y la memoria del ejercicio anterior: eligiendo el año en el menú lateral tienes ambas.`,
      en: `**Reports** contains the documents for the General Assembly and the Register of Associations. They all cover the **financial year** chosen in the side menu and are printed with the **Print / save as PDF** button (in the print dialog you can choose "Save as PDF").

# Income statement

The first tab, **Income statement**, shows income and expenses by category, the result for the year (surplus or deficit), the result by activity and the **Cash position**: each account's balance at 1/1 and 31/12, with money in and out. It is built from the transactions in [Accounts](/ajuda/comptabilitat).

# Activity report

The **Activity report** tab explains what the association did during the year, **organised by statutory purpose**. It includes the membership (members by age band and gender), each activity with its place and participants, and volunteering.

## Impact of the activities

This section calculates the indicators that grants often ask for:

- **Different people** who took part, and how many are members and how many are not.
- **Total attendances**, split into: registered and checked in, without registration (the counter) and from manual counts.
- **Age bands and gender** of those who attended. Only registered people who attended are counted, because their age is known.
- **Intergenerational activities**: those with two or more generations present. Next to each activity you can see how many generations came together.

For good indicators, you need to **check people in** at each activity (see [Registrations, waiting list and minors](/ajuda/inscripcions)).

**Download indicators per activity (CSV)** gives you a spreadsheet with this data per activity, ready to paste into a grant report.

# Register of members

The **Register of members** tab is the mandatory register: number, name, ID number, join date and leaving date of each member, with space for the secretary's signature and the president's approval. People anonymised for data protection appear as "Anonymised person".

> Tip: before the general assembly, print last year's income statement and activity report: choose that year in the side menu and you have both.`,
    },
  },
  {
    id: 'web',
    seccio: 'activitats',
    titol: {
      ca: 'Web: publicació, notícies i pàgines',
      es: 'Web: publicación, noticias y páginas',
      en: 'Website: publishing, news and pages',
    },
    resum: {
      ca: 'Com es genera la web de l\'entitat, com es previsualitza i com es publica per FTP, a mà o automàticament.',
      es: 'Cómo se genera la web de la entidad, cómo se previsualiza y cómo se publica por FTP, a mano o automáticamente.',
      en: 'How the association\'s website is generated, previewed and published via FTP, manually or automatically.',
    },
    rutes: ['/web'],
    paraules: ['web', 'website', 'pàgina', 'página', 'page', 'notícia', 'noticia', 'news', 'FTP', 'hosting', 'allotjament', 'alojamiento', 'publicar', 'publish', 'previsualització', 'vista previa', 'preview', 'esborrany', 'borrador', 'draft'],
    cos: {
      ca: `La web pública de l'entitat **es genera a partir de les dades del programa**: l'agenda surt de les activitats, «Qui som» de les finalitats, «Fes-te'n soci» de les quotes, i el nom i el contacte de [Configuració](/configuracio). Vosaltres només hi afegiu notícies, pàgines i textos.

# Publicació

La primera pestanya, **Publicació**, mostra l'estat: **Hi ha canvis sense publicar**, **Web al dia** o **Encara no publicada**, amb la data de la darrera publicació i del darrer canvi. A sota hi ha la **Previsualització**: la web tal com quedarà, amb **Vista ordinador** i **Vista mòbil** i un selector per anar a cada pàgina. El que veus aquí encara **no és a internet**.

Per posar-la a internet:

1. Configura una vegada la pestanya **Connexió FTP** amb les dades que us dona l'empresa d'allotjament (hosting): **Servidor**, **Port**, **Usuari**, **Contrasenya** i **Carpeta de la web** (sovint /public_html, /httpdocs o /www). Tria **Segura (FTPS) — recomanada** i clica **Desa i prova la connexió**.
2. Torna a **Publicació** i clica **Publica ara**.

Si marques **Publica automàticament quan hi hagi canvis**, el programa la publica sol un minut després del darrer canvi. Si hi ha hagut un error, surt a **Darrer error**.

# Notícies

A **Notícies**, clica **+ Nova notícia** i omple **Títol**, **Data de publicació**, **Resum**, imatge i **Text**. El text s'escriu amb l'editor (negreta, títols, llistes, enllaços…). Pots relacionar-la amb una activitat. La casella **Publicada** decideix si surt a la web; desmarcada queda com a **Esborrany**. Si poses una data futura, la notícia queda **Programada** i sortirà a la web a partir d'aquell dia.

> Compte: si relaciones la notícia amb una activitat on hi ha participants sense drets d'imatge, el programa t'avisa amb els noms. No publiquis fotos on se'ls reconegui.

# Pàgines

La web ja inclou Inici, Agenda, Notícies, Qui som, Fes-te'n soci i Contacte. A **Pàgines** pots afegir-ne d'altres («Projectes», «Arxiu», «Col·labora»…) amb **+ Nova pàgina**, i triar-ne la **Posició al menú** i si és **Visible a la web**.

# Textos i xarxes

Aquí hi ha la **Presentació a la portada**, els textos que surten abans de les finalitats i de les quotes, la **Descripció per als cercadors**, l'**Adreça de la web**, l'**Idioma de la web** i els enllaços a les xarxes socials del peu. Els colors i la forma de la web es trien a [Disseny de la web](/ajuda/disseny-web).`,
      es: `La web pública de la entidad **se genera a partir de los datos del programa**: la agenda sale de las actividades, «Quiénes somos» de las finalidades, «Hazte socio» de las cuotas, y el nombre y el contacto de [Configuración](/configuracio). Vosotros solo añadís noticias, páginas y textos.

# Publicación

La primera pestaña, **Publicación**, muestra el estado: **Hay cambios sin publicar**, **Web al día** o **Todavía no publicada**, con la fecha de la última publicación y del último cambio. Debajo está la **Vista previa**: la web tal como quedará, con **Vista ordenador** y **Vista móvil** y un selector para ir a cada página. Lo que ves aquí todavía **no está en internet**.

Para ponerla en internet:

1. Configura una vez la pestaña **Conexión FTP** con los datos que os da la empresa de alojamiento (hosting): **Servidor**, **Puerto**, **Usuario**, **Contraseña** y **Carpeta de la web** (a menudo /public_html, /httpdocs o /www). Elige **Segura (FTPS) — recomendada** y haz clic en **Guardar y probar la conexión**.
2. Vuelve a **Publicación** y haz clic en **Publicar ahora**.

Si marcas **Publicar automáticamente cuando haya cambios**, el programa la publica solo un minuto después del último cambio. Si ha habido un error, sale en **Último error**.

# Noticias

En **Noticias**, haz clic en **+ Nueva noticia** y rellena **Título**, **Fecha de publicación**, **Resumen**, imagen y **Texto**. El texto se escribe con el editor (negrita, títulos, listas, enlaces…). Puedes relacionarla con una actividad. La casilla **Publicada** decide si sale en la web; desmarcada queda como **Borrador**. Si pones una fecha futura, la noticia queda **Programada** y saldrá en la web a partir de ese día.

> Atención: si relacionas la noticia con una actividad con participantes sin derechos de imagen, el programa te avisa con los nombres. No publiques fotos en las que se les reconozca.

# Páginas

La web ya incluye Inicio, Agenda, Noticias, Quiénes somos, Hazte socio y Contacto. En **Páginas** puedes añadir otras («Proyectos», «Archivo», «Colabora»…) con **+ Nueva página**, y elegir su **Posición en el menú** y si es **Visible en la web**.

# Textos y redes

Aquí están la **Presentación en la portada**, los textos que salen antes de las finalidades y de las cuotas, la **Descripción para los buscadores**, la **Dirección de la web**, el **Idioma de la web** y los enlaces a las redes sociales del pie. Los colores y la forma de la web se eligen en [Diseño de la web](/ajuda/disseny-web).`,
      en: `The association's public website **is generated from the program's data**: the events calendar comes from the activities, "About us" from the purposes, "Become a member" from the fees, and the name and contact details from [Settings](/configuracio). You only add news, pages and texts.

# Publishing

The first tab, **Publishing**, shows the status: **There are unpublished changes**, **Website up to date** or **Not published yet**, with the date of the last publication and the last change. Below is the **Preview**: the website as it will look, with **Desktop view** and **Mobile view** and a selector to go to each page. What you see here is **not on the internet yet**.

To put it online:

1. Set up the **FTP connection** tab once with the details your hosting company gives you: **Server**, **Port**, **User name**, **Password** and **Website folder** (often /public_html, /httpdocs or /www). Choose **Secure (FTPS) — recommended** and click **Save and test the connection**.
2. Go back to the first tab and click **Publish now**.

If you tick **Publish automatically when there are changes**, the program publishes it by itself one minute after the last change. If something went wrong, it is shown under **Last error**.

# News

In **News**, click **+ New news item** and fill in **Title**, **Publication date**, **Summary**, image and **Text**. The text is written with the editor (bold, headings, lists, links…). You can link it to an activity. The **Published** box decides whether it appears on the website; unticked, it stays as a **Draft**. If you set a future date, the item is **Scheduled** and will appear on the website from that day.

> Warning: if you link the news item to an activity with participants who have not given image rights, the program warns you with their names. Do not publish photos in which they can be recognised.

# Pages

The website already includes Home, Events, News, About us, Become a member and Contact. In **Pages** you can add others ("Projects", "Archive", "Get involved"…) with **+ New page**, and choose their **Position in the menu** and whether they are **Visible on the website**.

# Texts and social media

Here you find the **Home page introduction**, the texts shown before the purposes and the fees, the **Description for search engines**, the **Website address**, the **Website language** and the footer links to your social media. Colours and layout are chosen in [Website design](/ajuda/disseny-web).`,
    },
  },
  {
    id: 'disseny-web',
    seccio: 'activitats',
    titol: { ca: 'Disseny de la web', es: 'Diseño de la web', en: 'Website design' },
    resum: {
      ca: 'Temes, colors, fonts, logotip i capçalera, blocs de la portada, menú, peu de pàgina i CSS propi.',
      es: 'Temas, colores, fuentes, logotipo y cabecera, bloques de la portada, menú, pie de página y CSS propio.',
      en: 'Themes, colours, fonts, logo and header, home page blocks, menu, footer and custom CSS.',
    },
    paraules: ['disseny', 'diseño', 'design', 'colors', 'colores', 'colours', 'colors', 'fonts', 'fuentes', 'tipografia', 'typography', 'tema', 'theme', 'logotip', 'logotipo', 'logo', 'capçalera', 'cabecera', 'header', 'peu', 'pie', 'footer', 'menú', 'menu', 'CSS', 'blocs', 'bloques', 'blocks'],
    cos: {
      ca: `La pestanya **Disseny** de [Web](/web) canvia l'aspecte de la web sense tocar-ne el contingut. A la dreta hi ha la previsualització, que s'actualitza a mesura que canvies coses. Res no es guarda fins que cliques **Desa el disseny**; amb **Descarta** tornes a com estava. El disseny desat surt a internet en la propera publicació de la web.

# Tema

Comença triant un **Tema** (Terracota, Mediterrani, Oliva i pedra, Festa major, Arxiu antic, Minimal, Nit d'estiu). És un punt de partida: després pots canviar qualsevol color o font.

# Colors i tipografia

- **Colors**: principal, fons de la pàgina, fons de les targetes, text, text secundari, línies i vores, capçalera i peu.
- **Tipografia**: **Font dels títols**, **Font del text** i **Mida del text**. Hi ha fonts clàssiques, modernes i decoratives.

> Consell: les fonts es descarreguen i es pugen a la vostra web en publicar-la. Els visitants no es connecten a Google, cosa que és millor per a la seva privacitat.

# Formes

Cantonades (rectes, suaus, arrodonides), estil de les targetes, ombres suaus i forma dels botons.

# Logotip i capçalera

Pots pujar un **Logotip de la web** diferent del de l'entitat (millor en PNG amb fons transparent) i triar-ne la mida i la forma, si es mostra el nom de l'entitat al costat, la disposició (logotip a l'esquerra i menú a la dreta, o tot centrat) i si la capçalera queda fixa en fer desplaçament.

# Portada

A **Blocs de la portada** hi ha els apartats de la pàgina d'inici: presentació, properes activitats, últimes notícies, què fem, fes-te'n soci… **Arrossega'ls** (o fes servir les fletxes) per canviar-ne l'ordre i **desmarca'ls** per amagar-los. Amb **+ Afegeix un bloc de text** hi afegeixes un text propi. També hi tries la imatge de fons de la presentació i quantes activitats o notícies es mostren.

# Menú i peu de pàgina

- **Menú**: ordre dels apartats; els que amaguis es continuen publicant però no surten al menú. També en majúscules o sempre plegat.
- **Peu de pàgina**: text del peu (un lema, l'horari, agraïments a patrocinadors…), dades de contacte, NIF i número de registre i enllaços a les xarxes. L'avís legal i la política de privacitat hi surten sempre.

# Avançat

**CSS propi** és per a qui en sàpiga: s'afegeix al final del full d'estil. **Torna al disseny per defecte** esborra colors, fonts i ordre dels blocs, però no les imatges ni els textos.`,
      es: `La pestaña **Diseño** de [Web](/web) cambia el aspecto de la web sin tocar su contenido. A la derecha está la vista previa, que se actualiza a medida que cambias cosas. Nada se guarda hasta que haces clic en **Guardar el diseño**; con **Descartar** vuelves a como estaba. El diseño guardado sale en internet en la próxima publicación de la web.

# Tema

Empieza eligiendo un **Tema** (Terracota, Mediterráneo, Olivo y piedra, Fiesta mayor, Archivo antiguo, Minimalista, Noche de verano). Es un punto de partida: después puedes cambiar cualquier color o fuente.

# Colores y tipografía

- **Colores**: principal, fondo de la página, fondo de las tarjetas, texto, texto secundario, líneas y bordes, cabecera y pie.
- **Tipografía**: **Fuente de los títulos**, **Fuente del texto** y **Tamaño del texto**. Hay fuentes clásicas, modernas y decorativas.

> Consejo: las fuentes se descargan y se suben a vuestra web al publicarla. Los visitantes no se conectan a Google, lo que es mejor para su privacidad.

# Formas

Esquinas (rectas, suaves, redondeadas), estilo de las tarjetas, sombras suaves y forma de los botones.

# Logotipo y cabecera

Puedes subir un **Logotipo de la web** distinto del de la entidad (mejor en PNG con fondo transparente) y elegir su tamaño y forma, si se muestra el nombre de la entidad al lado, la disposición (logotipo a la izquierda y menú a la derecha, o todo centrado) y si la cabecera queda fija al desplazarse.

# Portada

En **Bloques de la portada** están los apartados de la página de inicio: presentación, próximas actividades, últimas noticias, qué hacemos, hazte socio… **Arrástralos** (o usa las flechas) para cambiar el orden y **desmárcalos** para ocultarlos. Con **+ Añadir un bloque de texto** añades un texto propio. También eliges la imagen de fondo de la presentación y cuántas actividades o noticias se muestran.

# Menú y pie de página

- **Menú**: orden de los apartados; los que ocultes se siguen publicando pero no salen en el menú. También en mayúsculas o siempre plegado.
- **Pie de página**: texto del pie (un lema, el horario, agradecimientos a patrocinadores…), datos de contacto, NIF y número de registro y enlaces a las redes. El aviso legal y la política de privacidad salen siempre.

# Avanzado

**CSS propio** es para quien sepa: se añade al final de la hoja de estilo. **Volver al diseño por defecto** borra colores, fuentes y orden de los bloques, pero no las imágenes ni los textos.`,
      en: `The **Design** tab in [Website](/web) changes how the website looks without touching its content. On the right is the preview, which updates as you change things. Nothing is stored until you click **Save design**; **Discard** takes you back to how it was. The saved design goes online the next time the website is published.

# Theme

Start by choosing a **Theme** (Terracotta, Mediterranean, Olive and stone, Village fiesta, Old archive, Minimal, Summer night). It is a starting point: you can change any colour or font afterwards.

# Colours and typography

- **Colours**: main colour, page background, card background, text, secondary text, lines and borders, header and footer.
- **Typography**: **Heading font**, **Body font** and **Text size**. There are classic, modern and decorative fonts.

> Tip: fonts are downloaded and uploaded to your website when it is published. Visitors never connect to Google, which is better for their privacy.

# Shapes

Corners (square, soft, rounded), card style, soft shadows and button shape.

# Logo and header

You can upload a **Website logo** different from the association's (PNG with a transparent background works best) and choose its size and shape, whether the association's name is shown next to it, the layout (logo on the left and menu on the right, or everything centred) and whether the header stays fixed when scrolling.

# Home page

**Home page blocks** lists the sections of the home page: introduction, upcoming activities, latest news, what we do, become a member… **Drag them** (or use the arrows) to reorder and **untick them** to hide them. **+ Add a text block** adds your own text. Here you also choose the introduction's background image and how many activities or news items are shown.

# Menu and footer

- **Menu**: order of the menu items; hidden ones are still published but don't appear in the menu. Also capitals or always collapsed.
- **Footer**: footer text (a motto, opening hours, thanks to sponsors…), contact details, tax ID and registration number, and social media links. The legal notice and privacy policy always appear.

# Advanced

**Custom CSS** is for those who know CSS: it is appended to the stylesheet. **Back to the default design** clears colours, fonts and block order, but not images or texts.`,
    },
  },
  {
    id: 'xarxes',
    seccio: 'activitats',
    titol: { ca: 'Xarxes socials', es: 'Redes sociales', en: 'Social media' },
    resum: {
      ca: 'Preparar una publicació una vegada i publicar-la a cada xarxa: Instagram i Facebook des del programa, X, TikTok i YouTube copiant i enganxant.',
      es: 'Preparar una publicación una vez y publicarla en cada red: Instagram y Facebook desde el programa, X, TikTok y YouTube copiando y pegando.',
      en: 'Prepare a post once and publish it on each network: Instagram and Facebook from the program, X, TikTok and YouTube by copy and paste.',
    },
    rutes: ['/xarxes'],
    paraules: ['xarxes', 'redes', 'social media', 'Instagram', 'Facebook', 'X', 'Twitter', 'TikTok', 'YouTube', 'token', 'Meta', 'etiquetes', 'hashtags', 'publicació', 'publicación', 'post'],
    cos: {
      ca: `A **Xarxes socials** prepares una publicació **una sola vegada** i la publiques a cada xarxa amb el text adaptat.

# Preparar una publicació

1. A la pestanya **Publicació**, a **A partir de (opcional)**, tria una activitat o una notícia: el programa omple el text, l'enllaç a la web i la imatge. O deixa **— Publicació lliure —**.
2. Revisa el **Text de la publicació**, l'**Enllaç (opcional)** i la **Imatge**. Tria el **Format de la imatge**: Quadrat, Vertical o Horitzontal.
3. Clica **Desa i prepara per a les xarxes**.
4. Per a cada xarxa surt una targeta amb el **Text per a** aquella xarxa i el comptador de caràcters. Ajusta'l si cal (per exemple, a X un text llarg es divideix en un fil) i desa els canvis.

> Compte: si la publicació ve d'una activitat amb participants que no han autoritzat la seva imatge, surt un avís amb els noms. No publiquis fotos on se'ls reconegui.

# Instagram i Facebook: directament des del programa

Clica **Publica a Instagram** o **Publica a Facebook** i confirma. Perquè funcioni:

- La [web](/web) ha de tenir configurades l'**Adreça de la web** i la **Connexió FTP**: la imatge es puja a la vostra web perquè Meta la pugui llegir.
- Cal connectar els comptes a la pestanya **Comptes**, una sola vegada, amb un **token d'accés**. Allà hi ha els passos detallats (crear una aplicació a developers.facebook.com, de tipus «Empresa»). El compte d'Instagram ha de ser professional; per a Facebook cal el **Token de la pàgina** i l'**Identificador de la pàgina**.
- La connexió d'Instagram caduca: quan s'acosti la data, clica **Allarga la connexió (60 dies més)**.

Aquests passos són una mica tècnics: si cal, demaneu ajuda a algú que en sàpiga. Els tokens es guarden xifrats.

# X, TikTok i YouTube: copiar i enganxar

Per a aquestes xarxes el programa **obre la xarxa amb el text preparat** (a X, ja escrit) i tu hi afegeixes la imatge o el vídeo. Fes servir **Copia**, **Copia la imatge** o **Descarrega-la**. Per a YouTube, la primera línia serveix de títol del vídeo. Quan ho hagis publicat, clica **Ja l'he publicada** i, si vols, enganxa l'enllaç: queda anotat.

# Historial i etiquetes

La pestanya **Historial** mostra què s'ha publicat i on, amb l'enllaç a cada publicació. A **Comptes** també hi ha les **Etiquetes habituals** (per exemple #Pollença), que s'afegeixen al final del text proposat.`,
      es: `En **Redes sociales** preparas una publicación **una sola vez** y la publicas en cada red con el texto adaptado.

# Preparar una publicación

1. En la pestaña **Publicación**, en **A partir de (opcional)**, elige una actividad o una noticia: el programa rellena el texto, el enlace a la web y la imagen. O deja **— Publicación libre —**.
2. Revisa el **Texto de la publicación**, el **Enlace (opcional)** y la **Imagen**. Elige el **Formato de la imagen**: Cuadrado, Vertical u Horizontal.
3. Haz clic en **Guardar y preparar para las redes**.
4. Para cada red sale una tarjeta con el **Texto para** esa red y el contador de caracteres. Ajústalo si hace falta (por ejemplo, en X un texto largo se divide en un hilo) y guarda los cambios.

> Atención: si la publicación viene de una actividad con participantes que no han autorizado su imagen, sale un aviso con los nombres. No publiques fotos en las que se les reconozca.

# Instagram y Facebook: directamente desde el programa

Haz clic en **Publicar en Instagram** o **Publicar en Facebook** y confirma. Para que funcione:

- La [web](/web) debe tener configuradas la **Dirección de la web** y la **Conexión FTP**: la imagen se sube a vuestra web para que Meta la pueda leer.
- Hay que conectar las cuentas en la pestaña **Cuentas**, una sola vez, con un **token de acceso**. Allí están los pasos detallados (crear una aplicación en developers.facebook.com, de tipo «Empresa»). La cuenta de Instagram debe ser profesional; para Facebook hace falta el **Token de la página** y el **Identificador de la página**.
- La conexión de Instagram caduca: cuando se acerque la fecha, haz clic en **Alarga la conexión (60 días más)**.

Estos pasos son algo técnicos: si hace falta, pedid ayuda a alguien que sepa. Los tokens se guardan cifrados.

# X, TikTok y YouTube: copiar y pegar

Para estas redes el programa **abre la red con el texto preparado** (en X, ya escrito) y tú añades la imagen o el vídeo. Usa **Copiar**, **Copiar la imagen** o **Descargarla**. Para YouTube, la primera línea sirve de título del vídeo. Cuando lo hayas publicado, haz clic en **Ya la he publicado** y, si quieres, pega el enlace: queda anotado.

# Historial y etiquetas

La pestaña **Historial** muestra qué se ha publicado y dónde, con el enlace a cada publicación. En **Cuentas** también están las **Etiquetas habituales** (por ejemplo #Pollença), que se añaden al final del texto propuesto.`,
      en: `In **Social media** you prepare a post **just once** and publish it on each network with the text adapted.

# Preparing a post

1. In the **Publishing** tab, under **Based on (optional)**, choose an activity or a news item: the program fills in the text, website link and image. Or leave **— Free post —**.
2. Check the **Post text**, **Link (optional)** and **Image**. Choose the **Image format**: Square, Portrait or Landscape.
3. Click **Save and prepare for social media**.
4. A card appears for each network with the **Text for** that network and a character counter. Adjust it if needed (for example, on X a long text is split into a thread) and save the changes.

> Warning: if the post is based on an activity with participants who have not allowed use of their image, a warning with their names appears. Do not publish photos in which they can be recognised.

# Instagram and Facebook: straight from the program

Click **Publish to Instagram** or **Publish to Facebook** and confirm. For this to work:

- The [website](/web) must have the **Website address** and **FTP connection** set up: the image is uploaded to your website so Meta can read it.
- The accounts must be connected once in the **Accounts** tab, with an **access token**. The detailed steps are there (create a "Business" app at developers.facebook.com). The Instagram account must be a professional one; for Facebook you need the **Page token** and the **Page ID**.
- The Instagram connection expires: when the date approaches, click **Extend the connection (60 more days)**.

These steps are a bit technical: if needed, ask someone who knows. Tokens are stored encrypted.

# X, TikTok and YouTube: copy and paste

For these networks the program **opens the network with the text prepared** (on X, already typed in) and you add the image or video. Use **Copy**, **Copy image** or **Download it**. For YouTube, the first line is used as the video title. Once published, click **I have published it** and, if you like, paste the link: it is recorded.

# History and hashtags

The **History** tab shows what has been published and where, with a link to each post. **Accounts** also holds the **Usual hashtags** (for example #Pollença), which are added at the end of the suggested text.`,
    },
  },

  // ───────────────────────────── Sistema ─────────────────────────────
  {
    id: 'agent-ia',
    seccio: 'sistema',
    titol: { ca: 'El meu agent d\'IA', es: 'Mi agente de IA', en: 'My AI agent' },
    resum: {
      ca: 'Connectar el teu assistent d\'IA (Claude, ChatGPT, Gemini, Copilot…) al teu compte: què pot fer, què no veu mai i com s\'aproven les propostes.',
      es: 'Conectar tu asistente de IA (Claude, ChatGPT, Gemini, Copilot…) a tu cuenta: qué puede hacer, qué no ve nunca y cómo se aprueban las propuestas.',
      en: 'Connecting your AI assistant (Claude, ChatGPT, Gemini, Copilot…) to your account: what it can do, what it never sees and how proposals are approved.',
    },
    rutes: ['/agent-ia'],
    paraules: ['IA', 'AI', 'agent', 'agente', 'Claude', 'ChatGPT', 'Gemini', 'Copilot', 'Cursor', 'LM Studio', 'MCP', 'clau', 'clave', 'key', 'propostes', 'propuestas', 'proposals', 'assistent', 'asistente', 'assistant', 'intel·ligència artificial', 'inteligencia artificial'],
    cos: {
      ca: `Cada persona de la junta pot connectar el seu propi assistent d'intel·ligència artificial al seu compte i demanar-li coses en llenguatge natural: «Què tenim pendent aquest mes?», «Apunta que en Joan ha pagat la quota en efectiu», «Prepara l'acta de la junta de dijous amb aquests acords».

# Com funciona

- L'agent actua **en nom teu i amb els permisos del teu perfil**, mai més.
- Només pot fer servir les accions de la pestanya **Què pot fer**.
- **Mai no rep dades sensibles**: DNI, IBAN, adreces, dates de naixement (només l'edat), telèfons, correus ni fotos.
- Tot el que fa queda a la pestanya **Activitat** i al registre d'auditoria amb el teu nom.
- El programa ha d'estar en marxa (la seva icona surt al costat del rellotge) perquè l'agent hi pugui accedir. Tancar la finestra no l'atura.

# Crear una clau

1. A la pestanya **Connecta**, clica **+ Nova clau**.
2. Posa-li un nom per reconèixer-la (per exemple, «Claude de casa»).
3. Tria els **Permisos**: **Només consultar** o **Consultar i gestionar**. Opcionalment, una data a **Caduca**.
4. Clica **Crea la clau** i **copia-la ara**: per seguretat no es tornarà a mostrar.

# Connectar l'assistent

A **Com connectar-lo**, tria la teva aplicació i segueix les instruccions, que ja porten la clau posada:

- **Claude Desktop**: Configuració → Desenvolupador → «Edita la configuració», enganxa-hi la configuració i torna a obrir Claude.
- **Claude Code** i **Gemini CLI**: una ordre o un fitxer de configuració.
- **GitHub Copilot (VS Code)** i **Cursor / Windsurf**: la configuració MCP de l'editor.
- **LM Studio (models locals)**: el model funciona a l'ordinador i les dades no en surten.
- **ChatGPT**: funciona al núvol i necessita que el programa sigui accessible des d'internet amb una adreça segura. És una opció avançada: demaneu ajuda a algú amb coneixements tècnics.

La configuració la genera el programa mateix: ja porta la teva clau i apunta al programa instal·lat en aquest ordinador. No cal instal·lar res més (ni Node.js) ni escriure cap ruta a mà; només copiar i enganxar.

# Propostes: tu decideixes

Les accions amb efectes fora del programa o difícils de desfer (enviar correus i convocatòries, publicar a la web o a les xarxes, cobrar quotes, emetre factures o certificats, tancar actes o exercicis, donar de baixa…) **no s'executen soles**: queden a la pestanya **Propostes**. Revisa-les i clica **Aprova i executa** o **Rebutja**.

# Revocar

Si perds la clau o deixes de fer servir l'agent, clica **Revoca** a **Les meves claus**: deixa de funcionar a l'instant. Si es desactiva el teu usuari, les teves claus també deixen de funcionar.

> Compte: si el model funciona al núvol, el proveïdor d'IA tracta dades de l'entitat. Feu servir plans amb acord de tractament de dades i anoteu-ho al registre d'activitats de tractament de [Protecció de dades](/proteccio-dades).`,
      es: `Cada persona de la junta puede conectar su propio asistente de inteligencia artificial a su cuenta y pedirle cosas en lenguaje natural: «¿Qué tenemos pendiente este mes?», «Apunta que Joan ha pagado la cuota en efectivo», «Prepara el acta de la junta del jueves con estos acuerdos».

# Cómo funciona

- El agente actúa **en tu nombre y con los permisos de tu perfil**, nunca más.
- Solo puede usar las acciones de la pestaña **Qué puede hacer**.
- **Nunca recibe datos sensibles**: DNI, IBAN, direcciones, fechas de nacimiento (solo la edad), teléfonos, correos ni fotos.
- Todo lo que hace queda en la pestaña **Actividad** y en el registro de auditoría con tu nombre.
- El programa debe estar en marcha (su icono sale junto al reloj) para que el agente pueda acceder. Cerrar la ventana no lo detiene.

# Crear una clave

1. En la pestaña **Conectar**, haz clic en **+ Nueva clave**.
2. Ponle un nombre para reconocerla (por ejemplo, «Claude de casa»).
3. Elige los **Permisos**: **Solo consultar** o **Consultar y gestionar**. Opcionalmente, una fecha en **Caduca**.
4. Haz clic en **Crear la clave** y **cópiala ahora**: por seguridad no se volverá a mostrar.

# Conectar el asistente

En **Cómo conectarlo**, elige tu aplicación y sigue las instrucciones, que ya llevan la clave puesta:

- **Claude Desktop**: Configuración → Desarrollador → «Editar configuración», pega la configuración y vuelve a abrir Claude.
- **Claude Code** y **Gemini CLI**: una orden o un archivo de configuración.
- **GitHub Copilot (VS Code)** y **Cursor / Windsurf**: la configuración MCP del editor.
- **LM Studio (modelos locales)**: el modelo funciona en el ordenador y los datos no salen de él.
- **ChatGPT**: funciona en la nube y necesita que el programa sea accesible desde internet con una dirección segura. Es una opción avanzada: pedid ayuda a alguien con conocimientos técnicos.

La configuración la genera el propio programa: ya lleva tu clave y apunta al programa instalado en este ordenador. No hace falta instalar nada más (ni Node.js) ni escribir ninguna ruta a mano; solo copiar y pegar.

# Propuestas: tú decides

Las acciones con efectos fuera del programa o difíciles de deshacer (enviar correos y convocatorias, publicar en la web o en las redes, cobrar cuotas, emitir facturas o certificados, cerrar actas o ejercicios, dar de baja…) **no se ejecutan solas**: quedan en la pestaña **Propuestas**. Revísalas y haz clic en **Aprobar y ejecutar** o **Rechazar**.

# Revocar

Si pierdes la clave o dejas de usar el agente, haz clic en **Revocar** en **Mis claves**: deja de funcionar al instante. Si se desactiva tu usuario, tus claves también dejan de funcionar.

> Atención: si el modelo funciona en la nube, el proveedor de IA trata datos de la entidad. Usad planes con acuerdo de tratamiento de datos y anotadlo en el registro de actividades de tratamiento de [Protección de datos](/proteccio-dades).`,
      en: `Each board member can connect their own artificial intelligence assistant to their account and ask it things in plain language: "What do we have pending this month?", "Note that Joan has paid his fee in cash", "Draft the minutes of Thursday's board meeting with these decisions".

# How it works

- The agent acts **on your behalf and with your profile's permissions**, never more.
- It can only use the actions listed in the **What it can do** tab.
- **It never receives sensitive data**: ID numbers, IBANs, addresses, dates of birth (only the age), phone numbers, emails or photos.
- Everything it does is listed in the **Activity** tab and in the audit log under your name.
- The program must be running (its icon appears next to the clock) for the agent to reach it. Closing the window does not stop it.

# Creating a key

1. In the **Connect** tab, click **+ New key**.
2. Give it a name you will recognise (for example, "Claude at home").
3. Choose the **Permissions**: **Read only** or **Read and manage**. Optionally, a date under **Expires**.
4. Click **Create key** and **copy it now**: for security it won't be shown again.

# Connecting the assistant

Under **How to connect it**, choose your application and follow the instructions, which already include the key:

- **Claude Desktop**: Settings → Developer → "Edit Config", paste the configuration and reopen Claude.
- **Claude Code** and **Gemini CLI**: a command or a settings file.
- **GitHub Copilot (VS Code)** and **Cursor / Windsurf**: the editor's MCP settings.
- **LM Studio (local models)**: the model runs on the computer and the data never leaves it.
- **ChatGPT**: runs in the cloud and needs the program to be reachable from the internet with a secure address. This is advanced: ask someone technical for help.

The program generates the configuration itself: it already includes your key and points to the program installed on this computer. There is nothing else to install (no Node.js) and no path to type by hand; just copy and paste.

# Proposals: you decide

Actions with effects outside the program or that are hard to undo (sending emails and meeting notices, publishing on the website or social media, collecting fees, issuing invoices or certificates, closing minutes or financial years, removing members…) **are not carried out on their own**: they wait in the **Proposals** tab. Review them and click **Approve and run** or **Reject**.

# Revoking

If you lose the key or stop using the agent, click **Revoke** under **My keys**: it stops working immediately. If your user is deactivated, your keys stop working too.

> Warning: if the model runs in the cloud, the AI provider processes the association's data. Use plans with a data processing agreement and record it in the record of processing activities in [Data protection](/proteccio-dades).`,
    },
  },
  {
    id: 'configuracio',
    seccio: 'sistema',
    titol: { ca: 'Configuració', es: 'Configuración', en: 'Settings' },
    resum: {
      ca: 'Dades de l\'entitat i finalitats, etiquetes i carnet, quotes i comptes, correu, usuaris i còpia de seguretat.',
      es: 'Datos de la entidad y finalidades, etiquetas y carné, cuotas y cuentas, correo, usuarios y copia de seguridad.',
      en: 'Organisation details and purposes, tags and card, fees and accounts, email, users and backup.',
    },
    rutes: ['/configuracio'],
    paraules: ['configuració', 'configuración', 'settings', 'entitat', 'entidad', 'organisation', 'logotip', 'logo', 'NIF', 'finalitats', 'finalidades', 'purposes', 'etiquetes', 'etiquetas', 'tags', 'carnet', 'carné', 'card', 'quotes', 'cuotas', 'fees', 'comptes', 'cuentas', 'accounts', 'categories', 'usuaris', 'usuarios', 'users'],
    cos: {
      ca: `A **Configuració** es configura tot el que és propi de l'entitat. Les pestanyes només les veu el perfil d'Administració; la resta de persones només hi veuen **Usuaris**, per canviar-se la contrasenya.

# Entitat

- **Dades de l'entitat**: **Nom curt** (com es coneix l'entitat), **Denominació completa**, **Lema**, NIF, **Núm. al registre d'associacions**, **Domicili social**, població, codi postal, telèfon, correu, **IBAN de l'entitat**, **Logotip** i **Idioma del programa**. Surten als documents, als rebuts i a la web.
- **Finalitats estatutàries**: les finalitats dels Estatuts, amb un nom curt i el text complet. Cada activitat s'hi vincula i la memòria anual s'organitza per finalitats. Afegeix-les amb **+ Afegeix una finalitat** i clica **Desa les finalitats**.

# Socis i carnet

- **Etiquetes de socis**: per agrupar socis (Junta, Voluntariat, Música…), filtrar-los i enviar-los comunicacions. Cada una amb el seu color.
- **Plantilla del carnet de soci**: pots pujar una imatge de fons per a l'**Anvers** i el **Revers** (format targeta, 85,6 × 54 mm). A l'anvers, deixa lliure la franja de dalt per al logotip i la part de sota clara: la foto i les dades del soci s'hi imprimeixen a sobre. Sense plantilla s'usa el disseny per defecte.

# Quotes i comptes

- **Tipus de quota**, amb l'**Import anual (€)**. Els canvis valen per a les quotes que es generin a partir d'ara, no per a les ja generades. Vegeu [Quotes](/ajuda/quotes).
- **Comptes de tresoreria** (caixa, bancs), amb el **Saldo inicial**: el que hi havia el dia que vau començar a usar el programa.
- **Categories d'ingressos i despeses**. Una categoria amb moviments no es pot eliminar; desactiva-la perquè no surti als formularis.

# Correu

El compte amb què s'envien les comunicacions. Vegeu [Correu electrònic](/ajuda/correu).

# Usuaris

Qui pot entrar al programa i amb quin **Perfil**: **Administració** (tot), **Junta / Secretaria** (socis, economia, activitats, web i informes, però no usuaris ni configuració), **Tresoreria** (quotes, comptabilitat i informes) i **Comunicació** (web, notícies i activitats, sense dades personals ni comptes). Clica **Nou usuari**, omple el nom, el **Nom d'usuari**, la contrasenya i el perfil. Per a algú que deixa la junta, desmarca **Actiu**. A **La meva contrasenya** cadascú canvia la seva. Vegeu [Seguretat i accés](/ajuda/seguretat).

# Còpia de seguretat

Vegeu [Còpies de seguretat i restauració](/ajuda/copies-seguretat).`,
      es: `En **Configuración** se configura todo lo propio de la entidad. Las pestañas solo las ve el perfil de Administración; las demás personas solo ven **Usuarios**, para cambiar su contraseña.

# Entidad

- **Datos de la entidad**: **Nombre corto** (cómo se conoce la entidad), **Denominación completa**, **Lema**, NIF, **Núm. en el registro de asociaciones**, **Domicilio social**, población, código postal, teléfono, correo, **IBAN de la entidad**, **Logotipo** e **Idioma del programa**. Salen en los documentos, los recibos y la web.
- **Finalidades estatutarias**: las finalidades de los Estatutos, con un nombre corto y el texto completo. Cada actividad se vincula a ellas y la memoria anual se organiza por finalidades. Añádelas con **+ Añade una finalidad** y haz clic en **Guardar las finalidades**.

# Socios y carné

- **Etiquetas de socios**: para agrupar socios (Junta, Voluntariado, Música…), filtrarlos y enviarles comunicaciones. Cada una con su color.
- **Plantilla del carné de socio**: puedes subir una imagen de fondo para el **Anverso** y el **Reverso** (formato tarjeta, 85,6 × 54 mm). En el anverso, deja libre la franja de arriba para el logotipo y la parte de abajo clara: la foto y los datos del socio se imprimen encima. Sin plantilla se usa el diseño por defecto.

# Cuotas y cuentas

- **Tipo de cuota**, con el **Importe anual (€)**. Los cambios valen para las cuotas que se generen a partir de ahora, no para las ya generadas. Véase [Cuotas](/ajuda/quotes).
- **Cuentas de tesorería** (caja, bancos), con el **Saldo inicial**: lo que había el día que empezasteis a usar el programa.
- **Categorías de ingresos y gastos**. Una categoría con movimientos no se puede eliminar; desactívala para que no salga en los formularios.

# Correo

La cuenta con la que se envían las comunicaciones. Véase [Correo electrónico](/ajuda/correu).

# Usuarios

Quién puede entrar en el programa y con qué **Perfil**: **Administración** (todo), **Junta / Secretaría** (socios, economía, actividades, web e informes, pero no usuarios ni configuración), **Tesorería** (cuotas, contabilidad e informes) y **Comunicación** (web, noticias y actividades, sin datos personales ni cuentas). Haz clic en **Nuevo usuario**, rellena el nombre, el **Nombre de usuario**, la contraseña y el perfil. Para alguien que deja la junta, desmarca **Activo**. En **Mi contraseña** cada uno cambia la suya. Véase [Seguridad y acceso](/ajuda/seguretat).

# Copia de seguridad

Véase [Copias de seguridad y restauración](/ajuda/copies-seguretat).`,
      en: `**Settings** is where everything specific to the association is set up. Only the Administration profile sees all the tabs; everyone else only sees **Users**, to change their own password.

# Organisation

- **Organisation details**: **Short name** (what the association is known as), **Full name**, **Motto**, tax ID, **Register of associations no.**, **Registered address**, town, postcode, phone, email, **Organisation IBAN**, **Logo** and **Program language**. They appear on documents, receipts and the website.
- **Statutory purposes**: the purposes in the Statutes, with a short name and the full text. Each activity is linked to them and the annual report is organised by purpose. Add them with **+ Add a purpose** and click **Save purposes**.

# Members and card

- **Member tags**: to group members (Board, Volunteers, Music…), filter them and send them communications. Each with its own colour.
- **Membership card template**: you can upload a background image for the **Front** and **Back** (card format, 85.6 × 54 mm). On the front, leave the top strip free for the logo and the lower part light: the member's photo and details are printed on top. Without a template, the default design is used.

# Fees and accounts

- **Fee type**, with the **Annual amount (€)**. Changes apply to fees generated from now on, not to those already generated. See [Fees](/ajuda/quotes).
- **Cash and bank accounts**, with the **Opening balance**: the amount there was on the day you started using the program.
- **Income and expense categories**. A category with transactions cannot be deleted; deactivate it so it doesn't appear in forms.

# Email

The account used to send communications. See [Email](/ajuda/correu).

# Users

Who can sign in and with which **Profile**: **Administration** (everything), **Board / Secretary** (members, finance, activities, website and reports, but not users or settings), **Treasurer** (fees, accounts and reports) and **Communications** (website, news and activities, with no personal data or accounts). Click **New user**, fill in the name, **User name**, password and profile. For someone leaving the board, untick **Active**. In **My password** each person changes their own. See [Security and access](/ajuda/seguretat).

# Backup

See [Backups and restoring](/ajuda/copies-seguretat).`,
    },
  },
  {
    id: 'copies-seguretat',
    seccio: 'sistema',
    titol: {
      ca: 'Còpies de seguretat i restauració',
      es: 'Copias de seguridad y restauración',
      en: 'Backups and restoring',
    },
    resum: {
      ca: 'Les còpies automàtiques diàries, la carpeta externa (USB, Drive, OneDrive), com restaurar i per què cal guardar el fitxer clau.key.',
      es: 'Las copias automáticas diarias, la carpeta externa (USB, Drive, OneDrive), cómo restaurar y por qué hay que guardar el archivo clau.key.',
      en: 'Automatic daily backups, the external folder (USB, Drive, OneDrive), how to restore and why you must keep the clau.key file.',
    },
    paraules: ['còpia', 'copia', 'backup', 'restaurar', 'restore', 'USB', 'OneDrive', 'Google Drive', 'clau.key', 'xifrat', 'cifrado', 'encrypted', 'dades', 'datos', 'data', 'recuperar', 'recover'],
    cos: {
      ca: `Totes les dades de l'entitat es guarden en **un únic fitxer** en aquest ordinador. Si l'ordinador s'espatlla, el roben o hi entra un virus, només les còpies us salvaran. Tot això es fa a [Configuració](/configuracio), pestanya **Còpia de seguretat** (només Administració).

# Còpies automàtiques

Cada dia que el programa està en marxa se'n fa una còpia automàtica a la subcarpeta **copies** de la carpeta de dades. Es conserven les dels **darrers 7 dies** i la **primera de cada mes dels darrers 12 mesos**. El [Tauler](/) avisa si fa més de 7 dies que no se'n fa cap.

# La carpeta de dades

La base de dades, el fitxer clau.key i les còpies automàtiques són a la carpeta de dades del programa, en aquest ordinador:

- Windows: %APPDATA%\\IAQ Gest\\dades
- Mac: ~/Library/Application Support/IAQ Gest/dades
- Linux: ~/.config/IAQ Gest/dades

Per obrir-la, fes servir el menú de la **icona del programa** (al costat del rellotge) → **Obre la carpeta de dades**. Desinstal·lar o actualitzar el programa no l'esborra.

# Carpeta externa: imprescindible

Una còpia al mateix ordinador no protegeix d'una avaria. Configura una **Carpeta externa**:

1. Connecta un llapis USB o tria una carpeta sincronitzada amb el núvol (OneDrive, Google Drive…).
2. Escriu-ne la **Ruta de la carpeta** (per exemple, E:\\Copies o la carpeta de OneDrive).
3. Clica **Prova** per comprovar que s'hi pot escriure, i desa.

A partir d'aquí cada còpia s'hi desa també. Si un dia falla (per exemple, el USB no hi és), el tauler ho avisa.

# Còpies a mà

- **Fes una còpia ara**: abans d'un canvi important.
- **Descarrega una còpia de seguretat**: un fitxer .db que pots guardar on vulguis.

# El fitxer clau.key

Les contrasenyes guardades al programa (correu, FTP, certificat digital, xarxes socials) es guarden **xifrades** amb una clau que és al fitxer **clau.key**, a la carpeta de dades. Una còpia sense aquest fitxer conté totes les dades, però no aquestes contrasenyes.

> Compte: guarda una còpia de clau.key en un lloc segur i **separat** de les còpies (per exemple, un USB a l'armari de l'entitat). Si es perd, no passa res greu: només caldrà tornar a escriure aquestes contrasenyes a Configuració.

# Restaurar una còpia

1. A **Restaurar una còpia**, tria el fitxer (.db).
2. Clica **Verifica**: comprova que és correcte i quantes dades té, sense canviar res.
3. Clica **Restaura** i confirma.
4. Atura el programa amb **Surt** al menú de la icona del programa (al costat del rellotge) i torna'l a obrir. La restauració es fa en arrencar.

Les dades que hi havia es conserven en un fitxer a part, per si de cas. Mentre no reinicies, pots fer **Cancel·la la restauració**. Si la còpia ve d'un altre ordinador, copia també clau.key a la carpeta de dades (amb el programa aturat) o torna a escriure les contrasenyes guardades.

> Consell: si el programa no arrenca de cap manera, es pot restaurar a mà: atura'l (menú de la icona → **Surt**), obre la carpeta de dades, mou a una altra carpeta el fitxer iaraque.db (i, si n'hi ha, iaraque.db-wal i iaraque.db-shm), copia-hi el fitxer de la còpia amb el nom iaraque.db i torna a obrir el programa.`,
      es: `Todos los datos de la entidad se guardan en **un único archivo** en este ordenador. Si el ordenador se estropea, lo roban o entra un virus, solo las copias os salvarán. Todo esto se hace en [Configuración](/configuracio), pestaña **Copia de seguridad** (solo Administración).

# Copias automáticas

Cada día que el programa está en marcha se hace una copia automática en la subcarpeta **copies** de la carpeta de datos. Se conservan las de los **últimos 7 días** y la **primera de cada mes de los últimos 12 meses**. El [Panel](/) avisa si hace más de 7 días que no se hace ninguna.

# La carpeta de datos

La base de datos, el archivo clau.key y las copias automáticas están en la carpeta de datos del programa, en este ordenador:

- Windows: %APPDATA%\\IAQ Gest\\dades
- Mac: ~/Library/Application Support/IAQ Gest/dades
- Linux: ~/.config/IAQ Gest/dades

Para abrirla, usa el menú del **icono del programa** (junto al reloj) → **Abrir la carpeta de datos**. Desinstalar o actualizar el programa no la borra.

# Carpeta externa: imprescindible

Una copia en el mismo ordenador no protege de una avería. Configura una **Carpeta externa**:

1. Conecta un lápiz USB o elige una carpeta sincronizada con la nube (OneDrive, Google Drive…).
2. Escribe su **Ruta de la carpeta** (por ejemplo, E:\\Copias o la carpeta de OneDrive).
3. Haz clic en **Probar** para comprobar que se puede escribir en ella, y guarda.

A partir de aquí cada copia se guarda también allí. Si un día falla (por ejemplo, el USB no está), el panel lo avisa.

# Copias a mano

- **Haz una copia ahora**: antes de un cambio importante.
- **Descargar una copia de seguridad**: un archivo .db que puedes guardar donde quieras.

# El archivo clau.key

Las contraseñas guardadas en el programa (correo, FTP, certificado digital, redes sociales) se guardan **cifradas** con una clave que está en el archivo **clau.key**, en la carpeta de datos. Una copia sin este archivo contiene todos los datos, pero no esas contraseñas.

> Atención: guarda una copia de clau.key en un lugar seguro y **separado** de las copias (por ejemplo, un USB en el armario de la entidad). Si se pierde, no pasa nada grave: solo habrá que volver a escribir esas contraseñas en Configuración.

# Restaurar una copia

1. En **Restaurar una copia**, elige el archivo (.db).
2. Haz clic en **Verificar**: comprueba que es correcto y cuántos datos tiene, sin cambiar nada.
3. Haz clic en **Restaurar** y confirma.
4. Detén el programa con **Salir** en el menú del icono del programa (junto al reloj) y vuelve a abrirlo. La restauración se hace al arrancar.

Los datos que había se conservan en un archivo aparte, por si acaso. Mientras no reinicies, puedes hacer **Cancelar la restauración**. Si la copia viene de otro ordenador, copia también clau.key en la carpeta de datos (con el programa detenido) o vuelve a escribir las contraseñas guardadas.

> Consejo: si el programa no arranca de ninguna manera, se puede restaurar a mano: detenlo (menú del icono → **Salir**), abre la carpeta de datos, mueve a otra carpeta el archivo iaraque.db (y, si los hay, iaraque.db-wal e iaraque.db-shm), copia allí el archivo de la copia con el nombre iaraque.db y vuelve a abrir el programa.`,
      en: `All the association's data is stored in **a single file** on this computer. If the computer breaks down, is stolen or gets a virus, only backups will save you. All of this is done in [Settings](/configuracio), **Backup** tab (Administration only).

# Automatic backups

Every day the program is running, an automatic backup is made in the **copies** subfolder of the data folder. The backups from the **last 7 days** and the **first of each month for the last 12 months** are kept. The [Dashboard](/) warns you if no backup has been made for more than 7 days.

# The data folder

The database, the clau.key file and the automatic backups are in the program's data folder, on this computer:

- Windows: %APPDATA%\\IAQ Gest\\dades
- Mac: ~/Library/Application Support/IAQ Gest/dades
- Linux: ~/.config/IAQ Gest/dades

To open it, use the menu of the **program's icon** (next to the clock) → **Open data folder**. Uninstalling or updating the program does not delete it.

# External folder: essential

A backup on the same computer does not protect you from a breakdown. Set up an **External folder**:

1. Plug in a USB stick or choose a folder synced to the cloud (OneDrive, Google Drive…).
2. Type its **Folder path** (for example, E:\\Backups or your OneDrive folder).
3. Click **Test** to check it can be written to, and save.

From then on, every backup is also saved there. If it fails one day (for example, the USB stick isn't plugged in), the dashboard tells you.

# Manual backups

- **Back up now**: before an important change.
- **Download a backup**: a .db file you can keep wherever you like.

# The clau.key file

Passwords stored in the program (email, FTP, digital certificate, social media) are stored **encrypted** with a key kept in the **clau.key** file, in the data folder. A backup without this file contains all the data, but not those passwords.

> Warning: keep a copy of clau.key somewhere safe and **separate** from the backups (for example, a USB stick in the association's cupboard). If it is lost, nothing serious happens: you will just need to type those passwords again in Settings.

# Restoring a backup

1. Under **Restore a backup**, choose the file (.db).
2. Click **Verify**: it checks the file is valid and how much data it holds, without changing anything.
3. Click **Restore** and confirm.
4. Stop the program with **Quit** in the program icon's menu (next to the clock) and open it again. The restore happens on start-up.

The data that was there is kept in a separate file, just in case. Until you restart, you can use **Cancel the restore**. If the backup comes from another computer, also copy clau.key into the data folder (with the program stopped) or type the stored passwords again.

> Tip: if the program won't start at all, you can restore by hand: stop it (icon menu → **Quit**), open the data folder, move the iaraque.db file (and, if present, iaraque.db-wal and iaraque.db-shm) to another folder, copy the backup file there with the name iaraque.db and open the program again.`,
    },
  },
  {
    id: 'actualitzar',
    seccio: 'sistema',
    titol: { ca: 'Actualitzar el programa', es: 'Actualizar el programa', en: 'Updating the program' },
    resum: {
      ca: 'Com instal·lar una versió nova sense perdre cap dada i com portar les dades de la versió antiga o d\'un altre ordinador.',
      es: 'Cómo instalar una versión nueva sin perder ningún dato y cómo traer los datos de la versión antigua o de otro ordenador.',
      en: 'How to install a new version without losing any data, and how to bring the data from the old version or another computer.',
    },
    paraules: ['actualitzar', 'actualizar', 'update', 'versió', 'versión', 'version', 'instal·lador', 'instalador', 'installer', 'migrar', 'migrate', 'Iniciar.bat', 'Actualitzar.bat', 'iaraque.db', 'clau.key', 'ordinador nou', 'ordenador nuevo', 'new computer'],
    cos: {
      ca: `De tant en tant hi haurà versions noves del programa amb millores i correccions. Actualitzar **no toca les dades**: la carpeta de dades (base de dades, còpies i clau.key) és a part del programa i es conserva sempre.

# Pas a pas

1. Descarrega l'instal·lador de la versió nova de la pàgina de descàrregues del projecte.
2. Atura el programa: menú de la icona del costat del rellotge → **Surt**.
3. Instal·la la versió nova, igual que la primera vegada (vegeu [Instal·lar i obrir el programa](/ajuda/installar)):

- **Windows**: executa el nou fitxer .exe. S'actualitza al mateix lloc i amb les mateixes dreceres.
- **Mac**: obre el nou .dmg, arrossega el programa a **Aplicacions** i tria substituir el que hi ha.
- **Linux**: fes servir el nou fitxer .AppImage (pots esborrar l'antic) o instal·la el nou .deb.

Després, obre el programa. La primera vegada que s'obre una versió nova, fa sol una **còpia de seguretat** abans de tocar res.

# Quina versió tinc?

La versió instal·lada surt a la part de baix del menú lateral i a [Configuració](/configuracio), pestanya **Còpia de seguretat**, a **Versió del programa**.

# Si alguna cosa falla

- Abans d'obrir una versió nova es guarda una còpia a la subcarpeta copies de la carpeta de dades, amb un nom que comença per «abans-actualitzar». Si cal tornar enrere, es pot restaurar (vegeu [Còpies de seguretat i restauració](/ajuda/copies-seguretat)).
- Si la versió nova no s'obre, torna a instal·lar l'anterior: les dades continuen a la carpeta de dades.

# Passar de la versió antiga (Iniciar.bat) o d'un altre ordinador

Si fins ara obríeu el programa amb Iniciar.bat, o el teníeu en un altre ordinador, podeu portar-ne totes les dades a la versió instal·lada:

1. Tanca del tot el programa antic.
2. Instal·la i obre el programa nou. No cal completar l'assistent inicial.
3. Al menú de la icona del programa nou, clica **Obre la carpeta de dades** i, després, **Surt** (la carpeta queda oberta).
4. Copia-hi els fitxers **iaraque.db** i **clau.key** del programa antic (són a la seva carpeta **data**; si ve d'un altre ordinador instal·lat, a la seva carpeta de dades), substituint els que hi ha.
5. Torna a obrir el programa: hi trobareu totes les dades, els usuaris i les contrasenyes de sempre.

# Si feu servir la versió del codi font

Si el vostre programa està instal·lat a partir del codi font i s'obre amb Iniciar.bat, s'actualitza amb Actualitzar.bat, tal com explica el fitxer README del programa.

> Consell: fes l'actualització un dia tranquil, no just abans d'una assemblea, i comprova després que tot funciona.`,
      es: `De vez en cuando habrá versiones nuevas del programa con mejoras y correcciones. Actualizar **no toca los datos**: la carpeta de datos (base de datos, copias y clau.key) está aparte del programa y se conserva siempre.

# Paso a paso

1. Descarga el instalador de la versión nueva de la página de descargas del proyecto.
2. Detén el programa: menú del icono junto al reloj → **Salir**.
3. Instala la versión nueva, igual que la primera vez (véase [Instalar y abrir el programa](/ajuda/installar)):

- **Windows**: ejecuta el nuevo archivo .exe. Se actualiza en el mismo sitio y con los mismos accesos directos.
- **Mac**: abre el nuevo .dmg, arrastra el programa a **Aplicaciones** y elige sustituir el que hay.
- **Linux**: usa el nuevo archivo .AppImage (puedes borrar el antiguo) o instala el nuevo .deb.

Después, abre el programa. La primera vez que se abre una versión nueva, hace sola una **copia de seguridad** antes de tocar nada.

# ¿Qué versión tengo?

La versión instalada sale en la parte de abajo del menú lateral y en [Configuración](/configuracio), pestaña **Copia de seguridad**, en **Versión del programa**.

# Si algo falla

- Antes de abrir una versión nueva se guarda una copia en la subcarpeta copies de la carpeta de datos, con un nombre que empieza por «abans-actualitzar». Si hay que volver atrás, se puede restaurar (véase [Copias de seguridad y restauración](/ajuda/copies-seguretat)).
- Si la versión nueva no se abre, vuelve a instalar la anterior: los datos siguen en la carpeta de datos.

# Pasar de la versión antigua (Iniciar.bat) o de otro ordenador

Si hasta ahora abríais el programa con Iniciar.bat, o lo teníais en otro ordenador, podéis traer todos sus datos a la versión instalada:

1. Cierra del todo el programa antiguo.
2. Instala y abre el programa nuevo. No hace falta completar el asistente inicial.
3. En el menú del icono del programa nuevo, haz clic en **Abrir la carpeta de datos** y, después, en **Salir** (la carpeta queda abierta).
4. Copia allí los archivos **iaraque.db** y **clau.key** del programa antiguo (están en su carpeta **data**; si viene de otro ordenador con la versión instalada, en su carpeta de datos), sustituyendo los que hay.
5. Vuelve a abrir el programa: encontraréis todos los datos, los usuarios y las contraseñas de siempre.

# Si usáis la versión del código fuente

Si vuestro programa está instalado a partir del código fuente y se abre con Iniciar.bat, se actualiza con Actualitzar.bat, tal como explica el archivo README del programa.

> Consejo: haz la actualización un día tranquilo, no justo antes de una asamblea, y comprueba después que todo funciona.`,
      en: `From time to time there will be new versions of the program with improvements and fixes. Updating **does not touch the data**: the data folder (database, backups and clau.key) is kept separate from the program and is always preserved.

# Step by step

1. Download the new version's installer from the project's downloads page.
2. Stop the program: icon next to the clock → **Quit**.
3. Install the new version, just like the first time (see [Installing and opening the program](/ajuda/installar)):

- **Windows**: run the new .exe file. It updates in place, with the same shortcuts.
- **Mac**: open the new .dmg, drag the program to **Applications** and choose to replace the existing one.
- **Linux**: use the new .AppImage file (you can delete the old one) or install the new .deb.

Then open the program. The first time a new version opens, it makes a **backup** by itself before touching anything.

# Which version do I have?

The installed version is shown at the bottom of the side menu and in [Settings](/configuracio), **Backup** tab, under **Program version**.

# If something goes wrong

- Before a new version opens, a backup is saved in the copies subfolder of the data folder, with a name starting with "abans-actualitzar". If you need to go back, it can be restored (see [Backups and restoring](/ajuda/copies-seguretat)).
- If the new version does not open, reinstall the previous one: the data is still in the data folder.

# Moving from the old version (Iniciar.bat) or another computer

If until now you opened the program with Iniciar.bat, or had it on another computer, you can bring all its data to the installed version:

1. Close the old program completely.
2. Install and open the new program. You don't need to complete the setup wizard.
3. In the new program's icon menu, click **Open data folder** and then **Quit** (the folder stays open).
4. Copy the **iaraque.db** and **clau.key** files from the old program into it (they are in its **data** folder; if it comes from another computer with the installed version, in its data folder), replacing the existing ones.
5. Open the program again: all the data, users and passwords will be there as before.

# If you use the source-code version

If your program was set up from the source code and opens with Iniciar.bat, it is updated with Actualitzar.bat, as explained in the program's README file.

> Tip: update on a quiet day, not just before a general assembly, and check afterwards that everything works.`,
    },
  },
  {
    id: 'seguretat',
    seccio: 'sistema',
    titol: { ca: 'Seguretat i accés', es: 'Seguridad y acceso', en: 'Security and access' },
    resum: {
      ca: 'Contrasenyes, bloqueig després d\'intents fallits, sessions, perfils i com recuperar l\'accés d\'administració.',
      es: 'Contraseñas, bloqueo tras intentos fallidos, sesiones, perfiles y cómo recuperar el acceso de administración.',
      en: 'Passwords, lockout after failed attempts, sessions, profiles and how to recover administrator access.',
    },
    paraules: ['contrasenya', 'contraseña', 'password', 'bloqueig', 'bloqueo', 'lockout', 'sessió', 'sesión', 'session', 'administrador', 'admin', 'restableix-admin', 'oblidat', 'olvidado', 'forgot', 'accés', 'acceso', 'access', 'registre d\'activitat'],
    cos: {
      ca: `El programa conté dades personals de socis, alguns menors. Per això s'hi entra amb usuari i contrasenya i cada perfil només veu el que li toca.

# Contrasenyes

- Han de tenir **almenys 8 caràcters**. Millor una frase llarga que una paraula curta.
- Es guarden protegides: ningú, ni l'administració, no pot veure la teva contrasenya.
- Per canviar-la: [Configuració](/configuracio) → **Usuaris** → **La meva contrasenya**: escriu la **Contrasenya actual**, la nova dues vegades i clica **Canvia la contrasenya**.
- Si algú de la junta l'ha oblidat, l'administració li'n pot posar una de nova a **Usuaris del programa**.

# Bloqueig després d'intents fallits

Després de **5 intents fallits** amb el mateix usuari (o 10 des del mateix ordinador), l'entrada queda bloquejada **15 minuts**. Espera i torna-ho a provar amb calma.

# Sessions

- La sessió dura fins a **30 dies** al mateix navegador. En un ordinador compartit, clica **Surt** en acabar.
- Quan es canvia una contrasenya o es desactiva un usuari, es tanquen totes les seves altres sessions.
- Quan algú deixa la junta, desactiva el seu usuari (desmarca **Actiu**) en lloc d'esborrar-lo.

# Registre d'activitat

El programa anota les entrades, els intents fallits, els canvis d'usuaris, les exportacions de dades personals, les còpies… Es consulta a [Protecció de dades](/proteccio-dades).

# Si ningú no recorda la contrasenya d'administració

Hi ha una manera de crear o restablir un usuari d'administració, però **cal algú amb accés físic a l'ordinador** i una mica de traça amb la finestra d'ordres:

1. Atura el programa: menú de la icona del costat del rellotge → **Surt**.
2. Obre una finestra d'ordres: a Windows, el **Símbol del sistema**; al Mac i a Linux, el **Terminal**.
3. Executa el programa amb --restableix-admin, el nom d'usuari i la contrasenya nova. Per exemple, per a l'usuari thorkel:

- **Windows**: "%LOCALAPPDATA%\\Programs\\IAQ Gest\\IAQ Gest.exe" --restableix-admin thorkel NovaContrasenya123 (si es va instal·lar per a tots els usuaris de l'ordinador, la ruta comença per C:\\Program Files\\IAQ Gest\\).
- **Mac**: "/Applications/IAQ Gest.app/Contents/MacOS/IAQ Gest" --restableix-admin thorkel NovaContrasenya123
- **Linux (AppImage)**: des de la carpeta on hi ha el fitxer, ./IAQ-Gest.AppImage --restableix-admin thorkel NovaContrasenya123

Després, torna a obrir el programa i entra amb aquest usuari i la contrasenya nova (i canvia-la per una de pròpia).

Si l'usuari existeix, se li canvia la contrasenya, passa a ser administrador i es reactiva; si no, es crea. Queda anotat al registre d'activitat.

# Bons hàbits

- Protegeix també l'ordinador: contrasenya de Windows i, si pot ser, xifratge del disc (BitLocker).
- Per defecte el programa només s'obre des del mateix ordinador. No l'obriu a la xarxa si no és una xarxa de confiança.
- No compartiu usuaris: cada persona, el seu.`,
      es: `El programa contiene datos personales de socios, algunos menores. Por eso se entra con usuario y contraseña y cada perfil solo ve lo que le corresponde.

# Contraseñas

- Deben tener **al menos 8 caracteres**. Mejor una frase larga que una palabra corta.
- Se guardan protegidas: nadie, ni la administración, puede ver tu contraseña.
- Para cambiarla: [Configuración](/configuracio) → **Usuarios** → **Mi contraseña**: escribe la **Contraseña actual**, la nueva dos veces y haz clic en **Cambia la contraseña**.
- Si alguien de la junta la ha olvidado, la administración le puede poner una nueva en **Usuarios del programa**.

# Bloqueo tras intentos fallidos

Después de **5 intentos fallidos** con el mismo usuario (o 10 desde el mismo ordenador), la entrada queda bloqueada **15 minutos**. Espera y vuelve a probarlo con calma.

# Sesiones

- La sesión dura hasta **30 días** en el mismo navegador. En un ordenador compartido, haz clic en **Salir** al terminar.
- Cuando se cambia una contraseña o se desactiva un usuario, se cierran todas sus otras sesiones.
- Cuando alguien deja la junta, desactiva su usuario (desmarca **Activo**) en lugar de borrarlo.

# Registro de actividad

El programa anota las entradas, los intentos fallidos, los cambios de usuarios, las exportaciones de datos personales, las copias… Se consulta en [Protección de datos](/proteccio-dades).

# Si nadie recuerda la contraseña de administración

Hay una forma de crear o restablecer un usuario de administración, pero **hace falta alguien con acceso físico al ordenador** y algo de soltura con la ventana de órdenes:

1. Detén el programa: menú del icono junto al reloj → **Salir**.
2. Abre una ventana de órdenes: en Windows, el **Símbolo del sistema**; en el Mac y en Linux, el **Terminal**.
3. Ejecuta el programa con --restableix-admin, el nombre de usuario y la contraseña nueva. Por ejemplo, para el usuario thorkel:

- **Windows**: "%LOCALAPPDATA%\\Programs\\IAQ Gest\\IAQ Gest.exe" --restableix-admin thorkel NovaContrasenya123 (si se instaló para todos los usuarios del ordenador, la ruta empieza por C:\\Program Files\\IAQ Gest\\).
- **Mac**: "/Applications/IAQ Gest.app/Contents/MacOS/IAQ Gest" --restableix-admin thorkel NovaContrasenya123
- **Linux (AppImage)**: desde la carpeta donde está el archivo, ./IAQ-Gest.AppImage --restableix-admin thorkel NovaContrasenya123

Después, vuelve a abrir el programa y entra con ese usuario y la contraseña nueva (y cámbiala por una propia).

Si el usuario existe, se le cambia la contraseña, pasa a ser administrador y se reactiva; si no, se crea. Queda anotado en el registro de actividad.

# Buenos hábitos

- Protege también el ordenador: contraseña de Windows y, si puede ser, cifrado del disco (BitLocker).
- Por defecto el programa solo se abre desde el mismo ordenador. No lo abráis a la red si no es una red de confianza.
- No compartáis usuarios: cada persona, el suyo.`,
      en: `The program holds members' personal data, some of them minors. That is why you sign in with a user name and password, and each profile only sees what it needs.

# Passwords

- They must be **at least 8 characters** long. A long phrase is better than a short word.
- They are stored protected: nobody, not even the administrator, can see your password.
- To change it: [Settings](/configuracio) → **Users** → **My password**: type the **Current password**, the new one twice and click **Change password**.
- If a board member has forgotten theirs, the administrator can set a new one in **Program users**.

# Lockout after failed attempts

After **5 failed attempts** with the same user name (or 10 from the same computer), signing in is blocked for **15 minutes**. Wait and try again calmly.

# Sessions

- A session lasts up to **30 days** in the same browser. On a shared computer, click **Sign out** when you finish.
- When a password is changed or a user is deactivated, all their other sessions are closed.
- When someone leaves the board, deactivate their user (untick **Active**) instead of deleting it.

# Activity log

The program records sign-ins, failed attempts, user changes, exports of personal data, backups… You can check it in [Data protection](/proteccio-dades).

# If nobody remembers the administrator password

There is a way to create or reset an administrator user, but **it needs someone with physical access to the computer** who is comfortable with a command window:

1. Stop the program: icon next to the clock → **Quit**.
2. Open a command window: on Windows, **Command Prompt**; on a Mac or Linux, **Terminal**.
3. Run the program with --restableix-admin, the username and the new password. For example, for the user thorkel:

- **Windows**: "%LOCALAPPDATA%\\Programs\\IAQ Gest\\IAQ Gest.exe" --restableix-admin thorkel NovaContrasenya123 (if it was installed for all users of the computer, the path starts with C:\\Program Files\\IAQ Gest\\).
- **Mac**: "/Applications/IAQ Gest.app/Contents/MacOS/IAQ Gest" --restableix-admin thorkel NovaContrasenya123
- **Linux (AppImage)**: from the folder containing the file, ./IAQ-Gest.AppImage --restableix-admin thorkel NovaContrasenya123

Then open the program again and sign in with that user and the new password (and change it to one of your own).

If the user exists, its password is changed, it becomes an administrator and is reactivated; if not, it is created. This is recorded in the activity log.

# Good habits

- Protect the computer too: a Windows password and, if possible, disk encryption (BitLocker).
- By default the program can only be opened from the same computer. Do not open it to the network unless it is a trusted network.
- Don't share users: one per person.`,
    },
  },
  {
    id: 'correu',
    seccio: 'sistema',
    titol: { ca: 'Correu electrònic', es: 'Correo electrónico', en: 'Email' },
    resum: {
      ca: 'Configurar el compte per enviar comunicacions (servidor de la web o Gmail) i qui les rep.',
      es: 'Configurar la cuenta para enviar comunicaciones (servidor de la web o Gmail) y quién las recibe.',
      en: 'Setting up the account for sending communications (website server or Gmail) and who receives them.',
    },
    paraules: ['correu', 'correo', 'email', 'SMTP', 'Gmail', 'contrasenya d\'aplicació', 'contraseña de aplicación', 'app password', 'comunicacions', 'comunicaciones', 'communications', 'brossa', 'spam', 'remitent', 'remitente', 'sender'],
    cos: {
      ca: `El programa envia correus als socis (comunicacions, convocatòries, rebuts…) a través d'un compte de correu de l'entitat. Es configura a [Configuració](/configuracio), pestanya **Correu**.

# Quin compte faig servir?

- **Servidor de la web** (recomanat): el compte de correu del vostre allotjament web, per exemple info@lavostraweb.cat. Els missatges surten amb el domini de l'entitat i és menys probable que acabin al correu brossa.
- **Gmail**: un compte de Gmail de l'entitat. Cal activar la **verificació en dos passos** al compte de Google i crear-hi una **contrasenya d'aplicació**: la contrasenya normal de Gmail **no funciona**.

# Configurar-lo

1. Tria **Servidor de la web** o **Gmail**.
2. Omple el **Servidor SMTP** (per exemple mail.lavostraweb.cat o smtp.gmail.com), el **Port** i la **Connexió**: **SSL/TLS** (normalment port 465) o **STARTTLS** (normalment port 587). Aquestes dades les dona l'empresa d'allotjament.
3. **Usuari**: normalment, l'adreça de correu sencera.
4. **Contrasenya**: la del compte o, amb Gmail, la contrasenya d'aplicació. Un cop desada, es guarda xifrada; deixa-la en blanc per mantenir-la.
5. **Remitent**: com el veuen els socis, per exemple «Associació I ara qué? <info@…>».
6. Desa i, a **Adreça per a la prova**, escriu el teu correu i clica **Envia una prova**. Comprova la safata d'entrada i el correu brossa.

# Qui rep les comunicacions

Des de [Comunicacions](/comunicacions) tries a qui va dirigit: tots els socis actius, una etiqueta, una franja d'edat, els que tenen la quota pendent o els inscrits a una activitat. Els correus s'envien **un per un**, personalitzats amb el nom, i queden a l'historial de cada soci.

- Només el reben les persones que tenen **correu electrònic** a la fitxa.
- Qui ha dit que **no vol rebre comunicacions** queda fora, i el programa us diu quantes persones s'han exclòs.
- Les **convocatòries** estatutàries d'assemblea o junta sí que s'envien a tothom, perquè no són publicitat.

> Consell: els proveïdors limiten quants correus es poden enviar per dia. Si teniu molts socis, feu servir el correu del servidor de la web i consulteu-ne el límit amb l'allotjament.`,
      es: `El programa envía correos a los socios (comunicaciones, convocatorias, recibos…) a través de una cuenta de correo de la entidad. Se configura en [Configuración](/configuracio), pestaña **Correo**.

# ¿Qué cuenta uso?

- **Servidor de la web** (recomendado): la cuenta de correo de vuestro alojamiento web, por ejemplo info@vuestraweb.es. Los mensajes salen con el dominio de la entidad y es menos probable que acaben en el correo no deseado.
- **Gmail**: una cuenta de Gmail de la entidad. Hay que activar la **verificación en dos pasos** en la cuenta de Google y crear una **contraseña de aplicación**: la contraseña normal de Gmail **no funciona**.

# Configurarlo

1. Elige **Servidor de la web** o **Gmail**.
2. Rellena el **Servidor SMTP** (por ejemplo mail.vuestraweb.es o smtp.gmail.com), el **Puerto** y la **Conexión**: **SSL/TLS** (normalmente puerto 465) o **STARTTLS** (normalmente puerto 587). Estos datos los da la empresa de alojamiento.
3. **Usuario**: normalmente, la dirección de correo completa.
4. **Contraseña**: la de la cuenta o, con Gmail, la contraseña de aplicación. Una vez guardada, se guarda cifrada; déjala en blanco para mantenerla.
5. **Remitente**: cómo lo ven los socios, por ejemplo «Asociación I ara qué? <info@…>».
6. Guarda y, en **Dirección para la prueba**, escribe tu correo y haz clic en **Enviar una prueba**. Comprueba la bandeja de entrada y el correo no deseado.

# Quién recibe las comunicaciones

Desde [Comunicaciones](/comunicacions) eliges a quién va dirigido: todos los socios activos, una etiqueta, una franja de edad, los que tienen la cuota pendiente o los inscritos en una actividad. Los correos se envían **uno por uno**, personalizados con el nombre, y quedan en el historial de cada socio.

- Solo lo reciben las personas que tienen **correo electrónico** en la ficha.
- Quien ha dicho que **no quiere recibir comunicaciones** queda fuera, y el programa os dice cuántas personas se han excluido.
- Las **convocatorias** estatutarias de asamblea o junta sí se envían a todos, porque no son publicidad.

> Consejo: los proveedores limitan cuántos correos se pueden enviar al día. Si tenéis muchos socios, usad el correo del servidor de la web y consultad su límite con el alojamiento.`,
      en: `The program sends emails to members (communications, meeting notices, receipts…) through one of the association's email accounts. It is set up in [Settings](/configuracio), **Email** tab.

# Which account should I use?

- **Website server** (recommended): the email account from your web hosting, for example info@yourwebsite.org. Messages go out with the association's domain and are less likely to end up in spam.
- **Gmail**: a Gmail account belonging to the association. You must turn on **2-Step Verification** in the Google account and create an **app password**: the normal Gmail password **does not work**.

# Setting it up

1. Choose **Website server** or **Gmail**.
2. Fill in the **SMTP server** (for example mail.yourwebsite.org or smtp.gmail.com), the **Port** and the **Connection**: **SSL/TLS** (usually port 465) or **STARTTLS** (usually port 587). Your hosting company provides these details.
3. **User name**: usually the full email address.
4. **Password**: the account's password or, with Gmail, the app password. Once saved, it is stored encrypted; leave it blank to keep it.
5. **Sender**: how members see it, for example "Association I ara qué? <info@…>".
6. Save and, in **Address for the test**, type your email and click **Send a test**. Check the inbox and the spam folder.

# Who receives communications

In [Communications](/comunicacions) you choose who a message is for: all active members, a tag, an age group, those with a pending fee or those registered for an activity. Emails are sent **one by one**, personalised with the name, and are kept in each member's history.

- Only people with an **email address** on their record receive it.
- Anyone who has said they **don't want to receive communications** is left out, and the program tells you how many people were excluded.
- Statutory **meeting notices** for the assembly or board are sent to everyone, because they are not advertising.

> Tip: providers limit how many emails can be sent per day. If you have many members, use the website server's email and check its limit with your hosting company.`,
    },
  },
];

export const PREGUNTES: Pregunta[] = [
  {
    pregunta: {
      ca: 'Podem fer servir el programa cadascú des de casa seva?',
      es: '¿Podemos usar el programa cada uno desde su casa?',
      en: 'Can each of us use the program from home?',
    },
    resposta: {
      ca: 'Sí. El programa s’instal·la en un sol ordinador, que ha d’estar sempre encès, i cada persona hi entra amb el navegador i el seu usuari. Per fer-ho de manera segura, feu servir Tailscale i compartiu-hi l’ordinador del programa amb cada persona.',
      es: 'Sí. El programa se instala en un solo ordenador, que tiene que estar siempre encendido, y cada persona entra con el navegador y su usuario. Para hacerlo de forma segura, usad Tailscale y compartid el ordenador del programa con cada persona.',
      en: 'Yes. The program is installed on one computer, which must stay on, and each person logs in with a browser and their own user. To do it securely, use Tailscale and share the program’s computer with each person.',
    },
    article: 'treballar-des-de-casa',
  },
  {
    pregunta: {
      ca: 'He publicat una notícia i no surt a la web. Què passa?',
      es: 'He publicado una noticia y no sale en la web. ¿Qué pasa?',
      en: 'I published a news item and it doesn\'t appear on the website. Why?',
    },
    resposta: {
      ca: 'Desar una notícia no la posa a internet: cal publicar la web. Comprova que la notícia té marcada «Publicada» i que la data no és futura (si ho és, queda programada). Després, a Web → Publicació, clica «Publica ara», o activa la publicació automàtica. Si surt «Darrer error», revisa la Connexió FTP.',
      es: 'Guardar una noticia no la pone en internet: hay que publicar la web. Comprueba que la noticia tiene marcada «Publicada» y que la fecha no es futura (si lo es, queda programada). Después, en Web → Publicación, haz clic en «Publicar ahora», o activa la publicación automática. Si sale «Último error», revisa la Conexión FTP.',
      en: 'Saving a news item does not put it online: the website has to be published. Check the item has "Published" ticked and that its date is not in the future (if it is, it is scheduled). Then, in Website, first tab, click "Publish now", or turn on automatic publishing. If "Last error" appears, check the FTP connection.',
    },
    article: 'web',
  },
  {
    pregunta: {
      ca: 'Com canvio els colors de la web?',
      es: '¿Cómo cambio los colores de la web?',
      en: 'How do I change the website colours?',
    },
    resposta: {
      ca: 'A Web → Disseny. Tria un tema com a punt de partida i ajusta els colors a l\'apartat «Colors». La previsualització canvia a l\'instant. Clica «Desa el disseny»: es veurà a internet en la propera publicació de la web.',
      es: 'En Web → Diseño. Elige un tema como punto de partida y ajusta los colores en el apartado «Colores». La vista previa cambia al instante. Haz clic en «Guardar el diseño»: se verá en internet en la próxima publicación de la web.',
      en: 'In Website → Design. Choose a theme as a starting point and adjust the colours in the "Colours" section. The preview changes instantly. Click "Save design": it will go online the next time the website is published.',
    },
    article: 'disseny-web',
  },
  {
    pregunta: {
      ca: 'He oblidat la contrasenya.',
      es: 'He olvidado la contraseña.',
      en: 'I\'ve forgotten my password.',
    },
    resposta: {
      ca: `Demana a una persona amb perfil d'Administració que te'n posi una de nova a Configuració → Usuaris. Si és la contrasenya d'administració i ningú no la recorda, cal algú amb accés a l'ordinador que executi el programa amb l'opció --restableix-admin. Si has fallat 5 vegades, espera 15 minuts.`,
      es: `Pide a una persona con perfil de Administración que te ponga una nueva en Configuración → Usuarios. Si es la contraseña de administración y nadie la recuerda, hace falta alguien con acceso al ordenador que ejecute el programa con la opción --restableix-admin. Si has fallado 5 veces, espera 15 minutos.`,
      en: `Ask someone with the Administration profile to set a new one for you in Settings → Users. If it is the administrator password and nobody remembers it, someone with access to the computer must run the program with the --restableix-admin option. If you have failed 5 times, wait 15 minutes.`,
    },
    article: 'seguretat',
  },
  {
    pregunta: {
      ca: 'On són les meves dades?',
      es: '¿Dónde están mis datos?',
      en: 'Where is my data?',
    },
    resposta: {
      ca: `A la carpeta de dades del programa, en aquest ordinador: a Windows, %APPDATA%\\IAQ Gest\\dades; al Mac, ~/Library/Application Support/IAQ Gest/dades; a Linux, ~/.config/IAQ Gest/dades. S'obre fàcilment amb la icona del costat del rellotge → Obre la carpeta de dades. No s'envien a cap servidor d'internet (només la web pública, quan la publiqueu), i desinstal·lar el programa no les esborra. Per això són tan importants les còpies a una carpeta externa i guardar el fitxer clau.key.`,
      es: `En la carpeta de datos del programa, en este ordenador: en Windows, %APPDATA%\\IAQ Gest\\dades; en el Mac, ~/Library/Application Support/IAQ Gest/dades; en Linux, ~/.config/IAQ Gest/dades. Se abre fácilmente con el icono junto al reloj → Abrir la carpeta de datos. No se envían a ningún servidor de internet (solo la web pública, cuando la publicáis), y desinstalar el programa no los borra. Por eso son tan importantes las copias en una carpeta externa y guardar el archivo clau.key.`,
      en: `In the program's data folder, on this computer: on Windows, %APPDATA%\\IAQ Gest\\dades; on a Mac, ~/Library/Application Support/IAQ Gest/dades; on Linux, ~/.config/IAQ Gest/dades. You can open it easily with the icon next to the clock → Open data folder. Nothing is sent to an internet server (only the public website, when you publish it), and uninstalling the program does not delete it. That is why backups to an external folder and keeping the clau.key file are so important.`,
    },
    article: 'copies-seguretat',
  },
  {
    pregunta: {
      ca: 'Puc fer servir el programa des del mòbil?',
      es: '¿Puedo usar el programa desde el móvil?',
      en: 'Can I use the program from my phone?',
    },
    resposta: {
      ca: 'El programa funciona a l\'ordinador on està instal·lat i, per defecte, només s\'hi pot entrar des d\'aquell ordinador. La pantalla s\'adapta a mides petites, però obrir-lo a altres aparells de la xarxa és una configuració tècnica que només s\'ha de fer en una xarxa de confiança.',
      es: 'El programa funciona en el ordenador donde está instalado y, por defecto, solo se puede entrar desde ese ordenador. La pantalla se adapta a tamaños pequeños, pero abrirlo a otros aparatos de la red es una configuración técnica que solo debe hacerse en una red de confianza.',
      en: 'The program runs on the computer where it is installed and, by default, can only be opened from that computer. The screens adapt to small sizes, but opening it to other devices on the network is a technical setting that should only be done on a trusted network.',
    },
    article: 'seguretat',
  },
  {
    pregunta: {
      ca: 'L\'agent d\'IA pot enviar correus tot sol?',
      es: '¿El agente de IA puede enviar correos solo?',
      en: 'Can the AI agent send emails on its own?',
    },
    resposta: {
      ca: 'No. Enviar correus, publicar, cobrar quotes, emetre factures i altres accions amb efectes fora del programa només queden proposades. Les has d\'aprovar tu a El meu agent d\'IA → Propostes. A més, l\'agent mai no veu correus, telèfons, DNI ni IBAN.',
      es: 'No. Enviar correos, publicar, cobrar cuotas, emitir facturas y otras acciones con efectos fuera del programa solo quedan propuestas. Las tienes que aprobar tú en Mi agente de IA → Propuestas. Además, el agente nunca ve correos, teléfonos, DNI ni IBAN.',
      en: 'No. Sending emails, publishing, collecting fees, issuing invoices and other actions with effects outside the program are only proposed. You have to approve them in My AI agent → Proposals. Also, the agent never sees email addresses, phone numbers, ID numbers or IBANs.',
    },
    article: 'agent-ia',
  },
  {
    pregunta: {
      ca: 'He tancat la finestra però el programa continua obert?',
      es: 'He cerrado la ventana, ¿pero el programa sigue abierto?',
      en: 'I closed the window, but is the program still running?',
    },
    resposta: {
      ca: `Sí, i és normal: en tancar la finestra el programa continua funcionant perquè la junta hi pugui entrar des de casa, perquè funcionin els agents d'IA i perquè es faci la còpia diària. Per tornar a la finestra, clica la icona del costat del rellotge → Obre el programa. Per aturar-lo del tot, al mateix menú, Surt.`,
      es: `Sí, y es normal: al cerrar la ventana el programa sigue funcionando para que la junta pueda entrar desde casa, para que funcionen los agentes de IA y para que se haga la copia diaria. Para volver a la ventana, haz clic en el icono junto al reloj → Abrir el programa. Para detenerlo del todo, en el mismo menú, Salir.`,
      en: `Yes, and that's normal: when you close the window the program keeps running so the board can reach it from home, AI agents keep working and the daily backup is made. To get the window back, click the icon next to the clock → Open the program. To stop it completely, choose Quit in the same menu.`,
    },
    article: 'installar',
  },
  {
    pregunta: {
      ca: 'Com instal·lo el programa en un ordinador nou?',
      es: '¿Cómo instalo el programa en un ordenador nuevo?',
      en: 'How do I install the program on a new computer?',
    },
    resposta: {
      ca: `Descarrega l'instal·lador del teu sistema (Windows, Mac o Linux) de la pàgina de descàrregues del projecte i executa'l; no cal instal·lar res més. El primer cop, l'assistent inicial et demana les dades de l'entitat i crea els usuaris. Si l'entitat ja tenia dades en un altre ordinador, copia després els fitxers iaraque.db i clau.key a la carpeta de dades nova, amb el programa aturat.`,
      es: `Descarga el instalador de tu sistema (Windows, Mac o Linux) de la página de descargas del proyecto y ejecútalo; no hay que instalar nada más. La primera vez, el asistente inicial te pide los datos de la entidad y crea los usuarios. Si la entidad ya tenía datos en otro ordenador, copia después los archivos iaraque.db y clau.key en la carpeta de datos nueva, con el programa detenido.`,
      en: `Download the installer for your system (Windows, Mac or Linux) from the project's downloads page and run it; nothing else needs to be installed. The first time, the setup wizard asks for the association's details and creates the users. If the association already had data on another computer, then copy the iaraque.db and clau.key files into the new data folder, with the program stopped.`,
    },
    article: 'installar',
  },
  {
    pregunta: {
      ca: 'Els correus de prova no arriben. Què reviso?',
      es: 'Los correos de prueba no llegan. ¿Qué reviso?',
      en: 'Test emails don\'t arrive. What should I check?',
    },
    resposta: {
      ca: 'Mira primer el correu brossa. Comprova el servidor, el port i el tipus de connexió (465 amb SSL/TLS o 587 amb STARTTLS). Amb Gmail cal una contrasenya d\'aplicació, no la contrasenya normal.',
      es: 'Mira primero el correo no deseado. Comprueba el servidor, el puerto y el tipo de conexión (465 con SSL/TLS o 587 con STARTTLS). Con Gmail hace falta una contraseña de aplicación, no la contraseña normal.',
      en: 'Check the spam folder first. Then check the server, port and connection type (465 with SSL/TLS or 587 with STARTTLS). With Gmail you need an app password, not the normal password.',
    },
    article: 'correu',
  },
  {
    pregunta: {
      ca: 'Per què a la memòria surten menys persones per edat que assistents?',
      es: '¿Por qué en la memoria salen menos personas por edad que asistentes?',
      en: 'Why does the report show fewer people by age than attendees?',
    },
    resposta: {
      ca: 'Les franges d\'edat i el gènere només es poden comptar de les persones inscrites que hi han assistit, perquè d\'elles se\'n coneix la data de naixement. Els assistents del comptador o dels recomptes manuals sumen a les assistències, però no a les edats.',
      es: 'Las franjas de edad y el género solo se pueden contar de las personas inscritas que han asistido, porque de ellas se conoce la fecha de nacimiento. Los asistentes del contador o de los recuentos manuales suman en las asistencias, pero no en las edades.',
      en: 'Age bands and gender can only be counted for registered people who attended, because their date of birth is known. Attendees from the counter or manual counts add to the attendances, but not to the ages.',
    },
    article: 'informes',
  },
  {
    pregunta: {
      ca: 'Puc posar el programa en anglès i la web en català?',
      es: '¿Puedo poner el programa en castellano y la web en catalán?',
      en: 'Can I use the program in English and publish the website in Catalan?',
    },
    resposta: {
      ca: 'Sí. L\'idioma del programa es tria al menú lateral (per a cada usuari) i l\'idioma de la web a Web → Textos i xarxes → «Idioma de la web».',
      es: 'Sí. El idioma del programa se elige en el menú lateral (para cada usuario) y el idioma de la web en Web → Textos y redes → «Idioma de la web».',
      en: 'Yes. The program language is chosen in the side menu (per user) and the website language in Website → Texts and social media → "Website language".',
    },
    article: 'idiomes',
  },
];

export const GLOSSARI: Terme[] = [
  {
    terme: { ca: 'FTP', es: 'FTP', en: 'FTP' },
    definicio: {
      ca: 'Sistema per pujar fitxers a l\'allotjament web. El programa el fa servir per publicar la web; FTPS és la versió segura (xifrada).',
      es: 'Sistema para subir archivos al alojamiento web. El programa lo usa para publicar la web; FTPS es la versión segura (cifrada).',
      en: 'A way of uploading files to your web hosting. The program uses it to publish the website; FTPS is the secure (encrypted) version.',
    },
  },
  {
    terme: { ca: 'SMTP', es: 'SMTP', en: 'SMTP' },
    definicio: {
      ca: 'El sistema d\'enviament de correu. El «servidor SMTP» és l\'adreça del servei per on surten els correus de l\'entitat.',
      es: 'El sistema de envío de correo. El «servidor SMTP» es la dirección del servicio por donde salen los correos de la entidad.',
      en: 'The system for sending email. The "SMTP server" is the address of the service through which the association\'s emails are sent.',
    },
  },
  {
    terme: { ca: 'Markdown', es: 'Markdown', en: 'Markdown' },
    definicio: {
      ca: 'Manera d\'escriure text amb format amb marques senzilles: **negreta**, *cursiva*, # per als títols, - per a les llistes. L\'editor de notícies i pàgines la fa servir per dins.',
      es: 'Forma de escribir texto con formato mediante marcas sencillas: **negrita**, *cursiva*, # para los títulos, - para las listas. El editor de noticias y páginas la usa por dentro.',
      en: 'A way of writing formatted text with simple marks: **bold**, *italic*, # for headings, - for lists. The news and page editor uses it behind the scenes.',
    },
  },
  {
    terme: { ca: 'Còpia de seguretat', es: 'Copia de seguridad', en: 'Backup' },
    definicio: {
      ca: 'Duplicat del fitxer de dades per recuperar-les si l\'ordinador falla. El programa en fa una cada dia; convé desar-les també en una carpeta externa.',
      es: 'Duplicado del archivo de datos para recuperarlos si el ordenador falla. El programa hace una cada día; conviene guardarlas también en una carpeta externa.',
      en: 'A duplicate of the data file to recover it if the computer fails. The program makes one every day; they should also be saved to an external folder.',
    },
  },
  {
    terme: { ca: 'Clau personal d\'agent', es: 'Clave personal de agente', en: 'Personal agent key' },
    definicio: {
      ca: 'Codi secret que connecta el teu assistent d\'IA al teu compte. Només es mostra una vegada i es pot revocar en qualsevol moment.',
      es: 'Código secreto que conecta tu asistente de IA a tu cuenta. Solo se muestra una vez y se puede revocar en cualquier momento.',
      en: 'A secret code that connects your AI assistant to your account. It is shown only once and can be revoked at any time.',
    },
  },
  {
    terme: { ca: 'MCP', es: 'MCP', en: 'MCP' },
    definicio: {
      ca: 'Model Context Protocol: estàndard perquè els assistents d\'IA (Claude, Gemini, Copilot, LM Studio…) facin servir eines d\'altres programes, com aquest.',
      es: 'Model Context Protocol: estándar para que los asistentes de IA (Claude, Gemini, Copilot, LM Studio…) usen herramientas de otros programas, como este.',
      en: 'Model Context Protocol: a standard that lets AI assistants (Claude, Gemini, Copilot, LM Studio…) use tools from other programs, such as this one.',
    },
  },
  {
    terme: { ca: 'Proposta d\'agent', es: 'Propuesta de agente', en: 'Agent proposal' },
    definicio: {
      ca: 'Acció que l\'agent d\'IA vol fer però que té efectes fora del programa (enviar, publicar, cobrar…). No s\'executa fins que la persona l\'aprova.',
      es: 'Acción que el agente de IA quiere hacer pero que tiene efectos fuera del programa (enviar, publicar, cobrar…). No se ejecuta hasta que la persona la aprueba.',
      en: 'An action the AI agent wants to take that has effects outside the program (sending, publishing, collecting…). It is not carried out until the person approves it.',
    },
  },
  {
    terme: { ca: 'Previsualització', es: 'Vista previa', en: 'Preview' },
    definicio: {
      ca: 'Com quedarà la web abans de publicar-la. El que es veu a la previsualització encara no és a internet.',
      es: 'Cómo quedará la web antes de publicarla. Lo que se ve en la vista previa todavía no está en internet.',
      en: 'How the website will look before it is published. What you see in the preview is not online yet.',
    },
  },
  {
    terme: { ca: 'Publicació automàtica', es: 'Publicación automática', en: 'Automatic publishing' },
    definicio: {
      ca: 'Opció de la web que la torna a publicar sola un minut després de cada canvi, sense haver de clicar «Publica ara».',
      es: 'Opción de la web que la vuelve a publicar sola un minuto después de cada cambio, sin tener que hacer clic en «Publicar ahora».',
      en: 'A website option that republishes it automatically one minute after each change, without clicking "Publish now".',
    },
  },
  {
    terme: { ca: 'Drets d\'imatge', es: 'Derechos de imagen', en: 'Image rights' },
    definicio: {
      ca: 'Consentiment d\'una persona (o del seu tutor, si és menor) perquè se\'n publiquin fotos o vídeos. Sense consentiment no se\'n poden publicar imatges on se la reconegui.',
      es: 'Consentimiento de una persona (o de su tutor, si es menor) para que se publiquen fotos o vídeos suyos. Sin consentimiento no se pueden publicar imágenes en las que se la reconozca.',
      en: 'A person\'s consent (or their guardian\'s, for a minor) for photos or videos of them to be published. Without consent, images in which they can be recognised may not be published.',
    },
  },
  {
    terme: { ca: 'Llista d\'espera', es: 'Lista de espera', en: 'Waiting list' },
    definicio: {
      ca: 'Inscripcions a una activitat plena, per ordre d\'arribada. Quan algú cancel·la, el primer de la llista hi entra sol.',
      es: 'Inscripciones a una actividad llena, por orden de llegada. Cuando alguien cancela, el primero de la lista entra solo.',
      en: 'Registrations for a full activity, in order of arrival. When someone cancels, the first person on the list moves up automatically.',
    },
  },
  {
    terme: { ca: 'Indicadors d\'impacte', es: 'Indicadores de impacto', en: 'Impact indicators' },
    definicio: {
      ca: 'Xifres de la memòria calculades a partir de l\'assistència: persones diferents, sòcies i no sòcies, edats, gènere i activitats intergeneracionals. Útils per justificar subvencions.',
      es: 'Cifras de la memoria calculadas a partir de la asistencia: personas distintas, socias y no socias, edades, género y actividades intergeneracionales. Útiles para justificar subvenciones.',
      en: 'Activity report figures calculated from attendance: different people, members and non-members, ages, gender and intergenerational activities. Useful for grant reports.',
    },
  },
  {
    terme: { ca: 'Exercici', es: 'Ejercicio', en: 'Financial year' },
    definicio: {
      ca: 'L\'any de treball de l\'entitat (de l\'1 de gener al 31 de desembre). Es tria al menú lateral i determina què mostren el tauler, les activitats i els informes.',
      es: 'El año de trabajo de la entidad (del 1 de enero al 31 de diciembre). Se elige en el menú lateral y determina qué muestran el panel, las actividades y los informes.',
      en: 'The association\'s working year (1 January to 31 December). It is chosen in the side menu and determines what the dashboard, activities and reports show.',
    },
  },
  {
    terme: { ca: 'Contrasenya d\'aplicació', es: 'Contraseña de aplicación', en: 'App password' },
    definicio: {
      ca: 'Contrasenya especial que crea Google perquè un programa pugui enviar correu amb Gmail. Cal tenir activada la verificació en dos passos.',
      es: 'Contraseña especial que crea Google para que un programa pueda enviar correo con Gmail. Hay que tener activada la verificación en dos pasos.',
      en: 'A special password created by Google so a program can send email through Gmail. 2-Step Verification must be turned on.',
    },
  },
];
