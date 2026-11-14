import { SlashCommandBuilder, version as djsVersion } from 'discord.js';
import { CONFIG, ajustes, salvarAjustes, embed, responder, responderCampos, duracaoTexto, fmt } from './util.js';
import { textos } from './textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('geral', {
  config_configurar_este_modulo: '`/config {grupo}` · configurar este módulo',
  cont: '{nome} (cont.)',
  comandos: ['📖 Comandos do {nome}', 'titulo'],
  administradores_use_config_ver: ['Administradores: use /config ver para ver tudo o que está configurado', 'rodape'],
  pong: ['🏓 Pong!', 'titulo'],
  conexao_gateway: ['Conexão (gateway)', 'campo'],
  ms: '{ws} ms',
  medindo: 'medindo…',
  resposta: ['Resposta', 'campo'],
  ms_2: '{api} ms',
  servidores: ['Servidores', 'campo'],
  membros: ['Membros', 'campo'],
  online_ha: ['Online há', 'campo'],
  modulos: ['Módulos', 'campo'],
  nenhum: 'nenhum',
  discord_js_node: ['discord.js {djsVersion} · Node {node}', 'rodape'],
  use_cor_hexadecimal_como: ['Use uma cor em hexadecimal, como **#5865F2**.', 'resposta'],
  cor_definida: ['Cor definida para **{cor}**.', 'resposta'],
  cargo_equipe: 'Cargo da equipe: {cargo}.',
  cargo_equipe_removido: 'Cargo da equipe removido.',
  geral: ['Geral', 'campo'],
  padrao: 'padrão',
  cor: 'Cor: **{cor}**',
  definida_so_quem_tem: 'não definida (só quem tem Gerenciar servidor)',
  equipe: 'Equipe: {staff}',
  configuracao_deste_servidor: ['⚙️ Configuração deste servidor', 'titulo'],
});

/**
 * Núcleo: vem em todo bot. /ajuda, /ping, /sobre e o começo do /config
 * (/config ver, /config cor, /config staff). Cada módulo instalado acrescenta
 * o seu grupo dentro do /config (ex.: /config logs canal).
 */

let MODULOS = [];
export const registrarModulos = (lista) => { MODULOS = lista; };

const ajuda = {
  data: new SlashCommandBuilder().setName('ajuda').setDescription('Mostra todos os comandos do bot'),
  async executar(i) {
    const campos = [];
    for (const m of MODULOS) {
      const linhas = (m.comandos ?? []).map((c) => `\`/${c.data.name}\` · ${c.data.description}`);
      if (m.config?.grupo) linhas.push(tx('config_configurar_este_modulo', { grupo: m.config.grupo }));
      if (!linhas.length) continue;
      // um campo aceita até 1024 caracteres: quebra em partes se precisar
      let atual = '';
      let parte = 0;
      for (const l of linhas) {
        if ((atual + l + '\n').length > 1000) {
          campos.push({ name: parte ? tx('cont', { nome: m.nome }) : m.nome, value: atual });
          atual = '';
          parte++;
        }
        atual += `${l}\n`;
      }
      if (atual) campos.push({ name: parte ? tx('cont', { nome: m.nome }) : m.nome, value: atual });
    }
    await responderCampos(
      i,
      () =>
        embed(i.guildId)
          .setTitle(tx('comandos', { nome: CONFIG.nome || i.client.user.username }))
          .setThumbnail(i.client.user.displayAvatarURL())
          .setFooter({ text: tx('administradores_use_config_ver') }),
      campos
    );
  },
};

const ping = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Mostra a latência do bot'),
  async executar(i) {
    const inicio = Date.now();
    await i.deferReply();
    const api = Date.now() - inicio;
    const ws = i.client.ws.ping;
    await i.editReply({
      embeds: [
        embed(i.guildId)
          .setTitle(tx('pong'))
          .addFields(
            { name: tx('conexao_gateway'), value: ws >= 0 ? tx('ms', { ws }) : tx('medindo'), inline: true },
            { name: tx('resposta'), value: tx('ms_2', { api }), inline: true },
          ),
      ],
    });
  },
};

const sobre = {
  data: new SlashCommandBuilder().setName('sobre').setDescription('Informações sobre o bot'),
  async executar(i) {
    const c = i.client;
    const membros = c.guilds.cache.reduce((t, g) => t + (g.memberCount || 0), 0);
    const nomes = MODULOS.filter((m) => m.id !== 'nucleo').map((m) => m.nome);
    await i.reply({
      embeds: [
        embed(i.guildId)
          .setTitle(CONFIG.nome || c.user.username)
          .setThumbnail(c.user.displayAvatarURL())
          .addFields(
            { name: tx('servidores'), value: fmt(c.guilds.cache.size), inline: true },
            { name: tx('membros'), value: fmt(membros), inline: true },
            { name: tx('online_ha'), value: duracaoTexto(c.uptime ?? 0), inline: true },
            { name: tx('modulos'), value: nomes.length ? nomes.join(', ') : tx('nenhum') },
          )
          .setFooter({ text: tx('discord_js_node', { djsVersion, node: process.versions.node }) }),
      ],
    });
  },
};

/** Subcomandos "soltos" do /config (sem grupo). */
function montarConfigRaiz(cmd) {
  return cmd
    .addSubcommand((s) => s.setName('ver').setDescription('Mostra tudo o que está configurado neste servidor'))
    .addSubcommand((s) =>
      s
        .setName('cor')
        .setDescription('Cor das mensagens do bot neste servidor')
        .addStringOption((o) => o.setName('cor').setDescription('Em hexadecimal, ex.: #5865F2').setRequired(true).setMaxLength(7))
    )
    .addSubcommand((s) =>
      s
        .setName('staff')
        .setDescription('Cargo da equipe (atende tickets, aprova sugestões...)')
        .addRoleOption((o) => o.setName('cargo').setDescription('Deixe vazio para remover').setRequired(false))
    );
}

async function executarConfigRaiz(i, sub) {
  const geral = ajustes(i.guildId, 'geral', { cor: null, staff: null });
  if (sub === 'cor') {
    const valor = i.options.getString('cor').trim();
    if (!/^#?[0-9a-f]{6}$/i.test(valor)) return responder(i, tx('use_cor_hexadecimal_como'), 'erro');
    geral.cor = valor.startsWith('#') ? valor : `#${valor}`;
    salvarAjustes();
    return responder(i, tx('cor_definida', { cor: geral.cor }), 'sucesso');
  }
  if (sub === 'staff') {
    const cargo = i.options.getRole('cargo');
    geral.staff = cargo?.id ?? null;
    salvarAjustes();
    return responder(i, cargo ? tx('cargo_equipe', { cargo }) : tx('cargo_equipe_removido'), 'sucesso');
  }
  if (sub === 'ver') {
    const campos = [
      {
        name: tx('geral'),
        value: [tx('cor', { cor: geral.cor || CONFIG.cor || tx('padrao') }), tx('equipe', { staff: geral.staff ? `<@&${geral.staff}>` : tx('definida_so_quem_tem') })].join('\n'),
      },
    ];
    for (const m of MODULOS) {
      if (!m.config?.resumo) continue;
      const linhas = await m.config.resumo(i.guild);
      if (linhas?.length) campos.push({ name: m.nome, value: linhas.join('\n') });
    }
    return responderCampos(i, () => embed(i.guildId).setTitle(tx('configuracao_deste_servidor')), campos, { efemero: true });
  }
}

export default {
  id: 'nucleo',
  nome: tx('geral'),
  comandos: [ajuda, ping, sobre],
  montarConfigRaiz,
  executarConfigRaiz,
};
