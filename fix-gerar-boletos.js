/**
 * Script para gerar links Asaas nos pedidos que não têm
 * (pedidos de emergência que não geraram boleto)
 */
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local", override: true });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ASAAS_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE = ASAAS_KEY?.startsWith("$aact_prod")
  ? "https://api.asaas.com/v3"
  : "https://sandbox.asaas.com/v3";

async function main() {
  if (!ASAAS_KEY) {
    console.error("❌ ASAAS_API_KEY não configurada!");
    return;
  }

  // Buscar pedidos PENDING_PAYMENT ou EMERGENCIA que NÃO têm link Asaas
  const orders = await prisma.order.findMany({
    where: {
      asaasPaymentId: null,
      status: { in: ["PENDING_PAYMENT", "EMERGENCIA_PENDENTE"] },
    },
    include: {
      user: { select: { id: true, name: true, email: true, cpfCnpj: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" }
  });

  console.log(`📋 Encontrados ${orders.length} pedidos sem link de pagamento:\n`);

  for (const order of orders) {
    const shortId = order.id.slice(-6).toUpperCase();
    console.log(`\n${"═".repeat(60)}`);
    console.log(`📦 #${shortId} | ${order.user.name} | R$ ${order.totalAmount.toFixed(2)} | ${order.isEmergency ? "🚨 EMERGÊNCIA" : "Normal"}`);
    console.log(`   Itens: ${order.items.map(i => `${i.product.name} x${i.quantity}`).join(", ")}`);

    // 1. Buscar ou criar customer no Asaas
    let customerId = null;

    if (order.user.cpfCnpj) {
      try {
        const searchRes = await fetch(
          `${ASAAS_BASE}/customers?cpfCnpj=${encodeURIComponent(order.user.cpfCnpj)}`,
          { headers: { access_token: ASAAS_KEY } }
        );
        const searchData = await searchRes.json();
        if (searchData.data?.length > 0) {
          customerId = searchData.data[0].id;
          console.log(`   👤 Customer encontrado: ${customerId}`);
        }
      } catch (e) {}
    }

    if (!customerId) {
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
        if (createRes.ok) {
          customerId = createData.id;
          console.log(`   👤 Customer criado: ${customerId}`);
        } else {
          console.error(`   ❌ Erro criando customer: ${JSON.stringify(createData)}`);
          continue;
        }
      } catch (e) {
        console.error(`   ❌ ${e.message}`);
        continue;
      }
    }

    // 2. Criar cobrança
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);

    try {
      const payRes = await fetch(`${ASAAS_BASE}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: ASAAS_KEY },
        body: JSON.stringify({
          customer: customerId,
          billingType: "BOLETO",
          value: order.totalAmount,
          dueDate: dueDate.toISOString().split("T")[0],
          description: `Pedido #${shortId} — Hakim Congelados${order.isEmergency ? " (EMERGÊNCIA)" : ""}`,
          externalReference: order.id
        })
      });
      const payData = await payRes.json();

      if (payRes.ok) {
        const boletoUrl = payData.invoiceUrl || payData.bankSlipUrl || null;

        // 3. Atualizar pedido no banco
        await prisma.order.update({
          where: { id: order.id },
          data: {
            boletoUrl,
            asaasPaymentId: payData.id,
            status: "PENDING_PAYMENT" // normalizar status
          }
        });

        console.log(`   ✅ Link criado!`);
        console.log(`   🆔 ${payData.id}`);
        console.log(`   🔗 ${boletoUrl}`);
        console.log(`   💰 R$ ${order.totalAmount.toFixed(2)} — vence ${dueDate.toISOString().split("T")[0]}`);
      } else {
        console.error(`   ❌ Erro Asaas: ${JSON.stringify(payData)}`);
      }
    } catch (e) {
      console.error(`   ❌ ${e.message}`);
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ Processo concluído!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
