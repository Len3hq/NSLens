import { Router, type IRouter, type Request, type Response } from "express";
import { sign } from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openDiscordDM, sendDiscordDM } from "../lib/discordBot";


const router: IRouter = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? "";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ?? "";
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI ?? "";
const NS_AUTH_API_KEY = process.env.NS_AUTH_API_KEY ?? "";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "";
const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL ?? "").replace(/\/$/, "");

const JWT_EXPIRY = "7d";
const STATE_COOKIE = "discord_oauth_state";

router.get("/auth/discord", (_req: Request, res: Response) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) {
    res.status(500).json({ error: "Discord OAuth not configured" });
    return;
  }
  const state = randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
  });
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify applications.commands",
    integration_type: "1",
    state,
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

router.get("/auth/discord/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query as Record<string, string>;
  const storedState = req.cookies?.[STATE_COOKIE];

  if (!code || !state || state !== storedState) {
    res.redirect(`${PUBLIC_APP_URL}/login?error=invalid_state`);
    return;
  }
  res.clearCookie(STATE_COOKIE);

  // Exchange code for Discord access token
  let discordAccessToken: string;
  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => "(unreadable)");
      throw new Error(`Discord token exchange failed: ${tokenRes.status} — ${body}`);
    }
    const tokenData = (await tokenRes.json()) as { access_token: string };
    discordAccessToken = tokenData.access_token;
  } catch (err) {
    req.log?.error({ err }, "Discord token exchange failed");
    res.redirect(`${PUBLIC_APP_URL}/login?error=discord_error`);
    return;
  }

  // Fetch Discord user profile
  let discordId: string;
  let discordUsername: string;
  try {
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${discordAccessToken}` },
    });
    if (!userRes.ok) throw new Error(`Discord user fetch failed: ${userRes.status}`);
    const discordUser = (await userRes.json()) as { id: string; username: string };
    discordId = discordUser.id;
    discordUsername = discordUser.username;
  } catch (err) {
    req.log?.error({ err }, "Discord user fetch failed");
    res.redirect(`${PUBLIC_APP_URL}/login?error=discord_error`);
    return;
  }

  // Verify NS membership
  let nsProfile: { member: boolean; name?: string | null; username?: string | null; email?: string | null };
  try {
    const nsRes = await fetch("https://api.ns.com/api/v1/ns-auth/verify/", {
      method: "POST",
      headers: {
        "X-Api-Key": NS_AUTH_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ discordId }),
    });
    if (!nsRes.ok) throw new Error(`NS Auth returned ${nsRes.status}`);
    nsProfile = (await nsRes.json()) as typeof nsProfile;
  } catch (err) {
    req.log?.error({ err }, "NS Auth verification failed");
    res.redirect(`${PUBLIC_APP_URL}/login?error=ns_error`);
    return;
  }

  if (!nsProfile.member) {
    res.redirect(`${PUBLIC_APP_URL}/login?error=not_member`);
    return;
  }

  // Upsert user in local DB
  try {
    await db
      .insert(usersTable)
      .values({
        id: discordId,
        email: nsProfile.email ?? null,
        name: nsProfile.name ?? discordUsername,
        username: nsProfile.username ?? null,
        discordUsername,
      })
      .onConflictDoUpdate({
        target: usersTable.id,
        set: {
          email: nsProfile.email ?? null,
          name: nsProfile.name ?? discordUsername,
          discordUsername,
        },
      });
  } catch (err) {
    req.log?.error({ err }, "DB upsert failed during auth callback");
    res.redirect(`${PUBLIC_APP_URL}/login?error=server_error`);
    return;
  }

  // Fire-and-forget: send welcome DM on first install. Works now because the
  // user just went through the user-install OAuth flow (integration_type=1).
  void (async () => {
    try {
      const [saved] = await db
        .select({ discordDmChannelId: usersTable.discordDmChannelId })
        .from(usersTable)
        .where(eq(usersTable.id, discordId))
        .limit(1);
      if (saved?.discordDmChannelId) return;
      const channelId = await openDiscordDM(discordId);
      if (!channelId) return;
      await sendDiscordDM(
        channelId,
        "Hey! I'm the NS Lens bot. You can DM me here anytime to manage your network — save notes about people, ask questions about your contacts, or post to the Founders Hub.\n\nSend `/help` to see what I can do.",
      );
      await db
        .update(usersTable)
        .set({ discordDmChannelId: channelId })
        .where(eq(usersTable.id, discordId));
    } catch (err) {
      req.log?.error({ err }, "discord welcome DM failed");
    }
  })();

  const token = sign({ sub: discordId }, SESSION_SECRET, { expiresIn: JWT_EXPIRY });
  res.redirect(`${PUBLIC_APP_URL}/auth/callback#token=${token}`);
});

export default router;
