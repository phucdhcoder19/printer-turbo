# Tổng quan & Logic dự án

> Tài liệu này giải thích **nghiệp vụ** (dự án làm gì, giải quyết bài toán gì) và
> **logic hoạt động** (dữ liệu chạy qua các tầng ra sao). Đọc xong bạn sẽ hiểu cả
> "làm gì" lẫn "tại sao làm vậy".

## Mục lục
1. [Dự án này là gì?](#1-dự-án-này-là-gì)
2. [Kiến trúc tổng thể](#2-kiến-trúc-tổng-thể)
3. [Nửa A — MoneyPrinterTurbo (tạo video)](#3-nửa-a--moneyprinterturbo-tạo-video-tự-động)
4. [Nửa B — Marketing Hub](#4-nửa-b--marketing-hub)
5. [Mô hình dữ liệu & các quan hệ then chốt](#5-mô-hình-dữ-liệu--các-quan-hệ-then-chốt)
6. [Logic nghiệp vụ quan trọng](#6-logic-nghiệp-vụ-quan-trọng)
7. [Luồng end-to-end (3 tầng nối nhau)](#7-luồng-end-to-end-3-tầng-nối-nhau)
8. [Frontend — cách tổ chức](#8-frontend--cách-tổ-chức)
9. [Trạng thái hiện tại](#9-trạng-thái-hiện-tại)
10. [Thuật ngữ](#10-thuật-ngữ-glossary)
11. [Cách chạy toàn bộ](#11-cách-chạy-toàn-bộ-dev)

---

## 1. Dự án này là gì?

Repo này thực ra chứa **2 sản phẩm** dùng chung, phục vụ người làm **marketing nội dung**:

| Nửa | Tên | Bài toán giải quyết |
|-----|-----|---------------------|
| **A** | MoneyPrinterTurbo | Nhập 1 **chủ đề** → tự sinh **video ngắn** (TikTok/Reels/Shorts) hoàn chỉnh: kịch bản + giọng đọc + phụ đề + video minh hoạ + nhạc nền. |
| **B** | Marketing Hub | **Quản lý content đa nền tảng**: soạn bài, lên lịch, kết nối tài khoản (Facebook/TikTok/Instagram/YouTube...), đăng bài, thống kê hiệu quả, làm việc nhóm có phân quyền. |

**Vì sao gộp 2 nửa?** Video do nửa A tạo ra chính là **nguyên liệu** cho bài đăng ở nửa B. Một người sáng tạo nội dung: tạo video → đính vào bài → lên lịch đăng đa nền tảng → theo dõi số liệu. Cả quy trình nằm trong 1 hệ thống.

```
   Ý tưởng ("Cà phê Việt Nam")
        │  (nửa A)
        ▼
   Video ngắn .mp4
        │  (đính vào bài đăng — nửa B)
        ▼
   Bài đăng đa nền tảng  ──lên lịch──►  Đăng tự động  ──►  Thống kê tương tác
```

---

## 2. Kiến trúc tổng thể

Hệ thống gồm **3 service + 2 hạ tầng**, mỗi cái một việc:

```
                         ┌───────────────────────────┐
   Trình duyệt   ───────►│  React (Vite) :5173        │  Giao diện người dùng
                         │  Design system + pages     │
                         └─────────────┬──────────────┘
                                       │ axios (HTTP/JSON)
                                       ▼
                         ┌───────────────────────────┐
                         │  NestJS :3000  (/api/...)  │  "Bộ não" marketing
                         │  - marketing (posts...)    │
                         │  - channels (social acc.)  │
                         │  - proxy video ───────────┼────────┐
                         └──────┬─────────┬──────────┘        │ http://fastapi:8080
                       TypeORM  │         │ Redis(queue)      ▼
                                ▼         ▼          ┌──────────────────────┐
                        ┌────────────┐ ┌────────┐    │  FastAPI :8080       │  Pipeline tạo video
                        │ PostgreSQL │ │ Redis  │    │  (Python, file-based)│
                        │  :5432     │ │ :6379  │    └──────────────────────┘
                        └────────────┘ └────────┘
```

### Vai trò từng tầng

| Tầng | Công nghệ | Lo việc gì |
|------|-----------|------------|
| **Frontend** | React + Vite + TypeScript + TailwindCSS | Hiển thị, tương tác. Gọi NestJS, **không** gọi thẳng FastAPI/DB. |
| **Backend marketing** | NestJS (TypeScript) + TypeORM | Logic marketing, lưu Postgres, gắn auth/validate, **proxy** sang FastAPI khi cần video. |
| **Pipeline video** | FastAPI (Python) | Sinh video. Lưu file ở `storage/tasks/<id>/`, **không** dùng Postgres. |
| **PostgreSQL** | DB quan hệ | Dữ liệu marketing (bài đăng, kênh, team...). |
| **Redis** | In-memory store | Hàng đợi job (đăng bài đúng giờ) — *kế hoạch*. |

**Nguyên tắc vàng:** Frontend chỉ biết NestJS. NestJS là **một cửa duy nhất** — nơi gắn xác thực, log, kiểm soát truy cập trước khi đụng tới DB hay FastAPI.

---

## 3. Nửa A — MoneyPrinterTurbo (tạo video tự động)

### 3.1 Nghiệp vụ
Biến **1 chủ đề** thành **1 video** mà không cần con người quay/dựng. Máy đi qua một **dây chuyền 6 trạm** (gọi là *pipeline*), đầu ra của trạm này là đầu vào của trạm sau.

### 3.2 Dây chuyền 6 trạm

| # | Trạm | File | Vào → Ra |
|---|------|------|----------|
| 1 | **LLM viết kịch bản** | `app/services/llm.py` | topic → danh sách câu thoại (JSON) |
| 2 | **LLM nghĩ từ khoá** | `app/services/llm.py` | kịch bản → từ khoá tiếng Anh tìm video |
| 3 | **Giọng đọc (TTS)** | `app/services/voice.py` | text → `audio.mp3` + **timestamp từng chữ** |
| 4 | **Phụ đề** | `app/services/subtitle.py` | timestamps → `subtitle.srt` |
| 5 | **Tải video minh hoạ** | `app/services/material.py` | từ khoá → tải clip từ Pexels |
| 6 | **Ghép video** | `app/services/video.py` | clip + audio + phụ đề + nhạc → `final.mp4` |

Điều phối cả 6 trạm là **"quản đốc"** `app/services/task.py` (hàm `start()`), ghi tiến độ % vào `app/services/state.py` sau mỗi bước.

```
start(task_id, params)
  10% → llm.generate_script()      → params.script
  20% → llm.generate_terms()       → params.terms
  30% → voice.generate_audio()     → audio.mp3 + timestamps
  45% → subtitle.generate_…()       → subtitle.srt
  55% → material.download_materials() → clip .mp4
  70-90% → video.preprocess → combine → generate → final.mp4 ✅
  (lỗi bất kỳ bước nào → except → ghi FAILED + traceback)
```

### 3.3 Logic then chốt: "async task pattern"
Render video mất **2–10 phút**. Nếu HTTP đợi tới khi xong sẽ **timeout**. Nên API dùng mẫu chuẩn:

```
POST /api/v1/videos {topic}
   → tạo task_id, đẩy việc vào thread nền (ThreadPoolExecutor)
   → TRẢ task_id NGAY (không đợi)            ← phản hồi tức thì

GET /api/v1/tasks/{id}                        ← client hỏi mỗi 2-3s
   → đọc tiến độ {progress, message, state}   "xong chưa?"
```

File liên quan: `app/controllers/v1/video.py` (router), `app/controllers/manager/task_manager.py` (thread pool), `app/asgi.py` (lắp ráp app), `main.py` (chạy uvicorn :8080).

### 3.4 Vì sao FastAPI dùng file thay vì DB?
Output là **file nhị phân** (mp4, mp3, srt). Lưu file vào `storage/tasks/<task_id>/` đơn giản, dễ phục vụ qua HTTP (`/tasks/<id>/final.mp4`). Marketing data (có quan hệ phức tạp) thì để Postgres bên NestJS lo.

---

## 4. Nửa B — Marketing Hub

### 4.1 Nghiệp vụ
Một team 2–5 người quản lý nội dung đăng lên nhiều nền tảng. Các tính năng:

| Tính năng | Mô tả nghiệp vụ |
|-----------|-----------------|
| **Content** | Soạn 1 bài, đăng lên **nhiều nền tảng cùng lúc**, mỗi nền tảng có caption + hashtag riêng. |
| **Calendar** | Lên lịch đăng theo tuần/tháng; gom bài vào **content_plans** (chiến dịch). |
| **Channels** | Kết nối tài khoản nền tảng (OAuth) để đăng tự động. |
| **Analytics** | Thống kê likes/comments/shares/views theo từng nền tảng + theo thời gian. |
| **AI** | Gợi ý caption, hashtag, giờ đăng tối ưu. |
| **Team & phân quyền** | 3 vai trò: **admin** (toàn quyền), **editor** (duyệt + sửa), **creator** (tạo bài). |

### 4.2 Module trong NestJS
`backend/src/modules/`:
- `video/` — **proxy** sang FastAPI (đã làm).
- `social-accounts/` — **channels** (đã làm: list/connect/disconnect).
- `posts/` — bài đăng (CRUD + logic rollup status — đã làm; UI chưa nối).
- `platform-configs/` — cấu hình nền tảng (entity + seed).
- `calendar/`, `ai/`, `analytics/` — stub (chưa làm logic).

---

## 5. Mô hình dữ liệu & các quan hệ then chốt

Toàn bộ ở PostgreSQL (qua TypeORM). Chi tiết bảng: `backend/DATABASE.md`.

```
teams ──1:N── users
  │
  ├──1:N── content_plans ──1:N── posts
  │                                 │ 1:N
  │                                 ▼
  ├──1:N── posts ──1:N── post_targets ──1:N── post_analytics
  │                          │ (mỗi nền tảng 1 dòng)
  │                          └── M:N (qua post_media) ── media
  │
  ├──1:N── social_accounts ──1:N── connection_logs
  │            ▲ (platform_config_id)
  │            └──── platform_configs (cấu hình OAuth mỗi nền tảng)
  │
  └──1:N── oauth_states (tạm thời, dùng khi đang OAuth)
```

### 5.1 Quan hệ quan trọng nhất: `posts` ↔ `post_targets`
**Yêu cầu mâu thuẫn:** "1 bài có 1 trạng thái/caption" *nhưng* "1 bài đăng nhiều nền tảng, mỗi nền tảng caption riêng".

**Giải pháp chuẩn hoá:**
- `posts` = phần **chung** (title, người tạo, trạng thái tổng).
- `post_targets` = phần **riêng mỗi nền tảng** (caption, hashtags, status, scheduled_at, id bài live, retry...).

→ Đăng FB + TikTok = **1 posts + 2 post_targets**. FB có thể `published` còn TikTok `failed` độc lập.

### 5.2 Channels: 4 bảng phối hợp (kiểu Buffer)
- `platform_configs` — danh sách nền tảng hỗ trợ + cấu hình OAuth (client id/secret, scopes, URL). Admin bật/tắt bằng `is_enabled`.
- `social_accounts` — tài khoản **đã kết nối** (token, `connection_status`, profile...).
- `oauth_states` — lưu `state_token` ngẫu nhiên khi redirect sang nền tảng → **chống CSRF**, hết hạn 5 phút.
- `connection_logs` — **audit trail**: ai kết nối/ngắt/refresh token lúc nào.

### 5.3 Analytics: time-series + cache
- `post_analytics` = mỗi lần kéo số liệu → 1 dòng (vẽ biểu đồ tăng trưởng). Index `(post_target_id, fetched_at DESC)` để lấy "mới nhất" nhanh.
- `post_targets.current_*` = **cache** số mới nhất → list/calendar đọc nhanh, khỏi quét bảng lịch sử.

---

## 6. Logic nghiệp vụ quan trọng

### 6.1 Tính `posts.status` (rollup từ các nền tảng)
`posts.status` là **dữ liệu dẫn xuất** — KHÔNG để client tự set, tính bằng `PostsService.computePostStatus()` mỗi khi 1 target đổi trạng thái:

```
Tất cả targets = published   → published
Tất cả targets = failed      → failed
Có cả published + failed     → partially_failed
Có ít nhất 1 scheduled       → scheduled
Còn lại                      → draft
```
*Vì sao tính ở service?* Tránh client báo "published" trong khi Facebook thật ra `failed`. Logic nằm trong code → dễ test, version cùng app.

### 6.2 Retry đăng bài
Mỗi `post_targets` có `retry_count` / `max_retries` / `last_error_at`. Job đăng bài (Redis/Bull — *kế hoạch*):
```
nếu retry_count < max_retries → thử lại (retry_count++, ghi last_error_at)
ngược lại                     → set status = failed
```

### 6.3 Trạng thái kết nối kênh
`social_accounts.connection_status`: `connected` / `expired` (token hết hạn) / `revoked` (user gỡ quyền) / `pending` (đang OAuth). UI:
- chấm **xanh** = connected, **vàng** = expired/pending.
- "x/N connected" = `COUNT(connected) / COUNT(platform_configs is_enabled)`.

### 6.4 Phân quyền (sẽ enforce ở NestJS guard)
- **admin**: toàn quyền (quản lý team, xoá, đăng).
- **editor**: duyệt + sửa bài.
- **creator**: tạo bài (chờ duyệt).

> Quyền enforce ở **tầng app** (guard), không ở DB. DB chỉ lưu `users.role`.

---

## 7. Luồng end-to-end (3 tầng nối nhau)

### Ví dụ 1 — Tạo video (React → NestJS proxy → FastAPI)
```
React CreateVideoPage
  → videoApi.create({topic})                         (lib/api.ts)
    → POST NestJS /api/video/videos
      → VideoService.forward()                       (proxy)
        → POST FastAPI /api/v1/videos
          → task_manager.submit() → chạy pipeline nền
        ← {task_id}
  → React poll videoApi.getTask(id) mỗi 2s → cập nhật thanh %
```

### Ví dụ 2 — Kết nối kênh (React → NestJS → Postgres) **[đã chạy thật]**
```
1. React: bấm "Kết nối kênh" → modal → chọn Facebook
2. useChannels.connect('facebook')                   (lib/useChannels.tsx)
     → POST /api/social-accounts/connect/facebook {teamId}
3. NestJS SocialAccountsController
     → ParseEnumPipe kiểm platform hợp lệ
     → SocialAccountsService.connect()
         • tìm platform_configs theo platform
         • tạo social_accounts (connection_status=connected, platform_config_id)
         • ghi connection_logs (action=connected)
     ← trả account
4. React: useChannels tự refetch list + status
     → sidebar hiện Facebook + chấm xanh, đếm "1/6"
5. Reload trang → vẫn còn (vì là Postgres, không phải localStorage)
```

> Đây là **"lát cắt dọc"** (vertical slice): 1 tính năng chạy xuyên DB → API → UI.
> Cách build tốt: hoàn thiện từng lát cắt thay vì làm rời rạc mỗi tầng.

---

## 8. Frontend — cách tổ chức

`frontend/src/`:
- `index.css` + `tailwind.config.ts` — **design tokens**: màu (CSS variables, dark mode), font Inter, thang size (`text-title/section/...`), radius, shadow.
- `components/ui/` — **base components** dùng chung: Button, Input, Select, Badge, StatusBadge, Card, Modal, Toast, Table, Avatar, EmptyState... (import từ `components/ui`).
- `components/layout/` — **Layout Shell**: Sidebar (collapsible + mục "Kênh"), Topbar (search/theme/notif), AppLayout, PageHeader.
- `pages/` — Login, Dashboard, Calendar, Content, Analytics, Settings, video.
- `lib/` — `cn.ts` (gộp class), `api.ts` (axios → NestJS), `useChannels.tsx` (context channels), `useTheme.ts`, `session.ts` (teamId tạm).
- `constants/` — `platforms.ts` (6 nền tảng + màu), `statuses.ts` (cấu hình badge trạng thái).
- `router.tsx` — định tuyến (React Router). `main.tsx` — bọc `ToastProvider` + `ChannelsProvider`.

**State channels** dùng React Context (`ChannelsProvider`) — fetch API khi mount, refetch sau mỗi connect/disconnect → UI luôn khớp DB.

---

## 9. Trạng thái hiện tại

| Hạng mục | Trạng thái |
|----------|-----------|
| FastAPI pipeline (Phase 0–7) | ✅ Có code, chạy được |
| NestJS proxy video | ✅ Có (cần FastAPI chạy để test e2e) |
| Schema marketing + migration | ✅ Đã chạy (posts, targets, content_plans, analytics, ai...) |
| Schema channels + migration | ✅ Đã chạy (platform_configs, oauth_states, connection_logs + mở rộng social_accounts) |
| **Channels slice (DB→API→UI)** | ✅ **Chạy thật end-to-end** (connect/disconnect mock OAuth) |
| Posts CRUD (backend) | ✅ Có (`computePostStatus`); ⚠️ UI Content chưa nối |
| Frontend design system + layout | ✅ Xong nền tảng + Login + Dashboard demo |
| Calendar / Post Editor / Analytics UI | ⬜ Placeholder |
| JWT Auth + phân quyền guard | ⬜ Chưa làm (teamId đang hardcode tạm) |
| OAuth thật 2 bước (oauth_states) | ⬜ Chưa (đang mock; cần Auth để có userId) |
| Redis/Bull job đăng bài đúng giờ | ⬜ Kế hoạch |

---

## 10. Thuật ngữ (glossary)

| Thuật ngữ | Nghĩa trong dự án |
|-----------|-------------------|
| **Pipeline** | Dây chuyền 6 trạm tạo video (nửa A). |
| **Task** | 1 lần chạy pipeline, có `task_id` + tiến độ %. |
| **post** | Bài đăng (phần chung). |
| **post_target** | 1 bài trên 1 nền tảng (caption/hashtag/status riêng). |
| **content_plan** | Chiến dịch gom nhiều bài theo khoảng thời gian. |
| **channel / social_account** | Tài khoản nền tảng đã kết nối để đăng bài. |
| **platform_config** | Cấu hình OAuth của 1 nền tảng (admin bật/tắt). |
| **oauth_state** | Token tạm chống CSRF khi đang OAuth. |
| **rollup** | Tính trạng thái tổng của bài từ các nền tảng con. |
| **vertical slice** | 1 tính năng làm xuyên suốt DB → API → UI. |
| **proxy** | NestJS chuyển tiếp request sang FastAPI. |

---

## 11. Cách chạy toàn bộ (dev)

```powershell
# 1) Hạ tầng
docker compose up -d postgres redis

# 2) Backend marketing (NestJS) — terminal 1
cd backend
npm install
npm run migration:run          # tạo bảng (chạy 1 lần / khi có migration mới)
npm run start:dev              # :3000

# 3) Frontend (React) — terminal 2
cd frontend
npm install
npm run dev                   # :5173

# 4) (tùy chọn) Pipeline video (FastAPI) — terminal 3
uv run uvicorn app.asgi:app --port 8080 --reload
```

Mở http://localhost:5173. Tài liệu liên quan:
- `backend/DATABASE.md` — chi tiết từng bảng + logic.
- `INTEGRATION.md` — kiến trúc tích hợp + Docker.
- `roadmap-chi-tiet-moneyprinterturbo.md` — hướng dẫn build nửa A từng phase.
