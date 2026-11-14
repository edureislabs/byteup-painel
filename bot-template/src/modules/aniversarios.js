import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { CONFIG, ajustes, salvarAjustes, embed, responder, preencher } from '../core/util.js';

/**
 * Aniversários: cada membro cadastra o dia com /aniversario definir.
 * No dia, o bot dá parabéns no canal escolhido e (opcional) um cargo que dura 24 h.
 * O fuso é o do Brasil (America/Sao_Paulo); dá para trocar com "fuso" no config.json.
 */

const datas = colecao('aniversarios'); // guild -> user -> { dia, mes }
const PADRAO = { canal: null, cargo: null, mensagem: '🎂 Hoje é aniversário de {usuario}! Parabéns! 🎉', anunciados: {}, cargosAtivos: {} };
const cfg = (guildId) => ajustes(guildId, 'aniversarios', PADRAO);
const FUSO = CONFIG.fuso || 'America/Sao_Paulo';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS_NO_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Dia, mês e ano de hoje no fuso configurado. */
function hoje() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: FUSO, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  return { dia: Number(p.day), mes: Number(p.month), ano: Number(p.year) };
}
const bissexto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
/** Quem nasceu em 29/02 comemora em 28/02 nos anos que não são bissextos. */
const fazHoje = (d, h) => (d.dia === h.dia && d.mes === h.mes) || (d.dia === 29 && d.mes === 2 && !bissexto(h.ano) && h.dia === 28 && h.mes === 2);
const dataTexto = (d) => `${d.dia} de ${MESES[d.mes - 1]}`;

function diasAte(d, h) {
  const base = Date.UTC(h.ano, h.mes - 1, h.dia);
  let alvo = Date.UTC(h.ano, d.mes - 1, Math.min(d.dia, d.mes === 2 && !bissexto(h.ano) ? 28 : d.dia));
  if (alvo < base) alvo = Date.UTC(h.ano + 1, d.mes - 1, Math.min(d.dia, d.mes === 2 && !bissexto(h.ano + 1) ? 28 : d.dia));
  return Math.round((alvo - base) / 86400e3);
}

const aniversario = {
  data: new SlashCommandBuilder()
    .setName('aniversario')
    .setDescription('Aniversários do servidor')
    .addSubcommand((s) =>
      s
        .setName('definir')
        .setDescription('Cadastra o dia do seu aniversário')
        .addIntegerOption((o) => o.setName('dia').setDescription('Dia').setRequired(true).setMinValue(1).setMaxValue(31))
        .addIntegerOption((o) =>
          o
            .setName('mes')
            .setDescription('Mês')
            .setRequired(true)
            .addChoices(...MESES.map((m, n) => ({ name: m, value: n + 1 })))
        )
    )
    .addSubcommand((s) => s.setName('remover').setDescription('Apaga o seu aniversário'))
    .addSubcommand((s) =>
      s
        .setName('ver')
        .setDescription('Mostra o aniversário de alguém')
        .addUserOption((o) => o.setName('usuario').setDescription('De quem (padrão: você)'))
    )
    .addSubcommand((s) => s.setName('proximos').setDescription('Os próximos aniversários do servidor'))
    .addSubcommand((s) =>
      s
        .setName('configurar')
        .setDescription('(Equipe) Canal dos parabéns, cargo do dia e mensagem')
        .addChannelOption((o) => o.setName('canal').setDescription('Onde dar os parabéns').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo que o aniversariante ganha por 24 h'))
        .addStringOption((o) => o.setName('mensagem').setDescription('Mensagem. Variáveis: {usuario} {nome} {servidor}').setMaxLength(500))
    ),
  async executar(i) {
    const sub = i.options.getSubcommand();
    const h = hoje();

    if (sub === 'definir') {
      const dia = i.options.getInteger('dia');
      const mes = i.options.getInteger('mes');
      if (dia > DIAS_NO_MES[mes - 1]) return responder(i, `${MESES[mes - 1]} não tem dia ${dia}.`, 'erro');
      datas.de(i.guildId)[i.user.id] = { dia, mes };
      datas.salvar();
      return responder(i, `Aniversário salvo: **${dataTexto({ dia, mes })}**. 🎂`, 'sucesso');
    }
    if (sub === 'remover') {
      datas.apagar(i.guildId, i.user.id);
      return responder(i, 'Seu aniversário foi apagado.', 'sucesso');
    }
    if (sub === 'ver') {
      const u = i.options.getUser('usuario') ?? i.user;
      const d = datas.ler(i.guildId, u.id);
      if (!d) return responder(i, u.id === i.user.id ? 'Você ainda não cadastrou. Use `/aniversario definir`.' : `${u} ainda não cadastrou o aniversário.`, 'aviso');
      const falta = diasAte(d, h);
      return responder(i, `🎂 ${u}: **${dataTexto(d)}** · ${falta === 0 ? '**é hoje!** 🎉' : `faltam ${falta} dia(s)`}`, 'info');
    }
    if (sub === 'proximos') {
      const todos = Object.entries(datas.ler(i.guildId) ?? {})
        .map(([id, d]) => ({ id, d, falta: diasAte(d, h) }))
        .sort((a, b) => a.falta - b.falta)
        .slice(0, 15);
      if (!todos.length) return responder(i, 'Ninguém cadastrou o aniversário ainda. Use `/aniversario definir`.', 'aviso');
      const linhas = todos.map((x) => `${x.falta === 0 ? '🎉' : '🎂'} <@${x.id}> · ${dataTexto(x.d)} · ${x.falta === 0 ? '**hoje!**' : `em ${x.falta} dia(s)`}`);
      return i.reply({ embeds: [embed(i.guildId).setTitle('🎂 Próximos aniversários').setDescription(linhas.join('\n'))], allowedMentions: { parse: [] } });
    }

    // configurar (só equipe)
    if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return responder(i, 'Só quem tem **Gerenciar servidor** pode configurar.', 'erro');
    const c = cfg(i.guildId);
    const canal = i.options.getChannel('canal');
    const cargo = i.options.getRole('cargo');
    const msg = i.options.getString('mensagem');
    if (cargo) {
      if (cargo.managed || cargo.id === i.guildId || cargo.permissions.has(PermissionFlagsBits.Administrator)) return responder(i, 'Escolha um cargo comum (sem administrador).', 'erro');
      if (!cargo.editable) return responder(i, `Meu cargo precisa ficar acima de ${cargo}.`, 'erro');
      c.cargo = cargo.id;
    }
    if (canal) c.canal = canal.id;
    if (msg) c.mensagem = msg;
    if (!canal && !cargo && !msg) return responder(i, 'Escolha pelo menos uma opção (canal, cargo ou mensagem).', 'aviso');
    salvarAjustes();
    return responder(i, `Aniversários: parabéns em ${c.canal ? `<#${c.canal}>` : '— (escolha um canal)'}${c.cargo ? ` · cargo do dia <@&${c.cargo}>` : ''}.`, 'sucesso');
  },
};

/** Dá os parabéns de hoje e tira o cargo de quem já passou das 24 h. Roda a cada 10 minutos. */
async function verificar(client) {
  const h = hoje();
  const chaveHoje = `${h.ano}-${h.mes}-${h.dia}`;
  for (const guild of client.guilds.cache.values()) {
    const c = cfg(guild.id);
    let mudou = false;

    // tira os cargos vencidos
    for (const [userId, ate] of Object.entries(c.cargosAtivos)) {
      if (ate > Date.now()) continue;
      delete c.cargosAtivos[userId];
      mudou = true;
      const membro = await guild.members.fetch(userId).catch(() => null);
      if (membro && c.cargo) await membro.roles.remove(c.cargo, 'Fim do dia de aniversário').catch(() => {});
    }

    if (c.canal || c.cargo) {
      const canal = c.canal && guild.channels.cache.get(c.canal);
      for (const [userId, d] of Object.entries(datas.ler(guild.id) ?? {})) {
        if (!fazHoje(d, h) || c.anunciados[userId] === chaveHoje) continue;
        const membro = await guild.members.fetch(userId).catch(() => null);
        c.anunciados[userId] = chaveHoje;
        mudou = true;
        if (!membro) continue; // saiu do servidor
        if (canal?.isTextBased()) {
          const texto = preencher(c.mensagem, { usuario: `${membro}`, nome: membro.displayName, servidor: guild.name });
          await canal
            .send({ embeds: [embed(guild.id).setDescription(texto).setThumbnail(membro.displayAvatarURL())], content: `${membro}`, allowedMentions: { users: [userId] } })
            .catch(() => {});
        }
        if (c.cargo) {
          const ok = await membro.roles.add(c.cargo, 'Aniversário').then(() => true, () => false);
          if (ok) c.cargosAtivos[userId] = Date.now() + 24 * 3600e3;
        }
      }
    }
    if (mudou) salvarAjustes();
  }
}

export default {
  id: 'aniversarios',
  nome: 'Aniversários',
  comandos: [aniversario],
  permissoes: [PermissionFlagsBits.ManageRoles],
  aoIniciar(client) {
    verificar(client).catch((e) => console.error('[aniversários]', e.message));
    setInterval(() => verificar(client).catch((e) => console.error('[aniversários]', e.message)), 10 * 60_000);
  },
  config: {
    resumo(guild) {
      const c = cfg(guild.id);
      const n = Object.keys(datas.ler(guild.id) ?? {}).length;
      return [
        `Parabéns em: ${c.canal ? `<#${c.canal}>` : 'não definido (`/aniversario configurar`)'}`,
        `Cargo do dia: ${c.cargo ? `<@&${c.cargo}>` : 'nenhum'}`,
        `${n} aniversário(s) cadastrado(s)`,
      ];
    },
  },
};
