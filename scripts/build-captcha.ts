import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { minify } from "terser";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

if (!siteUrl) {
  throw new Error(
    "NEXT_PUBLIC_SITE_URL is required to build public/captcha.js",
  );
}

const sourcePath = path.join(process.cwd(), "captcha.js");
const outputPath = path.join(process.cwd(), "public", "captcha.js");

async function main() {
  const source = await readFile(sourcePath, "utf8");
  const code = source.replace(
    '"__NEXT_PUBLIC_SITE_URL__"',
    JSON.stringify(siteUrl),
  );
  const result = await minify(code, { compress: true, mangle: true });

  if (!result.code) {
    throw new Error("Failed to minify captcha.js");
  }

  await writeFile(outputPath, result.code);
}

void main();
