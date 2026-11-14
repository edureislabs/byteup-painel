import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { CONFIG, ajustes, salvarAjustes, embed, responder, preencher, imagens } from '../core/util.js';
import { textos, modeloOu, visuais } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('aniversarios', {
  msg_parabens_padrao: '🎂 Hoje é aniversário de {usuario}! Parabéns! 🎉',
  america_sao_paulo: 'America/Sao_Paulo',
  de: '{dia} de {mes}',
  tem_dia: ['{mes} não tem dia {dia}.', 'resposta'],
  aniversario_salvo: ['Aniversário salvo: **{data}**. 🎂', 'resposta'],
  seu_aniversario_foi_apagado: ['Seu aniversário foi apagado.', 'resposta'],
  voce_ainda_cadastrou_use: 'Você ainda não cadastrou. Use `/aniversario definir`.',
  ainda_cadastrou_aniversario: '{usuario} ainda não cadastrou o aniversário.',
  hoje: '**é hoje!** 🎉',
  faltam_dia: 'faltam {falta} dia(s)',
  ninguem_cadastrou_aniversario_ainda: ['Ninguém cadastrou o aniversário ainda. Use `/aniversario definir`.', 'resposta'],
  hoje_2: '**hoje!**',
  dia: 'em {falta} dia(s)',
  proximos_aniversarios: ['🎂 Próximos aniversários', 'titulo'],
  so_quem_tem_gerenciar: ['Só quem tem **Gerenciar servidor** pode configurar.', 'resposta'],
  escolha_cargo_comum_sem: ['Escolha um cargo comum (sem administrador).', 'resposta'],
  meu_cargo_precisa_ficar: ['Meu cargo precisa ficar acima de {cargo}.', 'resposta'],
  escolha_pelo_menos_opcao: ['Escolha pelo menos uma opção (canal, cargo ou mensagem).', 'resposta'],
  escolha_canal: '— (escolha um canal)',
  cargo_dia: ' · cargo do dia <@&{cargo}>',
  aniversarios_parabens: ['Aniversários: parabéns em {canal}{cargo}.', 'resposta'],
  aniversarios: 'Aniversários',
  definido_aniversario_configurar: 'não definido (`/aniversario configurar`)',
  parabens: 'Parabéns em: {canal}',
  nenhum: 'nenhum',
  cargo_dia_2: 'Cargo do dia: {cargo}',
  aniversario_cadastrado: '{total} aniversário(s) cadastrado(s)',
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('aniversarios', {
  parabens: { nome: "Parabéns no aniversário", vars: ['avatar', 'servidor_icone'], miniatura: "{avatar}" },
});

/**
 * Aniversários: cada membro cadastra o dia com /aniversario definir.
 * No dia, o bot dá parabéns no canal escolhido e (opcional) um cargo que dura 24 h.
 * O fuso é o do Brasil (America/Sao_Paulo); dá para trocar com "fuso" no config.json.
 */

const datas = colecao('aniversarios'); // guild -> user -> { dia, mes }
const PADRAO = { canal: null, cargo: null, mensagem: null, anunciados: {}, cargosAtivos: {} };
const cfg = (guildId) => ajustes(guildId, 'aniversarios', PADRAO);
const ANTIGA = '🎂 Hoje é aniversário de {usuario}! Parabéns! 🎉'; // padrão de versões anteriores
const msgParabens = (c) => modeloOu(c.mensagem, ANTIGA, tx('msg_parabens_padrao'));
const FUSO = CONFIG.fuso || tx('america_sao_paulo');
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
const dataTexto = (d) => tx('de', { dia: d.dia, mes: MESES[d.mes - 1] });

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
      if (dia > DIAS_NO_MES[mes - 1]) return responder(i, tx('tem_dia', { mes: MESES[mes - 1], dia }), 'erro');
      datas.de(i.guildId)[i.user.id] = { dia, mes };
      datas.salvar();
      return responder(i, tx('aniversario_salvo', { data: dataTexto({ dia, mes }) }), 'sucesso');
    }
    if (sub === 'remover') {
      datas.apagar(i.guildId, i.user.id);
      return responder(i, tx('seu_aniversario_foi_apagado'), 'sucesso');
    }
    if (sub === 'ver') {
      const u = i.options.getUser('usuario') ?? i.user;
      const d = datas.ler(i.guildId, u.id);
      if (!d) return responder(i, u.id === i.user.id ? tx('voce_ainda_cadastrou_use') : tx('ainda_cadastrou_aniversario', { usuario: u }), 'aviso');
      const falta = diasAte(d, h);
      return responder(i, `🎂 ${u}: **${dataTexto(d)}** · ${falta === 0 ? tx('hoje') : tx('faltam_dia', { falta })}`, 'info');
    }
    if (sub === 'proximos') {
      const todos = Object.entries(datas.ler(i.guildId) ?? {})
        .map(([id, d]) => ({ id, d, falta: diasAte(d, h) }))
        .sort((a, b) => a.falta - b.falta)
        .slice(0, 15);
      if (!todos.length) return responder(i, tx('ninguem_cadastrou_aniversario_ainda'), 'aviso');
      const linhas = todos.map((x) => `${x.falta === 0 ? '🎉' : '🎂'} <@${x.id}> · ${dataTexto(x.d)} · ${x.falta === 0 ? tx('hoje_2') : tx('dia', { falta: x.falta })}`);
      return i.reply({ embeds: [embed(i.guildId).setTitle(tx('proximos_aniversarios')).setDescription(linhas.join('\n'))], allowedMentions: { parse: [] } });
    }

    // configurar (só equipe)
    if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return responder(i, tx('so_quem_tem_gerenciar'), 'erro');
    const c = cfg(i.guildId);
    const canal = i.options.getChannel('canal');
    const cargo = i.options.getRole('cargo');
    const msg = i.options.getString('mensagem');
    if (cargo) {
      if (cargo.managed || cargo.id === i.guildId || cargo.permissions.has(PermissionFlagsBits.Administrator)) return responder(i, tx('escolha_cargo_comum_sem'), 'erro');
      if (!cargo.editable) return responder(i, tx('meu_cargo_precisa_ficar', { cargo }), 'erro');
      c.cargo = cargo.id;
    }
    if (canal) c.canal = canal.id;
    if (msg) c.mensagem = msg;
    if (!canal && !cargo && !msg) return responder(i, tx('escolha_pelo_menos_opcao'), 'aviso');
    salvarAjustes();
    return responder(i, tx('aniversarios_parabens', { canal: c.canal ? `<#${c.canal}>` : tx('escolha_canal'), cargo: c.cargo ? tx('cargo_dia', { cargo: c.cargo }) : '' }), 'sucesso');
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
          const texto = preencher(msgParabens(c), { usuario: `${membro}`, nome: membro.displayName, servidor: guild.name });
          await canal
            .send({ embeds: [vis(embed(guild.id).setDescription(texto).setThumbnail(membro.displayAvatarURL()), 'parabens', imagens({ user: membro.user, guild }))], content: `${membro}`, allowedMentions: { users: [userId] } })
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
  nome: tx('aniversarios'),
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
        tx('parabens', { canal: c.canal ? `<#${c.canal}>` : tx('definido_aniversario_configurar') }),
        tx('cargo_dia_2', { cargo: c.cargo ? `<@&${c.cargo}>` : tx('nenhum') }),
        tx('aniversario_cadastrado', { total: n }),
      ];
    },
  },
};
