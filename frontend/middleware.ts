import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public assets
     */
    // Excluded from middleware:
    //   - _next/static, _next/image : Next.js build assets
    //   - favicon.ico               : static icon
    //   - api/inngest               : Inngest webhook (auth via signing key)
    //   - /downloads/*              : public extension zip + version info,
    //                                 downloaded by users BEFORE they are logged in
    //                                 (extension install flow is pre-auth)
    //   - .svg/png/jpg/etc images   : static assets in /public
    '/((?!_next/static|_next/image|favicon.ico|api/inngest|downloads/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
