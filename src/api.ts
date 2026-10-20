import { useCallback, useEffect, useState } from 'react';
import { transport } from './transport';

const request = <T>(method: string, path: string, body?: unknown) => transport(method, path, body) as Promise<T>;

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: (path: string) => request<void>('DELETE', path),
};

/** Carrega dades de l'API i les torna a carregar quan canvia el camí. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let viu = true;
    setError(null);
    api
      .get<T>(path)
      .then((d) => viu && setData(d))
      .catch((e: Error) => viu && setError(e.message));
    return () => {
      viu = false;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload };
}
