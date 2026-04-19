import { verify } from "jsonwebtoken";
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
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  let userId: string;
  try {
    const payload = verify(token, process.env.SESSION_SECRET ?? "") as { sub?: string };
    if (!payload.sub) throw new Error("missing sub");
    userId = payload.sub;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.userId = userId;

  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (existing.length === 0) {
      res.status(401).json({ error: "Account no longer exists" });
      return;
    }
  } catch (err) {
    req.log?.error({ err }, "user lookup failed — rejecting request");
    res.status(503).json({ error: "Service temporarily unavailable" });
    return;
  }

  next();
}
