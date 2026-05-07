import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { env } from "../env";
import { db } from "../lib/db";
import { audio, image, imageSet, puzzle, site } from "../lib/db/app-schema";
import { type AuthVariables, requireSession } from "../middleware/auth";

const ONBOARDING_DISMISSED_COOKIE = "ycaptcha-onboarding-dismissed";

const onboarding = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireSession)
  .get("/", async (c) => {
    const user = c.get("user");
    const dismissed = getCookie(c, ONBOARDING_DISMISSED_COOKIE) === "1";
    if (dismissed) {
      return c.json({ dismissed: true, progress: null });
    }
    const [firstSiteRow, firstImageRow, firstAudioRow, firstPuzzleRow] =
      await Promise.all([
        db
          .select({ id: site.id })
          .from(site)
          .where(eq(site.userId, user.id))
          .orderBy(desc(site.createdAt))
          .limit(1),
        db
          .select({ id: image.id })
          .from(image)
          .innerJoin(imageSet, eq(image.imageSetId, imageSet.id))
          .where(eq(imageSet.userId, user.id))
          .limit(1),
        db
          .select({ id: audio.id })
          .from(audio)
          .where(eq(audio.userId, user.id))
          .limit(1),
        db
          .select({ id: puzzle.id })
          .from(puzzle)
          .innerJoin(site, eq(puzzle.siteId, site.id))
          .where(eq(site.userId, user.id))
          .limit(1),
      ]);
    return c.json({
      dismissed: false,
      progress: {
        hasSite: firstSiteRow.length > 0,
        hasContent: firstImageRow.length > 0 || firstAudioRow.length > 0,
        hasPuzzle: firstPuzzleRow.length > 0,
        firstSiteId: firstSiteRow[0]?.id ?? null,
      },
    });
  })
  .post("/dismiss", async (c) => {
    setCookie(c, ONBOARDING_DISMISSED_COOKIE, "1", {
      httpOnly: false,
      sameSite: "Lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      domain: env.AUTH_COOKIE_DOMAIN,
    });
    return c.json({ message: "Dismissed" });
  });

export { onboarding };
