"use client";

import { useState } from "react";

interface MessagesConfigTabProps {
  panel: any;
  setPanel: (panel: any) => void;
  savePanel: (updates: any) => Promise<void>;
  saving: boolean;
}

type MessageMode = "text" | "embed";

interface MessageEmbedConfig {
  color: string;
  title: string;
  description: string;
  footerText: string;
  timestamp: boolean;
}

interface MessageConfig {
  mode: MessageMode;
  content: string;
  embed: MessageEmbedConfig;
}

interface MessageItem {
  key: string;
  label: string;
  description: string;
  defaultContent: string;
  defaultEmbedTitle: string;
  variables: string[];
}

interface MessageGroup {
  title: string;
  description: string;
  items: MessageItem[];
}

const VARIABLES = [
  "{user}",
  "{username}",
  "{server}",
  "{channel}",
  "{ticketId}",
  "{panel}",
  "{staff}",
  "{member}",
  "{reason}",
  "{oldName}",
  "{newName}",
  "{time}",
  "{limit}",
  "{cooldown}",
  "{count}",
];

const MESSAGE_GROUPS: MessageGroup[] = [
  {
    title: "Abertura do ticket",
    description: "Mensagens enviadas ao usuário durante a abertura do ticket.",
    items: [
      {
        key: "panelNotFound",
        label: "Painel não encontrado",
        description: "Quando o painel não existe ou está desativado.",
        defaultContent: "Painel não encontrado ou desativado.",
        defaultEmbedTitle: "Painel não encontrado",
        variables: ["{user}", "{server}", "{panel}"],
      },
      {
        key: "invalidPanelChannel",
        label: "Canal do painel inválido",
        description: "Quando o canal configurado para enviar o painel não é válido.",
        defaultContent: "Canal do painel inválido.",
        defaultEmbedTitle: "Canal inválido",
        variables: ["{server}", "{panel}"],
      },
      {
        key: "ticketCreatedReply",
        label: "Ticket criado com sucesso",
        description: "Resposta privada enviada quando o ticket é criado.",
        defaultContent: "Ticket criado com sucesso: {channel}",
        defaultEmbedTitle: "Ticket criado",
        variables: ["{user}", "{username}", "{channel}", "{ticketId}", "{panel}"],
      },
      {
        key: "ticketAlreadyOpen",
        label: "Usuário já possui ticket aberto",
        description: "Quando o usuário já tem um ticket aberto neste painel.",
        defaultContent: "Você já possui um ticket aberto: {channel}",
        defaultEmbedTitle: "Ticket já aberto",
        variables: ["{user}", "{channel}", "{ticketId}", "{panel}"],
      },
      {
        key: "userBlocked",
        label: "Usuário bloqueado",
        description: "Quando o usuário está bloqueado de abrir tickets.",
        defaultContent: "Você está bloqueado de abrir tickets neste painel.",
        defaultEmbedTitle: "Acesso bloqueado",
        variables: ["{user}", "{panel}"],
      },
      {
        key: "roleBlocked",
        label: "Cargo bloqueado",
        description: "Quando o usuário possui um cargo bloqueado.",
        defaultContent: "Você possui um cargo bloqueado para abrir tickets neste painel.",
        defaultEmbedTitle: "Cargo bloqueado",
        variables: ["{user}", "{panel}"],
      },
      {
        key: "ticketLimitReached",
        label: "Limite de tickets por usuário",
        description: "Quando o usuário atingiu o limite de tickets abertos.",
        defaultContent: "Você atingiu o limite de {limit} ticket(s) aberto(s).",
        defaultEmbedTitle: "Limite atingido",
        variables: ["{user}", "{limit}", "{panel}"],
      },
      {
        key: "panelLimitReached",
        label: "Limite máximo do painel",
        description: "Quando o painel atingiu o máximo de tickets abertos.",
        defaultContent: "Este painel atingiu o limite máximo de tickets abertos.",
        defaultEmbedTitle: "Painel cheio",
        variables: ["{panel}", "{limit}"],
      },
      {
        key: "cooldownActive",
        label: "Cooldown ativo",
        description: "Quando o usuário precisa aguardar para abrir outro ticket.",
        defaultContent: "Você precisa aguardar mais {cooldown} para abrir outro ticket neste painel.",
        defaultEmbedTitle: "Aguarde um pouco",
        variables: ["{user}", "{cooldown}", "{panel}"],
      },
      {
        key: "dailyLimitReached",
        label: "Limite diário atingido",
        description: "Quando o usuário atingiu o limite diário de tickets.",
        defaultContent: "Você atingiu o limite diário de {limit} ticket(s) neste painel.",
        defaultEmbedTitle: "Limite diário atingido",
        variables: ["{user}", "{limit}", "{panel}"],
      },
    ],
  },
  {
    title: "Ações de moderador",
    description: "Mensagens dos botões e ações dentro do ticket.",
    items: [
      {
        key: "noPermission",
        label: "Sem permissão",
        description: "Quando alguém tenta executar uma ação sem permissão.",
        defaultContent: "Você não tem permissão para executar esta ação.",
        defaultEmbedTitle: "Sem permissão",
        variables: ["{user}", "{staff}", "{panel}"],
      },
      {
        key: "ticketClaimed",
        label: "Ticket assumido",
        description: "Mensagem enviada quando um staff assume o ticket.",
        defaultContent: "{staff} assumiu este atendimento.",
        defaultEmbedTitle: "Ticket assumido",
        variables: ["{user}", "{staff}", "{ticketId}", "{panel}"],
      },
      {
        key: "ownerCannotClaim",
        label: "Dono não pode assumir",
        description: "Quando o dono do ticket tenta assumir o próprio ticket.",
        defaultContent: "O dono do ticket não pode assumir o próprio atendimento.",
        defaultEmbedTitle: "Ação não permitida",
        variables: ["{user}", "{ticketId}"],
      },
      {
        key: "memberAdded",
        label: "Membro adicionado",
        description: "Quando um membro é adicionado ao ticket.",
        defaultContent: "{member} foi adicionado ao ticket por {staff}.",
        defaultEmbedTitle: "Membro adicionado",
        variables: ["{member}", "{staff}", "{ticketId}"],
      },
      {
        key: "memberRemoved",
        label: "Membro removido",
        description: "Quando um membro é removido do ticket.",
        defaultContent: "{member} foi removido do ticket por {staff}.",
        defaultEmbedTitle: "Membro removido",
        variables: ["{member}", "{staff}", "{ticketId}"],
      },
      {
        key: "memberNotInTicket",
        label: "Membro não está no ticket",
        description: "Quando tentam remover alguém que não está no ticket.",
        defaultContent: "Esse usuário não está adicionado diretamente neste ticket.",
        defaultEmbedTitle: "Membro não encontrado",
        variables: ["{member}", "{ticketId}"],
      },
      {
        key: "cannotRemoveOwner",
        label: "Não pode remover dono",
        description: "Quando tentam remover o dono do ticket.",
        defaultContent: "Você não pode remover o dono do ticket.",
        defaultEmbedTitle: "Ação não permitida",
        variables: ["{user}", "{ticketId}"],
      },
      {
        key: "ticketRenamed",
        label: "Ticket renomeado",
        description: "Quando o canal do ticket é renomeado.",
        defaultContent: "Este ticket foi renomeado por {staff}: {oldName} → {newName}",
        defaultEmbedTitle: "Ticket renomeado",
        variables: ["{staff}", "{oldName}", "{newName}", "{ticketId}"],
      },
      {
        key: "invalidTicketName",
        label: "Nome inválido",
        description: "Quando o novo nome do ticket é inválido.",
        defaultContent: "Nome inválido. Tente usar letras, números, hífen ou underline.",
        defaultEmbedTitle: "Nome inválido",
        variables: ["{staff}", "{ticketId}"],
      },
    ],
  },
  {
    title: "Fechamento",
    description: "Mensagens usadas no fechamento de tickets.",
    items: [
      {
        key: "closeConfirm",
        label: "Confirmar fechamento",
        description: "Mensagem da confirmação antes de fechar o ticket.",
        defaultContent:
          "Tem certeza que deseja fechar este ticket?\n\nEssa ação irá gerar o transcript e deletar o canal.",
        defaultEmbedTitle: "Confirmar fechamento",
        variables: ["{user}", "{staff}", "{ticketId}"],
      },
      {
        key: "closeCancel",
        label: "Fechamento cancelado",
        description: "Quando alguém cancela a confirmação de fechamento.",
        defaultContent: "Fechamento do ticket cancelado.",
        defaultEmbedTitle: "Fechamento cancelado",
        variables: ["{user}", "{staff}", "{ticketId}"],
      },
      {
        key: "ticketClosed",
        label: "Ticket fechado",
        description: "Mensagem enviada quando o ticket é fechado.",
        defaultContent: "Ticket fechado. O canal será deletado em 5 segundos.",
        defaultEmbedTitle: "Ticket fechado",
        variables: ["{user}", "{staff}", "{ticketId}"],
      },
      {
        key: "ticketAlreadyClosed",
        label: "Ticket já fechado",
        description: "Quando tentam interagir com um ticket fechado.",
        defaultContent: "Este ticket já está fechado.",
        defaultEmbedTitle: "Ticket fechado",
        variables: ["{ticketId}"],
      },
      {
        key: "inactiveClosed",
        label: "Fechado por inatividade",
        description: "Quando o ticket é fechado automaticamente por inatividade.",
        defaultContent:
          "Este ticket foi fechado automaticamente por inatividade de {time}.",
        defaultEmbedTitle: "Ticket fechado por inatividade",
        variables: ["{user}", "{time}", "{ticketId}"],
      },
    ],
  },
  {
    title: "Call temporária",
    description: "Mensagens relacionadas à call temporária do ticket.",
    items: [
      {
        key: "temporaryCallCreated",
        label: "Call criada",
        description: "Quando uma call temporária é criada.",
        defaultContent:
          "{channel} foi criada por {staff}. Ela será deletada automaticamente quando ficar vazia.",
        defaultEmbedTitle: "Call temporária criada",
        variables: ["{channel}", "{staff}", "{ticketId}"],
      },
      {
        key: "temporaryCallAlreadyExists",
        label: "Call já existe",
        description: "Quando já existe uma call ativa neste ticket.",
        defaultContent: "Já existe uma call temporária ativa: {channel}",
        defaultEmbedTitle: "Call já existente",
        variables: ["{channel}", "{ticketId}"],
      },
      {
        key: "temporaryCallExpired",
        label: "Call expirada",
        description: "Quando ninguém entra na call em 2 minutos.",
        defaultContent:
          "A call temporária foi deletada porque ninguém entrou em 2 minutos.",
        defaultEmbedTitle: "Call expirada",
        variables: ["{channel}", "{ticketId}"],
      },
      {
        key: "temporaryCallEmpty",
        label: "Call vazia",
        description: "Quando todos saem da call temporária.",
        defaultContent: "A call temporária foi encerrada pois ficou vazia.",
        defaultEmbedTitle: "Call encerrada",
        variables: ["{channel}", "{ticketId}"],
      },
    ],
  },
  {
    title: "Transcript e avaliação",
    description: "Mensagens enviadas no fechamento, transcript e avaliação.",
    items: [
      {
        key: "transcriptDm",
        label: "Transcript no privado",
        description: "Mensagem enviada no privado do usuário com o transcript.",
        defaultContent:
          "Seu ticket foi fechado. O transcript HTML do atendimento está anexado abaixo.",
        defaultEmbedTitle: "Transcript do ticket",
        variables: ["{user}", "{ticketId}", "{panel}"],
      },
      {
        key: "transcriptLog",
        label: "Transcript no log",
        description: "Mensagem enviada no canal de logs com o transcript.",
        defaultContent: "O transcript HTML do ticket está anexado nesta mensagem.",
        defaultEmbedTitle: "Transcript do ticket",
        variables: ["{user}", "{staff}", "{ticketId}", "{panel}"],
      },
      {
        key: "ratingDm",
        label: "Avaliação no privado",
        description: "Mensagem para o usuário avaliar o atendimento.",
        defaultContent:
          "Como foi seu atendimento? Selecione uma nota abaixo para avaliar nossa equipe.",
        defaultEmbedTitle: "Avalie seu atendimento",
        variables: ["{user}", "{ticketId}", "{panel}"],
      },
    ],
  },
];

const DEFAULT_EMBED: MessageEmbedConfig = {
  color: "#C100FF",
  title: "",
  description: "",
  footerText: "Sistema de Tickets",
  timestamp: true,
};

function getDefaultMessage(item: MessageItem): MessageConfig {
  return {
    mode: "text",
    content: item.defaultContent,
    embed: {
      ...DEFAULT_EMBED,
      title: item.defaultEmbedTitle,
      description: item.defaultContent,
    },
  };
}

function parseMessages(value: any) {
  if (!value) return {};

  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return {};
  }
}

function replacePreviewVariables(text: string) {
  return String(text || "")
    .replace(/{user}/g, "@EduNex")
    .replace(/{username}/g, "EduNex")
    .replace(/{server}/g, "ByteUP")
    .replace(/{channel}/g, "#ticket-0001")
    .replace(/{ticketId}/g, "ticket_123")
    .replace(/{panel}/g, "Suporte")
    .replace(/{staff}/g, "@Moderador")
    .replace(/{member}/g, "@Membro")
    .replace(/{reason}/g, "Motivo informado")
    .replace(/{oldName}/g, "ticket-0001")
    .replace(/{newName}/g, "suporte-edunex")
    .replace(/{time}/g, "60 minutos")
    .replace(/{limit}/g, "3")
    .replace(/{cooldown}/g, "10 minutos")
    .replace(/{count}/g, "0001");
}

export default function MessagesConfigTab({
  panel,
  setPanel,
  savePanel,
  saving,
}: MessagesConfigTabProps) {
  const parsedMessages = parseMessages(panel?.messagesJson);
  const [openKey, setOpenKey] = useState<string>(
    MESSAGE_GROUPS[0]?.items[0]?.key || ""
  );

  const getMessage = (item: MessageItem): MessageConfig => {
    return {
      ...getDefaultMessage(item),
      ...(parsedMessages?.[item.key] || {}),
      embed: {
        ...getDefaultMessage(item).embed,
        ...(parsedMessages?.[item.key]?.embed || {}),
      },
    };
  };

  const updateMessages = (nextMessages: any) => {
    setPanel({
      ...(panel || {}),
      messagesJson: nextMessages,
    });
  };

  const updateMessage = (item: MessageItem, updates: Partial<MessageConfig>) => {
    const current = getMessage(item);

    updateMessages({
      ...parsedMessages,
      [item.key]: {
        ...current,
        ...updates,
        embed: {
          ...current.embed,
          ...(updates.embed || {}),
        },
      },
    });
  };

  const resetMessage = (item: MessageItem) => {
    updateMessages({
      ...parsedMessages,
      [item.key]: getDefaultMessage(item),
    });
  };

  const saveMessages = () => {
    savePanel({
      messagesJson: parsedMessages,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Mensagens do sistema</h3>
        <p className="mt-1 text-sm text-gray-400">
          Personalize todas as mensagens automáticas do sistema de tickets,
          incluindo erros, avisos, ações de moderador, fechamento, call,
          transcript e avaliação.
        </p>
      </div>

      <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5">
        <h4 className="font-semibold text-white">Variáveis disponíveis</h4>

        <div className="mt-3 flex flex-wrap gap-2">
          {VARIABLES.map((variable) => (
            <code
              key={variable}
              className="rounded bg-[#2b2b2b] px-2 py-1 text-xs text-gray-300"
            >
              {variable}
            </code>
          ))}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Essas variáveis serão substituídas automaticamente pelo bot quando a
          mensagem for enviada.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          {MESSAGE_GROUPS.map((group) => (
            <div
              key={group.title}
              className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-4"
            >
              <h4 className="font-semibold text-white">{group.title}</h4>
              <p className="mt-1 text-xs text-gray-500">
                {group.description}
              </p>

              <div className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setOpenKey(item.key)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      openKey === item.key
                        ? "bg-[#C100FF] text-white"
                        : "bg-[#111111] text-gray-300 hover:bg-[#1d1d1d] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          {MESSAGE_GROUPS.flatMap((group) => group.items)
            .filter((item) => item.key === openKey)
            .map((item) => {
              const message = getMessage(item);
              const previewContent = replacePreviewVariables(message.content);
              const previewEmbed = {
                ...message.embed,
                title: replacePreviewVariables(message.embed.title),
                description: replacePreviewVariables(message.embed.description),
                footerText: replacePreviewVariables(message.embed.footerText),
              };

              return (
                <div
                  key={item.key}
                  className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white">
                        {item.label}
                      </h4>
                      <p className="mt-1 text-sm text-gray-400">
                        {item.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => resetMessage(item)}
                      className="rounded-lg border border-[#2b2b2b] px-3 py-2 text-xs text-gray-300 transition-colors hover:border-red-400 hover:text-red-300"
                    >
                      Restaurar padrão
                    </button>
                  </div>

                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-semibold text-white">
                      Tipo da mensagem
                    </label>

                    <select
                      value={message.mode}
                      onChange={(e) =>
                        updateMessage(item, {
                          mode: e.target.value as MessageMode,
                        })
                      }
                      className="w-full rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
                    >
                      <option value="text">Texto simples</option>
                      <option value="embed">Embed</option>
                    </select>
                  </div>

                  {message.mode === "text" && (
                    <div className="mb-5">
                      <label className="mb-2 block text-sm font-semibold text-white">
                        Conteúdo
                      </label>

                      <textarea
                        value={message.content}
                        onChange={(e) =>
                          updateMessage(item, {
                            content: e.target.value,
                          })
                        }
                        rows={5}
                        className="w-full resize-none rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white placeholder:text-gray-500 focus:border-[#C100FF] focus:outline-none"
                      />
                    </div>
                  )}

                  {message.mode === "embed" && (
                    <div className="mb-5 space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-white">
                          Cor do embed
                        </label>

                        <input
                          type="color"
                          value={message.embed.color}
                          onChange={(e) =>
                            updateMessage(item, {
                              embed: {
                                ...message.embed,
                                color: e.target.value,
                              },
                            })
                          }
                          className="h-10 w-full cursor-pointer rounded-lg border border-[#2b2b2b] bg-[#111111]"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-white">
                          Título
                        </label>

                        <input
                          type="text"
                          value={message.embed.title}
                          onChange={(e) =>
                            updateMessage(item, {
                              embed: {
                                ...message.embed,
                                title: e.target.value,
                              },
                            })
                          }
                          className="w-full rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-white">
                          Descrição
                        </label>

                        <textarea
                          value={message.embed.description}
                          onChange={(e) =>
                            updateMessage(item, {
                              embed: {
                                ...message.embed,
                                description: e.target.value,
                              },
                            })
                          }
                          rows={5}
                          className="w-full resize-none rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-white">
                          Rodapé
                        </label>

                        <input
                          type="text"
                          value={message.embed.footerText}
                          onChange={(e) =>
                            updateMessage(item, {
                              embed: {
                                ...message.embed,
                                footerText: e.target.value,
                              },
                            })
                          }
                          className="w-full rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
                        />
                      </div>

                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={message.embed.timestamp}
                          onChange={(e) =>
                            updateMessage(item, {
                              embed: {
                                ...message.embed,
                                timestamp: e.target.checked,
                              },
                            })
                          }
                          className="rounded"
                        />

                        <span className="text-sm text-gray-300">
                          Mostrar timestamp
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="rounded-xl border border-[#2b2b2b] bg-[#111111] p-4">
                    <h5 className="mb-3 font-semibold text-white">Preview</h5>

                    <div className="rounded-lg bg-[#313338] p-4">
                      {message.mode === "text" ? (
                        <div className="whitespace-pre-wrap text-sm text-[#dbdee1]">
                          {previewContent || "Mensagem vazia"}
                        </div>
                      ) : (
                        <div className="flex max-w-xl gap-3 rounded bg-[#2b2d31] p-3">
                          <div
                            className="w-1 flex-shrink-0 rounded-full"
                            style={{
                              backgroundColor: previewEmbed.color || "#C100FF",
                            }}
                          />

                          <div className="min-w-0 flex-1">
                            {previewEmbed.title && (
                              <div className="mb-1 text-sm font-semibold text-white">
                                {previewEmbed.title}
                              </div>
                            )}

                            {previewEmbed.description && (
                              <div className="whitespace-pre-wrap text-sm text-[#dbdee1]">
                                {previewEmbed.description}
                              </div>
                            )}

                            {(previewEmbed.footerText ||
                              previewEmbed.timestamp) && (
                              <div className="mt-3 flex items-center gap-2 text-xs text-[#949ba4]">
                                {previewEmbed.footerText && (
                                  <span>{previewEmbed.footerText}</span>
                                )}

                                {previewEmbed.footerText &&
                                  previewEmbed.timestamp && <span>•</span>}

                                {previewEmbed.timestamp && (
                                  <span>hoje às 12:34</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    <h5 className="mb-2 font-semibold text-white">
                      Variáveis desta mensagem
                    </h5>

                    <div className="flex flex-wrap gap-2">
                      {item.variables.map((variable) => (
                        <code
                          key={variable}
                          className="rounded bg-[#2b2b2b] px-2 py-1 text-xs text-gray-300"
                        >
                          {variable}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <button
        type="button"
        onClick={saveMessages}
        disabled={saving}
        className="rounded-lg bg-[#C100FF] px-6 py-2 text-white transition-colors hover:bg-[#8A2BFF] disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar mensagens"}
      </button>
    </div>
  );
}