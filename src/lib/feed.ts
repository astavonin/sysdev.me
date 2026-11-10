import rss from "@astrojs/rss";
import { getPosts, permalinkFor } from "./posts";
import { categoryLabel } from "../data/post-options";
import { getSiteInfo } from "../config";
import { localizePath, type Language } from "../i18n";

/**
 * One RSS document, served at several paths.
 *
 * `selfPath` is the URL this copy is published at, so each alias advertises
 * itself correctly in its atom:self link rather than pointing at /rss.xml.
 */
/**
 * Feed readers resolve relative URLs against their own host, so a post body's
 * `/img/...` references would 404 for every subscriber.
 */
function absolutize(html: string | undefined, site: URL): string | undefined {
  return html?.replace(
    /(\s(?:src|href)=")\/(?!\/)/g,
    (_match, attr) => `${attr}${site.origin}/`,
  );
}

export async function buildFeed(
  lang: Language,
  site: URL | undefined,
  selfPath: string,
) {
  if (!site) {
    throw new Error(
      "astro.config.mjs must set `site`: feeds need absolute URLs",
    );
  }
  const siteInfo = getSiteInfo(lang);
  const self = new URL(selfPath, site).href;
  return rss({
    title: `${siteInfo.title} · ${siteInfo.titleSuffix}`,
    description: siteInfo.description,
    site,
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    items: (await getPosts(lang)).map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: localizePath(lang, permalinkFor(post)),
      categories: [categoryLabel(lang, post.data.category), ...post.data.tags],
      // Full post HTML so feed readers can show the whole article.
      content: absolutize(post.rendered?.html, site),
    })),
    customData: [
      `<language>${siteInfo.language}</language>`,
      `<atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
    ].join(""),
  });
}
