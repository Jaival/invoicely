import { ActionEmail } from './layout'

export function VerifyEmail({ name, url }: { name: string; url: string }) {
  return (
    <ActionEmail
      preview="Confirm your email to start using Invoicely"
      heading="Confirm your email"
      intro={`Hi ${name}, confirm this is your email address to finish setting up your Invoicely account.`}
      action={{ label: 'Confirm email', url }}
      footnote="If you didn't create an Invoicely account, you can ignore this email."
    />
  )
}
