import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import { anyPaymentConfigured } from "@/lib/stripe";
import { getBuilderCatalog, modulesForSale } from "@/lib/builder/prices";
import { ownedBot } from "@/lib/builder/owned";
import Montador from "./Montador";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Monte o seu bot | Loja ByteUP",
  description: "Escolha os módulos e receba um bot para Discord pronto para ligar, que funciona em qualquer servidor.",
};

export default async function MonteOSeuPage({ searchParams }: { searchParams: Promise<{ bot?: string }> }) {
  const [{ bot: botId }, session, catalogo] = await Promise.all([searchParams, getServerSession(authOptions), getBuilderCatalog()]);
  // ?bot=<item> = "Adicionar módulos" a um bot que a pessoa já comprou
  const bot = botId && session?.user?.id ? await ownedBot(botId, session.user.id) : null;

  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm pb-20">
        <div className="site-container">
          <Link href="/loja" className="block w-fit text-sm text-[#7d7588] hover:text-white">← Voltar para a loja</Link>

          <span className="site-pill mt-6 inline-block">Monte o seu</span>
          <h1 className="site-title mt-4 text-4xl font-black md:text-5xl">{bot ? "Adicionar módulos" : "Monte o seu bot"}</h1>
          {bot && (
            <p className="mt-3 text-sm text-[#d9b4ff]">
              Para o bot <strong>{bot.options.nome}</strong>. Você paga só o que adicionar e recebe o bot completo, sem perder os dados.
            </p>
          )}
          {botId && !bot && (
            <p className="mt-3 text-sm text-[#f07878]">Não achei esse bot nas suas compras. Você pode montar um novo abaixo.</p>
          )}
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#aaa3b5]">
            Escolha só o que o seu servidor precisa e pague só por isso. O bot funciona em <strong className="text-white">qualquer servidor</strong>,
            é configurado por comandos e chega na sua DM com um passo a passo para ligar.
          </p>

          <Montador
            loggedIn={Boolean(session?.user?.id)}
            paymentsReady={anyPaymentConfigured()}
            base={{ name: catalogo.base.name, priceCents: catalogo.base.priceCents }}
            modules={modulesForSale(catalogo)}
            upgrade={
              bot ? { botItemId: bot.itemId, nome: bot.options.nome, cor: bot.options.cor, owned: bot.options.modulos } : undefined
            }
          />

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-6 text-[#aaa3b5]">
            <p className="font-bold text-white">Precisa de algo exclusivo?</p>
            <p className="mt-1">
              Os módulos daqui são genéricos, feitos para qualquer comunidade. Recursos sob medida (cards com imagem, painel web,
              integrações, comandos especiais) são feitos por encomenda: abra um ticket no nosso Discord.
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
