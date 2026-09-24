import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { guildId } = await params;

    let config = await prisma.guildConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await prisma.guildConfig.create({
        data: { guildId },
      });
    }

    return NextResponse.json({
      counterEnabled: config.counterEnabled ?? false,
      counterChannelId: config.counterChannelId ?? null,
      counterTemplate: config.counterTemplate ?? 'Membros: {contmember}',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}