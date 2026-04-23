import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "./_components/email-layout";

export type ResetPasswordEmailMessages = {
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

type ResetPasswordEmailProps = {
  userName: string;
  resetUrl: string;
  logoUrl: string;
  messages: ResetPasswordEmailMessages;
};

const previewSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export function ResetPasswordEmail({
  userName,
  resetUrl,
  logoUrl,
  messages,
}: ResetPasswordEmailProps) {
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
          href={resetUrl}
          className="inline-block rounded-lg bg-[#0a0a0a] px-6 py-3 text-sm font-medium text-white no-underline"
        >
          {messages.button}
        </Button>
      </Section>
      <Text className="m-0 mb-2 text-xs leading-5 text-[#737373]">
        {messages.fallbackHint}
      </Text>
      <Link
        href={resetUrl}
        className="m-0 block break-all text-xs leading-5 text-[#737373] underline"
      >
        {resetUrl}
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

ResetPasswordEmail.PreviewProps = {
  userName: "Alex",
  resetUrl: `${previewSiteUrl}/reset-password?token=preview-token`,
  logoUrl: `${previewSiteUrl}/ycaptcha.webp`,
  messages: {
    preview: "Reset your yCAPTCHA password",
    heading: "Reset your password",
    greeting: "Hi {name},",
    body: "We received a request to reset your yCAPTCHA password. Click the button below to choose a new one.",
    button: "Reset password",
    fallbackHint:
      "If the button doesn't work, copy and paste this link into your browser:",
    expiresNote: "This link expires in 1 hour.",
    ignoreNote:
      "If you didn't request a password reset, you can safely ignore this email.",
    footer: "© yCAPTCHA",
  },
} satisfies ResetPasswordEmailProps;

export default ResetPasswordEmail;
