import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * FireHub — Middleware de roteamento por domínio
 *
 * firehubfood.com.br      → /firehub  (landing institucional FireHub)
 * portalhakim.com.br      → /         (portal do lojista)
 * iceboxdistribuidora.com.br → /icebox (portal Icebox)
 *
 * Todos os domínios apontam para o mesmo projeto no Vercel.
 * Configure em: Vercel → hakim-portal → Settings → Domains
 */

// Domínios FireHub → redireciona para /firehub
const FIREHUB_DOMAINS = [
  "firehubfood.com.br",
  "www.firehubfood.com.br",
];

// Domínios Portal Hakim → comportamento padrão (login → dashboard)
const PORTAL_DOMAINS = [
  "portalhakim.com.br",
  "www.portalhakim.com.br",
];

// Domínios Icebox → /icebox
const ICEBOX_DOMAINS = [
  "iceboxdistribuidora.com.br",
  "www.iceboxdistribuidora.com.br",
];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // ── FIREHUB ──────────────────────────────────────────────────────
  if (FIREHUB_DOMAINS.some(d => hostname.includes(d))) {
    // Já está em /firehub → deixa passar
    if (url.pathname.startsWith("/firehub")) {
      return NextResponse.next();
    }
    // APIs e assets → passa sem alterar
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/_next") || url.pathname.includes(".")) {
      return NextResponse.next();
    }
    // Raiz ou qualquer outra rota → reescreve para /firehub
    url.pathname = "/firehub";
    return NextResponse.rewrite(url);
  }

  // ── PORTAL HAKIM ─────────────────────────────────────────────────
  if (PORTAL_DOMAINS.some(d => hostname.includes(d))) {
    // Comportamento padrão do portal — nenhuma alteração
    return NextResponse.next();
  }

  // ── ICEBOX ───────────────────────────────────────────────────────
  if (ICEBOX_DOMAINS.some(d => hostname.includes(d))) {
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/icebox";
      return NextResponse.rewrite(url);
    }
    if (url.pathname.startsWith("/admin") || url.pathname === "/store") {
      url.pathname = "/icebox";
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Excluir arquivos estáticos e API
    "/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
