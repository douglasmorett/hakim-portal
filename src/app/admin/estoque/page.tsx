"use client";
import { useState, useEffect } from "react";
import { Warehouse, Plus, Minus, Search, Package, AlertTriangle, TrendingDown, RefreshCw } from "lucide-react";

type StockItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  cost: number;
  lastUpdate: string;
};

const CATEGORIES = ["Todos", "Carnes", "Bebidas", "Embalagens", "Temperos", "Frios", "Hortifruti", "Outros"];
const UNITS = ["un", "kg", "g", "L", "ml", "cx", "pct"];

export default function EstoquePage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "Outros", quantity: 0, unit: "un", minStock: 5, cost: 0 });

  // Carregar do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("firehub_stock");
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      // Dados de exemplo
      const demo: StockItem[] = [
        { id: "1", name: "Carne Bovina (Patinho)", category: "Carnes", quantity: 15, unit: "kg", minStock: 5, cost: 32.90, lastUpdate: new Date().toISOString() },
        { id: "2", name: "Frango Peito", category: "Carnes", quantity: 8, unit: "kg", minStock: 3, cost: 18.50, lastUpdate: new Date().toISOString() },
        { id: "3", name: "Coca-Cola 2L", category: "Bebidas", quantity: 24, unit: "un", minStock: 12, cost: 7.50, lastUpdate: new Date().toISOString() },
        { id: "4", name: "Embalagem Isopor G", category: "Embalagens", quantity: 3, unit: "cx", minStock: 5, cost: 45.00, lastUpdate: new Date().toISOString() },
        { id: "5", name: "Queijo Mussarela", category: "Frios", quantity: 4, unit: "kg", minStock: 3, cost: 42.00, lastUpdate: new Date().toISOString() },
        { id: "6", name: "Tomate", category: "Hortifruti", quantity: 2, unit: "kg", minStock: 5, cost: 8.90, lastUpdate: new Date().toISOString() },
        { id: "7", name: "Óleo de Soja 900ml", category: "Outros", quantity: 6, unit: "un", minStock: 3, cost: 9.50, lastUpdate: new Date().toISOString() },
      ];
      setItems(demo);
      localStorage.setItem("firehub_stock", JSON.stringify(demo));
    }
  }, []);

  const save = (updated: StockItem[]) => {
    setItems(updated);
    localStorage.setItem("firehub_stock", JSON.stringify(updated));
  };

  const adjustQty = (id: string, delta: number) => {
    const updated = items.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta), lastUpdate: new Date().toISOString() } : i);
    save(updated);
  };

  const addItem = () => {
    if (!newItem.name) return;
    const item: StockItem = {
      id: Date.now().toString(),
      ...newItem,
      lastUpdate: new Date().toISOString(),
    };
    save([...items, item]);
    setNewItem({ name: "", category: "Outros", quantity: 0, unit: "un", minStock: 5, cost: 0 });
    setShowAdd(false);
  };

  const removeItem = (id: string) => {
    save(items.filter(i => i.id !== id));
  };

  const filtered = items.filter(i => {
    if (filter !== "Todos" && i.category !== filter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const lowStock = items.filter(i => i.quantity <= i.minStock);
  const totalValue = items.reduce((acc, i) => acc + i.quantity * i.cost, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <Warehouse size={28} /> Estoque
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Controle automático de insumos e produtos</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> Novo Item
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <Package size={24} style={{ color: "#3B82F6", marginBottom: 8 }} />
          <p style={{ fontSize: "1.8rem", fontWeight: 900 }}>{items.length}</p>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>Itens cadastrados</p>
        </div>
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <AlertTriangle size={24} style={{ color: lowStock.length > 0 ? "#EF4444" : "#22C55E", marginBottom: 8 }} />
          <p style={{ fontSize: "1.8rem", fontWeight: 900, color: lowStock.length > 0 ? "#EF4444" : "#22C55E" }}>{lowStock.length}</p>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>Estoque baixo</p>
        </div>
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <TrendingDown size={24} style={{ color: "#F59E0B", marginBottom: 8 }} />
          <p style={{ fontSize: "1.8rem", fontWeight: 900 }}>R$ {totalValue.toFixed(2).replace(".", ",")}</p>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>Valor em estoque</p>
        </div>
      </div>

      {/* Alertas de estoque baixo */}
      {lowStock.length > 0 && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <p style={{ fontWeight: 700, color: "#DC2626", fontSize: ".9rem", marginBottom: 6 }}>⚠️ Itens com estoque baixo:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {lowStock.map(i => (
              <span key={i.id} style={{ background: "#FEE2E2", padding: "4px 10px", borderRadius: 20, fontSize: ".78rem", fontWeight: 600, color: "#DC2626" }}>
                {i.name}: {i.quantity} {i.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Modal adicionar */}
      {showAdd && (
        <div className="card" style={{ padding: 20, marginBottom: 20, border: "2px solid var(--primary)" }}>
          <h3 style={{ marginBottom: 16, fontSize: "1rem", fontWeight: 700 }}>Adicionar Item ao Estoque</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Nome *</label>
              <input className="input" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Ex: Carne Bovina" style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Categoria</label>
              <select className="input" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} style={{ width: "100%" }}>
                {CATEGORIES.filter(c => c !== "Todos").map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Quantidade</label>
              <input className="input" type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: +e.target.value })} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Unidade</label>
              <select className="input" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} style={{ width: "100%" }}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Estoque Mínimo</label>
              <input className="input" type="number" value={newItem.minStock} onChange={e => setNewItem({ ...newItem, minStock: +e.target.value })} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Custo unitário (R$)</label>
              <input className="input" type="number" step="0.01" value={newItem.cost} onChange={e => setNewItem({ ...newItem, cost: +e.target.value })} style={{ width: "100%" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={addItem} className="btn btn-primary">Salvar</button>
            <button onClick={() => setShowAdd(false)} className="btn btn-outline">Cancelar</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input className="input" placeholder="Buscar item..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", paddingLeft: 36 }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilter(c)} className={`btn btn-sm ${filter === c ? "btn-primary" : "btn-outline"}`} style={{ fontSize: ".75rem", padding: "6px 12px" }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="card" style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: ".78rem", fontWeight: 700 }}>Item</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: ".78rem", fontWeight: 700 }}>Categoria</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: ".78rem", fontWeight: 700 }}>Qtd</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: ".78rem", fontWeight: 700 }}>Custo/un</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: ".78rem", fontWeight: 700 }}>Total</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: ".78rem", fontWeight: 700 }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: ".78rem", fontWeight: 700 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <span style={{ background: "var(--surface-hover)", padding: "3px 10px", borderRadius: 20, fontSize: ".75rem" }}>{item.category}</span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <button onClick={() => adjustQty(item.id, -1)} className="btn btn-sm" style={{ padding: "4px 8px", minWidth: "auto" }}><Minus size={14} /></button>
                    <span style={{ fontWeight: 800, fontSize: "1rem", minWidth: 40 }}>{item.quantity}</span>
                    <button onClick={() => adjustQty(item.id, 1)} className="btn btn-sm" style={{ padding: "4px 8px", minWidth: "auto" }}><Plus size={14} /></button>
                    <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>{item.unit}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center", fontSize: ".85rem" }}>R$ {item.cost.toFixed(2).replace(".", ",")}</td>
                <td style={{ padding: "12px 16px", textAlign: "center", fontSize: ".85rem", fontWeight: 700 }}>R$ {(item.quantity * item.cost).toFixed(2).replace(".", ",")}</td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  {item.quantity <= item.minStock ? (
                    <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "3px 10px", borderRadius: 20, fontSize: ".75rem", fontWeight: 600 }}>⚠️ Baixo</span>
                  ) : (
                    <span style={{ background: "#DCFCE7", color: "#16A34A", padding: "3px 10px", borderRadius: 20, fontSize: ".75rem", fontWeight: 600 }}>✅ OK</span>
                  )}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <button onClick={() => removeItem(item.id)} className="btn btn-sm" style={{ color: "#EF4444", fontSize: ".75rem" }}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Nenhum item encontrado</p>
        )}
      </div>
    </div>
  );
}
