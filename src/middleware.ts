import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Hakim Portal — Middleware
 *
 * portalhakim.com.br → /login + /admin/*
 * Apenas o sistema administrativo interno da franquia HAKIM.
 *
 * FireHub (firehubfood.com.br) agora é um projeto separado: firehub-site
 */

const PORTAL_DOMAINS = [
  "portalhakim.com.br",
  "www.portalhakim.com.br",
];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  // Portal Hakim → comportamento padrão
  if (PORTAL_DOMAINS.some(d => hostname.includes(d))) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
