# Mable Audience Builder

A focused, deterministic audience preview tool for anonymous customer behavior. The frontend is a Vite/React application, the backend is an Express/TypeScript API, and SQLite stores seeded synthetic events.

## Quick start

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). Stop with `docker compose down`. To reset the database and seed data, run `docker compose down -v && docker compose up --build`.

## Architecture

Browser → Nginx frontend proxy → Express backend → SQLite volume. The browser only calls `/api`; Docker's `backend` hostname stays internal to the network. Audience evaluation is backend-owned and the frontend renders the returned evidence without calculating membership.

## Tests and local development

Run backend tests with `pnpm test`. For local development, run `pnpm install` then `pnpm dev` (frontend on Vite's port and backend on 3000; the Vite proxy can be added for local use). Docker Compose is the canonical complete workflow.

## API

`POST /api/v1/audiences/preview` accepts a name, ISO timestamp `asOf`, and one or more conditions. Supported events are `page_view`, `product_view`, `add_to_cart`, `checkout_started`, and `purchase`; operators are `at_least` and `exactly`. `GET /health` returns `{ "status": "ok" }`.

## Demo data

The backend automatically creates the schema and deterministically seeds five anonymous IDs on first startup. A metadata marker and `INSERT OR IGNORE` make initialization safe across restarts. The chosen time interval is `(windowStart, asOf]`.

See [docs/DESIGN.md](docs/DESIGN.md) for engineering decisions and [AI_USAGE.md](AI_USAGE.md) for transparent AI usage notes.
