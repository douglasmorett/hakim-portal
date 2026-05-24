/**
 * fix-emergency-fine-ftze1x.js
 * 
 * Correção one-time: aplica multa de 30% ao pedido #FTZE1X
 * que foi aprovado sem multa (era a 2ª+ emergência do mês).
 * 
 * - Atualiza totalAmount e emergencyFine
 * - Cancela boleto antigo no Asaas  
 * - Gera novo boleto com valor correto
 * - Registra no histórico
 * 
 * Uso: node scripts/fix-emergency-fine-ftze1x.js
 */

const { PrismaClient } = require("@prisma/client");
require("dotenv").config({ path: ".env.local" });

const prisma = new PrismaClient();

const ASAAS_KEY = process.env.ASAAS_API_KEY;
const BASE_URL = ASAAS_KEY?.startsWith("$aact_prod")
  ? "https://api.asaas.com/v3"
  : "https://sandbox.asaas.com/v3";

const headers = {
  access_token: ASAAS_KEY,
  "User-Agent": "hakim-portal/1.0",
  "Content-Type": "application/json",
};

async function main() {
  // 1. Encontrar o pedido (últimos 6 chars do ID = ftze1x)
  const orders = await prisma.order.findMany({
    where: { isEmergency: true },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  const order = orders.find(
    (o) => o.id.slice(-6).toLowerCase() === "ftze1x"
  );

  if (!order) {
    console.error("❌ Pedido #FTZE1X não encontrado!");
    process.exit(1);
  }

  console.log(`\n📦 Pedido encontrado:`);
  console.log(`   ID: ${order.id}`);
  console.log(`   Short: #${order.id.slice(-6).toUpperCase()}`);
  console.log(`   Franqueado: ${order.user.name} (${order.user.city})`);
  console.log(`   Status: ${order.status}`);
  console.log(`   Total atual: R$ ${order.totalAmount.toFixed(2)}`);
  console.log(`   Multa atual: R$ ${order.emergencyFine.toFixed(2)}`);
  console.log(`   Asaas ID: ${order.asaasPaymentId || "N/A"}`);

  // 2. Verificar se já foi totalmente corrigido (multa + boleto novo)
  // Se a multa já foi aplicada, precisamos apenas recriar o boleto no Asaas
  const fineAlreadyApplied = order.emergencyFine > 0;
  if (fineAlreadyApplied) {
    console.log("\n⚠️ Multa já aplicada no banco. Verificando se boleto no Asaas precisa ser recriado...");
  }

  // 3. Calcular multa
  let itemsTotal, fine, finalAmount;
  if (fineAlreadyApplied) {
    // Multa já no DB — totalAmount já inclui a multa
    finalAmount = order.totalAmount;
    fine = order.emergencyFine;
    itemsTotal = finalAmount - fine;
  } else {
    itemsTotal = order.totalAmount;
    fine = Math.round(itemsTotal * 0.30 * 100) / 100;
    finalAmount = Math.round((itemsTotal + fine) * 100) / 100;
  }

  console.log(`\n💰 Aplicando multa 30%:`);
  console.log(`   Subtotal itens: R$ ${itemsTotal.toFixed(2)}`);
  console.log(`   Multa 30%:      R$ ${fine.toFixed(2)}`);
  console.log(`   Novo total:     R$ ${finalAmount.toFixed(2)}`);

  // 4. Cancelar boleto antigo no Asaas
  let newBoletoUrl = null;
  let newAsaasPaymentId = null;
  let asaasSuccess = false;

  if (order.asaasPaymentId && ASAAS_KEY) {
    console.log(`\n🗑️  Cancelando boleto antigo: ${order.asaasPaymentId}`);
    try {
      const delRes = await fetch(`${BASE_URL}/payments/${order.asaasPaymentId}`, {
        method: "DELETE",
        headers,
      });
      const text = await delRes.text();
      try {
        const delData = JSON.parse(text);
        if (delRes.ok || delData?.deleted) {
          console.log("   ✅ Boleto antigo cancelado no Asaas");
        } else {
          console.warn("   ⚠️ Resposta Asaas:", JSON.stringify(delData));
        }
      } catch {
        console.warn("   ⚠️ Resposta não-JSON do Asaas (status " + delRes.status + ")");
      }
    } catch (err) {
      console.warn("   ⚠️ Erro ao cancelar boleto:", err.message);
    }
  }

  // 5. Gerar novo boleto com valor correto
  if (ASAAS_KEY) {
    console.log(`\n🔗 Gerando novo boleto (R$ ${finalAmount.toFixed(2)})...`);
    try {
      // Buscar customer
      let customerId = null;
      if (order.user.cpfCnpj) {
        const searchRes = await fetch(
          `${BASE_URL}/customers?cpfCnpj=${encodeURIComponent(order.user.cpfCnpj)}`,
          { headers }
        );
        const searchText = await searchRes.text();
        try {
          const data = JSON.parse(searchText);
          if (data.data?.length > 0) customerId = data.data[0].id;
        } catch {
          console.warn("   ⚠️ Resposta não-JSON na busca de customer");
        }
      }

      if (!customerId) {
        const createRes = await fetch(`${BASE_URL}/customers`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: order.user.name || order.user.email,
            email: order.user.email,
            cpfCnpj: order.user.cpfCnpj || "",
          }),
        });
        const createText = await createRes.text();
        try {
          const createData = JSON.parse(createText);
          customerId = createData.id;
        } catch {
          console.warn("   ⚠️ Resposta não-JSON na criação de customer");
        }
      }

      if (customerId) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 10);
        const shortId = order.id.slice(-6).toUpperCase();

        const payRes = await fetch(`${BASE_URL}/payments`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            customer: customerId,
            billingType: "BOLETO",
            value: finalAmount,
            dueDate: dueDate.toISOString().split("T")[0],
            description: `Pedido Emergência #${shortId} — Taxa de emergência de 30% cobrada conforme termos aceitos pelo cliente no site. — Hakim Congelados`,
            externalReference: order.id,
          }),
        });

        const payText = await payRes.text();
        try {
          const payData = JSON.parse(payText);
          if (payRes.ok && payData.id) {
            newAsaasPaymentId = payData.id;
            newBoletoUrl = payData.invoiceUrl || payData.bankSlipUrl || null;
            asaasSuccess = true;
            console.log(`   ✅ Novo boleto gerado: ${newAsaasPaymentId}`);
            console.log(`   🔗 Link: ${newBoletoUrl}`);
          } else {
            console.warn("   ⚠️ Erro Asaas:", JSON.stringify(payData));
          }
        } catch {
          console.warn("   ⚠️ Resposta não-JSON na criação de pagamento");
        }
      } else {
        console.warn("   ⚠️ Não foi possível obter/criar customer no Asaas");
      }
    } catch (err) {
      console.warn("   ⚠️ Erro na comunicação com Asaas:", err.message);
    }
  }

  if (!asaasSuccess) {
    console.log("\n⚠️ Asaas não respondeu (key pode estar inválida). O banco será atualizado mesmo assim.");
    console.log("   → Gere o novo boleto manualmente pelo painel do Asaas ou atualize a ASAAS_API_KEY.");
  }

  // 6. Atualizar pedido no banco
  await prisma.order.update({
    where: { id: order.id },
    data: {
      totalAmount: finalAmount,
      emergencyFine: fine,
      ...(newBoletoUrl ? { boletoUrl: newBoletoUrl } : {}),
      ...(newAsaasPaymentId ? { asaasPaymentId: newAsaasPaymentId } : {}),
    },
  });
  console.log("\n✅ Pedido atualizado no banco de dados.");

  // 7. Registrar no histórico
  await prisma.orderHistory.create({
    data: {
      orderId: order.id,
      statusFrom: order.status,
      statusTo: order.status,
      actionBy: "SISTEMA (correção)",
      actionEmail: "sistema@hakim.com.br",
      notes: `Multa 30% aplicada retroativamente: R$ ${fine.toFixed(2)}. Total atualizado de R$ ${itemsTotal.toFixed(2)} para R$ ${finalAmount.toFixed(2)}. Boleto anterior cancelado e novo gerado.`,
    },
  });
  console.log("✅ Histórico registrado.");

  console.log(`\n🎉 Correção concluída!`);
  console.log(`   Pedido: #${order.id.slice(-6).toUpperCase()}`);
  console.log(`   Novo total: R$ ${finalAmount.toFixed(2)}`);
  console.log(`   Multa: R$ ${fine.toFixed(2)}`);
  if (newBoletoUrl) console.log(`   Novo link: ${newBoletoUrl}`);
}

main()
  .catch((e) => {
    console.error("Erro fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
