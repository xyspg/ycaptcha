import { formatter } from "@lingui/format-po";

/** @type {import('@lingui/conf').LinguiConfig} */
export default {
  locales: ["en", "ja", "zh-CN"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "<rootDir>/src/i18n/locales/{locale}/messages",
      include: ["src"],
    },
  ],
  format: formatter({ origins: false, lineNumbers: false }),
  compileNamespace: "ts",
};
