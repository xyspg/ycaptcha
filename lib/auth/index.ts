import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
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

					await Promise.allSettled(
						images
							.filter((img) => !img.url.includes("/samples/"))
							.map((img) => deleteFromR2(r2KeyFromUrl(img.url))),
					);
				}
			},
		},
	},

	plugins: [passkey(), nextCookies()],
});
