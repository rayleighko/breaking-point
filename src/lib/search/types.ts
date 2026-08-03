export type SearchKind = '실험실' | 'Wiki' | '로드맵' | '자료' | '페이지';

export interface SearchDocument {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  kind: SearchKind;
  tags: string[];
}

export interface SearchResponse {
  results: SearchDocument[];
  total: number;
  provider: 'pagefind' | 'catalog';
}
