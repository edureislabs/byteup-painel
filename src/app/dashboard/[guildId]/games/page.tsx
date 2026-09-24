import GamesManager from './GamesManager';

type Props = {
  params: Promise<{ guildId: string }>;
};

export default async function GamesPage({ params }: Props) {
  const { guildId } = await params;
  return <GamesManager guildId={guildId} />;
}