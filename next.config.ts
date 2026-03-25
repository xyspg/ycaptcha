import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import "./lib/env";

const nextConfig: NextConfig = {
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
