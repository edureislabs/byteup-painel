interface GeneralTabProps {
  panel: any;
  setPanel: (panel: any) => void;
  channels: any[];
  savePanel: (updates: any) => Promise<void>;
  saving: boolean;
}

export default function GeneralTab({
  panel,
  setPanel,
  channels,
  savePanel,
  saving,
}: GeneralTabProps) {
  return (
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

    
      <div className="bg-[#0e0e0e] rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium text-sm">Fechar em duas etapas</div>
            <div className="text-xs text-gray-400 mt-1">
              Ao fechar, exibe confirmação antes de realmente fechar o ticket
            </div>
          </div>

          <button
            onClick={() =>
              setPanel({
                ...panel,
                closeInTwoSteps: !panel?.closeInTwoSteps,
              })
            }
            className={`w-11 h-6 rounded-full transition-colors ${
              panel?.closeInTwoSteps ? "bg-[#C100FF]" : "bg-[#2b2b2b]"
            } relative flex-shrink-0`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                panel?.closeInTwoSteps ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400">
          Preenchimento da Contagem ({`{count}`})
        </label>

        <p className="text-xs text-gray-500 mt-1 mb-2">
          Quantidade de dígitos para o número do ticket (0-20)
        </p>

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

            setPanel({
              ...panel,
              ticketPadding: val,
            });
          }}
          className="w-32 bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-4 py-2 mt-1 focus:outline-none focus:border-[#C100FF]"
        />

        <div className="mt-2 text-xs text-gray-500">
          <p>
            Exemplo com contagem <strong>57</strong>:{" "}
            <code className="bg-[#2b2b2b] px-1 rounded">
              {String(57).padStart(panel?.ticketPadding || 4, "0")}
            </code>
          </p>

          <p>
            Exemplo com contagem <strong>7</strong>:{" "}
            <code className="bg-[#2b2b2b] px-1 rounded">
              {String(7).padStart(panel?.ticketPadding || 4, "0")}
            </code>
          </p>
        </div>
      </div>

      <button
        onClick={() =>
          savePanel({
  name: panel?.name,
  description: panel?.description,
  closeInTwoSteps: panel?.closeInTwoSteps,
  ticketPadding: panel?.ticketPadding,
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