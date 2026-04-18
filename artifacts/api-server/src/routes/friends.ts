import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, usersTable, friendshipsTable, contactsTable } from "@workspace/db";
import { and, eq, ilike, or, ne } from "drizzle-orm";
import { embedText } from "../lib/embeddings";

const router: IRouter = Router();

// ---- search users by username / handle for the "add friend" picker ----

router.get("/users/search", requireAuth, async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) {
    res.json([]);
    return;
  }
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const rows = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      fullName: usersTable.fullName,
      name: usersTable.name,
      telegramUsername: usersTable.telegramUsername,
      xUsername: usersTable.xUsername,
      discordUsername: usersTable.discordUsername,
    })
    .from(usersTable)
    .where(
      and(
        ne(usersTable.id, req.userId!),
        or(
          ilike(usersTable.username, like),
          ilike(usersTable.fullName, like),
          ilike(usersTable.telegramUsername, like),
          ilike(usersTable.xUsername, like),
          ilike(usersTable.discordUsername, like),
        ),
      ),
    )
    .limit(15);
  res.json(rows);
});

// ---- list current user's friends ----

router.get("/friends", requireAuth, async (req, res) => {
  const rows = await db
    .select({
      id: friendshipsTable.id,
      friendUserId: friendshipsTable.friendUserId,
      contactId: friendshipsTable.contactId,
      createdAt: friendshipsTable.createdAt,
      username: usersTable.username,
      fullName: usersTable.fullName,
      name: usersTable.name,
      email: usersTable.email,
      telegramUsername: usersTable.telegramUsername,
      xUsername: usersTable.xUsername,
      discordUsername: usersTable.discordUsername,
    })
    .from(friendshipsTable)
    .leftJoin(usersTable, eq(usersTable.id, friendshipsTable.friendUserId))
    .where(eq(friendshipsTable.userId, req.userId!));
  res.json(rows);
});

// ---- add friend by username ----

router.post("/friends", requireAuth, async (req, res) => {
  const raw = String((req.body ?? {}).username ?? "").trim().replace(/^@+/, "");
  if (!raw) {
    res.status(400).json({ error: "username is required" });
    return;
  }
  const [friend] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, raw))
    .limit(1);
  if (!friend) {
    res.status(404).json({ error: "No user with that username" });
    return;
  }
  if (friend.id === req.userId) {
    res.status(400).json({ error: "You can't friend yourself." });
    return;
  }

  // If we're already friends, return the existing record without creating a
  // duplicate contact row.
  const [existing] = await db
    .select()
    .from(friendshipsTable)
    .where(
      and(
        eq(friendshipsTable.userId, req.userId!),
        eq(friendshipsTable.friendUserId, friend.id),
      ),
    )
    .limit(1);

  let contactId: number;
  let friendshipId: number;

  if (existing) {
    friendshipId = existing.id;
    contactId = existing.contactId!;
  } else {
    // Auto-create a CRM contact for this friend.
    const friendDisplay = friend.fullName ?? friend.name ?? friend.username ?? "Friend";
    const handles: string[] = [];
    if (friend.username) handles.push(`@${friend.username}`);
    if (friend.telegramUsername) handles.push(`tg:@${friend.telegramUsername}`);
    if (friend.xUsername) handles.push(`x:@${friend.xUsername}`);
    if (friend.discordUsername) handles.push(`discord:${friend.discordUsername}`);
    const ctxParts = ["Connected as a friend on Network Brain"];
    if (handles.length) ctxParts.push(handles.join(" · "));
    const contactContext = ctxParts.join(" — ");

    const embedding =
      (await embedText(`${friendDisplay} ${contactContext}`)) ?? undefined;

    const [contact] = await db
      .insert(contactsTable)
      .values({
        userId: req.userId!,
        name: friendDisplay,
        context: contactContext,
        tags: ["friend"],
        embedding,
      })
      .returning();
    contactId = contact.id;

    const [friendship] = await db
      .insert(friendshipsTable)
      .values({
        userId: req.userId!,
        friendUserId: friend.id,
        contactId: contact.id,
      })
      .onConflictDoNothing()
      .returning();

    if (friendship) {
      friendshipId = friendship.id;
    } else {
      // Lost a race to another concurrent add; clean up the orphan contact and
      // load the winning friendship instead.
      await db.delete(contactsTable).where(eq(contactsTable.id, contact.id));
      const [winner] = await db
        .select()
        .from(friendshipsTable)
        .where(
          and(
            eq(friendshipsTable.userId, req.userId!),
            eq(friendshipsTable.friendUserId, friend.id),
          ),
        )
        .limit(1);
      friendshipId = winner!.id;
      contactId = winner!.contactId!;
    }
  }

  res.status(201).json({
    id: friendshipId,
    friendUserId: friend.id,
    contactId,
    username: friend.username,
    fullName: friend.fullName,
    name: friend.name,
    telegramUsername: friend.telegramUsername,
    xUsername: friend.xUsername,
    discordUsername: friend.discordUsername,
  });
});

router.delete("/friends/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "bad id" });
    return;
  }
  await db
    .delete(friendshipsTable)
    .where(and(eq(friendshipsTable.id, id), eq(friendshipsTable.userId, req.userId!)));
  res.json({ ok: true });
});

export default router;
