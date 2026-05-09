import type { GraphData } from '../types/graph';

interface InspectorProps {
  graph: GraphData;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function Inspector({ graph, selectedId, onSelect }: InspectorProps) {
  const file = graph.files.find((item) => item.path === selectedId) ?? graph.files[0];

  if (!file) {
    return (
      <aside className="inspector empty-state">
        <h2>Inspector</h2>
        <p>Analyze a repository to inspect modules, imports, and dependents.</p>
      </aside>
    );
  }

  const incoming = graph.edges.filter((edge) => edge.target === file.path).map((edge) => edge.source);
  const outgoing = graph.edges.filter((edge) => edge.source === file.path).map((edge) => edge.target);

  return (
    <aside className="inspector">
      <div>
        <p className="eyebrow">Selected module</p>
        <h2>{file.name}</h2>
        <p className="path-label">{file.path}</p>
      </div>

      <div className="inspector-stats">
        <span>
          <strong>{file.language}</strong>
          Language
        </span>
        <span>
          <strong>{outgoing.length}</strong>
          Imports
        </span>
        <span>
          <strong>{incoming.length}</strong>
          Imported by
        </span>
      </div>

      <DependencyList title="Imports" items={outgoing} onSelect={onSelect} />
      <DependencyList title="Dependents" items={incoming} onSelect={onSelect} />

      <div className="code-preview">
        <div className="code-preview-header">Preview</div>
        <pre>{file.content.slice(0, 1800) || 'No preview available.'}</pre>
      </div>
    </aside>
  );
}

function DependencyList({ title, items, onSelect }: { title: string; items: string[]; onSelect: (id: string) => void }) {
  return (
    <div className="dependency-list">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="muted">None resolved.</p>
      ) : (
        items.map((item) => (
          <button key={item} onClick={() => onSelect(item)}>
            {item}
          </button>
        ))
      )}
    </div>
  );
}
