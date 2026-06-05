import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Redirect the user back to the home page after logging out
  const response = NextResponse.redirect(new URL('/', req.url));

  // Delete the session cookie
  response.cookies.delete('session');

  return response;
}
