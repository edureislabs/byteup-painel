import Link from "next/link";

import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import DocSidebar from "../components/DocSidebar";
import SectionHeader from "../components/SectionHeader";
import { docLinks } from "../data/docs";

const steps = [
  ["1", "Faça login", "Entre com Discord para carregar os servidores onde você tem acesso."],
  ["2", "Escolha o servidor", "Abra o painel do servidor que deseja configurar."],
  ["3", "Ative os módulos", "Configure tickets, logs, automoderação, economia, níveis e boas-vindas."],
  ["4", "Salve e use", "O bot aplica as configurações diretamente no Discord."],
];

export default function DocsPage() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Documentação"
            title="Guia do ByteUP BOT"
            description="Tudo que você precisa para configurar o bot, entender os módulos e evitar erros comuns."
          />
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container grid gap-8 lg:grid-cols-[260px_1fr]">
          <DocSidebar />

          <div className="space-y-8">
            <div className="site-card p-6 md:p-8">
              <h2 className="site-title text-3xl font-black text-white">
                Como começar
              </h2>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {steps.map(([number, title, description]) => (
                  <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-black">
                      {number}
                    </div>
                    <h3 className="font-black text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#aaa3b5]">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {docLinks.slice(1).map((doc) => (
                <Link
                  key={doc.href}
                  href={doc.href}
                  className="site-card-soft p-6 transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]"
                >
                  <h3 className="text-lg font-black text-white">{doc.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#aaa3b5]">
                    {doc.description}
                  </p>
                  <div className="mt-4 text-sm font-bold text-[#d9b4ff]">
                    Abrir guia →
                  </div>
                </Link>
              ))}
            </div>

            <div className="site-card p-6 md:p-8">
              <h2 className="site-title text-3xl font-black text-white">
                Permissões recomendadas
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#aaa3b5]">
                Para funcionar bem, o bot precisa de permissões compatíveis com
                os módulos ativados. Tickets usam criação de canais e edição de
                permissões. Moderação usa permissões de ban, kick e timeout.
                Logs precisam enviar mensagens no canal configurado.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {[
                  "Gerenciar canais",
                  "Gerenciar mensagens",
                  "Ler histórico de mensagens",
                  "Enviar mensagens",
                  "Anexar arquivos",
                  "Usar comandos de aplicativo",
                  "Banir e expulsar membros",
                  "Moderar membros",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[#d8d1df]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
