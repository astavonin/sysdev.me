// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vue from "@astrojs/vue";
import tailwindcss from "@tailwindcss/vite";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { loadEnv } from "vite";
import { languages, defaultLanguage } from "./src/i18n/index.ts";

// The canonical origin. Never defaults to anything but this site: every
// canonical tag, feed link and sitemap entry derives from it, and publishing a
// foreign origin is not recoverable by a later re-deploy.
const { SITE_URL = "https://sysdev.me" } = loadEnv(
  process.env.NODE_ENV ?? "production",
  process.cwd(),
  "SITE_URL",
);
const site = new URL(SITE_URL);
if (
  !["http:", "https:"].includes(site.protocol) ||
  site.pathname !== "/" ||
  site.search ||
  site.hash ||
  site.username ||
  site.password
) {
  throw new Error(
    "SITE_URL must be an HTTP(S) origin, such as https://example.com, without a path, credentials, query, or fragment.",
  );
}

// Last modification date of each post URL, read from its frontmatter, so the
// sitemap can tell search engines which pages changed.
/** @type {Map<string, Date>} */
const lastModified = new Map();
for (const lang of languages) {
  const dir = `./src/content/posts/${lang}`;
  // A language with no posts has no directory: git cannot track an empty one.
  // The default language is different — its absence means the content is gone,
  // which must fail the build rather than publish an empty site.
  if (!existsSync(dir)) {
    if (lang === defaultLanguage) {
      throw new Error(`Missing post directory: ${dir}`);
    }
    continue;
  }
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".md"))) {
    const frontmatter = readFileSync(`${dir}/${file}`, "utf8").split("---")[1];
    if (/^draft:\s*true/m.test(frontmatter)) continue;
    const published = /^date:\s*"?([0-9-]+)"?/m.exec(frontmatter)?.[1];
    const date =
      /^updated:\s*"?([0-9-]+)"?/m.exec(frontmatter)?.[1] ?? published;
    if (!date || !published) continue;
    const prefix = lang === defaultLanguage ? "" : `/${lang}`;
    // Permalinks are /YYYY/MM/DD/slug/, where slug overrides the filename.
    const slug =
      /^slug:\s*"?([^"\s]+)"?/m.exec(frontmatter)?.[1] ??
      file.replace(/\.md$/, "");
    lastModified.set(
      `${prefix}/${published.replace(/-/g, "/")}/${slug}/`,
      new Date(date),
    );
  }
}
/** Newest post date for the English ("") or Spanish ("/es/") listings. */
const newest = (/** @type {string} */ prefix) =>
  [...lastModified]
    .filter(([path]) =>
      prefix ? path.startsWith(prefix) : !path.startsWith("/es/"),
    )
    .map(([, date]) => date)
    .sort((a, b) => b.valueOf() - a.valueOf())[0];

// https://astro.build/config
export default defineConfig({
  site: site.href,
  output: "static",
  trailingSlash: "always",
  // Astro's default. Collapses inter-element whitespace in the emitted HTML.
  compressHTML: true,
  // "auto" inlines only sheets under ~4kB; beyond that a cached external
  // file wins, and this one carries all of Tailwind plus the icon masks.
  build: { inlineStylesheets: "auto" },
  // Fetch pages on hover so navigation feels instant.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  // Prerender prefetched pages with the Speculation Rules API where supported.
  experimental: { clientPrerender: true },
  integrations: [
    vue(),
    sitemap({
      filter: (page) =>
        !["/404/", "/404.html"].includes(new URL(page).pathname),
      serialize(item) {
        const path = new URL(item.url).pathname;
        const listing = /^\/(es\/)?(posts\/)?$/.exec(path);
        const date = listing
          ? newest(listing[1] ? "/es/" : "")
          : lastModified.get(path);
        // A dated page with no entry means the config's frontmatter parse
        // disagreed with permalinkFor(); surface it instead of dropping lastmod.
        if (!date && /^\/\d{4}\/\d{2}\/\d{2}\//.test(path)) {
          console.warn(`[sitemap] no lastmod for ${path}`);
        }
        return date ? { ...item, lastmod: date.toISOString() } : item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
