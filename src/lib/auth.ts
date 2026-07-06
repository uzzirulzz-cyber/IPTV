/**
 * Lightweight session-based auth for Playbeat Digital.
 * Uses HTTP-only cookies to store a session token.
 * Sessions are persisted in the AdminSession collection for admin,
 * and a simple signed JWT-like token for regular users.
 */

import { cookies } from 'next/headers'
import { db } from './db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const USER_COOKIE = 'pb_user'
const ADMIN_COOKIE = 'pb_admin'
const SESSION_DAYS = 30

function signToken(payload: string): string {
  const secret = process.env.ADMIN_PASSWORD || 'playbeat-fallback-secret'
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${hmac}`
}

function verifyToken(token: string): string | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || 'playbeat-fallback-secret').update(payload).digest('hex')
  if (sig !== expected) return null
  return payload
}

function encodeUserToken(userId: string, email: string): string {
  return signToken(`${userId}:${email}`)
}

function decodeUserToken(token: string): { userId: string; email: string } | null {
  const payload = verifyToken(token)
  if (!payload) return null
  const [userId, email] = payload.split(':')
  if (!userId || !email) return null
  return { userId, email }
}

async function setCookie(name: string, value: string, maxAgeDays: number = SESSION_DAYS) {
  const store = await cookies()
  store.set(name, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeDays * 24 * 60 * 60,
  })
}

async function deleteCookie(name: string) {
  const store = await cookies()
  store.delete(name)
}

async function getCookie(name: string): Promise<string | undefined> {
  const store = await cookies()
  return store.get(name)?.value
}

// ---------- User auth ----------

export async function signInUser(email: string, name?: string) {
  // Upsert user by email
  const user = await db.user.upsert({
    where: { email },
    update: name ? { name } : {},
    create: { email, name: name || email.split('@')[0] },
  })
  const token = encodeUserToken(user.id, user.email)
  await setCookie(USER_COOKIE, token)
  return user
}

export async function signOutUser() {
  await deleteCookie(USER_COOKIE)
}

export async function getCurrentUser() {
  const token = await getCookie(USER_COOKIE)
  if (!token) return null
  const decoded = decodeUserToken(token)
  if (!decoded) return null
  const user = await db.user.findUnique({ where: { id: decoded.userId } })
  if (!user || user.email !== decoded.email) return null
  return user
}

// ---------- Admin auth ----------

export async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL || 'founder@playbeat.live'
  const adminPassword = process.env.ADMIN_PASSWORD || 'playbeat123'
  if (email.toLowerCase() !== adminEmail.toLowerCase()) return false
  // Use timing-safe comparison
  try {
    const hash = bcrypt.hashSync(adminPassword, 10)
    return bcrypt.compareSync(password, hash)
  } catch {
    return password === adminPassword
  }
}

export async function signInAdmin(email: string, password: string): Promise<boolean> {
  const ok = await verifyAdminCredentials(email, password)
  if (!ok) return false
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.adminSession.create({
    data: { token, email, expiresAt },
  })
  await setCookie(ADMIN_COOKIE, token, SESSION_DAYS)
  return true
}

export async function signOutAdmin() {
  const token = await getCookie(ADMIN_COOKIE)
  if (token) {
    await db.adminSession.deleteMany({ where: { token } }).catch(() => {})
  }
  await deleteCookie(ADMIN_COOKIE)
}

export async function getCurrentAdmin() {
  const token = await getCookie(ADMIN_COOKIE)
  if (!token) return null
  const session = await db.adminSession.findUnique({ where: { token } })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.adminSession.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return session
}

// ---------- Cleanup ----------

export async function pruneExpiredSessions() {
  try {
    await db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  } catch {
    // ignore
  }
}
