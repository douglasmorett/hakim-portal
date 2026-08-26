/**
 * Resolve em qual banco (Hakim ou FireHub) um pedido está.
 *
 * Os pedidos ficam em dois bancos: os feitos pelo portal no do Hakim
 * (DATABASE_URL) e os feitos pelo FireHub no dele (FIREHUB_DATABASE_URL).
 * Toda ação sobre um pedido precisa descobrir de qual banco ele veio antes
 * de gravar.
 *
 * Em 25/08/2026 o FireHub estava sem a coluna Order.emergencyFine, e isso
 * quebrava qualquer query que trouxesse todas as colunas de Order. A coluna
 * foi criada e os schemas hoje batem, mas os `select` explícitos abaixo
 * ficam como defesa: se os bancos divergirem de novo, a query continua de pé.
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

export type ResolvedOrderClient = {
  client: PrismaClient;
  source: "hakim" | "firehub";
  status: string;
};

/**
 * Versão leve do `findOrderInAnyDb`: descobre em qual banco o pedido está
 * lendo só id e status. Use quando não precisar dos itens nem do usuário.
 */
export async function resolveOrderClient(orderId: string): Promise<ResolvedOrderClient | null> {
  const noHakim = await prisma.order
    .findUnique({ where: { id: orderId }, select: { id: true, status: true } })
    .catch((err) => {
      console.error("[orderDb] Erro banco Hakim:", err);
      return null;
    });

  if (noHakim) {
    return { client: prisma as PrismaClient, source: "hakim", status: noHakim.status };
  }

  const noFirehub = await prismaFirehub.order
    .findUnique({ where: { id: orderId }, select: { id: true, status: true } })
    .catch((err) => {
      console.error("[orderDb] Erro banco FireHub:", err);
      return null;
    });

  if (noFirehub) {
    return { client: prismaFirehub as PrismaClient, source: "firehub", status: noFirehub.status };
  }

  return null;
}

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
