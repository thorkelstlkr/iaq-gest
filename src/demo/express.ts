// Substitut mínim d'Express per a la demostració: només el Router que usen les rutes del servidor.

type Handler = (req: unknown, res: unknown) => void | Promise<void>;
type Pas = (req: unknown, res: unknown, next: (err?: unknown) => void) => void | Promise<void>;
interface Ruta {
  method: string;
  re: RegExp;
  claus: string[];
  handler: Handler;
}

export interface MiniRouter {
  trobar(method: string, path: string): { handler: Handler; params: Record<string, string> } | null;
}

export function Router() {
  const rutes: Ruta[] = [];
  // Com a Express, una ruta pot tenir passos previs (p. ex. comprovar permisos) que criden next().
  const afegeix = (method: string) => (path: string, ...passos: Pas[]) => {
    const handler: Handler = (req, res) =>
      new Promise<void>((resol, rebutja) => {
        const executa = (i: number) => (err?: unknown) => {
          if (err) return rebutja(err);
          if (i >= passos.length) return resol();
          try {
            Promise.resolve(passos[i](req, res, executa(i + 1)))
              .then(() => {
                if (i === passos.length - 1) resol();
              })
              .catch(rebutja);
          } catch (e) {
            rebutja(e);
          }
        };
        executa(0)();
      });
    const claus: string[] = [];
    const patro = path
      .split('/')
      .map((seg) => {
        if (seg.startsWith(':')) {
          claus.push(seg.slice(1));
          return '([^/]+)';
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    rutes.push({ method, re: new RegExp(`^${patro}/?$`), claus, handler });
  };
  return {
    get: afegeix('GET'),
    post: afegeix('POST'),
    put: afegeix('PUT'),
    delete: afegeix('DELETE'),
    trobar(method: string, path: string) {
      for (const r of rutes) {
        if (r.method !== method) continue;
        const m = r.re.exec(path);
        if (m) {
          const params = Object.fromEntries(r.claus.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
          return { handler: r.handler, params };
        }
      }
      return null;
    },
  };
}

export default { Router };
