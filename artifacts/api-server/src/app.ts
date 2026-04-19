import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : null;

export const llmRateLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as express.Request & { userId?: string }).userId ?? req.ip ?? "anon",
  message: { error: "Too many requests, please try again later." },
  skip: () => process.env.NODE_ENV === "test",
});

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      if (!ALLOWED_ORIGINS) return cb(null, true);
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error("CORS: origin not allowed"));
    },
  }),
);
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
// Cookie parser needed for Discord OAuth state validation
app.use(cookieParser());
// Default 100 KB for all routes. /ingest/image overrides this with 20 MB.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/api", router);

export default app;
