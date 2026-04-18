import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, usersTable } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";
import {
  getTelegramBotInfo,
  getWebhookSecret,
  sendTelegramMessage,
} from "../lib/telegram";
import { runAgent } from "./agent";
import { evaluateReminders } from "./reminders";

const router: IRouter = Router();

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
  await db
    .update(usersTable)
    .set({ telegramChatId: null, telegramLinkCode: null, telegramLinkCodeExpiresAt: null })
    .where(eq(usersTable.id, req.userId!));
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
  const text: string = (message.text ?? "").trim();
  if (!text) return;

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

    if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        "Send any message and I'll route it:\n• Notes about people → saved to contacts\n• Questions about your network → answered from memory\n• Start with 'post:' → shared to the Founders Hub\n\nCommands:\n/reminders – check stale contacts now\n/unlink – disconnect this chat",
      );
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
      await db
        .update(usersTable)
        .set({ telegramChatId: null })
        .where(eq(usersTable.id, user.id));
      await sendTelegramMessage(
        chatId,
        "Disconnected. Re-link any time from the Network Brain dashboard.",
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
