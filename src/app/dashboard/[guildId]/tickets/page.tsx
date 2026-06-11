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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPanelName, setNewPanelName] = useState("");
  const [creatingPanel, setCreatingPanel] = useState(false);
  const [createError, setCreateError] = useState("");

  const [panelToDelete, setPanelToDelete] = useState<TicketPanel | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deletingPanel, setDeletingPanel] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const res = await fetch(`/api/guilds/${guildId}/tickets`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (data.config) {
          setEnabled(Boolean(data.config.enabled));
          setPanels(Array.isArray(data.config.panels) ? data.config.panels : []);
        }
      } catch (error) {
        console.error("Erro ao carregar tickets:", error);
      } finally {
        setLoading(false);
      }
    }

    if (guildId) {
      loadData();
    }
  }, [guildId]);

  const reloadPanels = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (data.config) {
        setEnabled(Boolean(data.config.enabled));
        setPanels(Array.isArray(data.config.panels) ? data.config.panels : []);
      }
    } catch (error) {
      console.error("Erro ao recarregar painéis:", error);
    }
  };

  const toggleEnabled = async () => {
    if (saving) return;

    const nextEnabled = !enabled;

    setSaving(true);

    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });

      if (!res.ok) {
        throw new Error("Não foi possível alterar o status dos tickets.");
      }

      setEnabled(nextEnabled);
    } catch (error) {
      console.error("Erro ao alterar status dos tickets:", error);
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setCreateError("");
    setNewPanelName("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (creatingPanel) return;

    setShowCreateModal(false);
    setNewPanelName("");
    setCreateError("");
  };

  const createPanel = async () => {
    const name = newPanelName.trim();

    if (!name) {
      setCreateError("Digite um nome para o painel.");
      return;
    }

    if (creatingPanel) return;

    setCreatingPanel(true);
    setCreateError("");

    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets/panels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        /**
         * Mantive mais de um campo para ficar compatível caso sua API esteja
         * esperando "name", "panelName" ou "title".
         */
        body: JSON.stringify({
          name,
          panelName: name,
          title: name,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Não foi possível criar o painel. Verifique a rota da API.",
        );
      }

      /**
       * Compatibilidade com vários formatos de resposta:
       * - data direto sendo o painel
       * - { panel: painel }
       * - { data: painel }
       * - { config: { panels: [...] } }
       */
      const createdPanel =
        data?.panel ||
        data?.data ||
        (data?.id ? data : null);

      if (createdPanel?.id) {
        setPanels((prev) => {
          const alreadyExists = prev.some((panel) => panel.id === createdPanel.id);

          if (alreadyExists) {
            return prev.map((panel) =>
              panel.id === createdPanel.id ? createdPanel : panel,
            );
          }

          return [...prev, createdPanel];
        });
      } else if (Array.isArray(data?.config?.panels)) {
        setPanels(data.config.panels);
      } else {
        await reloadPanels();
      }

      setNewPanelName("");
      setShowCreateModal(false);
    } catch (error) {
      console.error("Erro ao criar painel:", error);

      setCreateError(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao criar painel.",
      );
    } finally {
      setCreatingPanel(false);
    }
  };

  const openDeleteModal = (panel: TicketPanel) => {
    setPanelToDelete(panel);
    setDeleteStep(1);
    setDeleteError("");
  };

  const closeDeleteModal = () => {
    if (deletingPanel) return;

    setPanelToDelete(null);
    setDeleteStep(1);
    setDeleteError("");
  };

  const deletePanel = async () => {
    if (!panelToDelete || deletingPanel) return;

    setDeletingPanel(true);
    setDeleteError("");

    try {
      const res = await fetch(
        `/api/guilds/${guildId}/tickets/panels/${panelToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Não foi possível excluir o painel. Verifique a rota DELETE da API.",
        );
      }

      setPanels((prev) => prev.filter((panel) => panel.id !== panelToDelete.id));
      closeDeleteModal();
    } catch (error) {
      console.error("Erro ao excluir painel:", error);

      setDeleteError(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao excluir painel.",
      );
    } finally {
      setDeletingPanel(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0e0e0e] text-white">
        <div className="rounded-xl border border-[#2b2b2b] bg-[#1a1a1a] px-5 py-4">
          <p className="text-sm text-gray-400">Carregando sistema de tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/${guildId}`)}
              className="rounded-lg border border-[#2b2b2b] bg-[#151515] px-3 py-2 text-sm text-gray-300 transition-colors hover:border-[#C100FF]/60 hover:text-white"
            >
              Voltar
            </button>

            <div>
              <h1 className="text-2xl font-bold">Sistema de Tickets</h1>
              <p className="mt-1 text-sm text-gray-400">
                Ative o sistema e gerencie os painéis de atendimento.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="w-full rounded-lg bg-[#C100FF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#8A2BFF] md:w-auto"
          >
            Criar painel
          </button>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-[#2b2b2b] bg-[#1a1a1a] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="font-semibold">Ativar sistema de tickets</div>

                <div className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
                  Quando ativado, os painéis podem ser enviados no Discord e os
                  usuários poderão abrir tickets conforme as configurações de
                  cada painel.
                </div>

                <div className="mt-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      enabled
                        ? "border-green-400/20 bg-green-400/10 text-green-300"
                        : "border-gray-500/20 bg-gray-500/10 text-gray-400"
                    }`}
                  >
                    {enabled ? "Sistema ativo" : "Sistema desativado"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleEnabled}
                disabled={saving}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                  enabled ? "bg-[#C100FF]" : "bg-[#2b2b2b]"
                }`}
                aria-label={
                  enabled
                    ? "Desativar sistema de tickets"
                    : "Ativar sistema de tickets"
                }
              >
                <div
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                    enabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-[#2b2b2b] bg-[#1a1a1a] p-5">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold">Painéis criados</h2>

                <p className="mt-1 text-sm text-gray-400">
                  Clique em um painel para abrir as configurações detalhadas.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full border border-[#C100FF]/30 bg-[#C100FF]/10 px-3 py-1 text-xs text-[#C100FF]">
                  {panels.length} painel{panels.length === 1 ? "" : "éis"}
                </span>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-xs font-medium text-gray-200 transition-colors hover:border-[#C100FF]/70 hover:text-white"
                >
                  Novo
                </button>
              </div>
            </div>

            {!enabled ? (
              <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-8 text-center">
                <p className="text-sm text-gray-300">
                  O sistema de tickets está desativado.
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Você ainda pode criar painéis, mas precisa ativar o sistema
                  para usar os tickets no servidor.
                </p>
              </div>
            ) : panels.length === 0 ? (
              <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-8 text-center">
                <p className="text-sm text-gray-300">Nenhum painel criado.</p>

                <p className="mt-2 text-xs text-gray-500">
                  Clique em "Criar painel" para configurar seu primeiro painel
                  de atendimento.
                </p>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 rounded-lg bg-[#C100FF] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8A2BFF]"
                >
                  Criar primeiro painel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {panels.map((panel) => (
                  <div
                    key={panel.id}
                    className="group rounded-xl border border-[#2b2b2b] bg-[#111111] p-4 transition-all duration-200 hover:border-[#C100FF]/70 hover:bg-[#171017]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/dashboard/${guildId}/tickets/${panel.id}`)
                      }
                      className="block w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-white">
                            {panel.name}
                          </h3>

                          <p className="mt-1 text-xs text-gray-400">
                            {panel.sendType || "button"} •{" "}
                            {panel.enabled ? "Ativo" : "Inativo"}
                          </p>
                        </div>

                        <span className="text-3xl font-bold leading-none text-gray-400 transition-colors group-hover:text-[#C100FF]">
                          ›
                        </span>
                      </div>
                    </button>

                    <div className="mt-4 flex items-center justify-between border-t border-[#2b2b2b] pt-3">
                      <span className="text-xs text-gray-500">
                        ID: {panel.id.slice(0, 8)}
                      </span>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(panel)}
                        className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:border-red-400/50 hover:bg-red-400/20 hover:text-red-200"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-[#2b2b2b] bg-[#1a1a1a] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold">Criar novo painel</h3>

            <p className="mt-1 text-sm leading-6 text-gray-400">
              Escolha um nome para identificar esse painel dentro do dashboard.
              Depois você poderá abrir o painel para configurar mensagem,
              botões, formulários e permissões.
            </p>

            {createError && (
              <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                {createError}
              </div>
            )}

            <input
              type="text"
              value={newPanelName}
              onChange={(e) => {
                setNewPanelName(e.target.value);
                setCreateError("");
              }}
              placeholder="Exemplo: Suporte Geral"
              className="
                mt-4 w-full rounded-lg border border-[#2b2b2b] bg-[#0e0e0e]
                px-4 py-2.5 text-white placeholder:text-gray-500
                focus:border-[#C100FF] focus:outline-none
              "
              autoFocus
              disabled={creatingPanel}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createPanel();
                }

                if (e.key === "Escape") {
                  closeCreateModal();
                }
              }}
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creatingPanel}
                className="rounded-lg bg-[#2b2b2b] px-4 py-2 text-sm text-white transition-colors hover:bg-[#3b3b3b] disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={createPanel}
                disabled={creatingPanel || !newPanelName.trim()}
                className="rounded-lg bg-[#C100FF] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#8A2BFF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingPanel ? "Criando..." : "Criar painel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {panelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-red-400/20 bg-[#1a1a1a] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              Excluir painel
            </h3>

            {deleteStep === 1 ? (
              <>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Você está tentando excluir o painel{" "}
                  <strong className="text-white">{panelToDelete.name}</strong>.
                  Essa ação pode remover as configurações desse painel de tickets.
                </p>

                <div className="mt-4 rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-3 text-sm leading-6 text-yellow-200">
                  Confirmação 1 de 2: revise se este é realmente o painel que
                  você deseja apagar.
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="rounded-lg bg-[#2b2b2b] px-4 py-2 text-sm text-white transition-colors hover:bg-[#3b3b3b]"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteStep(2)}
                    className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/20"
                  >
                    Continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Última confirmação. Ao clicar em excluir definitivamente, o
                  painel{" "}
                  <strong className="text-white">{panelToDelete.name}</strong>{" "}
                  será removido.
                </p>

                {deleteError && (
                  <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                    {deleteError}
                  </div>
                )}

                <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm leading-6 text-red-200">
                  Confirmação 2 de 2: essa ação não deve ser usada sem ter
                  certeza.
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteStep(1)}
                    disabled={deletingPanel}
                    className="rounded-lg bg-[#2b2b2b] px-4 py-2 text-sm text-white transition-colors hover:bg-[#3b3b3b] disabled:opacity-60"
                  >
                    Voltar
                  </button>

                  <button
                    type="button"
                    onClick={deletePanel}
                    disabled={deletingPanel}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                  >
                    {deletingPanel ? "Excluindo..." : "Excluir definitivamente"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}