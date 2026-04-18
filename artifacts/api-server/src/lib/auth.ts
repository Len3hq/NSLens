import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId as string | undefined || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  // Upsert user record on first contact
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (existing.length === 0) {
      let email: string | null = null;
      let name: string | null = null;
      try {
        const u = await clerkClient.users.getUser(userId);
        email = u.primaryEmailAddress?.emailAddress ?? null;
        name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || null;
      } catch {
        // ignore
      }
      await db.insert(usersTable).values({ id: userId, email, name }).onConflictDoNothing();
    }
  } catch (err) {
    req.log?.warn({ err }, "user upsert failed");
  }
  next();
}
