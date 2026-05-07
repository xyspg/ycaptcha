import {
  ExistingAccountEmail,
  type ExistingAccountEmailMessages,
} from "../../emails/existing-account-email";
import { env } from "../../env";
import type { Locale } from "../../i18n/config";
import enMessages from "../../messages/en.json";
import jaMessages from "../../messages/ja.json";
import zhCNMessages from "../../messages/zh-CN.json";
import { config } from "../config";
import { getLocaleFromRequest } from "./locale";
import { isPlaceholderEmail } from "./placeholder-domain";
import { resend } from "./resend";
import { checkVerificationEmailLimit } from "./verification-rate-limit";

const messagesByLocale: Record<Locale, typeof enMessages> = {
  en: enMessages,
  "zh-CN": zhCNMessages,
  ja: jaMessages,
};

type SendExistingAccountEmailInput = {
  user: { email: string; name?: string };
  loginUrl: string;
  request: Request | undefined;
};

export async function sendExistingAccountEmail({
  user,
  loginUrl,
  request,
}: SendExistingAccountEmailInput) {
  if (isPlaceholderEmail(user.email)) {
    console.warn(
      `[send-existing-account-email] skipping placeholder recipient: ${user.email}`,
    );
    return;
  }

  const limit = await checkVerificationEmailLimit(user.email);
  if (!limit.ok) return;

  const locale = getLocaleFromRequest(request);
  const messages = messagesByLocale[locale].email.existingAccount as
    | (ExistingAccountEmailMessages & { subject: string })
    | undefined;
  if (!messages) return;

  const logoUrl = config.getSiteUrl("/ycaptcha.webp");

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: user.email,
    subject: messages.subject,
    react: ExistingAccountEmail({
      userName: user.name ?? user.email,
      loginUrl,
      logoUrl,
      messages,
    }),
  });
}
