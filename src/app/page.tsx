"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";

import LandingNavbar from "./components/LandingNavbar";
import LandingFooter from "./components/LandingFooter";
import SectionHeader from "./components/SectionHeader";
import FeatureCard from "./components/FeatureCard";
import { features } from "./data/features";

const quickLinks = [
  ["Documentação", "Guias para configurar o bot com segurança.", "/documentacao"],
  ["Comandos", "Lista organizada dos comandos disponíveis.", "/comandos"],
  ["Tickets", "Atendimento com painéis, permissões e transcript.", "/documentacao/tickets"],
  ["Suporte", "Veja como pedir ajuda ou reportar problemas.", "/suporte"],
];

const stats = [
  ["Multi-servidor", "Configurações separadas por comunidade."],
  ["Painel web", "Controle visual sem depender só do Discord."],
  ["Modular", "Ative apenas o que seu servidor precisa."],
];

export default function Home() {
  const { status } = useSession();
  const isLogged = status === "authenticated";

  const login = () => {
    if (isLogged) {
      window.location.href = "/dashboard";
      return;
    }

    signIn("discord", { callbackUrl: "/dashboard" });
  };

  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-container grid min-h-[calc(100vh-72px)] items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="site-fade-up">
          <div className="site-pill">
          
            Painel moderno para comunidades Discord
          </div>

          <h1 className="site-title mt-6 max-w-4xl text-5xl font-black leading-[0.95] text-white md:text-7xl">
            Administração de servidor sem bagunça.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#aaa3b5]">
            O ByteUP BOT junta tickets, logs, moderação, automoderação,
            economia, níveis e boas-vindas em um painel simples de usar,
            sem transformar seu servidor em um labirinto de comandos.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={login} className="site-button-primary">
              {isLogged ? "Ir para o dashboard" : "Entrar com Discord"}
            </button>

            <Link href="/documentacao" className="site-button-secondary">
              Ler documentação
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {stats.map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="font-black text-white">{title}</div>
                <div className="mt-1 text-sm leading-5 text-[#8d8499]">{description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="site-fade-up site-delay-2">
          <div className="site-card relative overflow-hidden p-4">
            <div className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-[#aaa3b5]">
              Preview real do painel
            </div>

            <div className="rounded-[20px] border border-white/10 bg-[#141219] p-5">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-xl">
                  🎫
                </div>

                <div>
                  <div className="font-black text-white">Sistema de Tickets</div>
                  <div className="text-sm text-[#8d8499]">Atendimento configurável</div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ["Painel público", "Embed, botões e select"],
                  ["Mensagem interna", "Texto ou embed"],
                  ["Permissões", "Cargos da equipe"],
                  ["Transcript HTML", "Histórico no fechamento"],
                  ["Mensagens", "Erros e avisos editáveis"],
                ].map(([title, value]) => (
                  <div key={title} className="flex items-center justify-between rounded-2xl bg-white/[0.035] px-4 py-3">
                    <span className="text-sm font-semibold text-white">{title}</span>
                    <span className="text-xs text-[#8d8499]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-white/10 bg-[#2b2d31] p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#8d8499]">
                Mensagem no Discord
              </div>

              <div className="rounded-2xl bg-[#313338] p-4">
                <div className="border-l-4 border-[#b64cff] pl-4">
                  <div className="font-bold text-white">Ticket aberto</div>
                  <p className="mt-1 text-sm leading-6 text-[#dbdee1]">
                    Olá @usuário, descreva seu problema com detalhes. A equipe
                    vai responder assim que possível.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-[#da373c] px-3 py-2 text-xs font-bold">Fechar</span>
                    <span className="rounded-lg bg-[#5865f2] px-3 py-2 text-xs font-bold">Assumir</span>
                    <span className="rounded-lg bg-[#4e5058] px-3 py-2 text-xs font-bold">Adicionar membro</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="site-float mt-4 hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-[#aaa3b5] md:block">
            “A ideia é configurar uma vez no painel e deixar o bot cuidar do fluxo.”
          </div>
        </div>
      </section>

      <section id="recursos" className="site-section border-y border-white/10 bg-white/[0.018]">
        <div className="site-container">
          <SectionHeader
            eyebrow="Recursos"
            title="Ferramentas para o servidor funcionar melhor"
            description="Nada de dezenas de bots diferentes para tarefas simples. O ByteUP centraliza as partes mais importantes da administração."
            centered
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="site-section">
        <div className="site-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeader
              eyebrow="Fluxo"
              title="Do painel para o Discord em poucos minutos"
              description="Você entra com Discord, escolhe o servidor e configura cada módulo com campos visuais."
            />

            <button type="button" onClick={login} className="site-button-primary mt-8">
              {isLogged ? "Abrir dashboard" : "Começar agora"}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["1", "Entre com Discord", "Acesse os servidores onde você tem permissão."],
              ["2", "Escolha o servidor", "Cada servidor mantém suas próprias configurações."],
              ["3", "Configure os módulos", "Tickets, logs, automod, níveis e muito mais."],
              ["4", "Use no Discord", "O bot aplica tudo diretamente no servidor."],
            ].map(([number, title, description]) => (
              <div key={number} className="site-card-soft p-5">
                <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-black">
                  {number}
                </div>
                <h3 className="font-black text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#aaa3b5]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="site-section-sm overflow-hidden border-y border-white/10 bg-[#111014]">
        <div className="site-marquee flex w-max gap-3">
          {[...quickLinks, ...quickLinks, ...quickLinks].map(([title, description, href], index) => (
            <Link
              key={`${href}-${index}`}
              href={href}
              className="w-[290px] rounded-3xl border border-white/10 bg-white/[0.035] p-5 transition-colors hover:bg-white/[0.06]"
            >
              <div className="font-black text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-[#aaa3b5]">{description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="site-section">
        <div className="site-container">
          <div className="site-card overflow-hidden p-8 md:p-12">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <div className="site-pill">Pronto para usar</div>
                <h2 className="site-title mt-5 text-4xl font-black leading-tight text-white md:text-6xl">
                  Organize seu servidor antes que ele vire confusão.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#aaa3b5]">
                  Configure o ByteUP BOT do seu jeito, com mensagens,
                  permissões, categorias e módulos separados por servidor.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={login} className="site-button-primary">
                    {isLogged ? "Ir para o dashboard" : "Entrar com Discord"}
                  </button>

                  <Link href="/comandos" className="site-button-secondary">
                    Ver comandos
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                <div className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#8d8499]">
                  Incluído
                </div>

                <div className="space-y-3">
                  {[
                    "Tickets avançados",
                    "Logs detalhados",
                    "Moderação e AutoMod",
                    "Economia e níveis",
                    "Boas-vindas e saída",
                    "Painel multi-servidor",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-[#d8d1df]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#73d99f]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
