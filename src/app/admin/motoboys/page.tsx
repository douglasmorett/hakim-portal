"use client";
import { useState, useEffect } from "react";
import { Bike, Plus, Phone, DollarSign, MapPin, User, Trash2 } from "lucide-react";

type MotoboyLocal = {
  id: string;
  name: string;
  phone: string;
  paymentType: string;
  dailyRate: number;
  perDeliveryRate: number;
  active: boolean;
  deliveriesToday: number;
  earningsToday: number;
};

export default function MotoboysPage() {
  const [motoboys, setMotoboys] = useState<MotoboyLocal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", paymentType: "PER_DELIVERY", dailyRate: 0, perDeliveryRate: 5 });

  useEffect(() => {
    const saved = localStorage.getItem("firehub_motoboys");
    if (saved) {
      setMotoboys(JSON.parse(saved));
    } else {
      const demo: MotoboyLocal[] = [
        { id: "1", name: "Carlos Silva", phone: "(22) 99999-1111", paymentType: "PER_DELIVERY", dailyRate: 0, perDeliveryRate: 5, active: true, deliveriesToday: 8, earningsToday: 40 },
        { id: "2", name: "João Santos", phone: "(22) 99999-2222", paymentType: "DAILY_RATE", dailyRate: 80, perDeliveryRate: 0, active: true, deliveriesToday: 12, earningsToday: 80 },
        { id: "3", name: "Pedro Oliveira", phone: "(22) 99999-3333", paymentType: "PER_DELIVERY", dailyRate: 0, perDeliveryRate: 6, active: false, deliveriesToday: 0, earningsToday: 0 },
      ];
      setMotoboys(demo);
      localStorage.setItem("firehub_motoboys", JSON.stringify(demo));
    }
  }, []);

  const save = (updated: MotoboyLocal[]) => {
    setMotoboys(updated);
    localStorage.setItem("firehub_motoboys", JSON.stringify(updated));
  };

  const addMotoboy = () => {
    if (!form.name) return;
    const m: MotoboyLocal = {
      id: Date.now().toString(),
      ...form,
      active: true,
      deliveriesToday: 0,
      earningsToday: 0,
    };
    save([...motoboys, m]);
    setForm({ name: "", phone: "", paymentType: "PER_DELIVERY", dailyRate: 0, perDeliveryRate: 5 });
    setShowAdd(false);
  };

  const toggleActive = (id: string) => {
    save(motoboys.map(m => m.id === id ? { ...m, active: !m.active } : m));
  };

  const addDelivery = (id: string) => {
    save(motoboys.map(m => {
      if (m.id !== id) return m;
      const newDeliveries = m.deliveriesToday + 1;
      const earnings = m.paymentType === "PER_DELIVERY" ? newDeliveries * m.perDeliveryRate : m.dailyRate;
      return { ...m, deliveriesToday: newDeliveries, earningsToday: earnings };
    }));
  };

  const removeMotoboy = (id: string) => {
    save(motoboys.filter(m => m.id !== id));
  };

  const activeMotoboys = motoboys.filter(m => m.active);
  const totalDeliveries = motoboys.reduce((a, m) => a + m.deliveriesToday, 0);
  const totalEarnings = motoboys.reduce((a, m) => a + m.earningsToday, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <Bike size={28} /> Motoboys
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Gerencie sua equipe de entregas</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> Novo Motoboy
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <User size={24} style={{ color: "#3B82F6", marginBottom: 8 }} />
          <p style={{ fontSize: "1.8rem", fontWeight: 900 }}>{activeMotoboys.length}</p>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>Ativos agora</p>
        </div>
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <MapPin size={24} style={{ color: "#22C55E", marginBottom: 8 }} />
          <p style={{ fontSize: "1.8rem", fontWeight: 900 }}>{totalDeliveries}</p>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>Entregas hoje</p>
        </div>
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <DollarSign size={24} style={{ color: "#F59E0B", marginBottom: 8 }} />
          <p style={{ fontSize: "1.8rem", fontWeight: 900 }}>R$ {totalEarnings.toFixed(0)}</p>
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>Custo total hoje</p>
        </div>
      </div>

      {/* Modal adicionar */}
      {showAdd && (
        <div className="card" style={{ padding: 20, marginBottom: 20, border: "2px solid var(--primary)" }}>
          <h3 style={{ marginBottom: 16, fontSize: "1rem", fontWeight: 700 }}>Cadastrar Motoboy</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Nome *</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Telefone</label>
              <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(22) 99999-9999" style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Tipo de Pagamento</label>
              <select className="input" value={form.paymentType} onChange={e => setForm({ ...form, paymentType: e.target.value })} style={{ width: "100%" }}>
                <option value="PER_DELIVERY">Por entrega</option>
                <option value="DAILY_RATE">Diária fixa</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: ".78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                {form.paymentType === "PER_DELIVERY" ? "Valor por entrega (R$)" : "Diária (R$)"}
              </label>
              <input className="input" type="number" step="0.50"
                value={form.paymentType === "PER_DELIVERY" ? form.perDeliveryRate : form.dailyRate}
                onChange={e => setForm({ ...form, [form.paymentType === "PER_DELIVERY" ? "perDeliveryRate" : "dailyRate"]: +e.target.value })}
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={addMotoboy} className="btn btn-primary">Salvar</button>
            <button onClick={() => setShowAdd(false)} className="btn btn-outline">Cancelar</button>
          </div>
        </div>
      )}

      {/* Cards de motoboys */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {motoboys.map(m => (
          <div key={m.id} className="card" style={{ padding: 20, opacity: m.active ? 1 : 0.5, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: m.active ? "linear-gradient(135deg, #22C55E, #16A34A)" : "#9CA3AF",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "1.1rem"
                }}>
                  {m.name.charAt(0)}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "1rem" }}>{m.name}</p>
                  <p style={{ fontSize: ".78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Phone size={12} /> {m.phone || "Sem telefone"}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => toggleActive(m.id)} className="btn btn-sm" style={{ fontSize: ".7rem", padding: "4px 8px" }}>
                  {m.active ? "Pausar" : "Ativar"}
                </button>
                <button onClick={() => removeMotoboy(m.id)} className="btn btn-sm" style={{ padding: "4px 8px", color: "#EF4444" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={{ background: "var(--surface-hover)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                <p style={{ fontSize: "1.3rem", fontWeight: 900 }}>{m.deliveriesToday}</p>
                <p style={{ fontSize: ".7rem", color: "var(--text-muted)" }}>Entregas hoje</p>
              </div>
              <div style={{ background: "var(--surface-hover)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                <p style={{ fontSize: "1.3rem", fontWeight: 900, color: "#22C55E" }}>R$ {m.earningsToday}</p>
                <p style={{ fontSize: ".7rem", color: "var(--text-muted)" }}>
                  {m.paymentType === "PER_DELIVERY" ? `R$ ${m.perDeliveryRate}/entrega` : `Diária R$ ${m.dailyRate}`}
                </p>
              </div>
            </div>

            {m.active && (
              <button onClick={() => addDelivery(m.id)} className="btn btn-primary btn-sm" style={{ width: "100%" }}>
                + Registrar Entrega
              </button>
            )}
          </div>
        ))}
      </div>

      {motoboys.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <Bike size={48} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ color: "var(--text-muted)" }}>Nenhum motoboy cadastrado</p>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ marginTop: 12 }}>Cadastrar primeiro motoboy</button>
        </div>
      )}
    </div>
  );
}
