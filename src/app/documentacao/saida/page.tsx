import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import DocSidebar from "../../components/DocSidebar";
import SectionHeader from "../../components/SectionHeader";

const sections = [
  { title: "Canal de saída", text: "Escolha se a saída será registrada em canal público ou canal privado da equipe.", items: ["Use canal privado se quiser apenas controle administrativo.", "Use canal público apenas se isso combinar com a comunidade.", "Garanta que o bot tenha permissão para enviar mensagens.", "Evite expor informações sensíveis."] },
  { title: "Mensagem de saída", text: "A mensagem deve ser simples e respeitosa.", items: ["Evite textos que constranjam o usuário.", "Use informações básicas como nome e servidor.", "Mantenha tom neutro.", "Revise se a mensagem combina com a identidade do servidor."] },
  { title: "Uso em logs", text: "Servidores maiores podem preferir registrar saídas apenas para a equipe.", items: ["Use canal de logs para acompanhamento interno.", "Combine saída com logs de moderação quando necessário.", "Evite notificações excessivas.", "Revise o canal se o volume de membros for alto."] }
];

const tips = [
  "Prefira mensagens discretas.",
  "Não exponha motivos de saída.",
  "Use canal privado em comunidades grandes.",
  "Teste a mensagem com variáveis antes de ativar."
];

export default function Page() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Documentação"
            title="Uso em logs"
            description="Configure mensagens para registrar ou comunicar quando membros saem da comunidade."
          />
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container grid gap-8 lg:grid-cols-[260px_1fr]">
          <DocSidebar />

          <div className="space-y-8">
            <article className="site-card p-6 md:p-8">
              <div className="site-prose">
                <p>Mensagens de saída podem ser usadas para controle interno da equipe ou para informar publicamente que alguém deixou o servidor.</p>

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
