import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const WINDOWS_PUBLISHER_NAME = "Open Source Developer Vojtech Porte\u0161";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const electronRoot = path.resolve(dirname, "..");
const defaultBuilderConfigPath = path.join(electronRoot, "electron-builder.json");

export const writeAppUpdatePublisher = async (
  appOutDir,
  builderConfigPath = defaultBuilderConfigPath,
) => {
  const appUpdatePath = path.join(appOutDir, "resources", "app-update.yml");

  if (!(await fileExists(appUpdatePath))) {
    await writeAppUpdateConfig(appUpdatePath, builderConfigPath);
  }

  const appUpdateContent = await readFile(appUpdatePath, "utf8");
  const appUpdateDocument = YAML.parseDocument(appUpdateContent);

  appUpdateDocument.set("publisherName", WINDOWS_PUBLISHER_NAME);

  await writeFile(appUpdatePath, appUpdateDocument.toString(), "utf8");
};

export default async function afterPack(context) {
  await writeAppUpdatePublisher(context.appOutDir);
}

const fileExists = async (filePath) => {
  try {
    await access(filePath);

    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    throw error;
  }
};

const writeAppUpdateConfig = async (appUpdatePath, builderConfigPath) => {
  const builderConfig = JSON.parse(await readFile(builderConfigPath, "utf8"));
  const publishConfig = getGithubPublishConfig(builderConfig.publish);

  if (!publishConfig) {
    throw new Error(
      "Unable to generate app-update.yml because electron-builder publish config is missing a GitHub provider.",
    );
  }

  await mkdir(path.dirname(appUpdatePath), { recursive: true });
  await writeFile(
    appUpdatePath,
    YAML.stringify({
      owner: publishConfig.owner,
      provider: publishConfig.provider,
      releaseType: publishConfig.releaseType,
      repo: publishConfig.repo,
    }),
    "utf8",
  );
};

const getGithubPublishConfig = (publishConfig) => {
  const publishConfigs = Array.isArray(publishConfig)
    ? publishConfig
    : [publishConfig];

  return publishConfigs.find((config) => {
    return config?.provider === "github" && config.owner && config.repo;
  });
};
