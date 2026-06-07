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

interface OptionCard {
  id: string;
  title: string;
  description: string;
  disabled?: boolean;
}

const GENERAL_OPTIONS: OptionCard[] = [
  {
    id: "geral",
    title: "Em geral",
    description: "Equipe de suporte e outros itens gerais",
  },
  {
    id: "ticket",
    title: "Ticket",
    description: "Opções gerais de tickets",
  },
  {
    id: "moderador",
    title: "Moderador",
    description: "Opções de mensagem do moderador",
  },
  {
    id: "permissoes",
    title: "Permissões",
    description: "Opções de permissão",
  },
  {
    id: "botoes",
    title: "Botões",
    description: "Lista de acesso rápido a todos os botões",
  },
  {
    id: "mensagens",
    title: "Mensagens",
    description: "Lista de acesso rápido a todas as mensagens",
  },
  {
    id: "aumentar",
    title: "Aumentar",
    description: "Opções de escalonamento",
  },
];

const PANEL_OPTIONS: OptionCard[] = [
  {
    id: "painel",
    title: "Painel",
    description: "Opções para a mensagem usada para criar tickets",
  },
  {
    id: "comando",
    title: "Estilo de comando",
    description: "Opções para criar tickets usando comandos.",
  },
  {
    id: "dropdown",
    title: "Estilo DropDown",
    description: "Opções para criar tickets usando menu de seleção.",
  },
  {
    id: "linha",
    title: "Estilo de linha ",
    description: "Use o formato de tópicos para os tickets.",
  },
  {
    id: "formularios",
    title: "Formulários",
    description: "Opções do formulário",
  },
];

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
      try {
        const res = await fetch(`/api/guilds/${guildId}/tickets`);
        const data = await res.json();

        if (data.config) {
          setEnabled(data.config.enabled);
          setPanels(data.config.panels || []);
        }
      } catch (error) {
        console.error("Erro ao carregar tickets:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [guildId]);

  const toggleEnabled = async () => {
    setSaving(true);

    try {
      await fetch(`/api/guilds/${guildId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });

      setEnabled(!enabled);
    } catch (error) {
      console.error("Erro ao alterar status dos tickets:", error);
    } finally {
      setSaving(false);
    }
  };

  const createPanel = async () => {
    if (!newPanelName.trim()) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets/panels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPanelName }),
      });

      const data = await res.json();

      if (data.id) {
        setPanels((prev) => [...prev, data]);
        setNewPanelName("");
        setShowModal(false);
      }
    } catch (error) {
      console.error("Erro ao criar painel:", error);
    }
  };

  const ConfigCard = ({ option }: { option: OptionCard }) => {
    return (
      <button
        type="button"
        disabled={option.disabled}
        className="
          group flex min-h-[74px] w-full items-center justify-between rounded-xl
          border border-[#2b2b2b] bg-[#111111] px-4 py-3 text-left
          transition-all duration-200
          hover:border-[#C100FF]/70 hover:bg-[#171017]
          disabled:cursor-default
        "
      >
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">
            {option.title}
          </h3>

          <p className="mt-1 line-clamp-2 text-xs text-gray-400">
            {option.description}
          </p>
        </div>

        <span className="ml-4 text-3xl font-bold leading-none text-gray-300 transition-colors group-hover:text-[#C100FF]">
          ›
        </span>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0e0e0e] text-white">
        <p className="text-gray-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <div className="mx-auto max-w-7xl p-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.push(`/dashboard/${guildId}`)}
            className="text-gray-400 transition-colors hover:text-white"
          >
            ← Voltar
          </button>

          <div>
            <h1 className="text-2xl font-bold">Sistema de Tickets</h1>
            <p className="text-sm text-gray-400">
              Configure painéis de atendimento
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Status */}
          <div className="rounded-xl border border-[#2b2b2b] bg-[#1a1a1a] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">Ativar sistema de tickets</div>
                <div className="mt-1 text-sm text-gray-400">
                  Habilita a criação de tickets no servidor
                </div>
              </div>

              <button
                onClick={toggleEnabled}
                disabled={saving}
                className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-60 ${
                  enabled ? "bg-[#C100FF]" : "bg-[#2b2b2b]"
                }`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    enabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Opções gerais */}
          <section className="rounded-xl border border-[#2b2b2b] bg-[#1a1a1a] p-5">
            <div className="mb-4">
              <h2 className="font-semibold">Opções gerais de tickets</h2>
              <p className="mt-1 text-sm text-gray-400">
                Ajustes principais do sistema de atendimento.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {GENERAL_OPTIONS.map((option) => (
                <ConfigCard key={option.id} option={option} />
              ))}
            </div>
          </section>

          {/* Configurações do painel */}
          <section className="rounded-xl border border-[#2b2b2b] bg-[#1a1a1a] p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">Configurações do painel</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Configure como os painéis de ticket serão exibidos.
                </p>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="rounded-lg bg-[#C100FF] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8A2BFF]"
              >
                + Criar Painel
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {PANEL_OPTIONS.map((option) => (
                <ConfigCard key={option.id} option={option} />
              ))}
            </div>
          </section>

          {/* Painéis criados */}
          <section className="rounded-xl border border-[#2b2b2b] bg-[#1a1a1a] p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">Painéis criados</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Clique em um painel para editar suas configurações.
                </p>
              </div>

              <span className="rounded-full border border-[#C100FF]/30 bg-[#C100FF]/10 px-3 py-1 text-xs text-[#C100FF]">
                {panels.length} painel{panels.length === 1 ? "" : "éis"}
              </span>
            </div>

            {!enabled ? (
              <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-6 text-center">
                <p className="text-sm text-gray-400">
                  O sistema de tickets está desativado.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Ative o sistema para gerenciar os painéis.
                </p>
              </div>
            ) : panels.length === 0 ? (
              <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-6 text-center">
                <p className="text-sm text-gray-400">Nenhum painel criado</p>
                <p className="mt-1 text-xs text-gray-500">
                  Clique em "Criar Painel" para começar
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {panels.map((panel) => (
                  <button
                    key={panel.id}
                    onClick={() =>
                      router.push(`/dashboard/${guildId}/tickets/${panel.id}`)
                    }
                    className="
                      group flex min-h-[74px] w-full items-center justify-between rounded-xl
                      border border-[#2b2b2b] bg-[#111111] px-4 py-3 text-left
                      transition-all duration-200
                      hover:border-[#C100FF]/70 hover:bg-[#171017]
                    "
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-white">
                        {panel.name}
                      </h3>

                      <p className="mt-1 text-xs text-gray-400">
                        {panel.sendType} • {panel.enabled ? "Ativo" : "Inativo"}
                      </p>
                    </div>

                    <span className="ml-4 text-3xl font-bold leading-none text-gray-300 transition-colors group-hover:text-[#C100FF]">
                      ›
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-[#2b2b2b] bg-[#1a1a1a] p-6 shadow-2xl">
            <h3 className="mb-1 text-lg font-semibold">Criar Novo Painel</h3>
            <p className="mb-4 text-sm text-gray-400">
              Escolha um nome para o novo painel de tickets.
            </p>

            <input
              type="text"
              value={newPanelName}
              onChange={(e) => setNewPanelName(e.target.value)}
              placeholder="Nome do painel"
              className="
                mb-4 w-full rounded-lg border border-[#2b2b2b] bg-[#0e0e0e]
                px-4 py-2 text-white placeholder:text-gray-500
                focus:border-[#C100FF] focus:outline-none
              "
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && createPanel()}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewPanelName("");
                }}
                className="rounded-lg bg-[#2b2b2b] px-4 py-2 text-sm text-white transition-colors hover:bg-[#3b3b3b]"
              >
                Cancelar
              </button>

              <button
                onClick={createPanel}
                className="rounded-lg bg-[#C100FF] px-4 py-2 text-sm text-white transition-colors hover:bg-[#8A2BFF]"
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