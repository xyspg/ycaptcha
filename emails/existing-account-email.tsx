import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "./_components/email-layout";

export type ExistingAccountEmailMessages = {
  preview: string;
  heading: string;
  greeting: string;
  body: string;
  button: string;
  fallbackHint: string;
  ignoreNote: string;
  footer: string;
};

type ExistingAccountEmailProps = {
  userName: string;
  loginUrl: string;
  logoUrl: string;
  messages: ExistingAccountEmailMessages;
};

const previewSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export function ExistingAccountEmail({
  userName,
  loginUrl,
  logoUrl,
  messages,
}: ExistingAccountEmailProps) {
  return (
    <EmailLayout
      preview={messages.preview}
      logoUrl={logoUrl}
      footer={messages.footer}
    >
      <Heading className="m-0 mb-4 text-2xl font-semibold tracking-tight text-[#0a0a0a]">
        {messages.heading}
      </Heading>
      <Text className="m-0 mb-2 text-base leading-6 text-[#0a0a0a]">
        {messages.greeting.replace("{name}", userName)}
      </Text>
      <Text className="m-0 mb-6 text-sm leading-6 text-[#525252]">
        {messages.body}
      </Text>
      <Section className="mb-6">
        <Button
          href={loginUrl}
          className="inline-block rounded-lg bg-[#0a0a0a] px-6 py-3 text-sm font-medium text-white no-underline"
        >
          {messages.button}
        </Button>
      </Section>
      <Text className="m-0 mb-2 text-xs leading-5 text-[#737373]">
        {messages.fallbackHint}
      </Text>
      <Link
        href={loginUrl}
        className="m-0 block break-all text-xs leading-5 text-[#737373] underline"
      >
        {loginUrl}
      </Link>
      <Text className="m-0 mt-6 text-xs leading-5 text-[#737373]">
        {messages.ignoreNote}
      </Text>
    </EmailLayout>
  );
}

ExistingAccountEmail.PreviewProps = {
  userName: "Alex",
  loginUrl: `${previewSiteUrl}/api/auth/magic-link/verify?token=preview-token&callbackURL=%2Fdashboard`,
  logoUrl: `${previewSiteUrl}/ycaptcha.webp`,
  messages: {
    preview: "You already have a yCAPTCHA account — one-click sign in",
    heading: "You already have an account",
    greeting: "Hi {name},",
    body: "Someone just tried to create a new yCAPTCHA account with your email. You already have one, so no new account was created. Click below to sign in instantly — no password needed. This link expires in 15 minutes.",
    button: "Sign in instantly",
    fallbackHint: "If the button doesn't work, copy this link:",
    ignoreNote:
      "If this wasn't you, you can safely ignore this email — the link will expire on its own. Your account is secure.",
    footer: "© yCAPTCHA",
  },
} satisfies ExistingAccountEmailProps;

export default ExistingAccountEmail;
