/**
 * POST /api/ifood/import-menu
 * Importa o cardápio de um restaurante do iFood com 1 clique.
 *
 * O franqueado cola o link do seu restaurante no iFood, ex:
 *   https://www.ifood.com.br/delivery/sao-paulo-sp/hamburguer-do-ze-vila-madalena/abc123
 *
 * Extraímos o merchantId da URL e chamamos os endpoints públicos do iFood
 * para buscar categorias, produtos, preços e imagens.
 *
 * ATENÇÃO: Usa endpoints públicos (não autenticados) do iFood.
 * Funciona sem aprovação de integrador.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Extrai o merchantId do link do iFood ──────────────────────────────────
function extractMerchantId(ifoodUrl: string): string | null {
  // Formato 1: UUID no final da URL
  // https://www.ifood.com.br/delivery/city/nome-restaurante/UUID-HERE
  const uuidMatch = ifoodUrl.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  if (uuidMatch) return uuidMatch[1];

  // Formato 2: slug no final sem UUID — tenta extrair slug
  const slugMatch = ifoodUrl.match(/delivery\/[^/]+\/([^/?#]+)/);
  if (slugMatch) return slugMatch[1];

  return null;
}

// ─── Busca o merchantId real via endpoint de busca do iFood ────────────────
async function resolveMerchantId(rawInput: string): Promise<string | null> {
  // Se já é um UUID, retorna direto
  const uuidMatch = rawInput.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  if (uuidMatch) return uuidMatch[1];

  // Tenta extrair o slug da URL e buscar no iFood
  const id = extractMerchantId(rawInput);
  return id;
}

// ─── Busca o menu pelo endpoint público do iFood ───────────────────────────
async function fetchIfoodMenu(merchantId: string) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Android 12; Mobile) AppleWebKit/537.36 Chrome/120",
    "Accept": "application/json",
    "app_version": "1.0.0",
    "platform": "PWA",
  };

  // Endpoint público do catálogo (não requer autenticação)
  const menuRes = await fetch(
    `https://marketplace.ifood.com.br/v1/merchants/${merchantId}/catalog`,
    { headers }
  );

  if (!menuRes.ok) {
    // Fallback: endpoint alternativo
    const altRes = await fetch(
      `https://marketplace.ifood.com.br/v2/merchants/${merchantId}/catalog`,
      { headers }
    );
    if (!altRes.ok) throw new Error(`iFood API: ${menuRes.status} / ${altRes.status}`);
    return altRes.json();
  }
  return menuRes.json();
}

// ─── Normaliza os dados do iFood para o formato do FireHub ────────────────
function normalizeIfoodMenu(data: any): Array<{
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string | null;
}> {
  const products: Array<any> = [];

  // O catálogo do iFood vem em catalogs[].itens[] ou categories[].items[]
  const catalogs = data?.catalogs ?? data?.data ?? [];

  for (const catalog of catalogs) {
    const categories = catalog.categories ?? catalog.itens ?? [];

    for (const cat of categories) {
      const catName = cat.name || cat.template?.header?.title || "Sem categoria";
      const items = cat.items ?? cat.products ?? [];

      for (const item of items) {
        const price = item.unitPrice ?? item.price ?? item.originalPrice ?? 0;

        products.push({
          name:        item.description ?? item.name ?? "Produto",
          description: item.details ?? item.longDescription ?? "",
          price:       typeof price === "number" ? price : parseFloat(price) || 0,
          category:    catName,
          imageUrl:    item.logoUrl ?? item.imageUrl ?? null,
        });
      }
    }
  }

  return products;
}

// ─── Handler Principal ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const franchiseeId = (session.user as any).id;
  const { ifoodUrl, mode = "preview" } = await req.json();
  // mode: "preview" = só retorna os produtos, "import" = salva no banco

  if (!ifoodUrl) {
    return NextResponse.json({ error: "URL do iFood é obrigatória" }, { status: 400 });
  }

  const merchantId = await resolveMerchantId(ifoodUrl);
  if (!merchantId) {
    return NextResponse.json({
      error: "Não foi possível identificar o restaurante. Cole o link completo do seu restaurante no iFood."
    }, { status: 400 });
  }

  let rawMenu: any;
  try {
    rawMenu = await fetchIfoodMenu(merchantId);
  } catch (err: any) {
    return NextResponse.json({
      error: "Não foi possível acessar o cardápio do iFood. Verifique o link e tente novamente.",
      detail: err.message,
    }, { status: 502 });
  }

  const products = normalizeIfoodMenu(rawMenu);

  if (products.length === 0) {
    return NextResponse.json({
      error: "Nenhum produto encontrado. Certifique-se que o link é do seu restaurante no iFood.",
    }, { status: 404 });
  }

  // Modo preview: só retorna sem salvar
  if (mode === "preview") {
    return NextResponse.json({
      merchantId,
      count: products.length,
      categories: [...new Set(products.map(p => p.category))],
      products: products.slice(0, 50), // máximo 50 no preview
    });
  }

  // Modo import: salva os produtos no banco como MenuProduct
  const created: string[] = [];
  const skipped: string[] = [];

  for (const p of products) {
    try {
      // Verifica se já existe produto com mesmo nome para esse franqueado
      const exists = await prisma.menuProduct.findFirst({
        where: {
          franchiseeId,
          name: { equals: p.name, mode: "insensitive" },
        },
      });

      if (exists) {
        skipped.push(p.name);
        continue;
      }

      await prisma.menuProduct.create({
        data: {
          franchiseeId,
          name:        p.name,
          description: p.description,
          price:       p.price,
          category:    p.category,
          imageUrl:    p.imageUrl,
          active:      true,
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
    message: `✅ ${created.length} produtos importados com sucesso!${skipped.length > 0 ? ` (${skipped.length} já existiam)` : ""}`,
  });
}
