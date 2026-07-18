import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function proxy(request: NextRequest) {
  const token = request.cookies.get('daytona_token')?.value;
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(p => path.startsWith(p));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  if (token && isPublic) {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
