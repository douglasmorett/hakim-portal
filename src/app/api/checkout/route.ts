import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { items } = await req.json();
    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId || undefined, email: session.user.email! }
    });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    // ── Recalcula total no servidor (segurança) ──────────────────────────────
    const productIds = items.map((i: any) => i.id);
    const dbProducts = await prisma.product.findMany({ where: { id: { in: productIds } } });

    let calculatedTotal = 0;
    const itemsWithPrice = items.map((item: any) => {
      const product = dbProducts.find(p => p.id === item.id);
      if (!product) throw new Error(`Produto ${item.id} não encontrado.`);
      calculatedTotal += product.price * item.quantity;
      return { productId: product.id, quantity: item.quantity, price: product.price };
    });

    if (calculatedTotal < 300) {
      return NextResponse.json(
        { error: `Pedido mínimo é R$ 300,00. Seu total é R$ ${calculatedTotal.toFixed(2)}.` },
        { status: 400 }
      );
    }

    // ── Verifica inadimplência ───────────────────────────────────────────────
    const { checkAsaasOverdue } = await import("@/lib/asaas");
    if (user.cpfCnpj) {
      const isBlocked = await checkAsaasOverdue(user.cpfCnpj);
      if (isBlocked) {
        return NextResponse.json(
          { error: "Sua conta está bloqueada por pendências financeiras." },
          { status: 403 }
        );
      }
    }

    // ── Cria pedido no banco ─────────────────────────────────────────────────
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        totalAmount: calculatedTotal,
        status: "PENDING_PAYMENT",
        items: { create: itemsWithPrice }
      }
    });

    // ── Integração Asaas ─────────────────────────────────────────────────────
    const asaasKey = process.env.ASAAS_API_KEY;

    if (!asaasKey) {
      console.warn("ASAAS_API_KEY não configurada — pedido criado sem boleto.");
      return NextResponse.json({ success: true, orderId: order.id, boletoUrl: null });
    }

    // URL correta baseada no prefixo da chave
    const ASAAS_BASE = asaasKey.startsWith("$aact_prod")
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/v3";

    // 1. Busca ou cria cliente no Asaas
    let asaasCustomerId: string | null = null;

    if (user.cpfCnpj) {
      const searchRes = await fetch(
        `${ASAAS_BASE}/customers?cpfCnpj=${encodeURIComponent(user.cpfCnpj)}`,
        { headers: { access_token: asaasKey } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data?.length > 0) {
          asaasCustomerId = searchData.data[0].id;
        }
      }
    }

    if (!asaasCustomerId) {
      const customerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: asaasKey },
        body: JSON.stringify({
          name: user.name || user.email,
          email: user.email,
          cpfCnpj: user.cpfCnpj || ""
        })
      });
      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        console.error("Erro criar cliente Asaas:", JSON.stringify(customerData));
        throw new Error(
          "Erro ao cadastrar cliente no Asaas: " +
          (customerData.errors?.[0]?.description || "Verifique o CPF/CNPJ cadastrado")
        );
      }
      asaasCustomerId = customerData.id;
    }

    if (!asaasCustomerId) {
      throw new Error("Não foi possível obter Customer ID no Asaas.");
    }

    // 2. Cria cobrança (boleto) com vencimento em 10 dias
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);

    const paymentRes = await fetch(`${ASAAS_BASE}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: asaasKey },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "BOLETO",
        value: calculatedTotal,
        dueDate: dueDate.toISOString().split("T")[0],
        description: `Pedido #${order.id.slice(-6).toUpperCase()} — Hakim Congelados`,
        externalReference: order.id
      })
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      console.error("Erro Asaas payment:", JSON.stringify(paymentData));
      throw new Error(
        "Erro Asaas: " + (paymentData.errors?.[0]?.description || "Falha ao gerar cobrança")
      );
    }

    console.log(
      `[Asaas] payment=${paymentData.id} invoiceUrl=${paymentData.invoiceUrl} bankSlipUrl=${paymentData.bankSlipUrl}`
    );

    // invoiceUrl = link público da fatura (sempre disponível imediatamente)
    // bankSlipUrl = PDF do boleto (pode demorar alguns segundos para ficar disponível)
    const boletoUrl = paymentData.invoiceUrl || paymentData.bankSlipUrl || null;

    await prisma.order.update({
      where: { id: order.id },
      data: { boletoUrl, asaasPaymentId: paymentData.id }
    });

    return NextResponse.json({ success: true, orderId: order.id, boletoUrl });

  } catch (error: any) {
    console.error("Erro no checkout:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
