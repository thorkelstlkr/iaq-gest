import { idioma } from './i18n';

// Transport HTTP cap al servidor. A la versió de demostració, Vite el substitueix per demo/transport.ts.

export async function transport(method: string, path: string, body?: unknown): Promise<unknown> {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'X-Idioma': idioma(), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined;
  const data = await res.json().catch(() => null);
  // Sessió caducada: la pantalla d'accés ho detecta i torna a demanar la contrasenya.
  if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('sessio-caducada'));
  if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`);
  return data;
}
