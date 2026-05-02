import { db, usersTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { openDiscordDM, sendDiscordDM } from "./discordBot";
import { logger } from "./logger";

const WELCOME_MESSAGE =
  "Hey! I'm the NS Lens bot. You can DM me here anytime to manage your network — save notes about people, ask questions about your contacts, or post to the Founders Hub.\n\nSend `/help` to see what I can do.";

export async function backfillDiscordWelcome(): Promise<void> {
  const users = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(isNull(usersTable.discordDmChannelId));

  if (users.length === 0) return;

  logger.info({ count: users.length }, "discord welcome backfill: starting");

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const channelId = await openDiscordDM(user.id);
      if (!channelId) {
        failed++;
        continue;
      }

      const ok = await sendDiscordDM(channelId, WELCOME_MESSAGE);

      // Always persist the channel ID once we have it, even when the send
      // failed (e.g. DiscordAPIError 50278 — user has no mutual guild with
      // the bot). Without this, NULL users are retried on every server restart.
      await db
        .update(usersTable)
        .set({ discordDmChannelId: channelId })
        .where(eq(usersTable.id, user.id));

      if (!ok) {
        failed++;
        continue;
      }

      sent++;

      // Respect Discord's per-route rate limit for DM channel creation (roughly
      // 2 req/s sustained). 600 ms between users keeps us well under the limit.
      await new Promise<void>((r) => setTimeout(r, 600));
    } catch (err) {
      logger.error({ err, userId: user.id }, "discord welcome backfill: user failed");
      failed++;
    }
  }

  logger.info({ sent, failed }, "discord welcome backfill: complete");
}
