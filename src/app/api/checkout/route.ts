import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { items } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId || undefined, email: session.user.email! } });
    
    if (!user) return NextResponse.json({ error: "User não encontrado" }, { status: 404 });
    
    // 1. RECALCULAR TOTAL NO SERVIDOR (SEGURANÇA)
    const productIds = items.map((i: any) => i.id);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    let calculatedTotal = 0;
    const itemsWithPrice = items.map((item: any) => {
      const product = dbProducts.find(p => p.id === item.id);
      if (!product) throw new Error(`Produto ${item.id} não encontrado.`);
      calculatedTotal += product.price * item.quantity;
      return {
        productId: product.id,
        quantity: item.quantity,
        price: product.price
      };
    });

    // VALIDAÇÃO PEDIDO MÍNIMO R$300
    if (calculatedTotal < 300) {
      return NextResponse.json({ error: `Pedido mínimo é R$ 300,00. Seu total é R$ ${calculatedTotal.toFixed(2)}.` }, { status: 400 });
    }

    // VERIFICAÇÃO DE INADIMPLÊNCIA
    const { checkAsaasOverdue } = await import("@/lib/asaas");
    if (user.cpfCnpj) {
      const isBlocked = await checkAsaasOverdue(user.cpfCnpj);
      if (isBlocked) {
        return NextResponse.json({ error: "Sua conta está bloqueada para pedidos por pendências no Asaas." }, { status: 403 });
      }
    }

    // Cria o pedido no BD
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        totalAmount: calculatedTotal,
        status: "PENDING_PAYMENT",
        items: { create: itemsWithPrice }
      }
    });

    // INTEGRAÇÃO ASAAS
    const asaasKey = process.env.ASAAS_API_KEY;
    const ASAAS_URL = asaasKey?.startsWith("$aact_prod") 
      ? "https://api.asaas.com/v3" 
      : "https://sandbox.asaas.com/v3";

    if (!asaasKey) {
      console.warn("Chave Asaas não configurada. Simulando boleto.");
      const boletoUrlMock = `${ASAAS_URL.replace('/v3','')}/b/pdf/${order.id}`;
      return NextResponse.json({ success: true, orderId: order.id, boletoUrl: boletoUrlMock });
    }

    // 1. Buscar Customer existente ou Criar
    let asaasCustomerId = null;

    if (user.cpfCnpj) {
      const searchRes = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${user.cpfCnpj}`, {
        headers: { "access_token": asaasKey }
      });
      const searchData = await searchRes.json();
      if (searchRes.ok && searchData.data && searchData.data.length > 0) {
        asaasCustomerId = searchData.data[0].id;
      }
    }

    if (!asaasCustomerId) {
      const customerRes = await fetch(`${ASAAS_URL}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": asaasKey },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          cpfCnpj: user.cpfCnpj || ""
        })
      });
      const customerData = await customerRes.json();
      asaasCustomerId = customerData.id;
    }

    if (!asaasCustomerId) {
      throw new Error("Não foi possível gerar/encontrar o Cliente no Asaas.");
    }

    // 2. Criar Cobrança (Boleto)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);

    const paymentRes = await fetch(`${ASAAS_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": asaasKey },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "BOLETO",
        value: calculatedTotal,
        dueDate: dueDate.toISOString().split("T")[0],
        description: `Pedido #${order.id.slice(-6).toUpperCase()} - Hakim B2B`,
        externalReference: order.id
      })
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      throw new Error("Erro Asaas: " + (paymentData.errors?.[0]?.description || "Falha na cobrança"));
    }

    const boletoUrl = paymentData.bankSlipUrl || paymentData.invoiceUrl;

    await prisma.order.update({
      where: { id: order.id },
      data: { boletoUrl, asaasPaymentId: paymentData.id }
    });

    return NextResponse.json({ success: true, orderId: order.id, boletoUrl });

  } catch (error: any) {
    console.error("Erro no checkout:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}
