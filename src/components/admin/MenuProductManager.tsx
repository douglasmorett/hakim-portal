"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit3, X, Image as ImageIcon, Pause, Play, Package } from "lucide-react";

export default function MenuProductManager({ products, availableItems }: { products: any[]; availableItems: any[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"items" | "combos">("items");

  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Esfihas Salgadas");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);
  const [isCombo, setIsCombo] = useState(false);
  // Combo builder
  const [comboGroups, setComboGroups] = useState<{ title: string; maxQty: number; itemIds: string[] }[]>([]);

  const categories = ["Promoção do Dia", "Combos", "Esfihas Salgadas", "Esfihas Doces", "Acompanhamentos", "Bebidas", "Outros"];

  const resetForm = () => {
    setName(""); setDescription(""); setPrice(""); setCategory("Esfihas Salgadas");
    setImageUrl(""); setActive(true); setIsCombo(false); setComboGroups([]);
    setShowForm(false); setEditingId(null);
  };

  const openEdit = (p: any) => {
    setName(p.name); setDescription(p.description); setPrice(String(p.price));
    setCategory(p.category); setImageUrl(p.imageUrl || ""); setActive(p.active);
    setIsCombo(p.isCombo);
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
          comboGroups: isCombo ? comboGroups : undefined
        })
      });
      if (res.ok) { resetForm(); router.refresh(); } else alert("Erro ao salvar.");
    } catch { alert("Erro."); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    await fetch("/api/admin/menu-products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    router.refresh();
  };

  const handleToggle = async (id: string, cur: boolean) => {
    await fetch("/api/admin/menu-products", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active: !cur }) });
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
          <div key={p.id} className="card" style={{ padding: "0.75rem", opacity: p.active ? 1 : 0.5, border: !p.active ? "2px dashed #EF4444" : undefined }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "start" }}>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "8px" }} />
              ) : (
                <div style={{ width: "70px", height: "70px", backgroundColor: "var(--bg-color)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImageIcon size={20} color="var(--text-muted)" />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <h3 className="font-bold" style={{ fontSize: "0.9rem" }}>{p.name}</h3>
                    <p className="text-muted" style={{ fontSize: "0.7rem" }}>{p.category}{p.isCombo && " • COMBO"}</p>
                  </div>
                  <span className="font-extrabold gradient-text">R$ {p.price.toFixed(2)}</span>
                </div>
                {!p.active && <span style={{ fontSize: "0.7rem", color: "#EF4444", fontWeight: 700 }}>⏸️ PAUSADO</span>}
                {p.isCombo && p.comboGroups?.length > 0 && (
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {p.comboGroups.map((g: any) => `${g.title} (${g.items.length})`).join(" • ")}
                  </p>
                )}
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
                  <button onClick={() => openEdit(p)} className="btn btn-outline" style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}><Edit3 size={10} /> Editar</button>
                  <button onClick={() => handleToggle(p.id, p.active)} className="btn btn-outline" style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}>
                    {p.active ? <><Pause size={10} /> Pausar</> : <><Play size={10} /> Ativar</>}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="btn btn-outline" style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", color: "var(--danger)" }}><Trash2 size={10} /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
