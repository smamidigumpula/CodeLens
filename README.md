# CodeLens

CodeLens turns a GitHub repository URL into an agent-generated, interactive dependency graph for exploring code structure, module relationships, and architectural flow.

It was built for the Generative UI Global Hackathon: Agentic Interfaces. The app uses an AG-UI-style event timeline and A2UI-inspired declarative surfaces so the agent does more than answer in text: it renders the exact controls, graph, inspector, and next-step panels needed for codebase exploration.

## What It Does

- Accepts a public GitHub repository URL.
- Reads the repository tree through the GitHub API.
- Fetches source files for JavaScript, TypeScript, Python, Go, Rust, and Java.
- Extracts import/include relationships with language-aware parsing rules.
- Resolves local imports into a file-level dependency graph.
- Generates interactive UI surfaces for metrics, graph exploration, module inspection, and architecture follow-ups.

## Hackathon Protocol

CodeLens uses the **AG-UI + A2UI-inspired surfaces** path:

- `run.started`, `tool.called`, `surface.created`, and `run.completed` events model the agent-to-frontend transport.
- The agent produces declarative surface descriptors for metrics, graph, inspector, and action panels.
- The React client renders those surfaces as native interactive UI instead of executing arbitrary generated code.

This keeps the project aligned with the hackathon goal: agentic interfaces where the useful output is a live UI, not a chatbot transcript.

## Reference

CodeLens is inspired by [CodeAtlas](https://github.com/lucyb0207/CodeAtlas), especially its GitHub URL intake, repository dependency graph, file inspector, search, and focus-based architecture exploration.

## Tech Stack

- React + TypeScript
- Vite
- GitHub REST API
- Custom SVG graph renderer
- AG-UI-style event packet + A2UI-inspired declarative surfaces

## Getting Started

```bash
npm install
npm run dev
```

Then open the local Vite URL and paste a public GitHub repository URL.

## Notes

- Public repositories work without a token, subject to GitHub API rate limits.
- The analyzer limits source file size and total files so the prototype stays responsive during a hackathon demo.
- Local relative imports are resolved; third-party package imports are treated as external and omitted from the file graph.

## Demo Pitch

CodeLens is an agentic code exploration UI: the agent reads a repository and dynamically generates the graph, controls, inspector, and architectural next steps needed to understand it.
