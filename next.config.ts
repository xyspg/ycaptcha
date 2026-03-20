import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";
import "./lib/env";

const nextConfig: NextConfig = {
  /* config options here */
};

const withMDX = createMDX();

export default withMDX(nextConfig);
