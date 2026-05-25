'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const menuItems = [
  { label: 'Geral', href: '', icon: 'settings' },
  { label: 'Niveis (XP)', href: '/levels', icon: 'level' },
  { label: 'Aniversarios', href: '/birthday', icon: 'birthday' },
  { label: 'Jogos', href: '/games', icon: 'games' },
  { label: 'Economia', href: '/economy', icon: 'economy' },
  { label: 'Emojis', href: '/emojis', icon: 'emoji' },
  { label: 'Abraco', href: '/hug', icon: 'hug' },
  { label: 'Tapa', href: '/slap', icon: 'slap' },
  { label: 'Beijo', href: '/kiss', icon: 'kiss' },
  { label: 'Logs', href: '/logs', icon: 'logs' },
];

const iconPaths: Record<string, string> = {
  settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
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

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data?.user) {
          setUser(data.user);
          // Busca a guild pelo ID armazenado
          fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
            headers: { Authorization: `Bot ${process.env.NEXT_PUBLIC_BOT_TOKEN || ''}` },
          })
            .then(res => res.json())
            .then(g => setGuild(g))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [guildId]);

  return (
    <aside style={{
      width: '260px',
      minHeight: '100vh',
      background: '#090011',
      backgroundImage: 'linear-gradient(180deg, #090011 0%, #140020 100%)',
      borderRight: '1px solid rgba(193, 0, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'DM Sans', sans-serif",
      position: 'sticky',
      top: 0,
    }}>
      {/* Cabeçalho do Servidor */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid rgba(193, 0, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {/* Logo + Nome do Servidor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: guild?.icon
              ? `url(https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png?size=80) center/cover`
              : 'linear-gradient(135deg, #C100FF 0%, #8A2BFF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 700,
            color: '#F5F5F5',
            boxShadow: '0 0 15px rgba(193, 0, 255, 0.2)',
          }}>
            {!guild?.icon && (guild?.name?.charAt(0) || 'B')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#F5F5F5',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {guild?.name || 'Carregando...'}
            </div>
            <Link
              href="/dashboard"
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
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Trocar servidor
            </Link>
          </div>
        </div>
      </div>

      {/* Menu de Navegação */}
      <nav style={{
        flex: 1,
        padding: '8px 0',
        overflowY: 'auto',
      }}>
        {menuItems.map(item => {
          const href = item.href ? `${basePath}${item.href}` : basePath;
          const isActive = item.href
            ? pathname === href
            : pathname === basePath;

          return (
            <Link
              key={item.label}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 20px',
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
                {iconPaths[item.icon]
                  ? <path d={iconPaths[item.icon]} />
                  : <circle cx="12" cy="12" r="10"/>}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé com Usuário */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(193, 0, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <img
          src={user?.image || ''}
          alt=""
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '2px solid rgba(193, 0, 255, 0.3)',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#F5F5F5',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {user?.name || 'Usuário'}
          </div>
        </div>
        <a
          href="/api/auth/signout"
          style={{
            color: 'rgba(245, 245, 245, 0.4)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Sair"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </a>
      </div>
    </aside>
  );
}