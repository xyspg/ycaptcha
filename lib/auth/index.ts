import { passkey } from "@better-auth/passkey";
import * as Sentry from "@sentry/nextjs";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { image, imageSet } from "@/lib/db/app-schema";
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

        // clean up R2
        const sets = await db
          .select({ id: imageSet.id })
          .from(imageSet)
          .where(eq(imageSet.userId, user.id));

        if (sets.length > 0) {
          const images = await db
            .select({ url: image.url })
            .from(image)
            .where(
              inArray(
                image.imageSetId,
                sets.map((s) => s.id),
              ),
            );

          const keysToDelete = images
            .filter((img) => !img.url.includes("/samples/"))
            .map((img) => r2KeyFromUrl(img.url));

          const results = await Promise.allSettled(
            keysToDelete.map(deleteFromR2),
          );

          const failedKeys = keysToDelete.filter(
            (_, i) => results[i].status === "rejected",
          );

          const failedReasons = results
            .filter((r) => r.status === "rejected")
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
        }
      },
    },
  },

  plugins: [passkey(), nextCookies()],
});
