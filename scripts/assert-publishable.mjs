#!/usr/bin/env node
//
// The one gate. publish.sh and CI both call this, so they cannot drift into
// checking different artifact sets — which they did when the check was two
// copies of shell.
//
//   node scripts/assert-publishable.mjs [dist] [fixture]
import { readFileSync, statSync } from "node:fs";

const dist = process.argv[2] ?? "dist";
const fixture = process.argv[3] ?? "tests/fixtures/historical-urls.txt";

const urls = readFileSync(fixture, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const problems = [];

// A truncated fixture would otherwise make the whole gate pass vacuously —
// precisely the "publish an empty site over a live one" case it exists to stop.
if (urls.length === 0) {
  problems.push(`${fixture} lists no URLs`);
}

const nonEmpty = (path) => {
  try {
    return statSync(path).size > 0;
  } catch {
    return false;
  }
};

for (const url of urls) {
  // -s, not -f: a zero-byte page satisfies "exists" while serving nothing.
  if (!nonEmpty(`${dist}${url}index.html`))
    problems.push(`missing or empty: ${url}`);
}

for (const file of [
  "rss.xml",
  "feed_rss_created.xml",
  "feed_rss_updated.xml",
  "feed_json_created.json",
  "feed_json_updated.json",
  "sitemap-index.xml",
  "sitemap.xml",
  "index.html",
]) {
  if (!nonEmpty(`${dist}/${file}`)) problems.push(`missing or empty: /${file}`);
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} problem(s); refusing to publish.`);
  process.exit(1);
}

console.log(`ok: ${urls.length} historical URLs and all feeds present`);
