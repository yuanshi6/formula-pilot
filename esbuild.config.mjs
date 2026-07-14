import esbuild from "esbuild";
import { builtinModules } from "node:module";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const prod = process.argv[2] === "production";
const vaultPluginDir = path.join(
  process.cwd(),
  ".test-vault",
  ".obsidian",
  "plugins",
  "formula-pilot",
);

const syncToVault = {
  name: "sync-to-test-vault",
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;
      await mkdir(vaultPluginDir, { recursive: true });
      await Promise.all(
        ["main.js", "manifest.json", "styles.css"].map((file) =>
          copyFile(path.join(process.cwd(), file), path.join(vaultPluginDir, file)),
        ),
      );
    });
  },
};

const context = await esbuild.context({
  banner: {
    js: "/* Formula Pilot - generated bundle. Source is retained in the repository. */",
  },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtinModules,
  ],
  format: "cjs",
  logLevel: "info",
  minify: prod,
  outfile: "main.js",
  plugins: [syncToVault],
  sourcemap: prod ? false : "inline",
  target: "es2021",
  treeShaking: true,
});

if (prod) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
