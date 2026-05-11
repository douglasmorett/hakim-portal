/**
 * POST /api/ifood/import-menu
 * Importa o cardápio de um restaurante do iFood raspando o __NEXT_DATA__
 * embutido na página pública do restaurante.
 *
 * O franqueado cola o link do seu restaurante no iFood, ex:
 *   https://www.ifood.com.br/delivery/sao-paulo-sp/nome-restaurante/UUID
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Headers que imitam um browser real ──────────────────────────────────────
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Referer: "https://www.ifood.com.br/",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
};

// ─── Busca e parseia a página HTML do restaurante ────────────────────────────
async function scrapeIfoodPage(ifoodUrl: string) {
  // Garante que a URL seja sem query string
  const cleanUrl = ifoodUrl.split("?")[0].split("#")[0];

  const res = await fetch(cleanUrl, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ao acessar ${cleanUrl}`);
  }

  const html = await res.text();

  // Extrai o JSON do __NEXT_DATA__ (iFood usa Next.js)
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (match?.[1]) {
    try {
      return JSON.parse(match[1]);
    } catch {
      // ignore parse error, fall through
    }
  }

  // Fallback: tenta extrair JSON de __NUXT__ ou similar
  const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (nuxtMatch?.[1]) {
    try {
      return JSON.parse(nuxtMatch[1]);
    } catch {
      // ignore
    }
  }

  // Fallback: tenta pegar dados de applicationLD (structured data)
  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (ldMatch?.[1]) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      return { ldJson: ld };
    } catch {
      // ignore
    }
  }

  throw new Error("Não foi possível extrair dados da página do iFood");
}

// ─── Busca menu pela API pública do marketplace (fallback) ───────────────────
async function fetchViaMarketplaceApi(merchantId: string) {
  const endpoints = [
    `https://marketplace.ifood.com.br/v2/merchants/${merchantId}/catalog`,
    `https://marketplace.ifood.com.br/v1/merchants/${merchantId}/catalog`,
    `https://wsloja.ifood.com.br/ifood-war/v1/merchants/${merchantId}/menu`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          ...BROWSER_HEADERS,
          Accept: "application/json",
          Origin: "https://www.ifood.com.br",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && (data.catalogs || data.categories || data.data || Array.isArray(data))) {
          return data;
        }
      }
    } catch { /* try next */ }
  }
  return null;
}

// ─── Extrai merchantId da URL ─────────────────────────────────────────────────
function extractMerchantId(url: string): string | null {
  const uuidMatch = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return uuidMatch ? uuidMatch[1] : null;
}

// ─── Normaliza dados do __NEXT_DATA__ do iFood ────────────────────────────────
function extractFromNextData(nextData: any): Array<{
  name: string; description: string; price: number; category: string; imageUrl: string | null;
}> {
  const products: any[] = [];

  try {
    // Caminho comum: pageProps.initialState.catalog ou similar
    const state =
      nextData?.props?.pageProps?.initialState ||
      nextData?.props?.pageProps?.store ||
      nextData?.props?.pageProps;

    // Tenta vários caminhos onde o iFood coloca o menu
    const rawMenu =
      state?.catalog?.categories ||
      state?.menu?.categories ||
      state?.categories ||
      state?.store?.catalog?.categories ||
      findDeep(nextData, "categories");

    if (rawMenu && Array.isArray(rawMenu)) {
      for (const cat of rawMenu) {
        const catName = cat.name || cat.template?.header?.title || "Cardápio";
        const items = cat.items ?? cat.products ?? cat.children ?? [];
        for (const item of items) {
          const price =
            item.unitPrice ??
            item.price ??
            item.minimumPrice ??
            item.originalPrice ??
            item.details?.price ??
            0;
          products.push({
            name: item.description ?? item.name ?? "Produto",
            description: item.details ?? item.longDescription ?? item.serving ?? "",
            price: typeof price === "number" ? price : parseFloat(String(price).replace(",", ".")) || 0,
            category: catName,
            imageUrl: item.logoUrl ?? item.imageUrl ?? item.image ?? null,
          });
        }
      }
    }
  } catch { /* continue */ }

  return products;
}

// ─── Normaliza dados da Marketplace API ──────────────────────────────────────
function normalizeMarketplaceMenu(data: any): Array<{
  name: string; description: string; price: number; category: string; imageUrl: string | null;
}> {
  const products: any[] = [];
  const catalogs = Array.isArray(data) ? data : (data?.catalogs ?? data?.data ?? []);

  for (const catalog of catalogs) {
    const categories = catalog.categories ?? catalog.itens ?? (Array.isArray(catalog) ? catalog : []);
    for (const cat of categories) {
      const catName = cat.name || cat.template?.header?.title || "Cardápio";
      const items = cat.items ?? cat.products ?? [];
      for (const item of items) {
        const price = item.unitPrice ?? item.price ?? item.originalPrice ?? 0;
        products.push({
          name: item.description ?? item.name ?? "Produto",
          description: item.details ?? item.longDescription ?? "",
          price: typeof price === "number" ? price : parseFloat(price) || 0,
          category: catName,
          imageUrl: item.logoUrl ?? item.imageUrl ?? null,
        });
      }
    }
  }
  return products;
}

// ─── Busca recursiva de chave em objeto ──────────────────────────────────────
function findDeep(obj: any, key: string, depth = 0): any {
  if (depth > 8 || !obj || typeof obj !== "object") return null;
  if (key in obj && Array.isArray(obj[key]) && obj[key].length > 0) return obj[key];
  for (const k of Object.keys(obj)) {
    const found = findDeep(obj[k], key, depth + 1);
    if (found) return found;
  }
  return null;
}

// ─── Handler Principal ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const franchiseeId = (session.user as any).id;
  const { ifoodUrl, mode = "preview" } = await req.json();

  if (!ifoodUrl?.trim()) {
    return NextResponse.json({ error: "URL do iFood é obrigatória" }, { status: 400 });
  }

  let products: ReturnType<typeof normalizeMarketplaceMenu> = [];
  let strategy = "";

  // ── Estratégia 1: Scraping do __NEXT_DATA__ ──
  try {
    const nextData = await scrapeIfoodPage(ifoodUrl);
    const extracted = extractFromNextData(nextData);
    if (extracted.length > 0) {
      products = extracted;
      strategy = "next_data";
    }
  } catch { /* try next */ }

  // ── Estratégia 2: Marketplace API (fallback) ──
  if (products.length === 0) {
    const merchantId = extractMerchantId(ifoodUrl);
    if (merchantId) {
      const rawMenu = await fetchViaMarketplaceApi(merchantId);
      if (rawMenu) {
        products = normalizeMarketplaceMenu(rawMenu);
        strategy = "marketplace_api";
      }
    }
  }

  if (products.length === 0) {
    return NextResponse.json({
      error:
        "Não foi possível acessar o cardápio. Certifique-se de colar o link completo do restaurante no iFood (ex: https://www.ifood.com.br/delivery/cidade/nome-do-restaurante/UUID).",
    }, { status: 502 });
  }

  // ── Modo preview ──
  if (mode === "preview") {
    return NextResponse.json({
      strategy,
      count: products.length,
      categories: [...new Set(products.map((p) => p.category))],
      products: products.slice(0, 60),
    });
  }

  // ── Modo import — salva no banco ──
  const created: string[] = [];
  const skipped: string[] = [];

  for (const p of products) {
    try {
      const exists = await prisma.menuProduct.findFirst({
        where: { franchiseeId, name: { equals: p.name, mode: "insensitive" } },
      });
      if (exists) { skipped.push(p.name); continue; }

      await prisma.menuProduct.create({
        data: {
          franchiseeId,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          imageUrl: p.imageUrl,
          active: true,
        },
      });
      created.push(p.name);
    } catch {
      skipped.push(p.name);
    }
  }

  return NextResponse.json({
    success: true,
    imported: created.length,
    skipped: skipped.length,
    message: `✅ ${created.length} produtos importados!${skipped.length > 0 ? ` (${skipped.length} já existiam)` : ""}`,
  });
}
