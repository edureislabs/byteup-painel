import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import DocSidebar from "../../components/DocSidebar";
import SectionHeader from "../../components/SectionHeader";

const sections = [
  { title: "Palavras proibidas", text: "A lista de palavras proibidas impede mensagens com termos configurados pela administração.", items: ["Adicione palavras com cuidado para evitar falsos positivos.", "Revise variações comuns dos termos proibidos.", "Explique as regras aos membros do servidor.", "Use logs para acompanhar bloqueios."] },
  { title: "Links e convites", text: "O filtro de links e convites ajuda a impedir divulgação não autorizada ou tentativas de golpe.", items: ["Permita apenas links confiáveis quando necessário.", "Bloqueie convites de outros servidores se isso fizer parte das regras.", "Crie exceções para cargos confiáveis usando bypass.", "Monitore estatísticas para ajustar o filtro."] },
  { title: "Limites automáticos", text: "Limites de menções, linhas, spam e texto estranho ajudam a manter canais legíveis.", items: ["Configure limites de menções para evitar marcações em massa.", "Use proteção contra excesso de linhas em canais movimentados.", "Ajuste filtros de spam conforme o tamanho da comunidade.", "Evite filtros agressivos demais em servidores pequenos."] }
];

const tips = [
  "Comece com regras leves e aumente conforme necessário.",
  "Use bypass para cargos da equipe e bots confiáveis.",
  "Revise logs antes de bloquear termos muito amplos.",
  "Explique no canal de regras quais tipos de mensagem são bloqueados."
];

export default function Page() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Documentação"
            title="Limites automáticos"
            description="Configure proteções automáticas contra spam, links, convites e mensagens problemáticas."
          />
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container grid gap-8 lg:grid-cols-[260px_1fr]">
          <DocSidebar />

          <div className="space-y-8">
            <article className="site-card p-6 md:p-8">
              <div className="site-prose">
                <p>O AutoMod ajuda a reduzir trabalho manual da equipe, bloqueando comportamentos indesejados antes que eles prejudiquem a conversa.</p>

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
