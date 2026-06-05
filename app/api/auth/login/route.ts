import { NextResponse } from 'next/server';

export async function GET() {
  const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID;
  const REDIRECT_URI = process.env.OSU_REDIRECT_URI;

  if (!OSU_CLIENT_ID || !REDIRECT_URI) {
    console.error('[Auth Error] Missing required Environment Variables:', {
      OSU_CLIENT_ID: !!OSU_CLIENT_ID,
      OSU_REDIRECT_URI: !!REDIRECT_URI,
    });

    return NextResponse.json(
      { error: 'Server configuration error.' },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();

  const url = new URL('https://osu.ppy.sh/oauth/authorize');
  url.searchParams.set('client_id', OSU_CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'public');
  url.searchParams.set('state', state);

  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  });

  return response;
}