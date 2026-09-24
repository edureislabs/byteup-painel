import Link from "next/link";

const columns = [
  {
    title: "Produto",
    links: [
      ["Recursos", "/#recursos"],
      ["Comandos", "/comandos"],
      ["Status", "/status"],
      ["Atualizações", "/atualizacoes"],
    ],
  },
  {
    title: "Documentação",
    links: [
      ["Começando", "/documentacao"],
      ["Tickets", "/documentacao/tickets"],
      ["Moderação", "/documentacao/moderacao"],
      ["AutoMod", "/documentacao/automod"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Termos", "/termos"],
      ["Privacidade", "/privacidade"],
      ["Suporte", "/suporte"],
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#08070a]">
      <div className="site-container py-12">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="flex items-center gap-3">
             
              <div>
                <div className="font-black text-white">ByteUP BOT</div>
                <div className="text-sm text-[#7d7588]">
                  Gestão completa para comunidades Discord.
                </div>
              </div>
            </div>

            <p className="mt-5 max-w-sm text-sm leading-6 text-[#aaa3b5]">
              Tickets, logs, moderação, automoderação, economia, níveis,
              interações e painel web em um só lugar.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <div className="mb-3 text-sm font-black text-white">
                  {column.title}
                </div>

                <div className="space-y-2">
                  {column.links.map(([label, href]) => (
                    <Link
                      key={href}
                      href={href}
                      className="block text-sm text-[#8d8499] transition-colors hover:text-white"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-[#7d7588] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 ByteUP BOT. Todos os direitos reservados.</span>
          <span>Feito para servidores que precisam de organização de verdade.</span>
        </div>
      </div>
    </footer>
  );
}
