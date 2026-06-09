import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import DocSidebar from "../../components/DocSidebar";
import SectionHeader from "../../components/SectionHeader";

const sections = [
  { title: "Canal de logs", text: "Escolha um canal privado para receber registros do bot e evitar exposição de dados administrativos.", items: ["Crie um canal visível apenas para a equipe.", "Garanta que o bot possa enviar mensagens e embeds.", "Evite misturar logs com conversas comuns.", "Separe logs críticos se o servidor for grande."] },
  { title: "Logs de tickets", text: "Os logs de ticket registram abertura, fechamento, ações de moderador e envio de transcript.", items: ["Ative logs para acompanhar atendimentos.", "Guarde transcripts quando o servidor precisar revisar conversas.", "Registre quem fechou, assumiu ou renomeou tickets.", "Use logs para identificar problemas de permissão."] },
  { title: "Logs de moderação", text: "Registros de punições ajudam na transparência interna e reduzem decisões duplicadas.", items: ["Registre banimentos, expulsões, timeouts e advertências.", "Inclua motivos claros nas ações.", "Revise histórico antes de aplicar punições maiores.", "Mantenha logs protegidos de membros comuns."] }
];

const tips = [
  "Não use canal público para logs administrativos.",
  "Revise permissões do canal de logs com frequência.",
  "Use nomes claros para canais de registro.",
  "Evite apagar logs sem necessidade."
];

export default function Page() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Documentação"
            title="Logs de moderação"
            description="Registre eventos importantes para acompanhar ações e mudanças dentro do servidor."
          />
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container grid gap-8 lg:grid-cols-[260px_1fr]">
          <DocSidebar />

          <div className="space-y-8">
            <article className="site-card p-6 md:p-8">
              <div className="site-prose">
                <p>Logs ajudam a equipe a entender o que aconteceu no servidor, quem executou uma ação e quando ela ocorreu.</p>

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
