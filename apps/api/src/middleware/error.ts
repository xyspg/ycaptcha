import { APIError } from "better-auth/api";
import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  if (err instanceof z.ZodError) {
    return c.json(
      { error: "Validation failed", details: z.flattenError(err).fieldErrors },
      400,
    );
  }

  if (err instanceof APIError) {
    return c.json({ error: err.message }, err.statusCode as 400 | 401 | 403);
  }

  console.error("[error]", err);
  return c.json({ error: "Internal server error" }, 500);
};
