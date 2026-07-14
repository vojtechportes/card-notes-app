import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const packageJsonPaths = [
  "package.json",
  "electron/package.json",
  "frontend/package.json",
  "backend/package.json",
];

const bumpFlags = new Map([
  ["--patch", "patch"],
  ["--minor", "minor"],
  ["--major", "major"],
]);

const usage = `Usage: node scripts/update-package-version.mjs --patch|--minor|--major`;

const selectedFlags = process.argv
  .slice(2)
  .filter((argument) => bumpFlags.has(argument));
const unknownFlags = process.argv
  .slice(2)
  .filter((argument) => argument.startsWith("-") && !bumpFlags.has(argument));

if (unknownFlags.length > 0) {
  console.error(`Unknown flag: ${unknownFlags.join(", ")}`);
  console.error(usage);
  process.exit(1);
}

if (selectedFlags.length !== 1 || process.argv.slice(2).length !== 1) {
  console.error("Pass exactly one version bump flag.");
  console.error(usage);
  process.exit(1);
}

const bumpType = bumpFlags.get(selectedFlags[0]);

const parseVersion = (version, filePath) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  if (!match) {
    throw new Error(
      `${filePath} has unsupported version "${version}". Expected x.y.z.`,
    );
  }

  return match.slice(1).map(Number);
};

const bumpVersion = (version) => {
  const [major, minor, patch] = parseVersion(version, "package.json");

  if (bumpType === "major") {
    return `${major + 1}.0.0`;
  }

  if (bumpType === "minor") {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
};

const readPackageJson = async (filePath) => {
  const fullPath = path.resolve(projectRoot, filePath);
  const content = await readFile(fullPath, "utf8");
  const packageJson = JSON.parse(content);

  if (typeof packageJson.version !== "string") {
    throw new Error(`${filePath} does not have a string version field.`);
  }

  parseVersion(packageJson.version, filePath);

  return {
    filePath,
    fullPath,
    packageJson,
    version: packageJson.version,
  };
};

try {
  const packageJsonFiles = await Promise.all(
    packageJsonPaths.map(readPackageJson),
  );
  const currentVersion = packageJsonFiles[0].version;
  const mismatchedVersion = packageJsonFiles.find(
    ({ version }) => version !== currentVersion,
  );

  if (mismatchedVersion) {
    throw new Error(
      `Version mismatch found. package.json is ${currentVersion}, but ${mismatchedVersion.filePath} is ${mismatchedVersion.version}.`,
    );
  }

  const nextVersion = bumpVersion(currentVersion);

  await Promise.all(
    packageJsonFiles.map(({ fullPath, packageJson }) => {
      packageJson.version = nextVersion;
      return writeFile(
        fullPath,
        `${JSON.stringify(packageJson, null, 2)}\n`,
        "utf8",
      );
    }),
  );

  console.log(
    `Updated package versions from ${currentVersion} to ${nextVersion}.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
