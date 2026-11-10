import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * Rate limit simples em memória: 30 requisições por minuto, por IP e por rota.
 *
 * Limitações (normais para esse tipo de solução):
 * - cada instância/servidor tem a sua contagem;
 * - zera quando o painel reinicia.
 * Se um dia o painel rodar em várias instâncias, troque por um rate limit
 * com Redis (ex.: Upstash).
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_KEYS = 10_000;

/**
 * IP do cliente.
 * O "x-forwarded-for" pode ser falsificado pelo próprio cliente: só o
 * ÚLTIMO valor da lista foi colocado pelo proxy da hospedagem. Por isso
 * a ordem é x-real-ip (definido pelo proxy) e depois o último da lista.
 */
function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}

function rateLimit(req: NextRequest, maxRequests = 30, windowMs = 60_000) {
  const key = `${getClientIp(req)}_${req.method}_${req.nextUrl.pathname}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    // Evita a memória crescer sem limite
    if (rateLimitMap.size >= MAX_KEYS) {
      for (const [k, v] of rateLimitMap.entries()) {
        if (now > v.resetTime) rateLimitMap.delete(k);
      }
      if (rateLimitMap.size >= MAX_KEYS) rateLimitMap.clear();
    }
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return null;
  }

  if (entry.count >= maxRequests) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente mais tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((entry.resetTime - now) / 1000)) },
      }
    );
  }

  entry.count++;
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const limitError = rateLimit(req);
    if (limitError) return limitError;
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // API responde 401 em JSON; páginas vão para o login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/guilds/:path*"],
};