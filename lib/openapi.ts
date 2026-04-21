import { createOpenAPI } from "fumadocs-openapi/server";
import openapiDocument from "../openapi.json";

export const openapi = createOpenAPI({
  input: () => ({
    "./openapi.json": openapiDocument as never,
  }),
});
