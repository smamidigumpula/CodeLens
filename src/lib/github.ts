import type { GraphData, GraphEdge, GraphNode, Language, SourceFile } from '../types/graph';

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.rs',
  '.java'
]);

const IGNORED_SEGMENTS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  'coverage',
  'vendor',
  'target',
  '__pycache__'
]);

interface GitHubTreeItem {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
}

interface RepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

export function parseGitHubUrl(input: string): RepoInfo {
  const trimmed = input.trim().replace(/\/$/, '');
  const match = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)(?:\/tree\/([^/#?]+))?/i);
  if (!match) {
    throw new Error('Enter a GitHub repository URL like https://github.com/owner/repo');
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
    branch: match[3]
  };
}

export async function analyzeGitHubRepo(url: string): Promise<GraphData> {
  const repoInfo = parseGitHubUrl(url);
  const repoResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`);

  if (!repoResponse.ok) {
    throw new Error(`GitHub could not load that repository (${repoResponse.status}).`);
  }

  const repoMetadata = (await repoResponse.json()) as { default_branch: string; full_name: string };
  const branch = repoInfo.branch ?? repoMetadata.default_branch;
  const treeResponse = await fetch(
    `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );

  if (!treeResponse.ok) {
    throw new Error(`GitHub could not read the ${branch} branch tree (${treeResponse.status}).`);
  }

  const treeData = (await treeResponse.json()) as { tree: GitHubTreeItem[]; truncated?: boolean };
  const candidates = treeData.tree
    .filter((item) => item.type === 'blob')
    .filter((item) => SOURCE_EXTENSIONS.has(extensionOf(item.path)))
    .filter((item) => !item.path.split('/').some((segment) => IGNORED_SEGMENTS.has(segment)))
    .filter((item) => (item.size ?? 0) < 120_000)
    .slice(0, 120);

  const files = await Promise.all(
    candidates.map(async (item) => {
      const rawUrl = `https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/${encodeURIComponent(branch)}/${item.path}`;
      const contentResponse = await fetch(rawUrl);
      const content = contentResponse.ok ? await contentResponse.text() : '';
      const imports = extractImports(content, item.path);

      return {
        path: item.path,
        name: item.path.split('/').pop() ?? item.path,
        language: languageForPath(item.path),
        size: item.size ?? content.length,
        content,
        imports,
        resolvedImports: []
      };
    })
  );

  const pathSet = new Set(files.map((file) => file.path));
  const filesWithResolvedImports = files.map((file) => ({
    ...file,
    resolvedImports: file.imports
      .map((importPath) => resolveImport(file.path, importPath, pathSet))
      .filter((resolved): resolved is string => Boolean(resolved))
  }));

  return buildGraph(repoMetadata.full_name, branch, filesWithResolvedImports);
}

function buildGraph(repo: string, branch: string, files: SourceFile[]): GraphData {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  const edges: GraphEdge[] = [];

  files.forEach((file) => {
    outgoing.set(file.path, file.resolvedImports.length);
    file.resolvedImports.forEach((target) => {
      edges.push({
        source: file.path,
        target,
        kind: file.language === 'Python' ? 'package' : 'import'
      });
      incoming.set(target, (incoming.get(target) ?? 0) + 1);
    });
  });

  const nodes: GraphNode[] = files.map((file) => ({
    id: file.path,
    label: file.name,
    group: file.path.includes('/') ? file.path.split('/')[0] : 'root',
    language: file.language,
    imports: outgoing.get(file.path) ?? 0,
    importedBy: incoming.get(file.path) ?? 0,
    size: file.size
  }));

  const languages = files.reduce<Record<string, number>>((acc, file) => {
    acc[file.language] = (acc[file.language] ?? 0) + 1;
    return acc;
  }, {});

  const hotspots = [...nodes]
    .sort((a, b) => b.importedBy + b.imports - (a.importedBy + a.imports))
    .slice(0, 5)
    .map((node) => node.id);

  const entrypoints = nodes
    .filter((node) => node.imports > 0 && node.importedBy === 0)
    .slice(0, 6)
    .map((node) => node.id);

  const isolated = nodes
    .filter((node) => node.imports === 0 && node.importedBy === 0)
    .slice(0, 8)
    .map((node) => node.id);

  return {
    repo,
    branch,
    files,
    nodes,
    edges,
    summary: {
      fileCount: files.length,
      edgeCount: edges.length,
      languages,
      hotspots,
      entrypoints,
      isolated
    }
  };
}

function extractImports(content: string, path: string): string[] {
  const language = languageForPath(path);
  const imports = new Set<string>();
  const patterns =
    language === 'Python'
      ? [
          /^\s*from\s+([.\w]+)\s+import\s+/gm,
          /^\s*import\s+([.\w]+)/gm
        ]
      : language === 'Go'
        ? [/^\s*import\s+"([^"]+)"/gm, /"([^"]+)"/gm]
        : language === 'Rust'
          ? [/^\s*use\s+([^;]+);/gm, /^\s*mod\s+([a-zA-Z0-9_]+);/gm]
          : language === 'Java'
            ? [/^\s*import\s+([\w.]+);/gm]
            : [
                /import\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/gm,
                /export\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/gm,
                /require\(['"]([^'"]+)['"]\)/gm
              ];

  patterns.forEach((pattern) => {
    for (const match of content.matchAll(pattern)) {
      imports.add(match[1]);
    }
  });

  return [...imports].slice(0, 80);
}

function resolveImport(fromPath: string, importPath: string, pathSet: Set<string>): string | null {
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null;
  }

  const baseParts = fromPath.split('/').slice(0, -1);
  const importParts = importPath.replace(/^\//, '').split('/');
  const stack = importPath.startsWith('/') ? [] : [...baseParts];

  importParts.forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') {
      stack.pop();
      return;
    }
    stack.push(part);
  });

  const normalized = stack.join('/');
  const guesses = [
    normalized,
    `${normalized}.ts`,
    `${normalized}.tsx`,
    `${normalized}.js`,
    `${normalized}.jsx`,
    `${normalized}.mjs`,
    `${normalized}.py`,
    `${normalized}/index.ts`,
    `${normalized}/index.tsx`,
    `${normalized}/index.js`,
    `${normalized}/index.jsx`,
    `${normalized}/__init__.py`
  ];

  return guesses.find((guess) => pathSet.has(guess)) ?? null;
}

function languageForPath(path: string): Language {
  const extension = extensionOf(path);
  if (extension === '.ts' || extension === '.tsx') return 'TypeScript';
  if (extension === '.js' || extension === '.jsx' || extension === '.mjs' || extension === '.cjs') return 'JavaScript';
  if (extension === '.py') return 'Python';
  if (extension === '.go') return 'Go';
  if (extension === '.rs') return 'Rust';
  if (extension === '.java') return 'Java';
  return 'Other';
}

function extensionOf(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot);
}
