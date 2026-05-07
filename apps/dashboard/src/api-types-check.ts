// Phase 0 verification: confirm `type ApiApp` flows from apps/api → packages/shared → here.
// Once apps/dashboard adds `hono` as a dep, switch this to:
//   import { hc } from "hono/client";
//   const c = hc<ApiApp>("/");
// For now, just spot-check the type import resolves.
import type { ApiApp } from "@ycaptcha/shared";

export type _ApiAppCheck = ApiApp;
