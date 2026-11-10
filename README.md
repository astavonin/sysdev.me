# sysdev.me

Astro blog published at <https://sysdev.me>.

## Setup

Needs Node 22.12+. Run once per machine — it provisions the pnpm version pinned
in `package.json` via corepack and installs dependencies:

```bash
./env.sh
```

## Writing

Posts live in `src/content/posts/en/`. The filename is not the URL; the `slug`
field is. Front matter:

```yaml
---
title: "Post title"
description: "One or two sentences. Shown on cards and in the social image."
date: 2026-10-19
slug: "post-url-segment"
lang: en
category: cpp
tags: ["C++", "Tooling"]
cover: "/img/post-slug/lead.jpg"
featured: false
---
```

Posts publish at `/YYYY/MM/DD/<slug>/`, carried over from the MkDocs site so
existing links and analytics history keep resolving. `category` takes one value
from `categoryNames` in `src/data/post-options.ts`; everything else goes in
`tags`. Adding a category means editing `categoryNames`, `categoryIcons` and
the matching `category.*` key in `src/i18n/en.json` — the type checker fails
the build if the first two disagree. Images live in
`public/img/` and are referenced from the site root (`/img/...`).

## Build and publish

```bash
pnpm dev        # local server with hot reload
pnpm build      # type-check, then build to dist/
pnpm preview    # serve the built site
pnpm test:unit  # vitest, fast
pnpm test       # type-check, unit, then build + Playwright
```

`./publish.sh` builds and rsyncs `dist/` to the host over SSH. It sets
`PUBLIC_ANALYTICS=on` so the Google Analytics tag ships only in published
builds — local previews and test runs stay out of the property. Before copying
anything it asserts that every URL in `tests/fixtures/historical-urls.txt` and
all three feeds exist in `dist/`, so a build that silently emitted no posts
cannot reach the live site.

Security headers are the web server's job: this deploy is a plain rsync, so a
Cloudflare-style `public/_headers` file would be inert (and served as text).
Configure them in nginx/`.htaccess` on the host.

Deployment does not use `rsync --delete`, so the remote still holds the previous
MkDocs output. Mirroring would remove it — along with the `feed_json_*.json`
feeds, which this site does not generate. Dry-run before changing that; the
command is in `publish.sh`.

## Feeds

`/rss.xml` is canonical. `/feed_rss_created.xml` and `/feed_rss_updated.xml`
serve the same content for subscribers from the MkDocs era.

## Vendoring

The theme is vendored from [sud0pls/Grimorio-astro](https://github.com/sud0pls/Grimorio-astro)
(MIT), imported in the migration commit and modified since — there is no
upstream tracking branch. `git log --follow` on a file under `src/` shows
whether it has been touched locally. The site is single-language by design;
re-adding a locale means adding content under `src/content/posts/<lang>/`
first, since an advertised locale with no posts emits `hreflang` alternates
that 404.
