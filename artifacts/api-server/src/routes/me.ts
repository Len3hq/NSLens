import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, usersTable } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";

const router: IRouter = Router();

function projectMe(u: typeof usersTable.$inferSelect | undefined, fallbackId: string) {
  return {
    id: fallbackId,
    email: u?.email ?? null,
    name: u?.name ?? null,
    fullName: u?.fullName ?? null,
    username: u?.username ?? null,
    telegramUsername: u?.telegramUsername ?? null,
    xUsername: u?.xUsername ?? null,
    discordUsername: u?.discordUsername ?? null,
    reminderDays: u?.reminderDays ?? 21,
  };
}

router.get("/me", requireAuth, async (req, res) => {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);
  res.json(projectMe(rows[0], req.userId!));
});

// Allow caller to update their profile. Username must be unique. We strip
// leading @ on social handles so users can paste them either way.
router.patch("/me", requireAuth, async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const cleanHandle = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim().replace(/^@+/, "");
    return t.length ? t.slice(0, 64) : null;
  };
  const cleanText = (v: unknown, max = 120): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length ? t.slice(0, max) : null;
  };

  const username = cleanHandle(body.username);
  if (username && !/^[a-zA-Z0-9_.-]{2,32}$/.test(username)) {
    res.status(400).json({ error: "Username must be 2–32 chars (letters, numbers, _ . -)" });
    return;
  }
  if (username) {
    const taken = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.username, username), ne(usersTable.id, req.userId!)))
      .limit(1);
    if (taken.length) {
      res.status(409).json({ error: "That username is already taken." });
      return;
    }
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if ("username" in body) updates.username = username;
  if ("fullName" in body) updates.fullName = cleanText(body.fullName);
  if ("name" in body) updates.name = cleanText(body.name);
  if ("telegramUsername" in body) updates.telegramUsername = cleanHandle(body.telegramUsername);
  if ("xUsername" in body) updates.xUsername = cleanHandle(body.xUsername);
  if ("discordUsername" in body) updates.discordUsername = cleanHandle(body.discordUsername);
  if (typeof body.reminderDays === "number" && body.reminderDays >= 1 && body.reminderDays <= 365) {
    updates.reminderDays = Math.floor(body.reminderDays);
  }

  if (Object.keys(updates).length) {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!));
  }
  const [fresh] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);
  res.json(projectMe(fresh, req.userId!));
});

export default router;
