# CodeLens

CodeLens is a Generative UI Global Hackathon project built from the required starter kit. It accepts a GitHub repository URL, analyzes source imports with a LangChain agent, and turns the result into an interactive dependency graph for exploring code structure, module relationships, and architectural flow.

Reference inspiration: [CodeAtlas](https://github.com/lucyb0207/CodeAtlas).

## Hackathon Stack

- Starter kit: [Generative UI Global Hackathon Starter Kit](https://github.com/jerelvelarde/Generative-UI-Global-Hackathon-Starter-Kit)
- Agent: Python LangChain / LangGraph via `create_deep_agent` or `create_agent`
- UI transport: CopilotKit AG-UI runtime
- Generative UI protocol: A2UI-style frontend tools and generated surfaces
- Optional surface: MCP Apps server from the starter kit
- Frontend: Next.js, React, TypeScript

## What It Does

- Accepts a public GitHub repo URL through the agent chat.
- Calls `analyze_github_repository` from the Python agent.
- Fetches the repo tree through the GitHub API.
- Parses JavaScript, TypeScript, Python, Go, Rust, and Java import relationships.
- Resolves local module imports into a file-level dependency graph.
- Uses CopilotKit frontend tools to update the canvas:
  - `setRepositoryGraph`
  - `selectModule`
  - `highlightModules`
  - `setCanvasStatus`
  - `renderDependencyGraph`
- Renders an interactive graph with search, language filtering, focus depth, highlighted hotspots, and a module inspector.

## Local Setup

```bash
npm install
cp .env.example .env
cp apps/agent/.env.example apps/agent/.env
```

Install `uv` for the Python agent, then sync agent dependencies:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
npm run install:agent
```

Add a real `GEMINI_API_KEY` in both `.env` and `apps/agent/.env` for live agent turns. Without it, the starter kit boots its noop fallback so the UI can still load.

To see LangChain/LangGraph traces in LangSmith, add `LANGSMITH_API_KEY` to both `.env` and `apps/agent/.env`. The templates already include `LANGSMITH_TRACING=true` and `LANGSMITH_PROJECT=codelens-local`.

Run the full stack:

```bash
npm run dev
```

Open the frontend and go to `/codelens`.

## Demo Prompt

```text
Analyze https://github.com/lucyb0207/CodeAtlas and show the dependency graph.
```

Expected flow:

1. The agent calls `setCanvasStatus`.
2. The agent calls `analyze_github_repository`.
3. The agent calls `setRepositoryGraph` with the returned graph.
4. The agent highlights hotspots and selects the most connected module.
5. The chat renders a compact generated dependency summary card.

## Notes

- Public GitHub repositories work without a token, subject to GitHub API rate limits.
- The analyzer caps file size and file count to keep hackathon demos responsive.
- Third-party package imports are omitted from the file graph; local relative imports are resolved.
