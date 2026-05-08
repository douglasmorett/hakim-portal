import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Domínios da Icebox
const ICEBOX_DOMAINS = [
  "iceboxdistribuidora.com.br",
  "www.iceboxdistribuidora.com.br",
];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  
  // Se o acesso vier de um domínio Icebox, redirecionar para /icebox
  const isIceboxDomain = ICEBOX_DOMAINS.some(d => hostname.includes(d));
  
  if (isIceboxDomain) {
    const url = request.nextUrl.clone();
    
    // Se está na raiz, redirecionar para /icebox
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/icebox";
      return NextResponse.rewrite(url);
    }
    
    // Se está tentando acessar /login, redirecionar para o login mas manter no domínio
    // Se está acessando /store/compras, permitir (é o fluxo de compra)
    // Para todas as outras rotas do admin/hakim, redirecionar para /icebox
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
