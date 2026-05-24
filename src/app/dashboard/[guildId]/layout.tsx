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

  const owner = await isGuildOwner(guildId);
  if (!owner) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0e0f11",
        backgroundImage: "radial-gradient(ellipse at 30% 0%, rgba(237, 66, 69, 0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 100%, rgba(88, 101, 242, 0.04) 0%, transparent 60%)",
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
          {/* Ícone decorativo */}
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(237, 66, 69, 0.1)",
            border: "1px solid rgba(237, 66, 69, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px auto",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ed4245" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "#f2f3f5",
            margin: "0 0 8px 0",
            letterSpacing: "-0.3px",
          }}>
            Acesso negado
          </h1>

          <p style={{
            fontSize: "14px",
            color: "#72767d",
            margin: "0 0 32px 0",
            lineHeight: "1.6",
          }}>
            Voce precisa ser o <strong style={{ color: "#dbdee1" }}>dono</strong> deste servidor para acessar o painel de controle.
          </p>

          <a href="/dashboard" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#5865f2",
            color: "#ffffff",
            padding: "10px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
            transition: "background 0.15s",
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
    <div style={{ display: "flex", minHeight: "100vh", background: "#0e0f11" }}>
      <Sidebar guildId={guildId} />
      <main style={{ flex: 1, padding: "32px 48px" }}>
        {children}
      </main>
    </div>
  );
}