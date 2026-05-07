import path from "node:path";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { getFrameAncestors } from "./csp";
import { env } from "./env";

const ROOT = path.resolve(import.meta.dirname, "../..");
const LOADER_DIR = path.join(ROOT, "dist/loader");
const CLIENT_DIR = path.join(ROOT, "dist/client");

async function readClientEntry(): Promise<string> {
  const dirEntries = await Array.fromAsync(
    new Bun.Glob("widget-app.*.js").scan({ cwd: CLIENT_DIR }),
  );
  if (dirEntries.length === 0) {
    throw new Error(
      `[widget] no built widget-app.*.js in ${CLIENT_DIR}. Run "bun run build:client".`,
    );
  }
  return dirEntries[0]!;
}

async function readClientCss(): Promise<string | null> {
  const dirEntries = await Array.fromAsync(
    new Bun.Glob("widget.*.css").scan({ cwd: CLIENT_DIR }),
  );
  return dirEntries[0] ?? null;
}

async function widgetHtml(siteKey: string): Promise<string> {
  const [jsName, cssName] = await Promise.all([
    readClientEntry(),
    readClientCss(),
  ]);
  const cssTag = cssName
    ? `<link rel="stylesheet" href="/widget-assets/${cssName}">`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
    <title>yCAPTCHA</title>
    ${cssTag}
  </head>
  <body>
    <div id="root" data-sitekey="${siteKey.replace(/"/g, "&quot;")}"></div>
    <script type="module" src="/widget-assets/${jsName}"></script>
  </body>
</html>`;
}

const app = new Hono()
  .use("*", logger())
  .get("/health", (c) => c.json({ ok: true, service: "widget" }))
  .get("/widget/:siteKey", async (c) => {
    const siteKey = c.req.param("siteKey");
    const [html, frameAncestors] = await Promise.all([
      widgetHtml(siteKey),
      getFrameAncestors(siteKey),
    ]);
    c.header("Content-Security-Policy", `frame-ancestors ${frameAncestors}`);
    c.header("X-Content-Type-Options", "nosniff");
    return c.html(html);
  })
  .get("/captcha.js", async (c) => {
    const file = Bun.file(path.join(LOADER_DIR, "captcha.js"));
    if (!(await file.exists())) {
      return c.text("Loader not built. Run `bun run build:loader`.", 500);
    }
    c.header("Content-Type", "application/javascript; charset=utf-8");
    c.header("Cache-Control", "public, max-age=300");
    return c.body(file.stream());
  })
  .get("/widget-assets/*", async (c) => {
    const requested = c.req.path.replace(/^\/widget-assets\//, "");
    const safe = path.posix.normalize(requested).replace(/^\/+/, "");
    if (safe.includes("..") || path.isAbsolute(safe)) {
      return c.text("forbidden", 403);
    }
    const file = Bun.file(path.join(CLIENT_DIR, safe));
    if (!(await file.exists())) return c.text("not found", 404);
    if (safe.endsWith(".js")) {
      c.header("Content-Type", "application/javascript; charset=utf-8");
    } else if (safe.endsWith(".css")) {
      c.header("Content-Type", "text/css; charset=utf-8");
    }
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    return c.body(file.stream());
  });

export default {
  port: env.PORT,
  fetch: app.fetch,
};
