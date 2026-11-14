import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { embed, responder, cortar } from '../core/util.js';

/**
 * Cargos por botão: painéis onde cada membro pega ou tira cargos sozinho
 * (cores, notificações, jogos, pronomes...). Até 25 cargos por painel.
 */

const paineis = colecao('paineis_cargos');

function componentes(p) {
  const rows = [];
  p.cargos.forEach((c, n) => {
    if (n % 5 === 0) rows.push(new ActionRowBuilder());
    const b = new ButtonBuilder().setCustomId(`cr:${c.id}`).setLabel(cortar(c.rotulo, 80)).setStyle(ButtonStyle.Secondary);
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
        .setDescription(i.options.getString('descricao') || 'Clique nos botões para pegar ou tirar cargos.');
      const msg = await canal.send({ embeds: [e] }).catch(() => null);
      if (!msg) return responder(i, `Não consegui enviar mensagens em ${canal}. Confira as minhas permissões.`, 'erro');
      paineis.de(i.guildId)[msg.id] = { canal: canal.id, cargos: [] };
      paineis.salvar();
      return responder(i, `Painel criado em ${canal}. Agora use **/cargos adicionar painel:${msg.id}** para colocar os cargos.`, 'sucesso');
    }

    const [p, msg] = await buscarPainel(i, i.options.getString('painel'));
    if (!p || !msg) return responder(i, 'Painel não encontrado. Use o ID ou o link da mensagem do painel.', 'erro');
    const r = i.options.getRole('cargo');

    if (sub === 'adicionar') {
      if (r.managed || r.id === i.guildId) return responder(i, 'Esse cargo não pode ser dado por botão.', 'erro');
      if (!r.editable) return responder(i, `Não consigo dar ${r}: suba o meu cargo acima dele na lista de cargos.`, 'erro');
      if (r.permissions.has(PermissionFlagsBits.Administrator) || r.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return responder(i, 'Por segurança, cargos com permissões de administração não podem ir para painéis.', 'erro');
      }
      if (p.cargos.some((c) => c.id === r.id)) return responder(i, 'Esse cargo já está no painel.', 'aviso');
      if (p.cargos.length >= 25) return responder(i, 'Um painel aceita no máximo 25 cargos.', 'erro');
      const emoji = i.options.getString('emoji')?.trim() || null;
      p.cargos.push({ id: r.id, rotulo: i.options.getString('rotulo') || r.name, emoji });
      try {
        await msg.edit({ components: componentes(p) });
      } catch {
        p.cargos.pop();
        return responder(i, 'Não consegui atualizar o painel. Confira se o emoji é válido.', 'erro');
      }
      paineis.salvar();
      return responder(i, `${r} adicionado ao painel.`, 'sucesso');
    }
    if (sub === 'remover') {
      const antes = p.cargos.length;
      p.cargos = p.cargos.filter((c) => c.id !== r.id);
      if (p.cargos.length === antes) return responder(i, 'Esse cargo não está no painel.', 'aviso');
      await msg.edit({ components: componentes(p) }).catch(() => {});
      paineis.salvar();
      return responder(i, `${r} removido do painel.`, 'sucesso');
    }
  },
};

const botoes = {
  async cr(i, [cargoId]) {
    // o cargo precisa estar mesmo neste painel
    const p = paineis.ler(i.guildId, i.message?.id);
    if (!p?.cargos.some((c) => c.id === cargoId)) return responder(i, 'Este botão não está mais ativo.', 'erro');
    const r = i.guild.roles.cache.get(cargoId);
    if (!r) return responder(i, 'Esse cargo não existe mais. Avise a equipe.', 'erro');
    if (!r.editable) return responder(i, 'Não consigo dar esse cargo agora (o meu cargo está abaixo dele). Avise a equipe.', 'erro');
    const tem = i.member.roles.cache.has(r.id);
    const ok = await (tem ? i.member.roles.remove(r, 'Painel de cargos') : i.member.roles.add(r, 'Painel de cargos')).then(() => true, () => false);
    if (!ok) return responder(i, 'Não consegui mudar o seu cargo agora. Avise a equipe.', 'erro');
    return responder(i, tem ? `Cargo ${r} removido.` : `Você recebeu ${r}!`, 'sucesso');
  },
};

export default {
  id: 'cargos',
  nome: 'Cargos por botão',
  comandos: [cargos],
  componentes: botoes,
  permissoes: [PermissionFlagsBits.ManageRoles],
};
