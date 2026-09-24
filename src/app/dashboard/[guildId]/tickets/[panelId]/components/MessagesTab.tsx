interface MessagesTabProps {
  panel: any;
  setPanel: (panel: any) => void;
  savePanel: (updates: any) => Promise<void>;
  saving: boolean;
}

export default function MessagesTab({
  panel,
  setPanel,
  savePanel,
  saving,
}: MessagesTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg">Mensagens</h3>

      <div className="bg-[#0e0e0e] rounded-xl p-5 border border-[#2b2b2b]">
        <label className="block text-sm font-semibold text-white mb-2">
            
        </label>

        <p className="text-sm text-gray-400 mb-3">
          Esta mensagem será usada quando o ticket for criado.
        </p>

        
<textarea
  value={panel?.openMessage || ""}
  onChange={(e) =>
    setPanel({
      ...panel,
      openMessage: e.target.value,
    })
  }
/>

        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs text-gray-400">Variáveis:</span>
          <code className="text-xs bg-[#2b2b2b] px-2 py-1 rounded">
            {`{user}`}
          </code>
          <code className="text-xs bg-[#2b2b2b] px-2 py-1 rounded">
            {`{username}`}
          </code>
          <code className="text-xs bg-[#2b2b2b] px-2 py-1 rounded">
            {`{server}`}
          </code>
          <code className="text-xs bg-[#2b2b2b] px-2 py-1 rounded">
            {`{count}`}
          </code>
        </div>
      </div>

      <button
        onClick={() =>
          savePanel({
            openMessage: panel?.openMessage || "",
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