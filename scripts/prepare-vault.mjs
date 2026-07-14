import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const vault = path.join(root, ".test-vault");
const configDir = path.join(vault, ".obsidian");
const pluginDir = path.join(configDir, "plugins", "formula-pilot");

await mkdir(pluginDir, { recursive: true });
await writeFile(
  path.join(configDir, "community-plugins.json"),
  `${JSON.stringify(["formula-pilot"], null, 2)}\n`,
);
await writeFile(
  path.join(vault, "Formula Pilot playground.md"),
  "# Formula Pilot playground\n\nInline: $\\li$\n\n$$\n\\li\n$$\n",
);

for (const file of ["manifest.json", "styles.css"]) {
  await copyFile(path.join(root, file), path.join(pluginDir, file));
}

try {
  await copyFile(path.join(root, "main.js"), path.join(pluginDir, "main.js"));
} catch {
  // The first preparation can run before the initial build.
}

process.stdout.write(`Prepared Formula Pilot test vault at ${vault}\n`);
