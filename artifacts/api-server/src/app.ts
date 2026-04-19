import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : null;

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

if (process.env.NODE_ENV === "production") {
  const publicDir = path.join(process.cwd(), "public");
  app.use(express.static(publicDir));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

export default app;
