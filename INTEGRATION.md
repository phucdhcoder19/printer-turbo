# MoneyPrinterTurbo — Kiến trúc tích hợp

Mở rộng pipeline tạo video (FastAPI) bằng một lớp **marketing hub** (NestJS) và
**UI hiện đại** (React), thay dần Streamlit.

## Sơ đồ tổng thể

```
                      ┌─────────────────────────────┐
   Browser  ───────►  │   React (Vite) :5173         │
                      │   - /video      (Tạo Video)  │
                      │   - /marketing  (Hub)        │
                      └──────────────┬──────────────┘
                                     │ HTTP (axios → VITE_API_URL)
                                     ▼
                      ┌─────────────────────────────┐
                      │   NestJS :3000  (/api/...)   │
                      │   - video/  → PROXY ─────────┼──────┐
                      │   - posts/, calendar/,       │      │
                      │     ai/, analytics/          │      │ http://fastapi:8080
                      └──────────────┬──────────────┘      │
                          │ TypeORM   │ Redis              ▼
                          ▼           ▼          ┌──────────────────────┐
                   ┌───────────┐ ┌─────────┐     │  FastAPI :8080       │
                   │ Postgres  │ │  Redis  │     │  pipeline tạo video  │
                   │ :5432     │ │ :6379   │     │  (file-based storage)│
                   └───────────┘ └─────────┘     └──────────────────────┘
```

**Nguyên tắc:** React **không** gọi thẳng FastAPI. Mọi thứ đi qua NestJS — nơi
gắn auth/JWT, validate, log, và (sau này) lưu lịch sử vào Postgres.

## Cấu trúc thư mục

```
MoneyPrinterTurbo/
├── app/                  # FastAPI pipeline (Python) — giữ nguyên
├── webui/                # Streamlit — deprecate dần
├── backend/              # NestJS (TypeScript)
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── config/configuration.ts
│       └── modules/
│           ├── video/    # PROXY sang FastAPI (đã implement)
│           ├── posts/    # bài đăng (stub)
│           ├── calendar/ # lên lịch (stub)
│           ├── ai/       # tối ưu content (stub)
│           └── analytics/# thống kê (stub)
├── frontend/             # React (Vite + TS + Tailwind)
│   └── src/
│       ├── router.tsx        # cấu hình route
│       ├── layouts/RootLayout.tsx
│       ├── pages/video/      # Tạo Video
│       ├── pages/marketing/  # Hub, Posts, Calendar
│       └── lib/api.ts        # axios client → NestJS
├── Dockerfile.fastapi
└── docker-compose.yml    # postgres + redis + fastapi + nestjs + react
```

## Bản đồ API

| React gọi | NestJS | Chuyển tiếp tới |
|---|---|---|
| `POST /api/video/videos` | VideoController | `POST FastAPI /api/v1/videos` |
| `GET /api/video/tasks/:id` | VideoController | `GET FastAPI /api/v1/tasks/:id` |
| `GET /api/posts` | PostsController | (Postgres — sắp có) |
| `GET /api/calendar` | CalendarController | (Postgres + Redis — sắp có) |
| `POST /api/ai/caption` | AiController | (LLM — sắp có) |
| `GET /api/analytics/summary` | AnalyticsController | (Postgres — sắp có) |

## Chạy bằng Docker (tất cả trong 1 lệnh)

```bash
docker compose up --build
```
- React:    http://localhost:5173
- NestJS:   http://localhost:3000/api
- FastAPI:  http://localhost:8080
- Postgres: localhost:5432  ·  Redis: localhost:6379

> ⚠️ Service `fastapi` cần `app/asgi.py` (Phase 7 của roadmap). Chưa có file đó
> thì 4 service kia vẫn chạy, riêng tạo video sẽ báo lỗi kết nối tới FastAPI.

## Chạy thủ công khi dev (không Docker)

```bash
# 1) Hạ tầng
docker compose up -d postgres redis

# 2) FastAPI (terminal 1)
uv run uvicorn app.asgi:app --port 8080 --reload

# 3) NestJS (terminal 2)
cd backend && cp .env.example .env && npm install && npm run start:dev

# 4) React (terminal 3)
cd frontend && cp .env.example .env && npm install && npm run dev
```

## Việc tiếp theo (gợi ý)

1. Hoàn tất **Phase 7 FastAPI** (`app/asgi.py` + controllers) để proxy hoạt động.
2. Viết **entity + migration** cho `posts`, `post_platforms`, `users`, `analytics`.
3. Thêm **JWT auth** (module `auth/`) + guard phân quyền Admin/Editor/Creator.
4. Cắm **BullMQ + Redis** cho job đăng bài đúng `scheduled_at`.
