// Gom toàn bộ biến môi trường vào 1 object có kiểu rõ ràng.
export default () => ({
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",

  database: {
    url:
      process.env.DATABASE_URL ??
      "postgres://mpt:mpt_secret@localhost:5432/mpt_marketing",
  },

  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  },

  // URL của pipeline FastAPI mà ta sẽ proxy sang
  fastapi: {
    url: process.env.FASTAPI_URL ?? "http://localhost:8080",
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? "change_me_in_production",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },

  facebook: {
    appId: process.env.FB_APP_ID ?? "",
    appSecret: process.env.FB_APP_SECRET ?? "",
    redirectUri:
      process.env.FB_REDIRECT_URI ??
      "http://localhost:3000/api/social-accounts/facebook/callback",
    // Mặc định chỉ xin quyền KẾT NỐI/liệt kê Page (không cần App Review).
    // Khi build tính năng ĐĂNG BÀI + qua App Review thì thêm:
    //   pages_manage_posts,pages_read_engagement
    scopes: process.env.FB_SCOPES ?? "public_profile,pages_show_list",
  },

  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY ?? "",
    clientSecret: process.env.TIKTOK_CLIENT_SECRET ?? "",
    redirectUri:
      process.env.TIKTOK_REDIRECT_URI ??
      "http://localhost:3000/api/social-accounts/tiktok/callback",
  },

  // Key 32 byte (hex) để mã hoá AES-256-GCM token nền tảng trước khi lưu DB.
  // Sinh bằng: openssl rand -hex 32
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",

  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
});
