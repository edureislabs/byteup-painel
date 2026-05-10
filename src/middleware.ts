import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    const discordSignInUrl = new URL("/api/auth/signin/discord", req.url)
    discordSignInUrl.searchParams.set("callbackUrl", "/dashboard")
    return NextResponse.redirect(discordSignInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"], // Apenas protege o dashboard, nunca toca em /api/auth
}