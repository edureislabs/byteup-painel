import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const accessToken = (session as any).accessToken;
  const userId = (session as any).user?.id;
  const userAvatar = (session as any).user?.image;
  const userName = (session as any).user?.name || "Usuário";

  let guilds: any[] = [];
  const accessibleGuilds: any[] = [];

  try {
    const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      guilds = await res.json();
      if (!Array.isArray(guilds)) guilds = [];
    }
  } catch {
    guilds = [];
  }

  for (const guild of guilds) {
    if (guild.owner) {
      accessibleGuilds.push({ ...guild, accessType: "Dono" });
      continue;
    }

    const permissions =
      typeof guild.permissions === "string"
        ? parseInt(guild.permissions)
        : guild.permissions;

    const hasAdmin = (permissions & 0x8) === 0x8;

    if (hasAdmin) {
      accessibleGuilds.push({ ...guild, accessType: "Administrador" });
      continue;
    }

    try {
      const panelAccess = await prisma.panelAccess.findUnique({
        where: { guildId_userId: { guildId: guild.id, userId } },
      });

      if (panelAccess) {
        accessibleGuilds.push({ ...guild, accessType: "Convidado" });
      }
    } catch {}
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050008",
        backgroundImage:
          "radial-gradient(ellipse at 20% 0%, rgba(193, 0, 255, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(138, 43, 255, 0.08) 0%, transparent 55%)",
        fontFamily: "'DM Sans', sans-serif",
        color: "#dbdee1",
      }}
    >
      <header
        style={{
          background: "rgba(9, 0, 17, 0.88)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "rgba(245,245,245,0.72)",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 600,
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar ao site
          </Link>

          <div
            style={{
              width: "1px",
              height: "28px",
              background: "rgba(255,255,255,0.08)",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  border: "2px solid rgba(193, 0, 255, 0.35)",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  border: "2px solid rgba(193, 0, 255, 0.35)",
                  background:
                    "linear-gradient(135deg, #C100FF 0%, #8A2BFF 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#F5F5F5",
                  fontSize: "14px",
                  fontWeight: 800,
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#f2f3f5",
                }}
              >
                {userName}
              </div>
              <div style={{ fontSize: "11px", color: "#72767d" }}>
                Painel de Controle
              </div>
            </div>
          </div>
        </div>

        <a
          href="/api/auth/signout"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "#dbdee1",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            padding: "9px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Trocar conta
        </a>
      </header>

      <div style={{ padding: "42px 32px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div style={{ marginBottom: "28px" }}>
            <div
              style={{
                color: "#C100FF",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Dashboard
            </div>

            <h1
              style={{
                color: "#f2f3f5",
                fontSize: "30px",
                fontWeight: 800,
                margin: "0",
              }}
            >
              Seus Servidores
            </h1>

            <p
              style={{
                color: "rgba(245,245,245,0.48)",
                fontSize: "14px",
                lineHeight: "1.6",
                marginTop: "8px",
              }}
            >
              Selecione um servidor para configurar módulos, tickets, logs,
              automoderação, economia, níveis e outras funções do ByteUP BOT.
            </p>
          </div>

          {accessibleGuilds.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "52px 24px",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "24px",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <p style={{ color: "#dbdee1", marginBottom: "10px" }}>
                Você não tem acesso a nenhum painel.
              </p>

              <p
                style={{
                  color: "#72767d",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  maxWidth: "520px",
                  margin: "0 auto 24px",
                }}
              >
                Apenas <strong style={{ color: "#dbdee1" }}>donos</strong>,{" "}
                <strong style={{ color: "#dbdee1" }}>administradores</strong>{" "}
                e <strong style={{ color: "#dbdee1" }}>usuários convidados</strong>{" "}
                podem acessar o painel de um servidor.
              </p>

              <Link
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#C100FF",
                  color: "#F5F5F5",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                Voltar ao site
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {accessibleGuilds.map((guild) => (
                <a
                  key={guild.id}
                  href={`/dashboard/${guild.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "16px 20px",
                    textDecoration: "none",
                    color: "#dbdee1",
                  }}
                >
                  {guild.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
                      alt={guild.name}
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, #C100FF 0%, #8A2BFF 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        fontWeight: 800,
                        color: "#F5F5F5",
                      }}
                    >
                      {guild.name.charAt(0)}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "15px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {guild.name}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#72767d",
                        marginTop: "3px",
                      }}
                    >
                      {guild.accessType}
                    </div>
                  </div>

                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#72767d"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
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