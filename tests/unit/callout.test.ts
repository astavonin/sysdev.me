import { describe, expect, it } from "vitest";
import { markdownToHtml } from "satteri";
import {
  calloutKinds,
  calloutPlugin,
} from "../../src/plugins/satteri-callout.ts";
import en from "../../src/i18n/en.json" with { type: "json" };

// The same processor options as astro.config.mjs. Astro adds heading ids and
// Shiki highlighting around this; neither touches directive nodes.
const render = (
  markdown: string,
  fileURL = new URL("file:///src/content/posts/en/post.md"),
) =>
  markdownToHtml(markdown, {
    features: { directive: true, gfm: true },
    mdastPlugins: [calloutPlugin],
    fileURL,
  }).html.trim();

describe("callout directives", () => {
  it("renders a labelled callout as a collapsed details element", () => {
    expect(
      render(":::example[Simple echo server source code]\nBody.\n:::").replace(
        /\n/g,
        "",
      ),
    ).toBe(
      '<details class="callout callout-example">' +
        "<summary>Simple echo server source code</summary>" +
        '<div class="callout-body"><p>Body.</p></div>' +
        "</details>",
    );
  });

  it("expands the callout only when the open attribute is present", () => {
    expect(render(":::note[Title]{open}\nBody.\n:::")).toContain(
      '<details class="callout callout-note" open>',
    );
    // Not open="false": the attribute's presence is what expands a <details>.
    expect(render(":::note[Title]\nBody.\n:::")).not.toContain("open");
  });

  it("falls back to the kind's own label when none is written", () => {
    for (const kind of calloutKinds) {
      expect(render(`:::${kind}\nBody.\n:::`)).toContain(
        `<summary>${en[`callout.${kind}`]}</summary>`,
      );
    }
  });

  it("keeps the body as Markdown, so code fences still highlight", () => {
    const html = render(
      ":::example[Source]\n```go\nfunc main() {}\n```\n\n[A link](/posts/) and a footnote.[^1]\n\n[^1]: The note.\n:::",
    );
    expect(html).toContain("<code");
    expect(html).toContain("func main()");
    expect(html).toContain('<a href="/posts/">A link</a>');
    // The footnote definition inside a callout still reaches the page.
    expect(html).toContain("The note.");
  });

  it("reports an unknown kind rather than dropping the collapse", () => {
    expect(() => render(":::warn[Typo]\nBody.\n:::")).toThrow(
      /Unknown callout ":::warn"/,
    );
  });

  it("leaves a bare colon run in prose alone", () => {
    expect(render("Shell prompts use `::` and a lone ::: is just text.")).toBe(
      "<p>Shell prompts use <code>::</code> and a lone ::: is just text.</p>",
    );
  });
});
