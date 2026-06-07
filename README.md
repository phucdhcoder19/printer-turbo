# MoneyPrinterTurbo + Marketing Hub

Hệ thống 2-trong-1 cho người làm content marketing:
- **MoneyPrinterTurbo** — nhập 1 chủ đề → tự sinh **video ngắn** (FastAPI/Python).
- **Marketing Hub** — quản lý content đa nền tảng, lên lịch, kết nối kênh, thống kê
  (NestJS + React + PostgreSQL).

## 📚 Tài liệu (đọc theo thứ tự)

| Tài liệu | Nội dung |
|----------|----------|
| **[docs/TONG-QUAN-VA-LOGIC.md](docs/TONG-QUAN-VA-LOGIC.md)** | ⭐ **Bắt đầu ở đây.** Nghiệp vụ + logic toàn dự án, sơ đồ, luồng end-to-end. |
| [backend/DATABASE.md](backend/DATABASE.md) | Chi tiết schema marketing (bảng, quan hệ, logic). |
| [INTEGRATION.md](INTEGRATION.md) | Kiến trúc tích hợp 3 service + Docker. |
| [roadmap-chi-tiet-moneyprinterturbo.md](roadmap-chi-tiet-moneyprinterturbo.md) | Hướng dẫn build pipeline video từng phase. |

## 🧩 Cấu trúc repo

```
printer-turbo/
├── app/                  # FastAPI — pipeline tạo video (Python)
├── backend/              # NestJS — marketing hub + proxy (TypeScript)
├── frontend/             # React + Vite + Tailwind (TypeScript)
├── storage/              # output video (file-based)
├── docs/                 # tài liệu
└── docker-compose.yml    # postgres + redis + fastapi + nestjs + react
```

## ▶️ Chạy nhanh (dev)

```powershell
docker compose up -d postgres redis
cd backend  && npm install && npm run migration:run && npm run start:dev   # :3000
cd frontend && npm install && npm run dev                                  # :5173
uv run uvicorn app.asgi:app --port 8080 --reload                           # :8080 (tùy chọn)
```

Chi tiết hơn: xem [docs/TONG-QUAN-VA-LOGIC.md](docs/TONG-QUAN-VA-LOGIC.md) mục "Cách chạy toàn bộ".
