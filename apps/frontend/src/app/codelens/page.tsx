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
import { Code2, GitBranch, Network, Sparkles, Waypoints } from "lucide-react";

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
      <main className="flex h-screen min-w-0 flex-col gap-3 overflow-hidden bg-[#f6f7fb] px-5 py-4">
        <section className="grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase text-blue-700">
                <Code2 className="size-3.5" />
                CodeLens
              </span>
              <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                LangChain agent + AG-UI canvas
              </span>
            </div>
            <h1 className="mt-3 max-w-4xl text-2xl font-semibold leading-tight tracking-normal text-foreground lg:text-3xl">
              Explore a GitHub repo as an interactive dependency map
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Ask the agent to analyze a repository, then inspect modules, imports, hotspots, and architectural flow in the canvas.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-blue-600" />
              <p className="text-sm font-semibold text-foreground">Try in chat</p>
            </div>
            <div className="mt-3 grid gap-2 text-xs">
              <PromptChip text="Analyze https://github.com/lucyb0207/CodeAtlas" />
              <PromptChip text="Explain hotspots in this graph" />
            </div>
            <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm leading-5 text-blue-900">
              {state.status}
            </p>
          </div>
        </section>

        <section className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric icon={<Network className="size-4" />} label="Files parsed" value={String(graph.summary.fileCount)} />
          <Metric icon={<Waypoints className="size-4" />} label="Dependencies" value={String(graph.summary.edgeCount)} />
          <Metric icon={<GitBranch className="size-4" />} label="Branch" value={graph.branch} />
          <Metric icon={<Network className="size-4" />} label="Languages" value={String(languages.length)} />
        </section>

        <section className="flex shrink-0 flex-wrap gap-2">
          {languages.map(([language, count]) => (
            <span key={language} className="rounded-full border border-border bg-card px-3 py-1 text-sm">
              {language} <strong>{count}</strong>
            </span>
          ))}
        </section>

        <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_390px]">
          <div className="flex min-w-0 flex-col overflow-hidden">
            <div className="mb-2 flex shrink-0 items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-blue-600">Dependency graph</p>
                <h2 className="break-words text-xl font-semibold">{graph.repo}</h2>
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
      <CopilotSidebar defaultOpen={false} width={420} input={{ disclaimer: () => null, className: "pb-6" }} />
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <strong className="mt-1 block break-words text-xl text-foreground">{value}</strong>
    </article>
  );
}

function PromptChip({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 font-mono text-[11px] leading-5 text-muted-foreground">
      {text}
    </div>
  );
}

function CodeLensPage() {
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  return (
    <div className={drawerStyles.layout}>
      <ThreadsDrawer agentId="default" threadId={threadId} onThreadChange={setThreadId} defaultOpen={false} />
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
