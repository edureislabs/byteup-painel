import Link from "next/link";

import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import SectionHeader from "../components/SectionHeader";

const supportOptions = [
  {
    title: "Consultar a documentação",
    description:
      "Antes de abrir um pedido de ajuda, veja os guias públicos. Muitas dúvidas sobre tickets, permissões, comandos e configurações estão explicadas passo a passo.",
    href: "/documentacao",
    label: "Abrir documentação",
  },
  {
    title: "Verificar comandos",
    description:
      "Se a dúvida for sobre como usar algum comando no Discord, consulte a lista completa com descrições e categorias.",
    href: "/comandos",
    label: "Ver comandos",
  },
  {
    title: "Entrar no servidor de suporte",
    description:
      "Caso ainda precise de ajuda, entre no servidor oficial de suporte para falar com a equipe, reportar problemas ou tirar dúvidas sobre o painel.",
    href: "https://discord.gg/CRKsUuYM4V",
    label: "Entrar no servidor",
    external: true,
  },
];

const commonIssues = [
  {
    title: "O bot não aparece no servidor",
    description:
      "Confirme se ele foi adicionado com as permissões corretas. Se o painel informar que o bot não está no servidor, use o botão de adicionar bot no dashboard ou refaça o convite.",
  },
  {
    title: "Não consigo acessar o painel",
    description:
      "O painel libera acesso para donos do servidor, administradores ou usuários convidados pelo sistema de acesso. Verifique se sua conta tem permissão no servidor correto.",
  },
  {
    title: "Tickets não criam canais",
    description:
      "Confira se o bot tem permissão para gerenciar canais, ver canais, enviar mensagens e editar permissões na categoria configurada.",
  },
  {
    title: "Comandos slash não aparecem",
    description:
      "Aguarde alguns minutos após iniciar o bot ou registrar os comandos. Em alguns casos, comandos globais podem demorar para atualizar no Discord.",
  },
  {
    title: "Logs não são enviados",
    description:
      "Verifique se o canal de logs existe, se o bot consegue enviar mensagens nele e se o módulo de logs está ativado para o servidor.",
  },
  {
    title: "Permissões de ticket estão erradas",
    description:
      "Revise os cargos definidos como equipe, cargos com acesso e cargos bloqueados. Também confirme a ordem dos cargos do bot dentro do Discord.",
  },
];

const beforeContact = [
  "Nome e ID do servidor.",
  "Canal ou painel onde o problema acontece.",
  "Print ou mensagem exata do erro.",
  "O que você tentou fazer antes do erro aparecer.",
  "Se o problema acontece com todos os membros ou apenas com alguns.",
];

export default function SupportPage() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Suporte"
            title="Como podemos ajudar?"
            description="Encontre ajuda para configurar o ByteUP BOT, resolver problemas no painel ou entender melhor os módulos disponíveis."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {supportOptions.map((option) => {
              const content = (
                <>
                  <h2 className="text-lg font-black text-white">
                    {option.title}
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-[#aaa3b5]">
                    {option.description}
                  </p>

                  <div className="mt-5 text-sm font-black text-[#d9b4ff]">
                    {option.label}
                  </div>
                </>
              );

              if (option.external) {
                return (
                  <a
                    key={option.title}
                    href={option.href}
                    target="_blank"
                    rel="noreferrer"
                    className="site-card-soft p-6 transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <Link
                  key={option.title}
                  href={option.href}
                  className="site-card-soft p-6 transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container grid gap-8 lg:grid-cols-[1fr_0.75fr]">
          <article className="site-card p-6 md:p-8">
            <h2 className="site-title text-3xl font-black text-white">
              Problemas comuns
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#aaa3b5]">
              A maioria dos problemas acontece por permissões insuficientes,
              configurações incompletas ou canais que foram apagados depois de
              serem salvos no painel. Veja alguns pontos para conferir antes de
              pedir ajuda.
            </p>

            <div className="mt-7 space-y-4">
              {commonIssues.map((issue) => (
                <div
                  key={issue.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <h3 className="font-black text-white">{issue.title}</h3>

                  <p className="mt-2 text-sm leading-7 text-[#aaa3b5]">
                    {issue.description}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <aside className="space-y-5">
            <div className="site-card-soft p-6">
              <h2 className="text-xl font-black text-white">
                Antes de chamar suporte
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#aaa3b5]">
                Enviar as informações certas ajuda a equipe a entender o caso
                mais rápido e evita várias perguntas repetidas.
              </p>

              <div className="mt-5 space-y-3">
                {beforeContact.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-[#d8d1df]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="site-card p-6">
              <h2 className="text-xl font-black text-white">
                Servidor oficial
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#aaa3b5]">
                Entre no servidor para acompanhar novidades, pedir ajuda,
                reportar bugs e falar sobre configurações do ByteUP BOT.
              </p>

              <a
                href="https://discord.gg/CRKsUuYM4V"
                target="_blank"
                rel="noreferrer"
                className="site-button-primary mt-6 w-full"
              >
                Entrar no servidor de suporte
              </a>
            </div>
          </aside>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
