import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const headers: Record<string, string> = {};
    request.headers.forEach((v, k) => { headers[k] = v });
    const qp: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((v, k) => { qp[k] = v });

    console.log('[debug.GET] incoming request', {
      url: request.url,
      headers,
      query: qp,
    });

    return NextResponse.json({ ok: true, url: request.url, headers, query: qp });
  } catch (err) {
    console.error('[debug.GET] error', err);
    return NextResponse.json({ error: 'debug failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const headers: Record<string, string> = {};
    request.headers.forEach((v, k) => { headers[k] = v });
    const body = await request.text();

    console.log('[debug.POST] incoming request', { url: request.url, headers, body });
    return NextResponse.json({ ok: true, url: request.url, headers, body });
  } catch (err) {
    console.error('[debug.POST] error', err);
    return NextResponse.json({ error: 'debug failed' }, { status: 500 });
  }
}
