import { Router, type IRouter } from "express";
import {
  db,
  contactsTable,
  interactionsTable,
  notificationsTable,
  postsTable,
} from "@workspace/db";

// One-shot admin endpoint to wipe ALL contacts, interactions, notifications,
// and posts from production. Users and friendships are left alone. Guarded by
// a hardcoded throwaway token; this route is intended to be called once and
// then deleted from the codebase.
const ADMIN_TOKEN = "9f5a3e217c1d4b88a06e72c4b9e0d1f3a8e6b27dc5403f91";

const router: IRouter = Router();

router.post("/admin/wipe-all-content", async (req, res) => {
  const provided = req.header("x-admin-token");
  if (!provided || provided !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const n = await db.delete(notificationsTable);
    const i = await db.delete(interactionsTable);
    const c = await db.delete(contactsTable);
    const p = await db.delete(postsTable);
    res.json({
      ok: true,
      deleted: {
        notifications: (n as unknown as { rowCount?: number }).rowCount ?? 0,
        interactions: (i as unknown as { rowCount?: number }).rowCount ?? 0,
        contacts: (c as unknown as { rowCount?: number }).rowCount ?? 0,
        posts: (p as unknown as { rowCount?: number }).rowCount ?? 0,
      },
    });
  } catch (err) {
    req.log?.error({ err }, "admin wipe-all-content failed");
    res.status(500).json({ error: "cleanup failed", message: (err as Error).message });
  }
});

export default router;
