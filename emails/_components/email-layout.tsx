import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

type EmailLayoutProps = {
  preview: string;
  logoUrl: string;
  footer: string;
  children: ReactNode;
};

export function EmailLayout({
  preview,
  logoUrl,
  footer,
  children,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-[#f6f7f9] font-sans text-[#0a0a0a] m-0 p-0">
          <Container className="mx-auto my-10 w-full max-w-[520px] rounded-2xl bg-white px-8 py-10 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <Section className="mb-8">
              <Img
                src={logoUrl}
                alt="yCAPTCHA"
                width="132"
                height="40"
                className="h-10 w-auto"
              />
            </Section>
            {children}
            <Hr className="my-8 border-[#e5e7eb]" />
            <Text className="m-0 text-xs leading-5 text-[#737373]">
              {footer}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
