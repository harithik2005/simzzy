/**
 * Idempotent SUPER_ADMIN seeder.
 *
 * Credentials are read from environment variables (never hardcoded):
 *   SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD
 *
 * Run (from simzzy-backend):
 *   SUPERADMIN_NAME="..." SUPERADMIN_EMAIL="..." SUPERADMIN_PASSWORD="..." npm run seed:superadmin
 *
 * Re-running with the same email updates that user (upsert) — no duplicates.
 */
import bcrypt from 'bcryptjs'
import { PrismaClient, Role, UserStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const name = process.env.SUPERADMIN_NAME?.trim()
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SUPERADMIN_PASSWORD

  if (!name || !email || !password) {
    console.error(
      '❌ Missing credentials. Set SUPERADMIN_NAME, SUPERADMIN_EMAIL, and SUPERADMIN_PASSWORD.',
    )
    process.exit(1)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('❌ SUPERADMIN_EMAIL is not a valid email address.')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('❌ SUPERADMIN_PASSWORD must be at least 8 characters.')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE },
    create: { name, email, passwordHash, role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE },
    select: { id: true, name: true, email: true, role: true, status: true },
  })

  console.log('✅ SUPER_ADMIN ready (password hash never logged):')
  console.table(user)
}

main()
  .catch((e) => {
    console.error('❌ Super-admin seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
