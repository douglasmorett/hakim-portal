"use client";

import { useState, useEffect } from "react";
import { saveLabelData, updateStoreLabelInfo } from "@/app/actions/labels";
import { createKitchenItem, updateKitchenItem, deleteKitchenItem, fillNutritionWithAI } from "@/app/actions/kitchenItems";
import { Printer, Settings, AlertTriangle, Save, Plus, Trash2, Edit2, Store, Sparkles } from "lucide-react";

export default function LabelsClient({ products, kitchenItems, storeAddress, storeCnpj, storeName, storeLogo }: { products: any[], kitchenItems: any[], storeAddress: string, storeCnpj: string, storeName: string, storeLogo: string }) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [mode, setMode] = useState<"print" | "config">("print");
  const [items, setItems] = useState<any[]>([...products.map(p => ({ ...p, isKitchenItem: false })), ...kitchenItems.map(ki => ({ ...ki, isKitchenItem: true }))]);
  
  // Modal Novo Item
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  // Modal Dados da Loja
  const [showStoreDataModal, setShowStoreDataModal] = useState(false);
  const [globalCnpj, setGlobalCnpj] = useState(storeCnpj);
  const [globalAddress, setGlobalAddress] = useState(storeAddress);
  const [globalStoreName, setGlobalStoreName] = useState(storeName);
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    setShowLogo(localStorage.getItem("labelShowLogo") === "true");
  }, []);

  // Print State
  const [lote, setLote] = useState("");
  const [fabDate, setFabDate] = useState("");
  const [valDate, setValDate] = useState("");
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  // Config State
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    shelfLifeDays: 90,
    ingredients: "",
    allergens: "",
    preparation: "",
    highSugar: false,
    highSodium: false,
    highFat: false,
    transgenic: false,
    weightStr: "1,00 kg",
    energy: "0",
    carbs: "0",
    sugars: "0",
    addedSugars: "0",
    proteins: "0",
    fatTotal: "0",
    fatSat: "0",
    sodium: "0"
  });

  const selectedProduct = items.find(p => p.id === selectedProductId);

  useEffect(() => {
    if (selectedProduct) {
      if (selectedProduct.isKitchenItem) {
        setConfig({
          shelfLifeDays: selectedProduct.shelfLifeDays || 90,
          ingredients: selectedProduct.ingredients || "",
          allergens: selectedProduct.allergens || "",
          preparation: selectedProduct.preparation || "",
          highSugar: selectedProduct.highSugar || false,
          highSodium: selectedProduct.highSodium || false,
          highFat: selectedProduct.highFat || false,
          transgenic: selectedProduct.transgenic || false,
          weightStr: selectedProduct.weightStr || "1,00 kg",
          energy: selectedProduct.energy || "0",
          carbs: selectedProduct.carbs || "0",
          sugars: selectedProduct.sugars || "0",
          addedSugars: selectedProduct.addedSugars || "0",
          proteins: selectedProduct.proteins || "0",
          fatTotal: selectedProduct.fatTotal || "0",
          fatSat: selectedProduct.fatSat || "0",
          sodium: selectedProduct.sodium || "0"
        });
      } else if (selectedProduct.labelData) {
        setConfig({ ...config, ...selectedProduct.labelData });
      } else {
        // Reset defaults
        setConfig({
          shelfLifeDays: 90,
          ingredients: "",
          allergens: "",
          preparation: "",
          highSugar: false,
          highSodium: false,
          highFat: false,
          transgenic: false,
          weightStr: "1,00 kg",
          energy: "0", carbs: "0", sugars: "0", addedSugars: "0", proteins: "0", fatTotal: "0", fatSat: "0", sodium: "0"
        });
      }
      
      // Auto calc valDate se fabDate existir e tiver shelfLifeDays
      const days = selectedProduct.isKitchenItem ? selectedProduct.shelfLifeDays : selectedProduct.labelData?.shelfLifeDays;
      if (fabDate && days) {
        const date = new Date(fabDate);
        date.setDate(date.getDate() + Number(days));
        setValDate(date.toISOString().split("T")[0]);
      }
    }
  }, [selectedProductId, fabDate, items]);

  const handleCreateNewItem = async () => {
    if (!newItemName) return;
    setSaving(true);
    try {
      const newItem = await createKitchenItem({ name: newItemName });
      setItems([...items, { ...newItem, isKitchenItem: true }]);
      setSelectedProductId(newItem.id);
      setMode("config");
      setShowNewItemModal(false);
      setNewItemName("");
    } catch (e: any) {
      alert("Erro ao criar item: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item da cozinha?")) return;
    setSaving(true);
    try {
      await deleteKitchenItem(id);
      setItems(items.filter(i => i.id !== id));
      if (selectedProductId === id) setSelectedProductId("");
    } catch (e: any) {
      alert("Erro ao excluir: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const printArea = document.querySelector<HTMLElement>(".print-area");
    if (!printArea) return;

    const old = document.getElementById("label-print-frame");
    if (old) old.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "label-print-frame";
    // 101.6mm x 152.4mm at 96dpi = 384px x 576px
    iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:384px;height:576px;border:none;";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: 4in 6in; margin: 0; }
  html, body {
    margin: 0; padding: 0;
    width: 4in; height: 6in;
    overflow: hidden;
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
  }
  * { box-sizing: border-box; }
  .print-area {
    display: block !important;
    width: 4in;
    height: 6in;
  }
  .label-page {
    display: flex;
    flex-direction: column;
    width: 4in;
    height: 6in;
    padding: 0.12in;
    background: white;
    color: black;
    box-sizing: border-box;
  }
  .label-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .label-footer {
    margin-top: auto;
    flex-shrink: 0;
  }
</style>
</head>
<body>
${printArea.innerHTML}
</body>
</html>`);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 2000);
      }, 500);
    };
  };


  const handleSaveConfig = async () => {
    if (!selectedProductId) return;
    setSaving(true);
    try {
      if (selectedProduct.isKitchenItem) {
        const updated = await updateKitchenItem(selectedProductId, config);
        setItems(items.map(i => i.id === selectedProductId ? { ...updated, isKitchenItem: true } : i));
      } else {
        await saveLabelData(selectedProductId, config);
        setItems(items.map(i => i.id === selectedProductId ? { ...i, labelData: config } : i));
      }
      alert("Configurações salvas com sucesso!");
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStoreData = async () => {
    setSaving(true);
    try {
      localStorage.setItem("labelShowLogo", showLogo.toString());
      const res = await updateStoreLabelInfo(globalCnpj, globalAddress, globalStoreName, storeLogo);
      if (res && res.error) {
        alert("Erro: " + res.error);
      } else {
        alert("Dados da loja atualizados com sucesso!");
        setShowStoreDataModal(false);
      }
    } catch (e: any) {
      alert("Erro ao salvar dados: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFillWithAI = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const data = await fillNutritionWithAI(selectedProduct.name);
      if (data.error) {
        alert("Erro da IA: " + data.error);
        return;
      }
      setConfig({ ...config, ...data });
      alert("Campos preenchidos com sucesso pela IA. Revise e clique em 'Salvar Configuração'.");
    } catch (e: any) {
      alert("Erro ao chamar IA: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="labels-container">
      {/* Esconde a interface na hora da impressão */}
      <div className="no-print mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-bold text-2xl">Módulo de Validação e Etiquetas</h1>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn btn-outline" onClick={() => setShowStoreDataModal(true)}>
              <Store size={18} style={{ marginRight: "8px" }} /> Dados da Loja
            </button>
            <button className="btn btn-primary" onClick={() => setShowNewItemModal(true)}>
              <Plus size={18} style={{ marginRight: "8px" }} /> Novo Item de Cozinha
            </button>
          </div>
        </div>

        {showStoreDataModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Dados da Loja (Vigilância)</h2>
              <p className="text-sm text-gray-500 mb-4">Esses dados serão impressos no rodapé de todas as etiquetas para fins de conformidade com a vigilância sanitária.</p>
              <div className="input-group">
                <label>Nome da Loja (Fabricante)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={globalStoreName} 
                  onChange={e => setGlobalStoreName(e.target.value)} 
                  placeholder="Ex: Hakim Esfirraria"
                />
              </div>
              <div className="input-group">
                <label>CNPJ da Loja</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={globalCnpj} 
                  onChange={e => setGlobalCnpj(e.target.value)} 
                  placeholder="Ex: 00.000.000/0000-00"
                />
              </div>
              <div className="input-group">
                <label>Endereço de Fabricação</label>
                <textarea 
                  className="input-field" 
                  rows={2}
                  value={globalAddress} 
                  onChange={e => setGlobalAddress(e.target.value)} 
                  placeholder="Ex: Rua das Flores, 123 - Centro"
                ></textarea>
              </div>
              <div className="input-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                <input 
                  type="checkbox" 
                  id="chkLogo"
                  checked={showLogo}
                  onChange={e => setShowLogo(e.target.checked)}
                  style={{ width: "16px", height: "16px" }}
                />
                <label htmlFor="chkLogo" style={{ margin: 0, cursor: "pointer" }}>Imprimir Logo no Rodapé</label>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="btn btn-outline" onClick={() => setShowStoreDataModal(false)} disabled={saving}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSaveStoreData} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Adicionar Novo Item de Cozinha</h2>
              <p className="text-sm text-gray-500 mb-4">Use para itens de preparo interno que não estão no cardápio de vendas (ex: Massas, Molhos, Temperos).</p>
              <div className="input-group">
                <label>Nome do Item</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newItemName} 
                  onChange={e => setNewItemName(e.target.value)} 
                  placeholder="Ex: Massa de Esfirra"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="btn btn-outline" onClick={() => setShowNewItemModal(false)} disabled={saving}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleCreateNewItem} disabled={saving || !newItemName}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card mb-6">
          <div className="input-group mb-0">
            <label>Selecione o Produto</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <select 
                className="input-field" 
                value={selectedProductId} 
                onChange={e => setSelectedProductId(e.target.value)}
                style={{ backgroundColor: "var(--surface-1)", flex: 1 }}
              >
                <option value="">-- Escolha um produto --</option>
                <optgroup label="Itens de Cozinha (Internos)">
                  {items.filter(p => p.isKitchenItem).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Produtos do Cardápio">
                  {items.filter(p => !p.isKitchenItem).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              </select>
              {selectedProduct?.isKitchenItem && (
                <button 
                  className="btn btn-outline text-red-500" 
                  onClick={() => handleDeleteItem(selectedProductId)}
                  title="Excluir item de cozinha"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {selectedProduct && (
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <button 
              className="btn" 
              onClick={() => setMode("print")}
              style={{ flex: 1, backgroundColor: mode === "print" ? "var(--primary)" : "var(--surface-1)", color: mode === "print" ? "#fff" : "var(--text-main)", padding: "1rem" }}
            >
              <Printer size={20} style={{ marginRight: "8px" }} /> Imprimir Etiqueta
            </button>
            <button 
              className="btn" 
              onClick={() => setMode("config")}
              style={{ flex: 1, backgroundColor: mode === "config" ? "var(--primary)" : "var(--surface-1)", color: mode === "config" ? "#fff" : "var(--text-main)", padding: "1rem" }}
            >
              <Settings size={20} style={{ marginRight: "8px" }} /> Configurar Produto
            </button>
          </div>
        )}

        {selectedProduct && mode === "config" && (
          <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            <div>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-bold">Informações Gerais</h3>
                <button className="btn btn-outline" style={{ borderColor: "var(--primary)", color: "var(--primary)", padding: "5px 10px", fontSize: "0.85rem" }} onClick={handleFillWithAI} disabled={saving}>
                  <Sparkles size={14} style={{ marginRight: "5px" }} /> {saving ? "Gerando..." : "Preencher com IA"}
                </button>
              </div>
              
              <div className="input-group">
                <label>Validade em Dias (Shelf Life)</label>
                <input type="number" className="input-field" value={config.shelfLifeDays} onChange={e => setConfig({...config, shelfLifeDays: Number(e.target.value)})} />
              </div>
              <div className="input-group">
                <label>Peso Líquido da Embalagem (Ex: 0,90kg)</label>
                <input type="text" className="input-field" value={config.weightStr} onChange={e => setConfig({...config, weightStr: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Ingredientes</label>
                <textarea className="input-field" rows={3} value={config.ingredients} onChange={e => setConfig({...config, ingredients: e.target.value})}></textarea>
              </div>
              <div className="input-group">
                <label>Alérgicos (Ex: CONTÉM OVO, LEITE...)</label>
                <textarea className="input-field" rows={2} value={config.allergens} onChange={e => setConfig({...config, allergens: e.target.value})}></textarea>
              </div>
              <div className="input-group">
                <label>Modo de Preparo</label>
                <textarea className="input-field" rows={3} value={config.preparation} onChange={e => setConfig({...config, preparation: e.target.value})}></textarea>
              </div>

              <h3 className="font-bold mb-4 mt-6 border-b pb-2">Alertas RDC 429 (Lupa) e Transgênico</h3>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={config.highSugar} onChange={e => setConfig({...config, highSugar: e.target.checked})} />
                  Alto em Açúcar Adicionado
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={config.highSodium} onChange={e => setConfig({...config, highSodium: e.target.checked})} />
                  Alto em Sódio
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={config.highFat} onChange={e => setConfig({...config, highFat: e.target.checked})} />
                  Alto em Gordura Sat.
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", color: "var(--warning)", fontWeight: "bold" }}>
                  <input type="checkbox" checked={config.transgenic} onChange={e => setConfig({...config, transgenic: e.target.checked})} />
                  Símbolo Transgênico (T)
                </label>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-4 border-b pb-2">Informação Nutricional (100g)</h3>
              <div className="input-group">
                <label>Valor Energético (kcal)</label>
                <input type="text" className="input-field" value={config.energy} onChange={e => setConfig({...config, energy: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Carboidratos (g)</label>
                <input type="text" className="input-field" value={config.carbs} onChange={e => setConfig({...config, carbs: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Açúcares Totais (g)</label>
                <input type="text" className="input-field" value={config.sugars} onChange={e => setConfig({...config, sugars: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Açúcares Adicionados (g)</label>
                <input type="text" className="input-field" value={config.addedSugars} onChange={e => setConfig({...config, addedSugars: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Proteínas (g)</label>
                <input type="text" className="input-field" value={config.proteins} onChange={e => setConfig({...config, proteins: e.target.value})} />
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Gorduras Totais (g)</label>
                  <input type="text" className="input-field" value={config.fatTotal} onChange={e => setConfig({...config, fatTotal: e.target.value})} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Gorduras Sat. (g)</label>
                  <input type="text" className="input-field" value={config.fatSat} onChange={e => setConfig({...config, fatSat: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label>Sódio (mg)</label>
                <input type="text" className="input-field" value={config.sodium} onChange={e => setConfig({...config, sodium: e.target.value})} />
              </div>

              <button className="btn btn-primary mt-4" style={{ width: "100%" }} onClick={handleSaveConfig} disabled={saving}>
                <Save size={18} style={{ marginRight: "8px" }} /> {saving ? "Salvando..." : "Salvar Configuração"}
              </button>
            </div>
          </div>
        )}

        {selectedProduct && mode === "print" && (
          <div className="card">
            <h3 className="font-bold mb-4 border-b pb-2">Dados da Impressão</h3>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div className="input-group" style={{ flex: 1, minWidth: "200px" }}>
                <label>Lote (Opcional)</label>
                <div style={{ display: "flex", gap: "5px" }}>
                  <input type="text" className="input-field" value={lote} onChange={e => setLote(e.target.value)} placeholder="Ex: 030326" style={{ flex: 1 }} />
                  <button 
                    className="btn btn-outline" 
                    onClick={() => setLote(Math.floor(100000 + Math.random() * 900000).toString())} 
                    title="Gerar Lote Aleatório" 
                    style={{ padding: "0 10px", fontSize: "1.2rem" }}
                  >
                    🎲
                  </button>
                </div>
              </div>
              <div className="input-group" style={{ flex: 1, minWidth: "200px" }}>
                <label>Data de Fabricação</label>
                <input type="date" className="input-field" value={fabDate} onChange={e => setFabDate(e.target.value)} min={todayStr} />
              </div>
              <div className="input-group" style={{ flex: 1, minWidth: "200px" }}>
                <label>Data de Validade</label>
                <input type="date" className="input-field" value={valDate} onChange={e => setValDate(e.target.value)} min={todayStr} />
              </div>
            </div>

            <button className="btn btn-primary mt-4" style={{ width: "100%", padding: "1rem", fontSize: "1.1rem" }} onClick={handlePrint} disabled={!fabDate || !valDate}>
              <Printer size={24} style={{ marginRight: "10px" }} /> ENVIAR PARA IMPRESSORA (RIBBON)
            </button>
            <p className="text-muted mt-2 text-center" style={{ fontSize: "0.85rem" }}>
              Dica: Ajuste a margem para "Nenhuma" nas configurações de impressão do navegador.
            </p>
          </div>
        )}
      </div>

      {/* ÁREA DE IMPRESSÃO — PORTRAIT 4x6 (101.6×152.4mm) */}
      {selectedProduct && mode === "print" && (
        <div className="print-area">
          <div className="label-page" style={{ display: "flex", flexDirection: "column", height: "6in", padding: "0.12in", boxSizing: "border-box" }}>
            <div className="label-content" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* ── CABEÇALHO: Nome + Alerta ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "0.5mm solid black", paddingBottom: "2mm", marginBottom: "3mm" }}>
                <div style={{ flex: 1, paddingRight: "2mm" }}>
                  <div style={{ fontSize: "5mm", fontWeight: "900", textTransform: "uppercase", lineHeight: "1.15" }}>
                    {selectedProduct.name}
                  </div>
                  <div style={{ fontSize: "3.5mm", fontWeight: "700", marginTop: "1mm" }}>{config.weightStr}</div>
                </div>
                {(config.highSugar || config.highSodium || config.highFat) && (
                  <div style={{ border: "0.5mm solid black", borderRadius: "1mm", padding: "1.5mm 3mm", display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <AlertTriangle size={16} color="black" style={{ marginRight: "1.5mm" }} />
                    <div style={{ fontWeight: "900", fontSize: "3mm", lineHeight: "1.3" }}>
                      ALTO EM<br/>
                      {config.highSugar  && <span style={{ background:"black", color:"white", padding:"0.3mm 1mm", display:"inline-block", marginTop:"0.5mm" }}>AÇÚCAR</span>}
                      {config.highSodium && <span style={{ background:"black", color:"white", padding:"0.3mm 1mm", display:"inline-block", marginTop:"0.5mm" }}>SÓDIO</span>}
                      {config.highFat    && <span style={{ background:"black", color:"white", padding:"0.3mm 1mm", display:"inline-block", marginTop:"0.5mm" }}>GORDURA</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* ── MEIO: 2 COLUNAS (Preparo | Nutricional) ── */}
              <div style={{ display: "flex", gap: "3mm", overflow: "hidden", flexShrink: 0 }}>

                {/* Coluna esquerda: Preparo + Conservação */}
                <div style={{ flex: 1, fontSize: "3mm", lineHeight: "1.4", display: "flex", flexDirection: "column" }}>
                  {config.preparation && (
                    <div style={{ marginBottom: "3mm" }}>
                      <strong style={{ fontSize: "3.2mm" }}>MODO DE PREPARO:</strong><br/>
                      {config.preparation.split('\n').map((line: string, i: number) => <span key={i}>{line} </span>)}
                    </div>
                  )}
                  <div style={{ borderTop: "0.3mm solid black", borderBottom: "0.3mm solid black", padding: "2mm 0", fontSize: "2.8mm", marginTop: "auto" }}>
                    <strong style={{ display: "block", textAlign: "center", fontSize: "3mm", marginBottom: "1mm" }}>Conservação</strong>
                    <div>Congelador: Até -12ºC = 30 dias</div>
                    <div>Freezer: -18ºC = Vide validade</div>
                  </div>
                </div>

                {/* Coluna direita: Tabela Nutricional */}
                <div style={{ width: "42mm", flexShrink: 0 }}>
                  <div style={{ border: "0.5mm solid black" }}>
                    <div style={{ borderBottom: "0.3mm solid black", padding: "1mm", textAlign: "center", fontWeight: "900", fontSize: "3mm" }}>INFORMAÇÃO NUTRICIONAL</div>
                    <div style={{ display: "flex", borderBottom: "0.3mm solid black" }}>
                      <div style={{ flex: 1, borderRight: "0.3mm solid black", padding: "0.5mm 1mm", fontSize: "2.5mm", fontWeight: "bold" }}></div>
                      <div style={{ width: "14mm", padding: "0.5mm 1mm", textAlign: "center", fontSize: "2.5mm", fontWeight: "bold" }}>100 g</div>
                    </div>
                    {[
                      ["Energia (kcal)",  config.energy],
                      ["Carboidratos",    config.carbs],
                      ["Açúcares tot.",    config.sugars],
                      ["Açúcares adic.",   config.addedSugars],
                      ["Proteínas",        config.proteins],
                      ["Gorduras tot.",    config.fatTotal],
                      ["Gorduras sat.",    config.fatSat],
                      ["Sódio (mg)",       config.sodium],
                    ].map(([label, val], i, arr) => (
                      <div key={i} style={{ display: "flex", borderBottom: i < arr.length - 1 ? "0.3mm solid black" : "none" }}>
                        <div style={{ flex: 1, borderRight: "0.3mm solid black", padding: "0.8mm 1mm", fontSize: "2.5mm", whiteSpace: "nowrap", overflow: "hidden" }}>{label}</div>
                        <div style={{ width: "14mm", padding: "0.8mm 1mm", textAlign: "center", fontSize: "3mm", fontWeight: "bold" }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── INGREDIENTES + ALÉRGICOS ── */}
              <div style={{ borderTop: "0.3mm solid black", paddingTop: "2mm", marginTop: "3mm", fontSize: "2.4mm", lineHeight: "1.2", flex: 1, overflow: "hidden" }}>
                {config.transgenic && (
                  <div style={{ display: "flex", alignItems: "center", gap: "2mm", marginBottom: "2mm" }}>
                    <div style={{ display: "inline-block", border: "0.4mm solid black", width: "5mm", height: "5mm", transform: "rotate(45deg)", position: "relative", flexShrink: 0 }}>
                      <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(-45deg)", fontWeight: "900", fontSize: "3.5mm" }}>T</span>
                    </div>
                    <span style={{ fontSize: "2.8mm" }}>Contém derivados de milho e soja transgênicos.</span>
                  </div>
                )}
                <div style={{ marginBottom: "1.5mm" }}>
                  <strong>Ingredientes:</strong> {config.ingredients || "Não cadastrado."}
                </div>
                <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "2.4mm" }}>
                  ALÉRGICOS: {config.allergens || "NÃO CADASTRADO"}
                </div>
              </div>

            </div>

              {/* ── RODAPÉ: Datas + Logo + Endereço ── */}
              <div className="label-footer" style={{ borderTop: "0.5mm solid black", paddingTop: "2mm", marginTop: "auto", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1mm" }}>
                  <div style={{ fontSize: "3.5mm", fontWeight: "bold", lineHeight: "1.5" }}>
                    <div>Fab: {fabDate ? new Date(fabDate).toLocaleDateString('pt-BR') : '--'}</div>
                    <div>Val: {valDate ? new Date(valDate).toLocaleDateString('pt-BR') : '--'}</div>
                    <div>Lote: {lote || '--'}</div>
                  </div>
                  {showLogo && (
                    <img src={storeLogo || "/logo.png"} style={{ height: "8mm", filter: "grayscale(100%) brightness(0)", objectFit: "contain" }} />
                  )}
                </div>
                {globalStoreName && (
                  <div style={{ fontSize: "3mm", textAlign: "center", marginTop: "1mm", fontWeight: "bold" }}>
                    {globalStoreName}
                  </div>
                )}
                {globalCnpj && (
                  <div style={{ fontSize: "2.5mm", textAlign: "center", borderTop: globalStoreName ? "none" : "0.2mm dashed black", paddingTop: globalStoreName ? "0" : "1mm" }}>
                    <strong>CNPJ:</strong> {globalCnpj}
                  </div>
                )}
                {globalAddress && (
                  <div style={{ fontSize: "2.5mm", textAlign: "center", lineHeight: "1.2" }}>
                    <strong>Endereço:</strong> {globalAddress}
                  </div>
                )}
              </div>

          </div>
        </div>
      )}







      <style jsx global>{`
        .print-area { display: none; }
      `}</style>
    </div>
  );
}
