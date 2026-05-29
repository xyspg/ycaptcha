import { createOpenAPI } from "fumadocs-openapi/server";
import { config } from "@/lib/config";
import openapiDocument from "../openapi.json";

// biome-ignore lint/suspicious/noTemplateCurlyInString: literal placeholder, replaced below
const API_URL_PLACEHOLDER = "${NEXT_PUBLIC_API_URL}";

const document = {
  ...openapiDocument,
  servers: openapiDocument.servers.map((server) => ({
    ...server,
    // The captcha API lives on its own origin (api.*) after the split, not the
    // marketing apex, so point the documented base URL at the API host.
    url: server.url === API_URL_PLACEHOLDER ? config.apiUrl : server.url,
  })),
};

export const openapi = createOpenAPI({
  input: () => ({
    "./openapi.json": document as never,
  }),
});
