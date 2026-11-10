import { describe, expect, it, vi } from "vitest";
import settings from "../../src/site.config.json" with { type: "json" };
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  categoryIcon,
  categoryIcons,
  categoryNames,
  normalizeCategory,
} from "../../src/data/post-options";
import {
  countWords,
  dateParams,
  datePath,
  permalink,
} from "../../src/lib/permalink";

const postsDir = fileURLToPath(
  new URL("../../src/content/posts/en", import.meta.url),
);
const publicDir = fileURLToPath(new URL("../../public", import.meta.url));
const historical = readFileSync(
  fileURLToPath(new URL("../fixtures/historical-urls.txt", import.meta.url)),
  "utf8",
)
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

function frontMatter(file: string) {
  const text = readFileSync(`${postsDir}/${file}`, "utf8").split("---\n")[1];
  const field = (name: string) =>
    text.match(new RegExp(`^${name}:\\s*"?([^"\\n]+)"?`, "m"))?.[1]?.trim();
  return { date: field("date"), slug: field("slug"), cover: field("cover") };
}

const postFiles = readdirSync(postsDir).filter((file) => file.endsWith(".md"));

describe("permalink scheme", () => {
  it("reproduces every historical URL from front matter alone", () => {
    const built = postFiles
      .map((file) => {
        const { date, slug } = frontMatter(file);
        return permalink(new Date(date!), slug ?? file.replace(/\.md$/, ""));
      })
      .sort();
    // The fixture came from the MkDocs build, not from this code — so this
    // compares the contract against the implementation, not against itself.
    // Containment, not equality: new posts join, historical ones never leave.
    expect(built).toEqual(expect.arrayContaining(historical));
  });

  it("derives route params and path from one source", () => {
    const date = new Date("2026-10-19");
    expect(datePath(date)).toBe("2026/10/19");
    expect(dateParams(date)).toEqual({
      year: "2026",
      month: "10",
      day: "19",
    });
  });

  it("keeps the authored day under a non-UTC host timezone", () => {
    // vitest runs at America/New_York; local getters would yield the 18th here
    // and the 19th on the author's UTC+6 machine — a host-dependent permalink.
    expect(process.env.TZ).toBe("America/New_York");
    expect(datePath(new Date("2026-10-19"))).toBe("2026/10/19");
    expect(datePath(new Date("2026-10-19T00:30:00Z"))).toBe("2026/10/19");
    expect(datePath(new Date("2026-10-19T23:30:00Z"))).toBe("2026/10/19");
  });
});

describe("post front matter", () => {
  it("points every declared cover at a file that exists", () => {
    // There is no longer a fallback, so a typo yields a silently broken card.
    const broken = postFiles
      .map((file) => [file, frontMatter(file).cover] as const)
      .filter(([, cover]) => cover)
      .filter(([, cover]) => !existsSync(`${publicDir}${cover}`));
    expect(broken).toEqual([]);
  });

  it("has a known, bounded set of posts with no cover", () => {
    // Editorial gap, not a code defect: these two have no lead image at all.
    // Listing them here makes the gap visible and stops it growing silently.
    const missing = postFiles.filter((file) => !frontMatter(file).cover).sort();
    expect(missing).toEqual([
      "random_python_hangs.md",
      "returning-to-rust-a-journey-through-tooling-performance.md",
    ]);
  });

  it("uses slugs that are safe in a URL path", () => {
    const bad = postFiles
      .map((file) => frontMatter(file).slug)
      .filter((slug): slug is string => Boolean(slug))
      .filter((slug) => !/^[a-z0-9]+(?:-{1,2}[a-z0-9]+)*$/.test(slug));
    expect(bad).toEqual([]);
  });
});

describe("analytics gate", () => {
  it("ships the tag only when the build opted in", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_ANALYTICS", "on");
    const on = await import("../../src/config");
    expect(on.getSiteInfo("en").analyticsId).toBe(settings.site.analyticsId);

    vi.resetModules();
    vi.stubEnv("PUBLIC_ANALYTICS", "");
    const off = await import("../../src/config");
    expect(off.getSiteInfo("en").analyticsId).toBe("");
    vi.unstubAllEnvs();
  });
});

describe("categories", () => {
  it("gives every configured category a real icon", () => {
    const fallback = categoryIcon("definitely-not-a-category");
    const unmapped = categoryNames.filter(
      (name) => categoryIcon(name) === fallback,
    );
    expect(unmapped).toEqual([]);
  });

  it("declares no icon for a category the schema would reject", () => {
    // The old drift here is what made the test suite click a `bazel` tab that
    // could never render.
    const orphans = Object.keys(categoryIcons).filter(
      (key) => !(categoryNames as readonly string[]).includes(key),
    );
    expect(orphans).toEqual([]);
  });

  it("passes an unknown category through unchanged", () => {
    expect(normalizeCategory("not-a-category")).toBe("not-a-category");
  });
});

describe("countWords", () => {
  it("counts prose", () => {
    expect(countWords("one two three")).toBe(3);
  });

  it("ignores fenced code, HTML and image URLs", () => {
    const body = [
      "two words",
      "```bash",
      "a b c d e f g",
      "```",
      '<img src="/img/x.png" alt="">',
      "![](/img/y.svg)",
    ].join("\n");
    expect(countWords(body)).toBe(2);
  });

  it("keeps link text but drops image references", () => {
    expect(countWords("see [the earlier post](https://x/) for details")).toBe(
      6,
    );
    expect(countWords("![a caption](/img/x.png)")).toBe(0);
  });

  it("returns zero for an empty body", () => {
    expect(countWords("   \n  ")).toBe(0);
  });
});
