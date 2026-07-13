import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { writeAppUpdatePublisher } from "../../scripts/write-app-update-publisher.mjs";

test("writes the Certum publisher name to app-update.yml", async () => {
  const appOutDir = await mkdtemp(path.join(tmpdir(), "notestack-app-out-"));

  try {
    const resourcesDir = path.join(appOutDir, "resources");
    const appUpdatePath = path.join(resourcesDir, "app-update.yml");

    await mkdir(resourcesDir, { recursive: true });
    await writeFile(
      appUpdatePath,
      [
        "owner: vojtechportes",
        "repo: card-notes-app",
        "provider: github",
        "releaseType: release",
        "",
      ].join("\n"),
    );

    await writeAppUpdatePublisher(appOutDir);

    const appUpdate = YAML.parse(await readFile(appUpdatePath, "utf8"));

    assert.equal(
      appUpdate.publisherName,
      "Open Source Developer Vojtech Porte\u0161",
    );
  } finally {
    await rm(appOutDir, { force: true, recursive: true });
  }
});

test("skips publisher metadata when app-update.yml is not generated", async () => {
  const appOutDir = await mkdtemp(path.join(tmpdir(), "notestack-app-out-"));

  try {
    await mkdir(path.join(appOutDir, "resources"), { recursive: true });

    await assert.doesNotReject(writeAppUpdatePublisher(appOutDir));
  } finally {
    await rm(appOutDir, { force: true, recursive: true });
  }
});
