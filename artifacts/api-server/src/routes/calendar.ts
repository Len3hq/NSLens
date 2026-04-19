import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { requireAuth } from "../lib/auth";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { listAllFutureFollowUps } from "./followups";

const router: IRouter = Router();

function publicAppUrl(path: string): string {
  const base =
    process.env.PUBLIC_APP_URL ||
    process.env.PUBLIC_API_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "") ||
    "http://localhost:5000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

async function getOrCreateToken(userId: string): Promise<string> {
  const [u] = await db
    .select({ token: usersTable.calendarFeedToken })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (u?.token) return u.token;
  const token = crypto.randomBytes(24).toString("base64url");
  await db.update(usersTable).set({ calendarFeedToken: token }).where(eq(usersTable.id, userId));
  return token;
}

router.get("/me/calendar", requireAuth, async (req, res) => {
  const token = await getOrCreateToken(req.userId!);
  const httpUrl = publicAppUrl(`/api/calendar/${token}.ics`);
  const webcalUrl = httpUrl.replace(/^https?:/, "webcal:");
  res.json({
    httpUrl,
    webcalUrl,
    instructions:
      "Paste the webcal:// URL into Google Calendar (Other calendars → From URL), Apple Calendar (File → New Calendar Subscription), or Outlook (Add calendar → From web). Your follow-ups will sync automatically.",
  });
});

router.post("/me/calendar/rotate", requireAuth, async (req, res) => {
  const token = crypto.randomBytes(24).toString("base64url");
  await db
    .update(usersTable)
    .set({ calendarFeedToken: token })
    .where(eq(usersTable.id, req.userId!));
  const httpUrl = publicAppUrl(`/api/calendar/${token}.ics`);
  const webcalUrl = httpUrl.replace(/^https?:/, "webcal:");
  res.json({ httpUrl, webcalUrl });
});

// ---- the actual ICS feed (no auth, token-gated) ----
function escapeICS(s: string): string {
  // Strip CR characters first, then escape iCal special chars.
  // CRLF is the iCal line separator, so bare \r or \r\n in values would inject
  // new iCal lines. We remove \r entirely and encode \n as \\n (literal backslash-n).
  return s
    .replace(/\r/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatICSDate(d: Date): string {
  const iso = d.toISOString().replace(/[-:]/g, "");
  return iso.replace(/\.\d{3}Z$/, "Z");
}

router.get("/calendar/:token.ics", async (req, res) => {
  const token = req.params.token;
  if (!token || token.length < 10) {
    res.status(400).type("text/plain").send("bad token");
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.calendarFeedToken, token))
    .limit(1);
  if (!user) {
    res.status(404).type("text/plain").send("calendar not found");
    return;
  }
  const followUps = await listAllFutureFollowUps(user.id);
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Network Brain//Follow Ups//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Network Brain follow-ups",
    "X-WR-TIMEZONE:UTC",
  ];
  for (const f of followUps) {
    const start = f.dueAt;
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const summary = `Follow up with ${f.contactName ?? "contact"}${f.completedAt ? " ✓" : ""}`;
    const description = f.note ?? "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:followup-${f.id}@network-brain`,
      `DTSTAMP:${formatICSDate(now)}`,
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:${escapeICS(summary)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      `STATUS:${f.completedAt ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  res
    .type("text/calendar; charset=utf-8")
    .header("Cache-Control", "no-cache, must-revalidate")
    .send(lines.join("\r\n"));
});

export default router;
