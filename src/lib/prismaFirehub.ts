/**
 * Prisma Client para o banco FireHub (firehub_db)
 * Usado para ler pedidos de insumos feitos no módulo Icebox/Compras do FireHub
 */
import { PrismaClient } from '@prisma/client'

const globalForPrismaFirehub = globalThis as unknown as {
  prismaFirehub: PrismaClient | undefined
}

if (!process.env.FIREHUB_DATABASE_URL) {
  console.warn('[prismaFirehub] FIREHUB_DATABASE_URL not set — falling back to DATABASE_URL')
}

export const prismaFirehub = globalForPrismaFirehub.prismaFirehub ?? new PrismaClient({
  datasourceUrl: process.env.FIREHUB_DATABASE_URL || process.env.DATABASE_URL,
})

if (process.env.NODE_ENV !== 'production') globalForPrismaFirehub.prismaFirehub = prismaFirehub
