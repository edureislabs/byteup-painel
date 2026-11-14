import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, fmt, duracaoTexto, cortar } from '../core/util.js';

/**
 * Reputação: cada membro pode dar +1 de reputação para alguém uma vez por dia.
 * Ranking e cargos de recompensa por pontos.
 */

const rep = colecao('reputacao'); // guild -> user -> { pontos, deuEm }
const cfg = (guildId) => ajustes(guildId, 'reputacao', { recompensas: {} }); // pontos -> cargoId
const ESPERA = 24 * 3600e3;
const de = (guildId, userId) => {
  const d = rep.de(guildId, userId);
  d.pontos ??= 0;
  return d;
};

async function darRecompensas(guild, userId, pontos) {
  const r = cfg(guild.id).recompensas;
  const ganhar = Object.entries(r).filter(([p]) => pontos >= Number(p)).map(([, cargo]) => cargo);
  if (!ganhar.length) return [];
  const membro = await guild.members.fetch(userId).catch(() => null);
  if (!membro) return [];
  const novos = [];
  for (const id of ganhar) {
    const cargo = guild.roles.cache.get(id);
    if (cargo?.editable && !membro.roles.cache.has(id)) {
      const ok = await membro.roles.add(cargo, 'Recompensa de reputação').then(() => true, () => false);
      if (ok) novos.push(cargo);
    }
  }
  return novos;
}

const repCmd = {
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Dá +1 de reputação para alguém (1 vez por dia)')
    .addUserOption((o) => o.setName('usuario').setDescription('Quem merece').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Por quê? (opcional)').setMaxLength(150)),
  async executar(i) {
    const alvo = i.options.getUser('usuario');
    if (alvo.id === i.user.id) return responder(i, 'Não dá para dar reputação para você mesmo.', 'erro');
    if (alvo.bot) return responder(i, 'Bots não têm reputação.', 'erro');
    const eu = de(i.guildId, i.user.id);
    const falta = (eu.deuEm ?? 0) + ESPERA - Date.now();
    if (falta > 0) return responder(i, `Você já deu reputação hoje. Volte em **${duracaoTexto(falta)}**.`, 'aviso');
    const ele = de(i.guildId, alvo.id);
    ele.pontos += 1;
    eu.deuEm = Date.now();
    rep.salvar();
    const novos = await darRecompensas(i.guild, alvo.id, ele.pontos);
    const motivo = i.options.getString('motivo');
    return i.reply({
      embeds: [
        embed(i.guildId).setDescription(
          `👍 ${i.user} deu **+1 de reputação** para ${alvo}! Agora: **${fmt(ele.pontos)}**${motivo ? `\n> ${cortar(motivo, 150)}` : ''}${novos.length ? `\n🎁 Ganhou ${novos.join(', ')}` : ''}`
        ),
      ],
      allowedMentions: { users: [alvo.id] },
    });
  },
};

const reputacao = {
  data: new SlashCommandBuilder()
    .setName('reputacao')
    .setDescription('Reputação dos membros')
    .addSubcommand((s) =>
      s
        .setName('ver')
        .setDescription('Pontos de alguém')
        .addUserOption((o) => o.setName('usuario').setDescription('De quem (padrão: você)'))
    )
    .addSubcommand((s) => s.setName('ranking').setDescription('Os mais bem falados do servidor'))
    .addSubcommand((s) =>
      s
        .setName('recompensa')
        .setDescription('(Equipe) Cargo ao chegar em X pontos (sem cargo = remove)')
        .addIntegerOption((o) => o.setName('pontos').setDescription('Pontos necessários').setRequired(true).setMinValue(1).setMaxValue(100000))
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo dado (deixe vazio para remover)'))
    )
    .addSubcommand((s) =>
      s
        .setName('definir')
        .setDescription('(Equipe) Muda os pontos de alguém')
        .addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true))
        .addIntegerOption((o) => o.setName('pontos').setDescription('Novo total').setRequired(true).setMinValue(0).setMaxValue(1000000))
    ),
  async executar(i) {
    const sub = i.options.getSubcommand();
    if (sub === 'recompensa' || sub === 'definir') {
      if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return responder(i, 'Só quem tem **Gerenciar servidor** pode fazer isso.', 'erro');
      if (sub === 'definir') {
        const u = i.options.getUser('usuario');
        if (u.bot) return responder(i, 'Bots não têm reputação.', 'erro');
        de(i.guildId, u.id).pontos = i.options.getInteger('pontos');
        rep.salvar();
        await darRecompensas(i.guild, u.id, i.options.getInteger('pontos'));
        return responder(i, `${u} agora tem **${fmt(i.options.getInteger('pontos'))}** de reputação.`, 'sucesso');
      }
      const c = cfg(i.guildId);
      const pontos = String(i.options.getInteger('pontos'));
      const cargo = i.options.getRole('cargo');
      if (!cargo) {
        delete c.recompensas[pontos];
        salvarAjustes();
        return responder(i, `Recompensa de ${pontos} pontos removida.`, 'sucesso');
      }
      if (cargo.managed || cargo.permissions.has(PermissionFlagsBits.Administrator)) return responder(i, 'Escolha um cargo comum (sem administrador).', 'erro');
      if (!cargo.editable) return responder(i, `Meu cargo precisa ficar acima de ${cargo}.`, 'erro');
      c.recompensas[pontos] = cargo.id;
      salvarAjustes();
      return responder(i, `Com **${pontos}** de reputação a pessoa ganha ${cargo}.`, 'sucesso');
    }
    if (sub === 'ranking') {
      const top = Object.entries(rep.ler(i.guildId) ?? {})
        .filter(([, d]) => d.pontos > 0)
        .sort((a, b) => b[1].pontos - a[1].pontos)
        .slice(0, 15);
      if (!top.length) return responder(i, 'Ninguém tem reputação ainda. Use `/rep`.', 'aviso');
      return i.reply({
        embeds: [embed(i.guildId).setTitle('👍 Ranking de reputação').setDescription(top.map(([id, d], k) => `**${k + 1}.** <@${id}> · ${fmt(d.pontos)}`).join('\n'))],
        allowedMentions: { parse: [] },
      });
    }
    const u = i.options.getUser('usuario') ?? i.user;
    const d = rep.ler(i.guildId, u.id);
    const r = Object.entries(cfg(i.guildId).recompensas).sort((a, b) => Number(a[0]) - Number(b[0]));
    const proxima = r.find(([p]) => Number(p) > (d?.pontos ?? 0));
    return responder(i, `${u} tem **${fmt(d?.pontos ?? 0)}** de reputação.${proxima ? ` Próxima recompensa: <@&${proxima[1]}> com ${proxima[0]}.` : ''}`, 'info');
  },
};

export default {
  id: 'reputacao',
  nome: 'Reputação',
  comandos: [repCmd, reputacao],
  permissoes: [PermissionFlagsBits.ManageRoles],
  config: {
    resumo(guild) {
      const r = Object.entries(cfg(guild.id).recompensas);
      return [r.length ? `Recompensas: ${r.map(([p, c]) => `${p} → <@&${c}>`).join(' · ')}` : 'Sem recompensas (`/reputacao recompensa`)'];
    },
  },
};
