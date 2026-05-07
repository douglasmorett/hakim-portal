"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Copy, ExternalLink, Upload, Trash2, Plus, Tag } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const storeUrl = `https://hakim-portal.vercel.app/loja/${user.slug}`;

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
      if (res.ok) { const d = await res.json(); setter(d.url); }
      else { alert("Erro no upload."); }
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
        body: JSON.stringify({ storeName, storePhone, storeAddress, storeBanner, storeLogo, storeHours, storeDeliveryOnly, storeCoupons: coupons })
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
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {storeHours.map((h: any, idx: number) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", backgroundColor: h.active ? "#F0FDF4" : "#FEF2F2", borderRadius: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", minWidth: "90px" }}>
                <input type="checkbox" checked={h.active} onChange={e => updateHour(idx, "active", e.target.checked)} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{h.day}</span>
              </label>
              {h.active ? (
                <>
                  <input type="time" value={h.open} onChange={e => updateHour(idx, "open", e.target.value)} style={{ padding: "0.3rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.85rem" }} />
                  <span style={{ fontSize: "0.8rem" }}>às</span>
                  <input type="time" value={h.close} onChange={e => updateHour(idx, "close", e.target.value)} style={{ padding: "0.3rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.85rem" }} />
                </>
              ) : <span style={{ fontSize: "0.8rem", color: "#EF4444", fontWeight: 600 }}>Fechado</span>}
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

      <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ width: "100%" }}>
        <Save size={16} style={{ marginRight: "6px" }} /> {loading ? "Salvando..." : "Salvar Tudo"}
      </button>
    </div>
  );
}
