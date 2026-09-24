import LevelsManager from './LevelsManager';

type Props = {
  params: Promise<{ guildId: string }>;
};

export default async function LevelsPage({ params }: Props) {
  const { guildId } = await params;
  return <LevelsManager guildId={guildId} />;
}