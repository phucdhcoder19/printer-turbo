# Database Schema — Marketing Hub

PostgreSQL + TypeORM. Thiết kế cho team nhỏ (2–5 người) quản lý content đa nền tảng.

## Sơ đồ quan hệ (ERD)

```
                ┌──────────┐
                │  teams   │
                └────┬─────┘
       ┌─────────────┼───────────────┬──────────────┐
       │             │               │              │
   ┌───▼───┐   ┌─────▼──────┐   ┌────▼────┐   ┌─────▼──────────┐
   │ users │   │social_accts│   │  media  │   │     posts      │
   └───┬───┘   └─────┬──────┘   └────┬────┘   └───┬────────┬───┘
       │ created_by  │               │            │        │
       │             │          post_media ───────┘        │ 1
       │             │          (M–N join)                  │
       │             │                                      ▼ *
       │             │  social_account_id            ┌──────────────┐
       │             └──────────────────────────────►│ post_targets │
       │  created_by                                  └──────┬───────┘
       └─────────────► ai_suggestions                        │ 1
                                                             ▼ *
                                                     ┌────────────────┐
                                                     │ post_analytics │
                                                     └────────────────┘
```

## Ý tưởng thiết kế then chốt

**Yêu cầu mô tả "1 bài đăng có platform, caption, status, scheduled_at...".**
Nhưng cũng nói **"1 bài đăng lên NHIỀU nền tảng, mỗi nền tảng caption + hashtag
riêng"**. Hai điều này mâu thuẫn nếu nhét hết vào 1 bảng.

→ Giải pháp chuẩn hoá: **tách `posts` (phần chung) và `post_targets` (phần riêng
mỗi nền tảng)**.

```
posts            → title, nội dung gốc, người tạo, trạng thái tổng
   │ 1
   ▼ *
post_targets     → 1 dòng / nền tảng: caption riêng, hashtag riêng,
                   status riêng, scheduled_at riêng, published_at riêng,
                   id bài trên nền tảng (external_post_id), lỗi nếu có
```

Đăng 1 bài lên Facebook + TikTok = 1 `posts` + 2 `post_targets`. Mỗi target
độc lập: TikTok có thể "published" còn Facebook "failed".

## Chi tiết các bảng

### teams — không gian làm việc (workspace)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| name | varchar | tên team |
| created_at / updated_at | timestamptz | |

### content_plans — kế hoạch content (chiến dịch)
Gom nhiều bài đăng theo một khoảng thời gian → phục vụ calendar tuần/tháng.
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| team_id | uuid FK→teams | |
| name | varchar | tên kế hoạch |
| description | text null | |
| start_date / end_date | date null | khoảng thời gian |
| status | enum | draft / active / archived |
| created_by | uuid FK→users null | |
| created_at / updated_at | timestamptz | |

`posts.content_plan_id` (nullable) trỏ về đây — bài lẻ thì để null.

### users — thành viên + phân quyền
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| team_id | uuid FK→teams | thuộc team nào |
| email | varchar UNIQUE | đăng nhập |
| password_hash | varchar | bcrypt |
| name | varchar | |
| role | enum | **admin** / **editor** / **creator** |
| avatar_url | varchar null | |
| is_active | bool | khoá tài khoản |
| created_at / updated_at | timestamptz | |

Phân quyền (enforce ở tầng NestJS guard, không ở DB):
- **admin** — toàn quyền (quản lý team, xoá, đăng).
- **editor** — duyệt + sửa bài.
- **creator** — tạo bài (chờ duyệt).

### social_accounts — tài khoản nền tảng đã kết nối (để auto-post)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| team_id | uuid FK→teams | |
| platform | enum | facebook/tiktok/instagram/youtube |
| account_name | varchar | tên hiển thị |
| account_external_id | varchar null | id tài khoản trên nền tảng |
| access_token | text null | **token đăng bài (nên mã hoá)** |
| refresh_token | text null | |
| token_expires_at | timestamptz null | |
| is_active | bool | |
| created_at / updated_at | timestamptz | |

### media — tài nguyên ảnh/video
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| team_id | uuid FK→teams | |
| uploaded_by | uuid FK→users null | |
| type | enum | image / video |
| source | enum | upload / **mpt_generated** |
| mpt_task_id | varchar null | **liên kết tới task FastAPI tạo video** |
| url, thumbnail_url | varchar | |
| file_name | varchar null | |
| file_size | bigint null | byte |
| width, height | int null | |
| duration | float null | giây (video) |
| created_at | timestamptz | |

> 🔗 **Điểm tích hợp:** video do pipeline FastAPI tạo ra được lưu thành 1 `media`
> với `source='mpt_generated'` + `mpt_task_id` → gắn vào bài đăng marketing.

### posts — bài đăng (phần chung)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| team_id | uuid FK→teams | |
| created_by | uuid FK→users null | |
| title | varchar | tiêu đề nội bộ |
| base_caption | text null | caption gốc (template) |
| status | enum | draft/scheduled/published/partially_failed/failed (tổng hợp) |
| created_at / updated_at | timestamptz | |

### post_targets — 1 dòng / nền tảng (phần riêng)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| post_id | uuid FK→posts (CASCADE) | |
| platform | enum | |
| social_account_id | uuid FK→social_accounts null | đăng bằng tài khoản nào |
| caption | text null | **caption riêng nền tảng này** |
| hashtags | text[] | **hashtag riêng** |
| status | enum | draft/scheduled/publishing/published/failed |
| scheduled_at | timestamptz null | giờ hẹn đăng |
| published_at | timestamptz null | giờ đăng thực tế |
| external_post_id | varchar null | id bài do nền tảng trả về |
| external_url | varchar null | link bài live |
| error_message | text null | lý do nếu failed |
| retry_count | int (0) | đã thử đăng mấy lần |
| max_retries | int (3) | tối đa mấy lần |
| last_error_at | timestamptz null | lần lỗi gần nhất |
| current_likes/comments/shares/views/reach | int (0) | **số liệu mới nhất (cache)** |
| metrics_synced_at | timestamptz null | lần đồng bộ số liệu gần nhất |
| created_at / updated_at | timestamptz | |
| **UNIQUE (post_id, platform)** | | mỗi nền tảng 1 target/bài |

### post_media — nối posts ↔ media (M–N có thứ tự)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| post_id | uuid FK→posts (CASCADE) | |
| media_id | uuid FK→media (CASCADE) | |
| position | int | thứ tự hiển thị |
| **UNIQUE (post_id, media_id)** | | |

### post_analytics — số liệu theo thời gian (snapshot)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| post_target_id | uuid FK→post_targets (CASCADE) | |
| likes, comments, shares, views, reach | int | |
| fetched_at | timestamptz | thời điểm lấy số liệu |
| **INDEX (post_target_id, fetched_at DESC)** | | lấy "số liệu mới nhất" + vẽ biểu đồ |

> Mỗi lần kéo số liệu từ nền tảng → thêm 1 dòng. Muốn "số liệu mới nhất" thì
> lấy dòng `fetched_at` lớn nhất. Lưu nhiều dòng để vẽ biểu đồ tăng trưởng.

### ai_suggestions — lịch sử AI tối ưu content
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| post_id | uuid FK→posts null | gắn bài nào (có thể chung) |
| type | enum | caption / hashtags / best_time |
| platform | enum null | |
| input_prompt | text null | |
| output | jsonb null | kết quả AI |
| model | varchar null | model đã dùng |
| created_by | uuid FK→users null | |
| created_at | timestamptz | |

## Tóm tắt quan hệ

| Quan hệ | Kiểu |
|---|---|
| teams → users / social_accounts / media / posts / content_plans | 1–N |
| content_plans → posts | 1–N |
| users → posts (created_by) | 1–N |
| posts → post_targets | 1–N |
| posts ↔ media (qua post_media) | N–N |
| social_accounts → post_targets | 1–N |
| post_targets → post_analytics | 1–N |
| posts → ai_suggestions | 1–N |

## Logic & vận hành (không nằm ở DB, ở tầng service/job)

### 1. Tính `posts.status` (rollup từ post_targets)
`posts.status` là **dữ liệu dẫn xuất** — KHÔNG để client tự set, mà tính bằng
`PostsService.computePostStatus()` mỗi khi 1 target đổi trạng thái:

```
Tất cả targets = published   → published
Tất cả targets = failed      → failed
Có cả published + failed     → partially_failed
Có ít nhất 1 scheduled       → scheduled
Còn lại                      → draft
```
> Tính ở service (không dùng DB trigger) để logic nằm trong code, dễ test &
> version cùng app. Xem [posts.service.ts](src/modules/posts/posts.service.ts).

### 2. Retry khi đăng bài thất bại
Bull job đọc `retry_count` / `max_retries` trên từng target:
```
nếu retry_count < max_retries  → retry (retry_count++, ghi last_error_at)
ngược lại                      → set target.status = failed
```

### 3. Kiểm soát tăng trưởng `post_analytics`
`post_analytics` là time-series (mỗi lần fetch = 1 dòng) → vẽ biểu đồ tăng trưởng.
Để bảng không phình ảnh hưởng read thường ngày:

- **Cache số mới nhất** lên `post_targets.current_*` → list/calendar đọc nhanh,
  không quét bảng lịch sử. (đã thêm)
- **Index DESC** `(post_target_id, fetched_at DESC)` → query "snapshot mới nhất"
  của 1 target nhanh (`ORDER BY fetched_at DESC LIMIT 1`). (đã thêm)
- **Khuyến nghị vận hành** (tuỳ chọn, chưa code):
  - *Retention*: xoá snapshot > 90 ngày (giữ bảng nhỏ), hoặc
  - *Aggregation*: gộp về 1 dòng/target/ngày sau 30 ngày, hoặc
  - *Partition* `post_analytics` theo tháng nếu vượt ~vài triệu dòng.

> ✅ Điểm 5: ý bạn là thêm **INDEX (post_target_id, fetched_at DESC)** cho query
> "số liệu mới nhất" — đã thêm. Tôi bổ sung thêm cache `current_*` (đọc list/calendar
> khỏi đụng bảng lịch sử). Retention/partition để dành khi bảng thực sự lớn.

## Chạy migration

```bash
cd backend
cp .env.example .env          # điền DATABASE_URL
npm install
npm run migration:run         # tạo toàn bộ bảng
# muốn quay lui: npm run migration:revert
```
