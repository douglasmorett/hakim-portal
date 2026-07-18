"use client";

import { useState } from "react";
import { createRecurringPayable } from "@/app/actions/finance";

interface CreditCard {
  id: string;
  name: string;
  lastDigits: string | null;
}

interface Props {
  category?: string;
  creditCards: CreditCard[];
}

export default function RecurringFinanceForm({ category = "BUSINESS", creditCards }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    supplierName: "",
    value: "",
    dueDateDay: "",
    paymentType: "BOLETO",
    barcode: "",
    pixKey: "",
    pixKeyName: "",
    pixKeyType: "CPF",
    creditCardId: ""
  });

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    // Validações básicas
    if (!formData.supplierName.trim()) {
      setErrorMsg("Informe o nome do fornecedor.");
      setLoading(false);
      return;
    }

    const numValue = parseFloat(formData.value);
    if (!formData.value || isNaN(numValue) || numValue <= 0) {
      setErrorMsg("Informe um valor válido maior que zero.");
      setLoading(false);
      return;
    }

    const day = parseInt(formData.dueDateDay, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      setErrorMsg("Informe um dia de vencimento válido (entre 1 e 31).");
      setLoading(false);
      return;
    }

    if (formData.paymentType === "CREDIT_CARD" && !formData.creditCardId) {
      setErrorMsg("Selecione um cartão de crédito.");
      setLoading(false);
      return;
    }

    try {
      const result = await createRecurringPayable({
        supplierName: formData.supplierName,
        value: numValue,
        category,
        paymentType: formData.paymentType,
        dueDateDay: day,
        barcode: formData.paymentType === "BOLETO" ? formData.barcode : undefined,
        pixKey: formData.paymentType === "PIX" ? formData.pixKey : undefined,
        pixKeyName: formData.paymentType === "PIX" ? formData.pixKeyName : undefined,
        pixKeyType: formData.paymentType === "PIX" ? formData.pixKeyType : undefined,
        creditCardId: formData.paymentType === "CREDIT_CARD" ? formData.creditCardId : undefined
      });

      if (result && 'error' in result) {
        setErrorMsg(result.error || "Erro desconhecido ao registrar conta fixa.");
      } else {
        setFormData({
          supplierName: "",
          value: "",
          dueDateDay: "",
          paymentType: "BOLETO",
          barcode: "",
          pixKey: "",
          pixKeyName: "",
          pixKeyType: "CPF",
          creditCardId: ""
        });
        setSuccessMsg("✅ Conta fixa cadastrada com sucesso! E sua primeira parcela já foi gerada para o mês atual.");
      }
    } catch (err: any) {
      setErrorMsg("Erro de conexão: " + (err?.message || "Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mb-8" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h2 className="font-bold text-lg">Cadastrar Nova Conta Fixa</h2>

      {/* Mensagens de feedback */}
      {errorMsg && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.5rem", color: "#dc2626", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>⚠️</span><span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "#dc2626" }}>×</button>
        </div>
      )}
      {successMsg && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.5rem", color: "#16a34a", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "#16a34a" }}>×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Nome do Fornecedor *</label>
            <input
              required
              type="text"
              className="input"
              placeholder="Ex: Aluguel da Loja"
              value={formData.supplierName}
              onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Valor Estimado (R$) *</label>
            <input
              required
              type="number"
              step="0.01"
              className="input"
              placeholder="0.00"
              value={formData.value}
              onChange={e => setFormData({ ...formData, value: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Dia do Vencimento (1 a 31) *</label>
            <input
              required
              type="number"
              min="1"
              max="31"
              className="input"
              placeholder="Ex: 10"
              value={formData.dueDateDay}
              onChange={e => setFormData({ ...formData, dueDateDay: e.target.value })}
            />
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>A conta será gerada automaticamente com vencimento nesse dia.</span>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Tipo de Pagamento *</label>
            <select
              className="input"
              value={formData.paymentType}
              onChange={e => setFormData({ ...formData, paymentType: e.target.value, creditCardId: "", barcode: "", pixKey: "", pixKeyName: "" })}
              style={{ width: "100%", height: "42px", padding: "8px 12px" }}
            >
              <option value="BOLETO">📄 Boleto Bancário</option>
              <option value="PIX">⚡ Pix</option>
              <option value="CREDIT_CARD">💳 Cartão de Crédito</option>
            </select>
          </div>
        </div>

        {/* Campos Condicionais baseados no tipo de pagamento */}
        {formData.paymentType === "BOLETO" && (
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Código de Barras (Opcional)</label>
            <input
              type="text"
              className="input"
              placeholder="Linha digitável do boleto para pagamento automático"
              value={formData.barcode}
              onChange={e => setFormData({ ...formData, barcode: e.target.value })}
            />
          </div>
        )}

        {formData.paymentType === "PIX" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "12px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(0, 0, 0, 0.02)" }}>
            <strong style={{ fontSize: "0.85rem", color: "var(--primary)" }}>Dados para pagamento via PIX</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.8rem", fontWeight: "bold" }}>Tipo de Chave</label>
                <select
                  className="input"
                  value={formData.pixKeyType}
                  onChange={e => setFormData({ ...formData, pixKeyType: e.target.value })}
                  style={{ width: "100%", height: "40px" }}
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="TELEFONE">Celular</option>
                  <option value="ALEATORIA">Chave Aleatória (EVP)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.8rem", fontWeight: "bold" }}>Chave PIX</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Insira a chave PIX"
                  value={formData.pixKey}
                  onChange={e => setFormData({ ...formData, pixKey: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.8rem", fontWeight: "bold" }}>Nome do Beneficiário</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nome de quem recebe"
                  value={formData.pixKeyName}
                  onChange={e => setFormData({ ...formData, pixKeyName: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {formData.paymentType === "CREDIT_CARD" && (
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Cartão de Crédito *</label>
            {creditCards.length === 0 ? (
              <div style={{ color: "#dc2626", fontSize: "0.85rem", padding: "8px 0" }}>
                ⚠️ Nenhum cartão de crédito cadastrado ou ativo. Cadastre um cartão antes de associar a conta fixa.
              </div>
            ) : (
              <select
                required
                className="input"
                value={formData.creditCardId}
                onChange={e => setFormData({ ...formData, creditCardId: e.target.value })}
                style={{ width: "100%", height: "42px", padding: "8px 12px" }}
              >
                <option value="">Selecione um cartão...</option>
                {creditCards.map(card => (
                  <option key={card.id} value={card.id}>
                    💳 {card.name} {card.lastDigits ? `(final ${card.lastDigits})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || (formData.paymentType === "CREDIT_CARD" && creditCards.length === 0)}
          style={{ alignSelf: "flex-start", marginTop: "0.5rem", padding: "0.65rem 1.5rem", fontSize: "1rem" }}
        >
          {loading ? "Salvando..." : "⚙️ Cadastrar Conta Fixa"}
        </button>
      </form>
    </div>
  );
}
