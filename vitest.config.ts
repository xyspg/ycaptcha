import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		setupFiles: ["__tests__/setup.ts"],
		exclude: [
			"e2e/**",
			"node_modules/**",
			"__tests__/integration-real/**",
			".claude/**",
		],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
		},
	},
});
