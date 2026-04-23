import { passkey } from "@better-auth/passkey";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendExistingAccountEmail } from "@/lib/email/send-existing-account-email";
import { sendVerificationEmail } from "@/lib/email/send-verification-email";
import { env } from "@/lib/env";
import { redis } from "@/lib/redis";
import { cleanupUserOnDelete } from "./cleanup";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  secondaryStorage: {
    get: async (key) => redis.get<string>(`ba:${key}`),
    set: async (key, value, ttl) => {
      if (ttl) await redis.set(`ba:${key}`, value, { ex: ttl });
      else await redis.set(`ba:${key}`, value);
    },
    delete: async (key) => {
      await redis.del(`ba:${key}`);
    },
  },

  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
    window: 60,
    max: 100,
    customRules: {
      "/send-verification-email": { window: 60, max: 20 },
      "/sign-up/email": { window: 600, max: 5 },
      "/sign-in/email": { window: 60, max: 10 },
      "/forget-password": { window: 600, max: 3 },
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    onExistingUserSignUp: async ({ user }, request) => {
      await auth.api.signInMagicLink({
        body: { email: user.email, callbackURL: "/dashboard" },
        headers: request?.headers ?? new Headers(),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }, request) => {
      await sendVerificationEmail({ user, url, request });
    },
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

        await cleanupUserOnDelete(user.id);
      },
    },
  },

  plugins: [
    passkey(),
    magicLink({
      expiresIn: 60 * 15,
      disableSignUp: true,
      sendMagicLink: async ({ email, url }, ctx) => {
        await sendExistingAccountEmail({
          user: { email },
          loginUrl: url,
          request: ctx?.request,
        });
      },
    }),
    nextCookies(),
  ],
});
