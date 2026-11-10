import type { APIRoute } from "astro";
import { buildFeed } from "../../lib/feed";
import { getLanguage, languagePaths, localizePath } from "../../i18n";

export const getStaticPaths = languagePaths;
export const GET: APIRoute = async ({ site, params }) => {
  const lang = getLanguage(params.lang);
  return buildFeed(lang, site, localizePath(lang, "/rss.xml"));
};
