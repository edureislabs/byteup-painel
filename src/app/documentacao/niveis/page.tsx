import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import DocSidebar from "../../components/DocSidebar";
import SectionHeader from "../../components/SectionHeader";

const sections = [
  { title: "Como o XP funciona", text: "Membros ganham experiência conforme participam, dependendo das regras configuradas pelo servidor.", items: ["Evite recompensar spam.", "Use cooldowns para impedir mensagens repetidas.", "Defina canais onde XP pode ou não ser obtido.", "Acompanhe comportamento dos membros após ativar níveis."] },
  { title: "Ranking", text: "O ranking mostra os membros mais ativos e pode ser usado para eventos ou reconhecimento.", items: ["Use leaderboard para ver o top do servidor.", "Evite tratar ranking como competição obrigatória.", "Reconheça membros ativos sem prejudicar membros novos.", "Combine níveis com cargos se fizer sentido."] },
  { title: "Comandos de staff", text: "A equipe pode ajustar nível e XP quando necessário.", items: ["Use setlevel para corrigir ou definir nível.", "Use setxp para ajustar experiência.", "Use resetall com cuidado.", "Registre alterações importantes para evitar abuso."] }
];

const tips = [
  "Configure XP com calma.",
  "Não premie mensagens vazias.",
  "Use canais sem XP para spam e comandos.",
  "Explique como o sistema funciona para os membros."
];

export default function Page() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Documentação"
            title="Comandos de staff"
            description="Crie progressão por atividade com níveis, experiência e ranking de membros."
          />
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container grid gap-8 lg:grid-cols-[260px_1fr]">
          <DocSidebar />

          <div className="space-y-8">
            <article className="site-card p-6 md:p-8">
              <div className="site-prose">
                <p>O sistema de níveis incentiva participação natural no servidor, valorizando membros ativos e criando metas leves de engajamento.</p>

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
