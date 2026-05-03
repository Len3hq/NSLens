import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, usersTable, notificationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { getDiscordBotToken } from "../lib/discordBot";

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
    botClientId: process.env.DISCORD_CLIENT_ID ?? null,
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


export default router;
