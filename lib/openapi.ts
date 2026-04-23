import { createOpenAPI } from "fumadocs-openapi/server";
import { config } from "@/lib/config";
import openapiDocument from "../openapi.json";

const SITE_URL_PLACEHOLDER = "${NEXT_PUBLIC_SITE_URL}";

const document = {
  ...openapiDocument,
  servers: openapiDocument.servers.map((server) => ({
    ...server,
    url: server.url === SITE_URL_PLACEHOLDER ? config.siteUrl : server.url,
  })),
};

export const openapi = createOpenAPI({
  input: () => ({
    "./openapi.json": document as never,
  }),
});
