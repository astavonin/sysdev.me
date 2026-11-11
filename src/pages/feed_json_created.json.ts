import type { APIRoute } from "astro";
import { buildJsonFeed } from "../lib/feed";
import { defaultLanguage } from "../i18n";

// Legacy path from the MkDocs RSS plugin. Regenerated so JSON Feed subscribers
// from that era keep receiving posts; /rss.xml is the canonical feed.
export const GET: APIRoute = async ({ site }) =>
  buildJsonFeed(defaultLanguage, site, "/feed_json_created.json");
