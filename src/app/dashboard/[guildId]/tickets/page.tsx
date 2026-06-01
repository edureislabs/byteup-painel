"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface TicketPanel {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  sendType: string;
  createdAt: string;
}

export default function TicketsPage() {
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;

  const [enabled, setEnabled] = useState(false);
  const [panels, setPanels] = useState<TicketPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newPanelName, setNewPanelName] = useState("");

  useEffect(() => {
    async function loadData() {
      const res = await fetch(`/api/guilds/${guildId}/tickets`);
      const data = await res.json();
      if (data.config) {
        setEnabled(data.config.enabled);
        setPanels(data.config.panels || []);
      }
      setLoading(false);
    }
    loadData();
  }, [guildId]);

  const toggleEnabled = async () => {
    setSaving(true);
    await fetch(`/api/guilds/${guildId}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    setEnabled(!enabled);
    setSaving(false);
  };

  const createPanel = async () => {
    if (!newPanelName.trim()) return;
    const res = await fetch(`/api/guilds/${guildId}/tickets/panels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPanelName }),
    });
    const data = await res.json();
    if (data.id) {
      setPanels([...panels, data]);
      setNewPanelName("");
      setShowModal(false);
    }
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
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push(`/dashboard/${guildId}`)} className="text-gray-400 hover:text-white transition-colors">
            ← Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold">Sistema de Tickets</h1>
            <p className="text-gray-400 text-sm">Configure painéis de atendimento</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2b2b2b]">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">Ativar sistema de tickets</div>
                <div className="text-sm text-gray-400">Habilita a criação de tickets no servidor</div>
              </div>
              <button
                onClick={toggleEnabled}
                disabled={saving}
                className={`w-11 h-6 rounded-full transition-colors ${enabled ? "bg-[#C100FF]" : "bg-[#2b2b2b]"} relative`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${enabled ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          {enabled && (
            <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2b2b2b]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Painéis de Ticket</h2>
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-[#C100FF] hover:bg-[#8A2BFF] text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  + Criar Painel
                </button>
              </div>

              {panels.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>Nenhum painel criado</p>
                  <p className="text-xs mt-1">Clique em "Criar Painel" para começar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {panels.map((panel) => (
                    <div
                      key={panel.id}
                      onClick={() => router.push(`/dashboard/${guildId}/tickets/${panel.id}`)}
                      className="bg-[#0e0e0e] rounded-lg p-4 cursor-pointer hover:bg-[#1a1a1a] transition-colors border border-[#2b2b2b] hover:border-[#C100FF]/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{panel.name}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {panel.sendType} • {panel.enabled ? "Ativo" : "Inativo"}
                          </div>
                        </div>
                        <span className="text-gray-400">→</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] rounded-xl p-6 w-full max-w-md border border-[#2b2b2b]">
            <h3 className="text-lg font-semibold mb-4">Criar Novo Painel</h3>
            <input
              type="text"
              value={newPanelName}
              onChange={(e) => setNewPanelName(e.target.value)}
              placeholder="Nome do painel"
              className="w-full bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-4 py-2 mb-4 focus:outline-none focus:border-[#C100FF]"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && createPanel()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowModal(false); setNewPanelName(""); }}
                className="px-4 py-2 bg-[#2b2b2b] hover:bg-[#3b3b3b] rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createPanel}
                className="px-4 py-2 bg-[#C100FF] hover:bg-[#8A2BFF] rounded-lg text-sm transition-colors"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}