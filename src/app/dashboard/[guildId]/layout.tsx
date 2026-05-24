import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { isGuildOwner } from "@/lib/permissions";
import Sidebar from "./Sidebar";

export default async function GuildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { guildId } = await params;

  // Verifica se é dono do servidor
  const owner = await isGuildOwner(guildId);
  if (!owner) {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif", color: "#dbdee1", background: "#0e0f11", minHeight: "100vh" }}>
        <div style={{ maxWidth: "520px", margin: "0 auto" }}>
          <h1 style={{ color: "#f2f3f5" }}>Acesso negado</h1>
          <p style={{ color: "#72767d" }}>Voce nao e o dono deste servidor.</p>
          <a href="/dashboard" style={{ color: "#5865f2", textDecoration: "none" }}>Voltar para a lista de servidores</a>
        </div>
      </main>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0e0f11" }}>
      <Sidebar guildId={guildId} />
      <main style={{ flex: 1, padding: "32px 48px" }}>
        {children}
      </main>
    </div>
  );
}