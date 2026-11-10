import type { APIRoute } from "astro";
import { buildFeed } from "../lib/feed";
import { defaultLanguage } from "../i18n";

// Legacy path from the MkDocs RSS plugin. Kept so existing subscribers keep
// receiving posts; /rss.xml is the canonical feed for anything new.
export const GET: APIRoute = async ({ site }) =>
  buildFeed(defaultLanguage, site, "/feed_rss_updated.xml");
