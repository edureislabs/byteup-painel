import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const accessToken = (session as any).accessToken;
  const userId = (session as any).user?.id;
  const userAvatar = (session as any).user?.image;
  const userName = (session as any).user?.name;

  const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const guilds: any[] = await res.json();

  const accessibleGuilds = [];

  for (const guild of guilds) {
    if (guild.owner) {
      accessibleGuilds.push({ ...guild, accessType: 'Dono' });
      continue;
    }

    const hasAdmin = (guild.permissions & 0x8) === 0x8;
    if (hasAdmin) {
      accessibleGuilds.push({ ...guild, accessType: 'Administrador' });
      continue;
    }

    const panelAccess = await prisma.panelAccess.findUnique({
      where: { guildId_userId: { guildId: guild.id, userId } },
    });

    if (panelAccess) {
      accessibleGuilds.push({ ...guild, accessType: 'Convidado' });
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0e0f11",
      fontFamily: "'DM Sans', sans-serif",
      color: "#dbdee1",
    }}>
      {/* Header com perfil do usuário */}
      <header style={{
        background: "#16181c",
        borderBottom: "1px solid #1e2025",
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src={userAvatar || ""}
            alt={userName || ""}
            style={{ width: "36px", height: "36px", borderRadius: "50%" }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#f2f3f5" }}>{userName}</div>
            <div style={{ fontSize: "11px", color: "#72767d" }}>Painel de Controle</div>
          </div>
        </div>
        <a
          href="/api/auth/signout"
          style={{
            background: "#2b2d31",
            color: "#dbdee1",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "background 0.15s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Trocar conta
        </a>
      </header>

      {/* Conteúdo principal */}
      <div style={{ padding: "32px" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h1 style={{ color: "#f2f3f5", fontSize: "24px", fontWeight: 600, marginBottom: "24px" }}>
            Seus Servidores
          </h1>

          {accessibleGuilds.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ color: "#72767d", marginBottom: "16px" }}>Voce nao tem acesso a nenhum painel.</p>
              <p style={{ color: "#72767d", fontSize: "13px" }}>
                Apenas <strong style={{ color: "#dbdee1" }}>donos</strong>, <strong style={{ color: "#dbdee1" }}>administradores</strong> e <strong style={{ color: "#dbdee1" }}>usuarios convidados</strong> podem acessar o painel de um servidor.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {accessibleGuilds.map((guild) => (
                <a
                  key={guild.id}
                  href={`/dashboard/${guild.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    background: "#16181c",
                    border: "1px solid #1e2025",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    textDecoration: "none",
                    color: "#dbdee1",
                    transition: "border-color 0.15s",
                  }}
                >
                  {guild.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
                      alt={guild.name}
                      style={{ width: "44px", height: "44px", borderRadius: "50%" }}
                    />
                  ) : (
                    <div style={{
                      width: "44px", height: "44px", borderRadius: "50%",
                      background: "#2b2d31", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "18px", fontWeight: 600,
                      color: "#72767d",
                    }}>
                      {guild.name.charAt(0)}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "15px" }}>{guild.name}</div>
                    <div style={{ fontSize: "12px", color: "#72767d", marginTop: "2px" }}>{guild.accessType}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#72767d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}