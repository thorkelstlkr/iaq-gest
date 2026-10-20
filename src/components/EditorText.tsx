// Editor de text visual (WYSIWYG) per als textos de la web.
//
// El text es continua desant amb el format senzill de sempre (shared/markdown.ts), de manera
// que la web generada, els textos antics i les xarxes socials no canvien. L'editor converteix
// de Markdown a HTML per mostrar-lo i de l'HTML editat a Markdown cada vegada que canvia.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent, MouseEvent } from 'react';
import { markdown } from '../../shared/markdown';
import { t } from '../i18n';

// ---------- HTML → Markdown ----------

const BLOCS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER']);

/** Text d'un fragment en línia, amb negreta, cursiva, enllaços i salts de línia. */
function enLinia(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/ /g, ' ').replace(/\s*\n\s*/g, ' ');
  if (!(node instanceof HTMLElement)) return '';
  const fills = () => [...node.childNodes].map(enLinia).join('');
  // Els espais van fora de les marques: «** text**» no seria negreta.
  const separa = (dins: string) => /^(\s*)([\s\S]*?)(\s*)$/.exec(dins)!.slice(1) as [string, string, string];
  const embolcalla = (marca: string) => {
    const dins = fills();
    if (!dins.trim()) return dins;
    const [abans, mig, despres] = separa(dins);
    return `${abans}${marca}${mig}${marca}${despres}`;
  };
  switch (node.tagName) {
    case 'BR':
      return '\n';
    case 'STRONG':
    case 'B':
      return embolcalla('**');
    case 'EM':
    case 'I':
      return embolcalla('*');
    case 'A': {
      const href = node.getAttribute('href') ?? '';
      const [abans, text, despres] = separa(fills());
      // Només enllaços que la web accepta (res de «javascript:» ni adreces amb espais o parèntesis).
      const valid = /^(https?:\/\/|mailto:|tel:|\/|#|[a-z0-9-]+\.html)[^\s()]*$/i.test(href);
      return valid && text ? `${abans}[${text}](${href})${despres}` : abans + text + despres;
    }
    case 'SCRIPT':
    case 'STYLE':
      return '';
    default: {
      // Text enganxat d'altres llocs: negreta o cursiva indicades amb estils.
      const estil = node.style;
      if (estil && (estil.fontWeight === 'bold' || Number(estil.fontWeight) >= 600)) return embolcalla('**');
      if (estil && estil.fontStyle === 'italic') return embolcalla('*');
      return fills();
    }
  }
}

/** Neteja les línies d'un bloc: sense espais sobrants ni línies buides. */
const linies = (text: string) =>
  text
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);

function llista(el: HTMLElement, sortida: string[]) {
  let n = 1;
  for (const li of el.children) {
    if (li.tagName !== 'LI') continue;
    const propi = [...li.childNodes].filter((c) => !(c instanceof HTMLElement && (c.tagName === 'UL' || c.tagName === 'OL')));
    const text = linies(propi.map(enLinia).join('')).join(' ');
    if (text) sortida.push(el.tagName === 'OL' ? `${n++}. ${text}` : `- ${text}`);
    // Les llistes niades no existeixen al format: s'afegeixen a continuació.
    for (const niada of li.children) if (niada.tagName === 'UL' || niada.tagName === 'OL') llista(niada as HTMLElement, sortida);
  }
}

/** Converteix el contingut de l'editor (o un HTML enganxat) en Markdown. */
export function htmlAMarkdown(arrel: Node): string {
  const blocs: string[] = [];
  let enCurs = '';
  const tancaParagraf = () => {
    const l = linies(enCurs);
    if (l.length) blocs.push(l.join('\n'));
    enCurs = '';
  };

  const visita = (node: Node) => {
    if (!(node instanceof HTMLElement) || !BLOCS.has(node.tagName)) {
      enCurs += enLinia(node);
      return;
    }
    tancaParagraf();
    const tag = node.tagName;
    if (tag === 'UL' || tag === 'OL') {
      const items: string[] = [];
      llista(node, items);
      if (items.length) blocs.push(items.join('\n'));
    } else if (/^H[1-6]$/.test(tag)) {
      // A la web, «#» és un h2 (l'h1 és el títol de la pàgina).
      const nivell = Math.min(3, Math.max(1, Number(tag[1]) - 1));
      const text = linies(enLinia(node)).join(' ');
      if (text) blocs.push(`${'#'.repeat(nivell)} ${text}`);
    } else if (tag === 'BLOCKQUOTE') {
      const dins = linies(htmlAMarkdown(node).replace(/^> ?/gm, ''));
      if (dins.length) blocs.push(dins.map((l) => `> ${l}`).join('\n'));
    } else if ([...node.children].some((c) => BLOCS.has(c.tagName))) {
      // Un contenidor amb blocs a dins (p. ex. un <div> enganxat): es recorre.
      node.childNodes.forEach(visita);
      tancaParagraf();
    } else {
      enCurs = enLinia(node);
      tancaParagraf();
    }
  };

  arrel.childNodes.forEach(visita);
  tancaParagraf();
  return blocs.join('\n\n');
}

// ---------- Editor ----------

type Bloc = 'p' | 'h2' | 'h3' | 'h4' | 'blockquote';

const ordre = (cmd: string, valor?: string) => document.execCommand(cmd, false, valor);

export function EditorText({
  id,
  valor,
  onChange,
  files = 10,
  senzill = false,
}: {
  id?: string;
  valor: string;
  onChange: (v: string) => void;
  /** Alçada aproximada en línies. */
  files?: number;
  /** Sense títols (per a textos curts). */
  senzill?: boolean;
}) {
  const area = useRef<HTMLDivElement>(null);
  const darrer = useRef<string | null>(null); // l'últim Markdown que ha sortit de l'editor
  const seleccio = useRef<Range | null>(null);
  const [codi, setCodi] = useState(false);
  const [enllac, setEnllac] = useState<string | null>(null);
  const [actiu, setActiu] = useState({ bloc: 'p' as string, negreta: false, cursiva: false, vinyetes: false, numerada: false });

  // Només es reescriu el contingut quan el valor canvia des de fora (no mentre s'escriu).
  useLayoutEffect(() => {
    if (codi || !area.current || valor === darrer.current) return;
    area.current.innerHTML = markdown(valor);
    darrer.current = valor;
  }, [valor, codi]);

  const emet = () => {
    if (!area.current) return;
    const md = htmlAMarkdown(area.current);
    darrer.current = md;
    if (md !== valor) onChange(md);
  };

  const dinsEditor = (n: Node | null) => !!n && !!area.current?.contains(n);

  // Estat dels botons segons on és el cursor.
  useEffect(() => {
    const actualitza = () => {
      const s = document.getSelection();
      if (!s?.anchorNode || !dinsEditor(s.anchorNode)) return;
      const el = s.anchorNode instanceof HTMLElement ? s.anchorNode : s.anchorNode.parentElement;
      const bloc = el?.closest('h2,h3,h4,blockquote');
      setActiu({
        bloc: bloc && dinsEditor(bloc) ? bloc.tagName.toLowerCase() : 'p',
        // Els títols ja surten en negreta: no s'ha de veure el botó premut.
        negreta: document.queryCommandState('bold') && !(bloc && /^H/.test(bloc.tagName)),
        cursiva: document.queryCommandState('italic'),
        vinyetes: document.queryCommandState('insertUnorderedList'),
        numerada: document.queryCommandState('insertOrderedList'),
      });
    };
    document.addEventListener('selectionchange', actualitza);
    return () => document.removeEventListener('selectionchange', actualitza);
  }, []);

  const executa = (fn: () => void) => {
    area.current?.focus();
    ordre('defaultParagraphSeparator', 'p');
    fn();
    emet();
  };

  const bloc = (b: Bloc) =>
    executa(() => {
      // Tornar a prémer el mateix format el treu.
      ordre('formatBlock', `<${b === actiu.bloc && b !== 'p' ? 'p' : b}>`);
    });

  // Els botons no han de prendre el focus (es perdria la selecció).
  const noFocus = (e: MouseEvent) => e.preventDefault();

  function obreEnllac() {
    const s = document.getSelection();
    if (s && s.rangeCount && dinsEditor(s.anchorNode)) seleccio.current = s.getRangeAt(0).cloneRange();
    const a = (s?.anchorNode instanceof HTMLElement ? s.anchorNode : s?.anchorNode?.parentElement)?.closest('a');
    setEnllac(a && dinsEditor(a) ? (a.getAttribute('href') ?? '') : 'https://');
  }

  function aplicaEnllac(treu = false) {
    const url = (enllac ?? '').trim();
    setEnllac(null);
    area.current?.focus();
    const s = document.getSelection();
    if (seleccio.current && s) {
      s.removeAllRanges();
      s.addRange(seleccio.current);
    }
    executa(() => {
      if (treu || !url || url === 'https://') {
        ordre('unlink');
      } else if (s && s.isCollapsed) {
        const a = document.createElement('a');
        a.href = url;
        a.textContent = url.replace(/^(https?:\/\/|mailto:|tel:)/, '');
        ordre('insertHTML', a.outerHTML);
      } else {
        ordre('createLink', url);
      }
    });
  }

  function enganxa(e: ClipboardEvent<HTMLDivElement>) {
    // Només es conserva el format que la web sap mostrar.
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    const md = html ? htmlAMarkdown(new DOMParser().parseFromString(html, 'text/html').body) : '';
    executa(() => {
      if (md) ordre('insertHTML', markdown(md));
      else ordre('insertText', text);
    });
  }

  function tecla(e: KeyboardEvent<HTMLDivElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'k') {
      e.preventDefault();
      obreEnllac();
    } else if (k === 'u') {
      e.preventDefault(); // el subratllat no existeix a la web
    } else if (k === 'b' || k === 'i') {
      // El navegador ja ho fa; només cal desar el canvi.
      setTimeout(emet);
    }
  }

  const boto = (etiqueta: string, titol: string, accio: () => void, premut = false, classe = '') => (
    <button
      type="button"
      className={`editor-boto ${classe}`}
      title={titol}
      aria-label={titol}
      aria-pressed={premut}
      onMouseDown={noFocus}
      onClick={accio}
      disabled={codi}
    >
      {etiqueta}
    </button>
  );

  return (
    <div className={`editor-text ${codi ? 'editor-codi' : ''}`}>
      <div className="editor-barra" role="toolbar" aria-label={t("Format del text")}>
        {!senzill && (
          <select
            className="editor-bloc"
            aria-label={t("Estil del paràgraf")}
            value={['h2', 'h3', 'h4', 'blockquote'].includes(actiu.bloc) ? actiu.bloc : 'p'}
            onChange={(e) => bloc(e.target.value as Bloc)}
            disabled={codi}
          >
            <option value="p">{t("Text normal")}</option>
            <option value="h2">{t("Títol")}</option>
            <option value="h3">{t("Subtítol")}</option>
            <option value="h4">{t("Apartat")}</option>
            <option value="blockquote">{t("Cita")}</option>
          </select>
        )}
        {boto('B', t("Negreta (Ctrl+B)"), () => executa(() => ordre('bold')), actiu.negreta, 'editor-negreta')}
        {boto('I', t("Cursiva (Ctrl+I)"), () => executa(() => ordre('italic')), actiu.cursiva, 'editor-cursiva')}
        {boto('🔗', t("Enllaç (Ctrl+K)"), obreEnllac, enllac !== null)}
        <span className="editor-separador" />
        {boto('•', t("Llista amb vinyetes"), () => executa(() => ordre('insertUnorderedList')), actiu.vinyetes)}
        {boto('1.', t("Llista numerada"), () => executa(() => ordre('insertOrderedList')), actiu.numerada)}
        {senzill && boto('❝', t("Cita"), () => bloc('blockquote'), actiu.bloc === 'blockquote')}
        <span className="editor-separador" />
        {boto('↶', t("Desfés (Ctrl+Z)"), () => executa(() => ordre('undo')))}
        {boto('↷', t("Refés (Ctrl+Y)"), () => executa(() => ordre('redo')))}
        {boto('⌫', t("Treu el format"), () => executa(() => (ordre('removeFormat'), ordre('unlink'), ordre('formatBlock', '<p>'))))}
        <button
          type="button"
          className="editor-boto editor-mode"
          aria-pressed={codi}
          onClick={() => {
            setEnllac(null);
            if (codi) darrer.current = null; // en tornar, es torna a pintar amb el text editat
            setCodi(!codi);
          }}
          title={t("Edita el text amb marques (Markdown)")}
        >
          {codi ? t("Editor visual") : t("Marques")}
        </button>
      </div>

      {enllac !== null && (
        <div className="editor-enllac">
          <input
            type="url"
            autoFocus
            value={enllac}
            aria-label={t("Adreça de l'enllaç")}
            placeholder="https://…"
            onChange={(e) => setEnllac(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                aplicaEnllac();
              } else if (e.key === 'Escape') {
                setEnllac(null);
              }
            }}
          />
          <button type="button" className="boto boto-petit" onClick={() => aplicaEnllac()}>
            {t("Aplica")}
          </button>
          <button type="button" className="boto boto-petit boto-secundari" onClick={() => aplicaEnllac(true)}>
            {t("Treu l'enllaç")}
          </button>
          <button type="button" className="boto boto-petit boto-secundari" onClick={() => setEnllac(null)}>
            {t("Cancel·la")}
          </button>
        </div>
      )}

      {codi ? (
        <>
          <textarea id={id} rows={files} value={valor} onChange={(e) => onChange(e.target.value)} />
          <p className="apagat petit editor-ajuda">
            <code>{t("**negreta**")}</code> · <code>{t("*cursiva*")}</code> · <code>{t("[text de l'enllaç](https://…)")}</code> ·{' '}
            <code>{t("# Títol")}</code> · <code>{t("## Subtítol")}</code> · <code>{t("- element de llista")}</code> · <code>&gt; {t('cita')}</code>
            {t(". Deixa una línia en blanc entre paràgrafs.")}
          </p>
        </>
      ) : (
        <div
          id={id}
          ref={area}
          className="editor-area text"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          style={{ minHeight: `${files * 1.6}em` }}
          data-buit={t("Escriu aquí…")}
          onInput={emet}
          onBlur={emet}
          onPaste={enganxa}
          onKeyDown={tecla}
          onClick={(e) => {
            // Els enllaços no s'obren mentre s'edita.
            if ((e.target as HTMLElement).closest('a')) e.preventDefault();
          }}
        />
      )}
    </div>
  );
}
