import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import test from "node:test";

const scriptPath = path.resolve(
  import.meta.dirname,
  "../../scripts/refresh-signed-release-artifacts.mjs",
);

const execFileAsync = async (
  file: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    execFile(file, args, { env }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}\n${stdout}\n${stderr}`));
        return;
      }

      resolve();
    });
  });
};

test("refreshes latest.yml and blockmap for the current installer bytes", async () => {
  const releaseRoot = await mkdtemp(path.join(tmpdir(), "notestack-release-"));

  try {
    const installerName = "notestack-1.2.3-setup.exe";
    const installerPath = path.join(releaseRoot, installerName);
    const latestYmlPath = path.join(releaseRoot, "latest.yml");

    await writeFile(installerPath, Buffer.from("signed installer bytes"));
    await writeFile(
      latestYmlPath,
      [
        "version: 1.2.3",
        "files:",
        `  - url: ${installerName}`,
        "    sha512: stale",
        "    size: 1",
        `path: ${installerName}`,
        "sha512: stale",
        "releaseDate: '2026-07-13T00:00:00.000Z'",
        "",
      ].join("\n"),
    );

    await execFileAsync(process.execPath, [scriptPath], {
      ...process.env,
      ELECTRON_RELEASE_ROOT: releaseRoot,
    });

    const installer = await readFile(installerPath);
    const expectedSha512 = createHash("sha512")
      .update(installer)
      .digest("base64");
    const installerStats = await stat(installerPath);
    const refreshedManifest = await readFile(latestYmlPath, "utf8");
    const blockMapStats = await stat(`${installerPath}.blockmap`);

    assert.match(refreshedManifest, /version: 1\.2\.3/);
    assert.match(refreshedManifest, new RegExp(`url: ${installerName}`));
    assert.match(refreshedManifest, new RegExp(`path: ${installerName}`));
    assert.match(refreshedManifest, new RegExp(`sha512: ${expectedSha512}`));
    assert.match(refreshedManifest, new RegExp(`size: ${installerStats.size}`));
    assert.match(refreshedManifest, /releaseDate: '2026-07-13T00:00:00\.000Z'/);
    assert.ok(blockMapStats.size > 0);
  } finally {
    await rm(releaseRoot, { force: true, recursive: true });
  }
});
