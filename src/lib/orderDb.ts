/**
 * Resolve em qual banco (Hakim ou FireHub) um pedido está.
 *
 * O banco do FireHub não tem todas as colunas do schema do Hakim
 * (deliveryDate, cancelReason, emergencyStatus, emergencyFine, isEmergency,
 * rejectionReason, e vários campos de User). Por isso qualquer consulta no
 * FireHub precisa usar `select` explícito — um `include` completo gera um
 * SELECT com colunas inexistentes e quebra em runtime.
 */
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { prismaFirehub } from "@/lib/prismaFirehub";

/** Colunas de Order que existem nos DOIS bancos. */
export const FIREHUB_ORDER_SELECT = {
  id: true,
  userId: true,
  totalAmount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  boletoUrl: true,
  asaasPaymentId: true,
  user: { select: { id: true, name: true, email: true, city: true, storeName: true, cpfCnpj: true } },
  items: { select: { id: true, orderId: true, productId: true, quantity: true, price: true, product: true } },
} as const;

/** Defaults para as colunas que só existem no banco do Hakim. */
const FIREHUB_DEFAULTS = {
  deliveryDate: null,
  cancelReason: null,
  emergencyStatus: null,
  emergencyFine: 0,
  isEmergency: false,
  rejectionReason: null,
};

export type ResolvedOrder = {
  order: any;
  client: PrismaClient;
  source: "hakim" | "firehub";
};

/**
 * Procura o pedido nos dois bancos e devolve o pedido junto com o client
 * correto para gravar nele. Retorna null se não existir em nenhum.
 */
export async function findOrderInAnyDb(orderId: string): Promise<ResolvedOrder | null> {
  const hakimOrder = await prisma.order
    .findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, user: true },
    })
    .catch((err) => {
      console.error("[orderDb] Erro banco Hakim:", err);
      return null;
    });

  if (hakimOrder) {
    return { order: hakimOrder, client: prisma as PrismaClient, source: "hakim" };
  }

  const firehubOrder = await prismaFirehub.order
    .findUnique({ where: { id: orderId }, select: FIREHUB_ORDER_SELECT })
    .catch((err) => {
      console.error("[orderDb] Erro banco FireHub:", err);
      return null;
    });

  if (firehubOrder) {
    return {
      order: { ...FIREHUB_DEFAULTS, ...firehubOrder },
      client: prismaFirehub as PrismaClient,
      source: "firehub",
    };
  }

  return null;
}
