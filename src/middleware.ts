import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(req: NextRequest, maxRequests = 30, windowMs = 60000) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const key = `${ip}_${req.nextUrl.pathname}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return null;
  }

  if (entry.count >= maxRequests) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  entry.count++;
  return null;
}

// Limpa o mapa a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function middleware(req: NextRequest) {
  // Rate limiting para APIs
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const limitError = rateLimit(req);
    if (limitError) return limitError;
  }

  // Verificação de autenticação para dashboard e APIs
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/guilds/:path*"],
};