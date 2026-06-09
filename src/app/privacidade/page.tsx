import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import SectionHeader from "../components/SectionHeader";

const sections = [
  {
    title: "Dados usados para login",
    paragraphs: [
      "O painel utiliza login com Discord para identificar o usuário e listar os servidores onde ele possui acesso. Informações como nome, identificador, avatar e servidores podem ser usadas para exibir a interface corretamente.",
      "O acesso ao painel é validado conforme permissões do servidor, propriedade do servidor ou convites de acesso configurados pela administração.",
    ],
  },
  {
    title: "Dados de servidores",
    paragraphs: [
      "Para funcionar, o ByteUP BOT pode armazenar configurações por servidor, como canais de logs, canais de boas-vindas, painéis de tickets, cargos de staff, permissões, mensagens personalizadas e opções de módulos.",
      "Esses dados são usados apenas para executar os recursos configurados pelo administrador dentro do servidor correspondente.",
    ],
  },
  {
    title: "Dados de tickets",
    paragraphs: [
      "O sistema de tickets pode armazenar informações necessárias para controlar tickets abertos, dono do ticket, painel usado, canal criado, horários, ações da equipe e histórico de fechamento.",
      "Quando o transcript é ativado, o conteúdo do ticket pode ser convertido em arquivo HTML no fechamento, conforme as configurações do servidor.",
    ],
  },
  {
    title: "Logs e ações administrativas",
    paragraphs: [
      "Alguns módulos podem registrar ações importantes, como abertura e fechamento de tickets, punições, alterações de configuração e eventos de moderação.",
      "Esses registros ajudam a equipe do servidor a manter controle interno, revisar ações e resolver problemas.",
    ],
  },
  {
    title: "Segurança e retenção",
    paragraphs: [
      "As informações são mantidas pelo tempo necessário para funcionamento dos recursos configurados. Administradores podem alterar ou remover configurações pelo painel quando disponível.",
      "Nenhum sistema é totalmente imune a falhas, mas o objetivo é limitar o uso dos dados ao necessário para operação do bot e do painel.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Legal"
            title="Política de privacidade"
            description="Entenda quais informações podem ser usadas pelo ByteUP BOT e pelo painel para entregar os recursos configurados."
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
