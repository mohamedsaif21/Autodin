import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: 'http://localhost:3000/api/auth/callback',
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  const tokenData = await tokenRes.json();

  const decoded: any = jwtDecode(tokenData.id_token);

  return NextResponse.json({
    message: 'Copy these values to .env.local',
    LINKEDIN_ACCESS_TOKEN: tokenData.access_token,
    LINKEDIN_PERSON_URN: `urn:li:person:${decoded.sub}`,
    expires_in_days: Math.floor(tokenData.expires_in / 86400),
  });
}