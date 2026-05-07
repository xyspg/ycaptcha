#!/usr/bin/env bun
/**
 * One-shot migration: read the legacy next-intl JSON dictionaries from the
 * monolith and emit Lingui PO files keyed by their nested JSON paths.
 *
 * After running this script the dashboard SPA can do:
 *   import { i18n } from "@/i18n/i18n";
 *   i18n.activate("en");
 * and call `t({ id: "dashboard.sites.title" })` (Lingui macro form).
 *
 * Run from apps/dashboard:
 *   bun run scripts/migrate-messages-to-po.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "../../..");
const MESSAGES_DIR = path.join(ROOT, "messages");
const OUT_DIR = path.resolve(import.meta.dir, "../src/i18n/locales");

const LOCALES = ["en", "ja", "zh-CN"] as const;

type JsonValue = string | { [k: string]: JsonValue };

function flatten(obj: JsonValue, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof obj === "string") {
    out.set(prefix, obj);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    for (const [sub, val] of flatten(v, key)) out.set(sub, val);
  }
  return out;
}

function escapePo(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function poFile(
  entries: Array<{ id: string; source: string; target: string }>,
) {
  const header = [
    'msgid ""',
    'msgstr ""',
    '"Content-Type: text/plain; charset=UTF-8\\n"',
    '"Language: \\n"',
    "",
  ].join("\n");
  const body = entries
    .map((e) =>
      [
        `#. ${e.source ? escapePo(e.source) : ""}`.trimEnd(),
        `msgid "${escapePo(e.id)}"`,
        `msgstr "${escapePo(e.target)}"`,
        "",
      ].join("\n"),
    )
    .join("\n");
  return `${header}${body}`;
}

const enRaw = JSON.parse(
  readFileSync(path.join(MESSAGES_DIR, "en.json"), "utf-8"),
) as JsonValue;
const enFlat = flatten(enRaw);
const ids = [...enFlat.keys()].sort();

for (const locale of LOCALES) {
  const raw = JSON.parse(
    readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf-8"),
  ) as JsonValue;
  const flat = flatten(raw);

  const entries = ids.map((id) => ({
    id,
    source: enFlat.get(id) ?? "",
    target: flat.get(id) ?? "",
  }));

  const dir = path.join(OUT_DIR, locale);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "messages.po"), poFile(entries));
  console.log(
    `[migrate] ${locale}: ${entries.length} keys → ${path.relative(
      process.cwd(),
      path.join(dir, "messages.po"),
    )}`,
  );
}
