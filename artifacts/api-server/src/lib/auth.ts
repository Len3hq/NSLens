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
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;

  // Check the local user record. If missing, only recreate it when Clerk
  // confirms the account still exists. This prevents "ghost" sessions for
  // accounts that were deleted from Clerk: instead of silently re-inserting
  // the row (which used to let deleted users keep using the API), we reject.
  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (existing.length === 0) {
      let clerkUser;
      try {
        clerkUser = await clerkClient.users.getUser(userId);
      } catch {
        // User no longer exists in Clerk — session is stale / account was deleted.
        res.status(401).json({ error: "Account no longer exists" });
        return;
      }
      const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
      const name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        clerkUser.username ||
        null;
      await db
        .insert(usersTable)
        .values({ id: userId, email, name })
        .onConflictDoNothing();
    }
  } catch (err) {
    req.log?.warn({ err }, "user lookup failed");
  }
  next();
}
