// Conversió de text amb format senzill (subconjunt de Markdown) a HTML segur.
// Tot el text s'escapa; només es generen les etiquetes que fem servir aquí.
//
//   # Títol, ## Subtítol, ### Apartat
//   **negreta**, *cursiva*, [text](https://enllaç)
//   - element de llista   /   1. element numerat
//   > cita
//   Línia en blanc = paràgraf nou

export function escapa(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const URL_SEGURA = /^(https?:\/\/|mailto:|tel:|\/|#|[a-z0-9-]+\.html)/i;

function enLinia(text: string): string {
  let html = escapa(text);
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t: string, url: string) => {
    const u = url.replace(/&amp;/g, '&');
    if (!URL_SEGURA.test(u)) return t;
    const externa = /^https?:/i.test(u);
    return `<a href="${escapa(u)}"${externa ? ' rel="noopener" target="_blank"' : ''}>${t}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return html;
}

export function markdown(text: string): string {
  const linies = text.replace(/\r\n?/g, '\n').split('\n');
  const sortida: string[] = [];
  let paragraf: string[] = [];
  let llista: { tipus: 'ul' | 'ol'; items: string[] } | null = null;
  let cita: string[] = [];

  const tancaParagraf = () => {
    if (paragraf.length) sortida.push(`<p>${paragraf.map(enLinia).join('<br>')}</p>`);
    paragraf = [];
  };
  const tancaLlista = () => {
    if (llista) sortida.push(`<${llista.tipus}>${llista.items.map((i) => `<li>${enLinia(i)}</li>`).join('')}</${llista.tipus}>`);
    llista = null;
  };
  const tancaCita = () => {
    if (cita.length) sortida.push(`<blockquote><p>${cita.map(enLinia).join('<br>')}</p></blockquote>`);
    cita = [];
  };
  const tancaTot = () => {
    tancaParagraf();
    tancaLlista();
    tancaCita();
  };

  for (const linia of linies) {
    const l = linia.trimEnd();
    const titol = /^(#{1,3})\s+(.*)$/.exec(l);
    const vinyeta = /^\s*[-*]\s+(.*)$/.exec(l);
    const numerat = /^\s*\d+[.)]\s+(.*)$/.exec(l);
    const citaL = /^>\s?(.*)$/.exec(l);
    if (!l.trim()) {
      tancaTot();
    } else if (titol) {
      tancaTot();
      const nivell = titol[1].length + 1; // # → h2 (l'h1 és el títol de la pàgina)
      sortida.push(`<h${nivell}>${enLinia(titol[2])}</h${nivell}>`);
    } else if (vinyeta || numerat) {
      tancaParagraf();
      tancaCita();
      const tipus = vinyeta ? 'ul' : 'ol';
      if (!llista || llista.tipus !== tipus) {
        tancaLlista();
        llista = { tipus, items: [] };
      }
      llista.items.push((vinyeta ?? numerat)![1]);
    } else if (citaL) {
      tancaParagraf();
      tancaLlista();
      cita.push(citaL[1]);
    } else {
      tancaLlista();
      tancaCita();
      paragraf.push(l.trim());
    }
  }
  tancaTot();
  return sortida.join('\n');
}

/** Text pla (sense format) per a resums i metadades. */
export function textPla(text: string, maxim = 200): string {
  const pla = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*>`_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return pla.length > maxim ? pla.slice(0, maxim - 1).trimEnd() + '…' : pla;
}

/** Converteix un títol en un nom de fitxer per a la URL: «Xerrada: l'aigua» → «xerrada-l-aigua». */
export function slug(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/·/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'pagina'
  );
}
