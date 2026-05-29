import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

const ADMIN_EMAIL = "howardhozh@gmail.com"
const ADMIN_AGENT_ID = "dev_agent_howard"

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true
  if (pathname === "/login" || pathname === "/signup") return true
  if (pathname.startsWith("/api/intake")) return true
  if (pathname.startsWith("/api/share")) return true
  if (pathname.startsWith("/share")) return true
  if (pathname.startsWith("/pack")) return true
  return false
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getUser() not getSession() — verifies token server-side
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthPage = pathname === "/login" || pathname === "/signup"

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/home"
    return NextResponse.redirect(url)
  }

  // Inject session context into request headers so server components read them via next/headers
  const requestHeaders = new Headers(request.headers)
  if (user) {
    const agentId = user.email === ADMIN_EMAIL ? ADMIN_AGENT_ID : user.id
    const meta = (user.user_metadata ?? {}) as Record<string, string>
    requestHeaders.set("x-agent-id", agentId)
    requestHeaders.set("x-is-admin", user.email === ADMIN_EMAIL ? "true" : "false")
    requestHeaders.set("x-agent-name", meta.full_name ?? meta.name ?? "")
    requestHeaders.set("x-agent-email", user.email ?? "")
    requestHeaders.set("x-agent-phone", meta.phone ?? "")
    requestHeaders.set("x-agent-agency", meta.agency ?? "")
  }

  // Build final response with custom headers, copy Supabase session cookies onto it
  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } })
  supabaseResponse.cookies.getAll().forEach(c => finalResponse.cookies.set(c))

  return finalResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
