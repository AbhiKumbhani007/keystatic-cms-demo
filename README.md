# Docs Platform — Keystatic + Next.js 16

A documentation platform where editors manage a **deeply nested tree of markdown
pages** through the Keystatic admin UI (behind an **email/password** gate), every
change is **auto-committed to GitHub by a bot user**, and the public site is
**fully static** with **on-demand revalidation**.

- **CMS:** Keystatic (`@keystatic/core`, `@keystatic/next`) — **local** storage mode
- **Framework:** Next.js 16.2 (App Router) + React 19
- **Authoring:** Markdoc with custom components (callouts, code blocks, tabs)
- **Auth:** custom email/password gate in front of `/keystatic` (no GitHub accounts for editors)
- **Auto-commit:** a server-side watcher commits + pushes edits to GitHub as a **bot user via a PAT**
- **Deploy:** Docker → AWS ECS Fargate (`next start`, standalone output)

## How it works

```
Editor → /admin-login (email/password) → /keystatic
       → save → Keystatic writes markdown to disk (local mode)
       → chokidar watcher (instrumentation) debounces
       → git commit as bot + push (PAT) → GitHub
       → pings /api/revalidate → static site refreshes

Direct md edit on GitHub → push webhook → /api/revalidate → git pull + revalidate
```

Content and the app live in **one repo**; markdown is under `src/content/docs/**`.

| Concern | How |
| --- | --- |
| Nested tree | One `docs` collection, `path: 'src/content/docs/**'`. Hierarchy = slug path = URL. |
| Sidebar | `buildDocTree()` (`src/lib/docs.ts`) splits slugs into segments, sorts by `order`, hides drafts/hidden. |
| Public pages | `src/app/docs/[[...slug]]/page.tsx` — optional catch-all, `generateStaticParams`, `dynamicParams=false`. |
| Content read | `src/lib/reader.ts` — local `createReader` (reads committed markdown from disk). |
| Admin auth | `src/proxy.ts` checks a signed cookie; `/admin-login` validates email/password (`ADMIN_USERS`). |
| Auto-commit | `src/lib/auto-commit.ts` (watcher) + `src/lib/git.ts` (bot commit/push) + `src/instrumentation.ts`. |
| Revalidation | `src/app/api/revalidate/route.ts` — bearer secret (Postman) or GitHub webhook HMAC (pulls first). |
| Theming | `src/app/globals.css` design tokens (light + dark) + `.docs-content` typography. |

## Local development

```bash
cp .env.example .env.local   # fill in the values below
npm install
npm run dev
```

- Public site: http://127.0.0.1:3000/docs
- Admin UI: http://127.0.0.1:3000/keystatic (redirects to `/admin-login`)

**Minimum env to run** (`.env.local`): `ADMIN_USERS`, `SESSION_SECRET`,
`REVALIDATE_SECRET`. To enable auto-commit, also set the bot vars below.

### Enabling bot auto-commit

Set in `.env.local` (see `.env.example`):

```
NEXT_PUBLIC_GITHUB_REPO_OWNER="AbhiKumbhani007"
NEXT_PUBLIC_GITHUB_REPO_NAME="keystatic-cms-demo"
GITHUB_PAT="<bot PAT with Contents:read/write on the repo>"
GIT_BOT_NAME="Keystatic Bot"
GIT_BOT_EMAIL="bot@users.noreply.github.com"
GIT_AUTO_COMMIT="true"
```

The watcher starts on server boot (via `src/instrumentation.ts`). Edit a doc in
`/keystatic`, and within a few seconds the change is committed + pushed to the
repo as the bot, then the live site is revalidated. If `GITHUB_PAT` is unset the
watcher is a safe no-op.

> Security: the PAT is fed to git via a credential helper reading from the
> process env — it is never placed in a URL, argv, or error output.

## Content model & nesting

Create nesting by putting **slashes in the slug**, e.g.
`guides/getting-started/install` →
`src/content/docs/guides/getting-started/install.mdoc` → `/docs/guides/getting-started/install`.

> ⚠️ Keystatic has **no folder-picker** for nested slugs
> ([issue #1482](https://github.com/Thinkmill/keystatic/issues/1482)) — editors
> type the path as free text. Agree on a naming convention.

Frontmatter fields drive the sidebar: `navLabel`, `order`, `draft` (excluded from
the site), `hidden` (reachable by URL, not in the sidebar).

Custom Markdoc components (`callout`, `tabs`, `tab`) are registered **twice** and
must stay aligned: for the editor in `keystatic.config.ts`
(`@keystatic/core/content-components`) and for rendering in `src/lib/markdoc.ts`
+ `src/components/markdoc/*`.

## Revalidation

**Manual / Postman** — full-site refresh:
```bash
curl -X POST https://<domain>/api/revalidate \
  -H "Authorization: Bearer $REVALIDATE_SECRET" -d '{}'
```
Single page: `-d '{"path":"/docs/guides/getting-started/install"}'`.
Force a content pull first: `-d '{"pull":true}'`.

**Automatic** — add a **GitHub push webhook** on the repo → `/api/revalidate`,
content-type `application/json`, secret = `GITHUB_WEBHOOK_SECRET`. On a direct md
edit it verifies the HMAC, `git pull`s the change, and revalidates.

## Deploy to AWS (ECS Fargate)

```bash
docker build \
  --build-arg NEXT_PUBLIC_GITHUB_REPO_OWNER=AbhiKumbhani007 \
  --build-arg NEXT_PUBLIC_GITHUB_REPO_NAME=keystatic-cms-demo \
  -t docs-platform .
```

Run behind an ALB; supply all env vars from `.env.example` to the task. Ensure
`git` is available in the runtime image and the working tree is a clone of the
content repo. Point the push webhook at the deployed domain.

> Note: the auto-commit watcher assumes a **single** writable instance. For
> multiple replicas, only the instance that served the save has the change until
> the others pull; scale the admin to one task or add a shared pull step.
