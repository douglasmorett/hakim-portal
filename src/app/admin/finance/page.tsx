import { prisma } from "@/lib/prisma";
import FinanceForm from "@/components/FinanceForm";
import { MarkPaidButton, DeletePayableButton, BarcodeDisplay } from "@/components/FinanceActionButtons";

export default async function AdminFinancePage() {
  const payables = await prisma.payable.findMany({
    where: { status: "PENDING" },
    orderBy: { dueDate: "asc" }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayPayables = payables.filter(p => {
    const d = new Date(p.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const overduePayables = payables.filter(p => {
    const d = new Date(p.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  });

  const futurePayables = payables.filter(p => {
    const d = new Date(p.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (d: Date) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  const renderTable = (list: typeof payables, title: string, color: string) => (
    <div className="card mb-8">
      <h2 className="font-bold text-lg mb-4" style={{ color }}>{title} ({list.length})</h2>
      {list.length === 0 ? (
        <p className="text-muted text-sm">Nenhuma conta encontrada nesta categoria.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                <th style={{ padding: "0.5rem" }}>Fornecedor</th>
                <th style={{ padding: "0.5rem" }}>Valor</th>
                <th style={{ padding: "0.5rem" }}>Vencimento</th>
                <th style={{ padding: "0.5rem" }}>Cód. Barras</th>
                <th style={{ padding: "0.5rem" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map(item => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "0.5rem", fontWeight: "bold" }}>{item.supplierName}</td>
                  <td style={{ padding: "0.5rem", color: "var(--danger)" }}>{formatCurrency(item.value)}</td>
                  <td style={{ padding: "0.5rem" }}>{formatDate(item.dueDate)}</td>
                  <td style={{ padding: "0.5rem" }}><BarcodeDisplay barcode={item.barcode} /></td>
                  <td style={{ padding: "0.5rem", display: "flex", gap: "0.5rem" }}>
                    <MarkPaidButton id={item.id} />
                    <DeletePayableButton id={item.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Módulo Financeiro</h1>
      <p className="text-muted mb-8">Gestão de Contas a Pagar e Inadimplência.</p>

      <FinanceForm />

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
        {renderTable(overduePayables, "🔴 Pendentes / Atrasadas", "#ef4444")}
        {renderTable(todayPayables, "🟡 A Pagar Hoje", "#f59e0b")}
        {renderTable(futurePayables, "🟢 Contas Futuras", "#10b981")}
      </div>
    </div>
  );
}
