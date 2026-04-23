import {
  VerificationEmail,
  type VerificationEmailMessages,
} from "@/emails/verification-email";
import type { Locale } from "@/i18n/config";
import { config } from "@/lib/config";
import { env } from "@/lib/env";
import enMessages from "@/messages/en.json";
import jaMessages from "@/messages/ja.json";
import zhCNMessages from "@/messages/zh-CN.json";
import { getLocaleFromRequest } from "./locale";
import { isPlaceholderEmail } from "./placeholder-domain";
import { resend } from "./resend";
import { checkVerificationEmailLimit } from "./verification-rate-limit";

const messagesByLocale: Record<Locale, typeof enMessages> = {
  en: enMessages,
  "zh-CN": zhCNMessages,
  ja: jaMessages,
};

type SendVerificationEmailInput = {
  user: { email: string; name?: string };
  url: string;
  request: Request | undefined;
};

export async function sendVerificationEmail({
  user,
  url,
  request,
}: SendVerificationEmailInput) {
  if (isPlaceholderEmail(user.email)) {
    console.warn(
      `[send-verification-email] skipping placeholder recipient: ${user.email}`,
    );
    return;
  }

  const limit = await checkVerificationEmailLimit(user.email);
  if (!limit.ok) return;

  const locale = getLocaleFromRequest(request);
  const messages = messagesByLocale[locale].email
    .verification as VerificationEmailMessages & { subject: string };

  const logoUrl = config.getSiteUrl("/ycaptcha.webp");

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: user.email,
    subject: messages.subject,
    react: VerificationEmail({
      userName: user.name ?? user.email,
      url,
      logoUrl,
      messages,
    }),
  });
}
