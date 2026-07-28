import { resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, "..");
const assetCatalog = resolve(appDir, "ios", "App", "App", "Assets.xcassets");

await sharp(resolve(appDir, "assets", "app-icon.svg"))
  .resize(1024, 1024)
  .flatten({ background: "#2563eb" })
  .png()
  .toFile(resolve(assetCatalog, "AppIcon.appiconset", "AppIcon-512@2x.png"));

const splashSource = sharp(resolve(appDir, "assets", "splash.svg"))
  .resize(2732, 2732)
  .flatten({ background: "#f8fafc" })
  .png();

for (const fileName of [
  "splash-2732x2732.png",
  "splash-2732x2732-1.png",
  "splash-2732x2732-2.png"
]) {
  await splashSource.clone().toFile(
    resolve(assetCatalog, "Splash.imageset", fileName)
  );
}

console.log("iOS 图标和启动画面已生成。");
