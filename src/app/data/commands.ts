export const commandCategories = [
  {
    name: "Economia",
    description: "Comandos de moedas, saldo e transferências entre membros.",
    commands: [
      ["/balance", "Ver seu saldo nas moedas do servidor."],
      ["/pay", "Transferir moedas para outro usuário."],
    ],
  },
  {
    name: "Diversão",
    description: "Comandos sociais, jogos rápidos e interações entre usuários.",
    commands: [
      ["/abracar", "Abraçar um usuário."],
      ["/avatar", "Mostrar o avatar de um usuário."],
      ["/beijo", "Dar um beijo em um usuário."],
      ["/cara coroa", "Jogar cara ou coroa e desafiar alguém."],
      ["/piada", "Receber uma piada aleatória."],
      ["/ping", "Mostrar a latência do bot."],
      ["/rolardados", "Rolar dados e apostar contra o bot."],
      ["/tapa", "Dar um tapa em um usuário."],
    ],
  },
  {
    name: "Níveis / XP",
    description: "Comandos de nível, XP, ranking e administração de progresso.",
    commands: [
      ["/leaderboard", "Ver o top 10 de XP do servidor."],
      ["/level", "Ver seu nível e XP atual."],
      ["/resetall", "Resetar XP e nível de um membro. Comando de staff."],
      ["/setlevel", "Definir o nível de um membro. Comando de staff."],
      ["/setxp", "Definir o XP de um membro. Comando de staff."],
    ],
  },
  {
    name: "Moderação",
    description:
      "Comandos administrativos para punições, cargos, canais, emojis e AutoMod.",
    commands: [
      ["/panelaccess", "Gerenciar acesso ao painel. Comando de administrador."],
      ["/adicionaremoji", "Adicionar emoji ao servidor. Comando de staff."],
      [
        "/automod bypass",
        "Gerenciar bypass do AutoMod por usuário ou cargo: adicionar, remover e listar.",
      ],
      [
        "/automod links",
        "Gerenciar links bloqueados e permitidos pelo AutoMod.",
      ],
      [
        "/automod words",
        "Gerenciar palavras proibidas pelo AutoMod.",
      ],
      [
        "/automod settings",
        "Configurar limites do AutoMod, como menções, linhas, zalgo e outros filtros.",
      ],
      [
        "/automod reset",
        "Resetar as configurações do AutoMod para o padrão.",
      ],
      [
        "/automod stats",
        "Mostrar estatísticas do AutoMod.",
      ],
      ["/ban", "Banir um membro do servidor."],
      ["/clear", "Apagar mensagens do canal, até 100 por vez."],
      ["/kick", "Expulsar um membro do servidor."],
      ["/lock", "Trancar o canal atual."],
      [
        "/punicoes",
        "Listar punições de um usuário ou do servidor.",
      ],
      [
        "/removeremoji",
        "Remover emoji do servidor. Comando de staff.",
      ],
      [
        "/roles",
        "Listar todos os cargos do servidor. Comando de staff.",
      ],
      ["/timeout", "Silenciar um membro temporariamente."],
      ["/unban", "Desbanir um usuário."],
      ["/unlock", "Destrancar o canal atual."],
      ["/untimeout", "Remover o silenciamento de um membro."],
      ["/unwarn", "Remover uma advertência de um membro."],
      ["/warn", "Advertir um membro."],
    ],
  },
  {
    name: "Utilidades",
    description:
      "Comandos úteis para informações, tickets, aniversários, enquetes e ferramentas gerais.",
    commands: [
      [
        "/aniversario definir",
        "Definir sua data de aniversário.",
      ],
      [
        "/aniversario ver",
        "Ver o aniversário de um usuário.",
      ],
      [
        "/aniversario remover",
        "Remover sua data de aniversário.",
      ],
      ["/botinfo", "Mostrar informações detalhadas do bot."],
      [
        "/emoji",
        "Listar todos os emojis do servidor. Comando de staff.",
      ],
      [
        "/enquete",
        "Criar enquete interativa com votação.",
      ],
      [
        "/help",
        "Mostrar a central de ajuda interativa.",
      ],
      [
        "/previsao tempo",
        "Mostrar a previsão do tempo para uma cidade.",
      ],
      ["/serverinfo", "Mostrar informações do servidor."],
      [
        "/ticket enviar",
        "Enviar um painel de ticket configurado pelo dashboard.",
      ],
      [
        "/ticket limpar",
        "Fechar ou limpar tickets presos por usuário, painel ou canal.",
      ],
      [
        "/ticket limpar-perdidos",
        "Fechar tickets cujos canais não existem mais.",
      ],
      ["/traduzir", "Traduzir texto para outro idioma."],
      ["/userinfo", "Mostrar informações de um usuário."],
    ],
  },
];

export const commandSummary = {
  prefix: "/",
  totalLabel: "41 comandos principais + subcomandos",
  description:
    "Todos os comandos atuais do ByteUP BOT organizados por categoria.",
};