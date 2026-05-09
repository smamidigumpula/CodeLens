import type { GraphData } from './graph';

export type AgentEventType = 'run.started' | 'tool.called' | 'surface.created' | 'run.completed';

export interface AgentEvent {
  id: string;
  type: AgentEventType;
  title: string;
  detail: string;
  timestamp: number;
}

export type SurfaceKind = 'metrics' | 'graph' | 'inspector' | 'actions';

export interface GeneratedSurface {
  id: string;
  kind: SurfaceKind;
  title: string;
  rationale: string;
  props: Record<string, unknown>;
}

export interface AgenticUiPacket {
  protocol: 'AG-UI + A2UI-inspired surfaces';
  runId: string;
  graph: GraphData;
  events: AgentEvent[];
  surfaces: GeneratedSurface[];
}
