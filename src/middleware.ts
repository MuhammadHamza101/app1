import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || '60000')
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || '120')
const rateLimitBuckets = new Map<string, { count: number; windowStart: number }>()

function enforceRateLimit(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api')) return null

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const bucket = rateLimitBuckets.get(ip)
  const now = Date.now()

  if (!bucket || now - bucket.windowStart > rateLimitWindowMs) {
    rateLimitBuckets.set(ip, { count: 1, windowStart: now })
    return null
  }

  bucket.count += 1
  if (bucket.count > rateLimitMax) {
    const retryAfter = Math.ceil((bucket.windowStart + rateLimitWindowMs - now) / 1000)
    const response = NextResponse.json(
      { error: 'Rate limit exceeded. Please retry shortly.' },
      { status: 429 }
    )
    response.headers.set('Retry-After', String(retryAfter))
    return response
  }

  rateLimitBuckets.set(ip, bucket)
  return null
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Referrer-Policy', 'no-referrer-when-downgrade')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('X-XSS-Protection', '1; mode=block')
}

export function middleware(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request)
  if (rateLimitResponse) {
    addSecurityHeaders(rateLimitResponse)
    return rateLimitResponse
  }

  if (process.env.ENFORCE_HTTPS === 'false') {
    const insecureResponse = NextResponse.next()
    addSecurityHeaders(insecureResponse)
    return insecureResponse
  }

  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol
  if (proto === 'http:' || proto === 'http') {
    const url = request.nextUrl.clone()
    url.protocol = 'https'
    const redirectResponse = NextResponse.redirect(url)
    addSecurityHeaders(redirectResponse)
    return redirectResponse
  }

  const response = NextResponse.next()
  addSecurityHeaders(response)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
