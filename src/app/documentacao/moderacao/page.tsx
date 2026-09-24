import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import DocSidebar from "../../components/DocSidebar";
import SectionHeader from "../../components/SectionHeader";

const sections = [
  { title: "Comandos de punição", text: "Os comandos de punição devem ser usados por pessoas autorizadas e com contexto suficiente para evitar decisões injustas.", items: ["Use ban para remover membros de forma definitiva quando necessário.", "Use kick quando quiser remover o membro sem impedir retorno futuro.", "Use timeout para silenciar temporariamente membros que quebraram regras.", "Use warn para registrar advertências sem aplicar uma punição imediata."] },
  { title: "Histórico de punições", text: "O histórico ajuda a equipe a entender reincidências e acompanhar decisões anteriores.", items: ["Consulte punições antes de aplicar uma nova ação.", "Mantenha motivos claros e objetivos.", "Evite motivos genéricos que dificultem revisão futura.", "Use registros para alinhar decisões entre moderadores."] },
  { title: "Controle de canais", text: "O controle de canais permite travar conversas temporariamente durante manutenção, anúncios ou situações de conflito.", items: ["Use lock para impedir novas mensagens em um canal.", "Use unlock para liberar o canal novamente.", "Avise os membros quando um canal for fechado temporariamente.", "Verifique se o bot tem permissão para editar permissões do canal."] }
];

const tips = [
  "Configure cargos de moderação com permissões bem definidas.",
  "Evite dar permissões administrativas para todos os cargos da equipe.",
  "Use logs para acompanhar ações importantes.",
  "Teste comandos em um canal privado antes de liberar para novos moderadores."
];

export default function Page() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Documentação"
            title="Controle de canais"
            description="Entenda como usar comandos administrativos para manter o servidor organizado e seguro."
          />
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container grid gap-8 lg:grid-cols-[260px_1fr]">
          <DocSidebar />

          <div className="space-y-8">
            <article className="site-card p-6 md:p-8">
              <div className="site-prose">
                <p>O módulo de moderação reúne comandos para aplicar punições, controlar canais, revisar histórico de membros e ajudar a equipe a manter a comunidade sob controle.</p>

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
