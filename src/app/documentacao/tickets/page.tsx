import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import DocSidebar from "../../components/DocSidebar";
import SectionHeader from "../../components/SectionHeader";
import { variables } from "../../data/docs";

const tabs = [
  "Geral",
  "Ticket",
  "Editor de Embed",
  "Mensagem do Ticket",
  "Moderador",
  "Permissões",
  "Formulários",
  "Limites",
  "Mensagens",
];

const actions = [
  ["Fechar", "Fecha o ticket, gera transcript e envia logs conforme configurado."],
  ["Assumir", "Mostra quem assumiu o atendimento e pode limitar a ação para staff."],
  ["Renomear", "Abre modal para trocar o nome do canal e registrar a alteração."],
  ["Adicionar membro", "Permite incluir outro usuário na conversa."],
  ["Remover membro", "Remove participantes adicionais do canal."],
  ["Call temporária", "Cria uma chamada de voz vinculada ao ticket."],
];

export default function TicketsDocsPage() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Documentação"
            title="Sistema de tickets"
            description="Configure atendimento completo com painéis, permissões, formulários, transcripts, logs e mensagens editáveis."
          />
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container grid gap-8 lg:grid-cols-[260px_1fr]">
          <DocSidebar />

          <div className="space-y-8">
            <article className="site-card p-6 md:p-8">
              <div className="site-prose">
                <h2>Como o ticket funciona</h2>
                <p>
                  O sistema cria um canal privado para o usuário e para a equipe
                  definida nas permissões. O painel público pode usar botões ou
                  selects, enquanto o canal interno recebe uma mensagem de
                  atendimento com ações de moderador.
                </p>

                <h2>Abas do painel</h2>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {tabs.map((tab) => (
                  <div key={tab} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold text-white">
                    {tab}
                  </div>
                ))}
              </div>
            </article>

            <article className="site-card p-6 md:p-8">
              <h2 className="site-title text-3xl font-black text-white">
                Ações de moderador
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {actions.map(([title, description]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <h3 className="font-black text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#aaa3b5]">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="site-card p-6 md:p-8">
              <h2 className="site-title text-3xl font-black text-white">
                Permissões e segurança
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#aaa3b5]">
                Defina cargos da staff, cargos que podem gerenciar tickets,
                usuários bloqueados e permissões do dono do ticket. Isso evita
                que membros comuns assumam tickets ou executem ações reservadas.
              </p>
            </article>

            <article className="site-card p-6 md:p-8">
              <h2 className="site-title text-3xl font-black text-white">
                Mensagens editáveis
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#aaa3b5]">
                Avisos, erros, confirmações e textos automáticos podem ser
                personalizados. Você pode escolher texto simples ou embed,
                dependendo do tipo de mensagem.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {variables.map((variable) => (
                  <code key={variable} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-[#ead9ff]">
                    {variable}
                  </code>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
