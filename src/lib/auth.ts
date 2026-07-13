import { SignJWT, jwtVerify } from 'jose';
import { timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'admin_session';
const SESSION_TTL = '12h';

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET must be set to a random string of at least 32 characters.',
    );
  }
  return new TextEncoder().encode(secret);
}

/** Constant-time string comparison that never short-circuits on length. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // Compare against a fixed-length buffer to avoid leaking length via timing.
  const max = Math.max(ab.length, bb.length, 1);
  const pa = Buffer.alloc(max);
  const pb = Buffer.alloc(max);
  ab.copy(pa);
  bb.copy(pb);
  return timingSafeEqual(pa, pb) && ab.length === bb.length;
}

/**
 * ADMIN_USERS format: "email:password,email2:password2"
 * (comma-separated pairs; the first ':' splits email from password).
 * Store this as a secret env var. Passwords may contain no comma.
 */
function getAllowlist(): Array<{ email: string; password: string }> {
  return (process.env.ADMIN_USERS ?? '')
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf(':');
      return {
        email: pair.slice(0, idx).trim().toLowerCase(),
        password: pair.slice(idx + 1),
      };
    });
}

export function checkCredentials(email: string, password: string): boolean {
  const normalized = email.trim().toLowerCase();
  // Iterate the whole list (no early return) so timing doesn't reveal which
  // email exists.
  let matched = false;
  for (const user of getAllowlist()) {
    if (safeEqual(user.email, normalized) && safeEqual(user.password, password)) {
      matched = true;
    }
  }
  return matched;
}

export async function signSession(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSessionSecret());
}

export async function verifySession(
  token: string | undefined,
): Promise<{ email: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return typeof payload.email === 'string' ? { email: payload.email } : null;
  } catch {
    return null;
  }
}
