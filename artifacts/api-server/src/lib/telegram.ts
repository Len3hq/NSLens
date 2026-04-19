import { logger } from "./logger";

const API_BASE = "https://api.telegram.org";
const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024; // 20 MB — Telegram's own file size cap

export function getTelegramToken(): string | null {
  return process.env["TELEGRAM_BOT_TOKEN"] ?? null;
}

export function getPublicWebhookUrl(): string | null {
  const explicit = process.env["PUBLIC_API_URL"];
  if (explicit) return explicit.replace(/\/$/, "") + "/api/telegram/webhook";
  const dev = process.env["REPLIT_DEV_DOMAIN"];
  if (dev) return `https://${dev}/api/telegram/webhook`;
  return null;
}

async function tg<T = unknown>(method: string, payload: unknown): Promise<T | null> {
  const token = getTelegramToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!json.ok) {
      logger.warn({ method, description: json.description }, "telegram api error");
      return null;
    }
    return json.result ?? null;
  } catch (err) {
    logger.warn({ err, method }, "telegram api request failed");
    return null;
  }
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  opts: { parseMode?: "Markdown" | "HTML" } = {},
): Promise<boolean> {
  const result = await tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: opts.parseMode,
    disable_web_page_preview: true,
  });
  return result !== null;
}

export async function setTelegramWebhook(url: string, secret: string): Promise<boolean> {
  const result = await tg("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
  return result !== null;
}

export async function deleteTelegramWebhook(): Promise<boolean> {
  const result = await tg("deleteWebhook", { drop_pending_updates: true });
  return result !== null;
}

export async function getTelegramBotInfo(): Promise<{ username?: string } | null> {
  return tg<{ username?: string }>("getMe", {});
}

export async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  const token = getTelegramToken();
  if (!token) return null;
  const file = await tg<{ file_path?: string }>("getFile", { file_id: fileId });
  if (!file?.file_path) return null;
  return `${API_BASE}/file/bot${token}/${file.file_path}`;
}

export async function downloadFromUrl(url: string): Promise<{
  buffer: Buffer;
  contentType: string;
} | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;

    // Reject if Content-Length already exceeds the cap.
    const contentLength = Number(r.headers.get("content-length") ?? "0");
    if (contentLength > MAX_DOWNLOAD_BYTES) {
      logger.warn({ url, contentLength }, "downloadFromUrl: file too large, skipping");
      return null;
    }

    // Stream with a byte counter so we abort if the server lies about size.
    const reader = r.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_DOWNLOAD_BYTES) {
          reader.cancel();
          logger.warn({ url, total }, "downloadFromUrl: exceeded size cap mid-stream, aborting");
          return null;
        }
        chunks.push(value);
      }
    }

    return {
      buffer: Buffer.concat(chunks),
      contentType: r.headers.get("content-type") ?? "application/octet-stream",
    };
  } catch (err) {
    logger.warn({ err, url }, "downloadFromUrl failed");
    return null;
  }
}

export function getWebhookSecret(): string {
  // Stable per-process secret derived from the bot token. Telegram echoes this
  // in the X-Telegram-Bot-Api-Secret-Token header to prove the request came
  // from Telegram (after we registered the webhook with the same secret).
  const token = getTelegramToken() ?? "";
  // Simple FNV-1a hash, hex-encoded, truncated. Good enough for an opaque
  // shared secret; the bot token itself is the real source of trust.
  let h = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `nb_${h.toString(16).padStart(8, "0")}_webhook`;
}
