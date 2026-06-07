interface TicketTabProps {
  panel: any;
  setPanel: (panel: any) => void;
  categories: any[];
  savePanel: (updates: any) => Promise<void>;
  saving: boolean;
  onOpenMessages: () => void;
}

export default function TicketTab({
  panel,
  setPanel,
  categories,
  savePanel,
  saving,
  onOpenMessages,
}: TicketTabProps) {


  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Configurações do Ticket</h3>

      <div className="bg-[#0e0e0e] rounded-xl p-5 border border-[#2b2b2b]">
        <div className="flex items-center gap-2 mb-4">
          <h4 className="font-semibold text-white">Mensagem do ticket</h4>

          <span
            title="Mensagem enviada dentro do canal criado para o ticket."
            className="w-5 h-5 rounded-full bg-[#C100FF]/20 text-[#C100FF] text-xs font-bold flex items-center justify-center cursor-help"
          >
            ?
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenMessages}
          className="w-full bg-[#C100FF] hover:bg-[#8A2BFF] text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Editar mensagem do ticket
        </button>
      </div>

      <div className="bg-[#0e0e0e] rounded-xl p-5 border border-[#2b2b2b]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[#C100FF]">◆</span>

          <h4 className="font-semibold text-white">
            Categoria onde os tickets serão criados
          </h4>

          <span
            title="Categoria do Discord onde o canal do ticket será criado."
            className="w-5 h-5 rounded-full bg-[#C100FF]/20 text-[#C100FF] text-xs font-bold flex items-center justify-center cursor-help"
          >
            ?
          </span>
        </div>

        <select
          value={panel?.categoryId || ""}
          onChange={(e) =>
            setPanel({
              ...panel,
              categoryId: e.target.value || null,
            })
          }
          className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#C100FF]"
        >
          <option value="">— Sem categoria —</option>

          {categories.map((category: any) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {categories.length === 0 ? (
          <p className="text-xs text-yellow-400 mt-2">
            Nenhuma categoria encontrada. Verifique se a rota de canais está
            retornando canais do tipo categoria.
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-2">
            O canal do ticket será criado dentro da categoria selecionada.
          </p>
        )}
      </div>

      <div className="bg-[#0e0e0e] rounded-xl p-5 border border-[#2b2b2b]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[#C100FF]">◆</span>

          <h4 className="font-semibold text-white">
            Ticket aberto nome do canal
          </h4>

          <span
            title="Nome usado no canal criado para o ticket. Use {count} para o número do ticket."
            className="w-5 h-5 rounded-full bg-[#C100FF]/20 text-[#C100FF] text-xs font-bold flex items-center justify-center cursor-help"
          >
            ?
          </span>
        </div>

        <input
          type="text"
          value={panel?.ticketChannelName || "ticket-{count}"}
          onChange={(e) =>
            setPanel({
              ...panel,
              ticketChannelName: e.target.value,
            })
          }
          placeholder="ticket-{count}"
          className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#C100FF]"
        />

        <p className="text-xs text-gray-500 mt-2">
          Use{" "}
          <code className="bg-[#2b2b2b] px-1 rounded text-gray-300">
            {`{count}`}
          </code>{" "}
          para inserir o número do ticket.
        </p>
      </div>

      <button
        type="button"
        onClick={() =>
          savePanel({
            categoryId: panel?.categoryId || null,
            ticketChannelName: panel?.ticketChannelName || "ticket-{count}",
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