import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import DocSidebar from "../../components/DocSidebar";
import SectionHeader from "../../components/SectionHeader";

const sections = [
  { title: "Saldo dos membros", text: "Cada membro pode consultar seu saldo e acompanhar sua evolução dentro da economia do servidor.", items: ["Use balance para consultar moedas.", "Defina regras claras sobre como moedas são obtidas.", "Evite recompensas exageradas que desvalorizem o sistema.", "Use ranking para incentivar participação saudável."] },
  { title: "Transferências", text: "Transferências permitem que membros movimentem moedas entre si.", items: ["Use pay para enviar moedas a outro usuário.", "Avise membros sobre golpes e transferências indevidas.", "Defina regras para compras, prêmios ou eventos.", "Monitore abuso caso a economia seja competitiva."] },
  { title: "Eventos e recompensas", text: "A economia funciona melhor quando conectada a eventos, atividades e recompensas simples.", items: ["Crie eventos com prêmios em moedas.", "Use moedas como incentivo, não como obrigação.", "Evite transformar o servidor em competição tóxica.", "Revise recompensas com base na atividade real."] }
];

const tips = [
  "Comece com valores baixos.",
  "Explique a economia em um canal fixo.",
  "Evite premiar spam.",
  "Revise regras se membros encontrarem formas de abuso."
];

export default function Page() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Documentação"
            title="Eventos e recompensas"
            description="Use moedas virtuais para criar interação, recompensas e pequenas dinâmicas no servidor."
          />
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container grid gap-8 lg:grid-cols-[260px_1fr]">
          <DocSidebar />

          <div className="space-y-8">
            <article className="site-card p-6 md:p-8">
              <div className="site-prose">
                <p>O sistema de economia permite criar um ciclo de engajamento com saldo, pagamentos e rankings internos.</p>

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
