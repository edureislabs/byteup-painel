"use client";

import { signIn } from "next-auth/react";

const features = [
  {
    title: "Painel multi-servidor",
    description:
      "Gerencie configurações diferentes para cada servidor de forma simples, visual e centralizada.",
    icon: "🌐",
  },
  {
    title: "Sistema de tickets completo",
    description:
      "Crie painéis, embeds, formulários, permissões, limites, transcript HTML, avaliação, logs e ações de moderador.",
    icon: "🎫",
  },
  {
    title: "Logs avançados",
    description:
      "Monitore eventos importantes do servidor com registros detalhados de mensagens, moderação, tickets e atividades.",
    icon: "📋",
  },
  {
    title: "Automoderação",
    description:
      "Bloqueie links, convites, palavras proibidas, spam, excesso de menções e aplique ações automáticas.",
    icon: "🛡️",
  },
  {
    title: "Boas-vindas e saídas",
    description:
      "Configure mensagens personalizadas para entrada e saída de membros com embeds, imagens e variáveis.",
    icon: "👋",
  },
  {
    title: "Economia e engajamento",
    description:
      "Sistema de moedas, daily, pagamentos, ranking, XP, níveis, aniversários e jogos para movimentar a comunidade.",
    icon: "✨",
  },
];

const modules = [
  {
    name: "Tickets",
    items: [
      "Painel público com embed, botões e selects",
      "Mensagem interna do ticket configurável",
      "Botões de moderador",
      "Adicionar e remover membros",
      "Assumir atendimento",
      "Renomear canal",
      "Call temporária automática",
      "Transcript HTML",
      "Logs de abertura, fechamento e ações",
      "Fechamento em duas etapas",
      "Limites, cooldown e inatividade",
      "Mensagens do sistema editáveis",
    ],
  },
  {
    name: "Moderação",
    items: [
      "Ban, kick, timeout e warn",
      "Histórico de punições",
      "Automoderação por palavras, links e convites",
      "Canais bloqueados para comandos",
      "Logs de ações administrativas",
    ],
  },
  {
    name: "Comunidade",
    items: [
      "Boas-vindas",
      "Mensagem de saída",
      "Aniversários",
      "Sistema de níveis",
      "Ranking de XP",
      "Interações como abraço, beijo e tapa",
    ],
  },
  {
    name: "Utilidades",
    items: [
      "Informações do servidor",
      "Informações de usuário",
      "Avatar",
      "Tradução",
      "Previsão do tempo",
      "Enquetes",
      "Gerenciamento de emojis",
    ],
  },
];

const docs = [
  {
    title: "1. Faça login com Discord",
    description:
      "Entre usando sua conta do Discord para acessar apenas os servidores onde você tem permissão.",
  },
  {
    title: "2. Escolha um servidor",
    description:
      "Depois do login, selecione o servidor que deseja configurar no painel.",
  },
  {
    title: "3. Ative os módulos",
    description:
      "Configure tickets, logs, automoderação, boas-vindas, economia, níveis e outros sistemas.",
  },
  {
    title: "4. Salve e use no Discord",
    description:
      "As configurações ficam salvas no banco de dados e o bot aplica tudo diretamente no servidor.",
  },
];

const ticketDocs = [
  {
    title: "Painel de abertura",
    description:
      "É a mensagem enviada no canal público para os usuários abrirem tickets. Pode ter texto, embed, botões e selects.",
  },
  {
    title: "Mensagem do ticket",
    description:
      "É a mensagem enviada dentro do canal criado quando o ticket é aberto. Também pode ter embed e componentes.",
  },
  {
    title: "Aba Moderador",
    description:
      "Define botões como fechar, assumir, renomear, adicionar membro, remover membro e criar call temporária.",
  },
  {
    title: "Permissões",
    description:
      "Controla cargos da staff, cargos que podem gerenciar, usuários bloqueados e permissões do dono do ticket.",
  },
  {
    title: "Formulários",
    description:
      "Permite abrir um modal antes do ticket ser criado, coletando informações do usuário.",
  },
  {
    title: "Limites",
    description:
      "Controla limite de tickets, cooldown, limite diário e fechamento automático por inatividade.",
  },
  {
    title: "Mensagens",
    description:
      "Permite editar avisos, erros e mensagens automáticas do sistema, escolhendo texto simples ou embed.",
  },
];

const commands = [
  {
    command: "/ticket enviar",
    description: "Envia um painel de ticket configurado pelo dashboard.",
  },
  {
    command: "/ticket limpar",
    description: "Limpa ou fecha um ticket preso no banco de dados.",
  },
  {
    command: "/ban",
    description: "Bane um usuário do servidor.",
  },
  {
    command: "/kick",
    description: "Expulsa um usuário do servidor.",
  },
  {
    command: "/timeout",
    description: "Aplica timeout em um membro.",
  },
  {
    command: "/warn",
    description: "Registra uma advertência.",
  },
  {
    command: "/userinfo",
    description: "Mostra informações de um usuário.",
  },
  {
    command: "/serverinfo",
    description: "Mostra informações do servidor.",
  },
];

const variables = [
  "{user}",
  "{username}",
  "{server}",
  "{channel}",
  "{ticketId}",
  "{panel}",
  "{staff}",
  "{member}",
  "{reason}",
  "{oldName}",
  "{newName}",
  "{time}",
  "{limit}",
  "{cooldown}",
  "{count}",
];

const faqs = [
  {
    question: "Preciso configurar tudo pelo Discord?",
    answer:
      "Não. A maior parte das configurações é feita pelo painel web, de forma visual.",
  },
  {
    question: "O bot funciona em vários servidores?",
    answer:
      "Sim. Cada servidor possui suas próprias configurações salvas separadamente.",
  },
  {
    question: "O sistema de tickets tem transcript?",
    answer:
      "Sim. O ticket pode gerar transcript HTML no fechamento e enviar nos logs ou no privado do usuário.",
  },
  {
    question: "Posso personalizar mensagens do ticket?",
    answer:
      "Sim. A aba Mensagens permite editar textos, embeds, avisos e erros automáticos do sistema.",
  },
  {
    question: "Os cargos da staff são configuráveis?",
    answer:
      "Sim. Na aba Permissões você define quais cargos podem acessar, gerenciar e assumir tickets.",
  },
];

export default function Home() {
  const handleLogin = () => {
    signIn("discord", {
      callbackUrl: "/dashboard",
    });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#050008] text-white">
      <section className="relative border-b border-[#C100FF]/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(193,0,255,0.28),transparent_35%),radial-gradient(circle_at_top_right,rgba(138,43,255,0.22),transparent_32%),linear-gradient(180deg,#090011_0%,#050008_100%)]" />
        <div className="absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full bg-[#C100FF]/20 blur-[100px]" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C100FF] to-[#8A2BFF] text-xl font-black shadow-[0_0_30px_rgba(193,0,255,0.35)]">
              B
            </div>

            <div>
              <div className="text-sm font-bold uppercase tracking-[0.25em] text-[#C100FF]">
                ByteUP
              </div>
              <div className="text-xs text-gray-400">Discord Bot</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-gray-300 md:flex">
            <a href="#recursos" className="transition-colors hover:text-white">
              Recursos
            </a>
            <a href="#tickets" className="transition-colors hover:text-white">
              Tickets
            </a>
            <a href="#docs" className="transition-colors hover:text-white">
              Documentação
            </a>
            <a href="#comandos" className="transition-colors hover:text-white">
              Comandos
            </a>
          </nav>

          <button
            type="button"
            onClick={handleLogin}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#120018] transition-all hover:scale-105 hover:bg-[#C100FF] hover:text-white"
          >
            Entrar
          </button>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C100FF]/30 bg-[#C100FF]/10 px-4 py-2 text-sm text-[#f0c5ff]">
              <span className="h-2 w-2 rounded-full bg-[#C100FF] shadow-[0_0_15px_#C100FF]" />
              Painel moderno para gerenciar seu bot
            </div>

            <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Controle seu servidor Discord com o{" "}
              <span className="bg-gradient-to-r from-[#C100FF] to-[#8A2BFF] bg-clip-text text-transparent">
                ByteUP BOT
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-gray-300 md:text-lg">
              Um bot completo para tickets, logs, moderação, automoderação,
              boas-vindas, economia, níveis, interações e gerenciamento
              multi-servidor através de um painel web intuitivo.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleLogin}
                className="rounded-2xl bg-gradient-to-r from-[#C100FF] to-[#8A2BFF] px-7 py-4 text-sm font-bold text-white shadow-[0_0_35px_rgba(193,0,255,0.35)] transition-all hover:scale-[1.02]"
              >
                Entrar com Discord
              </button>

              <a
                href="#docs"
                className="rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-center text-sm font-bold text-white transition-all hover:border-[#C100FF]/50 hover:bg-[#C100FF]/10"
              >
                Ver documentação
              </a>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-2xl font-black text-white">24/7</div>
                <div className="mt-1 text-xs text-gray-400">Online</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-2xl font-black text-white">Multi</div>
                <div className="mt-1 text-xs text-gray-400">Servidor</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-2xl font-black text-white">100%</div>
                <div className="mt-1 text-xs text-gray-400">Painel web</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-[#C100FF]/30 to-[#8A2BFF]/30 blur-2xl" />

            <div className="relative rounded-[2rem] border border-white/10 bg-[#0d0015]/90 p-5 shadow-2xl backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">
                    Dashboard ByteUP
                  </div>
                  <div className="text-xs text-gray-500">
                    Sistema de tickets
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                </div>
              </div>

              <div className="rounded-2xl border border-[#C100FF]/20 bg-[#140020] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C100FF]/20">
                    🎫
                  </div>
                  <div>
                    <div className="font-bold">Painel de Ticket</div>
                    <div className="text-xs text-gray-400">
                      Embed, botões, selects e formulários
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    "Mensagem do Ticket",
                    "Permissões da Staff",
                    "Formulário personalizado",
                    "Transcript HTML",
                    "Mensagens editáveis",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3"
                    >
                      <span className="text-sm text-gray-300">{item}</span>
                      <span className="rounded-full bg-green-400/10 px-2 py-1 text-xs text-green-300">
                        Ativo
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button className="rounded-xl bg-[#C100FF] py-3 text-sm font-bold">
                    Salvar
                  </button>
                  <button className="rounded-xl bg-white/10 py-3 text-sm font-bold">
                    Preview
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-[#111111] p-4">
                <div className="mb-3 text-sm font-bold text-white">
                  Preview Discord
                </div>

                <div className="rounded-xl bg-[#313338] p-4">
                  <div className="flex gap-3 rounded bg-[#2b2d31] p-3">
                    <div className="w-1 rounded-full bg-[#C100FF]" />
                    <div>
                      <div className="text-sm font-bold">Ticket aberto</div>
                      <div className="mt-1 text-sm text-[#dbdee1]">
                        Olá @usuário, seu ticket foi criado com sucesso.
                      </div>
                      <div className="mt-3 flex gap-2">
                        <span className="rounded bg-[#da373c] px-3 py-2 text-xs">
                          🔒 Fechar
                        </span>
                        <span className="rounded bg-[#5865F2] px-3 py-2 text-xs">
                          🙋 Assumir
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <div className="text-sm font-bold uppercase tracking-[0.25em] text-[#C100FF]">
            Recursos
          </div>
          <h2 className="mt-3 text-3xl font-black md:text-4xl">
            Tudo que você precisa para administrar sua comunidade
          </h2>
          <p className="mt-4 text-gray-400">
            O ByteUP reúne sistemas essenciais para servidores Discord em um só
            painel, com configurações visuais e controle por servidor.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:-translate-y-1 hover:border-[#C100FF]/40 hover:bg-[#C100FF]/5"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C100FF]/15 text-2xl">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="tickets" className="border-y border-white/10 bg-[#090011]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.25em] text-[#C100FF]">
                Sistema de Tickets
              </div>
              <h2 className="mt-3 text-3xl font-black md:text-4xl">
                Tickets avançados e totalmente configuráveis
              </h2>
              <p className="mt-4 text-gray-400">
                Crie um fluxo completo de atendimento com permissões, mensagens,
                embeds, botões, selects, formulários, logs, transcript e
                avaliação.
              </p>

              <button
                type="button"
                onClick={handleLogin}
                className="mt-8 rounded-2xl bg-gradient-to-r from-[#C100FF] to-[#8A2BFF] px-7 py-4 text-sm font-bold text-white shadow-[0_0_35px_rgba(193,0,255,0.28)]"
              >
                Configurar tickets
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {ticketDocs.map((doc) => (
                <div
                  key={doc.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <h3 className="font-bold text-white">{doc.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    {doc.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="docs" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.25em] text-[#C100FF]">
              Documentação
            </div>
            <h2 className="mt-3 text-3xl font-black md:text-4xl">
              Como começar
            </h2>
            <p className="mt-4 text-gray-400">
              Em poucos passos você conecta sua conta, escolhe o servidor e
              começa a configurar os módulos do bot.
            </p>
          </div>

          <div className="space-y-4">
            {docs.map((doc, index) => (
              <div
                key={doc.title}
                className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#C100FF]/15 font-black text-[#C100FF]">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-bold text-white">{doc.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    {doc.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h3 className="text-2xl font-black">Módulos disponíveis</h3>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {modules.map((module) => (
              <div
                key={module.name}
                className="rounded-3xl border border-white/10 bg-[#0d0015] p-6"
              >
                <h4 className="text-lg font-bold text-white">{module.name}</h4>

                <ul className="mt-4 space-y-3">
                  {module.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-gray-300">
                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#C100FF]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 rounded-3xl border border-[#C100FF]/20 bg-[#C100FF]/5 p-6">
          <h3 className="text-2xl font-black">Variáveis de mensagens</h3>
          <p className="mt-3 text-sm text-gray-400">
            Use variáveis para personalizar mensagens, embeds e avisos
            automáticos do sistema de tickets.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {variables.map((variable) => (
              <code
                key={variable}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-200"
              >
                {variable}
              </code>
            ))}
          </div>
        </div>
      </section>

      <section id="comandos" className="border-y border-white/10 bg-[#090011]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <div className="text-sm font-bold uppercase tracking-[0.25em] text-[#C100FF]">
              Comandos
            </div>
            <h2 className="mt-3 text-3xl font-black md:text-4xl">
              Comandos úteis do bot
            </h2>
            <p className="mt-4 text-gray-400">
              Além do painel web, o bot possui comandos slash para ações rápidas
              diretamente no Discord.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            {commands.map((item) => (
              <div
                key={item.command}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <code className="rounded-lg bg-black/40 px-3 py-2 text-sm text-[#f0c5ff]">
                  {item.command}
                </code>
                <p className="mt-4 text-sm text-gray-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.25em] text-[#C100FF]">
              Segurança
            </div>
            <h2 className="mt-3 text-3xl font-black md:text-4xl">
              Controle de acesso e permissões
            </h2>
            <p className="mt-4 text-gray-400">
              O painel usa login com Discord e valida permissões por servidor.
              Assim, cada administrador acessa apenas os servidores permitidos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              "Login com Discord",
              "Permissões por servidor",
              "Cargos da staff configuráveis",
              "Bloqueio de usuários",
              "Logs administrativos",
              "Configuração multi-servidor",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="mb-3 text-2xl">✅</div>
                <div className="font-bold">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#090011]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <div className="text-sm font-bold uppercase tracking-[0.25em] text-[#C100FF]">
              FAQ
            </div>
            <h2 className="mt-3 text-3xl font-black md:text-4xl">
              Perguntas frequentes
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <h3 className="font-bold text-white">{faq.question}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-6 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(193,0,255,0.2),transparent_38%)]" />

        <div className="relative mx-auto max-w-4xl rounded-[2rem] border border-[#C100FF]/20 bg-[#0d0015]/90 p-10 text-center shadow-[0_0_70px_rgba(193,0,255,0.16)]">
          <h2 className="text-3xl font-black md:text-5xl">
            Pronto para configurar seu servidor?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-gray-400">
            Entre com Discord, escolha seu servidor e comece a personalizar o
            ByteUP BOT do seu jeito.
          </p>

          <button
            type="button"
            onClick={handleLogin}
            className="mt-8 rounded-2xl bg-gradient-to-r from-[#C100FF] to-[#8A2BFF] px-8 py-4 text-sm font-bold text-white shadow-[0_0_35px_rgba(193,0,255,0.35)] transition-all hover:scale-[1.02]"
          >
            Entrar com Discord
          </button>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-gray-500 md:flex-row">
          <div>© {new Date().getFullYear()} ByteUP BOT. Todos os direitos reservados.</div>

          <div className="flex gap-5">
            <a href="#recursos" className="hover:text-white">
              Recursos
            </a>
            <a href="#docs" className="hover:text-white">
              Documentação
            </a>
            <a href="#comandos" className="hover:text-white">
              Comandos
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}