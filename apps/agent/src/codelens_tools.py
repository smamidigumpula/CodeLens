"""Repository analysis tools for the CodeLens LangChain agent."""

from __future__ import annotations

import base64
import json
import re
import urllib.parse
import urllib.request
from pathlib import PurePosixPath
from typing import Any

from langchain_core.tools import tool


SOURCE_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".go",
    ".rs",
    ".java",
}

IGNORED_SEGMENTS = {
    ".git",
    ".next",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "target",
    "vendor",
}


@tool
def analyze_github_repository(github_url: str, max_files: int = 120) -> dict[str, Any]:
    """Analyze a public GitHub repo and return a file-level dependency graph.

    Args:
        github_url: Public GitHub repository URL.
        max_files: Maximum source files to fetch and parse.
    """
    owner, repo, branch_hint = _parse_github_url(github_url)
    repo_meta = _github_json(f"https://api.github.com/repos/{owner}/{repo}")
    branch = branch_hint or repo_meta.get("default_branch", "main")
    tree = _github_json(
        f"https://api.github.com/repos/{owner}/{repo}/git/trees/{urllib.parse.quote(branch)}?recursive=1"
    )

    candidates = [
        item
        for item in tree.get("tree", [])
        if item.get("type") == "blob"
        and PurePosixPath(item.get("path", "")).suffix in SOURCE_EXTENSIONS
        and not set(PurePosixPath(item.get("path", "")).parts).intersection(IGNORED_SEGMENTS)
        and int(item.get("size") or 0) < 120_000
    ][:max_files]

    files: list[dict[str, Any]] = []
    for item in candidates:
        path = item["path"]
        content = _raw_file(owner, repo, branch, path)
        files.append(
            {
                "path": path,
                "name": PurePosixPath(path).name,
                "language": _language(path),
                "size": item.get("size") or len(content),
                "content": content[:6000],
                "imports": _extract_imports(content, path),
                "resolvedImports": [],
            }
        )

    path_set = {file["path"] for file in files}
    for file in files:
        file["resolvedImports"] = [
            resolved
            for import_path in file["imports"]
            if (resolved := _resolve_import(file["path"], import_path, path_set))
        ]

    return _build_graph(repo_meta.get("full_name", f"{owner}/{repo}"), branch, files)


def _parse_github_url(value: str) -> tuple[str, str, str | None]:
    match = re.match(
        r"^https?://github\.com/([^/]+)/([^/#?]+)(?:/tree/([^/#?]+))?",
        value.strip().rstrip("/"),
    )
    if not match:
        raise ValueError("Expected a GitHub URL like https://github.com/owner/repo")
    return match.group(1), match.group(2).removesuffix(".git"), match.group(3)


def _github_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def _raw_file(owner: str, repo: str, branch: str, path: str) -> str:
    encoded_path = "/".join(urllib.parse.quote(part) for part in path.split("/"))
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{encoded_path}?ref={urllib.parse.quote(branch)}"
    try:
        data = _github_json(url)
        encoded = str(data.get("content", ""))
        return base64.b64decode(encoded).decode("utf-8", errors="replace")
    except Exception:
        return ""


def _extract_imports(content: str, path: str) -> list[str]:
    suffix = PurePosixPath(path).suffix
    patterns: list[str]
    if suffix == ".py":
        patterns = [r"^\s*from\s+([.\w]+)\s+import\s+", r"^\s*import\s+([.\w]+)"]
    elif suffix == ".go":
        patterns = [r'^\s*import\s+"([^"]+)"', r'"([^"]+)"']
    elif suffix == ".rs":
        patterns = [r"^\s*use\s+([^;]+);", r"^\s*mod\s+([a-zA-Z0-9_]+);"]
    elif suffix == ".java":
        patterns = [r"^\s*import\s+([\w.]+);"]
    else:
        patterns = [
            r"import\s+(?:type\s+)?(?:[^'\"]+\s+from\s+)?['\"]([^'\"]+)['\"]",
            r"export\s+(?:type\s+)?(?:[^'\"]+\s+from\s+)?['\"]([^'\"]+)['\"]",
            r"require\(['\"]([^'\"]+)['\"]\)",
        ]

    imports: set[str] = set()
    for pattern in patterns:
        imports.update(re.findall(pattern, content, flags=re.MULTILINE))
    return sorted(imports)[:80]


def _resolve_import(from_path: str, import_path: str, path_set: set[str]) -> str | None:
    if not import_path.startswith((".", "/")):
        return None

    base = list(PurePosixPath(from_path).parent.parts)
    parts = [] if import_path.startswith("/") else base
    for part in PurePosixPath(import_path.strip("/")).parts:
        if part in ("", "."):
            continue
        if part == "..":
            if parts:
                parts.pop()
        else:
            parts.append(part)

    normalized = "/".join(parts)
    guesses = [
        normalized,
        f"{normalized}.ts",
        f"{normalized}.tsx",
        f"{normalized}.js",
        f"{normalized}.jsx",
        f"{normalized}.mjs",
        f"{normalized}.py",
        f"{normalized}/index.ts",
        f"{normalized}/index.tsx",
        f"{normalized}/index.js",
        f"{normalized}/index.jsx",
        f"{normalized}/__init__.py",
    ]
    return next((guess for guess in guesses if guess in path_set), None)


def _build_graph(repo: str, branch: str, files: list[dict[str, Any]]) -> dict[str, Any]:
    incoming: dict[str, int] = {}
    edges: list[dict[str, str]] = []
    for file in files:
        for target in file["resolvedImports"]:
            edges.append({"source": file["path"], "target": target, "kind": "import"})
            incoming[target] = incoming.get(target, 0) + 1

    nodes = [
        {
            "id": file["path"],
            "label": file["name"],
            "group": file["path"].split("/", 1)[0] if "/" in file["path"] else "root",
            "language": file["language"],
            "imports": len(file["resolvedImports"]),
            "importedBy": incoming.get(file["path"], 0),
            "size": file["size"],
        }
        for file in files
    ]
    languages: dict[str, int] = {}
    for file in files:
        languages[file["language"]] = languages.get(file["language"], 0) + 1

    ranked = sorted(nodes, key=lambda n: n["imports"] + n["importedBy"], reverse=True)
    return {
        "repo": repo,
        "branch": branch,
        "files": files,
        "nodes": nodes,
        "edges": edges,
        "summary": {
            "fileCount": len(files),
            "edgeCount": len(edges),
            "languages": languages,
            "hotspots": [node["id"] for node in ranked[:5]],
            "entrypoints": [
                node["id"] for node in nodes if node["imports"] > 0 and node["importedBy"] == 0
            ][:6],
            "isolated": [
                node["id"] for node in nodes if node["imports"] == 0 and node["importedBy"] == 0
            ][:8],
        },
    }


def _language(path: str) -> str:
    suffix = PurePosixPath(path).suffix
    if suffix in {".ts", ".tsx"}:
        return "TypeScript"
    if suffix in {".js", ".jsx", ".mjs", ".cjs"}:
        return "JavaScript"
    if suffix == ".py":
        return "Python"
    if suffix == ".go":
        return "Go"
    if suffix == ".rs":
        return "Rust"
    if suffix == ".java":
        return "Java"
    return "Other"


codelens_tools = [analyze_github_repository]
