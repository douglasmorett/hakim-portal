"use client";
import { useState } from "react";
import Link from "next/link";
import { CreditCard, Plus, Zap, ArrowLeft, Trash2, Receipt } from "lucide-react";

interface Card {
  id: string; name: string; lastDigits: string | null; bankName: string | null;
  limit: number | null; closingDay: number | null; dueDay: number | null;
  pixKey: string; pixKeyType: string; color: string;
  pendingCount: number; pendingAmount: number; createdAt: string;
}

const PIX_TYPES = ["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"];
const COLORS = ["#4F46E5","#DC2626","#059669","#D97706","#0EA5E9","#7C3AED","#DB2777","#374151"];
const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export default function CartoesClient({ cards: initialCards }: { cards: Card[] }) {
  const [cards, setCards] = useState(initialCards);
  const [showAddCard, setShowAddCard] = useState(false);
  const [faturaCard, setFaturaCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type:"ok"|"err", text:string}|null>(null);

  // Form novo cartão
  const [cardForm, setCardForm] = useState({
    name:"", lastDigits:"", bankName:"", limit:"",
    closingDay:"", dueDay:"", pixKey:"", pixKeyType:"CPF", color:"#4F46E5"
  });

  // Form lançar fatura
  const [faturaForm, setFaturaForm] = useState({
    supplierName:"", value:"", dueDate:"", category:"BUSINESS"
  });

  const showMsg = (type:"ok"|"err", text:string) => {
    setMsg({type,text});
    setTimeout(()=>setMsg(null), 4000);
  };

  // Salvar cartão
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.name || !cardForm.pixKey) { showMsg("err","Nome e chave PIX obrigatórios"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/credit-cards", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(cardForm)
      });
      const data = await res.json();
      if (!res.ok) { showMsg("err", data.error || "Erro ao salvar"); return; }
      showMsg("ok", `Cartão "${cardForm.name}" cadastrado!`);
      setShowAddCard(false);
      setCardForm({name:"",lastDigits:"",bankName:"",limit:"",closingDay:"",dueDay:"",pixKey:"",pixKeyType:"CPF",color:"#4F46E5"});
      window.location.reload();
    } catch { showMsg("err","Erro de conexão"); }
    finally { setLoading(false); }
  };

  // Lançar fatura (cria Payable tipo CREDIT_CARD)
  const handleLancarFatura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faturaCard || !faturaForm.value || !faturaForm.dueDate) { showMsg("err","Preencha valor e vencimento"); return; }
    setLoading(true);
    try {
      const supplierName = faturaForm.supplierName || `Fatura ${faturaCard.name}`;
      const res = await fetch("/api/admin/credit-cards/fatura", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          creditCardId: faturaCard.id,
          supplierName,
          value: parseFloat(faturaForm.value),
          dueDate: faturaForm.dueDate,
          category: faturaForm.category,
        })
      });
      const data = await res.json();
      if (!res.ok) { showMsg("err", data.error || "Erro ao lançar fatura"); return; }
      showMsg("ok", `Fatura de ${fmt(parseFloat(faturaForm.value))} lançada em Contas a Pagar!`);
      setFaturaCard(null);
      setFaturaForm({supplierName:"",value:"",dueDate:"",category:"BUSINESS"});
      window.location.reload();
    } catch { showMsg("err","Erro de conexão"); }
    finally { setLoading(false); }
  };

  // Excluir cartão
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir cartão "${name}"? As contas a pagar vinculadas não serão afetadas.`)) return;
    await fetch(`/api/admin/credit-cards?id=${id}`, {method:"DELETE"});
    setCards(prev => prev.filter(c => c.id !== id));
    showMsg("ok", "Cartão removido.");
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div style={{maxWidth:900, margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
        <Link href="/admin/finance" style={{display:"flex",alignItems:"center",gap:7,background:"linear-gradient(135deg,#EF4444,#DC2626)",color:"#fff",padding:"9px 18px",borderRadius:10,fontWeight:700,fontSize:".88rem",textDecoration:"none",boxShadow:"0 4px 12px rgba(239,68,68,.3)"}}>
          <ArrowLeft size={15}/> Voltar ao Financeiro
        </Link>
        <div>
          <h1 style={{fontSize:"1.5rem",fontWeight:800,margin:0,display:"flex",alignItems:"center",gap:8}}>
            <CreditCard size={22} style={{color:"#4F46E5"}}/> Cartões de Crédito
          </h1>
          <p style={{margin:0,color:"var(--text-muted)",fontSize:".83rem"}}>Gerencie cartões e lance faturas em Contas a Pagar</p>
        </div>
        <button onClick={()=>setShowAddCard(true)} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:7,background:"linear-gradient(135deg,#4F46E5,#7C3AED)",color:"#fff",padding:"9px 18px",borderRadius:10,fontWeight:700,fontSize:".88rem",border:"none",cursor:"pointer",boxShadow:"0 4px 12px rgba(79,70,229,.3)"}}>
          <Plus size={15}/> Novo Cartão
        </button>
      </div>

      {/* Feedback */}
      {msg && (
        <div style={{padding:"10px 16px",borderRadius:8,marginBottom:16,fontSize:".87rem",fontWeight:600,
          background: msg.type==="ok"?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",
          color: msg.type==="ok"?"#16A34A":"#DC2626",
          border:`1px solid ${msg.type==="ok"?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>
          {msg.type==="ok"?"✅":"❌"} {msg.text}
        </div>
      )}

      {/* Cards */}
      {cards.length === 0 && !showAddCard && (
        <div style={{background:"var(--surface)",border:"1px solid var(--border-color)",borderRadius:14,padding:"3rem",textAlign:"center"}}>
          <CreditCard size={48} style={{color:"var(--text-muted)",opacity:.3,marginBottom:12}}/>
          <p style={{color:"var(--text-muted)",margin:0}}>Nenhum cartão cadastrado.</p>
          <button onClick={()=>setShowAddCard(true)} style={{marginTop:14,background:"#4F46E5",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",fontWeight:700,cursor:"pointer"}}>
            + Adicionar primeiro cartão
          </button>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14,marginBottom:24}}>
        {cards.map(card => (
          <div key={card.id} style={{background:"var(--surface)",border:"1px solid var(--border-color)",borderRadius:14,overflow:"hidden",position:"relative"}}>
            {/* Topo colorido */}
            <div style={{background:`linear-gradient(135deg,${card.color},${card.color}99)`,padding:"18px 18px 14px",color:"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <p style={{margin:0,fontWeight:800,fontSize:"1.05rem"}}>{card.name}</p>
                  <p style={{margin:"2px 0 0",fontSize:".8rem",opacity:.85}}>
                    {card.bankName || "Banco não informado"}
                    {card.lastDigits ? ` •••• ${card.lastDigits}` : ""}
                  </p>
                </div>
                <CreditCard size={28} style={{opacity:.7}}/>
              </div>
              {card.limit && (
                <p style={{margin:"8px 0 0",fontSize:".78rem",opacity:.85}}>Limite: {fmt(card.limit)}</p>
              )}
            </div>

            {/* Detalhes */}
            <div style={{padding:"12px 16px"}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                {card.closingDay && <span style={{background:"var(--bg-color)",border:"1px solid var(--border-color)",borderRadius:6,padding:"2px 8px",fontSize:".75rem"}}>📅 Fecha dia {card.closingDay}</span>}
                {card.dueDay && <span style={{background:"var(--bg-color)",border:"1px solid var(--border-color)",borderRadius:6,padding:"2px 8px",fontSize:".75rem"}}>💰 Vence dia {card.dueDay}</span>}
              </div>

              <div style={{background:"var(--bg-color)",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:".8rem"}}>
                <span style={{color:"var(--text-muted)"}}>Chave PIX:</span>{" "}
                <span style={{fontWeight:600,wordBreak:"break-all"}}>{card.pixKey}</span>
                <span style={{marginLeft:6,color:"var(--text-muted)",fontSize:".72rem"}}>({card.pixKeyType})</span>
              </div>

              {card.pendingCount > 0 && (
                <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:8,padding:"6px 12px",marginBottom:12,fontSize:".82rem",color:"#D97706",display:"flex",justifyContent:"space-between"}}>
                  <span>⏳ {card.pendingCount} fatura(s) pendente(s)</span>
                  <span style={{fontWeight:700}}>{fmt(card.pendingAmount)}</span>
                </div>
              )}

              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setFaturaCard(card);setFaturaForm({supplierName:`Fatura ${card.name}`,value:"",dueDate:"",category:"BUSINESS"})}}
                  style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:`${card.color}18`,color:card.color,border:`1px solid ${card.color}40`,borderRadius:8,padding:"8px",fontWeight:700,fontSize:".83rem",cursor:"pointer"}}>
                  <Receipt size={14}/> Lançar Fatura
                </button>
                <button onClick={()=>handleDelete(card.id,card.name)}
                  style={{padding:"8px 10px",background:"rgba(239,68,68,.08)",color:"#EF4444",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,cursor:"pointer"}}>
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Novo Cartão */}
      {showAddCard && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"var(--surface)",borderRadius:16,padding:"28px",maxWidth:500,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.4)",border:"1px solid var(--border-color)"}}>
            <h2 style={{margin:"0 0 20px",fontSize:"1.1rem",fontWeight:800}}>💳 Novo Cartão de Crédito</h2>
            <form onSubmit={handleSaveCard} style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>Nome do Cartão *</label>
                  <input required className="input" placeholder="Ex: Santander Visa" value={cardForm.name} onChange={e=>setCardForm({...cardForm,name:e.target.value})}/>
                </div>
                <div>
                  <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>Banco</label>
                  <input className="input" placeholder="Ex: Santander" value={cardForm.bankName} onChange={e=>setCardForm({...cardForm,bankName:e.target.value})}/>
                </div>
                <div>
                  <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>4 últimos dígitos</label>
                  <input className="input" placeholder="1234" maxLength={4} value={cardForm.lastDigits} onChange={e=>setCardForm({...cardForm,lastDigits:e.target.value})}/>
                </div>
                <div>
                  <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>Dia de Fechamento</label>
                  <input className="input" type="number" min={1} max={31} placeholder="Ex: 15" value={cardForm.closingDay} onChange={e=>setCardForm({...cardForm,closingDay:e.target.value})}/>
                </div>
                <div>
                  <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>Dia de Vencimento</label>
                  <input className="input" type="number" min={1} max={31} placeholder="Ex: 25" value={cardForm.dueDay} onChange={e=>setCardForm({...cardForm,dueDay:e.target.value})}/>
                </div>
                <div>
                  <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>Limite (R$)</label>
                  <input className="input" type="number" step="0.01" placeholder="5000.00" value={cardForm.limit} onChange={e=>setCardForm({...cardForm,limit:e.target.value})}/>
                </div>
                <div>
                  <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>Cor</label>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {COLORS.map(c=>(
                      <button type="button" key={c} onClick={()=>setCardForm({...cardForm,color:c})}
                        style={{width:28,height:28,borderRadius:"50%",background:c,border:cardForm.color===c?"3px solid #fff":"2px solid transparent",outline:cardForm.color===c?"2px solid "+c:"none",cursor:"pointer"}}/>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{borderTop:"1px solid var(--border-color)",paddingTop:14}}>
                <p style={{margin:"0 0 10px",fontWeight:700,fontSize:".88rem"}}>🔑 Chave PIX para pagamento da fatura</p>
                <div style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:10}}>
                  <div>
                    <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>Tipo</label>
                    <select className="input" value={cardForm.pixKeyType} onChange={e=>setCardForm({...cardForm,pixKeyType:e.target.value})}>
                      {PIX_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>Chave PIX *</label>
                    <input required className="input" placeholder="CPF, e-mail, telefone..." value={cardForm.pixKey} onChange={e=>setCardForm({...cardForm,pixKey:e.target.value})}/>
                  </div>
                </div>
                <p style={{margin:"6px 0 0",fontSize:".75rem",color:"var(--text-muted)"}}>
                  ⚡ Ao lançar a fatura e clicar em Pagar, o sistema fará um PIX automático para esta chave.
                </p>
              </div>

              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button type="button" onClick={()=>setShowAddCard(false)} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid var(--border-color)",background:"transparent",cursor:"pointer",fontWeight:600,color:"var(--text-muted)"}}>Cancelar</button>
                <button type="submit" disabled={loading} style={{flex:2,padding:"10px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${cardForm.color},${cardForm.color}cc)`,color:"#fff",cursor:loading?"wait":"pointer",fontWeight:700,fontSize:".92rem"}}>
                  {loading?"Salvando...":"💾 Salvar Cartão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lançar Fatura */}
      {faturaCard && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"var(--surface)",borderRadius:16,padding:"28px",maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.4)",border:"1px solid var(--border-color)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:faturaCard.color,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <CreditCard size={18} color="#fff"/>
              </div>
              <div>
                <h2 style={{margin:0,fontSize:"1.05rem",fontWeight:800}}>Lançar Fatura</h2>
                <p style={{margin:0,fontSize:".8rem",color:"var(--text-muted)"}}>{faturaCard.name} {faturaCard.lastDigits?`•••• ${faturaCard.lastDigits}`:""}</p>
              </div>
            </div>

            <div style={{background:"rgba(79,70,229,.08)",border:"1px solid rgba(79,70,229,.2)",borderRadius:8,padding:"8px 12px",marginBottom:16,fontSize:".8rem",color:"#4F46E5"}}>
              ⚡ A fatura será criada em <strong>Contas a Pagar</strong> com tipo Cartão de Crédito.
              Quando clicar em Pagar, o sistema enviará um PIX para <strong>{faturaCard.pixKey}</strong>
            </div>

            <form onSubmit={handleLancarFatura} style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>Descrição da fatura</label>
                <input className="input" placeholder={`Fatura ${faturaCard.name}`} value={faturaForm.supplierName} onChange={e=>setFaturaForm({...faturaForm,supplierName:e.target.value})}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>Valor da fatura (R$) *</label>
                  <input required className="input" type="number" step="0.01" min="0.01" placeholder="0,00" value={faturaForm.value} onChange={e=>setFaturaForm({...faturaForm,value:e.target.value})}/>
                </div>
                <div>
                  <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>Vencimento *</label>
                  <input required className="input" type="date" min={todayStr} value={faturaForm.dueDate} onChange={e=>setFaturaForm({...faturaForm,dueDate:e.target.value})}/>
                </div>
              </div>
              <div>
                <label style={{display:"block",marginBottom:6,fontSize:".83rem",fontWeight:700}}>Categoria</label>
                <select className="input" value={faturaForm.category} onChange={e=>setFaturaForm({...faturaForm,category:e.target.value})}>
                  <option value="BUSINESS">🏢 Empresarial</option>
                  <option value="PERSONAL">👤 Pessoal</option>
                </select>
              </div>

              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button type="button" onClick={()=>setFaturaCard(null)} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid var(--border-color)",background:"transparent",cursor:"pointer",fontWeight:600,color:"var(--text-muted)"}}>Cancelar</button>
                <button type="submit" disabled={loading} style={{flex:2,padding:"10px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${faturaCard.color},${faturaCard.color}cc)`,color:"#fff",cursor:loading?"wait":"pointer",fontWeight:700}}>
                  {loading?"Lançando...":"📋 Lançar em Contas a Pagar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
