import { passkey } from "@better-auth/passkey";
import * as Sentry from "@sentry/nextjs";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  audio,
  galleryItem,
  image,
  imageSet,
  puzzle,
  site,
} from "@/lib/db/app-schema";
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
        if (user.email === DEMOUSER && process.env.NODE_ENV === "production") {
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

        const [imageRows, audioRows, galleryRows] = await Promise.all([
          db
            .select({ url: image.url, contentHash: image.contentHash })
            .from(image)
            .innerJoin(imageSet, eq(imageSet.id, image.imageSetId))
            .where(eq(imageSet.userId, user.id)),
          db
            .select({ url: audio.url })
            .from(audio)
            .where(eq(audio.userId, user.id)),
          db
            .select({ images: galleryItem.images })
            .from(galleryItem)
            .where(eq(galleryItem.authorId, user.id)),
        ]);

        // galleryItem.authorId FK is `set null`, so the rows survive user
        // deletion by default. Drop them explicitly here so the user's
        // published content actually goes away.
        await db.delete(galleryItem).where(eq(galleryItem.authorId, user.id));

        // Cross-user contentHash dedup means other users' image rows may
        // reference the same R2 objects we're about to delete. Find those
        // and skip their URLs so forkers' image sets don't 404.
        const hashesToCheck = imageRows
          .map((r) => r.contentHash)
          .filter((h): h is string => h !== null);
        const stillReferenced =
          hashesToCheck.length > 0
            ? new Set(
                (
                  await db
                    .select({ contentHash: image.contentHash })
                    .from(image)
                    .innerJoin(imageSet, eq(imageSet.id, image.imageSetId))
                    .where(
                      and(
                        inArray(image.contentHash, hashesToCheck),
                        ne(imageSet.userId, user.id),
                      ),
                    )
                ).map((r) => r.contentHash),
              )
            : new Set<string>();

        // Dedup — user may have the same content in multiple of their own
        // image_sets (within-user cross-set dedup reuses the same R2 URL),
        // and we don't want to DELETE the same key twice (second attempt
        // 404s and trips a false Sentry alert).
        const keys = [
          ...new Set(
            [
              ...imageRows
                .filter(
                  (r) =>
                    r.contentHash === null ||
                    !stillReferenced.has(r.contentHash),
                )
                .map((r) => r.url)
                .filter((u) => !u.includes("/samples/")),
              ...audioRows.map((r) => r.url),
              ...galleryRows.flatMap((r) => r.images.map((img) => img.url)),
            ].map(r2KeyFromUrl),
          ),
        ];

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
