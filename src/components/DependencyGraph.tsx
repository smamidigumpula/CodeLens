import { useMemo, useState } from 'react';
import type { GraphData, GraphEdge, GraphNode, Language } from '../types/graph';

interface DependencyGraphProps {
  graph: GraphData;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

const LANGUAGE_COLORS: Record<Language, string> = {
  TypeScript: '#2563eb',
  JavaScript: '#d97706',
  Python: '#059669',
  Go: '#0891b2',
  Rust: '#b45309',
  Java: '#7c3aed',
  Other: '#64748b'
};

export default function DependencyGraph({ graph, selectedId, onSelect }: DependencyGraphProps) {
  const [query, setQuery] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [depth, setDepth] = useState(2);
  const [language, setLanguage] = useState('All');
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1100, height: 700 });

  const languages = useMemo(() => ['All', ...Object.keys(graph.summary.languages)], [graph.summary.languages]);
  const visible = useMemo(
    () => filterGraph(graph.nodes, graph.edges, query, focusId, depth, language),
    [depth, focusId, graph.edges, graph.nodes, language, query]
  );
  const positioned = useMemo(() => layoutGraph(visible.nodes, visible.edges), [visible]);
  const positionById = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);

  return (
    <section className="graph-shell" aria-label="Interactive dependency graph">
      <div className="graph-toolbar">
        <label className="search-field">
          <span>Search files</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="App.tsx, routes, storage..." />
        </label>

        <label>
          <span>Language</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            {languages.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Focus depth</span>
          <input
            className="range"
            min="1"
            max="4"
            type="range"
            value={depth}
            onChange={(event) => setDepth(Number(event.target.value))}
          />
        </label>

        <button className="icon-button" onClick={() => setFocusId(selectedId)} disabled={!selectedId} title="Focus selected module">
          Focus
        </button>
        <button className="icon-button" onClick={() => setFocusId(null)} title="Clear graph focus">
          Reset
        </button>
      </div>

      <svg
        className="dependency-graph"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        role="img"
        aria-label={`${visible.nodes.length} files and ${visible.edges.length} dependencies`}
        onWheel={(event) => {
          event.preventDefault();
          const scale = event.deltaY > 0 ? 1.08 : 0.92;
          const nextWidth = Math.min(1800, Math.max(520, viewBox.width * scale));
          const nextHeight = Math.min(1100, Math.max(340, viewBox.height * scale));
          setViewBox({
            x: viewBox.x + (viewBox.width - nextWidth) / 2,
            y: viewBox.y + (viewBox.height - nextHeight) / 2,
            width: nextWidth,
            height: nextHeight
          });
        }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>

        <rect x="0" y="0" width="1100" height="700" rx="0" className="graph-bg" />
        {visible.edges.map((edge) => {
          const source = positionById.get(edge.source);
          const target = positionById.get(edge.target);
          if (!source || !target) return null;
          return (
            <line
              key={`${edge.source}->${edge.target}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              className={selectedId === edge.source || selectedId === edge.target ? 'edge edge-active' : 'edge'}
              markerEnd="url(#arrow)"
            />
          );
        })}

        {positioned.map((node) => {
          const radius = Math.min(30, Math.max(12, 10 + node.imports + node.importedBy * 1.5));
          const isSelected = selectedId === node.id;
          return (
            <g
              key={node.id}
              className="graph-node"
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => onSelect(node.id)}
              onDoubleClick={() => setFocusId(node.id)}
              tabIndex={0}
              role="button"
              aria-label={`Select ${node.id}`}
            >
              <circle
                r={radius}
                fill={LANGUAGE_COLORS[node.language]}
                className={isSelected ? 'node-circle selected' : 'node-circle'}
              />
              <text y={radius + 18} textAnchor="middle">
                {shorten(node.label)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="legend">
        {languages
          .filter((item) => item !== 'All')
          .map((item) => (
            <span key={item}>
              <i style={{ background: LANGUAGE_COLORS[item as Language] }} />
              {item}
            </span>
          ))}
      </div>
    </section>
  );
}

function filterGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  query: string,
  focusId: string | null,
  depth: number,
  language: string
) {
  let visibleIds = new Set(nodes.map((node) => node.id));
  const lowerQuery = query.trim().toLowerCase();

  if (focusId) {
    visibleIds = neighborhood(edges, focusId, depth);
  }

  const filteredNodes = nodes.filter((node) => {
    const matchesFocus = visibleIds.has(node.id);
    const matchesQuery = !lowerQuery || node.id.toLowerCase().includes(lowerQuery) || node.label.toLowerCase().includes(lowerQuery);
    const matchesLanguage = language === 'All' || node.language === language;
    return matchesFocus && matchesQuery && matchesLanguage;
  });
  const filteredIds = new Set(filteredNodes.map((node) => node.id));
  const filteredEdges = edges.filter((edge) => filteredIds.has(edge.source) && filteredIds.has(edge.target));

  return { nodes: filteredNodes, edges: filteredEdges };
}

function neighborhood(edges: GraphEdge[], start: string, maxDepth: number) {
  const visible = new Set([start]);
  const frontier = [{ id: start, depth: 0 }];

  while (frontier.length > 0) {
    const current = frontier.shift();
    if (!current || current.depth >= maxDepth) continue;

    edges.forEach((edge) => {
      if (edge.source === current.id && !visible.has(edge.target)) {
        visible.add(edge.target);
        frontier.push({ id: edge.target, depth: current.depth + 1 });
      }
      if (edge.target === current.id && !visible.has(edge.source)) {
        visible.add(edge.source);
        frontier.push({ id: edge.source, depth: current.depth + 1 });
      }
    });
  }

  return visible;
}

function layoutGraph(nodes: GraphNode[], edges: GraphEdge[]): PositionedNode[] {
  const width = 1100;
  const height = 700;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(310, Math.max(150, nodes.length * 11));
  const positions = nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    return {
      ...node,
      x: centerX + Math.cos(angle) * radius + (node.importedBy - node.imports) * 12,
      y: centerY + Math.sin(angle) * radius
    };
  });

  const byId = new Map(positions.map((node) => [node.id, node]));

  for (let tick = 0; tick < 90; tick += 1) {
    positions.forEach((a, index) => {
      for (let j = index + 1; j < positions.length; j += 1) {
        const b = positions[j];
        const dx = a.x - b.x || 1;
        const dy = a.y - b.y || 1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const force = Math.min(5, 1500 / (distance * distance));
        a.x += (dx / distance) * force;
        a.y += (dy / distance) * force;
        b.x -= (dx / distance) * force;
        b.y -= (dy / distance) * force;
      }
    });

    edges.forEach((edge) => {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) return;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      source.x += dx * 0.012;
      source.y += dy * 0.012;
      target.x -= dx * 0.012;
      target.y -= dy * 0.012;
    });

    positions.forEach((node) => {
      node.x += (centerX - node.x) * 0.004;
      node.y += (centerY - node.y) * 0.004;
      node.x = Math.min(width - 70, Math.max(70, node.x));
      node.y = Math.min(height - 70, Math.max(70, node.y));
    });
  }

  return positions;
}

function shorten(label: string) {
  return label.length > 20 ? `${label.slice(0, 17)}...` : label;
}
