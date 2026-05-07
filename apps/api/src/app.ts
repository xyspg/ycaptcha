import { Hono } from "hono";

export const app = new Hono()
  .get("/health", (c) => c.json({ ok: true, service: "api" }))
  .get("/api/v0/ping", (c) => c.json({ pong: true }));

export type ApiApp = typeof app;
