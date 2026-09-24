import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import SectionHeader from "../components/SectionHeader";

const updates = [
  {
    title: "Páginas públicas redesenhadas",
    date: "2026",
    description:
      "A página inicial, documentação, comandos, suporte, termos, privacidade e status receberam um visual mais natural, menos artificial e com textos mais completos.",
    items: [
      "Visual público mais limpo e menos dependente de brilho.",
      "Navegação pública separada do dashboard.",
      "Conteúdo mais claro para visitantes antes do login.",
      "Página de suporte com acesso ao servidor oficial.",
    ],
  },
  {
    title: "Sistema de tickets avançado",
    date: "2026",
    description:
      "O sistema de tickets passou a ter mais opções para atendimento, personalização, controle de equipe e registro de ações.",
    items: [
      "Mensagens automáticas editáveis.",
      "Fechamento em duas etapas.",
      "Renomear tickets pelo botão.",
      "Adicionar e remover membros.",
      "Transcript HTML.",
      "Logs detalhados de ações.",
    ],
  },
  {
    title: "Documentação pública",
    date: "2026",
    description:
      "Foram adicionadas páginas para explicar os principais módulos do ByteUP BOT antes mesmo do usuário acessar o painel.",
    items: [
      "Guia de tickets.",
      "Guia de moderação.",
      "Guia de automoderação.",
      "Guia de logs.",
      "Guias de economia, níveis, boas-vindas e variáveis.",
    ],
  },
];

export default function UpdatesPage() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Atualizações"
            title="Novidades do ByteUP BOT"
            description="Acompanhe mudanças importantes no site, painel e sistemas do bot."
          />

          <div className="mt-10 space-y-5">
            {updates.map((update) => (
              <article key={update.title} className="site-card p-6 md:p-8">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="site-title text-2xl font-black text-white">
                      {update.title}
                    </h2>

                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#aaa3b5]">
                      {update.description}
                    </p>
                  </div>

                  <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-bold text-[#aaa3b5]">
                    {update.date}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {update.items.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-[#d8d1df]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
