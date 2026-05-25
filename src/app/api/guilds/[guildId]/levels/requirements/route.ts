import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardApi } from '@/lib/apiGuard';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

  const requirements = await prisma.levelRequirement.findMany({
    where: { guildId },
    orderBy: { level: 'asc' },
  });

  return NextResponse.json(requirements);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

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
  const { guildId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

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