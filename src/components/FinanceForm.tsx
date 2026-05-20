"use client";

import { useState, useRef } from "react";
import { createPayable } from "@/app/actions/finance";
import BarcodeScanner from "./BarcodeScanner";
import { Camera, ScanLine, Loader2, PenLine } from "lucide-react";

type InputMode = "manual" | "confirm" | null;

interface BoletoData {
  beneficiary: string;
  cnpj: string;
  value: number;
  totalValue: number;
  dueDate: string;
  barcode: string;
}

export default function FinanceForm({ category = "BUSINESS" }: { category?: string }) {
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [boletoData, setBoletoData] = useState<BoletoData | null>(null);
  const [formData, setFormData] = useState({
    supplierName: "",
    barcode: "",
    receivedDate: "",
    dueDate: "",
    value: ""
  });
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearMessages = () => { setErrorMsg(null); setSuccessMsg(null); };
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (d: string) => { if (!d) return "—"; const [y,m,day] = d.split("-"); return `${day}/${m}/${y}`; };

  // FLUXO: Foto → IA lê barcode → Asaas consulta → Confirmação
  const handlePhotoScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanLoading(true);
    clearMessages();
    setBoletoData(null);

    try {
      // Passo 1: Upload da foto
      setScanStep("📤 Enviando foto...");
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("type", "payable");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadData });
      const { url, error: upError } = await uploadRes.json();
      if (upError) throw new Error(upError);

      // Passo 2: IA lê o código de barras da foto
      setScanStep("🔍 IA lendo código de barras...");
      const aiRes = await fetch("/api/payables/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      const aiData = await aiRes.json();
      if (aiData.error) throw new Error(aiData.error);
      if (!aiData.barcode) throw new Error("Código de barras não encontrado na foto.");

      // Passo 3: Consulta Asaas com o barcode
      setScanStep("🏦 Consultando dados no Asaas...");
      const asaasRes = await fetch("/api/admin/simulate-boleto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: aiData.barcode }),
      });
      const asaasData = await asaasRes.json();

      if (!asaasRes.ok || !asaasData?.boleto) {
        // Asaas não reconheceu — preenche só o barcode no form manual
        setFormData(prev => ({ ...prev, barcode: aiData.barcode }));
        setInputMode("manual");
        setSuccessMsg("📋 Código lido: " + aiData.barcode + ". O Asaas não reconheceu este boleto — preencha os dados manualmente.");
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
        return;
      }

      // Passo 4: Mostrar tela de confirmação com dados reais
      const boleto = asaasData.boleto;
      setBoletoData({
        beneficiary: boleto.beneficiary || "Não identificado",
        cnpj: boleto.cnpj || "",
        value: boleto.value || 0,
        totalValue: boleto.totalValue || boleto.value || 0,
        dueDate: boleto.dueDate || "",
        barcode: boleto.barcode || aiData.barcode,
      });
      setInputMode("confirm");
      setScanStep("");

    } catch (err: any) {
      const msg = err.message || "Erro desconhecido";
      if (msg.includes("código") || msg.includes("foto") || msg.includes("barras") || msg.includes("nítida") || msg.includes("próxima")) {
        setErrorMsg("📷 " + msg);
      } else {
        setErrorMsg("Erro: " + msg);
      }
    } finally {
      setScanLoading(false);
      setScanStep("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Confirmar e registrar a conta
  const handleConfirmAndRegister = async () => {
    if (!boletoData) return;
    setLoading(true);
    clearMessages();

    try {
      const result = await createPayable({
        supplierName: boletoData.beneficiary,
        barcode: boletoData.barcode,
        dueDate: boletoData.dueDate,
        value: boletoData.totalValue || boletoData.value,
        receivedDate: "",
        category,
      });

      if (result && 'error' in result) {
        setErrorMsg(result.error || "Erro ao registrar.");
      } else {
        setSuccessMsg("✅ Conta registrada com sucesso!");
        setBoletoData(null);
        setInputMode(null);
      }
    } catch (err: any) {
      setErrorMsg("Erro de conexão: " + (err?.message || "Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  // Registro manual
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    if (!formData.supplierName.trim()) { setErrorMsg("Informe o nome do fornecedor."); setLoading(false); return; }
    const numValue = parseFloat(formData.value);
    if (!formData.value || isNaN(numValue) || numValue <= 0) { setErrorMsg("Informe um valor válido maior que zero."); setLoading(false); return; }
    if (!formData.dueDate) { setErrorMsg("Informe a data de vencimento."); setLoading(false); return; }

    try {
      const result = await createPayable({ ...formData, value: numValue, category });
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
            // Barcode escaneado pela câmera — consulta o Asaas
            setScanLoading(true);
            setScanStep("🏦 Consultando dados no Asaas...");
            clearMessages();
            fetch("/api/admin/simulate-boleto", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ barcode: text }),
            })
              .then(r => r.json())
              .then(data => {
                if (data?.boleto) {
                  setBoletoData({
                    beneficiary: data.boleto.beneficiary || "Não identificado",
                    cnpj: data.boleto.cnpj || "",
                    value: data.boleto.value || 0,
                    totalValue: data.boleto.totalValue || data.boleto.value || 0,
                    dueDate: data.boleto.dueDate || "",
                    barcode: data.boleto.barcode || text,
                  });
                  setInputMode("confirm");
                } else {
                  setFormData(prev => ({ ...prev, barcode: text }));
                  setInputMode("manual");
                  setSuccessMsg("📋 Código capturado! Preencha os demais campos.");
                }
              })
              .catch(() => {
                setFormData(prev => ({ ...prev, barcode: text }));
                setInputMode("manual");
                setSuccessMsg("📋 Código capturado! Preencha os demais campos.");
              })
              .finally(() => { setScanLoading(false); setScanStep(""); });
          }} 
        />
      )}

      <div className="card mb-8" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 className="font-bold text-lg">Registrar Nova Conta a Pagar</h2>

        {/* Mensagens */}
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

        {/* Loading com passos */}
        {scanLoading && (
          <div style={{ padding: "1.25rem", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "0.75rem", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
            <Loader2 size={22} className="animate-spin" />
            <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{scanStep || "Processando..."}</span>
          </div>
        )}

        {/* ──── TELA DE CONFIRMAÇÃO DOS DADOS DO ASAAS ──── */}
        {inputMode === "confirm" && boletoData && !scanLoading && (
          <div ref={formRef} style={{ border: "2px solid #10b981", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ backgroundColor: "#ecfdf5", padding: "12px 16px", borderBottom: "1px solid #a7f3d0" }}>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: "1rem", color: "#059669", display: "flex", alignItems: "center", gap: "8px" }}>
                🔍 Confirme os dados do boleto
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
                Dados consultados diretamente no Asaas — confira antes de registrar
              </p>
            </div>

            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>Beneficiário</span>
                <strong style={{ fontSize: "0.95rem" }}>{boletoData.beneficiary}</strong>
              </div>
              {boletoData.cnpj && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>CNPJ</span>
                  <strong style={{ fontSize: "0.9rem" }}>{boletoData.cnpj}</strong>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>Vencimento</span>
                <strong>{formatDate(boletoData.dueDate)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>💰 Total a pagar</span>
                <strong style={{ fontSize: "1.2rem", color: "#059669" }}>{formatCurrency(boletoData.totalValue)}</strong>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", wordBreak: "break-all", padding: "6px 0", borderTop: "1px solid #f3f4f6" }}>
                📊 {boletoData.barcode}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", padding: "0 16px 16px" }}>
              <button
                onClick={() => { setBoletoData(null); setInputMode(null); clearMessages(); }}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", color: "var(--text-muted)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAndRegister}
                disabled={loading}
                style={{ flex: 2, padding: "12px", borderRadius: "8px", border: "none", background: loading ? "#6B7280" : "#10b981", color: "#fff", cursor: loading ? "wait" : "pointer", fontWeight: 700, fontSize: "0.95rem" }}
              >
                {loading ? "Registrando..." : "✅ Confirmar e Registrar"}
              </button>
            </div>
          </div>
        )}

        {/* ──── SELETOR DE MODO ──── */}
        {inputMode === null && !scanLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
              Escolha como deseja registrar:
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => { setInputMode("manual"); clearMessages(); }}
                className="btn"
                style={{ flex: 1, minWidth: "200px", padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", backgroundColor: "var(--primary)", color: "white", borderRadius: "0.75rem", border: "none", cursor: "pointer", fontSize: "0.95rem", fontWeight: "bold", transition: "all 0.2s ease" }}
              >
                <PenLine size={28} />
                ✍️ Registrar Manualmente
                <span style={{ fontSize: "0.75rem", fontWeight: "normal", opacity: 0.85 }}>Preencha os campos do boleto</span>
              </button>

              <button
                type="button"
                onClick={() => { clearMessages(); fileInputRef.current?.click(); }}
                className="btn"
                disabled={scanLoading}
                style={{ flex: 1, minWidth: "200px", padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", backgroundColor: "#10b981", color: "white", borderRadius: "0.75rem", border: "none", cursor: "pointer", fontSize: "0.95rem", fontWeight: "bold", transition: "all 0.2s ease" }}
              >
                <Camera size={28} />
                📷 Fotografar Boleto
                <span style={{ fontSize: "0.75rem", fontWeight: "normal", opacity: 0.85 }}>Tire foto da linha digitável</span>
              </button>

              <button
                type="button"
                onClick={() => { clearMessages(); setShowScanner(true); }}
                className="btn"
                style={{ flex: 1, minWidth: "200px", padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", backgroundColor: "#6366f1", color: "white", borderRadius: "0.75rem", border: "none", cursor: "pointer", fontSize: "0.95rem", fontWeight: "bold", transition: "all 0.2s ease" }}
              >
                <ScanLine size={28} />
                📱 Escanear Barras
                <span style={{ fontSize: "0.75rem", fontWeight: "normal", opacity: 0.85 }}>Aponte para o código de barras</span>
              </button>
            </div>
          </div>
        )}

        {/* ──── FORMULÁRIO MANUAL ──── */}
        {inputMode === "manual" && !scanLoading && (
          <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.75rem", backgroundColor: "#eff6ff", borderRadius: "0.5rem", fontSize: "0.85rem", fontWeight: "bold", color: "#2563eb" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <PenLine size={16} /> Modo Manual
              </span>
              <button type="button" onClick={() => { setInputMode(null); clearMessages(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline", color: "inherit" }}>
                Voltar
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Nome do Fornecedor *</label>
                <input required type="text" className="input" placeholder="Ex: Gráfica Nova Era" value={formData.supplierName} onChange={e => setFormData({...formData, supplierName: e.target.value})} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Valor (R$) *</label>
                <input required type="number" step="0.01" className="input" placeholder="0.00" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Data de Recebimento</label>
                <input type="date" className="input" value={formData.receivedDate} onChange={e => setFormData({...formData, receivedDate: e.target.value})} />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Se vazio, usa a data de hoje</span>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Data de Vencimento *</label>
                <input required type="date" className="input" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>Código de Barras</label>
              <input type="text" className="input" placeholder="Linha digitável do boleto" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: "flex-start", marginTop: "0.5rem", padding: "0.65rem 1.5rem", fontSize: "1rem" }}>
              {loading ? "Registrando..." : "✅ Registrar Conta"}
            </button>
          </form>
        )}

        {/* Input oculto para câmera */}
        <input 
          type="file" 
          accept="image/*"
          capture="environment"
          ref={fileInputRef} 
          style={{ display: "none" }} 
          onChange={handlePhotoScan}
        />
      </div>
    </>
  );
}
