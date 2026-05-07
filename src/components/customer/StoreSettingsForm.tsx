"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Copy, ExternalLink, Upload, Trash2, Plus, Tag, CreditCard, Banknote, Smartphone, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Ticket } from "lucide-react";

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const defaultHours = () => DAYS.map(d => ({ day: d, open: "10:00", close: "22:00", active: true }));

type Coupon = { id?: string; code: string; discount: number; active: boolean };

export default function StoreSettingsForm({ user }: { user: any }) {
  const router = useRouter();
  const [storeName, setStoreName] = useState(user.storeName || "");
  const [storePhone, setStorePhone] = useState(user.storePhone || "");
  const [storeAddress, setStoreAddress] = useState(user.storeAddress || "");
  const [storeBanner, setStoreBanner] = useState(user.storeBanner || "");
  const [storeLogo, setStoreLogo] = useState(user.storeLogo || "");
  const [storeDeliveryOnly, setStoreDeliveryOnly] = useState(user.storeDeliveryOnly || false);
  const [storeHours, setStoreHours] = useState<any[]>(user.storeHours || defaultHours());
  const [coupons, setCoupons] = useState<Coupon[]>(user.storeCoupons || []);
  const defaultPaymentConfig = {
    PIX: { rate: 0, active: true },
    DINHEIRO: { rate: 0, active: true },
    DEBITO: { rate: 0, active: true, brands: [
      { name: "Mastercard", rate: 1.5, active: true },
      { name: "Visa", rate: 1.5, active: true },
      { name: "Elo", rate: 2.0, active: true },
    ] },
    CREDITO: { rate: 0, active: true, brands: [
      { name: "Mastercard", rate: 3.0, active: true },
      { name: "Visa", rate: 3.0, active: true },
      { name: "Elo", rate: 3.5, active: true },
    ] },
    VOUCHER: { rate: 0, active: true, brands: [
      { name: "Ticket", rate: 5.0, active: true },
      { name: "VR", rate: 5.0, active: true },
      { name: "Sodexo", rate: 5.0, active: true },
      { name: "Pluxee", rate: 4.5, active: true },
    ] },
  };
  const [paymentConfig, setPaymentConfig] = useState<any>(() => {
    const saved = user.paymentFees;
    if (saved && saved.PIX && typeof saved.PIX === 'object') return { ...defaultPaymentConfig, ...saved };
    // Migrar formato antigo
    if (saved && typeof saved.PIX === 'number') {
      return { ...defaultPaymentConfig, PIX: { ...defaultPaymentConfig.PIX, rate: saved.PIX }, DINHEIRO: { ...defaultPaymentConfig.DINHEIRO, rate: saved.DINHEIRO || 0 }, DEBITO: { ...defaultPaymentConfig.DEBITO, rate: saved.DEBITO || 0 }, CREDITO: { ...defaultPaymentConfig.CREDITO, rate: saved.CREDITO || 0 } };
    }
    return defaultPaymentConfig;
  });
  const [expandedPM, setExpandedPM] = useState<string | null>(null);
  const [newBrandName, setNewBrandName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const storeUrl = `https://hakim-portal.vercel.app/loja/${user.slug}`;
  // Delivery zones
  const [deliveryZoneType, setDeliveryZoneType] = useState<string>(user.deliveryZoneType || "");
  const [deliveryZones, setDeliveryZones] = useState<any[]>(user.deliveryZones || []);
  const [newNeighborhood, setNewNeighborhood] = useState("");
  const [newNeighborhoodFee, setNewNeighborhoodFee] = useState("");

  const updateHour = (idx: number, key: string, val: any) => {
    setStoreHours(prev => prev.map((h, i) => i === idx ? { ...h, [key]: val } : h));
  };

  const handleUpload = async (file: File, type: "logo" | "banner") => {
    const setter = type === "logo" ? setStoreLogo : setStoreBanner;
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingBanner;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch("/api/upload-store-image", { method: "POST", body: formData });
      if (res.ok) {
        const d = await res.json();
        setter(d.url);
        // Auto-save to database
        const saveKey = type === "logo" ? "storeLogo" : "storeBanner";
        await fetch("/api/store-settings", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [saveKey]: d.url })
        });
      } else { alert("Erro no upload."); }
    } catch { alert("Erro no upload."); } finally { setUploading(false); }
  };

  const addCoupon = () => setCoupons(prev => [...prev, { code: "", discount: 5, active: true }]);
  const updateCoupon = (idx: number, key: string, val: any) => setCoupons(prev => prev.map((c, i) => i === idx ? { ...c, [key]: val } : c));
  const removeCoupon = (idx: number) => setCoupons(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/store-settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, storePhone, storeAddress, storeBanner, storeLogo, storeHours, storeDeliveryOnly, storeCoupons: coupons, paymentFees: paymentConfig, deliveryZoneType: deliveryZoneType || null, deliveryZones: deliveryZones.length > 0 ? deliveryZones : null })
      });
      if (res.ok) { alert("Configurações salvas!"); router.refresh(); } else alert("Erro ao salvar.");
    } catch { alert("Erro ao salvar."); } finally { setLoading(false); }
  };

  const UploadBox = ({ label, value, type, uploading }: { label: string; value: string; type: "logo" | "banner"; uploading: boolean }) => (
    <div style={{ flex: type === "banner" ? 2 : 1 }}>
      <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: "6px" }}>{label}</label>
      {value ? (
        <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", border: "1.5px solid #E2E8F0" }}>
          <img src={value} alt={label} style={{ width: "100%", height: type === "logo" ? "100px" : "120px", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", top: "6px", right: "6px", display: "flex", gap: "4px" }}>
            <label style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
              <Upload size={14} />
              <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], type)} />
            </label>
            <button onClick={() => type === "logo" ? setStoreLogo("") : setStoreBanner("")} style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
              <Trash2 size={14} color="#EF4444" />
            </button>
          </div>
        </div>
      ) : (
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: type === "logo" ? "100px" : "120px", borderRadius: "12px", border: "2px dashed #CBD5E1", cursor: "pointer", background: "#F8FAFC", transition: "border-color 0.2s" }}>
          <Upload size={24} color="#94A3B8" />
          <span style={{ fontSize: "0.8rem", color: "#94A3B8", marginTop: "6px" }}>{uploading ? "Enviando..." : `Upload ${label}`}</span>
          <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], type)} />
        </label>
      )}
      <input className="input-field" placeholder="Ou cole a URL da imagem..." value={value} onChange={e => type === "logo" ? setStoreLogo(e.target.value) : setStoreBanner(e.target.value)} style={{ marginTop: "6px", fontSize: "0.8rem" }} />
    </div>
  );

  return (
    <div style={{ maxWidth: "700px" }}>
      {/* LINK DA LOJA */}
      <div className="card mb-4" style={{ background: "linear-gradient(135deg, #FFF4E5, #FEF3C7)", border: "1.5px solid #F59E0B" }}>
        <p className="font-bold" style={{ marginBottom: "0.5rem" }}>🔗 Link da sua Loja</p>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <code style={{ flex: 1, padding: "0.5rem", backgroundColor: "white", borderRadius: "8px", fontSize: "0.8rem", wordBreak: "break-all" }}>{storeUrl}</code>
          <button onClick={() => { navigator.clipboard.writeText(storeUrl); alert("Copiado!"); }} className="btn btn-outline" style={{ padding: "0.5rem" }}><Copy size={16} /></button>
          <a href={storeUrl} target="_blank" className="btn btn-primary" style={{ padding: "0.5rem" }}><ExternalLink size={16} /></a>
        </div>
      </div>

      {/* IMAGENS */}
      <div className="card mb-4">
        <h3 className="font-bold mb-4">🖼️ Imagens da Loja</h3>
        <div style={{ display: "flex", gap: "1rem" }}>
          <UploadBox label="Logo" value={storeLogo} type="logo" uploading={uploadingLogo} />
          <UploadBox label="Banner / Capa" value={storeBanner} type="banner" uploading={uploadingBanner} />
        </div>
      </div>

      {/* INFO */}
      <div className="card mb-4">
        <h3 className="font-bold mb-4">📋 Informações da Loja</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div className="input-group"><label>Nome da Loja</label><input className="input-field" value={storeName} onChange={e => setStoreName(e.target.value)} /></div>
          <div className="input-group"><label>Telefone / WhatsApp</label><input className="input-field" value={storePhone} onChange={e => setStorePhone(e.target.value)} /></div>
          <div className="input-group" style={{ gridColumn: "span 2" }}><label>Endereço</label><input className="input-field" value={storeAddress} onChange={e => setStoreAddress(e.target.value)} /></div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "0.75rem", cursor: "pointer" }}>
          <input type="checkbox" checked={storeDeliveryOnly} onChange={e => setStoreDeliveryOnly(e.target.checked)} />
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>🛵 Somente Delivery</span>
        </label>
      </div>

      {/* HORÁRIOS */}
      <div className="card mb-4">
        <h3 className="font-bold mb-4">⏰ Horário de Funcionamento</h3>
        <p style={{ fontSize: "0.78rem", color: "#64748B", marginBottom: "0.75rem" }}>Configure múltiplos turnos por dia (ex: Almoço e Jantar)</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {storeHours.map((h: any, idx: number) => (
            <div key={idx} style={{ padding: "0.6rem 0.75rem", backgroundColor: h.active ? "#F0FDF4" : "#FEF2F2", borderRadius: "10px", border: `1px solid ${h.active ? "#BBF7D0" : "#FECACA"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: h.active && h.shifts?.length > 0 ? "0.5rem" : 0 }}>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", minWidth: "90px" }}>
                  <input type="checkbox" checked={h.active} onChange={e => {
                    const updated = [...storeHours];
                    updated[idx] = { ...h, active: e.target.checked, shifts: h.shifts?.length ? h.shifts : [{ open: "10:00", close: "22:00" }] };
                    setStoreHours(updated);
                  }} />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{h.day}</span>
                </label>
                {!h.active && <span style={{ fontSize: "0.8rem", color: "#EF4444", fontWeight: 600 }}>Fechado</span>}
                {h.active && (
                  <button onClick={() => {
                    const updated = [...storeHours];
                    const shifts = [...(h.shifts || [{ open: h.open || "10:00", close: h.close || "22:00" }])];
                    shifts.push({ open: "18:00", close: "23:00" });
                    updated[idx] = { ...h, shifts };
                    setStoreHours(updated);
                  }} style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: "6px", border: "1px solid #BBF7D0", background: "#fff", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, color: "#16A34A" }}>
                    + Turno
                  </button>
                )}
              </div>
              {h.active && (h.shifts || [{ open: h.open || "10:00", close: h.close || "22:00" }]).map((shift: any, sIdx: number) => (
                <div key={sIdx} style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "4px", paddingLeft: "1.5rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748B", minWidth: "50px" }}>Turno {sIdx + 1}</span>
                  <input type="time" value={shift.open} onChange={e => {
                    const updated = [...storeHours];
                    const shifts = [...(h.shifts || [{ open: h.open, close: h.close }])];
                    shifts[sIdx] = { ...shifts[sIdx], open: e.target.value };
                    updated[idx] = { ...h, shifts, open: shifts[0]?.open, close: shifts[shifts.length - 1]?.close };
                    setStoreHours(updated);
                  }} style={{ padding: "0.3rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.85rem" }} />
                  <span style={{ fontSize: "0.8rem" }}>às</span>
                  <input type="time" value={shift.close} onChange={e => {
                    const updated = [...storeHours];
                    const shifts = [...(h.shifts || [{ open: h.open, close: h.close }])];
                    shifts[sIdx] = { ...shifts[sIdx], close: e.target.value };
                    updated[idx] = { ...h, shifts, open: shifts[0]?.open, close: shifts[shifts.length - 1]?.close };
                    setStoreHours(updated);
                  }} style={{ padding: "0.3rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.85rem" }} />
                  {(h.shifts?.length || 1) > 1 && (
                    <button onClick={() => {
                      const updated = [...storeHours];
                      const shifts = [...(h.shifts || [])].filter((_, i) => i !== sIdx);
                      updated[idx] = { ...h, shifts };
                      setStoreHours(updated);
                    }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "#EF4444" }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* CUPONS */}
      <div className="card mb-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 className="font-bold" style={{ margin: 0 }}>🏷️ Cupons de Desconto</h3>
          <button onClick={addCoupon} className="btn btn-outline" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}><Plus size={14} /> Novo Cupom</button>
        </div>
        {coupons.length === 0 ? (
          <p style={{ color: "#94A3B8", fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>Nenhum cupom cadastrado.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {coupons.map((c, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", backgroundColor: c.active ? "#F0FDF4" : "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                <Tag size={16} color={c.active ? "#16A34A" : "#94A3B8"} />
                <input placeholder="CÓDIGO" value={c.code} onChange={e => updateCoupon(idx, "code", e.target.value.toUpperCase())} style={{ flex: 1, padding: "0.4rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }} />
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748B" }}>R$</span>
                  <input type="number" value={c.discount} onChange={e => updateCoupon(idx, "discount", Number(e.target.value))} style={{ width: "70px", padding: "0.4rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.85rem" }} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "3px", cursor: "pointer" }}>
                  <input type="checkbox" checked={c.active} onChange={e => updateCoupon(idx, "active", e.target.checked)} />
                  <span style={{ fontSize: "0.75rem" }}>Ativo</span>
                </label>
                <button onClick={() => removeCoupon(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}><Trash2 size={16} color="#EF4444" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TAXAS DE PAGAMENTO */}
      <div className="card mb-4">
        <h3 className="font-bold mb-4">💳 Formas de Pagamento & Taxas</h3>
        <p style={{ fontSize: "0.78rem", color: "#64748B", marginBottom: "1rem" }}>Configure quais formas você aceita e a taxa de cada uma. Usado para calcular seu lucro líquido.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>

          {/* PIX */}
          {(() => {
            const cfg = paymentConfig.PIX || { rate: 0, active: true };
            return (
              <div style={{ borderRadius: "12px", border: `1.5px solid ${cfg.active ? '#00BFA530' : '#E2E8F020'}`, background: cfg.active ? '#00BFA505' : '#F8FAFC', overflow: 'hidden' }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.7rem 0.85rem" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#00BFA515", display: "flex", alignItems: "center", justifyContent: "center" }}><Smartphone size={17} color="#00BFA5" /></div>
                  <span style={{ fontWeight: 600, fontSize: "0.92rem", flex: 1 }}>Pix</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input type="number" step="0.1" min="0" max="100" value={cfg.rate} onChange={e => setPaymentConfig((p: any) => ({ ...p, PIX: { ...p.PIX, rate: Number(e.target.value) } }))} style={{ width: "68px", padding: "0.35rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.85rem", textAlign: "right" }} />
                    <span style={{ fontSize: "0.82rem", color: "#64748B", fontWeight: 600 }}>%</span>
                  </div>
                  <button onClick={() => setPaymentConfig((p: any) => ({ ...p, PIX: { ...p.PIX, active: !p.PIX.active } }))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    {cfg.active ? <ToggleRight size={28} color="#00BFA5" /> : <ToggleLeft size={28} color="#CBD5E1" />}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* DINHEIRO */}
          {(() => {
            const cfg = paymentConfig.DINHEIRO || { rate: 0, active: true };
            return (
              <div style={{ borderRadius: "12px", border: `1.5px solid ${cfg.active ? '#4CAF5030' : '#E2E8F020'}`, background: cfg.active ? '#4CAF5005' : '#F8FAFC', overflow: 'hidden' }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.7rem 0.85rem" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#4CAF5015", display: "flex", alignItems: "center", justifyContent: "center" }}><Banknote size={17} color="#4CAF50" /></div>
                  <span style={{ fontWeight: 600, fontSize: "0.92rem", flex: 1 }}>Dinheiro</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input type="number" step="0.1" min="0" max="100" value={cfg.rate} onChange={e => setPaymentConfig((p: any) => ({ ...p, DINHEIRO: { ...p.DINHEIRO, rate: Number(e.target.value) } }))} style={{ width: "68px", padding: "0.35rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.85rem", textAlign: "right" }} />
                    <span style={{ fontSize: "0.82rem", color: "#64748B", fontWeight: 600 }}>%</span>
                  </div>
                  <button onClick={() => setPaymentConfig((p: any) => ({ ...p, DINHEIRO: { ...p.DINHEIRO, active: !p.DINHEIRO.active } }))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    {cfg.active ? <ToggleRight size={28} color="#4CAF50" /> : <ToggleLeft size={28} color="#CBD5E1" />}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* DÉBITO, CRÉDITO, VOUCHER - com bandeiras */}
          {[
            { key: "DEBITO", label: "Débito", icon: CreditCard, color: "#2196F3", defaultBrands: ["Mastercard", "Visa", "Elo"] },
            { key: "CREDITO", label: "Crédito", icon: CreditCard, color: "#9C27B0", defaultBrands: ["Mastercard", "Visa", "Elo"] },
            { key: "VOUCHER", label: "Voucher / Vale", icon: Ticket, color: "#E65100", defaultBrands: ["Ticket", "VR", "Sodexo", "Pluxee"] },
          ].map(pm => {
            const Icon = pm.icon;
            const cfg = paymentConfig[pm.key] || { rate: 0, active: true, brands: [] };
            const isOpen = expandedPM === pm.key;
            const brands = cfg.brands || [];

            const updateBrand = (idx: number, field: string, val: any) => {
              setPaymentConfig((p: any) => {
                const updated = { ...p[pm.key] };
                updated.brands = [...updated.brands];
                updated.brands[idx] = { ...updated.brands[idx], [field]: val };
                return { ...p, [pm.key]: updated };
              });
            };
            const removeBrand = (idx: number) => {
              setPaymentConfig((p: any) => {
                const updated = { ...p[pm.key] };
                updated.brands = updated.brands.filter((_: any, i: number) => i !== idx);
                return { ...p, [pm.key]: updated };
              });
            };
            const addBrand = () => {
              if (!newBrandName.trim()) return;
              setPaymentConfig((p: any) => {
                const updated = { ...p[pm.key] };
                updated.brands = [...(updated.brands || []), { name: newBrandName.trim(), rate: 0, active: true }];
                return { ...p, [pm.key]: updated };
              });
              setNewBrandName("");
            };

            return (
              <div key={pm.key} style={{ borderRadius: "12px", border: `1.5px solid ${cfg.active ? pm.color + '30' : '#E2E8F020'}`, background: cfg.active ? pm.color + '05' : '#F8FAFC', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.7rem 0.85rem" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: pm.color + '15', display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={17} color={pm.color} /></div>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedPM(isOpen ? null : pm.key)}>
                    <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>{pm.label}</span>
                    <span style={{ fontSize: "0.7rem", color: "#94A3B8", marginLeft: "8px" }}>{brands.filter((b: any) => b.active).length} bandeira(s) ativa(s)</span>
                  </div>
                  <button onClick={() => setPaymentConfig((p: any) => ({ ...p, [pm.key]: { ...p[pm.key], active: !cfg.active } }))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    {cfg.active ? <ToggleRight size={28} color={pm.color} /> : <ToggleLeft size={28} color="#CBD5E1" />}
                  </button>
                  <button onClick={() => setExpandedPM(isOpen ? null : pm.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                    {isOpen ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
                  </button>
                </div>

                {/* Brands Panel */}
                {isOpen && (
                  <div style={{ padding: "0 0.85rem 0.85rem", borderTop: '1px solid #E2E8F020' }}>
                    <p style={{ fontSize: "0.72rem", color: "#94A3B8", margin: "0.6rem 0", fontWeight: 600 }}>CADASTRAR POR BANDEIRA</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {brands.map((brand: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: '8px', background: brand.active ? '#fff' : '#F8FAFC', border: '1px solid #E2E8F0' }}>
                          <button onClick={() => updateBrand(idx, 'active', !brand.active)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            {brand.active ? <ToggleRight size={22} color={pm.color} /> : <ToggleLeft size={22} color="#CBD5E1" />}
                          </button>
                          <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem', color: brand.active ? '#1E293B' : '#94A3B8', textDecoration: brand.active ? 'none' : 'line-through' }}>{brand.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <input type="number" step="0.1" min="0" max="100" value={brand.rate} onChange={e => updateBrand(idx, 'rate', Number(e.target.value))} disabled={!brand.active} style={{ width: '60px', padding: '0.3rem', borderRadius: '5px', border: '1px solid #E2E8F0', fontSize: '0.8rem', textAlign: 'right', opacity: brand.active ? 1 : 0.4 }} />
                            <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>%</span>
                          </div>
                          {!pm.defaultBrands.includes(brand.name) && (
                            <button onClick={() => removeBrand(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><Trash2 size={14} color="#EF4444" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Add new brand */}
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
                      <input type="text" placeholder={pm.key === 'VOUCHER' ? 'Nome do voucher...' : 'Nova bandeira...'} value={expandedPM === pm.key ? newBrandName : ''} onChange={e => setNewBrandName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBrand()} style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.82rem' }} />
                      <button onClick={addBrand} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', background: pm.color, color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}><Plus size={14} /> Adicionar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "0.72rem", color: "#94A3B8", marginTop: "0.75rem" }}>💡 Ative/desative cada forma e bandeira. A taxa % será usada para calcular seu lucro líquido real.</p>
      </div>

      {/* ===== DELIVERY ZONES ===== */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h2 className="font-bold mb-4" style={{ fontSize: "1.1rem" }}>🗺️ Zonas de Entrega</h2>
        <p style={{ fontSize: "0.8rem", color: "#64748B", marginBottom: "1rem" }}>Defina onde você entrega e a taxa cobrada.</p>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          {[
            { key: "", label: "Sem restrição" },
            { key: "NEIGHBORHOOD", label: "📍 Por Bairro" },
            { key: "RADIUS", label: "📏 Por Raio (KM)" },
          ].map(opt => (
            <button key={opt.key} onClick={() => { setDeliveryZoneType(opt.key); if (opt.key !== deliveryZoneType) setDeliveryZones(opt.key === "RADIUS" ? [{ km: 1, fee: 3 }, { km: 2, fee: 5 }, { km: 3, fee: 7 }] : []); }} style={{ flex: 1, padding: "0.6rem", borderRadius: "10px", border: deliveryZoneType === opt.key ? "2px solid var(--primary)" : "1.5px solid #E2E8F0", background: deliveryZoneType === opt.key ? "#FFF4E5" : "#fff", fontWeight: deliveryZoneType === opt.key ? 700 : 500, fontSize: "0.82rem", cursor: "pointer" }}>
              {opt.label}
            </button>
          ))}
        </div>

        {deliveryZoneType === "NEIGHBORHOOD" && (
          <div>
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem" }}>
              <input value={newNeighborhood} onChange={e => setNewNeighborhood(e.target.value)} placeholder="Nome do bairro" style={{ flex: 2, padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1.5px solid #E2E8F0", fontSize: "0.85rem" }} />
              <input type="number" value={newNeighborhoodFee} onChange={e => setNewNeighborhoodFee(e.target.value)} placeholder="Taxa R$" step="0.5" style={{ width: "90px", padding: "0.5rem", borderRadius: "8px", border: "1.5px solid #E2E8F0", fontSize: "0.85rem" }} />
              <button onClick={() => { if (newNeighborhood.trim()) { setDeliveryZones(prev => [...prev, { name: newNeighborhood.trim(), fee: parseFloat(newNeighborhoodFee) || 0 }]); setNewNeighborhood(""); setNewNeighborhoodFee(""); } }} style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}><Plus size={14} /></button>
            </div>
            {deliveryZones.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {deliveryZones.map((z, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "#F8FAFC", borderRadius: "8px", fontSize: "0.85rem" }}>
                    <span style={{ fontWeight: 600 }}>📍 {z.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 700, color: "var(--primary)" }}>R$ {(z.fee || 0).toFixed(2)}</span>
                      <button onClick={() => setDeliveryZones(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p style={{ fontSize: "0.78rem", color: "#94A3B8" }}>Nenhum bairro cadastrado.</p>}
          </div>
        )}

        {deliveryZoneType === "RADIUS" && (
          <div>
            <p style={{ fontSize: "0.78rem", color: "#64748B", marginBottom: "0.75rem" }}>Configure o valor da taxa por faixa de distância:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {deliveryZones.map((z, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", background: "#F8FAFC", borderRadius: "8px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, minWidth: "80px" }}>Até {z.km} km</span>
                  <span style={{ fontSize: "0.78rem", color: "#64748B" }}>→</span>
                  <input type="number" step="0.5" value={z.fee} onChange={e => setDeliveryZones(prev => prev.map((zz, idx) => idx === i ? { ...zz, fee: parseFloat(e.target.value) || 0 } : zz))} style={{ width: "80px", padding: "0.4rem", borderRadius: "6px", border: "1.5px solid #E2E8F0", fontSize: "0.85rem", fontWeight: 700 }} />
                  <span style={{ fontSize: "0.78rem", color: "#64748B" }}>R$</span>
                  <button onClick={() => setDeliveryZones(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", marginLeft: "auto" }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => { const last = deliveryZones.length > 0 ? deliveryZones[deliveryZones.length - 1].km : 0; setDeliveryZones(prev => [...prev, { km: last + 1, fee: (last + 1) * 2 }]); }} style={{ marginTop: "0.5rem", padding: "0.5rem 1rem", borderRadius: "8px", border: "1.5px dashed #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}><Plus size={14} /> Adicionar Faixa de KM</button>
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
        <Save size={16} style={{ marginRight: "6px" }} /> {loading ? "Salvando..." : "Salvar Tudo"}
      </button>
    </div>
  );
}
