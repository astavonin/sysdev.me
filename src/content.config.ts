import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { SLUG_PATTERN } from "./lib/permalink";
import { categoryNames, normalizeCategory } from "./data/post-options";
import { defaultLanguage, languages } from "./i18n";

const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    date: z.coerce.date(),
    // Published URL segment. Defaults to the filename; set explicitly where
    // the historical URL was derived from the title instead.
    // Shape-checked: a hand-transcribed slug with a slash, space or capital
    // would publish a URL that differs from the historical one silently.
    slug: z.string().trim().regex(SLUG_PATTERN).optional(),
    // Optional: set when you revise a post so search engines see the update.
    updated: z.coerce.date().optional(),
    lang: z.enum(languages).default(defaultLanguage),
    category: z.preprocess(
      (value) => (typeof value === "string" ? normalizeCategory(value) : value),
      z.enum(categoryNames),
    ),
    tags: z.array(z.string().trim().min(1)),
    // Card and OG-card image. Set explicitly so the lead photo wins over any
    // diagram that happens to appear first in the body.
    cover: z.string().trim().min(1).optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});
export const collections = { posts };
