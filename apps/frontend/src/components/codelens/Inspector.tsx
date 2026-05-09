"use client";

import type { GraphData } from "@/lib/codelens/types";

export function Inspector({
  graph,
  selectedId,
  onSelect,
}: {
  graph: GraphData;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const file = graph.files.find((item) => item.path === selectedId) ?? graph.files[0];
  if (!file) return null;
  const incoming = graph.edges.filter((edge) => edge.target === file.path).map((edge) => edge.source);
  const outgoing = graph.edges.filter((edge) => edge.source === file.path).map((edge) => edge.target);

  return (
    <aside className="flex max-h-[calc(100vh-150px)] flex-col gap-4 overflow-auto rounded-lg border border-border bg-card p-4">
      <div>
        <p className="text-xs font-bold uppercase text-blue-600">Selected module</p>
        <h2 className="mt-1 text-xl font-semibold">{file.name}</h2>
        <p className="break-words text-sm text-muted-foreground">{file.path}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Language" value={file.language} />
        <Stat label="Imports" value={String(outgoing.length)} />
        <Stat label="Imported by" value={String(incoming.length)} />
      </div>
      <DependencyList title="Imports" items={outgoing} onSelect={onSelect} />
      <DependencyList title="Dependents" items={incoming} onSelect={onSelect} />
      <div className="overflow-hidden rounded-lg border border-border bg-slate-950">
        <div className="border-b border-white/10 px-3 py-2 text-xs font-bold text-slate-300">Preview</div>
        <pre className="max-h-80 overflow-auto p-3 text-xs leading-relaxed text-blue-100">{file.content || "No preview available."}</pre>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md border border-border p-2 text-xs text-muted-foreground">
      <strong className="block break-words text-sm text-foreground">{value}</strong>
      {label}
    </span>
  );
}

function DependencyList({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: string[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None resolved.</p>
      ) : (
        items.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => onSelect(item)}
            className="rounded-full border border-border bg-background px-3 py-1 text-left text-xs"
          >
            {item}
          </button>
        ))
      )}
    </div>
  );
}
