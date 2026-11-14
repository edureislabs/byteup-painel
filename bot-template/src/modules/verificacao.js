import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, sorteio, CORES } from '../core/util.js';

/**
 * Verificação: painel com o botão "Verificar". A pessoa resolve um desafio simples
 * (clicar no número certo) e ganha o cargo de membro. Segura contas de bots e raids.
 * Opcional: idade mínima da conta e cargo removido ao verificar.
 */

const PADRAO = { cargo: null, remover: null, registro: null, idadeMinima: 0 };
const cfg = (guildId) => ajustes(guildId, 'verificacao', PADRAO);

// desafios em andamento: "guild:user" -> { opcoes, resposta, expira, erros } (a resposta fica só aqui, não no botão)
const desafios = new Map();
const chave = (i) => `${i.guildId}:${i.user.id}`;
const EMOJIS = ['🍎', '🐶', '🚗', '⭐', '🎈', '🍕', '⚽', '🌙', '🔑', '🎧'];

async function registrar(guild, texto, cor = CORES.sucesso) {
  const id = cfg(guild.id).registro;
  const canal = id && guild.channels.cache.get(id);
  if (canal?.isTextBased()) await canal.send({ embeds: [embed(guild.id).setColor(cor).setDescription(texto).setTimestamp()], allowedMentions: { parse: [] } }).catch(() => {});
}

function novoDesafio(i) {
  const opcoes = [...EMOJIS].sort(() => Math.random() - 0.5).slice(0, 5);
  const resposta = opcoes[sorteio(0, opcoes.length - 1)];
  const antigo = desafios.get(chave(i));
  desafios.set(chave(i), { opcoes, resposta, expira: Date.now() + 2 * 60_000, erros: antigo?.erros ?? 0 });
  return {
    embeds: [embed(i.guildId).setTitle('🔐 Verificação').setDescription(`Para provar que você não é um robô, clique em **${resposta}**.\n\nVocê tem 2 minutos.`)],
    components: [
      new ActionRowBuilder().addComponents(
        opcoes.map((e, n) => new ButtonBuilder().setCustomId(`vf:r:${n}`).setEmoji(e).setStyle(ButtonStyle.Secondary))
      ),
    ],
    flags: MessageFlags.Ephemeral,
  };
}

const componentes = {
  async vf(i, [acao, indice]) {
    const c = cfg(i.guildId);
    const cargo = c.cargo && i.guild.roles.cache.get(c.cargo);
    if (!cargo) return responder(i, 'A verificação ainda não foi configurada. Avise a equipe.', 'erro');

    if (acao === 'iniciar') {
      if (i.member.roles.cache.has(cargo.id)) return responder(i, 'Você já está verificado(a)!', 'sucesso');
      const dias = (Date.now() - i.user.createdTimestamp) / 86400e3;
      if (c.idadeMinima && dias < c.idadeMinima) {
        await registrar(i.guild, `⛔ ${i.user} (${i.user.tag}) tentou se verificar com uma conta de ${Math.floor(dias)} dia(s).`, CORES.aviso);
        return responder(i, `Sua conta do Discord precisa ter pelo menos **${c.idadeMinima} dia(s)** para entrar aqui. Tente de novo mais tarde.`, 'erro');
      }
      return i.reply(novoDesafio(i));
    }

    if (acao === 'r') {
      const d = desafios.get(chave(i));
      if (!d || d.expira < Date.now()) {
        desafios.delete(chave(i));
        return i.update({ content: '⏱️ O tempo acabou. Clique em **Verificar** de novo.', embeds: [], components: [] });
      }
      if (d.opcoes[Number(indice)] !== d.resposta) {
        d.erros += 1;
        if (d.erros >= 3) {
          desafios.delete(chave(i));
          await registrar(i.guild, `⚠️ ${i.user} (${i.user.tag}) errou a verificação 3 vezes.`, CORES.aviso);
          return i.update({ content: '❌ Você errou 3 vezes. Espere um pouco e clique em **Verificar** de novo.', embeds: [], components: [] });
        }
        const proximo = novoDesafio(i);
        return i.update({ content: '❌ Não foi esse. Tente de novo:', embeds: proximo.embeds, components: proximo.components });
      }
      desafios.delete(chave(i));
      if (!cargo.editable) return i.update({ content: '❌ Não consigo dar o cargo (o meu cargo está abaixo dele). Avise a equipe.', embeds: [], components: [] });
      const ok = await i.member.roles.add(cargo, 'Verificação').then(() => true, () => false);
      if (!ok) return i.update({ content: '❌ Não consegui te dar o cargo. Avise a equipe.', embeds: [], components: [] });
      const remover = c.remover && i.guild.roles.cache.get(c.remover);
      if (remover?.editable && i.member.roles.cache.has(remover.id)) await i.member.roles.remove(remover, 'Verificação').catch(() => {});
      await registrar(i.guild, `✅ ${i.user} (${i.user.tag}) se verificou.`);
      return i.update({ content: `✅ Verificado(a)! Você recebeu ${cargo}. Bem-vindo(a)!`, embeds: [], components: [] });
    }
  },
};

const verificacao = {
  data: new SlashCommandBuilder()
    .setName('verificacao')
    .setDescription('Configura a verificação de novos membros')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('configurar')
        .setDescription('Cargo que a pessoa ganha ao se verificar e outras opções')
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo dado ao verificar').setRequired(true))
        .addRoleOption((o) => o.setName('remover').setDescription('Cargo tirado ao verificar (ex.: "Não verificado")'))
        .addIntegerOption((o) => o.setName('idade-minima').setDescription('Idade mínima da conta, em dias (0 = sem limite)').setMinValue(0).setMaxValue(365))
        .addChannelOption((o) => o.setName('registro').setDescription('Canal para registrar as verificações').addChannelTypes(ChannelType.GuildText))
    )
    .addSubcommand((s) =>
      s
        .setName('painel')
        .setDescription('Envia o painel com o botão "Verificar"')
        .addChannelOption((o) => o.setName('canal').setDescription('Onde enviar (padrão: aqui)').addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName('mensagem').setDescription('Texto do painel').setMaxLength(1500))
    ),
  async executar(i) {
    const c = cfg(i.guildId);
    if (i.options.getSubcommand() === 'configurar') {
      const cargo = i.options.getRole('cargo');
      if (cargo.managed || cargo.id === i.guildId) return responder(i, 'Escolha um cargo comum (não pode ser @everyone nem cargo de bot).', 'erro');
      if (cargo.permissions.has(PermissionFlagsBits.Administrator)) return responder(i, 'Por segurança, o cargo de verificação não pode ser de administrador.', 'erro');
      if (!cargo.editable) return responder(i, `Meu cargo precisa ficar acima de ${cargo} em Configurações do servidor → Cargos.`, 'erro');
      c.cargo = cargo.id;
      const remover = i.options.getRole('remover');
      if (remover !== null) c.remover = remover?.id ?? null;
      const idade = i.options.getInteger('idade-minima');
      if (idade !== null) c.idadeMinima = idade;
      const reg = i.options.getChannel('registro');
      if (reg) c.registro = reg.id;
      salvarAjustes();
      return responder(
        i,
        `Verificação configurada: ganha ${cargo}${c.remover ? `, perde <@&${c.remover}>` : ''}${c.idadeMinima ? `, conta com pelo menos ${c.idadeMinima} dia(s)` : ''}.\nAgora use \`/verificacao painel\`.`,
        'sucesso'
      );
    }

    if (!c.cargo) return responder(i, 'Primeiro use `/verificacao configurar` para escolher o cargo.', 'erro');
    const canal = i.options.getChannel('canal') ?? i.channel;
    const texto = i.options.getString('mensagem') || 'Clique no botão abaixo para se verificar e liberar o servidor.';
    const msg = await canal
      .send({
        embeds: [embed(i.guildId).setTitle('🔐 Verificação').setDescription(texto)],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('vf:iniciar').setLabel('Verificar').setEmoji('✅').setStyle(ButtonStyle.Success))],
      })
      .catch(() => null);
    if (!msg) return responder(i, `Não consegui enviar em ${canal}. Confira as minhas permissões.`, 'erro');
    return responder(i, `Painel enviado em ${canal}.`, 'sucesso');
  },
};

// limpa desafios vencidos
setInterval(() => {
  const agora = Date.now();
  for (const [k, d] of desafios) if (d.expira < agora) desafios.delete(k);
}, 5 * 60_000).unref();

export default {
  id: 'verificacao',
  nome: 'Verificação',
  comandos: [verificacao],
  componentes,
  permissoes: [PermissionFlagsBits.ManageRoles],
  config: {
    resumo(guild) {
      const c = cfg(guild.id);
      if (!c.cargo) return ['Não configurada (`/verificacao configurar`)'];
      return [
        `Cargo: <@&${c.cargo}>${c.remover ? ` · remove <@&${c.remover}>` : ''}`,
        `Idade mínima da conta: ${c.idadeMinima ? `${c.idadeMinima} dia(s)` : 'sem limite'}`,
        `Registro: ${c.registro ? `<#${c.registro}>` : 'não definido'}`,
      ];
    },
  },
};
