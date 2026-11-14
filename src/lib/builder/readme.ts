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
  ],
  sugestoes: ["`/config sugestoes canal canal:#sugestoes` — onde as sugestões são publicadas"],
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

  const L: string[] = [];
  L.push(`# ${opts.nome}`, "");
  L.push(`Bot para Discord montado na Loja ByteUP. Funciona em **qualquer servidor** e é configurado por comandos, sem mexer no código.`, "");
  L.push(`**Módulos:** ${mods.map((m) => `${m.emoji} ${m.name}`).join(" · ")}`, "");
  if (extras.length) L.push(`**Ferramentas:** ${extras.map((m) => `${m.emoji} ${m.name}`).join(" · ")}`, "");
  L.push("> Já tinha um bot nosso e está atualizando? Vá direto para **Atualizar o bot sem perder os dados**, mais abaixo.", "");

  L.push("## Do que você precisa", "");
  L.push("- **Node.js 18.17 ou mais novo** (recomendado: a versão LTS em https://nodejs.org)");
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
  for (const m of extras) L.push(`### ${m.emoji} ${m.name}`, "", m.description, "", "Veja como usar em **Atualizar o bot sem perder os dados**.", "");
  L.push(`### ⚙️ ${BUILDER_BASE.name}`, "", `**Comandos:** ${BUILDER_BASE.commands.map((c) => `\`${c}\``).join(" ")}`, "");

  L.push("## Atualizar o bot sem perder os dados", "");
  L.push("Comprou mais módulos ou recebeu uma versão nova? Os dados (XP, dinheiro, advertências, configurações) ficam na pasta **`data`** e o token no **`.env`**. O .zip novo nunca traz esses arquivos, então nada se perde:", "");
  if (extras.some((m) => m.id === "transferidor")) {
    L.push("1. Desligue o bot antigo e extraia este .zip numa pasta **nova**.");
    L.push("2. Na pasta nova, dê **dois cliques em `Transferir dados.bat`**.");
    L.push("3. Escolha a pasta do bot antigo e confirme. Ele copia a `data` e o `.env`, guarda uma cópia de segurança e já roda o `npm install`.");
    L.push("4. Ligue o bot novo com `npm start`.");
  } else {
    L.push("1. Desligue o bot antigo e extraia este .zip numa pasta **nova**.");
    L.push("2. Copie a pasta **`data`** e o arquivo **`.env`** do bot antigo para a pasta nova.");
    L.push("3. Na pasta nova, rode `npm install` e depois `npm start`.");
    L.push("");
    L.push("> Prefere não mexer em pastas? O **Transferidor de dados** (na loja) faz isso com dois cliques.");
  }
  L.push("");

  L.push("## Deixar o bot ligado 24 horas", "");
  L.push("O bot só fica online enquanto o `npm start` estiver rodando. Para não depender do seu computador, use uma hospedagem que rode **Node.js** (uma VPS ou um serviço de hospedagem de bots):", "");
  L.push("- Envie a pasta do bot **sem** a pasta `node_modules`.");
  L.push("- O comando para iniciar é `npm start` (o arquivo principal é `index.js`).");
  L.push("- Se a hospedagem tiver um lugar para **variáveis de ambiente**, coloque `DISCORD_TOKEN` lá em vez de enviar o `.env`.");
  L.push("- As informações do bot (XP, dinheiro, advertências, configurações) ficam na pasta **`data`**. Faça backup dela e não apague ao atualizar o bot.");
  L.push("");

  L.push("## Personalizar", "");
  L.push("No arquivo **config.json**:", "");
  L.push("- `nome`: nome mostrado nas mensagens do bot");
  L.push("- `cor`: cor padrão das mensagens (cada servidor pode trocar com `/config cor`)");
  L.push("- `status`: frase que aparece no perfil do bot");
  L.push("- `modulos`: módulos ligados (para desligar um, tire o nome dele da lista)");
  L.push("");
  L.push("Depois de mudar, reinicie o bot (Ctrl+C no terminal e `npm start` de novo).", "");

  L.push("## Problemas comuns", "");
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
