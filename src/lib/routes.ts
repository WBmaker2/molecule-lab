import type { ViewId } from '../stores/appStore';

export const VIEW_IDS: ViewId[] = [
  'build',
  'states',
  'reactions',
  'library',
  'quiz',
  'worksheet',
];

export type RouteParams = Record<string, string>;

export interface RouteLocation {
  view: ViewId;
  params: RouteParams;
}

export function parseHash(hash: string): RouteLocation {
  const fallback: RouteLocation = { view: 'build', params: {} };
  if (!hash) return fallback;
  let text = hash.startsWith('#') ? hash.slice(1) : hash;
  if (text.startsWith('/')) text = text.slice(1);
  const [pathPart, queryPart] = text.split('?');
  const segments = pathPart.split('/').filter((segment) => segment.length > 0);
  const view = segments[0] as ViewId;
  if (!view || !VIEW_IDS.includes(view)) return fallback;
  const params: RouteParams = {};
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      if (!pair) continue;
      const separator = pair.indexOf('=');
      const rawKey = separator < 0 ? pair : pair.slice(0, separator);
      const rawValue = separator < 0 ? '' : pair.slice(separator + 1);
      const key = decodeURIComponent(rawKey);
      if (key) params[key] = decodeURIComponent(rawValue);
    }
  }
  if (view === 'reactions' && segments[1] && !params.id) {
    params.id = decodeURIComponent(segments[1]);
  }
  return { view, params };
}

export function formatHash(location: RouteLocation): string {
  const entries = Object.entries(location.params)
    .filter(([, value]) => value !== '')
    .sort(([first], [second]) => first.localeCompare(second));
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `#/${location.view}${query ? `?${query}` : ''}`;
}

export function parseIntegerParam(
  params: RouteParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = params[key];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function parseEnumParam<T extends string>(
  params: RouteParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = params[key] as T | undefined;
  return raw !== undefined && allowed.includes(raw) ? raw : fallback;
}
