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
    items: [
      { label: 'Emojis', href: '/emojis', icon: 'emoji' },
    ],
  },
];

const iconPaths: Record<string, string> = {
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  slash: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  level: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  birthday: 'M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6M12 2v20M6 8h12',
  games: 'M15 4l-6 6 6 6M9 4l-6 6 6 6',
  economy: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  emoji: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm8 0c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm-4 5c1.66 0 3-1.34 3-3H9c0 1.66 1.34 3 3 3z',
  hug: 'M14.5 17.5L12 20l-2.5-2.5M12 4v16M8 8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.21-1.79 4-4 4s-4-1.79-4-4z',
  slap: 'M18 2l-6 6M6 2l6 6M12 8v14M5 22h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z',
  kiss: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  logs: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => { if (data?.user) setUser(data.user); })
      .catch(() => {});
    fetch(`/api/guilds/${guildId}/info`)
      .then(res => res.json())
      .then(g => { if (!g.error) setGuild(g); })
      .catch(() => {});
  }, [guildId]);

  const sidebarContent = (
    <>
      {/* Cabeçalho do Servidor */}
      <div style={{
        padding: collapsed ? '16px 10px' : '20px 16px',
        borderBottom: '1px solid rgba(193, 0, 255, 0.08)',
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'column',
        alignItems: collapsed ? 'center' : 'stretch',
        gap: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? '0' : '12px',
          flexDirection: collapsed ? 'column' : 'row',
        }}>
          <div style={{
            width: collapsed ? '36px' : '40px',
            height: collapsed ? '36px' : '40px',
            borderRadius: '12px',
            flexShrink: 0,
            background: guild?.icon
              ? `url(https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png?size=80) center/cover`
              : 'linear-gradient(135deg, #C100FF 0%, #8A2BFF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: collapsed ? '14px' : '16px',
            fontWeight: 700,
            color: '#F5F5F5',
            boxShadow: '0 0 15px rgba(193, 0, 255, 0.2)',
          }}>
            {!guild?.icon && (guild?.name?.charAt(0) || 'B')}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px', fontWeight: 600, color: '#F5F5F5',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {guild?.name || 'Carregando...'}
              </div>
              <Link href="/dashboard" style={{
                fontSize: '11px', color: '#8A2BFF', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px',
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                Trocar servidor
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Menu de Navegação por Categorias */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {menuCategories.map((category) => (
          <div key={category.label} style={{ marginBottom: '4px' }}>
            {!collapsed && (
              <div style={{
                padding: '8px 20px 4px',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'rgba(138, 43, 255, 0.6)',
              }}>
                {category.label}
              </div>
            )}
            {category.items.map((item) => {
              const href = item.href ? `${basePath}${item.href}` : basePath;
              const isActive = item.href ? pathname === href : pathname === basePath;

              return (
                <Link
                  key={item.label}
                  href={href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: collapsed ? '10px 0' : '10px 20px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    color: isActive ? '#F5F5F5' : 'rgba(245, 245, 245, 0.5)',
                    background: isActive ? 'rgba(193, 0, 255, 0.08)' : 'transparent',
                    borderLeft: isActive ? '3px solid #C100FF' : '3px solid transparent',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? 'inset 0 0 20px rgba(193, 0, 255, 0.05)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(193, 0, 255, 0.04)';
                      e.currentTarget.style.color = '#F5F5F5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(245, 245, 245, 0.5)';
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={isActive ? '#C100FF' : 'rgba(245, 245, 245, 0.3)'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    {iconPaths[item.icon] ? <path d={iconPaths[item.icon]} /> : <circle cx="12" cy="12" r="10"/>}
                  </svg>
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Botão de colapsar (apenas desktop) */}
      {!isMobile && (
        <div style={{
          padding: '8px',
          borderTop: '1px solid rgba(193, 0, 255, 0.08)',
          display: 'flex', justifyContent: 'center',
        }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(245, 245, 245, 0.3)', padding: '4px',
              borderRadius: '4px', transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#F5F5F5'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(245, 245, 245, 0.3)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        </div>
      )}

      {/* Rodapé com Usuário */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px 16px',
        borderTop: '1px solid rgba(193, 0, 255, 0.08)',
        display: 'flex', alignItems: 'center', gap: '8px',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <img
          src={user?.image || ''}
          alt=""
          style={{
            width: collapsed ? '28px' : '32px',
            height: collapsed ? '28px' : '32px',
            borderRadius: '50%',
            border: '2px solid rgba(193, 0, 255, 0.3)',
          }}
        />
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '12px', fontWeight: 600, color: '#F5F5F5',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.name || 'Usuário'}
              </div>
            </div>
            <a href="/api/auth/signout" style={{ color: 'rgba(245, 245, 245, 0.4)', textDecoration: 'none' }} title="Sair">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </a>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Botão de menu mobile */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            position: 'fixed', top: '12px', left: '12px', zIndex: 100,
            background: '#090011', border: '1px solid rgba(193, 0, 255, 0.2)',
            borderRadius: '8px', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#F5F5F5',
            boxShadow: '0 0 15px rgba(193, 0, 255, 0.3)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileOpen ? <path d="M18 6L6 18M6 6l12 12"/> : <path d="M3 12h18M3 6h18M3 18h18"/>}
          </svg>
        </button>
      )}

      {/* Overlay mobile */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.5)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: isMobile ? '260px' : (collapsed ? '60px' : '260px'),
        minHeight: '100vh',
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
      }}>
        {sidebarContent}
      </aside>
    </>
  );
}