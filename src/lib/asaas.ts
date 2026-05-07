const ASAAS_HEADERS = (key: string) => ({
  "access_token": key,
  "User-Agent": "hakim-portal/1.0",
  "Content-Type": "application/json"
});

export async function checkAsaasOverdue(cpfCnpj: string | null): Promise<boolean> {
  if (!cpfCnpj) return false;
  
  const asaasKey = process.env.ASAAS_API_KEY;
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
  const asaasKey = process.env.ASAAS_API_KEY;
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
