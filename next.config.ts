import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import "./lib/env";

const captchaJsHash = createHash("sha384")
	.update(readFileSync(path.join(process.cwd(), "public/captcha.js")))
	.digest("base64");

const nextConfig: NextConfig = {
	env: {
		CAPTCHA_JS_INTEGRITY: `sha384-${captchaJsHash}`,
	},
	experimental: {
		serverActions: {
			bodySizeLimit: "10mb",
		},
	},
	async rewrites() {
		return [
			{
				source: "/docs/:path*.mdx",
				destination: "/llms.mdx/docs/:path*",
			},
		];
	},
};

const withMDX = createMDX();

export default withMDX(nextConfig);
