import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (process.env.ENFORCE_HTTPS === 'false') {
    return NextResponse.next()
  }

  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol
  if (proto === 'http:' || proto === 'http') {
    const url = request.nextUrl.clone()
    url.protocol = 'https'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
