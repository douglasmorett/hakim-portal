import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAsaasKey } from "@/lib/asaas";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Chave de segurança simples para poder disparar manualmente via GET
const CRON_SECRET = "hakim-billing-secret-2026";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const force = searchParams.get("force"); // "marketing" ou "royalty"
    const secret = searchParams.get("secret");

    // Valida chamada
    const isCronHeader = request.headers.get("x-vercel-cron") === "true";
    const authHeader = request.headers.get("Authorization");
    const isVercelCron = isCronHeader || (authHeader && authHeader.startsWith("Bearer "));
    const isAuthorized = isVercelCron || secret === CRON_SECRET;

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const today = new Date();
    const day = today.getDate();
    const currentMonth = today.getMonth(); // 0 a 11
    const currentYear = today.getFullYear();

    // Segurança: se for julho de 2026 e não for um teste forçado, ignora (pois o usuário já gerou manualmente)
    const isJuly2026 = currentYear === 2026 && currentMonth === 6; // Julho é index 6
    if (isJuly2026 && !force) {
      return NextResponse.json({
        success: true,
        message: "As cobranças de julho de 2026 já foram geradas manualmente. A automação iniciará a partir de agosto de 2026."
      });
    }

    // Saber o último dia do mês atual
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const isMarketingDay = day === 20 || force === "marketing";
    const isRoyaltyDay = day === 30 || (lastDayOfMonth < 30 && day === lastDayOfMonth) || force === "royalty";

    if (!isMarketingDay && !isRoyaltyDay) {
      return NextResponse.json({
        success: true,
        message: `Hoje é dia ${day}. Nenhuma cobrança recorrente para hoje.`,
        date: today.toISOString()
      });
    }

    // Paulo info
    const pauloEmail = "paulocoutinhocastilho@gmail.com";
    const user = await prisma.user.findFirst({
      where: { email: { contains: pauloEmail, mode: "insensitive" } }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: `Usuário franqueado Paulo (${pauloEmail}) não encontrado no banco.` }, { status: 404 });
    }

    const results: any[] = [];
    const mesNome = MESES[currentMonth];
    const yearMonthStr = `${mesNome}/${currentYear}`;

    // ── 1. GERAÇÃO DE COBRANÇA DE MARKETING (DIA 20) ──
    if (isMarketingDay) {
      const prodName = `Marketing referente ao mês de ${mesNome}`;
      const prodPrice = 810.00;

      // Verifica idempotência: se já existe uma cobrança de Marketing para o Paulo hoje
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const existingOrder = await prisma.order.findFirst({
        where: {
          userId: user.id,
          createdAt: { gte: startOfDay, lte: endOfDay },
          items: {
            some: {
              product: {
                name: { contains: "Marketing", mode: "insensitive" }
              }
            }
          }
        }
      });

      if (existingOrder) {
        results.push({ type: "marketing", created: false, message: `Cobrança de Marketing para o Paulo já foi gerada hoje (Pedido #${existingOrder.id.slice(-8).toUpperCase()}).` });
      } else {
        // Cria produto dinâmico
        const product = await prisma.product.create({
          data: {
            name: prodName,
            description: `Taxa de Marketing recorrente da franquia Hakim - Ref. ${yearMonthStr}`,
            price: prodPrice,
            franchiseOnly: true
          }
        });

        // Cria o Pedido (Order)
        const order = await prisma.order.create({
          data: {
            userId: user.id,
            totalAmount: prodPrice,
            status: "PENDING_PAYMENT",
            items: {
              create: {
                productId: product.id,
                quantity: 1,
                price: prodPrice
              }
            }
          }
        });

        // Gera cobrança no Asaas
        const asaasResult = await chargeAsaas(user, order, prodPrice, `Taxa de Marketing Hakim — Ref. ${yearMonthStr}`);
        
        if (asaasResult) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              asaasPaymentId: asaasResult.paymentId,
              boletoUrl: asaasResult.boletoUrl
            }
          });
          results.push({ type: "marketing", created: true, orderId: order.id, asaasPaymentId: asaasResult.paymentId, message: "Cobrança de Marketing criada e registrada com sucesso." });
        } else {
          results.push({ type: "marketing", created: true, orderId: order.id, asaasError: true, message: "Pedido criado no portal, mas falhou ao gerar cobrança no Asaas." });
        }
      }
    }

    // ── 2. GERAÇÃO DE COBRANÇA DE ROYALTIES (DIA 30 OU FIM DO MÊS) ──
    if (isRoyaltyDay) {
      const prodName = `Royalty referente ao mês de ${mesNome} - 1 salário`;
      const prodPrice = 1621.00;

      // Verifica idempotência
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const existingOrder = await prisma.order.findFirst({
        where: {
          userId: user.id,
          createdAt: { gte: startOfDay, lte: endOfDay },
          items: {
            some: {
              product: {
                name: { contains: "Royalty", mode: "insensitive" }
              }
            }
          }
        }
      });

      if (existingOrder) {
        results.push({ type: "royalty", created: false, message: `Cobrança de Royalties para o Paulo já foi gerada hoje (Pedido #${existingOrder.id.slice(-8).toUpperCase()}).` });
      } else {
        // Cria produto dinâmico
        const product = await prisma.product.create({
          data: {
            name: prodName,
            description: `Royalties mensais de franquia Hakim - Ref. ${yearMonthStr}`,
            price: prodPrice,
            franchiseOnly: true
          }
        });

        // Cria o Pedido (Order)
        const order = await prisma.order.create({
          data: {
            userId: user.id,
            totalAmount: prodPrice,
            status: "PENDING_PAYMENT",
            items: {
              create: {
                productId: product.id,
                quantity: 1,
                price: prodPrice
              }
            }
          }
        });

        // Gera cobrança no Asaas
        const asaasResult = await chargeAsaas(user, order, prodPrice, `Royalties Hakim (1 salário mínimo) — Ref. ${yearMonthStr}`);
        
        if (asaasResult) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              asaasPaymentId: asaasResult.paymentId,
              boletoUrl: asaasResult.boletoUrl
            }
          });
          results.push({ type: "royalty", created: true, orderId: order.id, asaasPaymentId: asaasResult.paymentId, message: "Cobrança de Royalties criada e registrada com sucesso." });
        } else {
          results.push({ type: "royalty", created: true, orderId: order.id, asaasError: true, message: "Pedido criado no portal, mas falhou ao gerar cobrança no Asaas." });
        }
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || error }, { status: 500 });
  }
}

// Helper para criar a cobrança no Asaas
async function chargeAsaas(user: any, order: any, amount: number, description: string) {
  const asaasKey = getAsaasKey();
  if (!asaasKey || !user.cpfCnpj) {
    console.error("[Cron Billing] Chave do Asaas ou CPF/CNPJ do usuário ausente.");
    return null;
  }

  const BASE = asaasKey.startsWith("$aact_prod")
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/v3";

  try {
    let customerId: string | null = null;

    // 1. Busca cliente pelo CPF/CNPJ
    const sr = await fetch(`${BASE}/customers?cpfCnpj=${encodeURIComponent(user.cpfCnpj.trim())}`, {
      headers: { access_token: asaasKey }
    });
    
    if (sr.ok) {
      const sd = await sr.json();
      if (sd.data?.length > 0) {
        customerId = sd.data[0].id;
      }
    }

    // 2. Se não achou, cria o cliente no Asaas
    if (!customerId) {
      const cr = await fetch(`${BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: asaasKey },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          cpfCnpj: user.cpfCnpj,
        }),
      });
      if (cr.ok) {
        const cd = await cr.json();
        customerId = cd.id;
      }
    }

    if (!customerId) {
      console.error("[Cron Billing] Não foi possível encontrar ou cadastrar o cliente no Asaas.");
      return null;
    }

    // Vencimento: Hoje
    const todayStr = new Date().toISOString().split("T")[0];

    // 3. Cria a cobrança no Asaas
    const pr = await fetch(`${BASE}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: asaasKey },
      body: JSON.stringify({
        customer: customerId,
        billingType: "BOLETO",
        value: amount,
        dueDate: todayStr,
        description: description,
        externalReference: `order:${order.id}`
      }),
    });

    if (!pr.ok) {
      const errorText = await pr.text();
      console.error("[Cron Billing] Erro ao criar pagamento no Asaas:", errorText);
      return null;
    }

    const pd = await pr.json();
    return {
      paymentId: pd.id,
      boletoUrl: pd.invoiceUrl || pd.bankSlipUrl || null
    };

  } catch (error) {
    console.error("[Cron Billing] Erro na chamada da API do Asaas:", error);
    return null;
  }
}
