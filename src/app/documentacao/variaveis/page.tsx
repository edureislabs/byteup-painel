import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import DocSidebar from "../../components/DocSidebar";
import SectionHeader from "../../components/SectionHeader";

const sections = [
  { title: "Variáveis de usuário", text: "São usadas para personalizar mensagens com dados do membro envolvido.", items: ["{user} menciona o usuário.", "{username} mostra o nome do usuário.", "{member} pode representar o membro afetado por uma ação.", "Use essas variáveis em boas-vindas, tickets e avisos."] },
  { title: "Variáveis de ticket", text: "São úteis para mensagens de abertura, fechamento, ações de equipe e logs.", items: ["{ticketId} mostra o identificador do ticket.", "{channel} representa o canal do ticket.", "{staff} representa a equipe ou membro responsável.", "{panel} representa o painel usado para abrir o ticket."] },
  { title: "Variáveis de ações", text: "Algumas mensagens usam dados de ações específicas.", items: ["{reason} pode mostrar motivo de uma ação.", "{oldName} pode mostrar nome antigo do canal.", "{newName} pode mostrar novo nome do canal.", "{time}, {limit}, {cooldown} e {count} ajudam em limites e avisos."] }
];

const tips = [
  "Use variáveis exatamente como aparecem na documentação.",
  "Teste mensagens antes de liberar para usuários.",
  "Evite colocar variáveis demais em mensagens curtas.",
  "Combine variáveis com texto claro para evitar mensagens confusas."
];

export default function Page() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Documentação"
            title="Variáveis de ações"
            description="Use campos dinâmicos para personalizar mensagens, embeds, avisos e textos automáticos."
          />
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container grid gap-8 lg:grid-cols-[260px_1fr]">
          <DocSidebar />

          <div className="space-y-8">
            <article className="site-card p-6 md:p-8">
              <div className="site-prose">
                <p>Variáveis são marcadores substituídos automaticamente pelo bot. Elas permitem criar mensagens reutilizáveis sem escrever textos diferentes para cada usuário ou ticket.</p>

                {sections.map((section) => (
                  <section key={section.title}>
                    <h2>{section.title}</h2>

                    <p>{section.text}</p>

                    <ul>
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </article>

            <aside className="site-card-soft p-6 md:p-8">
              <h2 className="site-title text-2xl font-black text-white">
                Recomendações
              </h2>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {tips.map((tip) => (
                  <div
                    key={tip}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-[#d8d1df]"
                  >
                    {tip}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
