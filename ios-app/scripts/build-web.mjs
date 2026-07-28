import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, "..");
const projectDir = resolve(appDir, "..");
const distDir = resolve(appDir, "dist");
const sourceHtml = resolve(projectDir, "index.html");
const bridgeSource = resolve(appDir, "native", "native-bridge.js");

await rm(distDir, { recursive: true, force: true });
await mkdir(resolve(distDir, "vendor"), { recursive: true });

let html = await readFile(sourceHtml, "utf8");
const cdnTag = '<script src="https://cdn.jsdelivr.net/npm/chinese-days"></script>';
if (!html.includes(cdnTag)) {
  throw new Error("未找到 chinese-days 脚本入口，无法生成 App 页面。");
}

html = html.replace(
  cdnTag,
  '<script src="./vendor/chinese-days.js"></script>\n  <script src="./native-bridge.js"></script>'
);

await writeFile(resolve(distDir, "index.html"), html, "utf8");
await copyFile(bridgeSource, resolve(distDir, "native-bridge.js"));

const chineseDaysPackage = resolve(appDir, "node_modules", "chinese-days");
const candidateBundles = [
  resolve(chineseDaysPackage, "dist", "index.min.js"),
  resolve(chineseDaysPackage, "dist", "index.umd.js"),
  resolve(chineseDaysPackage, "dist", "chinese-days.umd.js"),
  resolve(chineseDaysPackage, "dist", "index.js"),
  resolve(chineseDaysPackage, "lib", "index.js")
];

let copiedBundle = false;
for (const candidate of candidateBundles) {
  try {
    await copyFile(candidate, resolve(distDir, "vendor", "chinese-days.js"));
    copiedBundle = true;
    break;
  } catch {}
}

if (!copiedBundle) {
  const packageJson = JSON.parse(
    await readFile(resolve(chineseDaysPackage, "package.json"), "utf8")
  );
  const browserEntry = packageJson.browser || packageJson.unpkg || packageJson.main;
  if (!browserEntry) throw new Error("chinese-days 没有可用的浏览器入口。");
  await cp(
    resolve(chineseDaysPackage, browserEntry),
    resolve(distDir, "vendor", "chinese-days.js")
  );
}

console.log("App 网页资源已生成到 ios-app/dist。");
