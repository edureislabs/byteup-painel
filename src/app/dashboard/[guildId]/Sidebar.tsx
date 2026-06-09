'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const menuCategories = [
  {
    label: 'Principal',
    items: [
      { label: 'Visao Geral', href: '', icon: 'home' },
      { label: 'Logs', href: '/logs', icon: 'logs' },
    ],
  },
  {
    label: 'Moderacao',
    items: [
      { label: 'Comandos', href: '/commands', icon: 'slash' },
      { label: 'Automod', href: '/automod', icon: 'shield' },
      { label: 'Boas-vindas', href: '/welcome', icon: 'welcome' },
      { label: 'Saiu do Servidor', href: '/goodbye', icon: 'goodbye' },
      { label: 'Tickets', href: '/tickets', icon: 'ticket' },
    ],
  },
  {
    label: 'Engajamento',
    items: [
      { label: 'Niveis (XP)', href: '/levels', icon: 'level' },
      { label: 'Aniversarios', href: '/birthday', icon: 'birthday' },
      { label: 'Jogos', href: '/games', icon: 'games' },
      { label: 'Economia', href: '/economy', icon: 'economy' },
    ],
  },
  {
    label: 'Interacoes',
    items: [
      { label: 'Abraco', href: '/hug', icon: 'hug' },
      { label: 'Tapa', href: '/slap', icon: 'slap' },
      { label: 'Beijo', href: '/kiss', icon: 'kiss' },
    ],
  },
  {
    label: 'Personalizacao',
    items: [{ label: 'Emojis', href: '/emojis', icon: 'emoji' }],
  },
];

const iconPaths: Record<string, string> = {
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  slash: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  level: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  birthday: 'M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6M12 2v20M6 8h12',
  goodbye: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1',
  games: 'M15 4l-6 6 6 6M9 4l-6 6 6 6',
  ticket: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  economy: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  emoji:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm8 0c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm-4 5c1.66 0 3-1.34 3-3H9c0 1.66 1.34 3 3 3z',
  hug: 'M14.5 17.5L12 20l-2.5-2.5M12 4v16M8 8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.21-1.79 4-4 4s-4-1.79-4-4z',
  slap: 'M18 2l-6 6M6 2l6 6M12 8v14M5 22h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z',
  kiss: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  logs: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  welcome:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
};

type Props = {
  guildId: string;
};

export default function Sidebar({ guildId }: Props) {
  const pathname = usePathname();
  const basePath = `/dashboard/${guildId}`;

  const [guild, setGuild] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const effectiveCollapsed = isMobile ? false : collapsed;

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;

      setIsMobile(mobile);

      if (mobile) {
        setCollapsed(false);
      }
    };

    check();

    window.addEventListener('resize', check);

    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});

    fetch(`/api/guilds/${guildId}/info`)
      .then((res) => res.json())
      .then((g) => {
        if (!g.error) setGuild(g);
      })
      .catch(() => {});
  }, [guildId]);

  const closeMobile = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const sidebarContent = (
    <>
      <div
        style={{
          padding: effectiveCollapsed ? '16px 10px' : '20px 16px',
          borderBottom: '1px solid rgba(193, 0, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: effectiveCollapsed ? 'center' : 'stretch',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: effectiveCollapsed ? '0' : '12px',
            flexDirection: effectiveCollapsed ? 'column' : 'row',
          }}
        >
          <div
            style={{
              width: effectiveCollapsed ? '36px' : '40px',
              height: effectiveCollapsed ? '36px' : '40px',
              borderRadius: '12px',
              flexShrink: 0,
              background: guild?.icon
                ? `url(https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png?size=80) center/cover`
                : 'linear-gradient(135deg, #C100FF 0%, #8A2BFF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: effectiveCollapsed ? '14px' : '16px',
              fontWeight: 700,
              color: '#F5F5F5',
              boxShadow: '0 0 15px rgba(193, 0, 255, 0.2)',
            }}
          >
            {!guild?.icon && (guild?.name?.charAt(0) || 'B')}
          </div>

          {!effectiveCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#F5F5F5',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {guild?.name || 'Carregando...'}
              </div>

              <Link
                href="/dashboard"
                onClick={closeMobile}
                style={{
                  fontSize: '11px',
                  color: '#8A2BFF',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '2px',
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Trocar servidor
              </Link>
            </div>
          )}
        </div>
      </div>

      <nav
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          padding: '8px 0',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {menuCategories.map((category) => (
          <div key={category.label} style={{ marginBottom: '4px' }}>
            {!effectiveCollapsed && (
              <div
                style={{
                  padding: '8px 20px 4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'rgba(138, 43, 255, 0.6)',
                }}
              >
                {category.label}
              </div>
            )}

            {category.items.map((item) => {
              const href = item.href ? `${basePath}${item.href}` : basePath;
              const isActive = item.href
                ? pathname === href || pathname.startsWith(`${href}/`)
                : pathname === basePath;

              return (
                <Link
                  key={item.label}
                  href={href}
                  onClick={closeMobile}
                  title={effectiveCollapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: effectiveCollapsed ? '10px 0' : '10px 20px',
                    justifyContent: effectiveCollapsed
                      ? 'center'
                      : 'flex-start',
                    color: isActive
                      ? '#F5F5F5'
                      : 'rgba(245, 245, 245, 0.5)',
                    background: isActive
                      ? 'rgba(193, 0, 255, 0.08)'
                      : 'transparent',
                    borderLeft: isActive
                      ? '3px solid #C100FF'
                      : '3px solid transparent',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                    boxShadow: isActive
                      ? 'inset 0 0 20px rgba(193, 0, 255, 0.05)'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background =
                        'rgba(193, 0, 255, 0.04)';
                      e.currentTarget.style.color = '#F5F5F5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color =
                        'rgba(245, 245, 245, 0.5)';
                    }
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={
                      isActive ? '#C100FF' : 'rgba(245, 245, 245, 0.3)'
                    }
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    {iconPaths[item.icon] ? (
                      <path d={iconPaths[item.icon]} />
                    ) : (
                      <circle cx="12" cy="12" r="10" />
                    )}
                  </svg>

                  {!effectiveCollapsed && item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {!isMobile && (
        <div
          style={{
            padding: '8px',
            borderTop: '1px solid rgba(193, 0, 255, 0.08)',
            display: 'flex',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(245, 245, 245, 0.3)',
              padding: '4px',
              borderRadius: '4px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#F5F5F5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(245, 245, 245, 0.3)';
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      )}

      <div
        style={{
          padding: effectiveCollapsed ? '12px 8px' : '12px 16px',
          borderTop: '1px solid rgba(193, 0, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
          flexShrink: 0,
          background: '#090011',
        }}
      >
        {user?.image ? (
          <img
            src={user.image}
            alt={user?.name || 'Usuário'}
            style={{
              width: effectiveCollapsed ? '28px' : '32px',
              height: effectiveCollapsed ? '28px' : '32px',
              borderRadius: '50%',
              border: '2px solid rgba(193, 0, 255, 0.3)',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            aria-label={user?.name || 'Usuário'}
            style={{
              width: effectiveCollapsed ? '28px' : '32px',
              height: effectiveCollapsed ? '28px' : '32px',
              borderRadius: '50%',
              border: '2px solid rgba(193, 0, 255, 0.3)',
              background: 'linear-gradient(135deg, #C100FF 0%, #8A2BFF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F5F5F5',
              fontSize: effectiveCollapsed ? '11px' : '12px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(user?.name?.charAt(0) || 'U').toUpperCase()}
          </div>
        )}

        {!effectiveCollapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#F5F5F5',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name || 'Usuário'}
              </div>
            </div>

            <a
              href="/api/auth/signout"
              style={{
                color: 'rgba(245, 245, 245, 0.4)',
                textDecoration: 'none',
                flexShrink: 0,
              }}
              title="Sair"
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
            </a>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {isMobile && (
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            position: 'fixed',
            top: '12px',
            left: '12px',
            zIndex: 100,
            background: '#090011',
            border: '1px solid rgba(193, 0, 255, 0.2)',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#F5F5F5',
          }}
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {mobileOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      )}

      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(0,0,0,0.5)',
          }}
        />
      )}

      <aside
        style={{
          width: isMobile ? '260px' : collapsed ? '60px' : '260px',
          height: isMobile ? '100dvh' : '100vh',
          maxHeight: isMobile ? '100dvh' : '100vh',
          background: '#090011',
          backgroundImage: 'linear-gradient(180deg, #090011 0%, #140020 100%)',
          borderRight: '1px solid rgba(193, 0, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'DM Sans', sans-serif",
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          left: isMobile ? (mobileOpen ? 0 : '-260px') : 0,
          zIndex: 50,
          transition: 'width 0.2s ease, left 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}