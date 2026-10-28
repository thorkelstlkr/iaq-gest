# Genera seccions de sitio-web amb els models locals d'Ollama. Ús: python scripts/web-agents.py <model> <seccio> [<seccio>...]
import json, re, sys, urllib.request, pathlib
arrel = pathlib.Path(__file__).resolve().parent.parent / 'sitio-web'
brief = (arrel / 'BRIEF.md').read_text(encoding='utf-8')
REGLES = """Escribe SOLO el HTML de UNA sección (<section id="..." class="seccion">…</section>), en castellano, sin explicaciones, sin <html>/<head>/<body>, sin CSS ni JS, sin bloques markdown.
Dentro usa <div class="contenidor"> y SOLO estas clases: seccion, seccion-alt (añádela a la section si se indica fondo alterno), contenidor, titol-seccio (en el <h2>), entradeta (párrafo introductorio), graella (rejilla de tarjetas), targeta (cada tarjeta, con <h3> y <p> o <ul>), icona (un emoji dentro de <span class="icona"> al inicio de la tarjeta), boto, boto-sec, xip, codi (en <pre class="codi"><code>), cites (lista <ul class="cites"> de frases de ejemplo), faq (contenedor de <details>).
No inventes datos, cifras, precios, enlaces ni funciones que no estén en el brief. Texto cercano y claro para juntas directivas no técnicas."""
SECCIONS = {
    'mcp': 'Sección id="mcp" (la más importante y extensa). Título: «Diseñado para la IA: arquitectura MCP». Explica en 2 frases qué es MCP. Luego una graella con 6 targetes: cada persona su asistente y su clave personal; permisos según el cargo; propuestas que se aprueban con un clic (tres niveles lectura/escritura/propuesta); nunca ve datos sensibles; conexión con Claude.ai y ChatGPT por OAuth con código de un solo uso; registro de actividad y acceso remoto con Tailscale. Después un <h3>«Pídeselo a tu asistente»</h3> con la lista cites de los 6 ejemplos del brief. Por último <h3>«Conéctalo en un minuto»</h3>, un párrafo que mencione el servidor MCP por HTTP, el puente stdio y OpenAPI 3.1, y el bloque codi con la configuración JSON EXACTA del brief.',
    'funciones': 'Sección id="funciones" class="seccion seccion-alt". Título «Todo lo que necesita tu asociación». graella con 5 targetes (Personas, Economía, Actividades y difusión, Gobierno y cumplimiento, Sistema), cada una con una <ul> con los elementos del brief.',
    'faq': 'Sección id="faq" class="seccion seccion-alt". Título «Preguntas frecuentes». Dentro de <div class="faq"> 6 <details><summary>pregunta</summary><p>respuesta</p></details>: ¿Es realmente gratis?; ¿Necesito saber de IA o de informática?; ¿Puedo usarlo sin asistente de IA?; ¿El asistente puede ver los DNI o las cuentas bancarias?; ¿Dónde se guardan los datos?; ¿Puedo usarlo desde casa?. Respuestas basadas solo en el brief.',
    'opensource': 'Sección id="open-source" class="seccion". Título «Gratis y de código abierto, de verdad». entradeta sobre licencia MIT: usar, modificar y redistribuir libremente, sin cuotas, sin suscripción, sin límite de socios. graella con 3 targetes: Sin cuotas ni suscripciones; Código abierto (MIT); Hecho por y para asociaciones (contribuir en GitHub). Termina con un boto-sec a https://github.com/thorkelstlkr/iaq-gest con texto «Ver el código en GitHub».',
    'privacidad': 'Sección id="privacidad" class="seccion". Título «Tus datos, en tu ordenador». entradeta: funciona en local y nada sale a la nube si no lo decidís. graella con 3 targetes: Funciona en local; Copias de seguridad automáticas (también a Google Drive, OneDrive o Dropbox); Desde casa con Tailscale.',
    'descargar': 'Sección id="descargar" class="seccion seccion-alt". Título «Descárgalo gratis». entradeta: instaladores para Windows, macOS y Linux sin instalar nada más, con asistente inicial (administrador, usuarios de la junta, datos de la entidad). graella con 3 targetes (Windows, macOS, Linux), cada una con un <a class="boto"> a https://github.com/thorkelstlkr/iaq-gest/releases/latest. Al final un párrafo con un boto-sec a la demo https://claude.ai/artifact/KyUKUttbR9KYZXHkJRbFPF «Probar la demo en línea».',
}
model = sys.argv[1]
for nom in sys.argv[2:]:
    prompt = f"BRIEF DEL PROYECTO:\n{brief}\n\nREGLAS:\n{REGLES}\n\nTAREA:\n{SECCIONS[nom]}"
    cos = json.dumps({'model': model, 'prompt': prompt, 'stream': False, 'options': {'num_ctx': 8192, 'temperature': 0.3}}).encode()
    req = urllib.request.Request('http://localhost:11434/api/generate', cos, {'Content-Type': 'application/json'})
    r = json.load(urllib.request.urlopen(req, timeout=3600))
    html = re.sub(r'^```\w*\s*|```\s*$', '', r['response'].strip()).strip()
    (arrel / 'parts' / f'{nom}.html').write_text(html + '\n', encoding='utf-8')
    print('fet', nom, len(html), flush=True)
