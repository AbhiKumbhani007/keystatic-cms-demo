import 'server-only';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const CWD = process.cwd();

function branch(): string {
  return process.env.GIT_CONTENT_BRANCH || 'main';
}

function repoUrl(): string | null {
  const owner = process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER;
  const name = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME;
  if (!owner || !name || !process.env.GITHUB_PAT) return null;
  // Clean URL — NO token embedded (token is supplied via the credential helper
  // below, so it never lands in argv, the URL, or git's error output).
  return `https://github.com/${owner}/${name}.git`;
}

/**
 * Credential-helper args that feed the bot PAT to git from the process env.
 * The helper is an inline shell function; git runs it and reads username/
 * password from stdout. `$GITHUB_PAT` is expanded inside git's child shell,
 * which inherits process.env — the token is never passed as an argument.
 */
function authArgs(): string[] {
  const user = process.env.GIT_BOT_USERNAME || 'x-access-token';
  return [
    '-c',
    'credential.helper=',
    '-c',
    `credential.helper=!f() { echo "username=${user}"; echo "password=$GITHUB_PAT"; }; f`,
  ];
}

/** Remove the PAT from any string before it is logged or returned. */
function redact(text: string): string {
  const pat = process.env.GITHUB_PAT;
  return pat ? text.split(pat).join('***') : text;
}

async function git(args: string[]) {
  try {
    return await exec('git', args, { cwd: CWD, maxBuffer: 20 * 1024 * 1024 });
  } catch (err) {
    throw new Error(redact(err instanceof Error ? err.message : String(err)));
  }
}

/** Stage the given paths, commit as the bot (if anything changed), and push. */
export async function commitAndPush(
  paths: string[],
  message: string,
): Promise<{ committed: boolean; reason?: string }> {
  const url = repoUrl();
  if (!url) return { committed: false, reason: 'missing GITHUB_PAT / repo env' };

  const name = process.env.GIT_BOT_NAME || 'Keystatic Bot';
  const email = process.env.GIT_BOT_EMAIL || 'bot@users.noreply.github.com';

  await git(['add', '--', ...paths]);

  // `diff --cached --quiet` exits 0 when nothing is staged.
  try {
    await git(['diff', '--cached', '--quiet']);
    return { committed: false, reason: 'no changes' };
  } catch {
    // non-zero exit => staged changes exist; continue.
  }

  await git([
    '-c',
    `user.name=${name}`,
    '-c',
    `user.email=${email}`,
    'commit',
    '-m',
    message,
  ]);

  // Integrate any concurrent remote changes before pushing.
  await git([...authArgs(), 'pull', '--rebase', url, branch()]);
  await git([...authArgs(), 'push', url, `HEAD:${branch()}`]);
  return { committed: true };
}

/** Pull the latest content (used by the revalidation webhook for direct edits). */
export async function pullLatest(): Promise<void> {
  const url = repoUrl();
  if (!url) throw new Error('missing GITHUB_PAT / repo env');
  await git([...authArgs(), 'pull', '--rebase', url, branch()]);
}
