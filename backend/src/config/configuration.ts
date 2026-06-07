// Gom toàn bộ biến môi trường vào 1 object có kiểu rõ ràng.
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    url:
      process.env.DATABASE_URL ??
      'postgres://mpt:mpt_secret@localhost:5432/mpt_marketing',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },

  // URL của pipeline FastAPI mà ta sẽ proxy sang
  fastapi: {
    url: process.env.FASTAPI_URL ?? 'http://localhost:8080',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'change_me_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
});
