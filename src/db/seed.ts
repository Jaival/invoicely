// Seeds a demo user with an organization and business profile.
// Run with `bun run db:seed`. Safe to run more than once.
import { hashPassword } from 'better-auth/crypto'
import { eq } from 'drizzle-orm'

import { db } from '.'
import { account, businessProfile, member, organization, user } from './schema'

if (process.env.VERCEL_ENV === 'production') {
  throw new Error('Refusing to seed the production database')
}

const demo = {
  name: 'Demo User',
  email: 'demo@invoicely.dev',
  password: 'demo-password-123',
}

const existing = await db.query.user.findFirst({
  where: eq(user.email, demo.email),
})

if (existing) {
  console.log(`Seed skipped: ${demo.email} already exists`)
} else {
  await db.transaction(async (tx) => {
    const [demoUser] = await tx
      .insert(user)
      .values({ name: demo.name, email: demo.email, emailVerified: true })
      .returning()

    await tx.insert(account).values({
      userId: demoUser.id,
      accountId: demoUser.id,
      providerId: 'credential',
      password: await hashPassword(demo.password),
    })

    const [org] = await tx
      .insert(organization)
      .values({
        name: 'Demo Studio',
        slug: 'demo-studio',
        createdAt: new Date(),
      })
      .returning()

    await tx.insert(member).values({
      organizationId: org.id,
      userId: demoUser.id,
      role: 'owner',
      createdAt: new Date(),
    })

    await tx.insert(businessProfile).values({
      organizationId: org.id,
      name: 'Demo Studio',
      email: demo.email,
      city: 'Berlin',
      country: 'DE',
      defaultCurrency: 'EUR',
    })
  })
  console.log(`Seeded ${demo.email} / ${demo.password}`)
}

await db.$client.end()
