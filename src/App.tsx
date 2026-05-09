import { FormEvent, useMemo, useState } from 'react';
import AgentTimeline from './components/AgentTimeline';
import DependencyGraph from './components/DependencyGraph';
import Inspector from './components/Inspector';
import { createAgenticUiPacket } from './lib/agenticUi';
import { analyzeGitHubRepo } from './lib/github';
import { sampleGraph } from './lib/sample';
import type { AgenticUiPacket } from './types/protocol';

const EXAMPLE_REPOS = [
  'https://github.com/smamidigumpula/CodeLens',
  'https://github.com/lucyb0207/CodeAtlas',
  'https://github.com/copilotkit/copilotkit'
];

export default function App() {
  const [repoUrl, setRepoUrl] = useState(EXAMPLE_REPOS[0]);
  const [packet, setPacket] = useState<AgenticUiPacket>(() => createAgenticUiPacket(sampleGraph));
  const [selectedId, setSelectedId] = useState<string | null>(sampleGraph.nodes[0]?.id ?? null);
  const [status, setStatus] = useState('Demo graph loaded. Enter a public GitHub URL to analyze live code.');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graph = packet.graph;
  const languageEntries = useMemo(() => Object.entries(graph.summary.languages), [graph.summary.languages]);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    setStatus('Agent is reading the repository tree and composing UI surfaces...');

    try {
      const nextGraph = await analyzeGitHubRepo(repoUrl);
      const nextPacket = createAgenticUiPacket(nextGraph);
      setPacket(nextPacket);
      setSelectedId(nextGraph.summary.hotspots[0] ?? nextGraph.nodes[0]?.id ?? null);
      setStatus(`Generated ${nextPacket.surfaces.length} interactive surfaces for ${nextGraph.repo}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Analysis failed.');
      setStatus('Analysis stopped before a new UI packet could be rendered.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app">
      <section className="workspace-header">
        <div className="header-copy">
          <p className="eyebrow">CodeLens</p>
          <h1>Agentic code maps for GitHub repositories</h1>
          <p>
            Paste a public repo URL and the analyzer emits an AG-UI style event stream plus A2UI-inspired surfaces for
            graph exploration, module inspection, and architecture next steps.
          </p>
        </div>

        <form className="repo-form" onSubmit={analyze}>
          <label>
            GitHub repository URL
            <input value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} />
          </label>
          <button disabled={isLoading}>{isLoading ? 'Analyzing...' : 'Analyze repo'}</button>
          <div className="quick-picks">
            {EXAMPLE_REPOS.map((example) => (
              <button type="button" key={example} onClick={() => setRepoUrl(example)}>
                {example.replace('https://github.com/', '')}
              </button>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          <p className="status">{status}</p>
        </form>
      </section>

      <section className="metrics-row" aria-label="Repository metrics">
        <Metric label="Files parsed" value={graph.summary.fileCount.toString()} />
        <Metric label="Dependencies" value={graph.summary.edgeCount.toString()} />
        <Metric label="Hotspots" value={graph.summary.hotspots.length.toString()} />
        <Metric label="Branch" value={graph.branch} />
      </section>

      <section className="language-strip" aria-label="Language breakdown">
        {languageEntries.map(([language, count]) => (
          <span key={language}>
            {language} <strong>{count}</strong>
          </span>
        ))}
      </section>

      <section className="main-grid">
        <div className="graph-column">
          <div className="section-heading">
            <p className="eyebrow">Generated graph surface</p>
            <h2>{graph.repo}</h2>
          </div>
          <DependencyGraph graph={graph} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <Inspector graph={graph} selectedId={selectedId} onSelect={setSelectedId} />
      </section>

      <section className="insight-grid">
        <ArchitectureList title="Likely entrypoints" items={graph.summary.entrypoints} onSelect={setSelectedId} />
        <ArchitectureList title="High-coupling hotspots" items={graph.summary.hotspots} onSelect={setSelectedId} />
        <ArchitectureList title="Isolated modules" items={graph.summary.isolated} onSelect={setSelectedId} />
        <AgentTimeline events={packet.events} surfaces={packet.surfaces} />
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function ArchitectureList({ title, items, onSelect }: { title: string; items: string[]; onSelect: (id: string) => void }) {
  return (
    <article className="architecture-card">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="muted">No modules matched this signal.</p>
      ) : (
        items.map((item) => (
          <button key={item} onClick={() => onSelect(item)}>
            {item}
          </button>
        ))
      )}
    </article>
  );
}
