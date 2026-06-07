import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isAuthRoute = url.pathname.startsWith('/auth')
  const authPassThroughRoutes = ['/auth/callback', '/auth/logout', '/auth/reset-password']
  const isPublicRoute = [
    '/auth/login',
    '/auth/forgot-password',
    ...authPassThroughRoutes,
  ].includes(url.pathname)

  if (!user && !isPublicRoute) {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute && !authPassThroughRoutes.includes(url.pathname)) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  
  // Must-change-password redirect
  if (user && url.pathname.startsWith("/dashboard")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password, active_status")
      .eq("id", user.id)
      .single();
    if (profile?.must_change_password && url.pathname !== "/dashboard/change-password") {
      url.pathname = "/dashboard/change-password";
      return NextResponse.redirect(url);
    }
    if (profile && !profile.must_change_password && url.pathname === "/dashboard/change-password") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }
  return supabaseResponse
}
