# Modern Calendar

A minimalist yet expressive calendar experience built with React and Vite. Navigate between months, jump back to today, and scan upcoming highlights with a clean, glassy interface.

## Getting started

```bash
npm install
cp .env.example .env
```

The backend stores users and events as JSON files on disk. Add `JWT_SECRET` to `.env` for signing
login tokens (a default is used for local development if omitted).

Run the API and frontend together with:

```bash
npm run dev    # starts Express on 4000 and Vite on 5173 with /api proxying
```

For UI-only development, enable the **WFE** (web front end) mode to skip starting the API and use
built-in fixture data:

```bash
VITE_WFE_MODE=1 npm run dev:wfe   # runs Vite with mock auth and events
```

Then visit the printed local URL (usually `http://localhost:5173`).

### GitHub Pages / static WFE build

You can deploy the read-only WFE bundle to GitHub Pages to quickly review UI changes without the
API:

1) Set a base path so Vite emits assets that work at the Pages URL (replace `teknologi-ai-app` with
   your repo name):

```bash
VITE_BASE_PATH=/teknologi-ai-app/ VITE_WFE_MODE=1 npm run build:wfe
```

2) Publish the `dist/` folder to your `gh-pages` branch or through Actions.

Notes:

- WFE mode ships fixture auth/events and disables AI editing and persistence. It is intended for UI
  previews only.
- The normal local stack (`npm run dev`) still proxies to the API; unset `VITE_WFE_MODE` and
  `VITE_BASE_PATH` when switching back.

## Run with Docker

The repository includes a `docker-compose.yml` that runs the app by itself with persistent JSON
storage on the container filesystem.

```bash
docker compose up --build
```

The stack exposes Vite on `http://localhost:5173` and the API on `http://localhost:4000`.

### AI copilot & Ollama

LangChain.js powers an on-demand AI editor that can rewrite events and apply the changes via a
structured JSON schema. The service expects a local Ollama host with the `gemma3:1b` model
available.

Using Docker Compose, a one-command setup starts the app, boots Ollama, and automatically pulls the
required model into the shared volume:

```bash
docker compose up --build
```

The `ollama-init` helper service waits for the Ollama daemon to become healthy and then downloads
`gemma3:1b` so the app can call it immediately. When running outside Docker, set `OLLAMA_BASE_URL`
to your host (default: `http://localhost:11434`). The Express API calls itself (`API_BASE_URL`) to
fetch and patch events when the AI endpoint runs.

### API helpers

- `POST /api/ai/edit` — generates structured calendar edits via LangChain + Ollama, then applies
  them.
- `PATCH /api/events/bulk` — apply a batch of create/update/delete operations for the authenticated
  user.

## Scripts
- `npm run dev` — start the Vite dev server
- `npm run dev:wfe` — start Vite with fixture auth/events for UI-only work
- `npm run build:wfe` — build the static WFE bundle (useful for GitHub Pages)
- `npm run build` — create a production build in `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint with the included modern defaults

## Notes
- Events are stored as JSON via the Express API (`/api/events`); the server seeds sample data on
  first run.
- Styling lives in `src/index.css`; typography uses the Inter font.
