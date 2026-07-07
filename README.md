# agentic-orchestration-ag

The Vercel [Eve](https://vercel.com/docs/eve) agent that performs Agentic Orchestration's
LLM code-generation turns. It is the **Hybrid** execution service:
`agentic-orchestration-be` keeps the deterministic pipeline, gates, persistence, validation,
and delivery, then calls this service per agent turn over HTTP.

The frontend never calls this service directly. The backend starts project runs through
`POST /projects/:id/orchestration/start`, stores run state, and calls this Eve service from
its provider layer when `ORCHESTRATION_LLM_ENGINE=eve` and `EVE_SERVICE_URL` are configured.

## Layout

Eve discovers agents by directory. Each subagent is its **own directory** under
`agent/subagents/<id>/` (the directory name becomes the tool the caller invokes), with its own
`agent.ts` (must export `defineAgent({ description, ... })`), optional `instructions.md`, and
optional `tools/`.

```
lib/
  typecheck-tool.ts          shared tool impl (re-exported by each code subagent)
agent/
  agent.ts                   root runtime config (model via AI Gateway)
  instructions.md            always-on system prompt + strict JSON-only output contract
  tools/typecheck.ts         re-exports lib/typecheck-tool
  subagents/
    backend/      agent.ts  instructions.md  tools/typecheck.ts
    frontend/     agent.ts  instructions.md  tools/typecheck.ts
    database/     agent.ts  instructions.md  tools/typecheck.ts
    architecture/ agent.ts  instructions.md  tools/typecheck.ts
    requirements-parser/  agent.ts  instructions.md
    contract-negotiator/  agent.ts  instructions.md
    self-critique/        agent.ts  instructions.md
```

Subagents inherit nothing from the root, so each code subagent owns its `tools/typecheck.ts`
(a one-line re-export of the shared `lib/typecheck-tool.ts`). Each code subagent returns the
**same JSON shape** the NestJS `output-validation` layer already expects
(`{ filePath, content, language }[]`), so no backend validation changes.

## First run (Phase 0 spike)

Requires Node.js 24 or newer. The installed Eve package (`0.13.8` in the current lockfile)
will refuse to run on Node 22.

```bash
cd agentic-orchestration-ag
npm install
npm test
npm run typecheck
npm run build
npx eve dev          # starts a local dev server on :3000
# smoke test the backend subagent:
curl -X POST http://127.0.0.1:3000/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"agent":"backend","message":"<contract JSON here>"}'
```

To test the same bearer-token path the NestJS backend uses, set the same shared secret in
both processes:

```bash
EVE_SERVICE_TOKEN=dev-local-token npx eve dev
curl -X POST http://127.0.0.1:3000/eve/v1/session \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer dev-local-token' \
  -d '{"agent":"backend","message":"<contract JSON here>"}'
```

## Deploy on Render

```bash
Build command: npm ci && npm test && npm run typecheck && npm run build
Start command: npm run start
```

Set the Render service to Node.js 24 or newer. After Render assigns the service URL, set
`EVE_SERVICE_URL` on `agentic-orchestration-be` to that URL and set the same
`EVE_SERVICE_TOKEN` value on both services.

Before deploying, run:

```bash
npm test             # validates subagent JSON contract fixtures + typecheck result shape
npm run typecheck    # validates TypeScript source
npm run build        # validates Eve discovery/build output
```

`EVE_SERVICE_TOKEN` is an app-defined shared secret, not a token issued by Eve. Generate a
long random value and set it on both the deployed Eve service and `agentic-orchestration-be`.

Vercel deployment remains available through `npm run deploy` or `npm run deploy:vercel`, but
the active deployment runbook uses Render for this service.

> Eve is in public beta (launched 2026-06-17). If the SDK surface differs from what is
> scaffolded here, adjust `defineAgent`/`defineSubagent`/`defineTool` imports to match the
> installed `eve` package and update the migration doc.
