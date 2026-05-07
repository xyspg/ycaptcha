import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "./_components/email-layout";

export type VerificationEmailMessages = {
  preview: string;
  heading: string;
  greeting: string;
  body: string;
  button: string;
  fallbackHint: string;
  expiresNote: string;
  ignoreNote: string;
  footer: string;
};

type VerificationEmailProps = {
  userName: string;
  url: string;
  logoUrl: string;
  messages: VerificationEmailMessages;
};

const previewSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export function VerificationEmail({
  userName,
  url,
  logoUrl,
  messages,
}: VerificationEmailProps) {
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
          href={url}
          className="inline-block rounded-lg bg-[#0a0a0a] px-6 py-3 text-sm font-medium text-white no-underline"
        >
          {messages.button}
        </Button>
      </Section>
      <Text className="m-0 mb-2 text-xs leading-5 text-[#737373]">
        {messages.fallbackHint}
      </Text>
      <Link
        href={url}
        className="m-0 block break-all text-xs leading-5 text-[#737373] underline"
      >
        {url}
      </Link>
      <Text className="m-0 mt-6 text-xs leading-5 text-[#737373]">
        {messages.expiresNote}
      </Text>
      <Text className="m-0 mt-2 text-xs leading-5 text-[#737373]">
        {messages.ignoreNote}
      </Text>
    </EmailLayout>
  );
}

VerificationEmail.PreviewProps = {
  userName: "Alex",
  url: `${previewSiteUrl}/api/auth/verify-email?token=preview-token`,
  logoUrl: `${previewSiteUrl}/ycaptcha.webp`,
  messages: {
    preview: "Confirm your email to finish setting up yCAPTCHA",
    heading: "Verify your email",
    greeting: "Hi {name},",
    body: "Welcome to yCAPTCHA. Click the button below to confirm your email address and activate your account.",
    button: "Verify email",
    fallbackHint: "If the button doesn't work, copy and paste this link:",
    expiresNote: "This link expires in 24 hours.",
    ignoreNote:
      "If you didn't create an account, you can safely ignore this email.",
    footer: "© yCAPTCHA",
  },
} satisfies VerificationEmailProps;

export default VerificationEmail;
