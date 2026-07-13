import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const WINDOWS_PUBLISHER_NAME = "Open Source Developer Vojtech Porte\u0161";

export const writeAppUpdatePublisher = async (appOutDir) => {
  const appUpdatePath = path.join(appOutDir, "resources", "app-update.yml");
  const appUpdateContent = await readFile(appUpdatePath, "utf8");
  const appUpdateDocument = YAML.parseDocument(appUpdateContent);

  appUpdateDocument.set("publisherName", WINDOWS_PUBLISHER_NAME);

  await writeFile(appUpdatePath, appUpdateDocument.toString(), "utf8");
};

export default async function afterPack(context) {
  await writeAppUpdatePublisher(context.appOutDir);
}
