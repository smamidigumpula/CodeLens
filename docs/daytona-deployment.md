# Daytona Deployment

CodeLens can run inside a Daytona sandbox and be shared through Daytona preview URLs. Daytona preview supports HTTP services listening on ports `3000` through `9999`, and signed preview URLs can be opened directly in a browser without custom headers.

## Sandbox Setup

Use [app.daytona.io](https://app.daytona.io) to create a sandbox from:

```text
https://github.com/smamidigumpula/CodeLens
```

Choose a Docker-in-Docker capable snapshot because CodeLens starts the CopilotKit Intelligence Postgres, Redis, API, and realtime gateway with Docker Compose.

## Environment

Add secrets in the Daytona sandbox environment or terminal session. Do not commit `.env` files.

Required:

```bash
GEMINI_API_KEY=...
```

Recommended:

```bash
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=codelens-daytona
LANGSMITH_API_KEY=...
LANGGRAPH_DEPLOYMENT_URL=http://localhost:8133
BFF_URL=http://localhost:4000
INTELLIGENCE_API_URL=http://localhost:4203
```

For remote browser access, `INTELLIGENCE_GATEWAY_WS_URL` must point to Daytona's preview URL for port `4403`, not localhost. Use a public sandbox preview or a signed preview URL, convert the scheme to `wss://`, and keep the `/client` path:

```bash
INTELLIGENCE_GATEWAY_WS_URL=wss://4403-<token-or-sandbox>.proxy.daytona.work/client
```

If you want the BFF preview on port `4000` to redirect to the UI preview, set:

```bash
CODELENS_FRONTEND_URL=https://3000-<token-or-sandbox>.proxy.daytona.work/codelens
```

## Start Command

In the Daytona terminal:

```bash
npm install
curl -LsSf https://astral.sh/uv/install.sh | sh
source "$HOME/.local/bin/env"
npm run install:agent
npm run dev:daytona
```

The Daytona-facing frontend listens on port `3000`. Open the signed or public preview URL for port `3000`, then visit `/codelens`.

## Preview Ports

- `3000`: CodeLens frontend
- `4000`: CopilotKit BFF
- `4203`: CopilotKit Intelligence API
- `4403`: CopilotKit Intelligence realtime gateway
- `8133`: LangGraph agent

For a hackathon demo, share the port `3000` preview URL. Keep API keys and signed preview URLs out of GitHub.
