/**
 * Script de correção: Calabresa preço errado
 * - Busca pedidos com calabresa a R$30.90 (deveria ser R$92.70)
 * - Atualiza preço dos itens
 * - Recalcula total
 * - Cancela link antigo no Asaas
 * - Cria novo link com valor correto
 * - Atualiza pedido no banco
 */
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local", override: true });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ASAAS_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE = ASAAS_KEY?.startsWith("$aact_prod")
  ? "https://api.asaas.com/v3"
  : "https://sandbox.asaas.com/v3";

const WRONG_PRICE = 30.90;
const CORRECT_PRICE = 92.70;

// IDs parciais dos pedidos da screenshot
const ORDER_CODES = ["HJEUKI", "TBB9JR", "2QCC37", "98BC4R"];

async function main() {
  console.log("🔍 Buscando pedidos com calabresa a preço errado...\n");

  // Buscar todos os pedidos PENDING_PAYMENT que tenham itens com preço 30.90
  const orders = await prisma.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      items: {
        some: {
          price: WRONG_PRICE,
          product: {
            name: { contains: "calabresa", mode: "insensitive" }
          }
        }
      }
    },
    include: {
      items: {
        include: { product: true }
      },
      user: { select: { name: true, email: true, cpfCnpj: true } }
    }
  });

  if (orders.length === 0) {
    // Tentar busca alternativa por ID parcial
    console.log("⚠️  Nenhum pedido encontrado por produto. Buscando por código...\n");
    for (const code of ORDER_CODES) {
      const allOrders = await prisma.order.findMany({
        where: {
          id: { endsWith: code.toLowerCase() },
          status: "PENDING_PAYMENT"
        },
        include: {
          items: { include: { product: true } },
          user: { select: { name: true, email: true, cpfCnpj: true } }
        }
      });
      orders.push(...allOrders);
    }
  }

  if (orders.length === 0) {
    // Última tentativa: buscar todos PENDING_PAYMENT e filtrar
    console.log("⚠️  Buscando todos pedidos pendentes e filtrando calabresa...\n");
    const allPending = await prisma.order.findMany({
      where: { status: "PENDING_PAYMENT" },
      include: {
        items: { include: { product: true } },
        user: { select: { name: true, email: true, cpfCnpj: true } }
      }
    });
    
    for (const order of allPending) {
      const hasWrongCalabresa = order.items.some(
        (item) => item.price === WRONG_PRICE && 
                   item.product.name.toLowerCase().includes("calabresa")
      );
      if (hasWrongCalabresa) {
        orders.push(order);
      }
    }
  }

  console.log(`📋 Encontrados ${orders.length} pedidos para corrigir:\n`);

  for (const order of orders) {
    const shortId = order.id.slice(-6).toUpperCase();
    console.log(`\n${"═".repeat(60)}`);
    console.log(`📦 Pedido #${shortId} | Cliente: ${order.user.name}`);
    console.log(`   Total atual: R$ ${order.totalAmount.toFixed(2)}`);
    console.log(`   Asaas ID: ${order.asaasPaymentId || "N/A"}`);
    console.log(`   Boleto URL: ${order.boletoUrl || "N/A"}`);

    // Encontrar itens de calabresa com preço errado
    const wrongItems = order.items.filter(
      (item) => item.price === WRONG_PRICE &&
                 item.product.name.toLowerCase().includes("calabresa")
    );

    if (wrongItems.length === 0) {
      console.log("   ⏭️  Sem calabresa com preço errado, pulando...");
      continue;
    }

    let totalDiff = 0;
    for (const item of wrongItems) {
      const diff = (CORRECT_PRICE - WRONG_PRICE) * item.quantity;
      totalDiff += diff;
      console.log(`   🥩 ${item.product.name} | Qtd: ${item.quantity} | R$${WRONG_PRICE} → R$${CORRECT_PRICE} | +R$${diff.toFixed(2)}`);

      // Atualizar preço do item
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { price: CORRECT_PRICE }
      });
    }

    const newTotal = parseFloat((order.totalAmount + totalDiff).toFixed(2));
    console.log(`\n   💰 Total antigo: R$ ${order.totalAmount.toFixed(2)}`);
    console.log(`   💰 Total novo:   R$ ${newTotal.toFixed(2)} (+R$ ${totalDiff.toFixed(2)})`);

    // Atualizar total do pedido
    await prisma.order.update({
      where: { id: order.id },
      data: { totalAmount: newTotal }
    });

    // ── Asaas: Cancelar link antigo e criar novo ──
    if (order.asaasPaymentId && ASAAS_KEY) {
      console.log(`\n   🔄 Asaas: Cancelando link antigo (${order.asaasPaymentId})...`);

      // 1. Cancelar cobrança antiga
      try {
        const cancelRes = await fetch(`${ASAAS_BASE}/payments/${order.asaasPaymentId}`, {
          method: "DELETE",
          headers: { access_token: ASAAS_KEY }
        });
        if (cancelRes.ok) {
          console.log("   ✅ Link antigo cancelado!");
        } else {
          const errData = await cancelRes.json();
          console.log(`   ⚠️  Erro ao cancelar: ${JSON.stringify(errData)}`);
        }
      } catch (e) {
        console.log(`   ⚠️  Erro ao cancelar: ${e.message}`);
      }

      // 2. Buscar customer ID do Asaas
      let asaasCustomerId = null;
      if (order.user.cpfCnpj) {
        try {
          const searchRes = await fetch(
            `${ASAAS_BASE}/customers?cpfCnpj=${encodeURIComponent(order.user.cpfCnpj)}`,
            { headers: { access_token: ASAAS_KEY } }
          );
          if (searchRes.ok) {
            const data = await searchRes.json();
            if (data.data?.length > 0) asaasCustomerId = data.data[0].id;
          }
        } catch (e) {}
      }

      if (!asaasCustomerId) {
        console.log("   ⚠️  Customer não encontrado no Asaas, criando...");
        try {
          const createRes = await fetch(`${ASAAS_BASE}/customers`, {
            method: "POST",
            headers: { "Content-Type": "application/json", access_token: ASAAS_KEY },
            body: JSON.stringify({
              name: order.user.name || order.user.email,
              email: order.user.email,
              cpfCnpj: order.user.cpfCnpj || ""
            })
          });
          const createData = await createRes.json();
          asaasCustomerId = createData.id;
        } catch (e) {
          console.error(`   ❌ Erro criando customer: ${e.message}`);
        }
      }

      if (asaasCustomerId) {
        // 3. Criar nova cobrança com valor correto
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 10);

        console.log(`   📄 Criando novo link de pagamento (R$ ${newTotal.toFixed(2)})...`);

        try {
          const payRes = await fetch(`${ASAAS_BASE}/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json", access_token: ASAAS_KEY },
            body: JSON.stringify({
              customer: asaasCustomerId,
              billingType: "BOLETO",
              value: newTotal,
              dueDate: dueDate.toISOString().split("T")[0],
              description: `Pedido #${shortId} — Hakim Congelados (CORRIGIDO)`,
              externalReference: order.id
            })
          });
          const payData = await payRes.json();

          if (payRes.ok) {
            const newBoletoUrl = payData.invoiceUrl || payData.bankSlipUrl || null;
            const newPaymentId = payData.id;

            // 4. Atualizar pedido com novo link
            await prisma.order.update({
              where: { id: order.id },
              data: {
                boletoUrl: newBoletoUrl,
                asaasPaymentId: newPaymentId
              }
            });

            console.log(`   ✅ NOVO link criado!`);
            console.log(`   🆔 Payment ID: ${newPaymentId}`);
            console.log(`   🔗 URL: ${newBoletoUrl}`);
          } else {
            console.error(`   ❌ Erro Asaas: ${JSON.stringify(payData)}`);
          }
        } catch (e) {
          console.error(`   ❌ Erro criando pagamento: ${e.message}`);
        }
      }
    } else {
      console.log("   ⚠️  Sem Asaas Payment ID — apenas total atualizado no banco");
    }

    // Registrar no histórico
    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        statusFrom: order.status,
        statusTo: order.status,
        actionBy: "Admin Script",
        actionEmail: "admin@firehubfood.com.br",
        notes: `Correção calabresa: preço R$${WRONG_PRICE} → R$${CORRECT_PRICE}. Total: R$${order.totalAmount.toFixed(2)} → R$${newTotal.toFixed(2)}. Link de pagamento recriado.`
      }
    });

    console.log(`   📝 Histórico registrado`);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`\n✅ CORREÇÃO CONCLUÍDA! ${orders.length} pedidos atualizados.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
