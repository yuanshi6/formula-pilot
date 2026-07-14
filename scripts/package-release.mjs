import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));

if (packageJson.name !== manifest.id) {
  throw new Error(`Package name ${packageJson.name} does not match manifest id ${manifest.id}`);
}

if (packageJson.version !== manifest.version) {
  throw new Error(
    `Package version ${packageJson.version} does not match manifest version ${manifest.version}`,
  );
}

const files = ["main.js", "manifest.json", "styles.css"];
const releaseName = `${manifest.id}-${manifest.version}`;
const distDir = path.join(root, "dist");
const releaseDir = path.join(distDir, releaseName);
const zipPath = path.join(distDir, `${releaseName}.zip`);

await rm(releaseDir, { recursive: true, force: true });
await rm(zipPath, { force: true });
await mkdir(releaseDir, { recursive: true });
await Promise.all(
  files.map((file) => copyFile(path.join(root, file), path.join(releaseDir, file))),
);

await execFileAsync("zip", ["-j", "-X", zipPath, ...files.map((file) => path.join(releaseDir, file))]);

process.stdout.write(`Packaged ${path.relative(root, zipPath)}\n`);
process.stdout.write(
  `Release assets: ${files.map((file) => path.join("dist", releaseName, file)).join(", ")}\n`,
);
