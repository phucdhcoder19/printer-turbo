// Các enum dùng chung cho toàn bộ schema marketing.

export enum UserRole {
  ADMIN = 'admin', // toàn quyền
  EDITOR = 'editor', // duyệt + sửa
  CREATOR = 'creator', // tạo bài
}

export enum Platform {
  FACEBOOK = 'facebook',
  TIKTOK = 'tiktok',
  INSTAGRAM = 'instagram',
  THREADS = 'threads',
  YOUTUBE = 'youtube',
  TWITTER = 'twitter',
  WORDPRESS = 'wordpress',
}

// Trạng thái kết nối của 1 tài khoản nền tảng
export enum ConnectionStatus {
  CONNECTED = 'connected',
  EXPIRED = 'expired', // token hết hạn, cần refresh
  REVOKED = 'revoked', // user gỡ quyền bên nền tảng
  PENDING = 'pending', // đang trong luồng OAuth
}

// Trạng thái 1 phiên OAuth (chống CSRF)
export enum OauthStateStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

// Hành động trong lịch sử kết nối
export enum ConnectionLogAction {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  TOKEN_REFRESHED = 'token_refreshed',
  TOKEN_EXPIRED = 'token_expired',
  RECONNECTED = 'reconnected',
}

// Trạng thái tổng của 1 bài (rollup từ các target)
export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  PARTIALLY_FAILED = 'partially_failed', // 1 vài nền tảng lỗi
  FAILED = 'failed',
}

// Trạng thái riêng của từng nền tảng
export enum TargetStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHING = 'publishing', // đang gọi API đăng
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum MediaSource {
  UPLOAD = 'upload',
  MPT_GENERATED = 'mpt_generated', // video sinh từ pipeline FastAPI
}

export enum AiSuggestionType {
  CAPTION = 'caption',
  HASHTAGS = 'hashtags',
  BEST_TIME = 'best_time',
}

// Trạng thái của 1 kế hoạch content (chiến dịch theo tuần/tháng)
export enum ContentPlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}
