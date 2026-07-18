const ASAAS_HEADERS = (key: string) => ({
  "access_token": key,
  "User-Agent": "hakim-portal/1.0",
  "Content-Type": "application/json"
});

/**
 * Retorna a chave do Asaas de forma segura.
 * O Vercel interpreta `$` em env vars como referência a outra variável,
 * o que corrompe a chave do Asaas (que começa com `$aact_prod_...`).
 * Solução:
 * 1. Priorizar base64 em ASAAS_API_KEY_B64 (imune à interpolação).
 * 2. Suportar chave direta sem o '$' inicial (e.g. configurada como 'aact_prod_...').
 *    Nossos métodos adicionam o '$' automaticamente em runtime se estiver faltando,
 *    evitando qualquer interpolação ou corrupção do Vercel!
 */
export function getAsaasKey(): string | null {
  const formatKey = (key: string | undefined): string | null => {
    if (!key) return null;
    const trimmed = key.trim();
    if (trimmed.startsWith("$aact_")) return trimmed;
    if (trimmed.startsWith("aact_")) return "$" + trimmed;
    return null;
  };

  // 1. Tenta env var B64 (override limpo, se configurada)
  const b64 = process.env.ASAAS_API_KEY_B64;
  if (b64) {
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      const formatted = formatKey(decoded);
      if (formatted) return formatted;
    } catch (e) {
      console.error("[Asaas] Erro ao decodificar ASAAS_API_KEY_B64:", e);
    }
  }

  // 2. Env var direta (pode precisar de cuidado com '$' no Vercel)
  const direct = process.env.ASAAS_API_KEY;
  const formattedDirect = formatKey(direct);
  if (formattedDirect) return formattedDirect;

  console.error("[Asaas] ASAAS_API_KEY is not defined. Set ASAAS_API_KEY or ASAAS_API_KEY_B64 in your environment variables.");
  return null;
}

export async function checkAsaasOverdue(cpfCnpj: string | null): Promise<boolean> {
  if (!cpfCnpj) return false;
  
  const asaasKey = getAsaasKey();
  if (!asaasKey) return false;

  try {
    const customerRes = await fetch(`https://api.asaas.com/v3/customers?cpfCnpj=${cpfCnpj}`, {
      headers: ASAAS_HEADERS(asaasKey)
    });
    const customerData = await customerRes.json();

    if (!customerRes.ok || !customerData.data || customerData.data.length === 0) {
      return false;
    }

    const asaasCustomerId = customerData.data[0].id;

    const paymentsRes = await fetch(`https://api.asaas.com/v3/payments?customer=${asaasCustomerId}&status=OVERDUE`, {
      headers: ASAAS_HEADERS(asaasKey)
    });
    
    const paymentsData = await paymentsRes.json();

    if (paymentsRes.ok && paymentsData.data && paymentsData.data.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Erro ao checar inadimplência no Asaas:", error);
    return false;
  }
}

export async function getAsaasDashboardData(month: number, year: number) {
  const asaasKey = getAsaasKey();
  if (!asaasKey) return null;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  try {
    const [receivedRes, pendingRes, overdueRes] = await Promise.all([
      fetch(`https://api.asaas.com/v3/payments?status=RECEIVED&dueDateStart=${startDate}&dueDateEnd=${endDate}&limit=100`, {
        headers: ASAAS_HEADERS(asaasKey)
      }),
      fetch(`https://api.asaas.com/v3/payments?status=PENDING&limit=100`, {
        headers: ASAAS_HEADERS(asaasKey)
      }),
      fetch(`https://api.asaas.com/v3/payments?status=OVERDUE&limit=100`, {
        headers: ASAAS_HEADERS(asaasKey)
      })
    ]);

    const [receivedData, pendingData, overdueData] = await Promise.all([
      receivedRes.json(),
      pendingRes.json(),
      overdueRes.json()
    ]);

    const sumValues = (payments: any[]) =>
      payments?.reduce((acc: number, p: any) => acc + (p.value || 0), 0) || 0;

    return {
      received: {
        count: receivedData?.totalCount || 0,
        value: sumValues(receivedData?.data || [])
      },
      pending: {
        count: pendingData?.totalCount || 0,
        value: sumValues(pendingData?.data || [])
      },
      overdue: {
        count: overdueData?.totalCount || 0,
        value: sumValues(overdueData?.data || [])
      }
    };
  } catch (error) {
    console.error("Erro ao buscar dados do Asaas:", error);
    return null;
  }
}

/**
 * Cria uma cobrança no Asaas e retorna { paymentId, boletoUrl } ou null se falhar.
 * Reutilizada pelo checkout normal e checkout de emergência.
 */
export async function createAsaasPayment(opts: {
  userName: string;
  userEmail: string;
  cpfCnpj: string;
  totalAmount: number;
  orderId: string;
  description?: string;
}): Promise<{ paymentId: string; boletoUrl: string | null } | null> {
  const userEmailClean = opts.userEmail?.toLowerCase().replace(/\s+/g, "");
  const bypassEmails = (process.env.BYPASS_BILLING_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  if (!bypassEmails.includes("viniciusmenezes.ofc@gmail.com")) {
    bypassEmails.push("viniciusmenezes.ofc@gmail.com");
  }
  if (bypassEmails.includes(userEmailClean ?? "")) {
    console.log(`[Asaas API Bypass] Email ${opts.userEmail} is exempt. Skip payment creation.`);
    return null;
  }

  const asaasKey = getAsaasKey();
  if (!asaasKey) {
    console.warn("ASAAS_API_KEY não configurada — cobrança não gerada.");
    return null;
  }

  const BASE = asaasKey.startsWith("$aact_prod")
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/v3";

  try {
    // 1. Busca ou cria cliente
    let customerId: string | null = null;

    if (opts.cpfCnpj) {
      const searchRes = await fetch(
        `${BASE}/customers?cpfCnpj=${encodeURIComponent(opts.cpfCnpj)}`,
        { headers: ASAAS_HEADERS(asaasKey) }
      );
      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.data?.length > 0) customerId = data.data[0].id;
      }
    }

    if (!customerId) {
      const createRes = await fetch(`${BASE}/customers`, {
        method: "POST",
        headers: ASAAS_HEADERS(asaasKey),
        body: JSON.stringify({
          name: opts.userName || opts.userEmail,
          email: opts.userEmail,
          cpfCnpj: opts.cpfCnpj || ""
        })
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        console.error("Erro criar cliente Asaas:", JSON.stringify(createData));
        return null;
      }
      customerId = createData.id;
    }

    if (!customerId) return null;

    // 2. Cria cobrança (boleto) com vencimento em 10 dias
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);

    const shortId = opts.orderId.slice(-6).toUpperCase();
    const payRes = await fetch(`${BASE}/payments`, {
      method: "POST",
      headers: ASAAS_HEADERS(asaasKey),
      body: JSON.stringify({
        customer: customerId,
        billingType: "BOLETO",
        value: opts.totalAmount,
        dueDate: dueDate.toISOString().split("T")[0],
        description: opts.description || `Pedido #${shortId} — Hakim Congelados`,
        externalReference: opts.orderId
      })
    });

    const payData = await payRes.json();
    if (!payRes.ok) {
      console.error("Erro Asaas payment:", JSON.stringify(payData));
      return null;
    }

    console.log(`[Asaas] payment=${payData.id} invoiceUrl=${payData.invoiceUrl}`);
    return {
      paymentId: payData.id,
      boletoUrl: payData.invoiceUrl || payData.bankSlipUrl || null
    };
  } catch (error) {
    console.error("Erro ao criar pagamento Asaas:", error);
    return null;
  }
}
