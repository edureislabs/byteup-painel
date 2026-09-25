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

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function EditPanelPage() {
  const params = useParams();
  const router = useRouter();

  const guildId = params.guildId as string;
  const panelId = params.panelId as string;

  const [activeTab, setActiveTab] = useState("geral");
  const [panel, setPanel] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

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
    if (saveStatus !== "saved" && saveStatus !== "error") return;

    const timeout = setTimeout(
      () => {
        setSaveStatus("idle");
      },
      saveStatus === "saved" ? 2000 : 3000
    );

    return () => clearTimeout(timeout);
  }, [saveStatus]);

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
    setSaveStatus("saving");

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
      setSaveStatus("saved");
    } catch (error) {
      console.error("Erro ao salvar painel:", error);
      setSaveStatus("error");
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
              saveStatus={saveStatus}
            />
          )}

          {activeTab === "ticket" && (
            <TicketTab
              panel={panel}
              setPanel={setPanel}
              categories={categories}
              savePanel={savePanel}
              saveStatus={saveStatus}
              onOpenMessages={() => setActiveTab("ticketMessage")}
            />
          )}

          {activeTab === "embed" && (
            <EmbedEditorTab
              guildId={guildId}
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saveStatus={saveStatus}
            />
          )}

          {activeTab === "ticketMessage" && (
            <TicketMessageTab
              guildId={guildId}
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saveStatus={saveStatus}
            />
          )}

          {activeTab === "moderador" && (
            <ModeratorTab
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saveStatus={saveStatus}
            />
          )}

          {activeTab === "permissoes" && (
            <PermissionsTab
              guildId={guildId}
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saveStatus={saveStatus}
            />
          )}

          {activeTab === "formularios" && (
            <FormsTab
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saveStatus={saveStatus}
            />
          )}

          {activeTab === "limites" && (
            <LimitsTab
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saveStatus={saveStatus}
            />
          )}

          {activeTab === "mensagens" && (
            <MessagesConfigTab
              panel={panel}
              setPanel={setPanel}
              savePanel={savePanel}
              saveStatus={saveStatus}
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
    </div>
  );
}