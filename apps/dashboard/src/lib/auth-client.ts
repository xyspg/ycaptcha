import { passkeyClient } from "@better-auth/passkey/client";
import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: { credentials: "include" },
  plugins: [passkeyClient(), magicLinkClient()],
});

export const { useSession, signIn, signOut, signUp } = authClient;
