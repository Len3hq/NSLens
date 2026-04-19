import { Client, GatewayIntentBits, Partials, type Message } from "discord.js";
import { db, usersTable, notificationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";
import { runAgent } from "../routes/agent";
import { evaluateReminders } from "../routes/reminders";
import { createHubPost } from "../routes/hub";
import { enqueueDiscord, handleDiscordQueueReply } from "./discordQueue";

let client: Client | null = null;

export function getDiscordBotToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN ?? null;
}

export async function sendDiscordDM(channelId: string, text: string): Promise<boolean> {
  if (!client) return false;
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return false;
    await (channel as any).send(text);
    return true;
  } catch (err) {
    logger.warn({ err, channelId }, "discord dm send failed");
    return false;
  }
}

// Open (or retrieve cached) DM channel for a Discord user ID.
export async function openDiscordDM(discordUserId: string): Promise<string | null> {
  if (!client) return null;
  try {
    const user = await client.users.fetch(discordUserId);
    const dmChannel = await user.createDM();
    return dmChannel.id;
  } catch (err) {
    logger.warn({ err, discordUserId }, "discord dm channel open failed");
    return null;
  }
}

async function handleMessage(message: Message) {
  // Ignore bots and non-DM channels
  if (message.author.bot) return;
  if (message.channel.type !== 1 /* DMChannel */) return;

  const discordUserId = message.author.id;
  const channelId = message.channel.id;
  const text = message.content?.trim() ?? "";
  const hasAttachment = message.attachments.size > 0;

  if (!text && !hasAttachment) return;

  try {
    // Look up the user — their Discord user ID is their DB user ID
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, discordUserId))
      .limit(1);

    if (!user) {
      await message.reply(
        "You don't have an NS Lens account. Sign in at the app with your Discord account first.",
      );
      return;
    }

    // Persist the DM channel ID so we can send proactive messages
    if (!user.discordDmChannelId || user.discordDmChannelId !== channelId) {
      await db
        .update(usersTable)
        .set({ discordDmChannelId: channelId })
        .where(eq(usersTable.id, discordUserId));
    }

    // Handle yes/no reply to "you have N more updates" prompt
    if (text && (await handleDiscordQueueReply(user.id, text))) return;

    // /help
    if (text === "/help") {
      await message.reply(
        "Send any message and I'll route it:\n" +
          "• Notes about people → saved to contacts\n" +
          "• Questions about your network → answered from memory\n" +
          "• Start with `post:` → shared to the Founders Hub\n" +
          "• Send an image, video, or link (with optional caption) → posted to the Founders Hub\n\n" +
          "Commands:\n" +
          "`/post <text>` – force a Hub post\n" +
          "`/followups` – list open follow-ups\n" +
          "`/priority` – top contacts to focus on\n" +
          "`/tag <name>` – list contacts with that tag\n" +
          "`/reminders` – check stale contacts now\n" +
          "`/disconnect` – stop receiving messages here",
      );
      return;
    }

    if (text === "/followups") {
      const out = await runAgent(user.id, "show my follow-ups", "discord");
      await message.reply(out.reply);
      return;
    }

    if (text === "/priority") {
      const out = await runAgent(user.id, "who matters most in my network", "discord");
      await message.reply(out.reply);
      return;
    }

    const tagMatch = text.match(/^\/tag\s+(\S.*)$/i);
    if (tagMatch) {
      const out = await runAgent(user.id, `show me my ${tagMatch[1].trim()} contacts`, "discord");
      await message.reply(out.reply);
      return;
    }

    if (text === "/reminders") {
      const r = await evaluateReminders(user.id);
      await message.reply(
        `Checked ${r.evaluated} contact${r.evaluated === 1 ? "" : "s"}, flagged ${r.flagged} as stale.`,
      );
      return;
    }

    if (text === "/disconnect") {
      await db
        .update(usersTable)
        .set({ discordDmChannelId: null, discordAwaitingMore: false })
        .where(eq(usersTable.id, user.id));
      await db
        .update(notificationsTable)
        .set({ discordQueued: false })
        .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.discordQueued, true)));
      await message.reply("Disconnected. You won't receive notifications here. DM me again any time to reconnect.");
      return;
    }

    // Hub post: /post, "post:", bare URL, or attachment
    const isExplicitPostCommand = /^\/post(\s|$)/i.test(text);
    const looksLikePost = /^\s*post\s*:/i.test(text);
    const urlsInText = text.match(/https?:\/\/\S+/g) ?? [];
    const stripped = (urlsInText as string[]).reduce((acc: string, u: string) => acc.replace(u, ""), text).trim();
    const isBareLinkMessage = urlsInText.length > 0 && stripped.length <= 12;

    if (hasAttachment || isExplicitPostCommand || looksLikePost || isBareLinkMessage) {
      const cleanText = text
        .replace(/^\/post\s*/i, "")
        .replace(/^\s*post\s*:\s*/i, "")
        .trim();

      const attachments = [];
      for (const [, att] of message.attachments) {
        const mime = att.contentType ?? "application/octet-stream";
        const isImage = mime.startsWith("image/");
        const isVideo = mime.startsWith("video/");
        attachments.push({
          type: (isImage ? "image" : isVideo ? "video" : "file") as "image" | "video" | "file",
          url: att.url,
          mimeType: mime,
        });
      }
      for (const url of urlsInText) {
        if (!attachments.some((a) => a.url === url)) {
          attachments.push({ type: "link" as const, url });
        }
      }

      try {
        await createHubPost(user.id, cleanText, attachments);
        const what = attachments.length
          ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`
          : "your post";
        await message.reply(`📣 Posted to the Founders Hub with ${what}. I'll notify people in your network if it's relevant to them.`);
      } catch (err) {
        logger.error({ err }, "discord hub post failed");
        await message.reply("I couldn't post that to the Hub. Try again in a moment.");
      }
      return;
    }

    // Default: run through the agent router
    const out = await runAgent(user.id, text, "discord");
    await message.reply(out.reply);
  } catch (err) {
    logger.error({ err }, "discord message handler failed");
    try {
      await message.reply("Something went wrong on my end. Try again in a moment.");
    } catch {
      // ignore
    }
  }
}

export async function startDiscordBot(): Promise<void> {
  const token = getDiscordBotToken();
  if (!token) {
    logger.info("DISCORD_BOT_TOKEN not set — Discord bot disabled");
    return;
  }

  client = new Client({
    intents: [GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel],
  });

  client.once("ready", (c) => {
    logger.info({ tag: c.user.tag }, "Discord bot ready");
  });

  client.on("messageCreate", (message) => {
    handleMessage(message).catch((err) =>
      logger.error({ err }, "discord messageCreate handler threw"),
    );
  });

  client.on("error", (err) => {
    logger.error({ err }, "discord client error");
  });

  await client.login(token);
}
