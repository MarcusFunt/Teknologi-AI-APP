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

Then visit the printed local URL (usually `http://localhost:5173`).

## Run with Docker

The repository includes a `docker-compose.yml` that runs the app by itself with persistent JSON
storage on the container filesystem.

```bash
docker compose up --build
```

The stack exposes Vite on `http://localhost:5173` and the API on `http://localhost:4000`.

### AI copilot & Ollama

LangChain.js powers an on-demand AI editor that can rewrite events and apply the changes via a
structured JSON schema. The service expects a local Ollama host with the
`meta-llama/Llama-3.2-1B-Instruct:novita` model available.

Using Docker Compose, the included `ollama` service is already wired to the app:

```bash
docker compose up --build -d
docker compose exec ollama ollama pull meta-llama/Llama-3.2-1B-Instruct:novita
```

When running outside Docker, set `OLLAMA_BASE_URL` to your host (default: `http://localhost:11434`).
The Express API calls itself (`API_BASE_URL`) to fetch and patch events when the AI endpoint runs.

### API helpers

- `POST /api/ai/edit` — generates structured calendar edits via LangChain + Ollama, then applies
  them.
- `PATCH /api/events/bulk` — apply a batch of create/update/delete operations for the authenticated
  user.

## Scripts
- `npm run dev` — start the Vite dev server
- `npm run build` — create a production build in `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint with the included modern defaults

## Notes
- Events are stored as JSON via the Express API (`/api/events`); the server seeds sample data on
  first run.
- Styling lives in `src/index.css`; typography uses the Inter font.
