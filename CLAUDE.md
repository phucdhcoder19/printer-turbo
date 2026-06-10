# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Codebase comments and UI strings are in **Vietnamese**. Match that when editing existing
> files (the user prefers explanations in Vietnamese — see auto-memory).

## What this repo is

One repo, **three services + two infra dependencies**, serving content marketers. It bundles two
products that share a database and UI:

- **MoneyPrinterTurbo** (`app/`, FastAPI/Python) — input a topic → auto-generate a short video
  (script → TTS → subtitles → stock clips → final `.mp4`). File-based, no DB.
- **Marketing Hub** (`backend/` NestJS + `frontend/` React) — multi-platform post management,
  scheduling, channel connection (OAuth), analytics, team/roles. Backed by PostgreSQL.

The connective tissue: a video produced by the pipeline becomes a `media` row
(`source = 'mpt_generated'`, `mpt_task_id` links back to the FastAPI task) that gets attached to a
marketing post.

Read `docs/TONG-QUAN-VA-LOGIC.md` first for the full business + data-flow picture, then
`backend/DATABASE.md` for the schema. Note these docs are slightly stale on auth status (JWT auth
**is** implemented now — see below).

## Architecture rules (the important invariants)

- **Frontend only ever calls NestJS.** It never calls FastAPI or Postgres directly. NestJS is the
  single gateway where auth/JWT, validation, logging, and (for video) proxying happen.
- **NestJS proxies video to FastAPI.** `VideoModule` (`backend/src/modules/video/video.service.ts`)
  forwards `POST /api/video/videos` → FastAPI `POST /api/v1/videos`, mapping FastAPI errors back to
  NestJS HTTP exceptions. All other backend modules hit Postgres via TypeORM.
- **Async task pattern for video.** Rendering takes 2–10 min, so the API never blocks: it returns a
  `task_id` immediately and the client polls `GET /api/video/tasks/:id`. The pipeline runs on a
  background thread pool (`app/controllers/manager/task_manager.py`); progress % is written to
  in-memory `app/services/state.py`.
- **`posts` ↔ `post_targets` normalization.** One post, N platform targets — each target has its own
  caption/hashtags/status/schedule. Posting to FB + TikTok = 1 `posts` row + 2 `post_targets` rows
  that succeed/fail independently.
- **`posts.status` is derived, never client-set.** It's a rollup computed by
  `PostsService.computePostStatus()` (`backend/src/modules/posts/posts.service.ts`) every time a
  target's status changes. Don't let a client set it directly.
- **Auth flows via JWT + `@CurrentUser()`.** Controllers use `@UseGuards(JwtAuthGuard)` and read
  `{ userId, teamId, role }` off the request via the `@CurrentUser()` decorator — `teamId` comes
  from the token, it is **not** a hardcoded/query param (despite what older docs imply). Register
  creates a team and makes the user its `admin`.

## Pipeline structure (FastAPI half)

`app/services/task.py::start()` orchestrates 6 stages, writing progress after each:
`llm.generate_script` → `llm.generate_terms` → `voice.generate_audio` (Edge TTS, word timestamps)
→ `subtitle.generate_subtitle_from_timestamps` → `material.download_materials` (Pexels)
→ `video.preprocess/combine/generate` → `final.mp4`. A `stop_at` param lets the same pipeline stop
early (`script`/`terms`/`audio`/`subtitle`/`materials`/`video`), which is how the `/audio` and
`/subtitle` endpoints reuse it. Output lands in `storage/tasks/<task_id>/`, served statically at
`/tasks/<id>/...`.

LLM defaults to **Ollama `qwen3:4b`** at `http://localhost:11434/v1`; voice is **Edge TTS**;
clips come from **Pexels**. Config is `config.toml` (auto-copied from `config.example.toml` on first
run); env vars like `MPT_APP_API_KEY` override it.

## Commands

### Dev workflow (preferred — see auto-memory)

Run the app processes **locally**, with only Postgres + Redis in Docker. Do **not**
`docker compose up` the whole stack while actively developing.

```powershell
docker compose up -d postgres redis     # infra only

# terminal 1 — NestJS :3000  (/api prefix)
cd backend; npm install; npm run migration:run; npm run start:dev

# terminal 2 — React :5173
cd frontend; npm install; npm run dev

# terminal 3 — FastAPI :8080 (optional; only needed for video features)
uv run uvicorn app.asgi:app --port 8080 --reload   # or: uv run python main.py
```

`docker compose up --build` runs everything containerized (prod-style) — use for full-stack smoke
tests, not day-to-day coding.

### Backend (NestJS)

| Task | Command |
|---|---|
| Dev server (watch) | `npm run start:dev` |
| Build | `npm run build` |
| Lint (auto-fix) | `npm run lint` |
| Run migrations | `npm run migration:run` |
| Generate a migration | `npm run migration:generate -- src/database/migrations/<Name>` |
| Revert last migration | `npm run migration:revert` |

### Frontend (React + Vite)

`npm run dev` (Vite :5173) · `npm run build` (`tsc -b && vite build`) · `npm run preview`.

### FastAPI (Python, managed with `uv`)

No test framework is configured. The `test_*_manual.py` scripts at repo root are **manual
smoke scripts** run directly, e.g. `uv run python test_pipeline_manual.py`. They hit real services
(Ollama, Edge TTS, Pexels), so they take minutes and need those configured.

> There are **no automated unit tests** for backend or frontend (no jest/vitest configured).

## Database & migrations (gotchas)

- **`synchronize: false` everywhere.** Schema changes go through TypeORM migrations only — the app
  never auto-syncs. After pulling new migrations, run `npm run migration:run`.
- The TypeORM CLI uses `backend/src/database/data-source.ts` (loads `.env` itself); the runtime uses
  `app.module.ts`. Both glob-load `**/*.entity.{ts,js}` and `database/migrations/*`.
- **`migrationsTransactionMode: "each"`** is deliberate: Postgres forbids using a newly-added enum
  value in the same transaction that added it, so each migration commits separately. Keep this in
  mind when a migration adds an enum value *and* uses it — split across two migration files (see the
  existing `AddPlatformEnumValues` migration).
- Shared enums live in `backend/src/common/enums.ts` (Platform, PostStatus, TargetStatus,
  ConnectionStatus, UserRole, MediaSource, etc.) — reuse these rather than redefining string unions.

## Layout

```
app/                      FastAPI pipeline (controllers/v1, services/, models/, asgi.py, config/)
backend/src/modules/      NestJS feature modules — each: <name>.controller/service/module + entities/ + dto/
  video/                  proxy → FastAPI
  posts/ social-accounts/ media/ auth/   implemented
  calendar/ ai/ analytics/ platform-configs/ content-plans/   stubs / entities only
frontend/src/
  lib/api.ts              single axios client (token interceptor, 401 → /login) — all API calls go here
  components/ui/          shared base components (import from components/ui)
  components/layout/      Sidebar/Topbar/AppLayout shell
  pages/  router.tsx      routes; protected by <RequireAuth>
storage/tasks/<id>/       FastAPI video outputs (served at /tasks/<id>/...)
```

New frontend API methods belong in `frontend/src/lib/api.ts` (grouped `authApi`, `videoApi`,
`postsApi`, `socialAccountsApi`, `mediaApi`). Media upload goes NestJS → **Cloudinary** (multipart;
don't set `Content-Type` manually — axios adds the boundary). The post editor uses **TipTap**.
