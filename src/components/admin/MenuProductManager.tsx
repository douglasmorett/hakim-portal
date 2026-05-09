"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit3, X, Image as ImageIcon, Pause, Play, Package, Monitor, Truck, Tablet, UtensilsCrossed } from "lucide-react";

const CHANNELS = [
  { key: "activePDV",      label: "PDV",      icon: "🖥️",  color: "#3B82F6", desc: "Atendimento no balcão/caixa" },
  { key: "activeDelivery", label: "Delivery", icon: "🛵",  color: "#10B981", desc: "Pedidos online pelo site" },
  { key: "activeTotem",    label: "Totem",    icon: "📲",  color: "#8B5CF6", desc: "Autoatendimento no totem" },
  { key: "activeGarcom",   label: "Garçom",   icon: "🍽️", color: "#F59E0B", desc: "Cardápio do garçom/mesa" },
];

function ChannelBadges({ product, onToggle }: { product: any; onToggle: (key: string, val: boolean) => void }) {
  return (
    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "6px" }}>
      {CHANNELS.map(ch => {
        const active = product[ch.key] ?? false;
        return (
          <button key={ch.key} onClick={() => onToggle(ch.key, !active)} title={ch.desc}
            style={{
              padding: "2px 8px", borderRadius: "20px", fontSize: "0.68rem", fontWeight: 700,
              border: `1.5px solid ${active ? ch.color : "#E2E8F0"}`,
              background: active ? ch.color + "18" : "#F8FAFC",
              color: active ? ch.color : "#94A3B8",
              cursor: "pointer", transition: "all 0.15s",
            }}>
            {ch.icon} {ch.label}
          </button>
        );
      })}
    </div>
  );
}

export default function MenuProductManager({ products, availableItems }: { products: any[]; availableItems: any[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"items" | "combos">("items");

  // Modal de confirmação customizado
  const [confirmModal, setConfirmModal] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [softDeletedName, setSoftDeletedName] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Esfihas Salgadas");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);
  const [isCombo, setIsCombo] = useState(false);
  const [activePDV, setActivePDV] = useState(true);
  const [activeDelivery, setActiveDelivery] = useState(true);
  const [activeTotem, setActiveTotem] = useState(false);
  const [activeGarcom, setActiveGarcom] = useState(false);
  const [comboGroups, setComboGroups] = useState<{ title: string; maxQty: number; itemIds: string[] }[]>([]);

  const categories = ["Promoção do Dia", "Combos", "Esfihas Salgadas", "Esfihas Doces", "Acompanhamentos", "Bebidas", "Outros"];

  const resetForm = () => {
    setName(""); setDescription(""); setPrice(""); setCategory("Esfihas Salgadas");
    setImageUrl(""); setActive(true); setIsCombo(false); setComboGroups([]);
    setActivePDV(true); setActiveDelivery(true); setActiveTotem(false); setActiveGarcom(false);
    setShowForm(false); setEditingId(null);
  };

  const openEdit = (p: any) => {
    setName(p.name); setDescription(p.description); setPrice(String(p.price));
    setCategory(p.category); setImageUrl(p.imageUrl || ""); setActive(p.active);
    setIsCombo(p.isCombo);
    setActivePDV(p.activePDV ?? true);
    setActiveDelivery(p.activeDelivery ?? true);
    setActiveTotem(p.activeTotem ?? false);
    setActiveGarcom(p.activeGarcom ?? false);
    if (p.isCombo && p.comboGroups) {
      setComboGroups(p.comboGroups.map((g: any) => ({
        title: g.title, maxQty: g.maxQty,
        itemIds: g.items.map((i: any) => i.menuProduct.id)
      })));
    } else { setComboGroups([]); }
    setEditingId(p.id); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name || !description || !price) { alert("Preencha nome, descrição e preço."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menu-products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId, name, description, price: parseFloat(price), category,
          imageUrl: imageUrl || null, active, isCombo,
          activePDV, activeDelivery, activeTotem, activeGarcom,
          comboGroups: isCombo ? comboGroups : undefined
        })
      });
      if (res.ok) { resetForm(); router.refresh(); } else alert("Erro ao salvar.");
    } catch { alert("Erro."); }
    finally { setLoading(false); }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmModal({ id, name });
  };

  const confirmDelete = async () => {
    if (!confirmModal) return;
    setDeleting(true);
    const res = await fetch("/api/admin/menu-products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: confirmModal.id, name: confirmModal.name })
    });
    const data = await res.json();
    setDeleting(false);
    setConfirmModal(null);
    if (data.softDeleted) {
      // Mostrar aviso suave (não precisa de alert nativo)
      setSoftDeletedName(confirmModal.name);
      setTimeout(() => setSoftDeletedName(null), 4000);
    }
    router.refresh();
  };

  const handleToggle = async (id: string, cur: boolean) => {
    await fetch("/api/admin/menu-products", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active: !cur }) });
    router.refresh();
  };

  // Toggle de canal diretamente na lista (sem abrir form)
  const handleChannelToggle = async (id: string, channelKey: string, val: boolean) => {
    await fetch("/api/admin/menu-products", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [channelKey]: val })
    });
    router.refresh();
  };

  const addGroup = () => setComboGroups(prev => [...prev, { title: "", maxQty: 1, itemIds: [] }]);
  const removeGroup = (idx: number) => setComboGroups(prev => prev.filter((_, i) => i !== idx));
  const updateGroup = (idx: number, key: string, val: any) => {
    setComboGroups(prev => prev.map((g, i) => i === idx ? { ...g, [key]: val } : g));
  };
  const toggleGroupItem = (gIdx: number, itemId: string) => {
    setComboGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g;
      const has = g.itemIds.includes(itemId);
      return { ...g, itemIds: has ? g.itemIds.filter(id => id !== itemId) : [...g.itemIds, itemId] };
    }));
  };

  const itemProducts = products.filter(p => !p.isCombo);
  const comboProducts = products.filter(p => p.isCombo);

  return (
    <div>
      {/* ===== MODAL DE CONFIRMAÇÃO CUSTOMIZADO ===== */}
      {confirmModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--surface, #1E293B)", borderRadius: "16px",
            padding: "2rem", maxWidth: "400px", width: "90%",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
            animation: "fadeInUp 0.18s ease",
          }}>
            {/* Ícone */}
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(239,68,68,0.15)", border: "2px solid #EF4444",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem",
              }}>🗑️</div>
            </div>
            <h3 style={{ textAlign: "center", fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.4rem", color: "var(--text, #F1F5F9)" }}>
              Excluir produto?
            </h3>
            <p style={{ textAlign: "center", color: "var(--text-muted, #94A3B8)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              "<strong style={{ color: "var(--text, #F1F5F9)" }}>{confirmModal.name}</strong>" será removido do cardápio.<br />
              <span style={{ fontSize: "0.78rem", opacity: 0.7 }}>Esta ação não pode ser desfeita.</span>
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  flex: 1, padding: "0.65rem", borderRadius: "10px", fontWeight: 700,
                  border: "1.5px solid rgba(255,255,255,0.12)",
                  background: "transparent", color: "var(--text-muted, #94A3B8)",
                  cursor: "pointer", fontSize: "0.9rem", transition: "all 0.15s",
                }}>
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: "0.65rem", borderRadius: "10px", fontWeight: 800,
                  border: "none", background: deleting ? "#7F1D1D" : "#EF4444",
                  color: "#fff", cursor: deleting ? "not-allowed" : "pointer",
                  fontSize: "0.9rem", transition: "all 0.15s",
                }}>
                {deleting ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST soft-delete */}
      {softDeletedName && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9998,
          background: "#F59E0B", color: "#000", fontWeight: 700,
          padding: "0.75rem 1.25rem", borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)", fontSize: "0.85rem",
          animation: "fadeInUp 0.2s ease",
        }}>
          ⚠️ "{softDeletedName}" tem pedidos vinculados e foi <u>desativado</u> em vez de excluído.
        </div>
      )}

      {/* TABS */}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button onClick={() => setTab("items")} className={`btn ${tab === "items" ? "btn-primary" : "btn-outline"}`}>Itens Avulsos ({itemProducts.length})</button>
        <button onClick={() => setTab("combos")} className={`btn ${tab === "combos" ? "btn-primary" : "btn-outline"}`}><Package size={16} style={{ marginRight: "4px" }} /> Combos ({comboProducts.length})</button>
      </div>

      <button onClick={() => { resetForm(); setIsCombo(tab === "combos"); setCategory(tab === "combos" ? "Combos" : "Esfihas Salgadas"); setShowForm(true); }} className="btn btn-primary mb-4">
        <Plus size={18} style={{ marginRight: "4px" }} /> {tab === "combos" ? "Novo Combo" : "Novo Produto"}
      </button>

      {/* FORM */}
      {showForm && (
        <div className="card mb-6">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 className="font-bold">{editingId ? "Editar" : "Novo"} {isCombo ? "Combo" : "Produto"}</h3>
            <button onClick={resetForm} style={{ cursor: "pointer" }}><X size={20} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="input-group"><label>Nome</label><input className="input-field" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="input-group"><label>Preço (R$)</label><input className="input-field" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></div>
            <div className="input-group" style={{ gridColumn: "span 2" }}><label>Descrição</label><textarea className="input-field" rows={2} value={description} onChange={e => setDescription(e.target.value)} style={{ resize: "vertical" }} /></div>
            <div className="input-group"><label>Categoria</label><select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="input-group"><label>URL da Imagem</label><input className="input-field" value={imageUrl} onChange={e => setImageUrl(e.target.value)} /></div>
          </div>

          {/* CANAIS DE VENDA */}
          <div style={{ marginTop: "1rem", padding: "0.875rem 1rem", background: "#F8FAFC", borderRadius: "10px", border: "1.5px solid #E2E8F0" }}>
            <p style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.6rem" }}>📡 Canais de Venda</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {CHANNELS.map(ch => {
                const stateMap: Record<string, [boolean, (v: boolean) => void]> = {
                  activePDV: [activePDV, setActivePDV],
                  activeDelivery: [activeDelivery, setActiveDelivery],
                  activeTotem: [activeTotem, setActiveTotem],
                  activeGarcom: [activeGarcom, setActiveGarcom],
                };
                const [val, setter] = stateMap[ch.key];
                return (
                  <label key={ch.key} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", border: `1.5px solid ${val ? ch.color : "#E2E8F0"}`, background: val ? ch.color + "10" : "#fff", cursor: "pointer" }}>
                    <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} style={{ accentColor: ch.color }} />
                    <span style={{ fontSize: "0.85rem" }}>{ch.icon}</span>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "0.82rem", color: val ? ch.color : "#64748B" }}>{ch.label}</p>
                      <p style={{ fontSize: "0.68rem", color: "#94A3B8" }}>{ch.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* COMBO BUILDER */}
          {isCombo && (
            <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-md)", border: "2px dashed var(--primary)" }}>
              <h4 className="font-bold" style={{ marginBottom: "0.75rem" }}>📦 Construtor de Combo</h4>
              {comboGroups.map((group, gIdx) => (
                <div key={gIdx} style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "var(--surface)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "end" }}>
                    <div style={{ flex: 1 }}><label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Título do Grupo</label><input className="input-field" value={group.title} onChange={e => updateGroup(gIdx, "title", e.target.value)} placeholder="Ex: Escolha suas esfirras" /></div>
                    <div style={{ width: "80px" }}><label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Qtd</label><input className="input-field" type="number" min={1} value={group.maxQty} onChange={e => updateGroup(gIdx, "maxQty", parseInt(e.target.value) || 1)} /></div>
                    <button onClick={() => removeGroup(gIdx)} style={{ cursor: "pointer", color: "var(--danger)", padding: "0.5rem" }}><Trash2 size={16} /></button>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Selecione os itens disponíveis ({group.itemIds.length} selecionados):</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {availableItems.map(item => (
                      <button key={item.id} onClick={() => toggleGroupItem(gIdx, item.id)}
                        style={{
                          padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.7rem", cursor: "pointer",
                          border: group.itemIds.includes(item.id) ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                          backgroundColor: group.itemIds.includes(item.id) ? "var(--primary-light)" : "var(--surface)",
                          fontWeight: group.itemIds.includes(item.id) ? 700 : 400,
                          opacity: item.active ? 1 : 0.4
                        }}>{item.name} {!item.active && "⏸️"}</button>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={addGroup} className="btn btn-outline" style={{ width: "100%", fontSize: "0.85rem" }}>
                <Plus size={14} style={{ marginRight: "4px" }} /> Adicionar Grupo de Seleção
              </button>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary mt-4" style={{ width: "100%" }}>
            {loading ? "Salvando..." : (editingId ? "Salvar Alterações" : "Cadastrar")}
          </button>
        </div>
      )}

      {/* PRODUCT LIST */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.75rem" }}>
        {(tab === "items" ? itemProducts : comboProducts).map(p => (
          <div key={p.id} className="card" style={{ padding: "0.75rem", opacity: p.active ? 1 : 0.55, border: !p.active ? "2px dashed #EF4444" : undefined }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "start" }}>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />
              ) : (
                <div style={{ width: "70px", height: "70px", backgroundColor: "var(--bg-color)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ImageIcon size={20} color="var(--text-muted)" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <h3 className="font-bold" style={{ fontSize: "0.9rem" }}>{p.name}</h3>
                    <p className="text-muted" style={{ fontSize: "0.7rem" }}>{p.category}{p.isCombo && " • COMBO"}</p>
                  </div>
                  <span className="font-extrabold gradient-text">R$ {p.price.toFixed(2)}</span>
                </div>
                {!p.active && <span style={{ fontSize: "0.7rem", color: "#EF4444", fontWeight: 700 }}>⏸️ PAUSADO</span>}

                {/* Badges de canais inline — clicáveis */}
                <ChannelBadges product={p} onToggle={(key, val) => handleChannelToggle(p.id, key, val)} />

                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
                  <button onClick={() => openEdit(p)} className="btn btn-outline" style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}><Edit3 size={10} /> Editar</button>
                  <button onClick={() => handleToggle(p.id, p.active)} className="btn btn-outline" style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}>
                    {p.active ? <><Pause size={10} /> Pausar</> : <><Play size={10} /> Ativar</>}
                  </button>
                  <button onClick={() => handleDelete(p.id, p.name)} className="btn btn-outline" style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", color: "var(--danger)" }}><Trash2 size={10} /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
