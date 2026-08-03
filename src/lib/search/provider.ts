import type { SearchDocument, SearchKind, SearchResponse } from './types';

interface PagefindResultData {
  url: string;
  excerpt: string;
  plain_excerpt: string;
  meta: { title?: string };
}

interface PagefindResult {
  id: string;
  data(): Promise<PagefindResultData>;
}

interface PagefindApi {
  options(options: { baseUrl: string }): Promise<void>;
  debouncedSearch(query: string): Promise<{ results: PagefindResult[] } | null>;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const PAGEFIND_PATH = `${BASE}/pagefind/pagefind.js`;
const CATALOG_PATH = `${BASE}/search-catalog.json`;
const MAX_RESULTS = 50;

let pagefindPromise: Promise<PagefindApi | null> | null = null;
let catalogPromise: Promise<SearchDocument[]> | null = null;

function kindFromUrl(path: string): SearchKind {
  if (path.includes('/labs/')) return '실험실';
  if (path.includes('/topics/')) return 'Wiki';
  if (path.includes('/roadmap')) return '로드맵';
  if (path.includes('/resources')) return '자료';
  return '페이지';
}

function appPath(path: string): string {
  if (BASE && path.startsWith(BASE)) return path.slice(BASE.length) || '/';
  return path;
}

async function loadPagefind(): Promise<PagefindApi | null> {
  pagefindPromise ??= import(/* @vite-ignore */ PAGEFIND_PATH)
    .then(async (module: PagefindApi) => {
      await module.options({ baseUrl: `${BASE}/` });
      return module;
    })
    .catch(() => null);
  return pagefindPromise;
}

async function searchPagefind(query: string): Promise<SearchResponse | null> {
  const pagefind = await loadPagefind();
  if (!pagefind) return null;

  const response = await pagefind.debouncedSearch(query);
  if (!response) return { results: [], total: 0, provider: 'pagefind' };
  const resultData = await Promise.all(
    response.results.slice(0, MAX_RESULTS).map(async (result) => ({
      id: result.id,
      data: await result.data(),
    })),
  );

  return {
    results: resultData.map(({ id, data }) => ({
      id,
      title: data.meta.title ?? '제목 없는 문서',
      url: appPath(data.url),
      excerpt: data.plain_excerpt,
      kind: kindFromUrl(data.url),
      tags: [],
    })),
    total: response.results.length,
    provider: 'pagefind',
  };
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('ko').normalize('NFKC');
}

async function searchCatalog(query: string): Promise<SearchResponse> {
  catalogPromise ??= fetch(CATALOG_PATH).then(async (response) => {
    if (!response.ok) throw new Error('검색 catalog를 불러오지 못했습니다.');
    return (await response.json()) as SearchDocument[];
  });

  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const scored = (await catalogPromise)
    .map((document) => {
      const title = normalize(document.title);
      const tags = normalize(document.tags.join(' '));
      const body = normalize(document.excerpt);
      const score = terms.reduce((total, term) => {
        if (!title.includes(term) && !tags.includes(term) && !body.includes(term)) return -1000;
        return total + (title.includes(term) ? 8 : 0) + (tags.includes(term) ? 4 : 0) + 1;
      }, 0);
      return { document, score };
    })
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || a.document.title.localeCompare(b.document.title, 'ko'));

  return {
    results: scored.slice(0, MAX_RESULTS).map(({ document }) => document),
    total: scored.length,
    provider: 'catalog',
  };
}

export async function searchSite(query: string): Promise<SearchResponse> {
  const normalized = query.trim();
  if (normalized.length < 2) return { results: [], total: 0, provider: 'catalog' };
  return (await searchPagefind(normalized)) ?? searchCatalog(normalized);
}
