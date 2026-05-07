import { passkey } from "@better-auth/passkey";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { env } from "../../env";
import { db } from "../db";
import * as schema from "../db/schema";
import { sendExistingAccountEmail } from "../email/send-existing-account-email";
import { sendResetPasswordEmail } from "../email/send-reset-password-email";
import { sendVerificationEmail } from "../email/send-verification-email";
import { redis } from "../redis";
import { cleanupUserOnDelete } from "./cleanup";

const trustedOrigins =
  env.AUTH_TRUSTED_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean) ?? [];

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  advanced: env.AUTH_COOKIE_DOMAIN
    ? {
        crossSubDomainCookies: {
          enabled: true,
          domain: env.AUTH_COOKIE_DOMAIN,
        },
        defaultCookieAttributes: {
          sameSite: "lax",
          secure: env.NODE_ENV === "production",
        },
      }
    : undefined,

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
      "/request-password-reset": { window: 600, max: 3 },
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }, request) => {
      void sendResetPasswordEmail({ user, url, request }).catch((error) => {
        console.error("[auth] failed to send password reset email", error);
      });
    },
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

  socialProviders:
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
          },
        }
      : undefined,

  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const DEMOUSER = "demo@example.com";
        if (user.email === DEMOUSER && env.NODE_ENV === "production") {
          throw new APIError("BAD_REQUEST", {
            message: "unable to delete demo user",
          });
        }

        await cleanupUserOnDelete(user.id);
      },
    },
  },

  plugins: [
    passkey({
      rpID: env.PASSKEY_RP_ID,
      rpName: "yCAPTCHA",
    }),
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
  ],
});

export type Auth = typeof auth;
