"use client";
import { useState, useEffect } from "react";

type Props = { params: Promise<{ guildId: string }> };

export default function EconomyPage({ params }: Props) {
  const [guildId, setGuildId] = useState("");
  params.then((p) => setGuildId(p.guildId));
  if (!guildId) return <div style={{ color: "#dbdee1", padding: "2rem" }}>Carregando...</div>;
  return <EconomyTab guildId={guildId} />;
}

function EconomyTab({ guildId }: { guildId: string }) {
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newSymbol, setNewSymbol] = useState("$");
  const [newTax, setNewTax] = useState(0);
  const [newExchange, setNewExchange] = useState(1.0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/currencies`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCurrencies(data); });
  }, []);

  const addCurrency = async () => {
    if (!newName) { setMessage("Nome da moeda é obrigatório."); return; }
    const res = await fetch(`/api/guilds/${guildId}/currencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, symbol: newSymbol, taxRate: newTax, exchangeRate: newExchange }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Moeda "${data.name}" criada.`);
      setNewName(""); setNewSymbol("$"); setNewTax(0); setNewExchange(1.0);
      fetch(`/api/guilds/${guildId}/currencies`).then(res => res.json()).then(setCurrencies);
    } else {
      setMessage(data.error || "Erro ao criar moeda.");
    }
  };

  const deleteCurrency = async (id: string) => {
    const res = await fetch(`/api/guilds/${guildId}/currencies/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Moeda removida.");
      fetch(`/api/guilds/${guildId}/currencies`).then(res => res.json()).then(setCurrencies);
    } else {
      const data = await res.json();
      setMessage(data.error || "Erro ao remover moeda.");
    }
  };

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", maxWidth: "520px", color: "#dbdee1" }}>
      <h2 style={{ color: "#f2f3f5", marginBottom: "24px" }}>Economia</h2>
      <div style={{ background: "#16181c", border: "1px solid #1e2025", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
        <label className="field-label" style={{ marginBottom: "8px" }}>Criar Moeda</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input className="field-input" placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: "1 1 120px" }} />
          <input className="field-input" placeholder="Símbolo" value={newSymbol} onChange={e => setNewSymbol(e.target.value)} style={{ width: "80px" }} />
          <input className="field-input" type="number" placeholder="Taxa %" value={newTax} onChange={e => setNewTax(Number(e.target.value))} style={{ width: "80px" }} />
          <input className="field-input" type="number" placeholder="Cotação" value={newExchange} onChange={e => setNewExchange(Number(e.target.value))} style={{ width: "80px" }} />
          <button className="save-btn" onClick={addCurrency} style={{ width: "auto", padding: "10px 16px", marginTop: 0 }}>Criar</button>
        </div>
      </div>
      <div>
        <label className="field-label">Moedas existentes</label>
        {currencies.map((c: any) => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1e2025" }}>
            <span>{c.name} ({c.symbol}) - Taxa: {c.taxRate}% - Cotação: {c.exchangeRate}</span>
            <button className="save-btn" onClick={() => deleteCurrency(c.id)} style={{ background: "#ed4245", width: "auto", padding: "4px 12px", fontSize: "12px", marginTop: 0 }}>Remover</button>
          </div>
        ))}
      </div>
      {message && <div style={{ marginTop: "16px", color: message.includes("Erro") ? "#ed4245" : "#23a55a", fontSize: "13px" }}>{message}</div>}
      <style jsx>{`
        .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 4px; }
        .field-input { background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; outline: none; box-sizing: border-box; }
        .save-btn { background: #5865f2; color: white; border: none; border-radius: 8px; padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .save-btn:hover { background: #4752c4; }
      `}</style>
    </div>
  );
}