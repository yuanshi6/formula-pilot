import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [
      ".test-vault/**",
      "coverage/**",
      "main.js",
      "node_modules/**",
    ],
  },
  ...obsidianmd.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "obsidianmd/no-static-styles-assignment": "error",
      "obsidianmd/sample-names": "error",
    },
  },
  {
    files: ["scripts/**/*.mjs", "tests/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["esbuild.config.mjs", "scripts/prepare-vault.mjs"],
    rules: {
      // These paths target the repository-owned, disposable development vault.
      "obsidianmd/hardcoded-config-path": "off",
    },
  },
  {
    files: ["src/editor/decorations.ts", "src/ui/surface.ts", "tests/**/*.ts"],
    rules: {
      // Native ownerDocument factories are required for pop-out window support
      // and keep jsdom tests independent from Obsidian's prototype extensions.
      "obsidianmd/prefer-create-el": "off",
    },
  },
  {
    files: ["src/main.ts", "src/ui/surface.ts"],
    rules: {
      // Keyboard names and the Formula Pilot product name are intentionally cased.
      "obsidianmd/ui/sentence-case": "off",
    },
  },
  {
    files: ["src/settings-tab.ts"],
    rules: {
      // The declarative settings API starts after our Obsidian 1.12.7 minimum.
      "obsidianmd/settings-tab/prefer-setting-definitions": "off",
    },
  },
]);
