import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import { anyPaymentConfigured } from "@/lib/stripe";
import Montador from "./Montador";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Monte o seu bot | Loja ByteUP",
  description: "Escolha os módulos e receba um bot para Discord pronto para ligar, que funciona em qualquer servidor.",
};

export default async function MonteOSeuPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm pb-20">
        <div className="site-container">
          <Link href="/loja" className="block w-fit text-sm text-[#7d7588] hover:text-white">← Voltar para a loja</Link>

          <span className="site-pill mt-6 inline-block">Monte o seu</span>
          <h1 className="site-title mt-4 text-4xl font-black md:text-5xl">Monte o seu bot</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#aaa3b5]">
            Escolha só o que o seu servidor precisa e pague só por isso. O bot funciona em <strong className="text-white">qualquer servidor</strong>,
            é configurado por comandos e chega na sua DM com um passo a passo para ligar.
          </p>

          <Montador loggedIn={Boolean(session?.user?.id)} paymentsReady={anyPaymentConfigured()} />

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
