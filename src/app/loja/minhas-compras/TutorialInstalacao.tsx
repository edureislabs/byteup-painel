/**
 * Tutorial de instalação em "Minhas compras": um vídeo (opcional) e o passo a passo.
 * O link do vídeo vem da variável de ambiente TUTORIAL_VIDEO_URL (defina na Vercel quando gravar);
 * sem ela, aparece só o passo a passo escrito.
 */

const PASSOS: { titulo: string; texto: string }[] = [
  {
    titulo: "Baixe o bot",
    texto: "No seu pedido acima, clique em “Baixar o bot (.zip)”. O arquivo vem com todos os módulos que você comprou.",
  },
  {
    titulo: "Desbloqueie o .zip (Windows)",
    texto:
      "Antes de abrir, clique com o botão direito no .zip → Propriedades → marque Desbloquear → OK. Sem isso o Windows pode bloquear o launcher.",
  },
  {
    titulo: "Extraia numa pasta",
    texto:
      "Clique com o botão direito no .zip → Extrair tudo. Vão aparecer a pasta do bot e a subpasta “Bots ByteUP”.",
  },
  {
    titulo: "Abra o Bots ByteUP",
    texto:
      "Entre na subpasta “Bots ByteUP” e dê dois cliques em “Abrir Bots ByteUP.bat”. Só na primeira vez: depois dela, ele cria o atalho “Bots ByteUP” (com ícone) ao lado da pasta do bot, na Área de Trabalho e no Menu Iniciar — é por ele que você abre daí em diante.",
  },
  {
    titulo: "Crie o bot no Discord",
    texto:
      "Entre com a MESMA conta do Discord desta compra em discord.com/developers/applications → New Application → Bot → Reset Token e copie o token. Bot criado em outra conta não liga.",
  },
  {
    titulo: "Configure (sem terminal)",
    texto:
      "No Bots ByteUP, escolha o bot e clique em Ligar. Cole o token, ligue as permissões que ele pedir, coloque o ID do servidor (opcional) e clique em “Instalar e ligar o bot”. Ele instala tudo sozinho.",
  },
  {
    titulo: "Convide o bot ao servidor",
    texto:
      "Quando ele ficar online, aparece um link para adicionar o bot. Abra, escolha o seu servidor e autorize. No servidor, arraste o cargo do bot para cima dos cargos que ele vai gerenciar.",
  },
  {
    titulo: "Personalize no painel (opcional)",
    texto:
      "Com o módulo Personalização: no Discord use /personalizar baixar, abra o “Personalizar bot.html”, edite textos, cores e a configuração dos servidores, salve e use /personalizar aplicar.",
  },
];

/** Converte um link do YouTube em link de incorporação (embed). Outros links vão como estão. */
function urlEmbed(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/shorts/")) return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
    }
    if (host === "player.vimeo.com" || host === "vimeo.com") return url;
    return url;
  } catch {
    return null;
  }
}

export function TutorialInstalacao() {
  const videoUrl = process.env.TUTORIAL_VIDEO_URL ? urlEmbed(process.env.TUTORIAL_VIDEO_URL) : null;

  return (
    <details className="mt-8 overflow-hidden rounded-3xl border border-[#b64cff]/25 bg-[#b64cff]/[0.04]" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-bold">
        <span>📺 Como instalar e ligar o seu bot</span>
        <span className="text-xs font-normal text-[#aaa3b5]">passo a passo</span>
      </summary>

      <div className="border-t border-white/10 p-5">
        {videoUrl ? (
          <div className="mb-5 aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
            <iframe
              src={videoUrl}
              title="Tutorial de instalação"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="mb-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[#aaa3b5]">
            🎬 O vídeo-tutorial está a caminho. Por enquanto, siga o passo a passo abaixo.
          </p>
        )}

        <ol className="space-y-3">
          {PASSOS.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#b64cff]/20 text-sm font-bold text-[#d9b4ff]">
                {i + 1}
              </span>
              <div>
                <div className="font-semibold">{p.titulo}</div>
                <div className="text-sm text-[#aaa3b5]">{p.texto}</div>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-xs text-[#7d7588]">
          Travou em algum passo? Abra um ticket no nosso Discord com o número do pedido que a gente ajuda.
        </p>
      </div>
    </details>
  );
}
