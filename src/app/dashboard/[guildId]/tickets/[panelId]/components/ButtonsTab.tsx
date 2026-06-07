"use client";

interface ButtonConfig {
  id: string;
  label: string;
  emoji: string;
  style: "primary" | "secondary" | "success" | "danger";
}

interface ButtonsTabProps {
  panel: any;
  setPanel: (panel: any) => void;
  savePanel: (updates: any) => Promise<void>;
  saving: boolean;
}

function parseButtons(buttonsJson: unknown): ButtonConfig[] {
  if (!buttonsJson) return [];

  if (Array.isArray(buttonsJson)) {
    return buttonsJson;
  }

  if (typeof buttonsJson !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(buttonsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ButtonsTab({
  panel,
  setPanel,
  savePanel,
  saving,
}: ButtonsTabProps) {
  const buttons = parseButtons(panel?.buttonsJson);

  const updateButtons = (nextButtons: ButtonConfig[]) => {
    setPanel({
      ...(panel || {}),
      buttonsJson: JSON.stringify(nextButtons),
    });
  };

  const addButton = () => {
    const nextButtons = [
      ...buttons,
      {
        id: Date.now().toString(),
        label: "Novo botão",
        emoji: "🎫",
        style: "primary" as const,
      },
    ];

    updateButtons(nextButtons);
  };

  const updateButton = (id: string, updates: Partial<ButtonConfig>) => {
    const nextButtons = buttons.map((button) =>
      button.id === id ? { ...button, ...updates } : button
    );

    updateButtons(nextButtons);
  };

  const removeButton = (id: string) => {
    const nextButtons = buttons.filter((button) => button.id !== id);

    updateButtons(nextButtons);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">Botões</h3>
          <p className="text-sm text-gray-400 mt-1">
            Configure os botões exibidos no painel do ticket.
          </p>
        </div>

        <button
          type="button"
          onClick={addButton}
          className="bg-[#C100FF] hover:bg-[#8A2BFF] text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Adicionar botão
        </button>
      </div>

      {buttons.length === 0 ? (
        <div className="bg-[#0e0e0e] rounded-xl p-8 border border-[#2b2b2b] text-center">
          <p className="text-gray-400">Nenhum botão configurado</p>
          <p className="text-xs text-gray-500 mt-1">
            Clique em "Adicionar botão" para começar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {buttons.map((button, index) => (
            <div
              key={button.id}
              className="bg-[#0e0e0e] rounded-xl p-5 border border-[#2b2b2b]"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-white">
                  Botão {index + 1}
                </h4>

                <button
                  type="button"
                  onClick={() => removeButton(button.id)}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Remover
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Emoji
                  </label>

                  <input
                    type="text"
                    value={button.emoji || ""}
                    onChange={(e) =>
                      updateButton(button.id, {
                        emoji: e.target.value,
                      })
                    }
                    placeholder="🎫"
                    className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Texto do botão
                  </label>

                  <input
                    type="text"
                    value={button.label || ""}
                    onChange={(e) =>
                      updateButton(button.id, {
                        label: e.target.value,
                      })
                    }
                    placeholder="Abrir ticket"
                    className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs text-gray-400 mb-1">
                  Estilo
                </label>

                <select
                  value={button.style || "primary"}
                  onChange={(e) =>
                    updateButton(button.id, {
                      style: e.target.value as ButtonConfig["style"],
                    })
                  }
                  className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                >
                  <option value="primary">Roxo / Principal</option>
                  <option value="secondary">Cinza / Secundário</option>
                  <option value="success">Verde / Sucesso</option>
                  <option value="danger">Vermelho / Perigo</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          savePanel({
            buttonsJson: JSON.stringify(buttons),
          })
        }
        disabled={saving}
        className="bg-[#C100FF] hover:bg-[#8A2BFF] text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}