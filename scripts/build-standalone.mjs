import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const index = await readFile(resolve(dist, "index.html"), "utf8");

const cssHref = index.match(/<link rel="stylesheet"[^>]*href="\.\/([^"]+\.css)"/)?.[1];
const jsSrc = index.match(/<script type="module"[^>]*src="\.\/([^"]+\.js)"><\/script>/)?.[1];
if (!cssHref || !jsSrc) throw new Error("Built index.html does not contain expected asset references");

const [css, js, favicon] = await Promise.all([
  readFile(resolve(dist, cssHref), "utf8"),
  readFile(resolve(dist, jsSrc), "utf8"),
  readFile(resolve(dist, "favicon.svg"), "utf8"),
]);

const safeJs = js.replace(/<\/script/gi, "<\\/script");
const icon = `data:image/svg+xml;base64,${Buffer.from(favicon).toString("base64")}`;
const html = index
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${icon}" type="image/svg+xml" />`)
  .replace(
    /<script type="module"[^>]*src="\.\/[^"]+\.js"><\/script>/,
    () => `<script type="module">\n${safeJs}\n</script>`,
  )
  .replace(
    /<link rel="stylesheet"[^>]*href="\.\/[^"]+\.css">/,
    () => `<style>\n${css}\n</style>`,
  );

const outputDir = resolve(root, "standalone");
await mkdir(outputDir, { recursive: true });
const output = resolve(outputDir, "index.html");
await writeFile(output, html, "utf8");
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(html) }));
