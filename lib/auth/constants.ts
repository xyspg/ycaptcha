// Shared by next.config.ts, proxy.ts and requireSession(). Keep this file free
// of imports: the proxy and next.config must not load the better-auth runtime.

// better-auth's session cookie. The __Secure- prefix is used when
// BETTER_AUTH_URL is https.
export const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

// Set by the proxy on /dashboard requests so requireSession() can send the
// user back to the page they asked for after signing in.
export const PATHNAME_HEADER = "x-pathname";
