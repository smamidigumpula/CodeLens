import type { GraphData } from '../types/graph';

export const sampleGraph: GraphData = {
  repo: 'smamidigumpula/CodeLens',
  branch: 'demo',
  files: [
    {
      path: 'src/App.tsx',
      name: 'App.tsx',
      language: 'TypeScript',
      size: 8200,
      content: "import { analyzeGitHubRepo } from './lib/github';\nimport DependencyGraph from './components/DependencyGraph';\n",
      imports: ['./lib/github', './components/DependencyGraph'],
      resolvedImports: ['src/lib/github.ts', 'src/components/DependencyGraph.tsx']
    },
    {
      path: 'src/lib/github.ts',
      name: 'github.ts',
      language: 'TypeScript',
      size: 10800,
      content: "export async function analyzeGitHubRepo(url: string) {\n  return fetch(url);\n}\n",
      imports: ['../types/graph'],
      resolvedImports: ['src/types/graph.ts']
    },
    {
      path: 'src/components/DependencyGraph.tsx',
      name: 'DependencyGraph.tsx',
      language: 'TypeScript',
      size: 12200,
      content: "import type { GraphData } from '../types/graph';\nexport default function DependencyGraph() { return null; }\n",
      imports: ['../types/graph'],
      resolvedImports: ['src/types/graph.ts']
    },
    {
      path: 'src/components/Inspector.tsx',
      name: 'Inspector.tsx',
      language: 'TypeScript',
      size: 6100,
      content: "import type { SourceFile } from '../types/graph';\n",
      imports: ['../types/graph'],
      resolvedImports: ['src/types/graph.ts']
    },
    {
      path: 'src/types/graph.ts',
      name: 'graph.ts',
      language: 'TypeScript',
      size: 1800,
      content: 'export interface GraphData {}\n',
      imports: [],
      resolvedImports: []
    }
  ],
  nodes: [
    { id: 'src/App.tsx', label: 'App.tsx', group: 'src', language: 'TypeScript', imports: 2, importedBy: 0, size: 8200 },
    { id: 'src/lib/github.ts', label: 'github.ts', group: 'src', language: 'TypeScript', imports: 1, importedBy: 1, size: 10800 },
    {
      id: 'src/components/DependencyGraph.tsx',
      label: 'DependencyGraph.tsx',
      group: 'src',
      language: 'TypeScript',
      imports: 1,
      importedBy: 1,
      size: 12200
    },
    {
      id: 'src/components/Inspector.tsx',
      label: 'Inspector.tsx',
      group: 'src',
      language: 'TypeScript',
      imports: 1,
      importedBy: 0,
      size: 6100
    },
    { id: 'src/types/graph.ts', label: 'graph.ts', group: 'src', language: 'TypeScript', imports: 0, importedBy: 3, size: 1800 }
  ],
  edges: [
    { source: 'src/App.tsx', target: 'src/lib/github.ts', kind: 'import' },
    { source: 'src/App.tsx', target: 'src/components/DependencyGraph.tsx', kind: 'import' },
    { source: 'src/lib/github.ts', target: 'src/types/graph.ts', kind: 'import' },
    { source: 'src/components/DependencyGraph.tsx', target: 'src/types/graph.ts', kind: 'import' },
    { source: 'src/components/Inspector.tsx', target: 'src/types/graph.ts', kind: 'import' }
  ],
  summary: {
    fileCount: 5,
    edgeCount: 5,
    languages: { TypeScript: 5 },
    hotspots: ['src/types/graph.ts', 'src/App.tsx', 'src/components/DependencyGraph.tsx'],
    entrypoints: ['src/App.tsx', 'src/components/Inspector.tsx'],
    isolated: []
  }
};
