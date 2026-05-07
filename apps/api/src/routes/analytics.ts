import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  getDailySeries,
  getDashboardStats,
  getPuzzleStats,
  getSiteStats,
  listPuzzleStatsForUser,
} from "../lib/analytics";
import { db } from "../lib/db";
import { puzzle, site } from "../lib/db/app-schema";
import { type AuthVariables, requireSession } from "../middleware/auth";

const analytics = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireSession)
  .get("/dashboard", async (c) => {
    const user = c.get("user");
    const stats = await getDashboardStats(user.id);
    return c.json({ stats });
  })
  .get("/sites/:id", async (c) => {
    const user = c.get("user");
    const siteId = c.req.param("id");
    const [owned] = await db
      .select({ id: site.id })
      .from(site)
      .where(and(eq(site.id, siteId), eq(site.userId, user.id)));
    if (!owned) return c.json({ error: "Site not found" }, 404);
    const stats = await getSiteStats(siteId, user.id);
    return c.json({ stats });
  })
  .get("/puzzles", async (c) => {
    const user = c.get("user");
    const stats = await listPuzzleStatsForUser(user.id);
    return c.json({ stats: Object.fromEntries(stats) });
  })
  .get("/puzzles/:id", async (c) => {
    const user = c.get("user");
    const puzzleId = c.req.param("id");
    const [owned] = await db
      .select({ id: puzzle.id })
      .from(puzzle)
      .innerJoin(
        site,
        and(eq(site.id, puzzle.siteId), eq(site.userId, user.id)),
      )
      .where(eq(puzzle.id, puzzleId));
    if (!owned) return c.json({ error: "Puzzle not found" }, 404);
    const stats = await getPuzzleStats(puzzleId);
    return c.json({ stats });
  })
  .get("/daily", async (c) => {
    const user = c.get("user");
    const siteId = c.req.query("siteId");
    const puzzleId = c.req.query("puzzleId");

    if (puzzleId) {
      const [owned] = await db
        .select({ id: puzzle.id })
        .from(puzzle)
        .innerJoin(
          site,
          and(eq(site.id, puzzle.siteId), eq(site.userId, user.id)),
        )
        .where(eq(puzzle.id, puzzleId));
      if (!owned) return c.json({ error: "Puzzle not found" }, 404);
      const series = await getDailySeries({ puzzleId });
      return c.json({ series });
    }
    if (siteId) {
      const [owned] = await db
        .select({ id: site.id })
        .from(site)
        .where(and(eq(site.id, siteId), eq(site.userId, user.id)));
      if (!owned) return c.json({ error: "Site not found" }, 404);
      const series = await getDailySeries({ siteId, userId: user.id });
      return c.json({ series });
    }
    const series = await getDailySeries({ userId: user.id });
    return c.json({ series });
  });

export { analytics };
