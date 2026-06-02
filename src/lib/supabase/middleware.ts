import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
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

  if (user && !isAuthRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active, must_change_password')
      .eq('id', user.id)
      .maybeSingle()

    if (profile && !profile.is_active && url.pathname !== '/auth/logout') {
      url.pathname = '/auth/logout'
      return NextResponse.redirect(url)
    }

    const isChangePasswordRoute = url.pathname === '/dashboard/change-password'
    if (profile?.must_change_password && !isChangePasswordRoute) {
      url.pathname = '/dashboard/change-password'
      return NextResponse.redirect(url)
    }

    if (profile && !profile.must_change_password && isChangePasswordRoute) {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  if (user && isAuthRoute && !authPassThroughRoutes.includes(url.pathname)) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
