export const AUTH_PASS_THROUGH_ROUTES = [
  '/auth/callback',
  '/auth/logout',
  '/auth/reset-password',
]

const PUBLIC_EXACT_ROUTES = [
  '/auth/login',
  '/auth/forgot-password',
  '/register',
  ...AUTH_PASS_THROUGH_ROUTES,
]

const PUBLIC_PREFIX_ROUTES = ['/kebersihan']

export function isPublicRoute(pathname) {
  if (PUBLIC_EXACT_ROUTES.includes(pathname)) return true
  return PUBLIC_PREFIX_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
