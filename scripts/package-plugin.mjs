// Builds the Obsidian plugin and packages it as a download served by the web
// app: public/downloads/vaultfolio-obsidian.zip, containing vaultfolio/
// manifest.json and main.js, ready to unzip into .obsidian/plugins/.
// The plugin's default address is the app it is built for (APP_BASE_URL).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { zipSync } from "fflate";

try {
  process.loadEnvFile(".env.local");
} catch {}

const plugin = "obsidian-plugin";
const run = (args) =>
  execFileSync("npm", args, { cwd: plugin, stdio: "inherit" });

if (!existsSync(`${plugin}/node_modules`))
  run(["ci", "--no-audit", "--no-fund"]);
execFileSync("npm", ["run", "build"], {
  cwd: plugin,
  stdio: "inherit",
  env: { ...process.env, VAULTFOLIO_APP_URL: process.env.APP_BASE_URL ?? "" },
});

const files = {
  "vaultfolio/manifest.json": readFileSync(`${plugin}/manifest.json`),
  "vaultfolio/main.js": readFileSync(`${plugin}/main.js`),
};
mkdirSync("public/downloads", { recursive: true });
writeFileSync(
  "public/downloads/vaultfolio-obsidian.zip",
  zipSync(files, { level: 9 }),
);
console.log("Packaged public/downloads/vaultfolio-obsidian.zip");
