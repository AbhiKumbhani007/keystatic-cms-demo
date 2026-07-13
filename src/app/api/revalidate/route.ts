import { revalidatePath } from 'next/cache';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { pullLatest } from '@/lib/git';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function verifyGitHubSignature(raw: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected =
    'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
  return safeEqual(signature, expected);
}

function verifyBearer(request: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const querySecret = request.nextUrl.searchParams.get('secret');
  const provided = bearer ?? querySecret;
  return !!provided && safeEqual(provided, secret);
}

/**
 * On-demand revalidation.
 *
 * Triggers:
 *  - Manual (Postman): `Authorization: Bearer <REVALIDATE_SECRET>` (or
 *    `?secret=`). Optional JSON body `{ "path": "/docs/guides/setup" }` for a
 *    single page; otherwise the whole site is refreshed.
 *  - GitHub push webhook (covers direct md edits): `X-Hub-Signature-256` HMAC
 *    verified against `GITHUB_WEBHOOK_SECRET`; refreshes the whole site.
 *
 * `revalidatePath('/', 'layout')` purges all cached routes + data, so the next
 * visit re-renders and (with the GitHub reader) pulls the latest commit.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const ghSignature = request.headers.get('x-hub-signature-256');

  const authorized = ghSignature
    ? verifyGitHubSignature(raw, ghSignature)
    : verifyBearer(request);

  if (!authorized) {
    return Response.json(
      { revalidated: false, message: 'Unauthorized' },
      { status: 401 },
    );
  }

  let path: string | null = null;
  let pull = false;
  if (raw) {
    try {
      const body = JSON.parse(raw);
      if (!ghSignature && typeof body.path === 'string') path = body.path;
      if (body.pull === true) pull = true;
    } catch {
      // ignore malformed body — fall through to full-site refresh
    }
  }

  // A GitHub push webhook (direct md edits) — or an explicit { "pull": true } —
  // means the working tree is stale; pull the latest content onto disk first.
  if (ghSignature || pull) {
    try {
      await pullLatest();
    } catch (err) {
      return Response.json(
        { revalidated: false, message: `git pull failed: ${String(err)}` },
        { status: 500 },
      );
    }
  }

  if (path) {
    revalidatePath(path);
  } else {
    revalidatePath('/', 'layout');
  }

  return Response.json({ revalidated: true, scope: path ?? 'all' });
}
