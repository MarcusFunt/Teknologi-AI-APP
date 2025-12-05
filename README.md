# Modern Calendar

A minimalist yet expressive calendar experience built with React and Vite. Navigate between months, jump back to today, and scan upcoming highlights with a clean, glassy interface.

## Getting started

```bash
npm install
cp .env.example .env
```

Provision a PostgreSQL database and set `DATABASE_URL` in `.env` to the connection string. The API
server will create the `calendar_events` table and seed sample data the first time it connects.
Add `JWT_SECRET` to `.env` for signing login tokens (a default is used for local development if
omitted).

Run the API and frontend together with:

```bash
npm run dev    # starts Express on 4000 and Vite on 5173 with /api proxying
```

Then visit the printed local URL (usually `http://localhost:5173`).

## Run with Docker

The repository includes a `docker-compose.yml` that runs the app alongside PostgreSQL.

```bash
docker compose up --build
```

The stack exposes Vite on `http://localhost:5173` and the API on `http://localhost:4000`. The
PostgreSQL service is available on port `5432` with credentials `postgres/postgres` and a database
named `calendar`. Update `docker-compose.yml` if you need different credentials.

## Scripts
- `npm run dev` — start the Vite dev server
- `npm run build` — create a production build in `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint with the included modern defaults

## Notes
- Events are stored in PostgreSQL via the Express API (`/api/events`); the server seeds sample data
  on first run.
- Styling lives in `src/index.css`; typography uses the Inter font.
