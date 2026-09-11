import { NextResponse, type NextRequest } from "next/server"
import { getIronSession, nextProxyCookies } from "iron-session"
import { sessionOptions, type SessionData } from "@/lib/session"

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()
  const session = await getIronSession<SessionData>(
    nextProxyCookies(request, response),
    sessionOptions
  )

  if (!session.userId) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ["/documents/:path*"],
}
