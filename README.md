# devflow-eve-agent

The Vercel [Eve](https://vercel.com/docs/eve) agent that performs DevFlow's LLM code-generation
turns. It is the **Hybrid** migration target: `devflow-backend` (NestJS, on Render) keeps the
deterministic pipeline, gates, RAG, validation, and GitHub commit, and calls this service per
agent turn over HTTP.

See the full plan: `../devflow-backend/docs/architecture/EVE_MIGRATION.md`.

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
npm run typecheck
npx eve dev          # starts a local dev server on :3000
# smoke test the backend subagent:
curl -X POST http://127.0.0.1:3000/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"agent":"backend","message":"<contract JSON here>"}'
```

## Deploy

```bash
vercel deploy        # then set EVE_SERVICE_URL + EVE_SERVICE_TOKEN on the NestJS service
```

> Eve is in public beta (launched 2026-06-17). If the SDK surface differs from what is
> scaffolded here, adjust `defineAgent`/`defineSubagent`/`defineTool` imports to match the
> installed `eve` package and update the migration doc.
