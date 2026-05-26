"use client";
import { useState } from "react";

type Props = { params: Promise<{ guildId: string }> };

export default function EmojiPage({ params }: Props) {
  const [guildId, setGuildId] = useState("");
  params.then((p) => setGuildId(p.guildId));
  if (!guildId) return <div style={{ color: "#dbdee1", padding: "2rem" }}>Carregando...</div>;
  return <EmojiManager guildId={guildId} />;
}

function EmojiManager({ guildId }: { guildId: string }) {
  const [search, setSearch] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [addName, setAddName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");

  const fetchEmojis = async (query: string) => {
    if (query.length < 2) { setList([]); return; }
    const res = await fetch(`/api/guilds/${guildId}/emojis`);
    const data = await res.json();
    if (Array.isArray(data)) {
      setList(data.filter((e: any) => e.name.toLowerCase().includes(query.toLowerCase())));
    }
  };

  const handleAdd = async () => {
    if (!addName || (!file && !url)) { setMsg("Preencha nome e forneça imagem ou URL."); return; }
    let imageData = "";
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { submitAdd(reader.result as string); };
      reader.readAsDataURL(file);
    } else {
      imageData = url;
      await submitAdd(imageData);
    }
  };

  const submitAdd = async (image: string) => {
    const res = await fetch(`/api/guilds/${guildId}/emojis/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addName, image }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`Emoji ${data.name} adicionado.`);
      setAddName("");
      setFile(null);
      setUrl("");
    } else {
      setMsg(data.error || "Erro.");
    }
  };

  const handleRemove = async () => {
    if (!selected) return;
    const res = await fetch(`/api/guilds/${guildId}/emojis/remove?id=${selected.id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setMsg(`Emoji ${selected.name} removido.`);
      setSelected(null);
      setSearch("");
      setList([]);
    } else {
      setMsg(data.error || "Erro.");
    }
  };

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", maxWidth: "520px", color: "#dbdee1" }}>
      <h2 style={{ color: "#f2f3f5", marginBottom: "24px" }}>Gerenciar Emojis</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label className="field-label">Adicionar Emoji</label>
          <input className="field-input" placeholder="Nome do emoji" value={addName} onChange={e => setAddName(e.target.value)} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
            <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
            <span style={{ color: "#72767d" }}>ou</span>
            <input className="field-input" placeholder="URL da imagem" value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <button className="save-btn" onClick={handleAdd} style={{ marginTop: "8px" }}>Adicionar</button>
        </div>
        <div>
          <label className="field-label">Remover Emoji</label>
          <input className="field-input" placeholder="Buscar emoji..." value={search} onChange={e => { setSearch(e.target.value); fetchEmojis(e.target.value); setSelected(null); }} />
          {list.length > 0 && (
            <div style={{ background: "#0e0f11", border: "1px solid #1e2025", borderRadius: "8px", maxHeight: "150px", overflow: "auto", marginTop: "4px" }}>
              {list.map((emoji: any) => (
                <div key={emoji.id} onClick={() => { setSelected(emoji); setSearch(`${emoji.name} (${emoji.id})`); setList([]); }} style={{ padding: "6px 12px", cursor: "pointer", borderBottom: "1px solid #1e2025" }}>
                  {emoji.name} <span style={{ color: "#72767d", fontSize: "12px" }}>(ID: {emoji.id})</span>
                </div>
              ))}
            </div>
          )}
          {selected && (
            <div style={{ background: "#1e2025", padding: "10px", borderRadius: "8px", marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span>Remover: <strong>{selected.name}</strong></span>
              <button className="save-btn" onClick={handleRemove} style={{ padding: "4px 14px", fontSize: "12px", width: "auto", background: "#ed4245" }}>Confirmar</button>
            </div>
          )}
        </div>
        {msg && <div style={{ color: msg.includes("Erro") ? "#ed4245" : "#23a55a", fontSize: "13px" }}>{msg}</div>}
      </div>
<style jsx>{`
  .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 4px; }
  .field-input { background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; width: 100%; outline: none; box-sizing: border-box; }
  .field-input:focus { border-color: #C100FF; }
  .save-btn { background: #C100FF; color: white; border: none; border-radius: 8px; padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.15s; }
  .save-btn:hover { background: #8A2BFF; }
`}</style>
    </div>
  );
}