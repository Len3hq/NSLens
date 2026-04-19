import express from "express";
import rateLimit from "express-rate-limit";

export const llmRateLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as express.Request & { userId?: string }).userId ?? req.ip ?? "anon",
  message: { error: "Too many requests, please try again later." },
  skip: () => process.env.NODE_ENV === "test",
});
