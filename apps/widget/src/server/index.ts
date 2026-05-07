import { Hono } from "hono";

const app = new Hono()
  .get("/health", (c) => c.json({ ok: true, service: "widget" }))
  .get("/widget/:siteKey", (c) => {
    const siteKey = c.req.param("siteKey");
    return c.html(
      `<!doctype html><html><head><meta charset="utf-8"><title>yCAPTCHA widget — ${siteKey}</title></head><body><div id="root"></div></body></html>`,
    );
  });

export default {
  port: Number(process.env.PORT ?? 3002),
  fetch: app.fetch,
};
