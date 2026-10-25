# Contributing

Conventions for developers (human or AI) working in this repo.

## Branching

- `main` is always deployable — pushes to it trigger a production deploy
- Work in feature branches: `feature/<short-description>` or `fix/<short-description>`
- Open a pull request into `main`; the build workflow runs automatically and must pass
  before merging

## Commits

- Keep commits scoped to one logical change
- Use an imperative subject line ("Add services page", not "Added services page")

## Before opening a PR

- `npm run build` locally and confirm it completes without errors
- Check that any new page is reachable from navigation (or intentionally isn't)
- Check that any client-editable content was added to `.pages.yml`, not hardcoded

## Adding a new client site from this template

1. Use this repo as a GitHub template (or `degit`/clone + reset git history)
2. Update `package.json` name, `.eleventy.js` sitemap hostname, and `CNAME`
3. Fill in `src/_data/business.json` from the client's intake worksheet
4. Replace placeholder images/favicons under `src/_includes/`
5. Update `AGENTS.md` and `CMS-GUIDE.md` for anything client-specific
6. Set the `CLOUDFLARE_*` repo secrets/vars only if the client site sits behind Cloudflare
