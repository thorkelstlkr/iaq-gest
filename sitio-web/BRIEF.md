# Brief: web de presentación de «I ara qué? Gestió» (IAQ Gest)

## Objetivo
Landing page estática (un solo `index.html` + `styles.css` + un `script.js` mínimo opcional), en **castellano**, sin frameworks ni build, sin dependencias externas salvo Google Fonts (Fraunces para títulos, Inter para texto). Debe funcionar abierta directamente y en GitHub Pages. Responsive (móvil primero, 16px de margen lateral, sin scroll horizontal). Accesible (contraste AA, alt en imágenes, foco visible). Modo oscuro con `prefers-color-scheme`.

## Mensajes clave (por orden de importancia)
1. **Basado en MCP (Model Context Protocol)**: cada miembro de la junta (presidencia, tesorería, secretaría, vocales) conecta SU propio asistente de IA (Claude, ChatGPT, Gemini, Copilot, Cursor, agentes propios...) a SU cuenta y gestiona la asociación conversando.
2. **Gratuito y de código abierto** (licencia MIT): sin cuotas, sin suscripción, sin límite de socios; se puede usar, modificar y redistribuir libremente.
3. **Tus datos se quedan en tu ordenador**: funciona en local; nada sale a la nube si no lo decidís.
4. Solución integral de gestión para asociaciones sin ánimo de lucro.

## Datos reales del MCP (no inventar otros)
- Servidor MCP por HTTP («Streamable HTTP») en `/api/agent-ia/mcp`, y puente stdio (`scripts/mcp.ts`) para Claude Desktop, Cursor, etc.
- Descripción OpenAPI 3.1 en `/api/agent-ia/openapi.json` (ChatGPT Actions, Gemini, agentes propios).
- **más de 80 herramientas** (socios, cuotas, contabilidad, tesorería, actividades, web, subvenciones, donativos, gobierno...).
- **Claves personales** por persona (`iaq_…`), revocables y con caducidad; el agente actúa con los permisos del perfil de su dueño (tesorería solo ve economía, etc.).
- Tres niveles de herramienta: **lectura**, **escritura** y **propuesta**: las acciones importantes (cobrar una remesa, borrar, publicar) quedan como propuestas que la persona aprueba con un clic.
- **Nunca ve datos sensibles**: DNI/NIE/NIF, IBAN y similares se filtran automáticamente antes de llegar al modelo.
- Conexión desde **Claude.ai (web y móvil) y ChatGPT por OAuth** con un código de conexión de un solo uso (nunca se da la contraseña).
- Registro de toda la actividad del agente.
- Acceso remoto seguro con **Tailscale** (cada miembro desde su casa) y un **puerto exclusivo para agentes** que se puede exponer con un túnel sin exponer el programa.
- Ejemplo de config Claude Desktop / Cursor (mostrar en un bloque de código):
```json
{
  "mcpServers": {
    "iaraque-gestio": {
      "command": "node",
      "args": ["scripts/mcp.ts"],
      "env": { "IARAQUE_URL": "http://127.0.0.1:3000", "IARAQUE_CLAU": "iaq_..." }
    }
  }
}
```
- Ejemplos de peticiones (sección «Pídeselo a tu asistente»): «¿Qué socios tienen la cuota de 2026 pendiente?», «Prepara la remesa SEPA de octubre», «Redacta el acta de la última junta», «Publica en la web la noticia de la fiesta del sábado», «¿Cuánto nos queda por justificar de la subvención del Consell?», «Recuérdame las obligaciones fiscales de este trimestre».

## Funcionalidades (cuadrícula de módulos)
- Personas: socios (libro registro, altas y bajas, categorías, carnés), interesados, seguimiento CRM, comunicaciones, voluntariado (Ley 45/2015), colaboradores.
- Economía: cuotas, contabilidad, tesorería y remesas SEPA, presupuesto y cierre, facturación VERI*FACTU, subvenciones con cuenta justificativa, donativos y modelo 182, inventario, modelos 111/115/180/190/347/200.
- Actividades y difusión: actividades con inscripciones y lista de espera, web pública personalizable publicada por FTP, redes sociales.
- Gobierno y cumplimiento: asambleas y juntas, libro de actas, cargos y certificados, RGPD, calendario de obligaciones.
- Sistema: copias de seguridad automáticas (también a Google Drive / OneDrive / Dropbox), multiusuario con perfiles, catalán / castellano / inglés, ayuda integrada.

## Instalación
Instaladores para **Windows, macOS y Linux** (sin instalar nada más), con asistente inicial (administrador, usuarios de la junta, datos de la entidad). Descargas: https://github.com/thorkelstlkr/iaq-gest/releases/latest

## Enlaces
- Código: https://github.com/thorkelstlkr/iaq-gest
- Descargas: https://github.com/thorkelstlkr/iaq-gest/releases/latest
- Demo en línea (datos inventados): https://claude.ai/artifact/KyUKUttbR9KYZXHkJRbFPF
- Licencia: https://github.com/thorkelstlkr/iaq-gest/blob/main/LICENSE
- Creado por la Associació I ara qué? (Pollença, Mallorca).

## Identidad visual
- Logos: `img/logo-clar.png` (sobre fondos claros), `img/logo-fosc.png` (sobre fondos oscuros), icono `img/icona-512.png`, favicon `img/favicon.png`, `img/apple-touch-icon.png`.
- Colores: terracota `#A63D24` (primario), marrón oscuro `#2B231F`, crema `#F5EDE1`, superficie `#FDFAF4`, texto suave `#6b5d52`.
- Tono: cercano, claro, sin jerga; dirigido a juntas directivas de asociaciones pequeñas que no son técnicas.

## Estructura sugerida
1. Cabecera fija: logo + enlaces (MCP, Funciones, Open source, Descargar) + botón «Descargar».
2. Hero: titular centrado en «Gestiona tu asociación hablando con tu asistente de IA», subtítulo (gratis, open source, MCP), botones Descargar / Probar la demo / Ver en GitHub; diagrama sencillo en HTML/CSS o SVG inline: asistentes (Claude, ChatGPT, Gemini…) → MCP → IAQ Gest → datos en tu ordenador.
3. Sección MCP (la más extensa): qué es MCP en dos frases, cómo funciona, seguridad (claves personales, propuestas, filtro de datos sensibles, OAuth, registro), ejemplos de peticiones, bloque de configuración.
4. Gratuito y open source: MIT, sin cuotas, comunidad, contribuir en GitHub.
5. Funcionalidades (cuadrícula).
6. Privacidad: datos en local, copias de seguridad, Tailscale.
7. Descargar: Windows / macOS / Linux + requisitos mínimos.
8. FAQ breve (5-6 preguntas, `<details>`).
9. Pie: licencia MIT, GitHub, asociación.
