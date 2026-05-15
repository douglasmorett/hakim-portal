"use client";

import { useState, useEffect } from "react";
import { saveLabelData } from "@/app/actions/labels";
import { Printer, Settings, AlertTriangle, Save, Ruler } from "lucide-react";

// ─── Presets de tamanho de etiqueta ───────────────────────────
const LABEL_PRESETS = [
  { label: "Elgin L42 — 100 × 150 mm", w: 100, h: 150 },
  { label: "Elgin L42 — 100 × 100 mm", w: 100, h: 100 },
  { label: "Elgin L42 — 100 × 50 mm",  w: 100, h: 50  },
  { label: "Térmica 80mm — 80 × 150 mm", w: 80,  h: 150 },
  { label: "Térmica 80mm — 80 × 100 mm", w: 80,  h: 100 },
  { label: "Carta / A4 (não etiqueta)",   w: 210, h: 297 },
  { label: "Personalizado",              w: 0,   h: 0   },
];

export default function LabelsClient({ products }: { products: any[] }) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [mode, setMode] = useState<"print" | "config">("print");
  
  // Print State
  const [lote, setLote] = useState("");
  const [fabDate, setFabDate] = useState("");
  const [valDate, setValDate] = useState("");

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
    energy: "153",
    carbs: "25",
    sugars: "18",
    addedSugars: "17",
    proteins: "2,6",
    fatTotal: "4,7",
    fatSat: "2,0",
    sodium: "73"
  });

  const selectedProduct = products.find(p => p.id === selectedProductId);

  useEffect(() => {
    if (selectedProduct) {
      if (selectedProduct.labelData) {
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
      if (fabDate && selectedProduct.labelData?.shelfLifeDays) {
        const date = new Date(fabDate);
        date.setDate(date.getDate() + Number(selectedProduct.labelData.shelfLifeDays));
        setValDate(date.toISOString().split("T")[0]);
      }
    }
  }, [selectedProductId, fabDate]);

  const handlePrint = () => {
    // Pega todos os elementos que precisam ser escondidos
    const sidebar  = document.querySelector<HTMLElement>("#admin-sidebar");
    const topbar   = document.querySelector<HTMLElement>("#admin-topbar");
    const noPrints = document.querySelectorAll<HTMLElement>(".no-print");
    const adminMain = document.querySelector<HTMLElement>(".admin-main");
    const contentWrap = adminMain?.querySelector<HTMLElement>(":scope > div:not(.labels-container)");
    const printArea  = document.querySelector<HTMLElement>(".print-area");

    // --- Esconde UI ---
    if (sidebar)  sidebar.style.display  = "none";
    if (topbar)   topbar.style.display   = "none";
    if (adminMain) { adminMain.style.marginLeft = "0"; adminMain.style.padding = "0"; }
    if (contentWrap) contentWrap.style.display = "none";
    noPrints.forEach(el => (el.style.display = "none"));

    // --- Mostra só a etiqueta ---
    if (printArea) printArea.style.display = "block";

    // --- Imprime ---
    window.print();

    // --- Restaura tudo ---
    if (sidebar)  sidebar.style.display  = "";
    if (topbar)   topbar.style.display   = "";
    if (adminMain) { adminMain.style.marginLeft = ""; adminMain.style.padding = ""; }
    if (contentWrap) contentWrap.style.display = "";
    noPrints.forEach(el => (el.style.display = ""));
    if (printArea) printArea.style.display = "";
  };

  const handleSaveConfig = async () => {
    if (!selectedProductId) return;
    setSaving(true);
    try {
      await saveLabelData(selectedProductId, config);
      alert("Configurações salvas com sucesso!");
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
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
        </div>

        <div className="card mb-6">
          <div className="input-group mb-0">
            <label>Selecione o Produto</label>
            <select 
              className="input-field" 
              value={selectedProductId} 
              onChange={e => setSelectedProductId(e.target.value)}
              style={{ backgroundColor: "var(--surface-1)" }}
            >
              <option value="">-- Escolha um produto --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
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
              <h3 className="font-bold mb-4 border-b pb-2">Informações Gerais</h3>
              
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
                <input type="text" className="input-field" value={lote} onChange={e => setLote(e.target.value)} placeholder="Ex: 030326" />
              </div>
              <div className="input-group" style={{ flex: 1, minWidth: "200px" }}>
                <label>Data de Fabricação</label>
                <input type="date" className="input-field" value={fabDate} onChange={e => setFabDate(e.target.value)} />
              </div>
              <div className="input-group" style={{ flex: 1, minWidth: "200px" }}>
                <label>Data de Validade</label>
                <input type="date" className="input-field" value={valDate} onChange={e => setValDate(e.target.value)} />
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

      {/* ÁREA DE IMPRESSÃO (Visível apenas ao imprimir) */}
      {selectedProduct && mode === "print" && (
        <div className="print-area">
          {/* Label 1: FRENTE (Instruções + Avisos RDC) */}
          <div className="label-page">
            <div className="label-content">
              {/* Avisos Lupa RDC 429 */}
              {(config.highSugar || config.highSodium || config.highFat) && (
                <div style={{ border: "2px solid black", borderRadius: "8px", padding: "4px", display: "flex", alignItems: "center", marginBottom: "10px", width: "fit-content", marginLeft: "auto" }}>
                  <div style={{ marginRight: "8px" }}><AlertTriangle size={24} color="black" /></div>
                  <div style={{ fontWeight: "900", fontSize: "14px", lineHeight: "1" }}>
                    ALTO EM<br/>
                    {config.highSugar && <span style={{ backgroundColor: "black", color: "white", padding: "1px 4px", display: "inline-block", marginTop: "2px" }}>AÇÚCAR ADICIONADO</span>}<br/>
                    {config.highSodium && <span style={{ backgroundColor: "black", color: "white", padding: "1px 4px", display: "inline-block", marginTop: "2px" }}>SÓDIO</span>}<br/>
                    {config.highFat && <span style={{ backgroundColor: "black", color: "white", padding: "1px 4px", display: "inline-block", marginTop: "2px" }}>GORDURA SATURADA</span>}
                  </div>
                </div>
              )}

              <h2 style={{ textAlign: "center", fontSize: "16px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>
                {selectedProduct.name} - {config.weightStr}
              </h2>

              {config.preparation && (
                <div style={{ fontSize: "11px", marginBottom: "10px" }}>
                  <strong>MODO DE PREPARO:</strong><br/>
                  {config.preparation.split('\n').map((line:string, i:number) => <div key={i}>{line}</div>)}
                </div>
              )}

              <div style={{ borderTop: "1px solid black", borderBottom: "1px solid black", padding: "6px 0", fontSize: "10px", marginBottom: "10px" }}>
                <strong style={{ display: "block", textAlign: "center", marginBottom: "4px" }}>Modo de Conservação / Armazenamento</strong>
                <div className="conservation-row">
                  <span>Congelador: Até -12ºC = 30 dias</span>
                  <span>Freezer: -18ºC ou mais frio = Vide validade</span>
                </div>
              </div>

              {config.transgenic && (
                <div style={{ textAlign: "center", marginBottom: "10px" }}>
                  <div style={{ display: "inline-block", border: "2px solid black", width: "30px", height: "30px", transform: "rotate(45deg)", position: "relative" }}>
                    <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-45deg)", fontWeight: "900", fontSize: "18px" }}>T</span>
                  </div>
                  <div style={{ fontSize: "10px", marginTop: "8px" }}>Contém derivados de milho e soja transgênicos.</div>
                </div>
              )}

              <div style={{ marginTop: "auto", borderTop: "2px solid black", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "bold" }}>
                <span>Fab: {fabDate ? new Date(fabDate).toLocaleDateString('pt-BR') : '--'}</span>
                <span>Val: {valDate ? new Date(valDate).toLocaleDateString('pt-BR') : '--'}</span>
                <span>Lote: {lote || '--'}</span>
              </div>
            </div>
          </div>

          {/* Label 2: VERSO (Ingredientes + Nutricional) */}
          <div className="label-page">
            <div className="label-content">
              <div style={{ fontSize: "10px", lineHeight: "1.2", marginBottom: "10px" }}>
                <strong>Ingredientes:</strong> {config.ingredients || "Não cadastrado."}
              </div>
              
              <div style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "10px", textTransform: "uppercase" }}>
                ALÉRGICOS: {config.allergens || "NÃO CADASTRADO"}
              </div>

              <div style={{ border: "2px solid black", fontSize: "10px" }}>
                <div style={{ borderBottom: "1px solid black", padding: "4px", textAlign: "center", fontWeight: "900", fontSize: "12px" }}>INFORMAÇÃO NUTRICIONAL</div>
                <div style={{ display: "flex", borderBottom: "1px solid black", fontWeight: "bold" }}>
                  <div style={{ flex: 2, borderRight: "1px solid black", padding: "2px 4px" }}></div>
                  <div style={{ flex: 1, borderRight: "1px solid black", padding: "2px 4px", textAlign: "center" }}>100 g</div>
                </div>
                
                <div style={{ display: "flex", borderBottom: "1px solid black" }}>
                  <div style={{ flex: 2, borderRight: "1px solid black", padding: "2px 4px" }}>Valor energético (kcal)</div>
                  <div style={{ flex: 1, borderRight: "1px solid black", padding: "2px 4px", textAlign: "center" }}>{config.energy}</div>
                </div>
                <div style={{ display: "flex", borderBottom: "1px solid black" }}>
                  <div style={{ flex: 2, borderRight: "1px solid black", padding: "2px 4px" }}>Carboidratos (g)</div>
                  <div style={{ flex: 1, borderRight: "1px solid black", padding: "2px 4px", textAlign: "center" }}>{config.carbs}</div>
                </div>
                <div style={{ display: "flex", borderBottom: "1px solid black" }}>
                  <div style={{ flex: 2, borderRight: "1px solid black", padding: "2px 4px" }}>Açúcares totais (g)</div>
                  <div style={{ flex: 1, borderRight: "1px solid black", padding: "2px 4px", textAlign: "center" }}>{config.sugars}</div>
                </div>
                <div style={{ display: "flex", borderBottom: "1px solid black" }}>
                  <div style={{ flex: 2, borderRight: "1px solid black", padding: "2px 4px" }}>Açúcares adicionados (g)</div>
                  <div style={{ flex: 1, borderRight: "1px solid black", padding: "2px 4px", textAlign: "center" }}>{config.addedSugars}</div>
                </div>
                <div style={{ display: "flex", borderBottom: "1px solid black" }}>
                  <div style={{ flex: 2, borderRight: "1px solid black", padding: "2px 4px" }}>Proteínas (g)</div>
                  <div style={{ flex: 1, borderRight: "1px solid black", padding: "2px 4px", textAlign: "center" }}>{config.proteins}</div>
                </div>
                <div style={{ display: "flex", borderBottom: "1px solid black" }}>
                  <div style={{ flex: 2, borderRight: "1px solid black", padding: "2px 4px" }}>Gorduras totais (g)</div>
                  <div style={{ flex: 1, borderRight: "1px solid black", padding: "2px 4px", textAlign: "center" }}>{config.fatTotal}</div>
                </div>
                <div style={{ display: "flex", borderBottom: "1px solid black" }}>
                  <div style={{ flex: 2, borderRight: "1px solid black", padding: "2px 4px" }}>Gorduras saturadas (g)</div>
                  <div style={{ flex: 1, borderRight: "1px solid black", padding: "2px 4px", textAlign: "center" }}>{config.fatSat}</div>
                </div>
                <div style={{ display: "flex" }}>
                  <div style={{ flex: 2, borderRight: "1px solid black", padding: "2px 4px" }}>Sódio (mg)</div>
                  <div style={{ flex: 1, borderRight: "1px solid black", padding: "2px 4px", textAlign: "center" }}>{config.sodium}</div>
                </div>
              </div>
              
              <div style={{ textAlign: "center", marginTop: "10px" }}>
                <img src="/logo.png" style={{ height: "30px", filter: "grayscale(100%) brightness(0)" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .print-area { display: none; }

        @media print {
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
          body { margin: 0; padding: 0; background: #fff; }
          .no-print { display: none !important; }
          #admin-sidebar { display: none !important; }
          #admin-topbar { display: none !important; }
          .admin-main {
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          /* Remove padding do wrapper interno do conteúdo */
          .admin-main > div:not(.print-area):not(.labels-container) {
            display: none !important;
          }
          .labels-container > .no-print { display: none !important; }

          .print-area {
            display: block;
            width: 100mm;
            overflow: hidden;
          }

          .label-page {
            width: 100mm;
            height: 150mm;
            padding: 4mm;
            box-sizing: border-box;
            overflow: hidden;
            background: white;
            page-break-after: always;
            color: black;
            font-family: Arial, Helvetica, sans-serif;
          }

          /* Nenhum filho estoura 100mm */
          .label-page * {
            box-sizing: border-box;
            max-width: 100%;
            word-break: break-word;
            overflow-wrap: break-word;
          }

          .label-content {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          /* Linha de conservação em coluna para não estourar */
          .conservation-row {
            display: flex;
            flex-direction: column;
            gap: 1px;
            font-size: 9px !important;
          }
        }
      `}</style>
    </div>
  );
}
