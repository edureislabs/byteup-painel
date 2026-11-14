import { prisma } from '@/lib/prisma';
import { isSnowflake } from '@/lib/apiGuard';

const MAX = 2_000_000_000;

/**
 * Valida os campos de um item da loja.
 * partial = true (edição): só valida os campos enviados.
 */
export async function validateShopItem(
  guildId: string,
  body: any,
  partial: boolean
): Promise<{ data?: Record<string, any>; error?: string }> {
  if (!body || typeof body !== 'object') return { error: 'Corpo inválido' };

  const data: Record<string, any> = {};
  const has = (f: string) => body[f] !== undefined;

  if (!partial || has('name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 80) return { error: 'O nome deve ter de 1 a 80 caracteres' };
    data.name = name;
  }

  if (has('description')) {
    const d = body.description;
    if (d !== null && d !== '' && (typeof d !== 'string' || d.length > 300)) {
      return { error: 'A descrição deve ter no máximo 300 caracteres' };
    }
    data.description = d ? String(d).trim() : null;
  }

  if (!partial || has('price')) {
    const price = Number(body.price);
    if (!Number.isInteger(price) || price < 1 || price > MAX) {
      return { error: 'O preço deve ser um número inteiro a partir de 1' };
    }
    data.price = price;
  }

  if (!partial || has('currencyId')) {
    if (typeof body.currencyId !== 'string' || !body.currencyId) {
      return { error: 'Escolha a moeda do item' };
    }
    const currency = await prisma.currency.findFirst({
      where: { id: body.currencyId, guildId },
    });
    if (!currency) return { error: 'Moeda não encontrada neste servidor' };
    data.currencyId = body.currencyId;
  }

  if (!partial || has('roleId')) {
    if (!isSnowflake(body.roleId)) return { error: 'Escolha o cargo que o item entrega' };
    data.roleId = body.roleId;
  }

  if (has('durationDays')) {
    const v = body.durationDays;
    if (v === null || v === '' || v === 0) {
      data.durationDays = null; // permanente
    } else {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 3650) {
        return { error: 'A duração deve ser de 1 a 3650 dias (ou vazio para permanente)' };
      }
      data.durationDays = n;
    }
  }

  if (has('stock')) {
    const v = body.stock;
    if (v === null || v === '') {
      data.stock = null; // ilimitado
    } else {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 1_000_000) {
        return { error: 'O estoque deve ser um número de 0 a 1.000.000 (ou vazio para ilimitado)' };
      }
      data.stock = n;
    }
  }

  if (has('enabled')) {
    if (typeof body.enabled !== 'boolean') return { error: 'enabled deve ser verdadeiro/falso' };
    data.enabled = body.enabled;
  }

  return { data };
}
