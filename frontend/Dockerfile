# frontend/Dockerfile — build React rồi phục vụ bằng nginx
# ---- Stage 1: build ----
FROM node:20-alpine AS builder
WORKDIR /app

# VITE_API_URL phải có lúc BUILD (Vite nhúng env vào bundle tĩnh)
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- Stage 2: nginx phục vụ static ----
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
