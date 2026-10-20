import { ActionEmail } from './layout'

export function ResetPasswordEmail({
  name,
  url,
}: {
  name: string
  url: string
}) {
  return (
    <ActionEmail
      preview="Reset your Invoicely password"
      heading="Reset your password"
      intro={`Hi ${name}, we received a request to reset your Invoicely password. The link expires in one hour.`}
      action={{ label: 'Choose a new password', url }}
      footnote="If you didn't ask for this, you can ignore this email. Your password won't change."
    />
  )
}
