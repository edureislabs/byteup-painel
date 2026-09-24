import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import DocSidebar from "../../components/DocSidebar";
import SectionHeader from "../../components/SectionHeader";

const sections = [
  { title: "Canal de boas-vindas", text: "Escolha um canal adequado para receber novos membros sem poluir canais principais.", items: ["Use um canal específico para entradas.", "Garanta que o bot possa enviar mensagens.", "Evite mensagens longas demais em servidores grandes.", "Inclua links para regras ou introdução se necessário."] },
  { title: "Mensagem personalizada", text: "A mensagem pode explicar próximos passos e criar uma primeira impressão melhor.", items: ["Cumprimente o usuário pelo nome.", "Mostre o nome do servidor.", "Aponte para canais importantes.", "Use uma linguagem próxima da identidade da comunidade."] },
  { title: "Uso de variáveis", text: "Variáveis tornam mensagens dinâmicas e evitam textos genéricos.", items: ["Use variáveis de usuário para mencionar o novo membro.", "Use variável do servidor para personalizar a mensagem.", "Teste a mensagem antes de liberar.", "Evite excesso de informações no primeiro contato."] }
];

const tips = [
  "Mantenha a mensagem clara e curta.",
  "Inclua regras ou primeiros passos.",
  "Evite muitas menções.",
  "Atualize a mensagem quando a estrutura do servidor mudar."
];

export default function Page() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Documentação"
            title="Uso de variáveis"
            description="Configure mensagens automáticas para receber novos membros no servidor."
          />
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container grid gap-8 lg:grid-cols-[260px_1fr]">
          <DocSidebar />

          <div className="space-y-8">
            <article className="site-card p-6 md:p-8">
              <div className="site-prose">
                <p>Mensagens de boas-vindas ajudam novos membros a entender onde estão, quais são as regras e o que fazer primeiro.</p>

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
