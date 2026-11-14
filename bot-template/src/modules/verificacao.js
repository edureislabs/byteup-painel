import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, sorteio, CORES, imagens } from '../core/util.js';
import { textos, visuais, botoes } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('verificacao', {
  verificacao: ['🔐 Verificação', 'titulo'],
  provar_voce_robo_clique: ['Para provar que você não é um robô, clique em **{resposta}**.\n\nVocê tem 2 minutos.', 'descricao'],
  verificacao_ainda_foi_configurada: ['A verificação ainda não foi configurada. Avise a equipe.', 'resposta'],
  voce_ja_esta_verificado: ['Você já está verificado(a)!', 'resposta'],
  tentou_verificar_conta_dia: '⛔ {usuario} ({tag}) tentou se verificar com uma conta de {dias} dia(s).',
  sua_conta_discord_precisa: ['Sua conta do Discord precisa ter pelo menos **{idadeMinima} dia(s)** para entrar aqui. Tente de novo mais tarde.', 'resposta'],
  tempo_acabou_clique_verificar: ['⏱️ O tempo acabou. Clique em **Verificar** de novo.', 'conteudo'],
  errou_verificacao_vezes: '⚠️ {usuario} ({tag}) errou a verificação 3 vezes.',
  voce_errou_vezes_espere: ['❌ Você errou 3 vezes. Espere um pouco e clique em **Verificar** de novo.', 'conteudo'],
  foi_esse_tente_novo: ['❌ Não foi esse. Tente de novo:', 'conteudo'],
  consigo_dar_cargo_meu: ['❌ Não consigo dar o cargo (o meu cargo está abaixo dele). Avise a equipe.', 'conteudo'],
  consegui_te_dar_cargo: ['❌ Não consegui te dar o cargo. Avise a equipe.', 'conteudo'],
  verificou: '✅ {usuario} ({tag}) se verificou.',
  verificado_voce_recebeu_bem: ['✅ Verificado(a)! Você recebeu {cargo}. Bem-vindo(a)!', 'conteudo'],
  escolha_cargo_comum_pode: ['Escolha um cargo comum (não pode ser @everyone nem cargo de bot).', 'resposta'],
  seguranca_cargo_verificacao_pode: ['Por segurança, o cargo de verificação não pode ser de administrador.', 'resposta'],
  meu_cargo_precisa_ficar: ['Meu cargo precisa ficar acima de {cargo} em Configurações do servidor → Cargos.', 'resposta'],
  perde: ', perde <@&{remover}>',
  conta_pelo_menos_dia: ', conta com pelo menos {idadeMinima} dia(s)',
  verificacao_configurada_ganha_agora: ['Verificação configurada: ganha {cargo}{remover}{idadeMinima}.\nAgora use `/verificacao painel`.', 'resposta'],
  primeiro_use_verificacao_configurar: ['Primeiro use `/verificacao configurar` para escolher o cargo.', 'resposta'],
  clique_botao_abaixo_verificar: 'Clique no botão abaixo para se verificar e liberar o servidor.',
  verificar: ['Verificar', 'botao'],
  consegui_enviar_confira_minhas: ['Não consegui enviar em {canal}. Confira as minhas permissões.', 'resposta'],
  painel_enviado: ['Painel enviado em {canal}.', 'resposta'],
  verificacao_2: 'Verificação',
  configurada_verificacao_configurar: 'Não configurada (`/verificacao configurar`)',
  remove: ' · remove <@&{remover}>',
  cargo: 'Cargo: <@&{cargo}>{remover}',
  dia: '{idadeMinima} dia(s)',
  sem_limite: 'sem limite',
  idade_minima_conta: 'Idade mínima da conta: {idadeMinima}',
  definido: 'não definido',
  registro: 'Registro: {registro}',
});

// Botões (texto, emoji e cor personalizáveis; alguns podem ser escondidos)
const bt = botoes('verificacao', {
  iniciar: { nome: 'Verificar (painel)', rotulo: 'verificar', emoji: '✅', estilo: 'Success' },
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('verificacao', {
  painel: { nome: "Painel de verificação", vars: ['servidor_icone'] },
});

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
    embeds: [embed(i.guildId).setTitle(tx('verificacao')).setDescription(tx('provar_voce_robo_clique', { resposta }))],
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
    if (!cargo) return responder(i, tx('verificacao_ainda_foi_configurada'), 'erro');

    if (acao === 'iniciar') {
      if (i.member.roles.cache.has(cargo.id)) return responder(i, tx('voce_ja_esta_verificado'), 'sucesso');
      const dias = (Date.now() - i.user.createdTimestamp) / 86400e3;
      if (c.idadeMinima && dias < c.idadeMinima) {
        await registrar(i.guild, tx('tentou_verificar_conta_dia', { usuario: i.user, tag: i.user.tag, dias: Math.floor(dias) }), CORES.aviso);
        return responder(i, tx('sua_conta_discord_precisa', { idadeMinima: c.idadeMinima }), 'erro');
      }
      return i.reply(novoDesafio(i));
    }

    if (acao === 'r') {
      const d = desafios.get(chave(i));
      if (!d || d.expira < Date.now()) {
        desafios.delete(chave(i));
        return i.update({ content: tx('tempo_acabou_clique_verificar'), embeds: [], components: [] });
      }
      if (d.opcoes[Number(indice)] !== d.resposta) {
        d.erros += 1;
        if (d.erros >= 3) {
          desafios.delete(chave(i));
          await registrar(i.guild, tx('errou_verificacao_vezes', { usuario: i.user, tag: i.user.tag }), CORES.aviso);
          return i.update({ content: tx('voce_errou_vezes_espere'), embeds: [], components: [] });
        }
        const proximo = novoDesafio(i);
        return i.update({ content: tx('foi_esse_tente_novo'), embeds: proximo.embeds, components: proximo.components });
      }
      desafios.delete(chave(i));
      if (!cargo.editable) return i.update({ content: tx('consigo_dar_cargo_meu'), embeds: [], components: [] });
      const ok = await i.member.roles.add(cargo, 'Verificação').then(() => true, () => false);
      if (!ok) return i.update({ content: tx('consegui_te_dar_cargo'), embeds: [], components: [] });
      const remover = c.remover && i.guild.roles.cache.get(c.remover);
      if (remover?.editable && i.member.roles.cache.has(remover.id)) await i.member.roles.remove(remover, 'Verificação').catch(() => {});
      await registrar(i.guild, tx('verificou', { usuario: i.user, tag: i.user.tag }));
      return i.update({ content: tx('verificado_voce_recebeu_bem', { cargo }), embeds: [], components: [] });
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
      if (cargo.managed || cargo.id === i.guildId) return responder(i, tx('escolha_cargo_comum_pode'), 'erro');
      if (cargo.permissions.has(PermissionFlagsBits.Administrator)) return responder(i, tx('seguranca_cargo_verificacao_pode'), 'erro');
      if (!cargo.editable) return responder(i, tx('meu_cargo_precisa_ficar', { cargo }), 'erro');
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
        tx('verificacao_configurada_ganha_agora', { cargo, remover: c.remover ? tx('perde', { remover: c.remover }) : '', idadeMinima: c.idadeMinima ? tx('conta_pelo_menos_dia', { idadeMinima: c.idadeMinima }) : '' }),
        'sucesso'
      );
    }

    if (!c.cargo) return responder(i, tx('primeiro_use_verificacao_configurar'), 'erro');
    const canal = i.options.getChannel('canal') ?? i.channel;
    const texto = i.options.getString('mensagem') || tx('clique_botao_abaixo_verificar');
    const msg = await canal
      .send({
        embeds: [vis(embed(i.guildId).setTitle(tx('verificacao')).setDescription(texto), 'painel', imagens({ guild: i.guild }))],
        components: [new ActionRowBuilder().addComponents(bt('iniciar').setCustomId('vf:iniciar'))],
      })
      .catch(() => null);
    if (!msg) return responder(i, tx('consegui_enviar_confira_minhas', { canal }), 'erro');
    return responder(i, tx('painel_enviado', { canal }), 'sucesso');
  },
};

// limpa desafios vencidos
setInterval(() => {
  const agora = Date.now();
  for (const [k, d] of desafios) if (d.expira < agora) desafios.delete(k);
}, 5 * 60_000).unref();

export default {
  id: 'verificacao',
  nome: tx('verificacao_2'),
  comandos: [verificacao],
  componentes,
  permissoes: [PermissionFlagsBits.ManageRoles],
  config: {
    resumo(guild) {
      const c = cfg(guild.id);
      if (!c.cargo) return [tx('configurada_verificacao_configurar')];
      return [
        tx('cargo', { cargo: c.cargo, remover: c.remover ? tx('remove', { remover: c.remover }) : '' }),
        tx('idade_minima_conta', { idadeMinima: c.idadeMinima ? tx('dia', { idadeMinima: c.idadeMinima }) : tx('sem_limite') }),
        tx('registro', { registro: c.registro ? `<#${c.registro}>` : tx('definido') }),
      ];
    },
  },
};
