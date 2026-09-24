import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import SectionHeader from "../components/SectionHeader";
import CommandCard from "../components/CommandCard";
import { commandCategories } from "../data/commands";

export default function CommandsPage() {
  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <SectionHeader
            eyebrow="Comandos"
            title="Comandos do ByteUP BOT"
            description="A lista abaixo está organizada colocando primeiro os comandos que costumam ser mais usados no dia a dia."
          />

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-[#aaa3b5]">
            Prefixo principal: <code className="rounded-lg bg-black/25 px-2 py-1 text-[#ead9ff]">/</code>.
            Alguns comandos podem exigir permissões de administrador, staff ou cargos definidos no painel.
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container space-y-8">
          {commandCategories.map((category) => (
            <section key={category.name} className="site-card p-6 md:p-8">
              <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="site-title text-2xl font-black text-white md:text-3xl">
                    {category.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#aaa3b5]">
                    {category.description}
                  </p>
                </div>

                <div className="text-sm text-[#7d7588]">
                  {category.commands.length} comandos
                </div>
              </div>

              <div className="grid gap-3">
                {category.commands.map(([command, description]) => (
                  <CommandCard
                    key={command}
                    command={command}
                    description={description}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
