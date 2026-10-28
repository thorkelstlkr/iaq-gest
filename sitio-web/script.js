// Menú móvil y año del pie.
const boto = document.querySelector('.menu-boto');
const menu = document.getElementById('menu');
boto.addEventListener('click', () => {
  const obert = menu.classList.toggle('obert');
  boto.setAttribute('aria-expanded', String(obert));
  boto.textContent = obert ? '✕ Cerrar' : '☰ Menú';
});
menu.addEventListener('click', (e) => {
  if (e.target.closest('a') && menu.classList.contains('obert')) boto.click();
});
document.getElementById('any').textContent = new Date().getFullYear();
