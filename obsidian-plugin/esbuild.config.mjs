import builtins from "builtin-modules";
import esbuild from "esbuild";

// Based on the official obsidian-sample-plugin build: one CommonJS bundle,
// main.js, with Obsidian's own modules left external.
const production = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*", ...builtins],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  // The address of the app this build is for; empty means local development.
  define: {
    __DEFAULT_APP_URL__: JSON.stringify(
      process.env.VAULTFOLIO_APP_URL || "http://127.0.0.1:3000",
    ),
  },
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
