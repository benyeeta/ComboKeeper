import { NextResponse } from 'next/server';

export async function GET() {
  const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID?.trim();
  const REDIRECT_URI = process.env.OSU_REDIRECT_URI?.trim();

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

  // --- TEMPORARY DEBUGGING STEP ---
  // Instead of redirecting, let's return the URL as JSON to inspect it.
  // This also means we don't set the state cookie yet.
  return NextResponse.json({ generatedUrl: url.toString() });
}