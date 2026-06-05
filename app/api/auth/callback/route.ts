import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/session';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // 1. Verify the state against the cookie to prevent CSRF attacks
  const savedState = req.cookies.get('oauth_state')?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.json(
      { error: 'Invalid or missing state/code. Please try logging in again.' },
      { status: 400 }
    );
  }

  const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID?.trim();
  const OSU_CLIENT_SECRET = process.env.OSU_CLIENT_SECRET?.trim();
  const REDIRECT_URI = process.env.OSU_REDIRECT_URI?.trim();

  if (!OSU_CLIENT_ID || !OSU_CLIENT_SECRET || !REDIRECT_URI) {
    console.error('Missing osu! OAuth environment variables');
    return NextResponse.json(
      { error: 'Server configuration error.' },
      { status: 500 }
    );
  }

  try {
    // 2. Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: OSU_CLIENT_ID,
        client_secret: OSU_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[osu! Token Error]', errorText);
      throw new Error('Failed to fetch access token');
    }

    const tokenData = await tokenResponse.json();

    // Fetch user profile from the osu! API
    const userResponse = await fetch('https://osu.ppy.sh/api/v2/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data from osu!');
    }

    const userData = await userResponse.json();

    // 3. Redirect back to the home page (or dashboard)
    const response = NextResponse.redirect(new URL('/', req.url));

    // Clean up the temporary OAuth state cookie
    response.cookies.delete('oauth_state');

    // Establish a session cookie so the application knows we are logged in
    const sessionPayload = {
      id: userData.id,
      username: userData.username,
      avatar_url: userData.avatar_url,
    };
    const encryptedSession = await encrypt(sessionPayload);

    response.cookies.set('session', encryptedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokenData.expires_in || 86400,
    });

    return response;
  } catch (error) {
    console.error('Error during OAuth callback:', error);
    return NextResponse.json(
      { error: 'Authentication failed.' },
      { status: 500 }
    );
  }
}
