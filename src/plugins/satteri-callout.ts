import { defineMdastPlugin } from "satteri";
import { fileURLToPath } from "node:url";
import type { Paragraph } from "mdast";
import { getLanguage, translate, type TranslationKey } from "../i18n/index.ts";

/**
 * Collapsible callouts for Markdown posts, written as container directives:
 *
 * ```markdown
 * :::example[Simple echo server source code]{open}
 * Ordinary Markdown, including fenced code and Mermaid diagrams.
 * :::
 * ```
 *
 * The label is optional and falls back to the kind's own name; `{open}`
 * renders the callout expanded instead of collapsed. Needs Sätteri's
 * `directive` feature, which is what parses the `:::` blocks.
 */

// The data bag is open at runtime — the compiler reads hName/hProperties off
// any node — but mdast's published types predate it and declare neither.
declare module "mdast" {
  interface Data {
    hName?: string;
    hProperties?: Record<string, unknown>;
  }
}

/** Admonition kinds, matching the vocabulary the Go guide already uses. */
const LABELS = {
  note: "callout.note",
  example: "callout.example",
  info: "callout.info",
  tip: "callout.tip",
  warning: "callout.warning",
} satisfies Record<string, TranslationKey>;

export type CalloutKind = keyof typeof LABELS;

export const calloutKinds = Object.keys(LABELS) as CalloutKind[];

const isKind = (name: string): name is CalloutKind => name in LABELS;

/** ".../content/posts/en/post.md" -> "en", so labels follow the post. */
const languageOf = (fileURL: URL | undefined) =>
  getLanguage(fileURL?.pathname.split("/posts/")[1]?.split("/")[0]);

export const calloutPlugin = defineMdastPlugin({
  name: "callout",
  // So an unknown kind can name the line it is on.
  options: { position: true },
  containerDirective(node, ctx) {
    if (!isKind(node.name)) {
      // An unknown kind would otherwise render as a bare <div>: the text
      // survives and the collapse silently does not. Fail the build instead.
      // ctx.report() is not enough — the compiler collects diagnostics and
      // nothing downstream reads them, so the typo would ship.
      const where = [
        ctx.fileURL && fileURLToPath(ctx.fileURL),
        node.position && `line ${node.position.start.line}`,
      ]
        .filter(Boolean)
        .join(", ");
      throw new Error(
        `Unknown callout ":::${node.name}" (${where}). Use one of: ${calloutKinds.join(", ")}.`,
      );
    }

    // The directive parses `[label]` into a leading paragraph flagged as the
    // label; everything else is body content.
    const [first, ...rest] = node.children;
    const labelled =
      first?.type === "paragraph" && first.data?.directiveLabel === true;

    const summary: Paragraph = labelled
      ? { ...first, data: { ...first.data, hName: "summary" } }
      : {
          type: "paragraph",
          data: { hName: "summary" },
          children: [
            {
              type: "text",
              value: translate(languageOf(ctx.fileURL), LABELS[node.name]),
            },
          ],
        };

    ctx.setProperty(node, "children", [
      summary,
      // A blockquote carries the body: it is the simplest mdast node that
      // holds block content, and hName rewrites it to the wrapper <div>.
      {
        type: "blockquote",
        data: { hName: "div", hProperties: { class: "callout-body" } },
        children: labelled ? rest : [...node.children],
      },
    ]);

    ctx.setProperty(node, "data", {
      hName: "details",
      hProperties: {
        class: `callout callout-${node.name}`,
        // Present or absent, never open="false": the attribute's presence is
        // what expands a <details>, whatever its value.
        ...(node.attributes && "open" in node.attributes ? { open: true } : {}),
      },
    });
  },
});
