"use client";

import { useCallback, useEffect, useState } from "react";
import type React from "react";
import { z } from "zod";
import {
  CopilotChatConfigurationProvider,
  CopilotSidebar,
  useAgent,
  useConfigureSuggestions,
  useDefaultRenderTool,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import { Network, GitBranch, Waypoints } from "lucide-react";

import { ThreadsDrawer } from "@/components/threads-drawer";
import drawerStyles from "@/components/threads-drawer/threads-drawer.module.css";
import { ToolFallbackCard } from "@/components/copilot/ToolFallbackCard";
import { DependencyGraph } from "@/components/codelens/DependencyGraph";
import { Inspector } from "@/components/codelens/Inspector";
import { sampleGraph } from "@/lib/codelens/sample";
import type { CodeLensState, GraphData } from "@/lib/codelens/types";

const initialState: CodeLensState = {
  graph: sampleGraph,
  selectedModuleId: sampleGraph.summary.hotspots[0] ?? sampleGraph.nodes[0]?.id ?? null,
  highlightedModuleIds: sampleGraph.summary.hotspots,
  status: "Demo graph loaded. Ask the agent to analyze a public GitHub repository.",
};

const graphShape = z.object({
  repo: z.string(),
  branch: z.string(),
  files: z.array(z.any()),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  summary: z.object({
    fileCount: z.number(),
    edgeCount: z.number(),
    languages: z.record(z.number()),
    hotspots: z.array(z.string()),
    entrypoints: z.array(z.string()),
    isolated: z.array(z.string()),
  }),
});

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

function mergeState(raw: unknown): CodeLensState {
  const partial = raw && typeof raw === "object" ? (raw as Partial<CodeLensState>) : {};
  return {
    ...initialState,
    ...partial,
    graph: partial.graph ?? initialState.graph,
    highlightedModuleIds: partial.highlightedModuleIds ?? initialState.highlightedModuleIds,
  };
}

function CanvasInner() {
  const { agent } = useAgent();
  const state = mergeState(agent?.state);

  const updateState = useCallback(
    (updater: (previous: CodeLensState) => CodeLensState) => {
      agent?.setState(updater(mergeState(agent?.state)));
    },
    [agent],
  );

  useConfigureSuggestions({
    available: "before-first-message",
    suggestions: [
      {
        title: "Analyze CodeAtlas",
        message: "Analyze https://github.com/lucyb0207/CodeAtlas and show the dependency graph.",
      },
      {
        title: "Analyze CopilotKit",
        message: "Analyze https://github.com/copilotkit/copilotkit and highlight architectural hotspots.",
      },
      {
        title: "Explain hotspots",
        message: "Explain the current graph hotspots and select the most connected module.",
      },
    ],
  });

  useEffect(() => {
    if (!agent?.state) {
      agent?.setState(initialState);
    }
  }, [agent]);

  useFrontendTool({
    name: "setRepositoryGraph",
    description: "Replace the CodeLens canvas graph with an analyzed repository graph.",
    parameters: z.object({ graph: graphShape.passthrough() }),
    handler: async ({ graph }) => {
      const nextGraph = graph as GraphData;
      updateState((previous) => ({
        ...previous,
        graph: nextGraph,
        selectedModuleId: nextGraph.summary.hotspots[0] ?? nextGraph.nodes[0]?.id ?? null,
        highlightedModuleIds: nextGraph.summary.hotspots,
        status: `Generated dependency graph for ${nextGraph.repo}.`,
      }));
      return `loaded ${nextGraph.nodes.length} modules and ${nextGraph.edges.length} edges`;
    },
  });

  useFrontendTool({
    name: "selectModule",
    description: "Select a module in the graph inspector.",
    parameters: z.object({ moduleId: z.string().nullable() }),
    handler: async ({ moduleId }) => {
      updateState((previous) => ({ ...previous, selectedModuleId: moduleId }));
      return moduleId ? `selected ${moduleId}` : "selection cleared";
    },
  });

  useFrontendTool({
    name: "highlightModules",
    description: "Highlight graph modules by id.",
    parameters: z.object({ moduleIds: z.array(z.string()) }),
    handler: async ({ moduleIds }) => {
      updateState((previous) => ({ ...previous, highlightedModuleIds: moduleIds }));
      return `highlighted ${moduleIds.length} modules`;
    },
  });

  useFrontendTool({
    name: "setCanvasStatus",
    description: "Set the CodeLens canvas status message.",
    parameters: z.object({ message: z.string() }),
    handler: async ({ message }) => {
      updateState((previous) => ({ ...previous, status: message }));
      return "status updated";
    },
  });

  useFrontendTool({
    name: "renderDependencyGraph",
    description: "Render an inline summary card after a repository dependency graph has been generated.",
    parameters: z.object({
      repo: z.string(),
      nodeCount: z.number(),
      edgeCount: z.number(),
    }),
    render: ({ args }) => (
      <div className="my-2 max-w-sm rounded-xl border border-[#DBDBE5] bg-white p-3 text-sm shadow-sm">
        <div className="flex items-center gap-2">
          <Network className="size-4 text-blue-600" />
          <span className="font-semibold">{args.repo}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-slate-50 p-2">
            <strong className="block text-base text-foreground">{args.nodeCount}</strong>
            modules
          </span>
          <span className="rounded-md bg-slate-50 p-2">
            <strong className="block text-base text-foreground">{args.edgeCount}</strong>
            dependencies
          </span>
        </div>
      </div>
    ),
  });

  useDefaultRenderTool({
    render: ({ name, status, result, parameters }) => (
      <ToolFallbackCard name={name} status={status} result={result} parameters={parameters} />
    ),
  });

  const graph = state.graph ?? sampleGraph;
  const languages = Object.entries(graph.summary.languages);
  const selectModule = (id: string) => updateState((previous) => ({ ...previous, selectedModuleId: id }));

  return (
    <>
      <main className="flex h-screen flex-col gap-4 overflow-hidden bg-background px-6 py-5">
        <section className="grid gap-4 lg:grid-cols-[1fr_430px]">
          <div className="border-l-4 border-blue-600 bg-card px-6 py-5">
            <p className="text-xs font-bold uppercase text-blue-600">CodeLens</p>
            <h1 className="mt-1 max-w-4xl text-4xl font-semibold tracking-normal text-foreground lg:text-6xl">
              Agentic dependency graphs for GitHub repositories
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              Built on the hackathon starter kit with CopilotKit AG-UI transport,
              A2UI-style generated surfaces, and a LangChain agent that calls repository-analysis tools.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">Agent task</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use the chat to ask: analyze https://github.com/owner/repo. The agent calls
              `analyze_github_repository`, then updates this canvas through frontend tools.
            </p>
            <p className="mt-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">{state.status}</p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric icon={<Network className="size-4" />} label="Files parsed" value={String(graph.summary.fileCount)} />
          <Metric icon={<Waypoints className="size-4" />} label="Dependencies" value={String(graph.summary.edgeCount)} />
          <Metric icon={<GitBranch className="size-4" />} label="Branch" value={graph.branch} />
          <Metric icon={<Network className="size-4" />} label="Languages" value={String(languages.length)} />
        </section>

        <section className="flex flex-wrap gap-2">
          {languages.map(([language, count]) => (
            <span key={language} className="rounded-full border border-border bg-card px-3 py-1 text-sm">
              {language} <strong>{count}</strong>
            </span>
          ))}
        </section>

        <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_390px]">
          <div className="min-w-0 overflow-auto">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-blue-600">Generated graph surface</p>
                <h2 className="text-xl font-semibold">{graph.repo}</h2>
              </div>
            </div>
            <DependencyGraph
              graph={graph}
              selectedId={state.selectedModuleId}
              highlightedIds={state.highlightedModuleIds}
              onSelect={selectModule}
            />
          </div>
          <Inspector graph={graph} selectedId={state.selectedModuleId} onSelect={selectModule} />
        </section>
      </main>
      <CopilotSidebar defaultOpen width={420} input={{ disclaimer: () => null, className: "pb-6" }} />
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <strong className="mt-2 block break-words text-2xl text-foreground">{value}</strong>
    </article>
  );
}

function CodeLensPage() {
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  return (
    <div className={drawerStyles.layout}>
      <ThreadsDrawer agentId="default" threadId={threadId} onThreadChange={setThreadId} />
      <div className={drawerStyles.mainPanel}>
        <CopilotChatConfigurationProvider agentId="default" threadId={threadId}>
          <CanvasInner />
        </CopilotChatConfigurationProvider>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <CodeLensPage />
    </ClientOnly>
  );
}
