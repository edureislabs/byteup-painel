"use client";

interface LimitsTabProps {
  panel: any;
  setPanel: (panel: any) => void;
  savePanel: (updates: any) => Promise<void>;
  saving: boolean;
}

interface LimitsConfig {
  cooldownSeconds: number;
  inactivityCloseEnabled: boolean;
  inactivityCloseMinutes: number;
  userDailyLimitEnabled: boolean;
  userDailyLimit: number;
  blockIfAlreadyOpen: boolean;
}

const DEFAULT_LIMITS: LimitsConfig = {
  cooldownSeconds: 0,
  inactivityCloseEnabled: false,
  inactivityCloseMinutes: 60,
  userDailyLimitEnabled: false,
  userDailyLimit: 3,
  blockIfAlreadyOpen: true,
};

function parseLimits(value: any): LimitsConfig {
  if (!value) return DEFAULT_LIMITS;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;

    return {
      ...DEFAULT_LIMITS,
      ...parsed,
    };
  } catch {
    return DEFAULT_LIMITS;
  }
}

export default function LimitsTab({
  panel,
  setPanel,
  savePanel,
  saving,
}: LimitsTabProps) {
  const limits = parseLimits(panel?.limitsJson);

  const updateLimits = (nextLimits: LimitsConfig) => {
    setPanel({
      ...(panel || {}),
      limitsJson: nextLimits,
    });
  };

  const toggleLimit = (
    field:
      | "inactivityCloseEnabled"
      | "userDailyLimitEnabled"
      | "blockIfAlreadyOpen"
  ) => {
    updateLimits({
      ...limits,
      [field]: !limits[field],
    });
  };

  const saveLimits = () => {
    savePanel({
      maxTickets: panel?.maxTickets ?? 5,
      ticketLimit: panel?.ticketLimit ?? 1,
      limitsJson: limits,
    });
  };

  const ToggleCard = ({
    title,
    description,
    enabled,
    onToggle,
  }: {
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
  }) => (
    <div
      className={`rounded-xl border p-5 transition-colors ${
        enabled
          ? "border-[#C100FF]/60 bg-[#C100FF]/10"
          : "border-[#2b2b2b] bg-[#0e0e0e]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-white">{title}</div>
          <div className="mt-1 text-xs leading-relaxed text-gray-400">
            {description}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Limites</h3>
        <p className="mt-1 text-sm text-gray-400">
          Configure limites de abertura, cooldown e fechamento automático.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5">
          <label className="mb-2 block text-sm font-semibold text-white">
            Máximo de tickets abertos no painel
          </label>

          <p className="mb-3 text-xs text-gray-400">
            Limite total de tickets abertos simultaneamente para este painel.
          </p>

          <input
            type="number"
            min={0}
            value={panel?.maxTickets ?? 5}
            onChange={(e) =>
              setPanel({
                ...panel,
                maxTickets: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
          />
        </div>

        <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5">
          <label className="mb-2 block text-sm font-semibold text-white">
            Limite de tickets por usuário
          </label>

          <p className="mb-3 text-xs text-gray-400">
            Quantos tickets abertos o mesmo usuário pode ter ao mesmo tempo.
          </p>

          <input
            type="number"
            min={1}
            value={panel?.ticketLimit ?? 1}
            onChange={(e) =>
              setPanel({
                ...panel,
                ticketLimit: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5">
        <label className="mb-2 block text-sm font-semibold text-white">
          Cooldown para abrir outro ticket
        </label>

        <p className="mb-3 text-xs text-gray-400">
          Tempo em segundos que o usuário precisa esperar para abrir outro
          ticket. Use 0 para desativar.
        </p>

        <input
          type="number"
          min={0}
          value={limits.cooldownSeconds}
          onChange={(e) =>
            updateLimits({
              ...limits,
              cooldownSeconds: Number(e.target.value),
            })
          }
          className="w-full rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ToggleCard
          title="Bloquear se já tiver ticket aberto"
          description="Impede o usuário de abrir um novo ticket enquanto já tiver outro aberto."
          enabled={limits.blockIfAlreadyOpen}
          onToggle={() => toggleLimit("blockIfAlreadyOpen")}
        />

        <ToggleCard
          title="Limite diário por usuário"
          description="Define uma quantidade máxima de tickets por usuário em um dia."
          enabled={limits.userDailyLimitEnabled}
          onToggle={() => toggleLimit("userDailyLimitEnabled")}
        />

        <ToggleCard
          title="Fechar por inatividade"
          description="Fecha automaticamente tickets sem movimentação após determinado tempo."
          enabled={limits.inactivityCloseEnabled}
          onToggle={() => toggleLimit("inactivityCloseEnabled")}
        />
      </div>

      {limits.userDailyLimitEnabled && (
        <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5">
          <label className="mb-2 block text-sm font-semibold text-white">
            Tickets por dia
          </label>

          <input
            type="number"
            min={1}
            value={limits.userDailyLimit}
            onChange={(e) =>
              updateLimits({
                ...limits,
                userDailyLimit: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
          />
        </div>
      )}

      {limits.inactivityCloseEnabled && (
        <div className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5">
          <label className="mb-2 block text-sm font-semibold text-white">
            Minutos de inatividade
          </label>

          <input
            type="number"
            min={1}
            value={limits.inactivityCloseMinutes}
            onChange={(e) =>
              updateLimits({
                ...limits,
                inactivityCloseMinutes: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
          />
        </div>
      )}

      <button
        type="button"
        onClick={saveLimits}
        disabled={saving}
        className="rounded-lg bg-[#C100FF] px-6 py-2 text-white transition-colors hover:bg-[#8A2BFF] disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar limites"}
      </button>
    </div>
  );
}