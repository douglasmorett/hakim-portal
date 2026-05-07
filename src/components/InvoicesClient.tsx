"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Receipt, CheckCircle, AlertCircle, Loader2, Trash2, Calendar } from "lucide-react";

export default function InvoicesClient({ role }: { role: string }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!description.trim()) {
      setError("Por favor, digite a descrição da nota ANTES de tirar a foto.");
      e.target.value = "";
      return;
    }

    setError("");
    setUploading(true);

    try {
      // 1. Upload to Vercel Blob
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "invoice");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Erro ao enviar imagem");

      const imageUrl = uploadData.url;

      // 2. Process with AI
      const aiRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, description }),
      });

      const aiData = await aiRes.json();
      if (!aiRes.ok) throw new Error(aiData.error || "A IA rejeitou a nota fiscal.");

      alert("Nota salva com sucesso! Valor lido: R$ " + aiData.invoice.aiValue.toFixed(2));
      setDescription("");
      fetchInvoices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta nota fiscal?")) return;
    try {
      const res = await fetch("/api/invoices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) fetchInvoices();
      else alert("Erro ao excluir nota.");
    } catch (e) {
      alert("Erro de conexão.");
    }
  };

  const totalGasto = invoices.reduce((acc, inv) => acc + (inv.aiValue || 0), 0);

  return (
    <div>
      <h1 className="font-bold" style={{ fontSize: "1.75rem", marginBottom: "1.5rem" }}>Notas de Compras</h1>

      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" }}>Nova Nota Fiscal</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", fontSize: "1.1rem" }}>📝 O que você comprou?</label>
            <textarea 
              className="input" 
              placeholder="Ex: Abastecimento do carro da entrega, Papelão, Manutenção..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              rows={3}
              style={{ 
                width: "100%", 
                padding: "1rem", 
                fontSize: "1.1rem", 
                resize: "none", 
                borderRadius: "12px",
                border: "2px solid var(--border-color)",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)"
              }}
            />
          </div>
          
          <button 
            className="btn btn-primary" 
            style={{ width: "100%", padding: "1rem", fontSize: "1.1rem" }}
            disabled={uploading}
            onClick={() => {
              if (!description.trim()) {
                setError("Digite a descrição primeiro!");
                return;
              }
              fileInputRef.current?.click();
            }}
          >
            {uploading ? <Loader2 className="animate-spin" size={24} /> : <Camera size={24} style={{ marginRight: "0.5rem" }} />}
            {uploading ? "A IA está lendo a nota..." : "Tirar Foto da Nota"}
          </button>
          
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef} 
            style={{ display: "none" }} 
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Relatório de Gastos</h2>
        <div style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "0.5rem 1rem", borderRadius: "20px", fontWeight: "bold" }}>
          Total: R$ {totalGasto.toFixed(2)}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-muted">Carregando notas...</p>
        ) : invoices.length === 0 ? (
          <p className="text-muted">Nenhuma nota fiscal registrada ainda.</p>
        ) : (
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                <th style={{ padding: "0.5rem" }}>Postagem</th>
                <th style={{ padding: "0.5rem" }}>Data da NF</th>
                <th style={{ padding: "0.5rem" }}>Descrição</th>
                <th style={{ padding: "0.5rem" }}>Categoria (IA)</th>
                <th style={{ padding: "0.5rem" }}>Valor</th>
                <th style={{ padding: "0.5rem", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    <div>{new Date(inv.createdAt).toLocaleDateString("pt-BR")}</div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.8, marginTop: "0.2rem" }}>
                      {inv.uploadedBy}
                    </div>
                  </td>
                  <td style={{ padding: "0.5rem", fontWeight: "bold" }}>
                    {inv.invoiceDate ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={14} />
                        {new Date(inv.invoiceDate).toLocaleDateString("pt-BR")}
                      </span>
                    ) : (
                      <span className="text-muted" style={{ fontSize: "0.85rem" }}>Não lida</span>
                    )}
                  </td>
                  <td style={{ padding: "0.5rem", fontWeight: "bold" }}>{inv.description}</td>
                  <td style={{ padding: "0.5rem", color: "var(--text-muted)" }}>{inv.aiCategory}</td>
                  <td style={{ padding: "0.5rem", fontWeight: "bold", color: "#ef4444" }}>
                    R$ {inv.aiValue?.toFixed(2)}
                  </td>
                  <td style={{ padding: "0.5rem", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", alignItems: "center" }}>
                      <a 
                        href={inv.imageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-outline" 
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", borderRadius: "8px" }}
                      >
                        Ver Foto
                      </a>
                      {role === "ADMIN" && (
                        <button 
                          onClick={() => handleDelete(inv.id)}
                          className="btn" 
                          style={{ padding: "0.3rem 0.6rem", color: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", borderRadius: "8px" }}
                          title="Excluir Nota"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
