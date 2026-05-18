import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { codeInspectorPlugin } from "code-inspector-plugin";

export default defineConfig(({ command }) => ({
  root: "src",
  plugins: [
    command === "serve" &&
      codeInspectorPlugin({
        bundler: "vite",
      }),
    react(),
  ].filter(Boolean),
  base: "./",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("prettier/plugins/estree")) {
              return "vendor-prettier-estree";
            }
            if (
              id.includes("prettier/parser-babel") ||
              id.includes("prettier/plugins/babel")
            ) {
              return "vendor-prettier-babel";
            }
            if (id.includes("prettier/standalone")) {
              return "vendor-prettier-core";
            }
            if (id.includes("prettier")) {
              return "vendor-prettier";
            }
            if (id.includes("@lezer")) {
              return "vendor-lezer";
            }
            if (id.includes("@codemirror") || id.includes("/codemirror/")) {
              return "vendor-codemirror";
            }
            if (
              id.includes("style-mod") ||
              id.includes("w3c-keyname") ||
              id.includes("crelt")
            ) {
              return "vendor-codemirror";
            }
            if (id.includes("@radix-ui")) {
              return "vendor-radix";
            }
            if (
              id.includes("@floating-ui") ||
              id.includes("aria-hidden") ||
              id.includes("react-remove-scroll") ||
              id.includes("react-style-singleton") ||
              id.includes("use-callback-ref") ||
              id.includes("use-sidecar")
            ) {
              return "vendor-radix";
            }
            if (id.includes("@tauri-apps")) {
              return "vendor-tauri";
            }
            if (
              id.includes("@lobehub") ||
              id.includes("lucide-react") ||
              id.includes("/icons-static-svg/")
            ) {
              return "vendor-icons";
            }
            if (id.includes("recharts") || id.includes("/d3-")) {
              return "vendor-charts";
            }
            if (
              id.includes("framer-motion") ||
              id.includes("motion-dom") ||
              id.includes("motion-utils")
            ) {
              return "vendor-motion";
            }
            if (id.includes("@dnd-kit")) {
              return "vendor-dnd";
            }
            if (id.includes("i18next")) {
              return "vendor-i18n";
            }
            if (id.includes("zod")) {
              return "vendor-validation";
            }
            if (id.includes("@hookform") || id.includes("react-hook-form")) {
              return "vendor-forms";
            }
            if (
              id.includes("cmdk") ||
              id.includes("sonner") ||
              id.includes("class-variance-authority") ||
              id.includes("clsx") ||
              id.includes("tailwind-merge")
            ) {
              return "vendor-ui";
            }
            if (
              id.includes("jsonc-parser") ||
              id.includes("smol-toml") ||
              id.includes("flexsearch")
            ) {
              return "vendor-parsers";
            }
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("@tanstack")
            ) {
              return "vendor-react";
            }

            return "vendor";
          }

          if (id.includes("/src/icons/")) {
            return "app-icons";
          }
          if (id.includes("/src/i18n/")) {
            return "app-i18n";
          }
          if (id.includes("/src/config/")) {
            return "app-config";
          }
          if (id.includes("/src/components/providers/")) {
            return "app-providers";
          }
          if (id.includes("/src/components/settings/")) {
            return "app-settings";
          }
          if (id.includes("/src/components/proxy/")) {
            return "app-proxy";
          }
          if (id.includes("/src/components/skills/")) {
            return "app-skills";
          }
          if (id.includes("/src/components/sessions/")) {
            return "app-sessions";
          }
          if (id.includes("/src/components/mcp/")) {
            return "app-mcp";
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
}));
