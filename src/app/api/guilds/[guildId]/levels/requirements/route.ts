import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;
  const requirements = await prisma.levelRequirement.findMany({
    where: { guildId },
    orderBy: { level: 'asc' },
  });

  return NextResponse.json(requirements);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;
  const body = await req.json();
  const { level, xpNeeded } = body;

  if (!level || !xpNeeded) {
    return NextResponse.json({ error: 'level e xpNeeded são obrigatórios' }, { status: 400 });
  }

  try {
    const existing = await prisma.levelRequirement.findUnique({
      where: { guildId_level: { guildId, level } },
    });

    if (existing) {
      const updated = await prisma.levelRequirement.update({
        where: { guildId_level: { guildId, level } },
        data: { xpNeeded },
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.levelRequirement.create({
        data: { guildId, level, xpNeeded },
      });
      return NextResponse.json(created);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao salvar requisito' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;
  const { searchParams } = new URL(req.url);
  const level = parseInt(searchParams.get('level') || '');

  if (!level) return NextResponse.json({ error: 'Nível é obrigatório' }, { status: 400 });

  try {
    await prisma.levelRequirement.deleteMany({ where: { guildId, level } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao remover requisito' }, { status: 500 });
  }
}