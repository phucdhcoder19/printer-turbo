import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

/**
 * Mã hoá token nền tảng (access_token, app password...) trước khi lưu Postgres.
 *
 * TẠI SAO mã hoá?
 * → access_token cho phép đăng bài thay user. Nếu DB rò rỉ mà token là plaintext
 *   thì kẻ tấn công chiếm được quyền đăng. Mã hoá at-rest giảm thiệt hại.
 *
 * Thuật toán: AES-256-GCM.
 * → GCM vừa mã hoá vừa kèm "authentication tag" → phát hiện nếu ciphertext bị sửa.
 * → IV (initialization vector) ngẫu nhiên mỗi lần → cùng 1 token mã hoá 2 lần ra
 *   2 chuỗi khác nhau (an toàn hơn).
 *
 * Định dạng chuỗi lưu DB:  "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM khuyến nghị IV 12 byte
const KEY_LENGTH = 32; // AES-256 cần key 32 byte

/**
 * Đổi key hex (env ENCRYPTION_KEY) thành Buffer 32 byte.
 * Ném lỗi rõ ràng nếu thiếu/sai độ dài → fail-fast thay vì mã hoá bằng key rác.
 */
function resolveKey(keyHex: string): Buffer {
  if (!keyHex) {
    throw new Error(
      "ENCRYPTION_KEY chưa được cấu hình. Sinh key: openssl rand -hex 32",
    );
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY phải là 32 byte hex (64 ký tự). Hiện tại: ${key.length} byte.`,
    );
  }
  return key;
}

/** Mã hoá 1 chuỗi → "iv:tag:ciphertext" (hex). */
export function encrypt(plain: string, keyHex: string): string {
  const key = resolveKey(keyHex);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/** Giải mã chuỗi "iv:tag:ciphertext" → plaintext. */
export function decrypt(payload: string, keyHex: string): string {
  const key = resolveKey(keyHex);
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Chuỗi mã hoá không đúng định dạng iv:tag:ciphertext");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
