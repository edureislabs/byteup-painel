import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { embed, responder, cortar, imagens } from '../core/util.js';
import { textos, visuais, botoes as registrarBotoes } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('cargos', {
  clique_nos_botoes_pegar: 'Clique nos botões para pegar ou tirar cargos.',
  consegui_enviar_mensagens_confira: ['Não consegui enviar mensagens em {canal}. Confira as minhas permissões.', 'resposta'],
  painel_criado_agora_use: ['Painel criado em {canal}. Agora use **/cargos adicionar painel:{mensagem_id}** para colocar os cargos.', 'resposta'],
  painel_encontrado_use_id: ['Painel não encontrado. Use o ID ou o link da mensagem do painel.', 'resposta'],
  esse_cargo_pode_ser: ['Esse cargo não pode ser dado por botão.', 'resposta'],
  consigo_dar_suba_meu: ['Não consigo dar {cargo}: suba o meu cargo acima dele na lista de cargos.', 'resposta'],
  seguranca_cargos_permissoes_administ: ['Por segurança, cargos com permissões de administração não podem ir para painéis.', 'resposta'],
  esse_cargo_ja_esta: ['Esse cargo já está no painel.', 'resposta'],
  painel_aceita_maximo_25: ['Um painel aceita no máximo 25 cargos.', 'resposta'],
  consegui_atualizar_painel_confira: ['Não consegui atualizar o painel. Confira se o emoji é válido.', 'resposta'],
  adicionado_painel: ['{cargo} adicionado ao painel.', 'resposta'],
  esse_cargo_esta_painel: ['Esse cargo não está no painel.', 'resposta'],
  removido_painel: ['{cargo} removido do painel.', 'resposta'],
  este_botao_esta_mais: ['Este botão não está mais ativo.', 'resposta'],
  esse_cargo_existe_mais: ['Esse cargo não existe mais. Avise a equipe.', 'resposta'],
  consigo_dar_esse_cargo: ['Não consigo dar esse cargo agora (o meu cargo está abaixo dele). Avise a equipe.', 'resposta'],
  consegui_mudar_seu_cargo: ['Não consegui mudar o seu cargo agora. Avise a equipe.', 'resposta'],
  cargo_removido: 'Cargo {cargo} removido.',
  voce_recebeu: 'Você recebeu {cargo}!',
  cargos_botao: 'Cargos por botão',
});

// Botões (texto, emoji e cor personalizáveis; alguns podem ser escondidos)
const bt = registrarBotoes('cargos', {
  cargo: { nome: "Botões do painel de cargos", estilo: 'Secondary', rotuloInfo: "O texto e o emoji de cada botão vêm do /cargos. Aqui você muda a cor de todos." },
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('cargos', {
  painel: { nome: "Painel de cargos", vars: ['servidor_icone'] },
});

/**
 * Cargos por botão: painéis onde cada membro pega ou tira cargos sozinho
 * (cores, notificações, jogos, pronomes...). Até 25 cargos por painel.
 */

const paineis = colecao('paineis_cargos');

function componentes(p) {
  const rows = [];
  p.cargos.forEach((c, n) => {
    if (n % 5 === 0) rows.push(new ActionRowBuilder());
    const b = bt('cargo', { rotulo: cortar(c.rotulo, 80), emoji: c.emoji || undefined }).setCustomId(`cr:${c.id}`);
    if (c.emoji) b.setEmoji(c.emoji);
    rows.at(-1).addComponents(b);
  });
  return rows;
}

const idDaMensagem = (t) => String(t).split('/').pop().replace(/\D/g, '');

async function buscarPainel(i, ref) {
  const id = idDaMensagem(ref);
  const p = paineis.ler(i.guildId, id);
  if (!p) return [null, null];
  const canal = await i.guild.channels.fetch(p.canal).catch(() => null);
  const msg = await canal?.messages.fetch(id).catch(() => null);
  return [p, msg];
}

const cargos = {
  data: new SlashCommandBuilder()
    .setName('cargos')
    .setDescription('Painéis de cargos por botão')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) =>
      s
        .setName('painel')
        .setDescription('Cria um painel novo (depois adicione cargos nele)')
        .addStringOption((o) => o.setName('titulo').setDescription('Título').setRequired(true).setMaxLength(100))
        .addStringOption((o) => o.setName('descricao').setDescription('Texto do painel').setMaxLength(1500))
        .addChannelOption((o) => o.setName('canal').setDescription('Padrão: este canal').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    )
    .addSubcommand((s) =>
      s
        .setName('adicionar')
        .setDescription('Coloca um cargo num painel')
        .addStringOption((o) => o.setName('painel').setDescription('ID ou link da mensagem do painel').setRequired(true).setMaxLength(120))
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo').setRequired(true))
        .addStringOption((o) => o.setName('rotulo').setDescription('Texto do botão (padrão: nome do cargo)').setMaxLength(80))
        .addStringOption((o) => o.setName('emoji').setDescription('Emoji do botão').setMaxLength(60))
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Tira um cargo de um painel')
        .addStringOption((o) => o.setName('painel').setDescription('ID ou link da mensagem do painel').setRequired(true).setMaxLength(120))
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo').setRequired(true))
    ),
  async executar(i) {
    const sub = i.options.getSubcommand();
    if (sub === 'painel') {
      const canal = i.options.getChannel('canal') ?? i.channel;
      const e = embed(i.guildId)
        .setTitle(i.options.getString('titulo'))
        .setDescription(i.options.getString('descricao') || tx('clique_nos_botoes_pegar'));
      vis(e, 'painel', imagens({ guild: i.guild }));
      const msg = await canal.send({ embeds: [e] }).catch(() => null);
      if (!msg) return responder(i, tx('consegui_enviar_mensagens_confira', { canal }), 'erro');
      paineis.de(i.guildId)[msg.id] = { canal: canal.id, cargos: [] };
      paineis.salvar();
      return responder(i, tx('painel_criado_agora_use', { canal, mensagem_id: msg.id }), 'sucesso');
    }

    const [p, msg] = await buscarPainel(i, i.options.getString('painel'));
    if (!p || !msg) return responder(i, tx('painel_encontrado_use_id'), 'erro');
    const r = i.options.getRole('cargo');

    if (sub === 'adicionar') {
      if (r.managed || r.id === i.guildId) return responder(i, tx('esse_cargo_pode_ser'), 'erro');
      if (!r.editable) return responder(i, tx('consigo_dar_suba_meu', { cargo: r }), 'erro');
      if (r.permissions.has(PermissionFlagsBits.Administrator) || r.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return responder(i, tx('seguranca_cargos_permissoes_administ'), 'erro');
      }
      if (p.cargos.some((c) => c.id === r.id)) return responder(i, tx('esse_cargo_ja_esta'), 'aviso');
      if (p.cargos.length >= 25) return responder(i, tx('painel_aceita_maximo_25'), 'erro');
      const emoji = i.options.getString('emoji')?.trim() || null;
      p.cargos.push({ id: r.id, rotulo: i.options.getString('rotulo') || r.name, emoji });
      try {
        await msg.edit({ components: componentes(p) });
      } catch {
        p.cargos.pop();
        return responder(i, tx('consegui_atualizar_painel_confira'), 'erro');
      }
      paineis.salvar();
      return responder(i, tx('adicionado_painel', { cargo: r }), 'sucesso');
    }
    if (sub === 'remover') {
      const antes = p.cargos.length;
      p.cargos = p.cargos.filter((c) => c.id !== r.id);
      if (p.cargos.length === antes) return responder(i, tx('esse_cargo_esta_painel'), 'aviso');
      await msg.edit({ components: componentes(p) }).catch(() => {});
      paineis.salvar();
      return responder(i, tx('removido_painel', { cargo: r }), 'sucesso');
    }
  },
};

const botoes = {
  async cr(i, [cargoId]) {
    // o cargo precisa estar mesmo neste painel
    const p = paineis.ler(i.guildId, i.message?.id);
    if (!p?.cargos.some((c) => c.id === cargoId)) return responder(i, tx('este_botao_esta_mais'), 'erro');
    const r = i.guild.roles.cache.get(cargoId);
    if (!r) return responder(i, tx('esse_cargo_existe_mais'), 'erro');
    if (!r.editable) return responder(i, tx('consigo_dar_esse_cargo'), 'erro');
    const tem = i.member.roles.cache.has(r.id);
    const ok = await (tem ? i.member.roles.remove(r, 'Painel de cargos') : i.member.roles.add(r, 'Painel de cargos')).then(() => true, () => false);
    if (!ok) return responder(i, tx('consegui_mudar_seu_cargo'), 'erro');
    return responder(i, tem ? tx('cargo_removido', { cargo: r }) : tx('voce_recebeu', { cargo: r }), 'sucesso');
  },
};

export default {
  id: 'cargos',
  nome: tx('cargos_botao'),
  comandos: [cargos],
  componentes: botoes,
  permissoes: [PermissionFlagsBits.ManageRoles],
};
