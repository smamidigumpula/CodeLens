export type Language = 'TypeScript' | 'JavaScript' | 'Python' | 'Go' | 'Rust' | 'Java' | 'Other';

export interface SourceFile {
  path: string;
  name: string;
  language: Language;
  size: number;
  content: string;
  imports: string[];
  resolvedImports: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  language: Language;
  imports: number;
  importedBy: number;
  size: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: 'import' | 'include' | 'package';
}

export interface GraphData {
  repo: string;
  branch: string;
  files: SourceFile[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    fileCount: number;
    edgeCount: number;
    languages: Record<string, number>;
    hotspots: string[];
    entrypoints: string[];
    isolated: string[];
  };
}
