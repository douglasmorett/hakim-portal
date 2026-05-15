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
    const printArea = document.querySelector<HTMLElement>(".print-area");
    if (!printArea) return;

    // Remove iframe anterior se existir
    const old = document.getElementById("label-print-frame");
    // Abre popup de impressão
    const printWindow = window.open('', 'label-print', 'width=600,height=400');
    if (!printWindow) { alert('Permita popups para imprimir.'); return; }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: 152.4mm 101.6mm; margin: 0; }
  html, body {
    margin: 0; padding: 0;
    width: 152.4mm; height: 101.6mm;
    overflow: hidden;
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
  }
  * { box-sizing: border-box; }
  .print-area {
    display: block !important;
    width: 152.4mm;
    height: 101.6mm;
  }
  .label-page {
    width: 152.4mm;
    height: 101.6mm;
    padding: 3mm;
    overflow: hidden;
    background: white;
    color: black;
  }
  .label-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
</head>
<body>
${printArea.innerHTML}
</body>
</html>`);
    printWindow.document.close();

    // Aguarda renderizar e imprime
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 300);
    };
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

      {/* ÁREA DE IMPRESSÃO — 4x6 landscape (152.4×101.6mm) */}
      {selectedProduct && mode === "print" && (
        <div className="print-area">
          <div className="label-page">
            <div className="label-content">

              {/* ── CABEÇALHO ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "0.5mm solid black", paddingBottom: "1mm", marginBottom: "2mm" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "5mm", fontWeight: "900", textTransform: "uppercase", lineHeight: "1.15" }}>
                    {selectedProduct.name}
                  </div>
                  <div style={{ fontSize: "3.2mm", fontWeight: "700" }}>{config.weightStr}</div>
                </div>
                {(config.highSugar || config.highSodium || config.highFat) && (
                  <div style={{ border: "0.5mm solid black", borderRadius: "1mm", padding: "1mm 2mm", display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <AlertTriangle size={14} color="black" style={{ marginRight: "1mm" }} />
                    <div style={{ fontWeight: "900", fontSize: "3mm", lineHeight: "1.2" }}>
                      ALTO EM<br/>
                      {config.highSugar  && <span style={{ background:"black", color:"white", padding:"0 1mm", display:"inline-block", marginTop:"0.5mm" }}>AÇÚCAR</span>}
                      {config.highSodium && <span style={{ background:"black", color:"white", padding:"0 1mm", display:"inline-block", marginTop:"0.5mm" }}>SÓDIO</span>}
                      {config.highFat    && <span style={{ background:"black", color:"white", padding:"0 1mm", display:"inline-block", marginTop:"0.5mm" }}>GORDURA</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* ── CORPO: 3 COLUNAS ── */}
              <div style={{ display: "flex", gap: "2mm", flex: 1, overflow: "hidden" }}>

                {/* COL 1: Preparo + Conservação */}
                <div style={{ flex: 1, fontSize: "3mm", lineHeight: "1.35", display: "flex", flexDirection: "column" }}>
                  {config.preparation && (
                    <div style={{ marginBottom: "1.5mm" }}>
                      <strong>MODO DE PREPARO:</strong><br/>
                      {config.preparation.split('\n').map((line: string, i: number) => <span key={i}>{line} </span>)}
                    </div>
                  )}
                  <div style={{ borderTop: "0.3mm solid black", borderBottom: "0.3mm solid black", padding: "1.5mm 0", fontSize: "2.8mm", marginTop: "auto" }}>
                    <strong style={{ display: "block", textAlign: "center", marginBottom: "0.5mm" }}>Conservação</strong>
                    <div>Congelador: -12ºC = 30 dias</div>
                    <div>Freezer: -18ºC = Vide validade</div>
                  </div>
                </div>

                {/* COL 2: Ingredientes + Alérgicos */}
                <div style={{ flex: 1, fontSize: "3mm", lineHeight: "1.35", display: "flex", flexDirection: "column", borderLeft: "0.3mm solid #ccc", paddingLeft: "2mm" }}>
                  {config.transgenic && (
                    <div style={{ display: "flex", alignItems: "center", gap: "1.5mm", marginBottom: "1.5mm" }}>
                      <div style={{ display: "inline-block", border: "0.4mm solid black", width: "4mm", height: "4mm", transform: "rotate(45deg)", position: "relative", flexShrink: 0 }}>
                        <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(-45deg)", fontWeight: "900", fontSize: "3mm" }}>T</span>
                      </div>
                      <span style={{ fontSize: "2.5mm" }}>Transgênico (milho/soja)</span>
                    </div>
                  )}
                  <div style={{ marginBottom: "1.5mm", flex: 1 }}>
                    <strong>Ingredientes:</strong> {config.ingredients || "Não cadastrado."}
                  </div>
                  <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "3mm", borderTop: "0.3mm solid black", paddingTop: "1.5mm" }}>
                    ALÉRGICOS: {config.allergens || "NÃO CADASTRADO"}
                  </div>
                </div>

                {/* COL 3: Tabela Nutricional */}
                <div style={{ width: "38%", flexShrink: 0, borderLeft: "0.3mm solid #ccc", paddingLeft: "1.5mm" }}>
                  <div style={{ border: "0.4mm solid black" }}>
                    <div style={{ borderBottom: "0.3mm solid black", padding: "0.8mm 1mm", textAlign: "center", fontWeight: "900", fontSize: "2.8mm" }}>INFO. NUTRICIONAL</div>
                    <div style={{ display: "flex", borderBottom: "0.3mm solid black" }}>
                      <div style={{ flex: 1, borderRight: "0.3mm solid black", padding: "0.5mm 1mm", fontSize: "2.5mm", fontWeight: "bold" }}></div>
                      <div style={{ width: "30%", padding: "0.5mm 1mm", textAlign: "center", fontSize: "2.5mm", fontWeight: "bold" }}>100 g</div>
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
                        <div style={{ flex: 1, borderRight: "0.3mm solid black", padding: "0.5mm 1mm", fontSize: "2.5mm", whiteSpace: "nowrap", overflow: "hidden" }}>{label}</div>
                        <div style={{ width: "30%", padding: "0.5mm 1mm", textAlign: "center", fontSize: "2.8mm", fontWeight: "bold" }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* ── RODAPÉ ── */}
              <div style={{ borderTop: "0.5mm solid black", paddingTop: "1.5mm", marginTop: "2mm", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "3.2mm", fontWeight: "bold" }}>
                <span>Fab: {fabDate ? new Date(fabDate).toLocaleDateString('pt-BR') : '--'}</span>
                <span>Val: {valDate ? new Date(valDate).toLocaleDateString('pt-BR') : '--'}</span>
                <span>Lote: {lote || '--'}</span>
                <img src="/logo.png" style={{ height: "5mm", filter: "grayscale(100%) brightness(0)" }} />
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
