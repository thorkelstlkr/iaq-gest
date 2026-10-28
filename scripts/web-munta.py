# Munta sitio-web/index.html: a partir de plantilla.html, substitueix cada <!-- SECCIO:nom --> pel contingut de sitio-web/parts/nom.html.
import pathlib, re
arrel = pathlib.Path(__file__).resolve().parent.parent / 'sitio-web'
html = (arrel / 'plantilla.html').read_text(encoding='utf-8')

def part(m):
    f = arrel / 'parts' / f'{m.group(1)}.html'
    return f.read_text(encoding='utf-8').strip() if f.exists() else m.group(0)

(arrel / 'index.html').write_text(re.sub(r'<!-- SECCIO:(\w+) -->', part, html), encoding='utf-8')
print('muntat')
