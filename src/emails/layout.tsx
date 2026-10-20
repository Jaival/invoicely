import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

// Shared shell for Invoicely's account emails: one heading, a short
// explanation, one button, and the link spelled out for clients that
// block buttons.

type ActionEmailProps = {
  preview: string
  heading: string
  intro: string
  action: { label: string; url: string }
  footnote: string
}

const primary = '#009966'

export function ActionEmail({
  preview,
  heading,
  intro,
  action,
  footnote,
}: ActionEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={brand}>Invoicely</Text>
          <Heading style={title}>{heading}</Heading>
          <Text style={paragraph}>{intro}</Text>
          <Section style={{ margin: '24px 0' }}>
            <Button href={action.url} style={button}>
              {action.label}
            </Button>
          </Section>
          <Text style={muted}>
            Or paste this link into your browser:
            <br />
            {action.url}
          </Text>
          <Hr style={{ borderColor: '#e5e5e5', margin: '24px 0' }} />
          <Text style={muted}>{footnote}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#f5f5f5',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '32px 0',
}
const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e5e5',
  maxWidth: '480px',
  padding: '32px',
}
const brand = { fontSize: '18px', fontWeight: 700, margin: '0 0 24px' }
const title = { fontSize: '22px', fontWeight: 600, margin: '0 0 12px' }
const paragraph = { fontSize: '15px', lineHeight: '24px', color: '#262626' }
const muted = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#737373',
  wordBreak: 'break-all' as const,
}
const button = {
  backgroundColor: primary,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  padding: '12px 20px',
  textDecoration: 'none',
}
