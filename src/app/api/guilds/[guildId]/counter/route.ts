import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/apiGuard';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const denied = await guardApi(guildId);
    if (denied) return denied;

    const config = await prisma.guildConfig.findUnique({
      where: { guildId },
    });

    return NextResponse.json({
      counterEnabled: config?.counterEnabled ?? false,
      counterChannelId: config?.counterChannelId ?? null,
      counterTemplate: config?.counterTemplate ?? 'Membros: {contmember}',
    });
  } catch (error) {
    console.error('[counter] Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
