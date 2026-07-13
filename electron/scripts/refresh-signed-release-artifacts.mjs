import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  buildBlockMap,
} = require("app-builder-lib/out/targets/blockmap/blockmap");

const dirname = path.dirname(fileURLToPath(import.meta.url));
const electronRoot = path.resolve(dirname, "..");
const releaseRoot = process.env.ELECTRON_RELEASE_ROOT
  ? path.resolve(process.env.ELECTRON_RELEASE_ROOT)
  : path.join(electronRoot, "release");
const latestYmlPath = path.join(releaseRoot, "latest.yml");

if (!existsSync(latestYmlPath)) {
  throw new Error(`The updater manifest was not found at ${latestYmlPath}.`);
}

const latestYmlContent = readFileSync(latestYmlPath, "utf8");
const manifestPathMatch = latestYmlContent.match(/^path:\s+(.+)$/m);
const manifestVersionMatch = latestYmlContent.match(/^version:\s+(.+)$/m);
const manifestReleaseDateMatch = latestYmlContent.match(
  /^releaseDate:\s+(.+)$/m,
);

if (!manifestVersionMatch) {
  throw new Error("The updater manifest does not include a version field.");
}

if (!manifestPathMatch) {
  throw new Error(
    "The updater manifest does not include a path entry for the installer.",
  );
}

const version = manifestVersionMatch[1].trim();
const installerFileName = manifestPathMatch[1].trim();
const installerPath = path.join(releaseRoot, installerFileName);
const blockMapPath = `${installerPath}.blockmap`;

if (!existsSync(installerPath)) {
  throw new Error(
    `The installer referenced by latest.yml was not found at ${installerPath}.`,
  );
}

const blockMapResult = await buildBlockMap(installerPath, "gzip", blockMapPath);
const installerSize = statSync(installerPath).size;
const releaseDate =
  manifestReleaseDateMatch?.[1]?.trim() ?? `'${new Date().toISOString()}'`;

if (blockMapResult.size !== installerSize) {
  throw new Error(
    `The signed installer size (${installerSize}) does not match the blockmap input size (${blockMapResult.size}).`,
  );
}

const refreshedLatestYmlContent = [
  `version: ${version}`,
  "files:",
  `  - url: ${installerFileName}`,
  `    sha512: ${blockMapResult.sha512}`,
  `    size: ${installerSize}`,
  `path: ${installerFileName}`,
  `sha512: ${blockMapResult.sha512}`,
  `releaseDate: ${releaseDate}`,
  "",
].join("\n");

writeFileSync(latestYmlPath, refreshedLatestYmlContent, "utf8");

console.log("Refreshed signed Electron release artifacts:");
console.log(`- installer: ${installerFileName}`);
console.log(`- blockmap: ${path.basename(blockMapPath)}`);
console.log(`- manifest: latest.yml`);
console.log(`- signed installer sha512: ${blockMapResult.sha512}`);
