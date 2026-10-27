# AGENTS.md

Instructions for AI coding assistants (Claude Code, Copilot, etc.) working in this repo.
This file describes **this specific client site**, cloned from `client-site-starter`.
Keep it up to date as the site diverges from the template.

## This site

- **Client**: 3 Brothers Shop LLC, owner Javier Macias. Rustic furniture, Mexican imports
  and Día de los Muertos décor at 130 S Main St, downtown Las Cruces, NM.
  Instagram: https://www.instagram.com/3brothersshopllc/ · TikTok: https://www.tiktok.com/@3.brothers.llc
- **Status**: prospect concept, served at https://sebastiansells13-bot.github.io/3-brothers-shop/
  (`pathPrefix` is `/3-brothers-shop/`; Eleventy 3's base plugin prefixes root-relative
  URLs in HTML automatically, so don't add the `url` filter in templates). Switch
  `pathPrefix`, the sitemap hostname and `metadata.url` when the site moves to a custom domain.
- **Design**: matches the Instagram graphics. Dark wood textures, parchment cards, chile
  red, marigold and turquoise, papel picado banners. Fonts are Rye (headings), Yellowtail
  (script accents) and Bitter (body). Tokens are in `src/_includes/css/variables.scss`.
- **Content to confirm with the client**: store hours (`business.json` has none yet, so the
  site says to call), email, Facebook, and the About story copy.
- **Pages**: Home, What We Carry (`/shop/`), About, News (`/news/`, posts in `src/posts`), Visit.
- **English/Spanish toggle**: EN/ES buttons in the header, same markup contract as
  julia-ketsaa-remax. `src/_includes/js/i18n.js` (inlined at the end of `base.njk`) reads the
  `#i18n-data` dictionary island built from `src/_data/i18n.json` and applies `data-i18n`,
  `data-i18n-attr` (+ `data-i18n-vars`), `data-i18n-date`, `data-i18n-title`/`-title-es`,
  `data-alt-es` and `data-i18n-lang`; the choice persists per visitor in `localStorage`, and
  an inline `<head>` script hides the page until it's applied so English never flashes.
  Template text goes in the dictionary. CMS text never does: every CMS field has an optional
  `*Es` sibling (`introEs`, `titleEs`, `descriptionEs`, `captionEs`, `bodyEs`, `hoursNoteEs`,
  post front matter `titleEs`/`descriptionEs`/`bodyEs`…) rendered with
  `{{ bilingual(en, es) }}` from `macros/bilingual.njk`, and a blank one shows the English in
  both languages. The script-font accent lines ("Lo que tenemos", "Todo el año"…) are
  Spanish in both languages on purpose. Never put `data-i18n` on an element with child
  elements (it replaces `textContent`), and keep the header fitting in both languages at
  961px (the menu collapses at 960px).
- **SEO**: `base.njk` builds the `<title>` as `seoTitle` (keyword-first, front matter) or
  `title`, then " · 3 Brothers Shop LLC"; pair a `seoTitle` with a `titleKey` (`seo.*` in
  `i18n.json`) so the Spanish tab title matches. It also emits the canonical URL, Open Graph and
  Twitter tags (`og:type` article on posts), and JSON-LD from the `structuredData` filter in
  `eleventy.config.cjs` (HomeGoodsStore + WebSite on every page, BreadcrumbList on inner pages,
  BlogPosting on posts; the address is parsed out of `business.address`). Keep meta
  descriptions under 160 characters. `noindex: true` in front matter adds a robots noindex
  tag and drops the page from `sitemap.xml` (the 404 page uses it). `sitemap.xml.njk` and
  `robots.txt.njk` build absolute URLs from `metadata.url`. While the site lives under
  `/3-brothers-shop/` on github.io, crawlers ignore its `robots.txt` (they only read one at a
  domain root), so submit the sitemap in Search Console instead; on a custom domain it works
  as is.
- **Security**: production pages carry a Content-Security-Policy `<meta>` (built in
  `eleventy.config.cjs`; GitHub Pages can't send headers). It allows scripts only from this
  site plus the one inline boot script, by hash, so **don't add inline `<script>`s or
  `on*=`/`style=` attributes**: put JS in `src/_includes/js/` and register it in
  `assetFiles`/`assetPaths` like `nav.js`. A new third party (fonts, embeds, analytics) needs
  its origin added to the policy. Inline JSON data blocks must go through `jsonScript` (it
  escapes `<`, `>` and `&` so CMS text can't close the tag), and any CMS-provided URL in an
  `href` through `safeUrl`. CMS rich text is rendered unescaped by design, since only
  repo collaborators can edit it. Actions in the workflow are pinned to commit SHAs;
  Dependabot (`.github/dependabot.yml`) opens weekly update PRs for them and for npm.
- **CMS-editable data**: `business.json`, `home.json`, `categories.json`, `gallery.json`,
  `about.json`, plus the `posts` collection.

## Commands

- **Dev**: `npm start` (runs Sass + Eleventy with hot reload at http://localhost:8080/;
  writes generated pages to `dev/`, serves images/CSS/fonts straight from `src/`, and
  cleans `dev/` and `docs/` on startup and shutdown)
- **Build**: `npm run build` (cleans output, compiles Sass, builds the Eleventy site with
  original, unoptimized media into `docs/`)
- **CI build**: `npm run build:ci` (GitHub Actions only — runs `npm run build`, then
  optimizes referenced images with `scripts/optimize-media.mjs`)

## Architecture

- **SSG**: Eleventy (11ty) v3, static output, no server runtime
- **Input**: `src/` — Markdown and Nunjucks (`.njk`) templates
- **Dev output**: `dev/` (generated pages only; removed when `npm start` stops)
- **Production output**: `docs/` (generated, not committed; built in CI, deployed via
  GitHub Actions to GitHub Pages)
- **Templates**: Nunjucks for layouts and pages; Markdown for blog posts
- **Styling**: Sass, compiled from `src/_includes/css/index.scss` to a content-hashed,
  cache-busted `index.<hash>.css` (see `assetPaths` in `.eleventy.js`)
- **Content editing**: Pages CMS (`.pages.yml`) — the client edits structured content
  (posts, services, team members, etc.) through a GitHub-authenticated web UI with no
  code exposure. See `CMS-GUIDE.md` for the client-facing walkthrough.
- **Data**: `src/_data/business.json` holds the client's name, tagline, contact info,
  and social links — pulled from the intake worksheet. Reference it in templates rather
  than hardcoding business details.
- **Deployment**: pushes to `main` build the site and deploy to GitHub Pages;
  pull requests run the build to catch errors but do not deploy.

## Code style

- 2-space indentation, LF line endings, trim trailing whitespace, UTF-8 (per `.editorconfig`)
- Template formats: `.md`, `.njk`, `.html`
- Dates: UTC, Luxon filters `readableDate` (display) / `htmlDateString` (machine-readable)
- Passthrough assets live under `src/_includes/{img,favicons}`; don't reference images
  from anywhere else or the build won't copy them
- Don't hardcode content that a non-technical client might want to change — put it in
  `src/_data/` or a Pages CMS collection instead

## Adding a new page

1. Create `src/<page-name>.njk` with front matter `layout: layouts/page.njk`
2. Add it to `src/_data/navigation.json` if it belongs in the nav
3. If the client should be able to edit its content, add a matching entry to `.pages.yml`

## Adding a new content type to the CMS

1. Add a `collection` block to `.pages.yml` (see the `posts` entry as a template)
2. Create the corresponding Nunjucks layout under `src/_includes/layouts/`
3. Add a listing/index template if the content type needs its own index page
4. Document the new field set in `CMS-GUIDE.md` in plain language for the client

## What NOT to do

- Don't commit `dev/` or `docs/` — both are build output
- Don't add a runtime backend/server — this is a static site by design
- Don't remove the `assetPaths` content-hashing — it's what makes the CDN cache safe
  to set far-future/immutable
