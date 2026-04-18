import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, usersTable, notificationsTable } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";
import {
  downloadFromUrl,
  getTelegramBotInfo,
  getTelegramFileUrl,
  getWebhookSecret,
  sendTelegramMessage,
} from "../lib/telegram";
import { runAgent } from "./agent";
import { evaluateReminders } from "./reminders";
import { createHubPost } from "./hub";
import { handleTelegramQueueReply } from "../lib/telegramQueue";
import { ObjectStorageService } from "../lib/objectStorage";
import type { PostAttachment } from "@workspace/db";

const router: IRouter = Router();

// Single source of truth for tearing down a user's Telegram link. Used by:
//  - HTTP unlink (`POST /me/telegram/unlink`)
//  - `/unlink` command inside the bot
//  - account deletion (`DELETE /me`)
// Clears every per-user telegram field AND drops any pending queued
// notifications so we don't try to send to a stale chat id later.
export async function disconnectUserTelegram(userId: string): Promise<void> {
  await db
    .update(usersTable)
    .set({
      telegramChatId: null,
      telegramLinkCode: null,
      telegramLinkCodeExpiresAt: null,
      telegramAwaitingMore: false,
    })
    .where(eq(usersTable.id, userId));
  await db
    .update(notificationsTable)
    .set({ telegramQueued: false })
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.telegramQueued, true),
      ),
    );
}

// Pull out photos / videos / documents / animations from a Telegram message,
// download them, push them into our object storage, and return PostAttachment[].
async function collectTelegramAttachments(message: {
  photo?: { file_id: string; file_size?: number; width?: number; height?: number }[];
  video?: { file_id: string; mime_type?: string };
  animation?: { file_id: string; mime_type?: string };
  document?: { file_id: string; mime_type?: string; file_name?: string };
}): Promise<PostAttachment[]> {
  const storage = new ObjectStorageService();
  const out: PostAttachment[] = [];

  // Helper: download a Telegram file_id and upload it to GCS.
  async function ingest(
    fileId: string,
    fallbackMime: string,
    type: PostAttachment["type"],
  ): Promise<PostAttachment | null> {
    const url = await getTelegramFileUrl(fileId);
    if (!url) return null;
    const data = await downloadFromUrl(url);
    if (!data) return null;
    const mime = data.contentType !== "application/octet-stream" ? data.contentType : fallbackMime;
    const objectPath = await storage.uploadBuffer(data.buffer, mime);
    return { type, objectPath, mimeType: mime };
  }

  if (message.photo?.length) {
    // Telegram sends multiple sizes — pick the largest.
    const best = [...message.photo].sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0))[0];
    const a = await ingest(best.file_id, "image/jpeg", "image");
    if (a) out.push(a);
  }
  if (message.video) {
    const a = await ingest(
      message.video.file_id,
      message.video.mime_type ?? "video/mp4",
      "video",
    );
    if (a) out.push(a);
  }
  if (message.animation) {
    const a = await ingest(
      message.animation.file_id,
      message.animation.mime_type ?? "video/mp4",
      "video",
    );
    if (a) out.push(a);
  }
  if (message.document) {
    const mime = message.document.mime_type ?? "application/octet-stream";
    const isImage = mime.startsWith("image/");
    const isVideo = mime.startsWith("video/");
    const a = await ingest(
      message.document.file_id,
      mime,
      isImage ? "image" : isVideo ? "video" : "file",
    );
    if (a) out.push(a);
  }
  return out;
}

function genCode(): string {
  // 8-char base32-ish, easy to type on mobile
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

router.get("/me/telegram", requireAuth, async (req, res) => {
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);
  const bot = await getTelegramBotInfo();
  res.json({
    linked: !!u?.telegramChatId,
    chatId: u?.telegramChatId ?? null,
    linkCode: u?.telegramLinkCode ?? null,
    linkCodeExpiresAt: u?.telegramLinkCodeExpiresAt ?? null,
    botUsername: bot?.username ?? null,
    botConfigured: !!bot,
  });
});

router.post("/me/telegram/link", requireAuth, async (req, res) => {
  const code = genCode();
  const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  await db
    .update(usersTable)
    .set({ telegramLinkCode: code, telegramLinkCodeExpiresAt: expires })
    .where(eq(usersTable.id, req.userId!));
  const bot = await getTelegramBotInfo();
  res.json({
    linkCode: code,
    expiresAt: expires.toISOString(),
    botUsername: bot?.username ?? null,
    deepLink: bot?.username ? `https://t.me/${bot.username}?start=${code}` : null,
  });
});

router.post("/me/telegram/unlink", requireAuth, async (req, res) => {
  await disconnectUserTelegram(req.userId!);
  res.json({ ok: true });
});

// Public webhook — Telegram POSTs message updates here.
router.post("/telegram/webhook", async (req, res) => {
  const expected = getWebhookSecret();
  const got = req.header("x-telegram-bot-api-secret-token");
  if (got !== expected) {
    res.status(401).json({ error: "bad secret" });
    return;
  }
  // Always 200 quickly so Telegram doesn't retry.
  res.json({ ok: true });

  const update = req.body ?? {};
  const message = update.message;
  if (!message?.chat?.id) return;
  const chatId = String(message.chat.id);
  // Telegram sends `caption` for media (photo/video/document) and `text` for plain messages.
  const text: string = (message.text ?? message.caption ?? "").trim();
  const hasMedia = !!(message.photo || message.video || message.document || message.animation);
  if (!text && !hasMedia) return;

  try {
    // /start <code> → link this chat to a Network Brain account
    const startMatch = text.match(/^\/start(?:\s+([A-Z0-9]{6,12}))?\s*$/i);
    if (startMatch) {
      const code = startMatch[1]?.toUpperCase();
      if (!code) {
        await sendTelegramMessage(
          chatId,
          "Welcome to Network Brain. To connect this chat to your account, open the app → Dashboard → Connect Telegram, then send the linking command shown there.",
        );
        return;
      }
      const [user] = await db
        .select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.telegramLinkCode, code),
            gt(usersTable.telegramLinkCodeExpiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!user) {
        await sendTelegramMessage(
          chatId,
          "That link code is invalid or expired. Open Network Brain and generate a new one.",
        );
        return;
      }
      await db
        .update(usersTable)
        .set({
          telegramChatId: chatId,
          telegramLinkCode: null,
          telegramLinkCodeExpiresAt: null,
        })
        .where(eq(usersTable.id, user.id));
      await sendTelegramMessage(
        chatId,
        `Connected. You'll get reminders and Hub matches here. Send any note about people you've met to remember them, ask questions about your network, or start a message with "post:" to share to the Founders Hub.`,
      );
      return;
    }

    // Look up the user by chat id
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramChatId, chatId))
      .limit(1);
    if (!user) {
      await sendTelegramMessage(
        chatId,
        "This chat isn't linked yet. Open Network Brain → Dashboard → Connect Telegram to get a code, then send /start <CODE> here.",
      );
      return;
    }

    // Catch yes/no replies to the "you have N more updates" prompt before
    // anything else, so users can flush or stop the queue conversationally.
    if (text && (await handleTelegramQueueReply(user.id, text))) return;

    if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        "Send any message and I'll route it:\n• Notes about people → saved to contacts\n• Questions about your network → answered from memory\n• Start with 'post:' → shared to the Founders Hub\n• Send a photo, video, file, or link (with optional caption) → posted to the Founders Hub\n\nCommands:\n/post <text> – force a Hub post\n/followups – list open follow-ups\n/priority – top contacts to focus on\n/tag <name> – list contacts with that tag\n/reminders – check stale contacts now\n/unlink – disconnect this chat",
      );
      return;
    }

    if (text === "/followups") {
      const out = await runAgent(user.id, "show my follow-ups");
      await sendTelegramMessage(chatId, out.reply);
      return;
    }
    if (text === "/priority") {
      const out = await runAgent(user.id, "who matters most in my network");
      await sendTelegramMessage(chatId, out.reply);
      return;
    }
    const tagMatch = text.match(/^\/tag\s+(\S.*)$/i);
    if (tagMatch) {
      const out = await runAgent(user.id, `show me my ${tagMatch[1].trim()} contacts`);
      await sendTelegramMessage(chatId, out.reply);
      return;
    }

    // Media messages, /post, "post:" prefix, or a message that is just a bare URL
    // (one or more URLs and very little other text) → create a Founders Hub post.
    const isExplicitPostCommand = /^\/post(\s|$)/i.test(text);
    const looksLikePost = /^\s*post\s*:/i.test(text);
    const urlsInText = text.match(/https?:\/\/\S+/g) ?? [];
    const stripped = urlsInText.reduce((acc, u) => acc.replace(u, ""), text).trim();
    const isBareLinkMessage = urlsInText.length > 0 && stripped.length <= 12;
    if (
      hasMedia ||
      isExplicitPostCommand ||
      looksLikePost ||
      isBareLinkMessage
    ) {
      const cleanText = text
        .replace(/^\/post\s*/i, "")
        .replace(/^\s*post\s*:\s*/i, "")
        .trim();
      const attachments = await collectTelegramAttachments(message);
      // Auto-detect bare URLs in the caption/text and add them as link attachments.
      const urls = cleanText.match(/https?:\/\/\S+/g) ?? [];
      for (const url of urls) {
        if (!attachments.some((a) => a.url === url)) {
          attachments.push({ type: "link", url });
        }
      }
      try {
        const created = await createHubPost(user.id, cleanText, attachments);
        const what = attachments.length
          ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`
          : "your post";
        await sendTelegramMessage(
          chatId,
          `📣 Posted to the Founders Hub with ${what}. I'll notify people in your network if it's relevant to them.${created.id ? "" : ""}`,
        );
      } catch (err) {
        req.log?.error({ err }, "telegram hub post failed");
        await sendTelegramMessage(
          chatId,
          "I couldn't post that to the Hub. Try again in a moment.",
        );
      }
      return;
    }

    if (text === "/reminders") {
      const r = await evaluateReminders(user.id);
      await sendTelegramMessage(
        chatId,
        `Checked ${r.evaluated} contact${r.evaluated === 1 ? "" : "s"}, flagged ${r.flagged} as stale.`,
      );
      return;
    }

    if (text === "/unlink") {
      await disconnectUserTelegram(user.id);
      await sendTelegramMessage(
        chatId,
        "Disconnected. Re-link any time from the NS Lens dashboard.",
      );
      return;
    }

    // Otherwise → run through the agent router
    const out = await runAgent(user.id, text);
    await sendTelegramMessage(chatId, out.reply);
  } catch (err) {
    req.log?.error({ err }, "telegram webhook handler failed");
    try {
      await sendTelegramMessage(chatId, "Something went wrong on my end. Try again in a moment.");
    } catch {
      // ignore
    }
  }
});

export default router;
