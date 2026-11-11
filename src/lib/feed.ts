import rss from "@astrojs/rss";
import { getPosts, permalinkFor } from "./posts";
import { categoryLabel } from "../data/post-options";
import { getPersonalInfo, getSiteInfo } from "../config";
import { localizePath, type Language } from "../i18n";

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

/**
 * One RSS document, served at several paths.
 *
 * `selfPath` is the URL this copy is published at, so each alias advertises
 * itself correctly in its atom:self link rather than pointing at /rss.xml.
 */
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

/**
 * JSON Feed 1.1, served at the two paths the MkDocs RSS plugin published.
 *
 * Generated rather than abandoned: both were live at migration time, so
 * dropping them would 404 for any JSON Feed subscriber — and it is what makes
 * `publish.sh --prune` safe to run.
 */
export async function buildJsonFeed(
  lang: Language,
  site: URL | undefined,
  selfPath: string,
): Promise<Response> {
  if (!site) {
    throw new Error(
      "astro.config.mjs must set `site`: feeds need absolute URLs",
    );
  }
  const siteInfo = getSiteInfo(lang);
  const personal = getPersonalInfo(lang);
  const absolute = (path: string) => new URL(path, site).href;

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: `${siteInfo.title} · ${siteInfo.titleSuffix}`,
    home_page_url: absolute(localizePath(lang, "/")),
    feed_url: absolute(selfPath),
    description: siteInfo.description,
    language: siteInfo.language,
    authors: [{ name: personal.name, url: personal.github }],
    items: (await getPosts(lang)).map((post) => {
      const url = absolute(localizePath(lang, permalinkFor(post)));
      return {
        id: url,
        url,
        title: post.data.title,
        summary: post.data.description,
        content_html: absolutize(post.rendered?.html, site) ?? "",
        date_published: post.data.date.toISOString(),
        date_modified: (post.data.updated ?? post.data.date).toISOString(),
        authors: [{ name: personal.name }],
        tags: [categoryLabel(lang, post.data.category), ...post.data.tags],
        ...(post.data.cover ? { image: absolute(post.data.cover) } : {}),
      };
    }),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { "content-type": "application/feed+json; charset=utf-8" },
  });
}
