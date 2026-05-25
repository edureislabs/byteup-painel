import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { canAccessPanel } from "@/lib/permissions";
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

  const botInGuild = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  }).then(res => res.ok).catch(() => false);

  if (!botInGuild) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#090011",
        backgroundImage: "radial-gradient(ellipse at 30% 0%, rgba(193, 0, 255, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 100%, rgba(138, 43, 255, 0.05) 0%, transparent 60%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
        padding: "24px",
      }}>
        <div style={{
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
        }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "rgba(193, 0, 255, 0.1)", border: "1px solid rgba(193, 0, 255, 0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px auto",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C100FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>

          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#F5F5F5", margin: "0 0 8px 0" }}>
            Bot nao esta no servidor
          </h1>

          <p style={{ fontSize: "14px", color: "rgba(245, 245, 245, 0.5)", margin: "0 0 32px 0", lineHeight: "1.6" }}>
            O ByteUP BOT precisa estar presente no servidor para que o painel funcione.
            Adicione o bot ao servidor e tente novamente.
          </p>

          <a href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "#C100FF", color: "#F5F5F5", padding: "10px 24px",
            borderRadius: "8px", textDecoration: "none", fontSize: "14px",
            fontWeight: 600, transition: "background 0.15s",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Voltar para meus servidores
          </a>
        </div>
      </div>
    );
  }

  const hasAccess = await canAccessPanel(guildId);
  if (!hasAccess) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#090011",
        backgroundImage: "radial-gradient(ellipse at 30% 0%, rgba(193, 0, 255, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 100%, rgba(255, 0, 212, 0.05) 0%, transparent 60%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
        padding: "24px",
      }}>
        <div style={{ maxWidth: "480px", width: "100%", textAlign: "center" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "rgba(255, 0, 212, 0.1)", border: "1px solid rgba(255, 0, 212, 0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px auto",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF00D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#F5F5F5", margin: "0 0 8px 0" }}>Acesso negado</h1>
          <p style={{ fontSize: "14px", color: "rgba(245, 245, 245, 0.5)", margin: "0 0 32px 0", lineHeight: "1.6" }}>
            Voce precisa ser o <strong style={{ color: "#F5F5F5" }}>dono</strong>, ter cargo de <strong style={{ color: "#F5F5F5" }}>Administrador</strong> ou estar na lista de acesso para acessar este painel.
          </p>
          <a href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "#C100FF", color: "#F5F5F5", padding: "10px 24px",
            borderRadius: "8px", textDecoration: "none", fontSize: "14px",
            fontWeight: 600, transition: "background 0.15s",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Voltar para meus servidores
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#090011" }}>
      <Sidebar guildId={guildId} />
      <main style={{ flex: 1, padding: "32px 48px", background: "#0E0A14" }}>
        {children}
      </main>
    </div>
  );
}