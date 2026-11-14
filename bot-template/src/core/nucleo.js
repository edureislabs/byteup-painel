import { SlashCommandBuilder, version as djsVersion } from 'discord.js';
import { CONFIG, ajustes, salvarAjustes, embed, responder, responderCampos, duracaoTexto, fmt } from './util.js';

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
      if (m.config) linhas.push(`\`/config ${m.config.grupo}\` · configurar este módulo`);
      if (!linhas.length) continue;
      // um campo aceita até 1024 caracteres: quebra em partes se precisar
      let atual = '';
      let parte = 0;
      for (const l of linhas) {
        if ((atual + l + '\n').length > 1000) {
          campos.push({ name: parte ? `${m.nome} (cont.)` : m.nome, value: atual });
          atual = '';
          parte++;
        }
        atual += `${l}\n`;
      }
      if (atual) campos.push({ name: parte ? `${m.nome} (cont.)` : m.nome, value: atual });
    }
    await responderCampos(
      i,
      () =>
        embed(i.guildId)
          .setTitle(`📖 Comandos do ${CONFIG.nome || i.client.user.username}`)
          .setThumbnail(i.client.user.displayAvatarURL())
          .setFooter({ text: 'Administradores: use /config ver para ver tudo o que está configurado' }),
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
          .setTitle('🏓 Pong!')
          .addFields(
            { name: 'Conexão (gateway)', value: ws >= 0 ? `${ws} ms` : 'medindo…', inline: true },
            { name: 'Resposta', value: `${api} ms`, inline: true },
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
            { name: 'Servidores', value: fmt(c.guilds.cache.size), inline: true },
            { name: 'Membros', value: fmt(membros), inline: true },
            { name: 'Online há', value: duracaoTexto(c.uptime ?? 0), inline: true },
            { name: 'Módulos', value: nomes.length ? nomes.join(', ') : 'nenhum' },
          )
          .setFooter({ text: `discord.js ${djsVersion} · Node ${process.versions.node}` }),
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
    if (!/^#?[0-9a-f]{6}$/i.test(valor)) return responder(i, 'Use uma cor em hexadecimal, como **#5865F2**.', 'erro');
    geral.cor = valor.startsWith('#') ? valor : `#${valor}`;
    salvarAjustes();
    return responder(i, `Cor definida para **${geral.cor}**.`, 'sucesso');
  }
  if (sub === 'staff') {
    const cargo = i.options.getRole('cargo');
    geral.staff = cargo?.id ?? null;
    salvarAjustes();
    return responder(i, cargo ? `Cargo da equipe: ${cargo}.` : 'Cargo da equipe removido.', 'sucesso');
  }
  if (sub === 'ver') {
    const campos = [
      {
        name: 'Geral',
        value: [`Cor: **${geral.cor || CONFIG.cor || 'padrão'}**`, `Equipe: ${geral.staff ? `<@&${geral.staff}>` : 'não definida (só quem tem Gerenciar servidor)'}`].join('\n'),
      },
    ];
    for (const m of MODULOS) {
      if (!m.config?.resumo) continue;
      const linhas = await m.config.resumo(i.guild);
      if (linhas?.length) campos.push({ name: m.nome, value: linhas.join('\n') });
    }
    return responderCampos(i, () => embed(i.guildId).setTitle('⚙️ Configuração deste servidor'), campos, { efemero: true });
  }
}

export default {
  id: 'nucleo',
  nome: 'Geral',
  comandos: [ajuda, ping, sobre],
  montarConfigRaiz,
  executarConfigRaiz,
};
