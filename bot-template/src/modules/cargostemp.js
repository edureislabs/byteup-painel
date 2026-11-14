import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, lerDuracao, duracaoTexto, ts, cortar } from '../core/util.js';

/**
 * Cargos temporários: /cargotemp dar @pessoa @VIP 30d. O cargo sai sozinho no fim do prazo
 * (mesmo se o bot reiniciar). Dar de novo o mesmo cargo renova o prazo.
 */

const temps = colecao('cargos_temporarios'); // guild -> { lista: [{ user, cargo, ate, por, motivo }] }
const cfg = (guildId) => ajustes(guildId, 'cargostemp', { registro: null });
const lista = (guildId) => (temps.de(guildId).lista ??= []);
const MAX = 365 * 86400e3;

async function registrar(guild, texto) {
  const id = cfg(guild.id).registro;
  const canal = id && guild.channels.cache.get(id);
  if (canal?.isTextBased()) await canal.send({ embeds: [embed(guild.id).setDescription(texto).setTimestamp()], allowedMentions: { parse: [] } }).catch(() => {});
}

async function verificar(client) {
  const agora = Date.now();
  for (const [guildId, g] of Object.entries(temps.raiz)) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild || !g.lista?.length) continue;
    const vencidos = g.lista.filter((x) => x.ate <= agora);
    if (!vencidos.length) continue;
    g.lista = g.lista.filter((x) => x.ate > agora);
    temps.salvar();
    for (const x of vencidos) {
      const membro = await guild.members.fetch(x.user).catch(() => null);
      if (membro?.roles.cache.has(x.cargo)) {
        const ok = await membro.roles.remove(x.cargo, 'Fim do cargo temporário').then(() => true, () => false);
        await registrar(guild, `⏳ ${ok ? 'Tirei' : 'Não consegui tirar'} <@&${x.cargo}> de <@${x.user}> (fim do prazo).`);
      }
    }
  }
}

const cargotemp = {
  data: new SlashCommandBuilder()
    .setName('cargotemp')
    .setDescription('Cargos que saem sozinhos depois de um tempo')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) =>
      s
        .setName('dar')
        .setDescription('Dá um cargo por um tempo')
        .addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true))
        .addRoleOption((o) => o.setName('cargo').setDescription('Qual cargo').setRequired(true))
        .addStringOption((o) => o.setName('duracao').setDescription('Ex.: 7d, 30d, 12h (máximo 365d)').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Opcional').setMaxLength(200))
    )
    .addSubcommand((s) =>
      s
        .setName('tirar')
        .setDescription('Tira o cargo agora')
        .addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true))
        .addRoleOption((o) => o.setName('cargo').setDescription('Qual cargo').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('lista')
        .setDescription('Cargos temporários ativos')
        .addUserOption((o) => o.setName('usuario').setDescription('Só de uma pessoa (opcional)'))
    )
    .addSubcommand((s) =>
      s
        .setName('registro')
        .setDescription('Canal que registra quando o cargo sai')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal').setRequired(true).addChannelTypes(ChannelType.GuildText))
    ),
  async executar(i) {
    const sub = i.options.getSubcommand();
    const l = lista(i.guildId);
    if (sub === 'registro') {
      cfg(i.guildId).registro = i.options.getChannel('canal').id;
      salvarAjustes();
      return responder(i, 'Canal de registro salvo.', 'sucesso');
    }
    if (sub === 'lista') {
      const u = i.options.getUser('usuario');
      const ativos = l.filter((x) => !u || x.user === u.id).sort((a, b) => a.ate - b.ate);
      if (!ativos.length) return responder(i, 'Nenhum cargo temporário ativo.', 'aviso');
      const linhas = ativos.slice(0, 40).map((x) => `<@${x.user}> · <@&${x.cargo}> · sai ${ts(x.ate)}`);
      return i.reply({ embeds: [embed(i.guildId).setTitle('⏳ Cargos temporários').setDescription(cortar(linhas.join('\n'), 4000))], flags: 64, allowedMentions: { parse: [] } });
    }
    const u = i.options.getUser('usuario');
    const cargo = i.options.getRole('cargo');
    const membro = await i.guild.members.fetch(u.id).catch(() => null);
    if (!membro) return responder(i, 'Essa pessoa não está no servidor.', 'erro');
    if (sub === 'tirar') {
      temps.de(i.guildId).lista = l.filter((x) => !(x.user === u.id && x.cargo === cargo.id));
      temps.salvar();
      const ok = await membro.roles.remove(cargo, `Cargo temporário tirado por ${i.user.tag}`).then(() => true, () => false);
      return responder(i, ok ? `Tirei ${cargo} de ${u}.` : 'Não consegui tirar o cargo (confira a minha posição na lista de cargos).', ok ? 'sucesso' : 'erro');
    }
    // dar
    const ms = lerDuracao(i.options.getString('duracao'));
    if (!ms || ms > MAX) return responder(i, 'Duração inválida. Use algo como **7d**, **30d** ou **12h** (máximo 365d).', 'erro');
    if (cargo.managed || cargo.id === i.guildId) return responder(i, 'Esse cargo não pode ser dado.', 'erro');
    if (!cargo.editable) return responder(i, `Meu cargo precisa ficar acima de ${cargo}.`, 'erro');
    if (i.user.id !== i.guild.ownerId && cargo.position >= i.member.roles.highest.position) return responder(i, 'Você só pode dar cargos abaixo do seu.', 'erro');
    const ok = await membro.roles.add(cargo, `Cargo temporário (${duracaoTexto(ms)}) por ${i.user.tag}`).then(() => true, () => false);
    if (!ok) return responder(i, 'Não consegui dar o cargo.', 'erro');
    const existente = l.find((x) => x.user === u.id && x.cargo === cargo.id);
    const ate = Date.now() + ms;
    const motivo = i.options.getString('motivo') ?? null;
    if (existente) Object.assign(existente, { ate, por: i.user.id, motivo });
    else l.push({ user: u.id, cargo: cargo.id, ate, por: i.user.id, motivo });
    temps.salvar();
    await registrar(i.guild, `⏳ ${i.user} deu <@&${cargo.id}> para ${u} até ${ts(ate, 'f')}${motivo ? ` · ${cortar(motivo, 200)}` : ''}`);
    return responder(i, `${u} recebeu ${cargo} até ${ts(ate, 'f')} (${ts(ate)}).${existente ? ' (prazo renovado)' : ''}`, 'sucesso');
  },
};

export default {
  id: 'cargostemp',
  nome: 'Cargos temporários',
  permissoes: [PermissionFlagsBits.ManageRoles],
  comandos: [cargotemp],
  aoIniciar(client) {
    verificar(client).catch((e) => console.error('[cargos temporários]', e.message));
    setInterval(() => verificar(client).catch((e) => console.error('[cargos temporários]', e.message)), 60_000);
  },
  config: {
    resumo(guild) {
      const n = temps.ler(guild.id, 'lista')?.length ?? 0;
      return [`${n} cargo(s) temporário(s) ativo(s)${cfg(guild.id).registro ? ` · registro em <#${cfg(guild.id).registro}>` : ''}`];
    },
  },
};
