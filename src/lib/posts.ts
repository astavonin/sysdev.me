import { getCollection, type CollectionEntry } from "astro:content";
import { categoryNames } from "../data/post-options";
import { localizePath, type Language } from "../i18n";
import { countWords, dateParams, permalink } from "./permalink";

export { dateParams };

export type PostSummary = {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  featured: boolean;
  minutes: number;
  // Card and OG image, from the post's `cover`. Empty when it has none.
  cover: string;
  // Published path, /YYYY/MM/DD/slug/ — unchanged from the MkDocs site so
  // inbound links and analytics history keep resolving.
  permalink: string;
};
export const categories = categoryNames;

export async function getPosts(lang: Language) {
  return (
    await getCollection(
      "posts",
      ({ data }) => !data.draft && data.lang === lang,
    )
  ).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
export function summarize(post: CollectionEntry<"posts">): PostSummary {
  const id = getPostId(post);
  return {
    id,
    ...post.data,
    date: post.data.date.toISOString().slice(0, 10),
    minutes: readingMinutes(post.body ?? ""),
    cover: post.data.cover ?? "",
    // Already localized, so every consumer links the same way.
    permalink: localizePath(post.data.lang, permalinkFor(post)),
  };
}
// Words per minute for the reading estimate.
const WORDS_PER_MINUTE = 200;

function readingMinutes(body: string): number {
  const rate = WORDS_PER_MINUTE;
  return Math.max(1, Math.ceil(countWords(body) / rate));
}
export function permalinkFor(post: CollectionEntry<"posts">): string {
  return permalink(post.data.date, post.data.slug ?? getPostId(post));
}
export function getPostId(post: CollectionEntry<"posts">): string {
  const prefix = `${post.data.lang.toLowerCase()}/`;
  return post.id.startsWith(prefix) ? post.id.slice(prefix.length) : post.id;
}
export function getTags(posts: PostSummary[]) {
  return [...new Set(posts.flatMap((post) => post.tags))];
}
