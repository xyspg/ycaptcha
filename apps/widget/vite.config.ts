import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const target = process.env.WIDGET_BUILD ?? "client";

const widgetUrl = (
  process.env.VITE_WIDGET_URL ?? "http://localhost:3002"
).replace(/\/$/, "");

const baseDefine = {
  __YCAPTCHA_WIDGET_URL__: JSON.stringify(widgetUrl),
};

const aliases = {
  "@": path.resolve(import.meta.dirname, "./src"),
};

export default defineConfig(() => {
  if (target === "loader") {
    return {
      define: baseDefine,
      build: {
        outDir: "dist/loader",
        emptyOutDir: true,
        minify: "terser",
        target: "es2017",
        lib: {
          entry: path.resolve(import.meta.dirname, "src/loader/loader.js"),
          name: "ycaptchaLoader",
          formats: ["iife"],
          fileName: () => "captcha.js",
        },
        rollupOptions: { output: { extend: true } },
      },
    };
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: aliases },
    define: baseDefine,
    build: {
      outDir: "dist/client",
      emptyOutDir: true,
      target: "es2020",
      rollupOptions: {
        input: path.resolve(import.meta.dirname, "src/client/entry.tsx"),
        output: {
          entryFileNames: "widget-app.[hash].js",
          chunkFileNames: "widget-chunk.[hash].js",
          assetFileNames: "widget.[hash].[ext]",
        },
      },
    },
  };
});
