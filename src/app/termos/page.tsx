import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import SectionHeader from "../components/SectionHeader";

const sections = [
  {
    title: "Uso do ByteUP BOT",
    paragraphs: [
      "O ByteUP BOT foi desenvolvido para auxiliar administradores na organização de servidores Discord, oferecendo recursos como tickets, logs, moderação, automoderação, economia, níveis e mensagens personalizadas.",
      "Ao utilizar o bot ou o painel, o administrador concorda em usar os recursos de forma responsável, respeitando as regras do Discord e as regras da própria comunidade.",
    ],
  },
  {
    title: "Responsabilidade do administrador",
    paragraphs: [
      "As configurações aplicadas pelo painel são responsabilidade de quem possui acesso ao servidor. Isso inclui canais escolhidos, cargos da equipe, mensagens públicas, permissões de tickets e ações de moderação.",
      "Recomendamos testar alterações importantes em canais privados ou ambientes controlados antes de liberar para todos os membros.",
    ],
  },
  {
    title: "Comandos de moderação",
    paragraphs: [
      "Comandos como ban, kick, timeout, warn e limpeza de mensagens devem ser usados apenas por pessoas autorizadas. O uso indevido pode causar conflitos dentro da comunidade.",
      "O ByteUP BOT apenas executa ações solicitadas por usuários com permissão. A decisão de aplicar punições pertence à administração do servidor.",
    ],
  },
  {
    title: "Disponibilidade do serviço",
    paragraphs: [
      "O objetivo é manter o bot e o painel disponíveis sempre que possível, mas podem ocorrer pausas para manutenção, atualizações, instabilidades do Discord, falhas de hospedagem ou mudanças técnicas.",
      "Quando possível, alterações relevantes serão informadas em páginas públicas, no servidor de suporte ou por outros canais oficiais.",
    ],
  },
  {
    title: "Alterações nos termos",
    paragraphs: [
      "Estes termos podem ser atualizados conforme novos recursos forem adicionados ao ByteUP BOT ou conforme mudanças técnicas sejam necessárias.",
      "O uso contínuo do bot após alterações indica concordância com a versão mais recente dos termos.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Legal"
            title="Termos de uso"
            description="Informações importantes sobre o uso do ByteUP BOT, do painel web e dos recursos disponíveis para servidores Discord."
          />

          <article className="site-card mt-10 p-6 md:p-8">
            <div className="site-prose">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2>{section.title}</h2>

                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>
          </article>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
