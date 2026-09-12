import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Randomized, authenticated routing codes work across serverless instances without
// exposing Telegram IDs or requiring a database. Rotating BOT_TOKEN invalidates them.
function routingKey(secret) {
  if (!secret) throw new Error("Reply routing requires a bot token");
  return createHash("sha256").update(`anonymous-reply-v1:${secret}`).digest();
}

export function createReplyCode(userId, secret) {
  const id = String(userId);
  if (!/^\d{1,16}$/.test(id)) throw new Error("Invalid reply recipient");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", routingKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(id, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function readReplyCode(code, secret) {
  try {
    if (!/^[A-Za-z0-9_-]{39,59}$/.test(code)) return null;
    const payload = Buffer.from(code, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", routingKey(secret), payload.subarray(0, 12));
    decipher.setAuthTag(payload.subarray(12, 28));
    const id = Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
    return /^\d{1,16}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
