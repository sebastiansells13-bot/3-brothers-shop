# Request-handling methodology

How a submitted intake worksheet turns into a deployed client site, from this template.

## 1. Worksheet → intake fields

`INTAKE-WORKSHEET.md` is the canonical form. It captures exactly what decides the
template tier and populates the first-pass content:

- Business name, one-line description, 3–5 example sites they like
- Pages needed (Home, About, Services, Blog, Contact, Store…)
- Functionality: static content only? forms? blog/CMS? events/RSVP? selling anything?
- Who edits content after launch — you, or the client themselves?
- Brand assets on hand (logo, colors, fonts) vs. needs-design
- Domain/hosting status
- Timeline and budget tier

## 2. Triage into a template tier

| Signal from worksheet | Template |
|---|---|
| Static pages, maybe a contact form, client won't touch content | This repo as-is, CMS section left unused |
| Client wants to self-edit content regularly | This repo + `.pages.yml` wired to their content types |
| Selling products/tickets/RSVPs (repeat/serious commerce) | Graduate to a Worker + Stripe/Resend stack shared via a platform submodule |
| Selling one simple product | Stay on this static template, embed a Stripe Payment Link — don't build a commerce stack for one SKU |

This triage step is the actual methodology: it stops every request from defaulting to
the heaviest stack.

## 3. Repo standup (per project)

1. Use this repo as a GitHub template → new repo named for the client
2. Set `CNAME`, `.eleventy.js` sitemap hostname, `package.json` name
3. Wire GitHub Pages (Settings → Pages → GitHub Actions) and, if applicable, Cloudflare
4. Fill `src/_data/business.json` from the worksheet answers
5. Update `AGENTS.md`/`CONTRIBUTING.md` for anything specific to this client

## 4. Build phase

Populate the template from worksheet answers into **content files** (`src/_data/`,
Markdown posts, CMS collections) — not hardcoded HTML — so the CMS handoff in the next
step works for free instead of requiring a rebuild.

## 5. Client handoff via CMS

If the client is self-editing: point them to Pages CMS
(`pagescms.org/edit/<org>/<repo>`), signed in with their own GitHub account, editing
structured content types with no code exposure. Write `CMS-GUIDE.md` in plain language
before handoff.

## 6. Deploy pipeline

`.github/workflows/build-deploy.yml` — push to `main` → install → build → optimize
media → deploy to GitHub Pages → optionally purge Cloudflare cache. Written once here,
reused per client repo with minor config changes.

## 7. Scaling past one-off sites

Once you've built 2–3 of these, pull shared pieces (build scripts, media optimization,
CI workflow, base layout) into your own platform repo and consume it as a git submodule
in each client repo, instead of copy-pasting boilerplate forward.
