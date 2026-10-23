// Tiny in-process TTL cache for read-mostly queries. The data only changes when the
// pipeline runs, which clears the cache. Safe for a single long-lived server process;
// on multi-instance hosts each instance simply keeps its own copy.

const store = new Map<string, { value: unknown; expires: number; pending?: Promise<unknown> }>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  if (hit?.pending) return hit.pending as Promise<T>;
  const pending = fn()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .catch((e) => {
      store.delete(key);
      throw e;
    });
  store.set(key, { value: hit?.value, expires: 0, pending });
  return pending;
}

export function clearCache(prefix?: string) {
  if (!prefix) return store.clear();
  for (const k of Array.from(store.keys())) if (k.startsWith(prefix)) store.delete(k);
}

export const TTL = { short: 60_000, medium: 3 * 60_000, long: 10 * 60_000 };

// Small concurrency helper for batches of DB writes.
export async function pMap<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
