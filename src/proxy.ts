import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Email/password gate in FRONT of the Keystatic admin UI.
 *
 * IMPORTANT: we only match `/keystatic/*` (the UI). The Keystatic API routes
 * under `/api/keystatic/*` (GitHub OAuth handshake + commits) are intentionally
 * NOT gated here — wrapping the OAuth callback would break the GitHub login.
 *
 * The auth helpers are loaded with a dynamic `import()` INSIDE the function on
 * purpose: statically importing modules that pull `node:crypto`/`jose` into the
 * middleware bundle breaks it in Next.js ("adapterFn is not a function", see
 * vercel/next.js#76063). Deferring the import keeps the proxy module a clean
 * default-export function.
 */
export async function proxy(request: NextRequest) {
  const { SESSION_COOKIE, verifySession } = await import('@/lib/auth');

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (session) return NextResponse.next();

  const loginUrl = new URL('/admin-login', request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/keystatic/:path*'],
};
