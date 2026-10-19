import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

// Browser-side auth. Calls go to /api/auth on the current origin.
export const authClient = createAuthClient({
  plugins: [organizationClient()],
})
