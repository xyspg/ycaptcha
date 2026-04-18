import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
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
        // Order matters: any DB step that can fail (FK, network) must run
        // BEFORE R2 deletes. R2 deletes are unrecoverable — a thrown DB
        // error after wiping R2 would leave the user row alive with dead
        // image/audio URLs.
        //
        // 1) Pre-delete puzzles. puzzle.image_set_id is `onDelete: "restrict"`,
        //    so the user → imageSet cascade would otherwise FK-violate.
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

        // 2) Collect R2 URLs while DB rows still exist.
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

        // 3) R2 delete last. Failures are unrecoverable orphans but the DB
        //    cascade following this hook will still succeed.
        const keys = [
          ...imageRows
            .map((r) => r.url)
            .filter((u) => !u.includes("/samples/")),
          ...audioRows.map((r) => r.url),
        ].map(r2KeyFromUrl);

        const results = await Promise.allSettled(keys.map(deleteFromR2));
        for (let i = 0; i < results.length; i++) {
          if (results[i].status === "rejected") {
            console.warn(
              `R2 cleanup failed for user ${user.id} key ${keys[i]}:`,
              (results[i] as PromiseRejectedResult).reason,
            );
          }
        }
      },
    },
  },

  plugins: [passkey(), nextCookies()],
});
