import { BUILDER_BASE, PRIVILEGED_LABEL, builderModule, type BuilderOptions, type PrivilegedIntent } from "./catalog";

/** Dicas de configuração de cada módulo (aparecem no README do bot). */
const PRIMEIROS_PASSOS: Record<string, string[]> = {
  moderacao: [
    "`/config moderacao canal canal:#punicoes` — onde as punições ficam registradas",
    "`/config moderacao limite advertencias:3 acao:Castigo duracao:1h` — punição automática (opcional)",
    "`/config moderacao dm ativar:False` — se não quiser avisar o membro na DM",
  ],
  automod: [
    "`/config automod ativar ligado:True` — liga o AutoMod (já bloqueia convites)",
    "`/config automod links bloquear:True` e `/config automod permitir-site site:youtube.com` — links",
    "`/config automod palavra palavra:...` — adiciona (ou remove) uma palavra proibida",
    "`/config automod flood limite:5` — no máximo 5 mensagens a cada 5 segundos",
    "`/config automod registro canal:#automod` — onde registrar o que foi apagado",
    "Quem tem **Gerenciar mensagens** nunca é afetado. Use `imune` e `ignorar-canal` para outras exceções.",
  ],
  boasvindas: [
    "`/config boasvindas entrada canal:#boas-vindas` — mensagem quando alguém entra",
    "`/config boasvindas saida canal:#saidas` — mensagem quando alguém sai",
    "`/config boasvindas cargo cargo:@Membro` — cargo automático (até 5)",
    "`/config boasvindas testar` — mostra como fica",
    "Variáveis nas mensagens: `{usuario}` `{nome}` `{tag}` `{servidor}` `{membros}`",
  ],
  logs: [
    "`/config logs canal canal:#logs` — liga os registros",
    "`/config logs tipo tipo:... ligado:False` — desliga um tipo (mensagens, membros, banimentos, canais, voz)",
  ],
  niveis: [
    "Já vem ligado: cada mensagem vale de 15 a 25 XP (uma vez por minuto).",
    "`/config niveis aviso canal:#niveis` — onde avisar quem sobe de nível",
    "`/config niveis recompensa nivel:10 cargo:@Veterano` — cargo ao chegar num nível",
    "`/config niveis xp minimo:15 maximo:25 intervalo:60` — quanto XP cada mensagem vale",
  ],
  economia: [
    "`/config economia moeda nome:coins emoji:🪙` — nome e emoji da moeda",
    "`/config economia ganhos diario:500` — valores do /diario e do /trabalhar",
    "`/config economia loja-adicionar nome:VIP preco:5000 cargo:@VIP` — coloca um cargo à venda",
  ],
  tickets: [
    "`/config tickets categoria categoria:Atendimento` — onde os canais são criados",
    "`/config tickets equipe cargo:@Suporte` — quem atende (padrão: o cargo do /config staff)",
    "`/config tickets registro canal:#tickets-log` — recebe o histórico em .txt",
    "`/ticket painel` — envia o painel com o botão **Abrir ticket**",
    "Com assuntos: `/ticket assunto adicionar nome:Compras emoji:🛒 categoria:Vendas equipe:@Vendas` (até 25; cada um pode ter categoria, equipe e mensagem própria)",
    "Depois `/ticket painel modo:Menu de assuntos` — a pessoa escolhe o assunto num menu. `/ticket assunto lista` mostra todos",
  ],
  sugestoes: ["`/config sugestoes canal canal:#sugestoes` — onde as sugestões são publicadas"],
  verificacao: [
    "`/verificacao configurar cargo:@Membro` — cargo que a pessoa ganha ao se verificar",
    "Opcional na mesma linha: `remover:@NaoVerificado`, `idade-minima:7` (conta com pelo menos 7 dias) e `registro:#verificacoes`",
    "`/verificacao painel canal:#verificacao` — envia o painel com o botão **Verificar**",
    "Dica: deixe os canais do servidor visíveis só para quem tem o cargo de membro; o canal de verificação fica aberto para todos.",
  ],
  autorespostas: [
    "`/autoresposta adicionar gatilho:ip do servidor resposta:O IP é jogar.exemplo.com` — cria uma resposta",
    "`modo:` contém a palavra (padrão), é exatamente ou começa com",
    "`/tag nome:...` mostra qualquer resposta salva; `/autoresposta lista` mostra todas",
  ],
  antiraid: [
    "`/antiraid configurar alerta:#equipe limite:10 segundos:30` — liga a proteção (10 entradas em 30 s = modo raid)",
    "`acao:` o que fazer com quem entra durante o raid: expulsar (padrão), castigo de 1 hora ou nada",
    "`idade-minima:3` — expulsa sempre contas com menos de 3 dias (opcional)",
    "No modo raid o bot sobe a verificação do servidor ao máximo e pausa os convites; encerre pelo botão ou com `/antiraid encerrar`",
  ],
  convites: [
    "Dê ao bot a permissão **Gerenciar servidor** (sem ela o Discord não mostra os convites)",
    "`/convites configurar canal:#entradas` — avisa quem entrou e quem convidou",
    "`/convites ver`, `/convites ranking` e `/convites quem usuario:@pessoa`",
    "Contas com menos de 7 dias contam como **falsas** (mude com `dias-falso:`)",
  ],
  reputacao: [
    "`/rep usuario:@pessoa` — cada membro dá 1 ponto por dia",
    "`/reputacao recompensa pontos:10 cargo:@Confiável` — cargo ao chegar em 10 pontos",
    "`/reputacao ranking` e `/reputacao ver`",
  ],
  avaliacoes: [
    "Já vem ligada: quando um ticket fecha, quem abriu recebe a avaliação na DM",
    "`/avaliacoes configurar canal:#avaliacoes` — onde as notas aparecem",
    "`/avaliacoes ranking` e `/avaliacoes atendente usuario:@pessoa`",
    "Assuma o ticket (botão **Assumir**) para a nota contar para o atendente certo",
  ],
  formularios: [
    "`/formulario criar titulo:Candidatura para a equipe canal:#candidaturas cargo:@Ajudante`",
    "`/formulario pergunta formulario:... texto:Qual a sua idade?` — até 5 perguntas (limite do Discord), de até 45 letras",
    "`/formulario painel formulario:...` — envia o botão **Preencher**",
    "A equipe aprova ou recusa pelos botões; ao aprovar, a pessoa ganha o cargo (se configurado) e recebe a resposta na DM",
  ],
  cargostemp: [
    "`/cargotemp dar usuario:@pessoa cargo:@VIP duracao:30d` — o cargo sai sozinho em 30 dias",
    "Dar de novo o mesmo cargo renova o prazo; `/cargotemp lista` mostra os ativos",
    "`/cargotemp registro canal:#logs` — registra quando cada cargo sai",
  ],
  callstemp: [
    "`/salas configurar` — cria a call **➕ Criar sala** (ou escolha uma com `canal:`)",
    "`nome:Sala de {nome}` e `limite:5` mudam o padrão das salas",
    "Dentro da própria sala, o dono usa `/sala nome`, `/sala limite`, `/sala trancar`, `/sala permitir`, `/sala expulsar`",
    "Se o dono sair, outra pessoa pode usar `/sala reivindicar`",
  ],
  contadores: [
    "`/contadores criar tipo:Membros` — cria um canal \"👥 Membros: 1.234\" (também: online, boosts, canais, cargos)",
    "`nome:` muda o texto; `{n}` vira o número. Atualiza a cada 10 minutos (limite do Discord para renomear canais)",
  ],
  destaques: [
    "`/destaques configurar canal:#destaques minimo:3` — mensagens com 3 ⭐ vão para o destaque",
    "`emoji:` troca a ⭐ por outro emoji (pode ser um do servidor)",
  ],
  contagem: [
    "`/contagem canal canal:#contar` — liga o jogo",
    "Dica: coloque esse canal nas exceções do AutoMod (`/config automod ignorar-canal`) e dos Níveis (`/config niveis ignorar-canal`)",
  ],
  afk: ["Cada membro usa `/afk motivo:almoçando`. Para mudar o apelido para \"[AFK]\", o bot precisa da permissão **Gerenciar apelidos**."],
  anuncios: [
    "`/anuncio criar canal:#avisos mensagem:Leiam as regras! quando:17/11 09:00 repetir:7d`",
    "`quando:` aceita \"25/12 09:00\", \"18:30\", \"9h\" ou \"em 2h\"; `repetir:` aceita \"12h\", \"1d\", \"7d\" (mínimo 10 minutos)",
    "Para marcar um cargo que não é mencionável, o bot precisa da permissão **Mencionar @everyone**",
  ],
  embeds: [
    "`/embed criar canal:#regras botao1:Site | https://seusite.com` — abre o formulário (título, texto, cor, imagem, rodapé)",
    "`/embed editar mensagem:<link da mensagem>` — muda um embed que o bot enviou",
  ],
  personalizar: [
    "No Discord, use `/personalizar baixar`: o bot manda o arquivo **personalizacao.json** (só para você, que criou o bot)",
    "Abra o **Personalizar bot.html** (está na pasta do bot) com dois cliques, clique em **Abrir arquivo** e escolha o arquivo",
    "Mude textos, botões (texto, emoji, cor, mostrar/esconder), modais, cores, emojis, a aparência dos embeds e o status. A prévia mostra como fica no Discord",
    "Na parte **Criar**, monte seus **Painéis** (botões ou menu que dão cargo, respondem, abrem formulário, abrem ticket ou levam a um link) e **Formulários**",
    "Clique em **Salvar** e, no Discord, use `/personalizar aplicar arquivo:` com o arquivo salvo. Vale na hora, sem reiniciar",
    "Publique um painel criado com `/painel enviar`. Se mudar o painel e aplicar de novo, os já enviados se atualizam sozinhos",
    "Funciona igual com o bot numa hospedagem: o arquivo vai e volta pelo Discord. `/personalizar resetar` volta tudo ao padrão",
  ],
  minecraft: [
    "`/minecraft status ip:jogar.seuservidor.com` — mostra na hora (servidores Java)",
    "`/minecraft painel ip:jogar.seuservidor.com canal:#status` — mensagem que se atualiza a cada 2 minutos",
  ],
  aniversarios: [
    "`/aniversario configurar canal:#geral cargo:@Aniversariante` — onde dar parabéns e o cargo do dia",
    "Cada membro usa `/aniversario definir dia:14 mes:novembro`",
    "`/aniversario proximos` mostra os próximos. O horário segue o fuso do Brasil.",
  ],
  enquetes: ["`/enquete pergunta:... opcoes:Sim | Não | Talvez duracao:1d` — cria uma enquete"],
  sorteios: ["`/sorteio criar premio:... duracao:2d vencedores:1` — cria um sorteio"],
  cargos: [
    "`/cargos painel titulo:Escolha seus cargos` — cria o painel",
    "`/cargos adicionar painel:<link da mensagem> cargo:@Cargo emoji:🎮` — coloca um botão",
  ],
};

export function generateReadme(opts: BuilderOptions, siteUrl: string): string {
  const todos = opts.modulos.map((id) => builderModule(id)!).filter(Boolean);
  const mods = todos.filter((m) => !m.extra);
  const extras = todos.filter((m) => m.extra);
  const privileged = new Set<PrivilegedIntent>();
  for (const m of mods) for (const p of m.privileged ?? []) privileged.add(p);
  const intents = [...privileged].map((p) => PRIVILEGED_LABEL[p]);
  const temInicializador = extras.some((m) => m.id === "inicializador");

  const L: string[] = [];
  L.push(`# ${opts.nome}`, "");
  L.push(`Bot para Discord montado na Loja ByteUP. Funciona em **qualquer servidor** e é configurado por comandos, sem mexer no código.`, "");
  L.push(`**Módulos:** ${mods.map((m) => `${m.emoji} ${m.name}`).join(" · ")}`, "");
  if (extras.length) L.push(`**Ferramentas:** ${extras.map((m) => `${m.emoji} ${m.name}`).join(" · ")}`, "");
  L.push("> Já tinha um bot nosso e está atualizando? Vá direto para **Atualizar o bot sem perder os dados**, mais abaixo.", "");
  if (extras.length) {
    L.push("> **Windows:** antes de extrair, clique com o botão direito no **.zip** → **Propriedades** → marque **Desbloquear** → **OK**. Sem isso, o Windows pode bloquear os arquivos `.bat` com o aviso \"O Controle Inteligente de Aplicativos bloqueou um arquivo\" ou \"O Windows protegeu o computador\".", "");
  }

  L.push("## Do que você precisa", "");
  if (temInicializador) L.push("- Um PC com **Windows** (o Inicializador instala o Node.js sozinho, se faltar)");
  else L.push("- **Node.js 18.17 ou mais novo** (recomendado: a versão LTS em https://nodejs.org)");
  L.push("- Uma conta no Discord e permissão de **Gerenciar servidor** no servidor onde o bot vai ficar");
  L.push("");

  L.push("## Passo a passo", "");
  L.push("### 1. Crie o bot no Discord", "");
  L.push("1. Abra https://discord.com/developers/applications e clique em **New Application**. Dê um nome e confirme.");
  L.push("2. No menu da esquerda, entre em **Bot**. Ali você pode mudar o nome e a foto do bot.");
  L.push("3. Clique em **Reset Token** e copie o token. **Não mostre o token para ninguém**: com ele, qualquer pessoa controla o seu bot.");
  if (intents.length) {
    L.push(`4. Ainda em **Bot**, desça até **Privileged Gateway Intents** e ligue: ${intents.map((i) => `**${i}**`).join(" e ")}. Clique em **Save Changes**.`);
  }
  L.push("");

  if (temInicializador) {
    L.push("### 2. Ligue com o Inicializador (sem terminal)", "");
    L.push("1. Extraia este .zip numa pasta (por exemplo, em Documentos).");
    L.push("2. Dê **dois cliques em `Iniciar bot.bat`** e clique em **Ligar**. Na primeira vez abre a configuração, com 4 passos que ficam verdes quando estão certos:");
    L.push("    - **Node.js:** se faltar, um botão baixa e instala sozinho.");
    L.push("    - **Token:** cole o token do passo 1. Ele confere com o Discord na hora.");
    L.push("    - **Permissões especiais (intents):** ele mostra quais faltam ligar e abre a página certa do Developer Portal.");
    L.push("    - **ID do servidor** (opcional): com ele, os comandos aparecem na hora.");
    L.push("3. Clique em **Instalar e ligar o bot**. Ele instala o que precisa e liga o bot, sem abrir terminal.");
    L.push("4. Se o bot ainda não estiver no seu servidor, ele oferece o **link de convite** com as permissões certas. Escolha o servidor e autorize.", "");
    L.push("Pode fechar o Inicializador: o bot continua ligado. Para desligar, abra de novo e clique em **Parar**. **Ligar com o Windows** faz o bot ligar sozinho quando o PC liga, e **Ver registro** mostra o que o bot está fazendo.", "");
    L.push("> Vai usar uma hospedagem? Pule para **Deixar o bot ligado 24 horas**.", "");
    L.push("<details><summary>Prefere fazer pelo terminal?</summary>", "");
  }
  L.push("### 2. Coloque o token no bot", "");
  L.push("1. Extraia este .zip numa pasta.");
  L.push("2. Faça uma cópia do arquivo **.env.example** com o nome **.env** (no Windows, se a extensão estiver oculta, confira que o nome ficou só `.env`).");
  L.push("3. Abra o **.env** no Bloco de Notas e cole o token depois de `DISCORD_TOKEN=` (sem espaços nem aspas).");
  L.push("");

  L.push("### 3. Ligue o bot", "");
  L.push("Abra um terminal **dentro da pasta do bot** (no Windows: clique na barra de endereço da pasta, digite `cmd` e aperte Enter) e rode:", "");
  L.push("```", "npm install", "npm start", "```", "");
  L.push("Quando aparecer **✅ online**, o terminal mostra um **link para adicionar o bot a um servidor**, já com as permissões certas. Abra o link, escolha o servidor e autorize.", "");
  L.push("> Os comandos podem levar alguns minutos para aparecer na primeira vez. Se demorar, aperte **Ctrl+R** no Discord.", "");
  if (temInicializador) L.push("</details>", "");

  L.push("### 4. Configure no servidor", "");
  L.push("Tudo é configurado com **/config** (só quem tem *Gerenciar servidor* vê esse comando):", "");
  L.push("- `/config ver` — mostra tudo o que está configurado");
  L.push("- `/config staff cargo:@Equipe` — cargo da equipe (atende tickets, decide sugestões...)");
  L.push("- `/config cor cor:#5865F2` — cor das mensagens do bot neste servidor");
  L.push("- `/ajuda` — lista todos os comandos");
  L.push("");
  L.push("**Importante:** em *Configurações do servidor → Cargos*, arraste o cargo do bot para **cima** dos cargos que ele vai dar, tirar ou punir.", "");

  L.push("## Módulos", "");
  for (const m of mods) {
    L.push(`### ${m.emoji} ${m.name}`, "", m.description, "");
    if (m.commands.length) L.push(`**Comandos:** ${m.commands.map((c) => `\`${c}\``).join(" ")}`, "");
    if (m.configGroup) L.push(`**Configuração:** \`/config ${m.configGroup}\` → ${(m.configSubs ?? []).map((s) => `\`${s}\``).join(" ")}`, "");
    const passos = PRIMEIROS_PASSOS[m.id] ?? [];
    if (passos.length) {
      L.push("Para começar:", "");
      for (const p of passos) L.push(`- ${p}`);
      L.push("");
    } else if (!m.configGroup) {
      L.push("Não precisa configurar nada: é só usar os comandos.", "");
    }
  }
  for (const m of extras) {
    L.push(`### ${m.emoji} ${m.name}`, "", m.description, "");
    if (m.id === "inicializador") {
      L.push("O arquivo **`Iniciar bot.bat`** fica fora da pasta do bot (pode deixar na Área de Trabalho). Dois cliques e ele:", "");
      L.push("1. Procura no seu PC as pastas de bot (na primeira vez demora um pouco; depois ele lembra) e mostra se cada uma está **Ligado**, **Desligado** ou falta **Configurar**.");
      L.push("2. **Ligar:** na primeira vez, configura tudo por janelas (Node.js, token, permissões, servidor), instala o que precisa e liga o bot sem terminal.");
      L.push("3. **Parar** (salva os dados antes), **Configurar** (trocar token ou servidor), **Ver registro**, **Ligar com o Windows**.");
      L.push("4. Marca a cópia **mais nova** e a **mais antiga** do mesmo bot e manda as velhas para a Lixeira (avisa antes se ela tiver dados mais novos).", "");
      L.push("> Use o Inicializador enquanto o bot roda no seu PC. Quando for para uma hospedagem, siga **Deixar o bot ligado 24 horas**.", "");
    } else {
      L.push("Veja como usar em **Atualizar o bot sem perder os dados**.", "");
    }
  }
  L.push(`### ⚙️ ${BUILDER_BASE.name}`, "", `**Comandos:** ${BUILDER_BASE.commands.map((c) => `\`${c}\``).join(" ")}`, "");

  L.push("## Atualizar o bot sem perder os dados", "");
  L.push("Comprou mais módulos ou recebeu uma versão nova? Os dados (XP, dinheiro, advertências, configurações) ficam na pasta **`data`** e o token no **`.env`**. O .zip novo nunca traz esses arquivos, então nada se perde:", "");
  if (extras.some((m) => m.id === "transferidor")) {
    L.push("1. Desligue o bot antigo e extraia este .zip numa pasta **nova**.");
    L.push("2. Na pasta nova, dê **dois cliques em `Transferir dados.bat`**.");
    L.push("3. Escolha a pasta do bot antigo e confirme. Ele copia a `data` e o `.env`, guarda uma cópia de segurança e já roda o `npm install`.");
    L.push(temInicializador ? "4. Ligue o bot novo pelo **Iniciar bot.bat** (o antigo aparece como cópia antiga na lista)." : "4. Ligue o bot novo com `npm start`.");
  } else {
    L.push("1. Desligue o bot antigo e extraia este .zip numa pasta **nova**.");
    L.push("2. Copie a pasta **`data`** e o arquivo **`.env`** do bot antigo para a pasta nova.");
    L.push("3. Na pasta nova, rode `npm install` e depois `npm start`.");
    L.push("");
    L.push("> Prefere não mexer em pastas? O **Transferidor de dados** (na loja) faz isso com dois cliques.");
  }
  L.push("");

  L.push("## Deixar o bot ligado 24 horas", "");
  L.push("O bot só fica online enquanto estiver rodando. No seu PC, ele desliga quando você desliga o computador. Para ficar online sempre, use uma **hospedagem**. Este bot já vem pronto para as mais usadas no Brasil.", "");
  L.push("**Antes de qualquer hospedagem:**", "");
  L.push("1. Ligue o bot no seu PC uma vez e confira que funciona (assim o `.env` já está certo).");
  L.push("2. Monte o arquivo para enviar: abra a pasta do bot, selecione **tudo o que está dentro dela, menos a pasta `node_modules`**, clique com o botão direito → **Enviar para → Pasta compactada**. O `discloud.config` e o `squarecloud.app` precisam ficar na **raiz** do .zip, não dentro de outra pasta.");
  L.push("3. O `.env` (com o token) vai junto. **Nunca mande esse .zip para ninguém.**");
  L.push("");
  L.push("### Discloud", "");
  L.push("1. Crie a conta em https://discloud.com e entre no servidor deles no Discord (o envio é feito pelo bot da Discloud ou pelo painel do site).");
  L.push("2. O arquivo **`discloud.config`** já vem pronto:", "");
  L.push("```", "TYPE=bot", "MAIN=index.js", "RAM=100", "VERSION=latest", "```", "");
  L.push("3. Envie o .zip pelo painel (Upload) ou, no Discord, com o comando `.upconfig` no canal de comandos deles.");
  L.push("4. Se o bot cair por falta de memória, aumente o `RAM` (ex.: `RAM=200`).");
  L.push("");
  L.push("### Square Cloud", "");
  L.push("1. Crie a conta em https://squarecloud.app.");
  L.push("2. O arquivo **`squarecloud.app`** já vem pronto (bots precisam de pelo menos 256 MB):", "");
  L.push("```", "MAIN=index.js", "MEMORY=256", "VERSION=recommended", `DISPLAY_NAME=${opts.nome.slice(0, 32)}`, "```", "");
  L.push("3. No painel, clique em **Upload** e envie o .zip. Para o bot voltar sozinho se cair, adicione a linha `AUTORESTART=true` (se o seu plano permitir).");
  L.push("");
  L.push("### Hospedagem com painel (Pterodactyl e parecidas)", "");
  L.push("1. Crie um servidor do tipo **Node.js** (versão 18 ou mais nova).");
  L.push("2. Envie os arquivos pelo gerenciador de arquivos do painel (sem a `node_modules`).");
  L.push("3. Arquivo principal: `index.js` · comando de início: `npm start` (ou `node index.js`).");
  L.push("4. Se o painel tiver **variáveis de ambiente**, coloque `DISCORD_TOKEN` lá; senão, envie o `.env`.");
  L.push("");
  L.push("### VPS (Linux / Ubuntu)", "");
  L.push("```", "# instalar o Node.js 22", "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -", "sudo apt install -y nodejs", "", "# na pasta do bot (envie os arquivos com o WinSCP ou o FileZilla)", "npm install", "sudo npm install -g pm2", "pm2 start index.js --name meu-bot", "pm2 save", "pm2 startup   # rode o comando que ele mostrar: o bot volta sozinho quando a VPS reinicia", "```", "");
  L.push("Comandos úteis: `pm2 logs meu-bot` (ver o que o bot está fazendo) · `pm2 restart meu-bot` (reiniciar).", "");
  L.push("### Cuidado com os dados na hospedagem", "");
  L.push("- As informações do bot (XP, dinheiro, configurações) ficam na pasta **`data`**, que o bot cria e atualiza sozinho.");
  L.push("- **Antes de enviar uma versão nova**, baixe a pasta `data` da hospedagem (pelo gerenciador de arquivos ou pela opção de backup do painel) e coloque no .zip novo. Senão o bot volta zerado.");
  L.push("- Faça backup da pasta `data` de vez em quando.");
  L.push("");

  L.push("## Personalizar", "");
  L.push("No arquivo **config.json**:", "");
  L.push("- `nome`: nome mostrado nas mensagens do bot");
  L.push("- `cor`: cor padrão das mensagens (cada servidor pode trocar com `/config cor`)");
  L.push("- `status`: frase que aparece no perfil do bot");
  L.push("- `modulos`: módulos ligados (para desligar um, tire o nome dele da lista)");
  L.push("- `fuso` (opcional): fuso horário dos aniversários, ex.: `\"fuso\": \"America/Manaus\"` (padrão: horário de Brasília)");
  L.push("");
  L.push(temInicializador ? "Depois de mudar, reinicie o bot: no Inicializador, **Parar** e depois **Ligar**." : "Depois de mudar, reinicie o bot (Ctrl+C no terminal e `npm start` de novo).", "");
  if (mods.some((m) => m.id === "personalizar")) {
    L.push("### Textos, cores, emojis e status (módulo Personalização)", "");
    L.push("Todos os textos, botões (texto, emoji, cor, mostrar/esconder), modais, cores e o status do bot podem ser trocados sem mexer no código. Também dá para criar painéis com botões ou menu e formulários próprios:", "");
    L.push("1. No Discord: `/personalizar baixar` (só quem criou o bot no Developer Portal pode usar).");
    L.push("2. Abra o **Personalizar bot.html** (na pasta do bot) no navegador e abra o arquivo baixado.");
    L.push("3. Edite e clique em **Salvar**.");
    L.push("4. No Discord: `/personalizar aplicar` com o arquivo salvo. Vale na hora.");
    L.push("5. Painéis criados: publique com `/painel enviar` (veja todos com `/painel lista`).", "");
    L.push("A personalização fica em `data/personalizacao.json` (o Transferidor de dados leva junto). Se um servidor definir uma mensagem própria no `/config` (ex.: boas-vindas), ela tem prioridade nele.", "");
  }

  L.push("## Problemas comuns", "");
  if (extras.length) L.push("- **O Windows bloqueou o `.bat` (\"Controle Inteligente de Aplicativos\" ou \"O Windows protegeu o computador\")**: apague a pasta extraída, clique com o botão direito no .zip → Propriedades → marque **Desbloquear** → OK e extraia de novo. No aviso azul também dá para clicar em **Mais informações → Executar assim mesmo**.");
  L.push("- **\"Falta o token do bot\"**: o arquivo `.env` não existe ou o `DISCORD_TOKEN` está vazio.");
  L.push("- **\"An invalid token was provided\"**: o token está errado. Gere outro em *Bot → Reset Token*.");
  if (intents.length) L.push(`- **\"Used disallowed intents\"**: ligue ${intents.map((i) => `**${i}**`).join(" e ")} no Developer Portal (passo 1).`);
  L.push("- **O bot não consegue dar cargo ou punir alguém**: o cargo do bot precisa estar acima do cargo da pessoa, e o bot precisa da permissão. Use o link do terminal para convidar de novo, se precisar.");
  L.push("- **Os comandos não aparecem**: espere alguns minutos e aperte Ctrl+R no Discord. Para testes, coloque o ID do servidor em `GUILD_ID` no `.env`: os comandos aparecem na hora nele.");
  L.push("");

  L.push("## Quer algo exclusivo?", "");
  L.push(`Este bot é genérico, feito para funcionar em qualquer servidor. Recursos sob medida (cards com imagem, painel web, integrações, comandos especiais) são feitos por encomenda: abra um ticket no servidor da ByteUP. Loja: ${siteUrl}/loja`, "");

  return L.join("\n");
}
