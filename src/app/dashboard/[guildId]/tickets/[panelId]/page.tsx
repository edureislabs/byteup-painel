"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import GeneralTab from "./components/GeneralTab";
import TicketTab from "./components/TicketTab";
import EmbedEditorTab from "./components/EmbedEditorTab";
import ModeratorTab from "./components/ModeratorTab";
import TicketMessageTab from "./components/TicketMessageTab";
import PermissionsTab from "./components/PermissionsTab";
import FormsTab from "./components/FormsTab";
import LimitsTab from "./components/LimitsTab";
import MessagesConfigTab from "./components/MessagesConfigTab";

type ToastType = "success" | "error" | "info";

type Toast = {
  type: ToastType;
  message: string;
  id: number;
};

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
  const [categories, setCategories] = useState<any[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);

  const tabs = [
    { id: "geral", label: "Geral" },
    { id: "ticket", label: "Ticket" },
    { id: "embed", label: "Editor de Embed" },
    { id: "ticketMessage", label: "Mensagem do Ticket" },
    { id: "moderador", label: "Moderador" },
    { id: "permissoes", label: "Permissões" },
    { id: "formularios", label: "Formulários" },
    { id: "limites", label: "Limites" },
    { id: "mensagens", label: "Mensagens" },
  ];

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    async function loadPanel() {
      try {
        const [panelRes, channelsRes, categoriesRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/tickets/panels/${panelId}`),
          fetch(`/api/guilds/${guildId}/channels`, {
            credentials: "include",
          }),
          fetch(`/api/guilds/${guildId}/categories`, {
            credentials: "include",
          }),
        ]);

        if (panelRes.ok) {
          const panelData = await panelRes.json();
          setPanel(panelData);
        }

        if (channelsRes.ok) {
          const channelsData = await channelsRes.json();
          setChannels(Array.isArray(channelsData) ? channelsData : []);
        }

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPanel();
  }, [guildId, panelId]);

  const savePanel = async (updates: any) => {
    setSaving(true);

    try {
      const res = await fetch(
        `/api/guilds/${guildId}/tickets/panels/${panelId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar painel");
      }

      setPanel(data);
      setToast({
        type: "success",
        message: "Salvo com sucesso!",
        id: Date.now(),
      });
    } catch (error) {
      console.error("Erro ao salvar painel:", error);
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Erro ao salvar painel",
        id: Date.now(),
      });
    } finally {
      setSaving(false);
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
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push(`/dashboard/${guildId}/tickets`)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Voltar
          </button>

          <div>
            <h1 className="text-2xl font-bold">{panel?.name || "Painel"}</h1>
            <p className="text-gray-400 text-sm">
              Configurações do painel de ticket
            </p>
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
            <GeneralTab
              panel={panel}
              setPanel={setPanel}
              channels={channels}
              savePanel={savePanel}
              saving={saving}
            />
          )}

          {activeTab === "ticket" && (
            <TicketTab
              panel={panel}
              setPanel={setPanel}
              categories={categories}
              savePanel={savePanel}
              saving={saving}
              onOpenMessages={() => setActiveTab("ticketMessage")}
            />
          )}

          {activeTab === "embed" && (
            <EmbedEditorTab
              guildId={guildId}
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saving={saving}
            />
          )}

          {activeTab === "ticketMessage" && (
            <TicketMessageTab
              guildId={guildId}
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saving={saving}
            />
          )}

          {activeTab === "moderador" && (
            <ModeratorTab
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saving={saving}
            />
          )}

          {activeTab === "permissoes" && (
            <PermissionsTab
              guildId={guildId}
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saving={saving}
            />
          )}

          {activeTab === "formularios" && (
            <FormsTab
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saving={saving}
            />
          )}

          {activeTab === "limites" && (
            <LimitsTab
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saving={saving}
            />
          )}

          {activeTab === "mensagens" && (
            <MessagesConfigTab
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saving={saving}
            />
          )}

          {![
            "geral",
            "ticket",
            "embed",
            "ticketMessage",
            "moderador",
            "permissoes",
            "formularios",
            "limites",
            "mensagens",
          ].includes(activeTab) && (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg">Em breve</p>
              <p className="text-sm">
                Esta seção será implementada em breve.
              </p>
            </div>
          )}
        </div>
      </div>

      {toast && <ToastView toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function ToastView({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  const colors: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: {
      bg: "#0f2a1a",
      border: "#22c55e",
      text: "#86efac",
    },
    error: {
      bg: "#2a0f0f",
      border: "#ef4444",
      text: "#fca5a5",
    },
    info: {
      bg: "#0f1a2a",
      border: "#3b82f6",
      text: "#93c5fd",
    },
  };

  const c = colors[toast.type];

  const icon =
    toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ";

  return (
    <div
      key={toast.id}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        minWidth: "280px",
        maxWidth: "420px",
        padding: "14px 18px",
        background: c.bg,
        border: `1px solid ${c.border}40`,
        borderLeft: `3px solid ${c.border}`,
        borderRadius: "10px",
        color: c.text,
        fontFamily: "DM Sans, sans-serif",
        fontSize: "14px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        animation: "toast-slide-in 0.25s ease-out",
      }}
    >
      <div
        style={{
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          background: `${c.border}30`,
          border: `1px solid ${c.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "12px",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</div>

      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: c.text,
          opacity: 0.6,
          cursor: "pointer",
          fontSize: "16px",
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>

      <style jsx>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}