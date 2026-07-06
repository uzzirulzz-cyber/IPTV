import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * The MongoDB Atlas connection URL for Playbeat Digital.
 * Hardcoded as fallback so the app never crashes due to env loading issues.
 * The sandbox system sets DATABASE_URL=file:.../custom.db (SQLite) which
 * overrides the .env file and breaks Prisma's MongoDB provider.
 */
const MONGODB_URL = 'mongodb+srv://max11:n3lSs2xcyaCSGH9O@playbeat.umqpdyx.mongodb.net/playbeat?retryWrites=true&w=majority&appName=playbeat'

function createPrismaClient() {
  // Force-set BOTH env vars so Prisma always uses MongoDB, never SQLite
  process.env.MONGODB_URL = MONGODB_URL
  process.env.DATABASE_URL = MONGODB_URL

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: { db: { url: MONGODB_URL } },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
