import { useMemo, useState } from 'react';

export interface GraphTopic {
  id: string;
  name: string;
  kind: string;
  href: string;
  related: string[];
}

const COLORS: Record<string, string> = {
  'CS 기초': 'var(--graph-cs)',
  개념: 'var(--graph-concept)',
  시스템: 'var(--graph-system)',
  운영: 'var(--graph-ops)',
  '개발 방식': 'var(--graph-practice)',
  Product: 'var(--graph-product)',
  Design: 'var(--graph-design)',
  'AI Engineering': 'var(--graph-ai)',
};

export default function KnowledgeGraph({ topics }: { topics: GraphTopic[] }) {
  const kinds = [...new Set(topics.map((topic) => topic.kind))];
  const [kind, setKind] = useState('전체');
  const [focus, setFocus] = useState('');

  const visible = useMemo(() => {
    if (focus) {
      const selected = topics.find((topic) => topic.id === focus);
      if (!selected) return topics;
      const neighborIds = new Set([
        selected.id,
        ...selected.related,
        ...topics.filter((topic) => topic.related.includes(selected.id)).map((topic) => topic.id),
      ]);
      return topics.filter((topic) => neighborIds.has(topic.id));
    }
    return kind === '전체' ? topics : topics.filter((topic) => topic.kind === kind);
  }, [focus, kind, topics]);

  const nodes = visible.map((topic, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(visible.length, 1) - Math.PI / 2;
    const radius = visible.length < 8 ? 190 : 270;
    return { ...topic, x: 400 + Math.cos(angle) * radius, y: 330 + Math.sin(angle) * radius };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = nodes.flatMap((node) =>
    node.related
      .map((target) => ({ source: node, target: nodeById.get(target) }))
      .filter((edge): edge is { source: (typeof nodes)[number]; target: (typeof nodes)[number] } =>
        Boolean(edge.target),
      ),
  );

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-card)] p-3">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-[var(--fg-muted)]">
          분야로 좁히기
          <select
            value={kind}
            onChange={(event) => {
              setKind(event.currentTarget.value);
              setFocus('');
            }}
            className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--fg)]"
          >
            <option>전체</option>
            {kinds.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-[var(--fg-muted)]">
          한 주제의 주변 보기
          <select
            value={focus}
            onChange={(event) => setFocus(event.currentTarget.value)}
            className="max-w-[240px] rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--fg)]"
          >
            <option value="">선택하지 않음</option>
            {topics.map((topic) => (
              <option value={topic.id} key={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-[var(--fg-dim)]">
          node를 누르면 주제 페이지로 이동합니다.
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 800 660"
          className="min-w-[680px]"
          role="group"
          aria-label={`${visible.length}개 주제의 연결 그래프`}
        >
          {edges.map((edge) => (
            <line
              key={`${edge.source.id}-${edge.target.id}`}
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              stroke="var(--line)"
              strokeWidth="1.5"
            />
          ))}
          {nodes.map((node) => (
            <a href={node.href} key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r="32"
                fill="var(--bg-soft)"
                stroke={COLORS[node.kind] ?? 'var(--accent)'}
                strokeWidth="2"
              />
              <text x={node.x} y={node.y + 3} textAnchor="middle" fill="var(--fg)" fontSize="10">
                {node.name.length > 13 ? `${node.name.slice(0, 12)}…` : node.name}
              </text>
            </a>
          ))}
        </svg>
      </div>
    </div>
  );
}
