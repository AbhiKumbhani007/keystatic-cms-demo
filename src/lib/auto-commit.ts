import 'server-only';
import chokidar from 'chokidar';
import { commitAndPush } from './git';

// Directories the admin writes to (markdown + uploaded images).
const CONTENT_PATHS = ['src/content/docs', 'public/images/docs'];
const DEBOUNCE_MS = 4000;

let started = false;
let debounce: ReturnType<typeof setTimeout> | null = null;
let committing = false;

async function runCommit() {
  if (committing) {
    // Re-check shortly if a commit is already in flight.
    debounce = setTimeout(runCommit, 2000);
    return;
  }
  committing = true;
  try {
    const message = `content: update via admin (${new Date().toISOString()})`;
    const result = await commitAndPush(CONTENT_PATHS, message);
    if (result.committed) {
      console.log('[auto-commit] pushed content changes to GitHub');
      await triggerRevalidate();
    }
  } catch (err) {
    console.error('[auto-commit] failed:', err);
  } finally {
    committing = false;
  }
}

/** Ping our own revalidate endpoint so the static site reflects the change. */
async function triggerRevalidate() {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return;
  const port = process.env.PORT || '3000';
  try {
    await fetch(`http://127.0.0.1:${port}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: '{}',
    });
  } catch (err) {
    console.error('[auto-commit] revalidate ping failed:', err);
  }
}

/**
 * Watch the content directories and, after a debounce, commit + push any
 * changes as the bot user. Started once from instrumentation on the Node.js
 * runtime when GIT_AUTO_COMMIT=true.
 */
export function startContentAutoCommit() {
  if (started) return;
  started = true;

  const watcher = chokidar.watch(CONTENT_PATHS, {
    ignoreInitial: true,
    cwd: process.cwd(),
  });

  const schedule = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(runCommit, DEBOUNCE_MS);
  };

  watcher.on('add', schedule);
  watcher.on('change', schedule);
  watcher.on('unlink', schedule);

  console.log('[auto-commit] watching', CONTENT_PATHS.join(', '));
}
