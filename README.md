# Student Copilot on Cloudflare

This repository delivers **Student Copilot**, an AI-first study companion and planner built entirely on the Cloudflare Developer Platform:

- **Workers + Durable Objects** manage chat orchestration, tools, and persistent student memory (profile, tasks, courses, study history).
- **Workers AI (Llama 3.3 70B)** powers natural conversations and invokes tool calls for structure-aware workflows.
- **Cloudflare Pages** hosts a lightweight frontend that provides chat, upcoming tasks, and profile management.

The codebase follows the Cloudflare AI assignment guidelines: the project is prefixed with `cf_ai_`, includes full prompts in `PROMPTS.md`, and documents setup here.

## Key Features

- Two AI modes: academic *Study Helper* and productivity *Planner* with shared memory.
- Durable Object SQLite schema for academic tasks, professional tasks, courses, study sessions, chat history, and knowledge base.
- REST endpoints for chat, upcoming summaries, and profile read/write.
- Responsive Pages UI with chat transcript, task list, and profile form.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/) with Workers & Pages access.
- Node.js 18+ and npm.
- `wrangler` CLI (`npm install -g wrangler` or via npm scripts).

## Install Dependencies

```bash
npm install
```

## Local Development

### 1. Start the Worker + Durable Object

```bash
npx wrangler dev
```

The local Worker listens on `http://127.0.0.1:8787`. All API routes (`/api/chat`, `/api/upcoming`, `/api/profile`) are proxied here.

### 2. Preview the Frontend with Pages

In a second terminal:

```bash
npx wrangler pages dev frontend -- proxy 8787
```

`wrangler pages dev` serves the static UI from `frontend/` and proxies API calls (same origin) to the Worker running on port 8787.

Visit the printed Pages preview URL (defaults to `http://127.0.0.1:8788`).

## Deploy

1. **Worker**

	```bash
	npx wrangler deploy
	```

2. **Pages Frontend**

	```bash
	npx wrangler pages publish frontend --project-name <your-pages-project>
	```

	Configure the deployed Pages project to point API requests (e.g., `/api/*`) at the Worker URL, or attach the Worker as a Pages function/route.

## Frontend Overview

The static UI (in `frontend/`) uses vanilla HTML/CSS/JS:

- Chat with mode toggle (`study_helper`, `planner`).
- Auto-generated session IDs stored in `localStorage`.
- Upcoming task list (academic + professional).
- Profile viewer and update form (posts to `/api/profile`).

## API Summary

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/chat?session=<id>` | POST | Conversational entry point; Workers AI toolchain handles tasks, courses, study sessions. |
| `/api/upcoming?session=<id>&days=<n>` | GET | Returns merged academic & professional tasks due soon. |
| `/api/profile?session=<id>` | GET | Fetch current profile/preferences. |
| `/api/profile?session=<id>` | POST | Update profile fields stored in Durable Object state. |

Provide a `session` query parameter to scope memory per user (the frontend manages this automatically).

## Testing Tips

- Use the Pages UI to converse with the agent, log study sessions, and populate tasks.
- Hit the REST endpoints directly with `curl` or REST clients to inspect raw responses.
- Durable Object data persists per session while the worker is running locally; restart to reset.

## Documentation Artifacts

- `README.md` — project overview and run instructions.
- `PROMPTS.md` — compiled AI prompts used during development.
- `frontend/` — static assets for Cloudflare Pages.
- `src/agent.js` — Durable Object logic, SQL schema, and tool implementations.
- `src/index.ts` — Worker entry point exposing REST endpoints and AI orchestration.
