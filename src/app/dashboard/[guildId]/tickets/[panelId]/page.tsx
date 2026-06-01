"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditPanelPage() {
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;
  const panelId = params.panelId as string;

  const [activeTab, setActiveTab] = useState("geral");
  const [panel, setPanel] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const tabs = [
    { id: "geral", label: "Geral" },
    { id: "mensagens", label: "Mensagens" },
    { id: "botoes", label: "Botões" },
    { id: "moderador", label: "Moderador" },
    { id: "permissoes", label: "Permissões" },
    { id: "formularios", label: "Formulários" },
    { id: "transcricao", label: "Transcrição" },
    { id: "automacao", label: "Automação" },
    { id: "limites", label: "Limites" },
  ];

  useEffect(() => {
    async function loadPanel() {
      try {
        const [panelRes, channelsRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/tickets/panels/${panelId}`),
          fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' })
        ]);
        
        if (panelRes.ok) {
          const panelData = await panelRes.json();
          setPanel(panelData);
        }
        
        if (channelsRes.ok) {
          const channelsData = await channelsRes.json();
          setChannels(Array.isArray(channelsData) ? channelsData : []);
        }
      } catch (error) {
        console.error("Erro:", error);
      }
      
      setLoading(false);
    }
    loadPanel();
  }, [guildId, panelId]);

  const savePanel = async (updates: any) => {
    setSaving(true);
    const res = await fetch(`/api/guilds/${guildId}/tickets/panels/${panelId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    setPanel(data);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => router.push(`/dashboard/${guildId}/tickets`)} className="text-gray-400 hover:text-white transition-colors">
            ← Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold">{panel?.name || "Painel"}</h1>
            <p className="text-gray-400 text-sm">Configurações do painel de ticket</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-[#C100FF] text-white"
                  : "bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#2b2b2b]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2b2b2b]">
          {activeTab === "geral" && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg">Configurações Gerais</h3>
              
              <div>
                <label className="text-sm text-gray-400">Nome do Painel</label>
                <input
                  type="text"
                  value={panel?.name || ""}
                  onChange={(e) => setPanel({ ...panel, name: e.target.value })}
                  className="w-full bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-4 py-2 mt-1 focus:outline-none focus:border-[#C100FF]"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Descrição</label>
                <textarea
                  value={panel?.description || ""}
                  onChange={(e) => setPanel({ ...panel, description: e.target.value })}
                  rows={3}
                  className="w-full bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-4 py-2 mt-1 resize-none focus:outline-none focus:border-[#C100FF]"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Canal do Ticket</label>
                <select
                  value={panel?.channelId || ""}
                  onChange={(e) => setPanel({ ...panel, channelId: e.target.value || null })}
                  className="w-full bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-4 py-2 mt-1 focus:outline-none focus:border-[#C100FF]"
                >
                  <option value="">— Nenhum —</option>
                  {channels?.filter((c: any) => c.type === 0).map((c: any) => (
                    <option key={c.id} value={c.id}>#{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-[#0e0e0e] rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm">Fechar em duas etapas</div>
                    <div className="text-xs text-gray-400 mt-1">Ao fechar, exibe confirmação antes de realmente fechar o ticket</div>
                  </div>
                  <button
                    onClick={() => setPanel({ ...panel, closeInTwoSteps: !panel?.closeInTwoSteps })}
                    className={`w-11 h-6 rounded-full transition-colors ${panel?.closeInTwoSteps ? "bg-[#C100FF]" : "bg-[#2b2b2b]"} relative flex-shrink-0`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${panel?.closeInTwoSteps ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Preenchimento da Contagem ({`{count}`})</label>
                <p className="text-xs text-gray-500 mt-1 mb-2">Quantidade de dígitos para o número do ticket (0-20)</p>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={panel?.ticketPadding ?? 4}
                  onChange={(e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val)) val = 0;
                    if (val > 20) val = 20;
                    if (val < 0) val = 0;
                    setPanel({ ...panel, ticketPadding: val });
                  }}
                  className="w-32 bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-4 py-2 mt-1 focus:outline-none focus:border-[#C100FF]"
                />
                <div className="mt-2 text-xs text-gray-500">
                  <p>Exemplo com contagem <strong>57</strong>: <code className="bg-[#2b2b2b] px-1 rounded">{String(57).padStart(panel?.ticketPadding || 4, '0')}</code></p>
                  <p>Exemplo com contagem <strong>7</strong>: <code className="bg-[#2b2b2b] px-1 rounded">{String(7).padStart(panel?.ticketPadding || 4, '0')}</code></p>
                </div>
              </div>

              <button
                onClick={() => savePanel({
                  name: panel?.name,
                  description: panel?.description,
                  channelId: panel?.channelId,
                  closeInTwoSteps: panel?.closeInTwoSteps,
                  ticketPadding: panel?.ticketPadding,
                })}
                disabled={saving}
                className="bg-[#C100FF] hover:bg-[#8A2BFF] text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          )}

          {activeTab !== "geral" && (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg">Em breve</p>
              <p className="text-sm">Esta seção será implementada em breve.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}