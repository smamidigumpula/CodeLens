import type { AgentEvent, GeneratedSurface } from '../types/protocol';

interface AgentTimelineProps {
  events: AgentEvent[];
  surfaces: GeneratedSurface[];
}

export default function AgentTimeline({ events, surfaces }: AgentTimelineProps) {
  return (
    <section className="agent-panel" aria-label="Agentic UI protocol events">
      <div className="panel-heading">
        <p className="eyebrow">AG-UI transport</p>
        <h2>Agent-generated interface</h2>
      </div>

      <div className="timeline">
        {events.map((event) => (
          <div key={event.id} className="timeline-event">
            <span>{event.type}</span>
            <strong>{event.title}</strong>
            <p>{event.detail}</p>
          </div>
        ))}
      </div>

      <div className="surface-list">
        {surfaces.map((surface) => (
          <article key={surface.id}>
            <span>{surface.kind}</span>
            <h3>{surface.title}</h3>
            <p>{surface.rationale}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
