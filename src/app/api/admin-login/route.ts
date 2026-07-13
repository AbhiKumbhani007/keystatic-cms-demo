import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, checkCredentials, signSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let email = '';
  let password = '';

  try {
    const body = await request.json();
    email = typeof body.email === 'string' ? body.email : '';
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request' }, { status: 400 });
  }

  if (!checkCredentials(email, password)) {
    return NextResponse.json(
      { ok: false, message: 'Invalid email or password' },
      { status: 401 },
    );
  }

  const token = await signSession(email.trim().toLowerCase());
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12h — keep in sync with the JWT TTL
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
