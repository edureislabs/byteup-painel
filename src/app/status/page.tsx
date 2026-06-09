import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import SectionHeader from "../components/SectionHeader";

const services = [
  {
    name: "Bot Discord",
    status: "Operacional",
    description:
      "Responsável por responder comandos, executar sistemas de tickets, logs, moderação e eventos dentro dos servidores.",
  },
  {
    name: "Painel Web",
    status: "Operacional",
    description:
      "Interface usada para configurar módulos, editar mensagens, gerenciar servidores e salvar preferências.",
  },
  {
    name: "Banco de Dados",
    status: "Operacional",
    description:
      "Armazena configurações dos servidores, painéis de ticket, permissões, logs internos e dados necessários dos módulos.",
  },
  {
    name: "Autenticação Discord",
    status: "Operacional",
    description:
      "Permite login com Discord e valida quais servidores podem ser administrados por cada usuário.",
  },
];

const notes = [
  "Instabilidades no Discord podem afetar comandos, interações, criação de canais e login.",
  "Alterações de comandos slash podem demorar alguns minutos para aparecer em todos os servidores.",
  "Se um módulo parar de funcionar, verifique permissões do bot antes de reportar como falha geral.",
];

export default function StatusPage() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Status"
            title="Status dos serviços"
            description="Acompanhe a disponibilidade dos principais serviços usados pelo ByteUP BOT e pelo painel web."
          />

          <div className="mt-10 grid gap-4">
            {services.map((service) => (
              <div
                key={service.name}
                className="site-card-soft flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h2 className="font-black text-white">{service.name}</h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#aaa3b5]">
                    {service.description}
                  </p>
                </div>

                <span className="w-fit rounded-full border border-[#73d99f]/25 bg-[#73d99f]/10 px-3 py-1 text-sm font-bold text-[#a8efc5]">
                  {service.status}
                </span>
              </div>
            ))}
          </div>

          <div className="site-card mt-8 p-6">
            <h2 className="text-xl font-black text-white">
              Observações importantes
            </h2>

            <div className="mt-5 space-y-3">
              {notes.map((note) => (
                <div
                  key={note}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-[#aaa3b5]"
                >
                  {note}
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm leading-6 text-[#7d7588]">
              Esta página pode ser conectada futuramente a dados em tempo real,
              usando heartbeat do bot, verificação do banco de dados e checagem
              das rotas do painel.
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
