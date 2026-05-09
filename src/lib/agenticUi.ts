import type { AgentEvent, AgenticUiPacket, GeneratedSurface } from '../types/protocol';
import type { GraphData } from '../types/graph';

export function createAgenticUiPacket(graph: GraphData): AgenticUiPacket {
  const runId = `codelens-${Date.now().toString(36)}`;
  const events: AgentEvent[] = [
    createEvent('run.started', 'Repository intake', `Accepted ${graph.repo} on ${graph.branch}.`, -3200),
    createEvent('tool.called', 'Dependency analyzer', `Parsed ${graph.summary.fileCount} source files and resolved imports.`, -2100),
    createEvent('surface.created', 'Generated graph UI', 'Composed metrics, graph, inspector, and action surfaces from analysis state.', -900),
    createEvent('run.completed', 'Architecture packet ready', `${graph.summary.edgeCount} module relationships are available for exploration.`, 0)
  ];

  const surfaces: GeneratedSurface[] = [
    {
      id: 'metrics-surface',
      kind: 'metrics',
      title: 'Repository Signals',
      rationale: 'Show the smallest set of indicators needed before opening the graph.',
      props: {
        fileCount: graph.summary.fileCount,
        edgeCount: graph.summary.edgeCount,
        languages: graph.summary.languages
      }
    },
    {
      id: 'graph-surface',
      kind: 'graph',
      title: 'Interactive Dependency Graph',
      rationale: 'Render an explorable graph instead of returning a textual architecture summary.',
      props: {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        controls: ['search', 'focus', 'depth', 'language filter']
      }
    },
    {
      id: 'inspector-surface',
      kind: 'inspector',
      title: 'Module Inspector',
      rationale: 'Let the user click generated graph nodes and inspect code, imports, and dependents inline.',
      props: {
        supports: ['file preview', 'incoming dependencies', 'outgoing dependencies']
      }
    },
    {
      id: 'actions-surface',
      kind: 'actions',
      title: 'Architecture Next Steps',
      rationale: 'Turn analysis into targeted exploration actions a developer can execute immediately.',
      props: {
        hotspots: graph.summary.hotspots,
        entrypoints: graph.summary.entrypoints,
        isolated: graph.summary.isolated
      }
    }
  ];

  return {
    protocol: 'AG-UI + A2UI-inspired surfaces',
    runId,
    graph,
    events,
    surfaces
  };
}

function createEvent(type: AgentEvent['type'], title: string, detail: string, offsetMs: number): AgentEvent {
  return {
    id: `${type}-${Math.abs(offsetMs)}`,
    type,
    title,
    detail,
    timestamp: Date.now() + offsetMs
  };
}
