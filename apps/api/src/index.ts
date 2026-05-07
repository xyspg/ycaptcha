import { app } from "./app";

export type { ApiApp } from "./app";
export default {
  port: Number(Bun.env.PORT ?? 3001),
  fetch: app.fetch,
};
