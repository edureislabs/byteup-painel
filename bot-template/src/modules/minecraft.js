import net from 'node:net';
import dns from 'node:dns/promises';
import { AttachmentBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, cortar, fmt, CORES } from '../core/util.js';
import { textos, visuais } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('minecraft', {
  endereco_invalido: ['❌ Endereço inválido: `{endereco}`', 'descricao'],
  jogadores: ['Jogadores', 'campo'],
  versao: ['Versão', 'campo'],
  ping: ['Ping', 'campo'],
  ms: '{latencia} ms',
  atualizado: ['Atualizado', 'rodape'],
  online_agora: ['Online agora', 'campo'],
  servidor_offline_ou_respondeu: ['Servidor **offline** ou não respondeu.', 'descricao'],
  so_quem_tem_gerenciar: ['Só quem tem **Gerenciar servidor** pode criar painéis.', 'resposta'],
  maximo_paineis_apague_mensagem: ['No máximo {limite} painéis. Apague a mensagem de um para liberar.', 'resposta'],
  consegui_enviar_nesse_canal: '❌ Não consegui enviar nesse canal.',
  painel_criado_ele_atualiza: '✅ Painel criado em {canal}. Ele se atualiza a cada 2 minutos (para tirar, apague a mensagem).',
  status_minecraft: 'Status Minecraft',
  em: '`{endereco}` em <#{canal}>',
  nenhum_painel_minecraft_painel: 'Nenhum painel (`/minecraft painel`)',
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('minecraft', {
  status: { nome: "Painel de status (online)", vars: [], miniatura: "ícone do servidor de Minecraft" },
});

/**
 * Status de servidor de Minecraft (Java): online/offline, jogadores, versão e mensagem do servidor.
 * Consulta o servidor direto pelo protocolo do Minecraft (sem site de terceiros).
 * /minecraft status ip:jogar.exemplo.com · /minecraft painel: mensagem que se atualiza sozinha.
 */

const cfg = (guildId) => ajustes(guildId, 'minecraft', { paineis: [] }); // [{ endereco, canal, msg }]
const LIMITE_PAINEIS = 3;

// ---------------- protocolo (Server List Ping) ----------------
function varint(n) {
  const out = [];
  do {
    let b = n & 0x7f;
    n >>>= 7;
    if (n) b |= 0x80;
    out.push(b);
  } while (n);
  return Buffer.from(out);
}
function lerVarint(buf, pos) {
  let n = 0;
  let shift = 0;
  for (let k = 0; k < 5; k++) {
    if (pos + k >= buf.length) return null;
    const b = buf[pos + k];
    n |= (b & 0x7f) << shift;
    if (!(b & 0x80)) return { valor: n >>> 0, tamanho: k + 1 };
    shift += 7;
  }
  throw new Error('resposta inválida');
}
const pacote = (...partes) => {
  const corpo = Buffer.concat(partes);
  return Buffer.concat([varint(corpo.length), corpo]);
};

/** "jogar.exemplo.com", "1.2.3.4:25570" -> { host, porta }, seguindo o registro SRV se houver. */
export async function resolverEndereco(endereco) {
  const [host, portaTxt] = endereco.trim().toLowerCase().split(':');
  if (!host || !/^[a-z0-9.-]+$/.test(host)) return null;
  if (portaTxt) {
    const porta = Number(portaTxt);
    return porta > 0 && porta < 65536 ? { host, porta } : null;
  }
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const srv = await dns.resolveSrv(`_minecraft._tcp.${host}`).catch(() => null);
    if (srv?.length) return { host: srv[0].name, porta: srv[0].port };
  }
  return { host, porta: 25565 };
}

/** Pergunta o status ao servidor. Devolve o JSON do Minecraft + latência, ou lança erro. */
export function consultar(host, porta, tempo = 5000) {
  return new Promise((resolve, reject) => {
    const inicio = Date.now();
    const sock = net.createConnection({ host, port: porta });
    let buf = Buffer.alloc(0);
    let latencia = null;
    const fim = (erro, dados) => {
      sock.destroy();
      clearTimeout(timer);
      erro ? reject(erro) : resolve(dados);
    };
    const timer = setTimeout(() => fim(new Error('sem resposta')), tempo);
    sock.on('error', (e) => fim(e));
    sock.on('connect', () => {
      latencia = Date.now() - inicio;
      const hostBuf = Buffer.from(host, 'utf8');
      const portaBuf = Buffer.alloc(2);
      portaBuf.writeUInt16BE(porta);
      // handshake (protocolo -1 = "qualquer versão", próximo estado 1 = status) + pedido de status
      sock.write(pacote(varint(0), varint(-1), varint(hostBuf.length), hostBuf, portaBuf, varint(1)));
      sock.write(pacote(varint(0)));
    });
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      try {
        const tam = lerVarint(buf, 0);
        if (!tam || buf.length < tam.tamanho + tam.valor) return; // ainda chegando
        let pos = tam.tamanho;
        const id = lerVarint(buf, pos);
        pos += id.tamanho;
        const len = lerVarint(buf, pos);
        pos += len.tamanho;
        const json = JSON.parse(buf.subarray(pos, pos + len.valor).toString('utf8'));
        fim(null, { ...json, latencia });
      } catch (e) {
        fim(e);
      }
    });
  });
}

/** Texto do "motd" (pode vir como texto ou como componentes coloridos). */
function textoMotd(d) {
  const juntar = (c) => (typeof c === 'string' ? c : (c?.text ?? '') + (c?.extra ?? []).map(juntar).join(''));
  return juntar(d)
    .replace(/§[0-9a-fk-or]/gi, '')
    .trim();
}

async function statusEmbed(guildId, endereco) {
  const alvo = await resolverEndereco(endereco);
  if (!alvo) return { e: embed(guildId).setColor(CORES.erro).setDescription(tx('endereco_invalido', { endereco })) };
  try {
    const s = await consultar(alvo.host, alvo.porta);
    const nomes = (s.players?.sample ?? []).map((p) => p.name).filter((n) => n && !n.includes('§'));
    const e = embed(guildId)
      .setColor(CORES.sucesso)
      .setTitle(`🟢 ${endereco}`)
      .setDescription(cortar(textoMotd(s.description), 500) || null)
      .addFields(
        { name: tx('jogadores'), value: `**${fmt(s.players?.online ?? 0)}** / ${fmt(s.players?.max ?? 0)}`, inline: true },
        { name: tx('versao'), value: cortar(String(s.version?.name ?? '?').replace(/§[0-9a-fk-or]/gi, ''), 100), inline: true },
        { name: tx('ping'), value: tx('ms', { latencia: s.latencia }), inline: true }
      )
      .setFooter({ text: tx('atualizado') })
      .setTimestamp();
    if (nomes.length) e.addFields({ name: tx('online_agora'), value: cortar(nomes.slice(0, 20).join(', '), 1024) });
    let arquivo = null;
    const icone = /^data:image\/png;base64,(.+)$/.exec(s.favicon ?? '');
    if (icone) {
      arquivo = new AttachmentBuilder(Buffer.from(icone[1], 'base64'), { name: 'icone.png' });
      e.setThumbnail('attachment://icone.png');
    }
    vis(e, 'status', {});
    return { e, arquivo, online: true };
  } catch {
    return {
      e: embed(guildId).setColor(CORES.erro).setTitle(`🔴 ${endereco}`).setDescription(tx('servidor_offline_ou_respondeu')).setFooter({ text: tx('atualizado') }).setTimestamp(),
      online: false,
    };
  }
}

async function atualizarPaineis(client) {
  for (const guild of client.guilds.cache.values()) {
    const c = cfg(guild.id);
    if (!c.paineis.length) continue;
    let mudou = false;
    for (const p of [...c.paineis]) {
      const canal = guild.channels.cache.get(p.canal);
      const msg = await canal?.messages.fetch(p.msg).catch(() => null);
      if (!msg) {
        c.paineis = c.paineis.filter((x) => x !== p); // apagaram a mensagem
        mudou = true;
        continue;
      }
      const { e } = await statusEmbed(guild.id, p.endereco);
      await msg.edit({ embeds: [e], attachments: [] }).catch(() => {});
    }
    if (mudou) salvarAjustes();
  }
}

const minecraft = {
  data: new SlashCommandBuilder()
    .setName('minecraft')
    .setDescription('Status de servidor de Minecraft (Java)')
    .addSubcommand((s) =>
      s
        .setName('status')
        .setDescription('Mostra se o servidor está online e quantos jogam')
        .addStringOption((o) => o.setName('ip').setDescription('Ex.: jogar.exemplo.com ou 1.2.3.4:25565').setRequired(true).setMaxLength(100))
    )
    .addSubcommand((s) =>
      s
        .setName('painel')
        .setDescription('(Equipe) Mensagem com o status que se atualiza a cada 2 minutos')
        .addStringOption((o) => o.setName('ip').setDescription('Endereço do servidor').setRequired(true).setMaxLength(100))
        .addChannelOption((o) => o.setName('canal').setDescription('Onde enviar (padrão: aqui)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    ),
  async executar(i) {
    const endereco = i.options.getString('ip').trim();
    if (i.options.getSubcommand() === 'status') {
      await i.deferReply();
      const { e, arquivo } = await statusEmbed(i.guildId, endereco);
      return i.editReply({ embeds: [e], files: arquivo ? [arquivo] : [] });
    }
    if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return responder(i, tx('so_quem_tem_gerenciar'), 'erro');
    const c = cfg(i.guildId);
    if (c.paineis.length >= LIMITE_PAINEIS) return responder(i, tx('maximo_paineis_apague_mensagem', { limite: LIMITE_PAINEIS }), 'erro');
    const canal = i.options.getChannel('canal') ?? i.channel;
    await i.deferReply({ flags: 64 });
    const { e } = await statusEmbed(i.guildId, endereco);
    const msg = await canal.send({ embeds: [e] }).catch(() => null);
    if (!msg) return i.editReply(tx('consegui_enviar_nesse_canal'));
    c.paineis.push({ endereco, canal: canal.id, msg: msg.id });
    salvarAjustes();
    return i.editReply(tx('painel_criado_ele_atualiza', { canal }));
  },
};

export default {
  id: 'minecraft',
  nome: tx('status_minecraft'),
  comandos: [minecraft],
  aoIniciar(client) {
    atualizarPaineis(client).catch(() => {});
    setInterval(() => atualizarPaineis(client).catch(() => {}), 2 * 60_000);
  },
  config: {
    resumo(guild) {
      const p = cfg(guild.id).paineis;
      return [p.length ? p.map((x) => tx('em', { endereco: x.endereco, canal: x.canal })).join(' · ') : tx('nenhum_painel_minecraft_painel')];
    },
  },
};
