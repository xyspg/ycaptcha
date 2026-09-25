// better-auth's session cookie. The __Secure- prefix is used when
// BETTER_AUTH_URL is https. Shared by next.config.ts and proxy.ts, which only
// check for presence and must stay free of the better-auth runtime.
export const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];
