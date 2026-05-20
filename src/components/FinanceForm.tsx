"use client";

import { useState, useRef } from "react";
import { createPayable } from "@/app/actions/finance";
import BarcodeScanner from "./BarcodeScanner";
import { ScanLine, Loader2, PenLine } from "lucide-react";

type InputMode = "manual" | "scan" | null;

export default function FinanceForm({ category = "BUSINESS" }: { category?: string }) {
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplierName: "",
    barcode: "",
    receivedDate: "",
    dueDate: "",
    value: ""
  });
  const formRef = useRef<HTMLDivElement>(null);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Consulta o Asaas com o barcode escaneado para preencher dados reais
  const handleBarcodeLookup = async (barcode: string) => {
    setScanLoading(true);
    clearMessages();
    setFormData(prev => ({ ...prev, barcode }));

    try {
      const res = await fetch("/api/admin/simulate-boleto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });
      const data = await res.json();

      if (!res.ok || !data?.boleto) {
        // Barcode pode não estar no Asaas — preenche só o barcode
        setFormData(prev => ({ ...prev, barcode }));
        setSuccessMsg("📋 Código de barras capturado! Preencha os demais campos manualmente.");
        setInputMode("scan");
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
        return;
      }

      const boleto = data.boleto;
      setFormData(prev => ({
        ...prev,
        supplierName: boleto.beneficiary || prev.supplierName,
        barcode: boleto.barcode || barcode,
        dueDate: boleto.dueDate || prev.dueDate,
        value: boleto.totalValue ? boleto.totalValue.toString() : (boleto.value ? boleto.value.toString() : prev.value),
      }));
      setInputMode("scan");
      setSuccessMsg("✅ Dados do boleto preenchidos via Asaas! Confira e clique em 'Registrar Conta'.");
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
    } catch (err: any) {
      setFormData(prev => ({ ...prev, barcode }));
      setInputMode("scan");
      setSuccessMsg("📋 Código de barras capturado! Preencha os demais campos manualmente.");
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
    } finally {
      setScanLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

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

    if (!formData.dueDate) {
      setErrorMsg("Informe a data de vencimento.");
      setLoading(false);
      return;
    }

    try {
      const result = await createPayable({
        ...formData,
        value: numValue,
        category
      });

      if (result && 'error' in result) {
        setErrorMsg(result.error || "Erro desconhecido ao registrar.");
      } else {
        setFormData({ supplierName: "", barcode: "", receivedDate: "", dueDate: "", value: "" });
        setSuccessMsg("✅ Conta registrada com sucesso!");
        setInputMode(null);
      }
    } catch (err: any) {
      setErrorMsg("Erro de conexão: " + (err?.message || "Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <>
      {showScanner && (
        <BarcodeScanner 
          onClose={() => setShowScanner(false)} 
          onScan={(text) => {
            setShowScanner(false);
            handleBarcodeLookup(text);
          }} 
        />
      )}

      <div className="card mb-8" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 className="font-bold text-lg">Registrar Nova Conta a Pagar</h2>

        {/* Mensagens de feedback */}
        {errorMsg && (
          <div style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.5rem",
            color: "#dc2626",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
            <button 
              type="button"
              onClick={() => setErrorMsg(null)} 
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "#dc2626" }}
            >×</button>
          </div>
        )}
        {successMsg && (
          <div style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "0.5rem",
            color: "#16a34a",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <span>{successMsg}</span>
            <button 
              type="button"
              onClick={() => setSuccessMsg(null)} 
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "#16a34a" }}
            >×</button>
          </div>
        )}

        {/* Loading do scan */}
        {scanLoading && (
          <div style={{
            padding: "1rem",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "0.5rem",
            color: "#2563eb",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem"
          }}>
            <Loader2 size={20} className="animate-spin" />
            <span>Consultando dados do boleto no Asaas...</span>
          </div>
        )}

        {/* Seletor de modo de entrada */}
        {inputMode === null && !scanLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
              Escolha como deseja registrar:
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setInputMode("manual");
                  clearMessages();
                }}
                className="btn"
                style={{
                  flex: 1,
                  minWidth: "200px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: "var(--primary)",
                  color: "white",
                  borderRadius: "0.75rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontWeight: "bold",
                  transition: "all 0.2s ease"
                }}
              >
                <PenLine size={28} />
                ✍️ Registrar Manualmente
                <span style={{ fontSize: "0.75rem", fontWeight: "normal", opacity: 0.85 }}>
                  Preencha os campos do boleto
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setShowScanner(true);
                }}
                className="btn"
                style={{
                  flex: 1,
                  minWidth: "200px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: "#10b981",
                  color: "white",
                  borderRadius: "0.75rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontWeight: "bold",
                  transition: "all 0.2s ease"
                }}
              >
                <ScanLine size={28} />
                📷 Escanear Boleto
                <span style={{ fontSize: "0.75rem", fontWeight: "normal", opacity: 0.85 }}>
                  Escaneie o código de barras
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Formulário manual ou preenchido pelo scan */}
        {inputMode !== null && (
          <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Header do modo selecionado */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              padding: "0.5rem 0.75rem",
              backgroundColor: inputMode === "manual" ? "#eff6ff" : "#ecfdf5",
              borderRadius: "0.5rem",
              fontSize: "0.85rem",
              fontWeight: "bold",
              color: inputMode === "manual" ? "#2563eb" : "#059669"
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {inputMode === "manual" ? <PenLine size={16} /> : <ScanLine size={16} />}
                {inputMode === "manual" ? "Modo Manual" : "Dados do Asaas — Confira e registre"}
              </span>
              <button 
                type="button" 
                onClick={() => { setInputMode(null); clearMessages(); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline", color: "inherit" }}
              >
                Voltar
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Nome do Fornecedor *</label>
                <input 
                  required 
                  type="text" 
                  className="input" 
                  placeholder="Ex: Gráfica Nova Era"
                  value={formData.supplierName}
                  onChange={e => setFormData({...formData, supplierName: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Valor (R$) *</label>
                <input 
                  required 
                  type="number" 
                  step="0.01"
                  className="input" 
                  placeholder="0.00"
                  value={formData.value}
                  onChange={e => setFormData({...formData, value: e.target.value})}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Data de Recebimento</label>
                <input 
                  type="date" 
                  className="input" 
                  value={formData.receivedDate}
                  onChange={e => setFormData({...formData, receivedDate: e.target.value})}
                  placeholder={todayStr}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Se vazio, usa a data de hoje</span>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Data de Vencimento *</label>
                <input 
                  required 
                  type="date" 
                  className="input" 
                  value={formData.dueDate}
                  onChange={e => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Código de Barras</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input 
                  type="text" 
                  className="input" 
                  style={{ flex: 1 }}
                  placeholder="Linha digitável do boleto"
                  value={formData.barcode}
                  onChange={e => setFormData({...formData, barcode: e.target.value})}
                />
                <button 
                  type="button" 
                  onClick={() => setShowScanner(true)}
                  className="btn btn-outline" 
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", whiteSpace: "nowrap", padding: "0.5rem 1rem" }}
                  title="Ler Código de Barras"
                >
                  <ScanLine size={18} /> Escanear
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading} 
              style={{ alignSelf: "flex-start", marginTop: "0.5rem", padding: "0.65rem 1.5rem", fontSize: "1rem" }}
            >
              {loading ? "Registrando..." : "✅ Registrar Conta"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
