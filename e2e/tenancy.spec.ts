import type { Page } from '@playwright/test'
import { expect, randomAddress, signUp, test } from './fixtures'

// Every page and action works in the session's active organization (see
// src/lib/session.ts). The auth API's organization endpoints take an
// organization id from the request, so they must refuse one the user isn't
// a member of, and the active organization must not be settable directly.
test('users can’t switch into or change another business', async ({
  page,
  browser,
  baseURL,
}) => {
  const owner = page
  await signUp(owner, 'Owner')
  const organizationId = await activeOrganization(owner)

  // A second user in a separate browser context, with its own address for
  // the rate limiter (see fixtures.ts).
  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': randomAddress() },
  })
  const other = await context.newPage()
  const otherEmail = await signUp(other, 'Other')

  const post = (path: string, data: object) => () =>
    other.request.post(`/api/auth${path}`, {
      data,
      headers: { origin: baseURL! },
    })
  const get = (path: string) => () =>
    other.request.get(`/api/auth${path}`, { params: { organizationId } })
  const attempts = {
    'switch to it': post('/organization/set-active', { organizationId }),
    'set it on the session': post('/update-session', {
      activeOrganizationId: organizationId,
    }),
    'read it': get('/organization/get-full-organization'),
    'list its members': get('/organization/list-members'),
    'rename it': post('/organization/update', {
      organizationId,
      data: { name: 'Taken over' },
    }),
    'invite themselves': post('/organization/invite-member', {
      organizationId,
      email: otherEmail,
      role: 'owner',
    }),
    'delete it': post('/organization/delete', { organizationId }),
  }
  for (const [attempt, request] of Object.entries(attempts)) {
    const response = await request()
    expect(response.status(), attempt).toBeGreaterThanOrEqual(400)
    expect(response.status(), attempt).toBeLessThan(500)
  }

  // Better Auth clears the active organization when asked about one the
  // user doesn't belong to. They carry on in their own.
  const session = await other.request.get('/api/auth/get-session')
  expect((await session.json()).session.activeOrganizationId).not.toBe(
    organizationId,
  )
  await other.goto('/settings/business')
  await expect(other).toHaveURL('/settings/business')
  await expect(other.getByLabel('Business name')).toHaveValue('Other')
  await other.goto('/clients')
  await expect(other.getByText('No clients yet')).toBeVisible()

  // The owner's business is untouched.
  const business = await owner.request.get(
    '/api/auth/organization/get-full-organization',
  )
  expect(await business.json()).toMatchObject({
    id: organizationId,
    name: 'Owner',
    members: [expect.objectContaining({ role: 'owner' })],
    invitations: [],
  })
  await context.close()
})

async function activeOrganization(page: Page) {
  const response = await page.request.get('/api/auth/get-session')
  const { session } = await response.json()
  expect(session.activeOrganizationId).toEqual(expect.any(String))
  return session.activeOrganizationId as string
}
