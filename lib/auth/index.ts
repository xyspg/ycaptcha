import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { passkey } from "@better-auth/passkey";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/lib/env";

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
        // Clean up R2 images before cascade delete removes DB records
        const { eq } = await import("drizzle-orm");
        const { image, imageSet } = await import("@/lib/db/app-schema");
        const { deleteFromR2, r2KeyFromUrl } = await import("@/lib/r2");

        const sets = await db
          .select({ id: imageSet.id })
          .from(imageSet)
          .where(eq(imageSet.userId, user.id));

        if (sets.length > 0) {
          const { inArray } = await import("drizzle-orm");
          const images = await db
            .select({ url: image.url })
            .from(image)
            .where(inArray(image.imageSetId, sets.map((s) => s.id)));

          await Promise.allSettled(
            images.map((img) => deleteFromR2(r2KeyFromUrl(img.url))),
          );
        }
      },
    },
  },

  plugins: [passkey(), nextCookies()],
});
