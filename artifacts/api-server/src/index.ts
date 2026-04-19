import app from "./app";
import { logger } from "./lib/logger";
import {
  getPublicWebhookUrl,
  getTelegramToken,
  getWebhookSecret,
  setTelegramWebhook,
} from "./lib/telegram";
import { startDiscordBot } from "./lib/discordBot";
import { backfillEmbeddings } from "./lib/embeddings";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Best-effort Telegram webhook registration. Safe to skip in environments
  // without a public URL or a bot token.
  if (getTelegramToken()) {
    const url = getPublicWebhookUrl();
    if (url) {
      const ok = await setTelegramWebhook(url, getWebhookSecret());
      logger.info({ url, ok }, "telegram webhook registration");
    } else {
      logger.warn("telegram bot token is set but no public URL was found");
    }
  }

  // Start Discord bot (Gateway WebSocket) if token is configured.
  startDiscordBot().catch((err) => logger.error({ err }, "discord bot failed to start"));

  // Backfill any contacts/interactions missing embeddings. Runs once on boot
  // and is a no-op when everything is already embedded.
  backfillEmbeddings()
    .then((r) => {
      if (r.contacts || r.interactions) {
        logger.info(r, "embedding backfill complete");
      }
    })
    .catch((err) => logger.error({ err }, "embedding backfill failed"));
});
