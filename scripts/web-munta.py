# Munta la web (sitio-web): a partir de plantilla.html, substitueix cada <!-- SECCIO:nom --> pel contingut de
# sitio-web/parts/nom.html (versió en castellà, a l'arrel) i en genera ca/ i en/ amb els diccionaris de i18n/.
# Ús: python scripts/web-munta.py            (munta i avisa dels textos sense traduir)
#     python scripts/web-munta.py --textos   (llista els textos en castellà, per traduir-los)
import html, json, pathlib, re, sys

sys.stdout.reconfigure(encoding="utf-8")

arrel = pathlib.Path(__file__).resolve().parent.parent / 'sitio-web'
URL = 'https://thorkelstlkr.github.io/iaq-gest/'
IDIOMES = {'es': ('Castellano', 'es_ES', ''), 'ca': ('Català', 'ca_ES', 'ca/'), 'en': ('English', 'en_GB', 'en/')}
ATRIBUTS = ('alt', 'aria-label', 'content', 'title')


def part(m):
    f = arrel / 'parts' / f'{m.group(1)}.html'
    return f.read_text(encoding='utf-8').strip() if f.exists() else m.group(0)


def selector(actual):
    enllacos = []
    for codi, (nom, _, carpeta) in IDIOMES.items():
        if codi == actual:
            enllacos.append(f'<span aria-current="true" lang="{codi}">{codi.upper()}</span>')
        else:
            enllac = ('./' if actual == 'es' else '../') + carpeta
            enllacos.append(f'<a href="{enllac}" hreflang="{codi}" lang="{codi}" title="{nom}">{codi.upper()}</a>')
    return ''.join(enllacos)


def alternates():
    return '\n  '.join(f'<link rel="alternate" hreflang="{c}" href="{URL}{d}" />' for c, (_, _, d) in IDIOMES.items())


def es_text(t):
    return bool(re.search(r'[A-Za-zÀ-ÿ]', t))


def tradueix(doc, dicc, falten):
    """Tradueix els nodes de text i els atributs visibles; el codi (<pre>, <script>, <style>) no es toca."""
    trossos = re.split(r'(<[^>]+>)', doc)
    sortida, dins_codi = [], 0
    for t in trossos:
        if t.startswith('<'):
            if re.match(r'<(pre|script|style)\b', t):
                dins_codi += 1
            elif re.match(r'</(pre|script|style)>', t):
                dins_codi -= 1

            def attr(m):
                v = html.unescape(m.group(3))
                if not es_text(v) or v.startswith(('http', '#', 'width')):
                    return m.group(0)
                if v not in dicc:
                    falten.add(v)
                    return m.group(0)
                return f'{m.group(1)}={m.group(2)}{html.escape(dicc[v], quote=True)}{m.group(2)}'

            t = re.sub(r'\b(' + '|'.join(ATRIBUTS) + r')=(["\'])(.*?)\2', attr, t)
            sortida.append(t)
            continue
        net = ' '.join(t.split())
        if dins_codi or not es_text(net):
            sortida.append(t)
            continue
        clau = html.unescape(net)
        if clau not in dicc:
            falten.add(clau)
            sortida.append(t)
            continue
        inici = t[: len(t) - len(t.lstrip())]
        final = t[len(t.rstrip()):]
        sortida.append(inici + html.escape(dicc[clau], quote=False) + final)
    return ''.join(sortida)


def textos(doc):
    vistos = []
    for t in re.split(r'(<[^>]+>)', re.sub(r'<(pre|script|style)\b.*?</\1>', '', doc, flags=re.S)):
        if t.startswith('<'):
            for m in re.finditer(r'\b(' + '|'.join(ATRIBUTS) + r')=(["\'])(.*?)\2', t):
                v = html.unescape(m.group(3))
                if es_text(v) and not v.startswith(('http', '#', 'width')) and v not in vistos:
                    vistos.append(v)
        else:
            n = html.unescape(' '.join(t.split()))
            if es_text(n) and n not in vistos:
                vistos.append(n)
    return vistos


base = re.sub(r'<!-- SECCIO:(\w+) -->', part, (arrel / 'plantilla.html').read_text(encoding='utf-8'))
if '--textos' in sys.argv:
    print(json.dumps(textos(base), ensure_ascii=False, indent=1))
    sys.exit()

for codi, (_, locale, carpeta) in IDIOMES.items():
    doc = base
    doc = doc.replace('<link rel="canonical"', alternates() + '\n  <link rel="canonical"')
    if codi != 'es':
        falten = set()
        dicc = json.loads((arrel / 'i18n' / f'{codi}.json').read_text(encoding='utf-8'))
        iguals = set(dicc.pop('_iguals', []))  # noms propis i valors tècnics que no es tradueixen
        doc = tradueix(doc, dicc, falten)
        falten -= iguals
        doc = doc.replace('<html lang="es">', f'<html lang="{codi}">')
        doc = re.sub(r'(href|src|srcset)="(?!https?:|#|/|\.\./)([^"]+)"', r'\1="../\2"', doc)
        doc = doc.replace(f'href="{URL}" />', f'href="{URL}{carpeta}" />', 1)  # canonical
        doc = doc.replace(f'content="{URL}"', f'content="{URL}{carpeta}"')  # og:url
        doc = doc.replace('content="es_ES"', f'content="{locale}"')
        if falten:
            print(f'[{codi}] sense traduir ({len(falten)}):', *sorted(falten), sep='\n  ')
    doc = doc.replace('<!-- IDIOMES -->', selector(codi))  # després de traduir: els noms dels idiomes no es tradueixen
    (arrel / carpeta).mkdir(exist_ok=True)
    (arrel / carpeta / 'index.html').write_text(doc, encoding='utf-8')
print('muntat: es, ca, en')
