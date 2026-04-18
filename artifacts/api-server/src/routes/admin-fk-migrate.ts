import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// Throwaway admin endpoint to add the foreign-key constraints to the
// production database. Will be removed immediately after the prod migration
// runs. Token is hardcoded and rotated each use; this file should not exist
// in main for more than one deploy cycle.
const ADMIN_TOKEN = "8c2f5a91e74d3b6602a18fd9c4e7b305f72a98061ebd34c5";

const router: IRouter = Router();

router.post("/admin/fk-migrate", async (req, res) => {
  if (req.header("x-admin-token") !== ADMIN_TOKEN) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  // First scrub any orphan rows that would violate the new constraints. We
  // already verified prod is largely clean, but this makes the migration
  // idempotent and self-healing.
  const scrubs = [
    `DELETE FROM contacts WHERE user_id NOT IN (SELECT id FROM users)`,
    `DELETE FROM interactions WHERE user_id NOT IN (SELECT id FROM users) OR contact_id NOT IN (SELECT id FROM contacts)`,
    `DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM users)`,
    `UPDATE notifications SET contact_id = NULL WHERE contact_id IS NOT NULL AND contact_id NOT IN (SELECT id FROM contacts)`,
    `UPDATE notifications SET post_id = NULL WHERE post_id IS NOT NULL AND post_id NOT IN (SELECT id FROM posts)`,
    `DELETE FROM posts WHERE author_id NOT IN (SELECT id FROM users)`,
    `DELETE FROM friendships WHERE user_id NOT IN (SELECT id FROM users) OR friend_user_id NOT IN (SELECT id FROM users)`,
    `UPDATE friendships SET contact_id = NULL WHERE contact_id IS NOT NULL AND contact_id NOT IN (SELECT id FROM contacts)`,
    `DELETE FROM follow_ups WHERE user_id NOT IN (SELECT id FROM users) OR contact_id NOT IN (SELECT id FROM contacts)`,
  ];

  // Each ALTER is wrapped to be idempotent — if the constraint already exists
  // we skip it, so re-running this endpoint is safe.
  const constraints: { table: string; name: string; ddl: string }[] = [
    { table: "contacts", name: "contacts_user_id_users_id_fk", ddl: `ALTER TABLE contacts ADD CONSTRAINT contacts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` },
    { table: "interactions", name: "interactions_user_id_users_id_fk", ddl: `ALTER TABLE interactions ADD CONSTRAINT interactions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` },
    { table: "interactions", name: "interactions_contact_id_contacts_id_fk", ddl: `ALTER TABLE interactions ADD CONSTRAINT interactions_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE` },
    { table: "notifications", name: "notifications_user_id_users_id_fk", ddl: `ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` },
    { table: "notifications", name: "notifications_contact_id_contacts_id_fk", ddl: `ALTER TABLE notifications ADD CONSTRAINT notifications_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL` },
    { table: "notifications", name: "notifications_post_id_posts_id_fk", ddl: `ALTER TABLE notifications ADD CONSTRAINT notifications_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL` },
    { table: "posts", name: "posts_author_id_users_id_fk", ddl: `ALTER TABLE posts ADD CONSTRAINT posts_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE` },
    { table: "friendships", name: "friendships_user_id_users_id_fk", ddl: `ALTER TABLE friendships ADD CONSTRAINT friendships_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` },
    { table: "friendships", name: "friendships_friend_user_id_users_id_fk", ddl: `ALTER TABLE friendships ADD CONSTRAINT friendships_friend_user_id_users_id_fk FOREIGN KEY (friend_user_id) REFERENCES users(id) ON DELETE CASCADE` },
    { table: "friendships", name: "friendships_contact_id_contacts_id_fk", ddl: `ALTER TABLE friendships ADD CONSTRAINT friendships_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL` },
    { table: "follow_ups", name: "follow_ups_user_id_users_id_fk", ddl: `ALTER TABLE follow_ups ADD CONSTRAINT follow_ups_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` },
    { table: "follow_ups", name: "follow_ups_contact_id_contacts_id_fk", ddl: `ALTER TABLE follow_ups ADD CONSTRAINT follow_ups_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE` },
  ];

  const out: { scrubbed: string[]; added: string[]; skipped: string[]; errors: string[] } = {
    scrubbed: [],
    added: [],
    skipped: [],
    errors: [],
  };

  try {
    for (const q of scrubs) {
      await db.execute(sql.raw(q));
      out.scrubbed.push(q.slice(0, 60));
    }
    for (const c of constraints) {
      const exists = await db.execute(sql`
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = ${c.name} AND table_name = ${c.table}
      `);
      if ((exists as unknown as { rows: unknown[] }).rows?.length) {
        out.skipped.push(c.name);
        continue;
      }
      try {
        await db.execute(sql.raw(c.ddl));
        out.added.push(c.name);
      } catch (err) {
        out.errors.push(`${c.name}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    res.status(500).json({ ...out, fatal: (err as Error).message });
    return;
  }

  res.json({ ok: true, ...out });
});

export default router;
