import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const version = process.env.npm_package_version;
if (!version) throw new Error("npm_package_version is unavailable");

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
manifest.version = version;
await writeFile("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

const versions = JSON.parse(await readFile("versions.json", "utf8"));
versions[version] = manifest.minAppVersion;
await writeFile("versions.json", `${JSON.stringify(versions, null, 2)}\n`);
