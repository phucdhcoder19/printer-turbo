# main.py — điểm khởi động server FastAPI
import uvicorn

if __name__ == "__main__":
    # reload=True: tự khởi động lại khi sửa code (tiện cho dev).
    # Production nên bỏ reload và tăng workers.
    uvicorn.run("app.asgi:app", host="0.0.0.0", port=8080, reload=True)
