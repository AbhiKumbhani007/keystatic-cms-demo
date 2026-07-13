/**
 * Next.js instrumentation — runs once on server startup. We use it to start the
 * content auto-commit watcher (bot-PAT push) on the Node.js runtime only, and
 * only when explicitly enabled via GIT_AUTO_COMMIT=true.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.GIT_AUTO_COMMIT !== 'true') return;

  const { startContentAutoCommit } = await import('@/lib/auto-commit');
  startContentAutoCommit();
}
