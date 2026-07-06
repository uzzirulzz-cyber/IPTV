import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Resolve the MongoDB connection URL.
 *
 * The sandbox system sets DATABASE_URL=file:.../custom.db (SQLite) which
 * overrides the .env file. We need a MongoDB URL for Prisma's mongodb
 * provider, so we check multiple sources and use the first valid one.
 */
function getMongoUrl(): string {
  // 1. MONGODB_URL env var (set in .env, not overridden by system)
  const mongoUrl = process.env.MONGODB_URL
  if (mongoUrl && mongoUrl.startsWith('mongodb')) return mongoUrl

  // 2. DATABASE_URL if it's a MongoDB URL (not the SQLite override)
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl && dbUrl.startsWith('mongodb')) return dbUrl

  // 3. Fallback to the Playbeat MongoDB Atlas cluster
  //    (same as .env — kept here as a last-resort so the app never crashes
  //    due to env loading order issues)
  return 'mongodb+srv://max11:n3lSs2xcyaCSGH9O@playbeat.umqpdyx.mongodb.net/playbeat?retryWrites=true&w=majority&appName=playbeat'
}

function createPrismaClient() {
  const url = getMongoUrl()

  // Set the env var so Prisma's internal env loader also finds it
  // (Prisma reads env("MONGODB_URL") at query time, not just at init)
  if (!process.env.MONGODB_URL) {
    process.env.MONGODB_URL = url
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: { db: { url } },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
