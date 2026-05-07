import { zValidator } from "@hono/zod-validator";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db } from "../lib/db";
import { puzzle, site } from "../lib/db/app-schema";
import { type AuthVariables, requireSession } from "../middleware/auth";
import { createSiteSchema, updateSiteSchema } from "../schemas/sites";

const sites = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireSession)
  .get("/", async (c) => {
    const user = c.get("user");
    const rows = await db
      .select()
      .from(site)
      .where(eq(site.userId, user.id))
      .orderBy(site.createdAt);
    return c.json({ sites: rows });
  })
  .get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const [row] = await db
      .select()
      .from(site)
      .where(and(eq(site.id, id), eq(site.userId, user.id)));
    if (!row) return c.json({ error: "Site not found" }, 404);
    return c.json({ site: row });
  })
  .post("/", zValidator("json", createSiteSchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");
    const [row] = await db
      .insert(site)
      .values({ userId: user.id, name: data.name, domain: data.domain })
      .returning();
    return c.json({ site: row, message: "Site created" }, 201);
  })
  .patch("/:id", zValidator("json", updateSiteSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const [row] = await db
      .update(site)
      .set({ name: data.name, domain: data.domain })
      .where(and(eq(site.id, id), eq(site.userId, user.id)))
      .returning();
    if (!row) return c.json({ error: "Site not found" }, 404);
    return c.json({ site: row, message: "Site updated" });
  })
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const result = await db
      .delete(site)
      .where(and(eq(site.id, id), eq(site.userId, user.id)))
      .returning({ id: site.id });
    if (result.length === 0) return c.json({ error: "Site not found" }, 404);
    return c.json({ message: "Site deleted" });
  })
  .post("/:id/regenerate-keys", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const [row] = await db
      .update(site)
      .set({ siteKey: `pk_${nanoid(32)}`, secretKey: `sk_${nanoid(32)}` })
      .where(and(eq(site.id, id), eq(site.userId, user.id)))
      .returning();
    if (!row) return c.json({ error: "Site not found" }, 404);
    return c.json({ site: row, message: "Keys regenerated" });
  })
  .delete("/:id/puzzles/:puzzleId", async (c) => {
    const user = c.get("user");
    const siteId = c.req.param("id");
    const puzzleId = c.req.param("puzzleId");
    const result = await db
      .delete(puzzle)
      .where(
        and(
          eq(puzzle.id, puzzleId),
          eq(puzzle.siteId, siteId),
          inArray(
            puzzle.siteId,
            db
              .select({ id: site.id })
              .from(site)
              .where(eq(site.userId, user.id)),
          ),
        ),
      )
      .returning({ id: puzzle.id });
    if (result.length === 0) return c.json({ error: "Puzzle not found" }, 404);
    return c.json({ message: "Puzzle deleted" });
  });

export { sites };
