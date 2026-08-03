import { useEffect, useMemo, useState } from 'react';

import { searchSite } from '@/lib/search/provider';
import type { SearchDocument, SearchKind } from '@/lib/search/types';
import { url } from '@/lib/url';

const KINDS: Array<'전체' | SearchKind> = ['전체', '실험실', 'Wiki', '로드맵', '자료', '페이지'];

function queryFromUrl(): string {
  return new URLSearchParams(window.location.search).get('q') ?? '';
}

export default function SearchPage() {
  const [query, setQuery] = useState(queryFromUrl);
  const [kind, setKind] = useState<(typeof KINDS)[number]>('전체');
  const [results, setResults] = useState<SearchDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (query.trim()) params.set('q', query.trim());
    else params.delete('q');
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${params}`.replace(/\?$/, ''),
    );

    let active = true;
    const timer = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setTotal(0);
        setLoading(false);
        setError('');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await searchSite(query);
        if (!active) return;
        setResults(response.results);
        setTotal(response.total);
      } catch {
        if (active) setError('검색 index를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        if (active) setLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const visibleResults = useMemo(
    () => (kind === '전체' ? results : results.filter((result) => result.kind === kind)),
    [kind, results],
  );

  return (
    <section className="site-search" aria-labelledby="search-heading">
      <div className="search-box">
        <label htmlFor="site-search-input">찾고 싶은 개념이나 문제를 입력해 주세요</label>
        <div className="search-input-row">
          <span aria-hidden="true">⌕</span>
          <input
            id="site-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 커넥션 풀, Queue, Kubernetes"
            autoComplete="off"
            autoFocus
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="검색어 지우기">
              지우기
            </button>
          )}
        </div>
        <p>실험실, Wiki, 로드맵과 학습 자료를 한 번에 검색합니다.</p>
      </div>

      <div className="search-kinds" aria-label="검색 결과 종류">
        {KINDS.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={kind === item}
            onClick={() => setKind(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="search-summary" role="status" aria-live="polite">
        {loading
          ? '검색하고 있습니다…'
          : query.trim().length >= 2
            ? `${total.toLocaleString()}개의 결과`
            : '두 글자 이상 입력해 주세요.'}
      </div>

      {error && <div className="search-error">{error}</div>}

      {!loading && !error && query.trim().length >= 2 && visibleResults.length === 0 && (
        <div className="search-empty">
          <strong>일치하는 결과가 없습니다.</strong>
          <p>약어와 원어를 바꿔 보세요. 예: 메시지 큐 → Message Queue, 쿠버네티스 → Kubernetes</p>
        </div>
      )}

      <ol className="search-results" aria-label="검색 결과">
        {visibleResults.map((result) => (
          <li key={result.id}>
            <a href={url(result.url)}>
              <span className="search-kind">{result.kind}</span>
              <strong>{result.title}</strong>
              <p>{result.excerpt}</p>
              {result.tags.length > 0 && (
                <span className="search-tags">{result.tags.slice(0, 4).join(' · ')}</span>
              )}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
