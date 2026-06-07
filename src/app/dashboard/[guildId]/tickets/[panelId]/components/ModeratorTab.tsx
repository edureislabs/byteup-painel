"use client";

interface ModeratorTabProps {
  panel: any;
  setPanel: (panel: any) => void;
  savePanel: (updates: any) => Promise<void>;
  saving: boolean;
}

interface ModeratorOptions {
  temporaryCall: boolean;
  addMember: boolean;
  removeMember: boolean;
  renameTicket: boolean;
  claimTicket: boolean;
  closeTicket: boolean;
  notifyStaff: boolean;
  notifyUser: boolean;
}

interface ModeratorOptionItem {
  key: keyof ModeratorOptions;
  title: string;
  description: string;
}

const DEFAULT_OPTIONS: ModeratorOptions = {
  temporaryCall: false,
  addMember: true,
  removeMember: true,
  renameTicket: true,
  claimTicket: true,
  closeTicket: true,
  notifyStaff: true,
  notifyUser: true,
};

const MODERATOR_OPTIONS: ModeratorOptionItem[] = [
  {
    key: "temporaryCall",
    title: "Call temporária",
    description:
      "Permite criar uma chamada temporária vinculada ao ticket.",
  },
  {
    key: "addMember",
    title: "Adicionar membro",
    description:
      "Permite adicionar outros usuários ao canal do ticket.",
  },
  {
    key: "removeMember",
    title: "Remover membro",
    description:
      "Permite remover usuários adicionados ao ticket.",
  },
  {
    key: "renameTicket",
    title: "Renomear ticket",
    description:
      "Permite alterar o nome do canal do ticket.",
  },
  {
    key: "claimTicket",
    title: "Assumir ticket",
    description:
      "Permite que um membro da staff assuma o atendimento.",
  },
  {
    key: "closeTicket",
    title: "Fechar ticket",
    description:
      "Permite fechar o ticket pelo sistema.",
  },
  {
    key: "notifyStaff",
    title: "Notificar staff",
    description:
      "Notifica a equipe quando um ticket for aberto.",
  },
  {
    key: "notifyUser",
    title: "Notificar usuário",
    description:
      "Notifica o usuário sobre ações importantes do ticket.",
  },
];

function parseModeratorOptions(value: any): ModeratorOptions {
  if (!value) return DEFAULT_OPTIONS;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;

    return {
      ...DEFAULT_OPTIONS,
      ...parsed,
    };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

export default function ModeratorTab({
  panel,
  setPanel,
  savePanel,
  saving,
}: ModeratorTabProps) {
  const options = parseModeratorOptions(panel?.moderatorOptionsJson);

  const updateOptions = (nextOptions: ModeratorOptions) => {
    setPanel({
      ...(panel || {}),
      moderatorOptionsJson: nextOptions,
    });
  };

  const toggleOption = (key: keyof ModeratorOptions) => {
    updateOptions({
      ...options,
      [key]: !options[key],
    });
  };

  const saveModeratorOptions = () => {
    savePanel({
      moderatorOptionsJson: options,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">Configurações do Moderador</h3>
        <p className="text-sm text-gray-400 mt-1">
          Controle quais ações e automações estarão disponíveis dentro dos
          tickets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODERATOR_OPTIONS.map((option) => {
          const enabled = options[option.key];

          return (
            <div
              key={option.key}
              className={`rounded-xl border p-5 transition-colors ${
                enabled
                  ? "border-[#C100FF]/60 bg-[#C100FF]/10"
                  : "border-[#2b2b2b] bg-[#0e0e0e]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-white">
                    {option.title}
                  </div>

                  <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {option.description}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleOption(option.key)}
                  className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
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
          );
        })}
      </div>

      <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5">
        <h4 className="font-semibold text-white mb-2">
          Observações
        </h4>

        <ul className="space-y-2 text-sm text-gray-400">
          <li>
            • Transcript e avaliação não ficam aqui, porque serão enviados
            automaticamente no fechamento do ticket.
          </li>
        </ul>
      </div>

      <button
        type="button"
        onClick={saveModeratorOptions}
        disabled={saving}
        className="bg-[#C100FF] hover:bg-[#8A2BFF] text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}