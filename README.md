# Docs Platform — Keystatic + Next.js 16

A documentation platform where editors manage a **deeply nested tree of markdown
pages** through the Keystatic admin UI, content is **committed to GitHub** on
save, and the public site is **fully static** with **on-demand revalidation**.

- **CMS:** Keystatic (`@keystatic/core`, `@keystatic/next`) — GitHub storage mode
- **Framework:** Next.js 16.2 (App Router) + React 19
- **Authoring:** Markdoc with custom components (callouts, code blocks, tabs)
- **Auth:** custom email/password gate in front of `/keystatic`
- **Deploy:** Docker → AWS ECS Fargate (`next start`, standalone output)

## Architecture

| Concern | How |
| --- | --- |
| Nested tree | One `docs` collection, `path: 'src/content/docs/**'`. Hierarchy = slug path = URL. |
| Sidebar | `buildDocTree()` (`src/lib/docs.ts`) splits slugs into segments, sorts by `order`, hides drafts/hidden. |
| Public pages | `src/app/docs/[[...slug]]/page.tsx` — optional catch-all, `generateStaticParams`, `dynamicParams=false`. |
| Content read | `src/lib/reader.ts` — `createReader` (local/dev) or `createGitHubReader` (prod, runtime fetch = refreshable). |
| Admin auth | `src/proxy.ts` checks a signed session cookie; `/admin-login` validates email/password (`ADMIN_USERS`). |
| Revalidation | `src/app/api/revalidate/route.ts` — bearer secret (Postman) or GitHub webhook HMAC. |

## Local development

```bash
cp .env.example .env.local   # set ADMIN_USERS + SESSION_SECRET at minimum
npm install
npm run dev
```

- Public site: http://127.0.0.1:3000/docs
- Admin UI: http://127.0.0.1:3000/keystatic (redirects to `/admin-login`)

In dev, storage + reader default to **local** (writes markdown straight to
`src/content/docs`), so no GitHub setup is needed to try it out.

## Content model & nesting

Create nesting by putting **slashes in the slug**, e.g.
`guides/getting-started/install` →
`src/content/docs/guides/getting-started/install.mdoc` → `/docs/guides/getting-started/install`.

> ⚠️ Keystatic has **no folder-picker** for nested slugs
> ([issue #1482](https://github.com/Thinkmill/keystatic/issues/1482)) — editors
> type the path as free text. Agree on a naming convention to avoid divergent
> folders from typos.

Frontmatter fields drive the sidebar: `navLabel`, `order`, `draft` (excluded
from the published site), `hidden` (reachable by URL, not in the sidebar).

## Production (GitHub mode) setup

1. Set `KEYSTATIC_STORAGE_KIND=github`, `NEXT_PUBLIC_GITHUB_REPO_OWNER`,
   `NEXT_PUBLIC_GITHUB_REPO_NAME`.
2. Run the app and open `/keystatic` (behind the password gate) — Keystatic
   walks you through **creating a GitHub App**, then fill in
   `KEYSTATIC_GITHUB_CLIENT_ID/SECRET`, `KEYSTATIC_SECRET`,
   `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`.
3. Set `GITHUB_PAT` for the frontend reader (`createGitHubReader`).
4. Editors log in with GitHub (repo write access) **after** the email/password
   gate; every save auto-commits to the repo.

See `.env.example` for the full list.

## Revalidation

The site is static; content refreshes via `/api/revalidate` (no rebuild needed
when using the GitHub reader).

**Manual / Postman** — full-site refresh:
```bash
curl -X POST https://<domain>/api/revalidate \
  -H "Authorization: Bearer $REVALIDATE_SECRET" -d '{}'
```
Single page: add `-d '{"path":"/docs/guides/getting-started/install"}'`.

**Automatic on content change** — add a **GitHub push webhook** on the content
repo pointing at `https://<domain>/api/revalidate`, content-type
`application/json`, secret = `GITHUB_WEBHOOK_SECRET`. This covers **both** admin
saves (which commit to GitHub) and **direct edits** to md files — no separate
admin button needed.

## Deploy to AWS (ECS Fargate)

```bash
docker build \
  --build-arg NEXT_PUBLIC_GITHUB_REPO_OWNER=your-org \
  --build-arg NEXT_PUBLIC_GITHUB_REPO_NAME=your-docs-repo \
  -t docs-platform .
```

Run behind an ALB; supply all env vars from `.env.example` to the task. Point the
GitHub App OAuth callback URL and the push webhook at the deployed domain.
