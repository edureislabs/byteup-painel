import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/apiGuard';
import { prisma } from '@/lib/prisma';

const DEFAULTS = {
  enabled: false,
  message: '{user} subiu para o nivel {level}!',
  xpMode: 'formula',
  baseXP: 100,
  exponent: 2.0,
  minXpPerMessage: 15,
  maxXpPerMessage: 25,
  cooldownSeconds: 60,
  rewardAmount: 0,
};

type Rule =
  | { type: 'bool' }
  | { type: 'string'; max: number; nullable?: boolean }
  | { type: 'int'; min: number; max: number }
  | { type: 'float'; min: number; max: number }
  | { type: 'enum'; values: string[] };

/**
 * Só estes campos podem ser alterados, e cada um tem limite.
 * Antes o body inteiro ia direto pro banco: com baseXP = 0 ou exponent = 0
 * o cálculo de nível do bot entrava em loop infinito e travava o bot todo.
 */
const RULES: Record<string, Rule> = {
  enabled: { type: 'bool' },
  message: { type: 'string', max: 2000 },
  imageUrl: { type: 'string', max: 2000, nullable: true },
  rewardCurrencyId: { type: 'string', max: 100, nullable: true },
  rewardAmount: { type: 'int', min: 0, max: 1_000_000_000 },
  channelMultipliers: { type: 'string', max: 20000, nullable: true },
  roleMultipliers: { type: 'string', max: 20000, nullable: true },
  blockedChannels: { type: 'string', max: 20000, nullable: true },
  blockedRoles: { type: 'string', max: 20000, nullable: true },
  roleByLevel: { type: 'string', max: 20000, nullable: true },
  xpMode: { type: 'enum', values: ['formula', 'table'] },
  baseXP: { type: 'int', min: 1, max: 1_000_000 },
  exponent: { type: 'float', min: 0.1, max: 10 },
  minXpPerMessage: { type: 'int', min: 0, max: 100_000 },
  maxXpPerMessage: { type: 'int', min: 0, max: 100_000 },
  cooldownSeconds: { type: 'int', min: 0, max: 86_400 },
  levelUpChannelId: { type: 'string', max: 30, nullable: true },
  dailyXpLimit: { type: 'int', min: 0, max: 100_000_000 },
};

// Campos que o bot lê com JSON.parse
const JSON_FIELDS = new Set([
  'channelMultipliers',
  'roleMultipliers',
  'blockedChannels',
  'blockedRoles',
  'roleByLevel',
]);

function sanitize(body: any): { data?: Record<string, any>; error?: string } {
  if (!body || typeof body !== 'object') return { error: 'Corpo inválido' };

  const data: Record<string, any> = {};

  for (const [field, rule] of Object.entries(RULES)) {
    if (!(field in body)) continue;
    const value = body[field];

    switch (rule.type) {
      case 'bool':
        if (typeof value !== 'boolean') return { error: `${field} deve ser verdadeiro/falso` };
        data[field] = value;
        break;

      case 'string':
        if (value === null || value === '') {
          if (!rule.nullable) return { error: `${field} não pode ficar vazio` };
          data[field] = null;
          break;
        }
        if (typeof value !== 'string' || value.length > rule.max) {
          return { error: `${field} inválido` };
        }
        if (JSON_FIELDS.has(field)) {
          try {
            JSON.parse(value);
          } catch {
            return { error: `${field} não é um JSON válido` };
          }
        }
        data[field] = value;
        break;

      case 'int': {
        const n = Number(value);
        if (!Number.isInteger(n) || n < rule.min || n > rule.max) {
          return { error: `${field} deve ser um número inteiro entre ${rule.min} e ${rule.max}` };
        }
        data[field] = n;
        break;
      }

      case 'float': {
        const n = Number(value);
        if (!Number.isFinite(n) || n < rule.min || n > rule.max) {
          return { error: `${field} deve ser um número entre ${rule.min} e ${rule.max}` };
        }
        data[field] = n;
        break;
      }

      case 'enum':
        if (!rule.values.includes(value)) return { error: `${field} inválido` };
        data[field] = value;
        break;
    }
  }

  return { data };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  let config = await prisma.levelConfig.findUnique({ where: { guildId } });
  if (!config) {
    config = await prisma.levelConfig.create({
      data: { guildId, ...DEFAULTS },
    });
  }

  return NextResponse.json(config);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const { data, error } = sanitize(body);
  if (error || !data) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const existing = await prisma.levelConfig.findUnique({ where: { guildId } });

    const min = data.minXpPerMessage ?? existing?.minXpPerMessage ?? DEFAULTS.minXpPerMessage;
    const max = data.maxXpPerMessage ?? existing?.maxXpPerMessage ?? DEFAULTS.maxXpPerMessage;
    if (min > max) {
      return NextResponse.json(
        { error: 'O XP mínimo por mensagem não pode ser maior que o máximo' },
        { status: 400 }
      );
    }

    const config = existing
      ? await prisma.levelConfig.update({ where: { guildId }, data })
      : await prisma.levelConfig.create({ data: { ...DEFAULTS, ...data, guildId } });

    return NextResponse.json(config);
  } catch (error) {
    console.error('[levels/config] Erro:', error);
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 });
  }
}
