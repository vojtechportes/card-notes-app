import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { writeAppUpdatePublisher } from "../../scripts/write-app-update-publisher.mjs";

const createBuilderConfig = async (directory: string): Promise<string> => {
  const builderConfigPath = path.join(directory, "electron-builder.json");

  await writeFile(
    builderConfigPath,
    JSON.stringify({
      publish: [
        {
          provider: "github",
          owner: "vojtechportes",
          repo: "card-notes-app",
          releaseType: "release",
        },
      ],
    }),
  );

  return builderConfigPath;
};

test("writes the Certum publisher name to app-update.yml", async () => {
  const appOutDir = await mkdtemp(path.join(tmpdir(), "notestack-app-out-"));

  try {
    const resourcesDir = path.join(appOutDir, "resources");
    const appUpdatePath = path.join(resourcesDir, "app-update.yml");
    const builderConfigPath = await createBuilderConfig(appOutDir);

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

    await writeAppUpdatePublisher(appOutDir, builderConfigPath);

    const appUpdate = YAML.parse(await readFile(appUpdatePath, "utf8"));

    assert.equal(appUpdate.owner, "vojtechportes");
    assert.equal(appUpdate.repo, "card-notes-app");
    assert.equal(appUpdate.provider, "github");
    assert.equal(appUpdate.releaseType, "release");
    assert.equal(
      appUpdate.publisherName,
      "Open Source Developer Vojtech Porte\u0161",
    );
  } finally {
    await rm(appOutDir, { force: true, recursive: true });
  }
});

test("creates app-update.yml from publish config when it is not generated", async () => {
  const appOutDir = await mkdtemp(path.join(tmpdir(), "notestack-app-out-"));

  try {
    const appUpdatePath = path.join(appOutDir, "resources", "app-update.yml");
    const builderConfigPath = await createBuilderConfig(appOutDir);

    await writeAppUpdatePublisher(appOutDir, builderConfigPath);

    const appUpdate = YAML.parse(await readFile(appUpdatePath, "utf8"));

    assert.deepEqual(appUpdate, {
      owner: "vojtechportes",
      provider: "github",
      publisherName: "Open Source Developer Vojtech Porte\u0161",
      releaseType: "release",
      repo: "card-notes-app",
    });
  } finally {
    await rm(appOutDir, { force: true, recursive: true });
  }
});
