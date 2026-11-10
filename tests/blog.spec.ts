import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import settings from "../src/site.config.json" with { type: "json" };
import { categoryLabel, categoryNames } from "../src/data/post-options";
import { languages } from "../src/i18n";

/**
 * These specs assert what the MkDocs → Astro migration promised: that every
 * historical URL still resolves, that the feeds existing subscribers poll keep
 * working, and that the site publishes its own origin. Counts derive from the
 * built output, and the historical fixture is asserted as a subset rather
 * than an equality, so publishing post 27 does not turn the suite red.
 */

const ORIGIN = "https://sysdev.me";

const historicalUrls = readFileSync(
  fileURLToPath(new URL("./fixtures/historical-urls.txt", import.meta.url)),
  "utf8",
)
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const FEEDS = ["/rss.xml", "/feed_rss_created.xml", "/feed_rss_updated.xml"];

test.describe("URL preservation", () => {
  test("every historical URL resolves and is its own canonical", async ({
    request,
  }) => {
    expect(historicalUrls.length).toBeGreaterThan(0);
    const broken: string[] = [];
    for (const url of historicalUrls) {
      const response = await request.get(url);
      if (response.status() !== 200) {
        broken.push(`${url} -> ${response.status()}`);
        continue;
      }
      const canonical = (await response.text()).match(
        /<link rel="canonical" href="([^"]+)"/,
      )?.[1];
      if (canonical !== `${ORIGIN}${url}`) {
        broken.push(`${url} -> canonical ${canonical}`);
      }
    }
    // Reported as a list so one mistyped slug names itself.
    expect(broken).toEqual([]);
  });

  test("pages publish this site's origin, not the vendored theme's", async ({
    request,
  }) => {
    for (const path of ["/", historicalUrls[0], "/sitemap-0.xml", ...FEEDS]) {
      const body = await (await request.get(path)).text();
      expect(body, `${path} leaks a foreign origin`).not.toContain(
        "grimorio-astro.pages.dev",
      );
    }
    const home = await (await request.get("/")).text();
    expect(home).toContain(`<link rel="canonical" href="${ORIGIN}/"`);
  });
});

test.describe("Feeds", () => {
  test("all three feed paths serve the same items, each advertising itself", async ({
    request,
  }) => {
    const counts: number[] = [];
    for (const path of FEEDS) {
      const response = await request.get(path);
      expect(response.status(), `${path} must serve`).toBe(200);
      const body = await response.text();
      expect(response.headers()["content-type"]).toContain("xml");
      // Each alias names itself; a hardcoded /rss.xml here would be invisible.
      expect(body).toContain(`href="${ORIGIN}${path}" rel="self"`);
      counts.push((body.match(/<item>/g) ?? []).length);
    }
    expect(counts[0]).toBeGreaterThanOrEqual(historicalUrls.length);
    expect(new Set(counts).size, "feeds disagree on item count").toBe(1);
  });

  test("feed item links use historical permalinks", async ({ request }) => {
    const body = await (await request.get("/rss.xml")).text();
    const links = [...body.matchAll(/<link>([^<]+)<\/link>/g)]
      .map((match) => match[1])
      .filter((link) => link !== `${ORIGIN}/`);
    // Superset: new posts join the feed, historical ones must never leave it.
    for (const url of historicalUrls) {
      expect(links, `feed dropped ${url}`).toContain(`${ORIGIN}${url}`);
    }
  });

  test("feed bodies carry absolute image URLs", async ({ request }) => {
    const body = await (await request.get("/rss.xml")).text();
    // Positive first: an absence check alone passes for a feed with no body.
    expect(body).toContain("<content:encoded>");
    expect(body).toContain(`${ORIGIN}/img/`);
    // Readers resolve relative srcs against their own host.
    expect(body).not.toMatch(/(?:src|href)=["'&]*\/(?!\/)/);
  });
});

test.describe("llms.txt", () => {
  test("links point at routes that exist", async ({ request }) => {
    const body = await (await request.get("/llms.txt")).text();
    const links = [...body.matchAll(/\((https:\/\/[^)]+)\)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(0);
    for (const url of links) {
      const path = new URL(url).pathname;
      expect((await request.get(path)).status(), `llms.txt -> ${path}`).toBe(
        200,
      );
    }
  });
});

test.describe("Sitemap", () => {
  test("covers every post, carries lastmod, and advertises no other locale", async ({
    request,
  }) => {
    const body = await (await request.get("/sitemap-0.xml")).text();
    const entries = [...body.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(
      (match) => match[1],
    );
    const dated = entries.filter((entry) =>
      /\/\d{4}\/\d{2}\/\d{2}\//.test(entry),
    );
    expect(dated.length).toBeGreaterThanOrEqual(historicalUrls.length);
    // A missing lastmod means the config's frontmatter parse disagreed with
    // permalinkFor(); it fails silently otherwise.
    expect(dated.filter((entry) => !entry.includes("<lastmod>"))).toEqual([]);
    expect(body).not.toContain("/es/");
  });

  test("/sitemap.xml is regenerated, overwriting the MkDocs-era file", async ({
    request,
  }) => {
    // publish.sh does not use --delete, so this path must be republished or the
    // stale MkDocs sitemap would keep advertising the old URL set forever.
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    // It is a sitemap index; the URLs live in the file it points at.
    expect(body).toContain(`${ORIGIN}/sitemap-0.xml`);
    expect(body).not.toContain("grimorio-astro.pages.dev");
  });
});

test.describe("Head metadata", () => {
  test("no alternate link points at a page that does not exist", async ({
    request,
  }) => {
    const body = await (await request.get(historicalUrls[0])).text();
    const alternates = [
      ...body.matchAll(
        /<link rel="alternate" hreflang="[^"]*" href="([^"]+)"/g,
      ),
    ].map((match) => match[1]);
    // Falsifiable at one locale too: emitting an alternate with no second
    // language is exactly the published-404 condition this guards.
    expect(alternates.length).toBe(languages.length > 1 ? languages.length : 0);
    for (const href of alternates) {
      const path = new URL(href).pathname;
      expect(
        (await request.get(path)).status(),
        `hreflang target ${path}`,
      ).toBe(200);
    }
  });

  test("analytics stays out of builds that did not opt in", async ({
    page,
  }) => {
    const analytics: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("googletagmanager"))
        analytics.push(request.url());
    });
    await page.goto(historicalUrls[0]);
    // PUBLIC_ANALYTICS is unset here, so the tag must be absent — otherwise the
    // test run reports page views into the live property.
    expect(analytics).toEqual([]);
    expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(
      0,
    );
  });

  test("the author node names a person, not the publication", async ({
    request,
  }) => {
    const body = await (await request.get(historicalUrls[0])).text();
    const graph = JSON.parse(
      body.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      )![1],
    );
    const nodes = graph["@graph"] ?? [graph];
    const person = nodes.find(
      (node: { "@type": string }) => node["@type"] === "Person",
    );
    expect(person.name).toBe(settings.author.legalName);
    // Catches the value itself drifting back to the publication name.
    expect(person.name).not.toBe(settings.site.name);
  });
});

test.describe("Categories", () => {
  test("the home tab set is exactly the configured categories", async ({
    page,
  }) => {
    await page.goto("/");
    const tabs = (await page.locator(".feed-tabs button").allInnerTexts()).map(
      (text) => text.split("\n")[0].trim(),
    );
    // Every configured category must be reachable: a category in the icon map
    // but absent from the enum is the drift that made the old suite click a
    // "bazel" tab that could never render.
    const expected = categoryNames.map((name) => categoryLabel("en", name));
    expect(tabs).toEqual(["All posts", ...expected]);
  });
});

test.describe("Mermaid", () => {
  // The two posts carrying fences; the renderer runs only on these pages.
  const DIAGRAM_POST = "/2025/11/27/cross-compiling-rust-for-raspberry-pi/";
  // Named explicitly rather than indexed out of the fixture, whose order
  // would otherwise be load-bearing.
  const PLAIN_POST = "/2026/10/19/bazel-cross-compilation/";

  test("fences render as diagrams, with no copy-button text inside", async ({
    page,
  }) => {
    await page.goto(DIAGRAM_POST);
    const figures = page.locator("figure.mermaid-figure svg");
    await expect(figures.first()).toBeVisible();
    expect(await page.locator('pre[data-language="mermaid"]').count()).toBe(0);
    // The copy button lives inside <pre>; reading it as diagram source drew a
    // stray "Copy" node.
    expect(await figures.first().textContent()).not.toContain("Copy");
  });

  test("diagrams follow the theme toggle", async ({ page }) => {
    await page.goto(DIAGRAM_POST);
    await expect(
      page.locator("figure.mermaid-figure svg").first(),
    ).toBeVisible();
    // Compare the palette, not the markup: each render mints a new element id,
    // so innerHTML differs on every pass regardless of theme.
    const palette = async () =>
      (await page.locator("figure.mermaid-figure svg").first().innerHTML())
        .replace(/mermaid-\d+/g, "")
        .match(/fill:\s*[^;"]+/g)
        ?.join("|") ?? "";
    const before = await palette();
    await page.evaluate(() =>
      document.documentElement.classList.toggle("dark"),
    );
    await expect.poll(palette).not.toBe(before);
  });

  test("mermaid is fetched only by posts that have a diagram", async ({
    page,
  }) => {
    const seen: string[] = [];
    page.on("request", (request) => {
      if (/mermaid/i.test(request.url())) seen.push(request.url());
    });

    // Positive control first: without it, an empty list on the plain post
    // could just mean the chunk is not named "mermaid" at all.
    await page.goto(DIAGRAM_POST);
    await expect(
      page.locator("figure.mermaid-figure svg").first(),
    ).toBeVisible();
    expect(seen.length, "diagram post must fetch the library").toBeGreaterThan(
      0,
    );

    seen.length = 0;
    await page.goto(PLAIN_POST);
    expect(seen, "a post with no fence must not fetch it").toEqual([]);
  });
});

test.describe("Pages", () => {
  test("core pages render without console or page errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    for (const path of ["/", "/posts/", "/about/", historicalUrls[0]]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} must render`).toBe(200);
    }
    expect(errors).toEqual([]);
  });

  test("cards without a cover collapse instead of leaving a gap", async ({
    page,
  }) => {
    // Filtered to the month holding a cover-less post: the feed paginates at
    // 5, so on page 1 there is nothing to assert and the test proves nothing.
    await page.goto("/posts/?month=2022-06");
    const bare = page.locator(".post-card.no-cover");
    await expect(bare).toHaveCount(1);
    expect(await bare.first().locator("img").count()).toBe(0);
    expect(
      await bare
        .first()
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns),
    ).not.toContain(" ");
  });
});
