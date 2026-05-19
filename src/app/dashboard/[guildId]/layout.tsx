import Sidebar from './Sidebar';

export default async function GuildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0e0f11' }}>
      <Sidebar guildId={guildId} />
      <main style={{ flex: 1, padding: '32px 48px' }}>
        {children}
      </main>
    </div>
  );
}