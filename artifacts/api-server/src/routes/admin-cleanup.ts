import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  contactsTable,
  interactionsTable,
  notificationsTable,
  postsTable,
  friendshipsTable,
  followUpsTable,
} from "@workspace/db";
import { like, or, inArray } from "drizzle-orm";

// One-shot admin endpoint to wipe seeded mock data from production. Guarded by
// a hardcoded throwaway token. This route is intended to be called once and
// then deleted from the codebase. Do NOT reuse the token.
const ADMIN_TOKEN = "89ead0f61b8d8bd370c7ab71b0589a713d542a22df9754b7";
const SEED_PREFIX = "seed_peer_";

const router: IRouter = Router();

router.post("/admin/wipe-seed-data", async (req, res) => {
  const provided = req.header("x-admin-token");
  if (!provided || provided !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const before = {
    users: 0,
    posts: 0,
    contacts: 0,
    interactions: 0,
    notifications: 0,
    friendships: 0,
    followUps: 0,
  };

  try {
    // Find every post id authored by a seed peer so we can also clear any
    // notifications that reference those posts on real users.
    const seedPosts = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(like(postsTable.authorId, `${SEED_PREFIX}%`));
    const seedPostIds = seedPosts.map((p) => p.id);

    const seedContacts = await db
      .select({ id: contactsTable.id })
      .from(contactsTable)
      .where(like(contactsTable.userId, `${SEED_PREFIX}%`));
    const seedContactIds = seedContacts.map((c) => c.id);

    // Notifications: by seed user, OR referencing a seed post, OR referencing
    // a seed contact. Run as three statements to keep the parameter binding
    // simple and portable.
    let notifTotal = 0;
    const r1 = await db
      .delete(notificationsTable)
      .where(like(notificationsTable.userId, `${SEED_PREFIX}%`));
    notifTotal += (r1 as unknown as { rowCount?: number }).rowCount ?? 0;
    if (seedPostIds.length) {
      const r2 = await db
        .delete(notificationsTable)
        .where(inArray(notificationsTable.postId, seedPostIds));
      notifTotal += (r2 as unknown as { rowCount?: number }).rowCount ?? 0;
    }
    if (seedContactIds.length) {
      const r3 = await db
        .delete(notificationsTable)
        .where(inArray(notificationsTable.contactId, seedContactIds));
      notifTotal += (r3 as unknown as { rowCount?: number }).rowCount ?? 0;
    }
    before.notifications = notifTotal;

    if (seedPostIds.length) {
      const r = await db.delete(postsTable).where(inArray(postsTable.id, seedPostIds));
      before.posts = (r as unknown as { rowCount?: number }).rowCount ?? seedPostIds.length;
    }
    if (seedContactIds.length) {
      const r = await db.delete(contactsTable).where(inArray(contactsTable.id, seedContactIds));
      before.contacts = (r as unknown as { rowCount?: number }).rowCount ?? seedContactIds.length;
    }

    const interDel = await db
      .delete(interactionsTable)
      .where(like(interactionsTable.userId, `${SEED_PREFIX}%`));
    before.interactions = (interDel as unknown as { rowCount?: number }).rowCount ?? 0;

    const followDel = await db
      .delete(followUpsTable)
      .where(like(followUpsTable.userId, `${SEED_PREFIX}%`));
    before.followUps = (followDel as unknown as { rowCount?: number }).rowCount ?? 0;

    const friendDel = await db
      .delete(friendshipsTable)
      .where(
        or(
          like(friendshipsTable.userId, `${SEED_PREFIX}%`),
          like(friendshipsTable.friendUserId, `${SEED_PREFIX}%`),
        ),
      );
    before.friendships = (friendDel as unknown as { rowCount?: number }).rowCount ?? 0;

    const userDel = await db.delete(usersTable).where(like(usersTable.id, `${SEED_PREFIX}%`));
    before.users = (userDel as unknown as { rowCount?: number }).rowCount ?? 0;

    res.json({ ok: true, deleted: before });
  } catch (err) {
    req.log?.error({ err }, "admin wipe-seed-data failed");
    res.status(500).json({ error: "cleanup failed", message: (err as Error).message });
  }
});

export default router;
