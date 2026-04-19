import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, usersTable, notificationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { getDiscordBotToken, openDiscordDM } from "../lib/discordBot";

const router: IRouter = Router();

router.get("/me/discord-bot", requireAuth, async (req, res) => {
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);
  res.json({
    linked: !!u?.discordDmChannelId,
    botConfigured: !!getDiscordBotToken(),
  });
});

router.post("/me/discord-bot/disconnect", requireAuth, async (req, res) => {
  await db
    .update(usersTable)
    .set({ discordDmChannelId: null, discordAwaitingMore: false })
    .where(eq(usersTable.id, req.userId!));
  await db
    .update(notificationsTable)
    .set({ discordQueued: false })
    .where(
      and(
        eq(notificationsTable.userId, req.userId!),
        eq(notificationsTable.discordQueued, true),
      ),
    );
  res.json({ ok: true });
});

// Proactively open a DM channel so the user knows the bot username.
// Called from the Profile page when the user clicks "Set up Discord bot".
router.post("/me/discord-bot/open", requireAuth, async (req, res) => {
  if (!getDiscordBotToken()) {
    res.status(503).json({ error: "Discord bot not configured" });
    return;
  }
  const channelId = await openDiscordDM(req.userId!);
  if (!channelId) {
    res.status(502).json({ error: "Could not open DM channel — make sure you share a server with the bot or have DMed it before." });
    return;
  }
  await db
    .update(usersTable)
    .set({ discordDmChannelId: channelId })
    .where(eq(usersTable.id, req.userId!));
  res.json({ ok: true, channelId });
});

export default router;
