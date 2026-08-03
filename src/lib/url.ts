const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** base 경로를 붙인 절대 경로를 만든다. url('/roadmap') -> '/breaking-point/roadmap' */
export function url(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${p}`;
}
