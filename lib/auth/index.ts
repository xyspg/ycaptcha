import { passkey } from "@better-auth/passkey";
import * as Sentry from "@sentry/nextjs";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { audio, image, imageSet, puzzle, site } from "@/lib/db/app-schema";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { deleteFromR2, r2KeyFromUrl } from "@/lib/r2";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },

  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const DEMOUSER = "demo@example.com";
        if (user.email === DEMOUSER) {
          throw new APIError("BAD_REQUEST", {
            message: "unable to delete demo user",
          });
        }

        await db
          .delete(puzzle)
          .where(
            inArray(
              puzzle.siteId,
              db
                .select({ id: site.id })
                .from(site)
                .where(eq(site.userId, user.id)),
            ),
          );

        const [imageRows, audioRows] = await Promise.all([
          db
            .select({ url: image.url })
            .from(image)
            .innerJoin(imageSet, eq(imageSet.id, image.imageSetId))
            .where(eq(imageSet.userId, user.id)),
          db
            .select({ url: audio.url })
            .from(audio)
            .where(eq(audio.userId, user.id)),
        ]);

        const keys = [
          ...imageRows
            .map((r) => r.url)
            .filter((u) => !u.includes("/samples/")),
          ...audioRows.map((r) => r.url),
        ].map(r2KeyFromUrl);

        const results = await Promise.allSettled(keys.map(deleteFromR2));
        const failedKeys = keys.filter(
          (_, i) => results[i].status === "rejected",
        );
        const failedReasons = results
          .filter((r): r is PromiseRejectedResult => r.status === "rejected")
          .map((r) => r.reason?.message);

        if (failedKeys.length > 0) {
          Sentry.captureMessage("R2 cleanup failed in account deletion", {
            level: "error",
            extra: {
              userId: user.id,
              failedCount: failedKeys.length,
              totalCount: results.length,
              failedKeys,
              failedReasons,
            },
          });
        }
      },
    },
  },

  plugins: [passkey(), nextCookies()],
});
