import 'server-only';
import { createReader } from '@keystatic/core/reader';
import { createGitHubReader } from '@keystatic/core/reader/github';
import keystaticConfig from '@/keystatic.config';

/**
 * Reader selection:
 * - `local`  : reads committed markdown from the local filesystem (dev, or
 *              local production testing). Content changes require the files on
 *              disk to change.
 * - `github` : fetches content from the GitHub repo at request time, so
 *              on-demand revalidation reflects new commits WITHOUT a rebuild.
 *
 * Override with KEYSTATIC_READER=local|github; otherwise defaults to `github`
 * in production and `local` everywhere else.
 */
// Default to the local reader: content lives on disk in the app's working tree
// (committed to GitHub by the bot), so the local reader always sees current
// content and revalidation re-reads it. Override with KEYSTATIC_READER=github to
// fetch from the GitHub API at runtime instead.
const mode =
  process.env.KEYSTATIC_READER ??
  process.env.KEYSTATIC_STORAGE_KIND ??
  'local';

export function getReader() {
  if (mode === 'github') {
    const owner = process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER;
    const name = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME;
    if (!owner || !name) {
      throw new Error(
        'GitHub reader requires NEXT_PUBLIC_GITHUB_REPO_OWNER and NEXT_PUBLIC_GITHUB_REPO_NAME.',
      );
    }
    return createGitHubReader(keystaticConfig, {
      repo: `${owner}/${name}`,
      token: process.env.GITHUB_PAT,
      ref: process.env.GITHUB_CONTENT_REF, // optional branch, defaults to repo default
    });
  }

  return createReader(process.cwd(), keystaticConfig);
}
