import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.MONGODB_URL || process.env.DATABASE_URL
  if (!url) {
    console.warn('No MONGODB_URL or DATABASE_URL set; Prisma will fail to connect.')
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: url ? { db: { url } } : undefined,
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
