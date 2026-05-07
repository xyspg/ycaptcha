import {
  ResetPasswordEmail,
  type ResetPasswordEmailMessages,
} from "../../emails/reset-password-email";
import { env } from "../../env";
import type { Locale } from "../../i18n/config";
import enMessages from "../../messages/en.json";
import jaMessages from "../../messages/ja.json";
import zhCNMessages from "../../messages/zh-CN.json";
import { config } from "../config";
import { getLocaleFromRequest } from "./locale";
import { isPlaceholderEmail } from "./placeholder-domain";
import { resend } from "./resend";

const messagesByLocale: Record<Locale, typeof enMessages> = {
  en: enMessages,
  "zh-CN": zhCNMessages,
  ja: jaMessages,
};

type SendResetPasswordEmailInput = {
  user: { email: string; name?: string };
  url: string;
  request: Request | undefined;
};

export async function sendResetPasswordEmail({
  user,
  url,
  request,
}: SendResetPasswordEmailInput) {
  if (isPlaceholderEmail(user.email)) {
    console.warn(
      `[send-reset-password-email] skipping placeholder recipient: ${user.email}`,
    );
    return;
  }

  const locale = getLocaleFromRequest(request);
  const messages = messagesByLocale[locale].email.resetPassword as
    | (ResetPasswordEmailMessages & { subject: string })
    | undefined;
  if (!messages) return;

  const logoUrl = config.getSiteUrl("/ycaptcha.webp");

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: user.email,
    subject: messages.subject,
    react: ResetPasswordEmail({
      userName: user.name ?? user.email,
      resetUrl: url,
      logoUrl,
      messages,
    }),
  });
}
