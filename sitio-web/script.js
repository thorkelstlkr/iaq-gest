// Menú móvil y año del pie.
const TEXTOS = { es: ['☰ Menú', '✕ Cerrar'], ca: ['☰ Menú', '✕ Tanca'], en: ['☰ Menu', '✕ Close'] }[document.documentElement.lang] ?? ['☰ Menú', '✕ Cerrar'];
const boto = document.querySelector('.menu-boto');
const menu = document.getElementById('menu');
boto.addEventListener('click', () => {
  const obert = menu.classList.toggle('obert');
  boto.setAttribute('aria-expanded', String(obert));
  boto.textContent = obert ? TEXTOS[1] : TEXTOS[0];
});
menu.addEventListener('click', (e) => {
  if (e.target.closest('a') && menu.classList.contains('obert')) boto.click();
});
document.getElementById('any').textContent = new Date().getFullYear();
