"use client";

import { useMemo, useState } from "react";
import type { GraphData, GraphEdge, GraphNode, Language } from "@/lib/codelens/types";

const colors: Record<Language, string> = {
  TypeScript: "#2563eb",
  JavaScript: "#d97706",
  Python: "#059669",
  Go: "#0891b2",
  Rust: "#b45309",
  Java: "#7c3aed",
  Other: "#64748b",
};

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

export function DependencyGraph({
  graph,
  selectedId,
  highlightedIds,
  onSelect,
}: {
  graph: GraphData;
  selectedId: string | null;
  highlightedIds: string[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [depth, setDepth] = useState(2);
  const [language, setLanguage] = useState("All");
  const languages = useMemo(() => ["All", ...Object.keys(graph.summary.languages)], [graph]);
  const visible = useMemo(
    () => filterGraph(graph.nodes, graph.edges, query, focusId, depth, language),
    [graph, query, focusId, depth, language],
  );
  const positioned = useMemo(() => layoutGraph(visible.nodes, visible.edges), [visible]);
  const byId = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 grid gap-2 lg:grid-cols-[1fr_180px_180px_auto_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search files"
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        />
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          {languages.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Depth
          <input
            type="range"
            min="1"
            max="4"
            value={depth}
            onChange={(event) => setDepth(Number(event.target.value))}
            className="min-w-0 flex-1"
          />
        </label>
        <button
          type="button"
          onClick={() => setFocusId(selectedId)}
          disabled={!selectedId}
          className="h-10 rounded-md bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-40"
        >
          Focus
        </button>
        <button
          type="button"
          onClick={() => setFocusId(null)}
          className="h-10 rounded-md border border-border px-4 text-sm font-semibold"
        >
          Reset
        </button>
      </div>

      <svg
        viewBox="0 0 1100 680"
        role="img"
        aria-label={`${visible.nodes.length} files and ${visible.edges.length} dependencies`}
        className="h-[520px] w-full rounded-lg border border-border bg-[#f8fafc]"
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>
        {visible.edges.map((edge) => {
          const source = byId.get(edge.source);
          const target = byId.get(edge.target);
          if (!source || !target) return null;
          const active = selectedId === edge.source || selectedId === edge.target;
          return (
            <line
              key={`${edge.source}->${edge.target}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={active ? "#f97316" : "#94a3b8"}
              strokeWidth={active ? 2.6 : 1.4}
              strokeOpacity={active ? 0.95 : 0.62}
              markerEnd="url(#arrow)"
            />
          );
        })}
        {positioned.map((node) => {
          const selected = selectedId === node.id;
          const highlighted = highlightedIds.includes(node.id);
          const radius = Math.min(30, Math.max(12, 10 + node.imports + node.importedBy * 1.6));
          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => onSelect(node.id)}
              onDoubleClick={() => setFocusId(node.id)}
              className="cursor-pointer outline-none"
              role="button"
              tabIndex={0}
            >
              <circle
                r={radius}
                fill={colors[node.language]}
                stroke={selected || highlighted ? "#f97316" : "#fff"}
                strokeWidth={selected ? 5 : highlighted ? 4 : 3}
              />
              <text y={radius + 18} textAnchor="middle" className="fill-slate-950 text-[12px] font-bold">
                {node.label.length > 22 ? `${node.label.slice(0, 19)}...` : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function filterGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  query: string,
  focusId: string | null,
  depth: number,
  language: string,
) {
  let ids = new Set(nodes.map((node) => node.id));
  if (focusId) ids = neighborhood(edges, focusId, depth);
  const q = query.trim().toLowerCase();
  const filteredNodes = nodes.filter(
    (node) =>
      ids.has(node.id) &&
      (!q || node.id.toLowerCase().includes(q) || node.label.toLowerCase().includes(q)) &&
      (language === "All" || node.language === language),
  );
  const filteredIds = new Set(filteredNodes.map((node) => node.id));
  return {
    nodes: filteredNodes,
    edges: edges.filter((edge) => filteredIds.has(edge.source) && filteredIds.has(edge.target)),
  };
}

function neighborhood(edges: GraphEdge[], start: string, maxDepth: number) {
  const visible = new Set([start]);
  const queue = [{ id: start, depth: 0 }];
  while (queue.length) {
    const current = queue.shift();
    if (!current || current.depth >= maxDepth) continue;
    for (const edge of edges) {
      const next = edge.source === current.id ? edge.target : edge.target === current.id ? edge.source : null;
      if (next && !visible.has(next)) {
        visible.add(next);
        queue.push({ id: next, depth: current.depth + 1 });
      }
    }
  }
  return visible;
}

function layoutGraph(nodes: GraphNode[], edges: GraphEdge[]): PositionedNode[] {
  const width = 1100;
  const height = 680;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(300, Math.max(140, nodes.length * 11));
  const positioned = nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    return { ...node, x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
  });
  const byId = new Map(positioned.map((node) => [node.id, node]));
  for (let tick = 0; tick < 70; tick += 1) {
    positioned.forEach((a, index) => {
      for (let j = index + 1; j < positioned.length; j += 1) {
        const b = positioned[j];
        const dx = a.x - b.x || 1;
        const dy = a.y - b.y || 1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const force = Math.min(5, 1400 / (distance * distance));
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
    positioned.forEach((node) => {
      node.x += (centerX - node.x) * 0.004;
      node.y += (centerY - node.y) * 0.004;
      node.x = Math.min(width - 80, Math.max(80, node.x));
      node.y = Math.min(height - 80, Math.max(80, node.y));
    });
  }
  return positioned;
}
