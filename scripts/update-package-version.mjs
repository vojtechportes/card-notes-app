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

const exactVersionFlag = "--version";
const usage = `Usage: node scripts/update-package-version.mjs --patch|--minor|--major|--version <semantic-version>`;
const argumentsList = process.argv.slice(2);
const selectedFlags = argumentsList.filter((argument) =>
  bumpFlags.has(argument),
);
const unknownFlags = argumentsList.filter(
  (argument) =>
    argument.startsWith("-") &&
    !bumpFlags.has(argument) &&
    argument !== exactVersionFlag,
);

if (unknownFlags.length > 0) {
  console.error(`Unknown flag: ${unknownFlags.join(", ")}`);
  console.error(usage);
  process.exit(1);
}

const usesExactVersion = argumentsList[0] === exactVersionFlag;

if (
  (usesExactVersion && argumentsList.length !== 2) ||
  (!usesExactVersion &&
    (selectedFlags.length !== 1 || argumentsList.length !== 1))
) {
  console.error("Pass exactly one version bump flag or an explicit version.");
  console.error(usage);
  process.exit(1);
}

const bumpType = usesExactVersion ? undefined : bumpFlags.get(selectedFlags[0]);
const requestedVersion = usesExactVersion ? argumentsList[1] : undefined;

const parseVersion = (version, filePath) => {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+(?:[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(
      version,
    );

  if (!match) {
    throw new Error(
      `${filePath} has unsupported version "${version}". Expected a semantic version.`,
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

  const nextVersion = requestedVersion ?? bumpVersion(currentVersion);
  parseVersion(nextVersion, exactVersionFlag);

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
