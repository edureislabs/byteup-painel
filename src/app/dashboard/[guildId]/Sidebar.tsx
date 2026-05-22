'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { label: 'Geral', href: '' },
  { label: 'Niveis (XP)', href: '/levels' },
  { label: 'Aniversarios', href: '/birthday' },
  { label: 'Jogos', href: '/games' },
  { label: 'Economia', href: '/economy' },
  { label: 'Emojis', href: '/emojis' },
  { label: 'Abraco', href: '/hug' },
  { label: 'Tapa', href: '/slap' },
  { label: 'Beijo', href: '/kiss' },
  { label: 'Logs', href: '/logs' },
  
];

type Props = {
  guildId: string;
};

export default function Sidebar({ guildId }: Props) {
  const pathname = usePathname();
  const basePath = `/dashboard/${guildId}`;

  return (
    <aside style={{
      width: '240px',
      background: '#16181c',
      borderRight: '1px solid #1e2025',
      padding: '24px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {menuItems.map(item => {
        const href = `${basePath}${item.href}`;
        const isActive = pathname === href || (item.href === '' && pathname === basePath);
        return (
          <Link
            key={item.label}
            href={href}
            style={{
              padding: '10px 24px',
              color: isActive ? '#f2f3f5' : '#72767d',
              background: isActive ? '#1e2025' : 'transparent',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              borderLeft: isActive ? '3px solid #5865f2' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}