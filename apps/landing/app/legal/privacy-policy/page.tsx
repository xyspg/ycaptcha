import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { Section as BaseSection } from "../section";

function Section(props: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return <BaseSection size="xl" {...props} />;
}

export const metadata: Metadata = {
  title: "Privacy Policy · yCAPTCHA",
  description:
    "How yCAPTCHA collects, uses, discloses, and retains personal information when you use the Sites and Services.",
};

const LAST_UPDATED = "April 18, 2026";
const EFFECTIVE_DATE = "April 18, 2026";
const CONTACT_EMAIL = "ycaptcha@xyspg.moe";

export default function PrivacyPolicyPage() {
  return (
    <article className="flex flex-col gap-8 text-[15px] leading-relaxed text-foreground/90">
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Privacy Policy
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight lg:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated {LAST_UPDATED} · Effective {EFFECTIVE_DATE}
        </p>
      </header>

      <TableOfContents />

      <Section id="about" title="About yCAPTCHA">
        <p>
          yCAPTCHA is a customizable image-based CAPTCHA platform. Site owners
          create image-selection puzzles from their own image sets and embed a
          widget on their websites to protect forms and endpoints from automated
          abuse. This Privacy Policy (&ldquo;Notice&rdquo;) describes how we
          collect, use, disclose, retain, and secure personal information in
          connection with the Sites and Services.
        </p>
        <p>
          In this Notice, &ldquo;Customer&rdquo; refers to an account holder who
          uses yCAPTCHA to protect their website, and &ldquo;End User&rdquo;
          refers to a visitor of a Customer&rsquo;s site who interacts with an
          embedded CAPTCHA challenge. &ldquo;We,&rdquo; &ldquo;us,&rdquo; and
          &ldquo;our&rdquo; mean yCAPTCHA.
        </p>
        <p>
          By using or accessing the Sites and Services in any manner, you accept
          the practices and policies outlined in this Notice and you acknowledge
          that we may process and share your information as described here.
        </p>
      </Section>

      <Section id="applicability" title="Applicability">
        <p>This Notice explains our practices when you:</p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            Visit yCAPTCHA&rsquo;s websites, including {config.siteHostname} and
            related subdomains (collectively, our &ldquo;Sites&rdquo;);
          </li>
          <li>
            Access or use products or services made available by yCAPTCHA,
            including the dashboard, API, public Gallery, and embeddable widget
            (collectively, the &ldquo;Services&rdquo;); and
          </li>
          <li>Interact with us in any other way.</li>
        </ul>
        <p>
          Under this Notice, yCAPTCHA acts as a data controller (or equivalent
          &ldquo;business&rdquo;) for personal information we process about
          Customers, visitors to our Sites, and people who contact us.
        </p>
        <p>
          This Notice does <strong>not</strong> apply to:
        </p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            Information we process on behalf of a Customer as their data
            processor — for example, End User IP addresses and image selections
            processed during a CAPTCHA challenge on the Customer&rsquo;s site.
            In those cases the Customer is the data controller, and the
            Customer&rsquo;s own privacy policy governs how the End User&rsquo;s
            personal information is collected and used on their site. Customers
            are solely responsible for notifying their End Users of this
            processing and for complying with applicable laws. If your personal
            information is contained in Customer Content and you have questions
            about the Customer&rsquo;s settings or privacy practices, please
            contact the Customer directly or review their privacy notice.
          </li>
          <li>
            Third-party products, services, or websites that are accessible via
            or integrate with the Services. Review those third parties&rsquo;
            own privacy notices.
          </li>
        </ul>
      </Section>

      <Section id="info-we-collect" title="Information We Collect">
        <p>
          The information we collect depends on how you interact with us, the
          choices you make, the features you use, your location, and applicable
          law.
        </p>

        <h3 className="mt-3 font-heading text-base font-semibold tracking-tight">
          Information you provide directly to us
        </h3>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            <strong>Account information.</strong> When you create an account, we
            collect the information provided by your chosen authentication
            method: email and hashed password (email sign-up), OAuth profile
            returned by GitHub (GitHub sign-up), or a registered passkey
            credential (passkey sign-up). We never see or store passwords in
            plaintext. You may optionally provide a display name.
          </li>
          <li>
            <strong>Customer Content.</strong> Images you upload to your image
            sets (collectively, &ldquo;Customer Content&rdquo;). We store each
            image plus metadata such as filename, content hash, and the owning
            account.
          </li>
          <li>
            <strong>Site configuration.</strong> Site names, origins, generated
            site keys and secret keys, puzzle configurations, and associated
            image sets.
          </li>
          <li>
            <strong>Support communications.</strong> If you contact us for
            support, we collect the content of your message, attachments, and
            any account context you share.
          </li>
          <li>
            <strong>Anything else you voluntarily provide.</strong> For example,
            feedback you submit or content you publish to the Gallery.
          </li>
        </ul>

        <h3 className="mt-3 font-heading text-base font-semibold tracking-tight">
          Information we collect from Customers about End Users
        </h3>
        <p>
          When End Users interact with a CAPTCHA widget embedded on a
          Customer&rsquo;s site, we receive the following on the
          Customer&rsquo;s behalf:
        </p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            The End User&rsquo;s IP address (used for rate limiting and abuse
            prevention);
          </li>
          <li>
            The reported embedding origin of the Customer&rsquo;s site (advisory
            site-context metadata sent by the widget);
          </li>
          <li>
            Challenge-flow data such as the images selected, the generated
            challenge session token, and the timestamp of the interaction.
          </li>
        </ul>
        <p>
          This data is short-lived (challenge sessions expire after 5 minutes)
          and is processed to verify the CAPTCHA solution and protect Customers
          from automated abuse. Customers are responsible for disclosing this
          processing in their own privacy notices.
        </p>

        <h3 className="mt-3 font-heading text-base font-semibold tracking-tight">
          Information we collect automatically
        </h3>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            <strong>Usage information.</strong> Pages viewed, clicks, searches,
            browser type, request timestamps, referring and exit pages, and time
            spent on our Sites.
          </li>
          <li>
            <strong>Device information.</strong> Browser type and version,
            operating system, device type, screen size, language preferences,
            and similar technical identifiers reported by your browser.
          </li>
          <li>
            <strong>Service-generated information.</strong> Log files, server
            diagnostics, error traces, performance metrics, IP address, coarse
            location derived from IP (city/country only — we do not collect
            precise geolocation), and rate-limit counters.
          </li>
          <li>
            <strong>Telemetry.</strong> Anonymized or aggregated statistics
            about how the Sites and Services are used.
          </li>
          <li>
            <strong>Cookies and similar technologies.</strong> We set a single
            HTTP-only session cookie after sign-in to keep you authenticated. On
            the public marketing Sites, we may set a preference cookie to
            remember your theme and language. Our self-hosted analytics (Umami)
            uses a first-party identifier without cross-site tracking cookies.
            The embedded CAPTCHA widget does not set cookies on the
            Customer&rsquo;s site; challenge state is carried in a short-lived
            opaque token passed in memory.
          </li>
        </ul>
      </Section>

      <Section id="how-we-use" title="How We Use Information">
        <p>We use your information to:</p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            <strong>Operate the Services.</strong> Authenticate you, store and
            serve your image sets, generate and verify CAPTCHA tokens, maintain
            and upgrade the platform, and troubleshoot issues.
          </li>
          <li>
            <strong>Improve the product.</strong> Analyze usage trends and
            aggregated telemetry to improve functionality, reliability, and user
            experience.
          </li>
          <li>
            <strong>Provide support.</strong> Respond to your inquiries and
            resolve technical issues. We do not routinely view Customer Content;
            we only access it when necessary to resolve a support request you
            initiate, or as required for security, Service integrity, or legal
            purposes.
          </li>
          <li>
            <strong>Communicate service notices.</strong> Send transactional and
            administrative messages such as security alerts, account changes, or
            legal notices. We do not currently send marketing email. If that
            changes, we will honour opt-out requests.
          </li>
          <li>
            <strong>Protect the Services.</strong> Detect, investigate, prevent,
            and respond to fraud, abuse, unauthorized access, and other
            deceptive, malicious, or illegal activity.
          </li>
          <li>
            <strong>Comply with legal obligations.</strong> Respond to lawful
            requests and enforce our agreements and policies.
          </li>
          <li>
            <strong>Any other purpose you consent to.</strong>
          </li>
        </ul>
      </Section>

      <Section id="retention" title="How We Retain Information">
        <p>
          We retain your information for the minimum period necessary to fulfill
          the purposes described in this Notice, including to satisfy legal or
          contractual obligations, resolve disputes, and enforce our rights.
        </p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>Account data is retained while your account is active.</li>
          <li>
            Uploaded images are retained until you delete them, your image set,
            or your account.
          </li>
          <li>
            CAPTCHA challenge sessions and verified sessions auto-expire in our
            cache within 5 minutes of creation.
          </li>
          <li>
            Rate-limit counters expire within the window they measure against
            (typically seconds to minutes).
          </li>
          <li>
            Log data is retained for a short operational window sufficient for
            debugging and abuse investigation, then rotated out.
          </li>
        </ul>
        <p>
          When we no longer have a legitimate business need to process your
          information, we delete or anonymize it. Where deletion is not
          immediately possible (for example, encrypted backups), the information
          remains isolated until the backup cycles out.
        </p>
      </Section>

      <Section id="disclosure" title="How We Disclose Information">
        <p>
          We disclose information only as described below, on a need-to-know
          basis and under appropriate safeguards.
        </p>

        <h3 className="mt-3 font-heading text-base font-semibold tracking-tight">
          Sub-processors
        </h3>
        <p>
          We rely on the following third parties to operate the Services. Each
          sub-processor only receives the data it needs to perform its role.
        </p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            <strong>Neon</strong> — managed PostgreSQL hosting (accounts, sites,
            image set metadata, puzzle configurations).
          </li>
          <li>
            <strong>Cloudflare R2</strong> — object storage for uploaded images.
            The bucket is configured for public read at r2.ycaptcha.xyspg.moe.
          </li>
          <li>
            <strong>Upstash Redis</strong> — short-lived CAPTCHA session tokens
            and rate-limit counters.
          </li>
          <li>
            <strong>Vercel</strong> — application hosting, edge delivery, and
            platform-level logging.
          </li>
          <li>
            <strong>GitHub</strong> — OAuth identity provider when you choose to
            sign in with GitHub.
          </li>
          <li>
            <strong>Umami (self-hosted)</strong> — first-party web analytics on
            our public marketing Sites only (not loaded inside the embeddable
            CAPTCHA widget).
          </li>
        </ul>

        <h3 className="mt-3 font-heading text-base font-semibold tracking-tight">
          Corporate and legal transfers
        </h3>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            <strong>Corporate transactions.</strong> If yCAPTCHA is involved in
            a merger, acquisition, asset sale, financing, reorganization,
            bankruptcy, or similar transaction, your information may be part of
            the assets transferred. We will notify you of any such change by
            email or prominent notice.
          </li>
          <li>
            <strong>Legal and public authorities.</strong> We may disclose
            information when reasonably necessary to comply with applicable law,
            respond to a valid legal process, enforce our agreements and this
            Notice, protect the security or integrity of the Services, protect
            the rights, property, or safety of yCAPTCHA, our users, or others,
            or respond in good faith to an emergency involving risk of death or
            serious bodily injury.
          </li>
          <li>
            <strong>With your consent.</strong> We may disclose your information
            to third parties when you direct us to or otherwise consent.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal information, and we do{" "}
          <strong>not</strong> share it with advertising networks or data
          brokers. We may share aggregated or de-identified information that
          does not identify a specific individual.
        </p>
      </Section>

      <Section id="security" title="How We Secure Information">
        <p>
          We use reasonable administrative, technical, and physical safeguards
          to protect information against unauthorized access, use, modification,
          destruction, loss, or disclosure. Passwords are hashed using
          better-auth&rsquo;s default scrypt parameters. Traffic is served over
          HTTPS. Database, session, and storage credentials are held as
          environment secrets on our hosting platform and are never shipped to
          the browser.
        </p>
        <p>
          We require third parties acting on our behalf to provide security
          measures consistent with industry standards and with their contractual
          obligations. We are not responsible for the security practices of
          third parties outside of the information we receive from or disclose
          to them.
        </p>
        <p>
          No online service can guarantee absolute security. If you suspect a
          security issue, please report it to{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline underline-offset-4 hover:text-foreground"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          rather than disclosing it publicly.
        </p>
      </Section>

      <Section id="third-party" title="Third-Party Services">
        <p>
          Our Sites and Services may link to or integrate with third-party
          websites and applications that we do not operate or control
          (&ldquo;Third-Party Services&rdquo;). Third-Party Services have their
          own terms and privacy notices that are independent of this Notice. We
          are not responsible for the content, accuracy, or practices of
          Third-Party Services. We recommend reviewing their terms and privacy
          notices before use.
        </p>
      </Section>

      <Section id="gallery" title="Content You Publish to the Gallery">
        <p>
          Publishing an image set to the public Gallery makes those images and
          the associated puzzle configuration world-readable and redistributable
          to any other yCAPTCHA user. See the{" "}
          <Link
            href="/legal/acceptable-use-policy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Acceptable Use Policy
          </Link>{" "}
          for the licence you grant when publishing and for the content rules.
          Do not publish content that identifies private individuals or
          otherwise violates the policy.
        </p>
      </Section>

      <Section id="transfers" title="How We Transfer Information">
        <p>
          yCAPTCHA operates from and stores data in the United States, and our
          sub-processors may operate from other regions. By using the Sites and
          Services or providing information to us, you consent to the processing
          of your information in the United States and in the jurisdictions
          where our sub-processors operate. These jurisdictions may have data
          protection laws that differ from, and may not offer the same level of
          protection as, the laws of your country. Where required, we rely on
          standard contractual clauses or other lawful transfer mechanisms
          offered by our sub-processors.
        </p>
      </Section>

      <Section id="your-rights" title="Your Privacy Rights and Choices">
        <p>
          Your rights depend on your jurisdiction and applicable law. Below is a
          summary of rights that may be available to you.
        </p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            <strong>Access and portability.</strong> Request a copy of the
            personal information we hold about you in a portable format.
          </li>
          <li>
            <strong>Correction.</strong> Ask us to correct inaccurate or
            incomplete personal information. You can update most account fields
            directly in your dashboard.
          </li>
          <li>
            <strong>Deletion.</strong> Request deletion of your personal
            information. You can delete individual image sets from the
            dashboard. For full account deletion, email us from the address on
            your account; we will honour the request within 30 days. Gallery
            items you have already published remain visible until you request
            their removal separately.
          </li>
          <li>
            <strong>Withdraw consent.</strong> Where we process information
            based on consent, you can withdraw it at any time without affecting
            the lawfulness of processing before the withdrawal.
          </li>
          <li>
            <strong>Object or restrict.</strong> Where we process based on our
            legitimate interests, you may object to that processing or ask us to
            restrict it.
          </li>
          <li>
            <strong>Lodge a complaint.</strong> You have the right to file a
            complaint with your local data protection authority.
          </li>
        </ul>
        <p>
          To exercise a right, email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline underline-offset-4 hover:text-foreground"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          from the address associated with your account. We may need to verify
          your identity before acting on the request, and we may decline or
          limit a request where permitted by law (for example, to comply with a
          legal obligation or to protect the rights of another person).
        </p>

        <h3 className="mt-3 font-heading text-base font-semibold tracking-tight">
          United States
        </h3>
        <p>
          This section applies to individuals residing in the United States,
          including residents of states with comprehensive privacy laws (such as
          California, Colorado, Connecticut, Virginia, Utah, Texas, and others
          that enact similar laws, collectively &ldquo;US Data Privacy
          Laws&rdquo;).
        </p>
        <p>
          The categories of personal information we collect, as classified by US
          Data Privacy Laws, include: identifiers (name, email, IP address,
          account ID); internet or other electronic network activity information
          (browsing and usage data, device metadata, log files); geolocation
          information (coarse location derived from IP); commercial information
          (account records); and inferences drawn from the above. We describe
          how we use and disclose each category in the sections above.
        </p>
        <p>
          We do <strong>not</strong> sell personal information, and we do{" "}
          <strong>not</strong> share personal information for cross-context
          behavioural advertising, as those terms are defined under US Data
          Privacy Laws. We honour Global Privacy Control (GPC) opt-out
          preference signals where applicable.
        </p>
        <p>
          In addition to the rights listed above, US residents may have the
          right to: (i) request information about the collection and disclosure
          of their personal information over the preceding 12 months; (ii) opt
          out of the sale, sharing, or targeted advertising of their personal
          information (which we do not perform); (iii) limit use of sensitive
          personal information (we do not use or disclose sensitive personal
          information except as necessary to provide the Services or as
          permitted by law); (iv) non-discrimination for exercising their
          rights; and (v) appeal our decision on a privacy request.
        </p>

        <h3 className="mt-3 font-heading text-base font-semibold tracking-tight">
          EEA and UK
        </h3>
        <p>
          This section applies to individuals based in the European Economic
          Area or the United Kingdom and supplements the rest of this Notice
          under the General Data Protection Regulation (&ldquo;GDPR&rdquo;) and
          UK GDPR.
        </p>
        <p>
          yCAPTCHA acts as a data controller for information we collect about
          you when you use the Sites and Services as a Customer or when you
          interact with us. When processing End User data during a CAPTCHA
          challenge on a Customer&rsquo;s site, we act as a data processor on
          behalf of that Customer, and the Customer&rsquo;s privacy notice
          governs.
        </p>
        <p>Our legal bases for processing are:</p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            <strong>Contract.</strong> Where necessary to provide the Services
            you have requested (account administration, serving images,
            verifying CAPTCHA tokens, responding to support requests).
          </li>
          <li>
            <strong>Legitimate interests.</strong> To improve, secure, and
            defend the Services — for example, to operate rate limiting and
            fraud detection, and to review aggregated usage to improve the
            product — balanced against your rights and freedoms.
          </li>
          <li>
            <strong>Legal obligations.</strong> To comply with applicable law,
            respond to lawful requests, and retain billing and account records
            as required.
          </li>
          <li>
            <strong>Consent.</strong> Where we ask for it, for example for
            optional cookies on our Sites.
          </li>
        </ul>
        <p>
          In addition to the rights listed above, EEA/UK individuals have the
          right to restrict processing in limited circumstances and the right to
          object to processing based on legitimate interests. If you have
          unresolved concerns, you may lodge a complaint with your local
          supervisory authority, though we ask that you contact us first so we
          can try to resolve the issue.
        </p>
        <p>
          We aim to respond to verified requests within 30 days. Requests may be
          limited where fulfilling them would adversely affect others&rsquo;
          rights, where there are overriding public-interest reasons, or where
          we are required by law to retain the information.
        </p>
      </Section>

      <Section id="age" title="Minimum Age">
        <p>
          The Sites and Services are not directed to children under 16. Do not
          create an account or upload content if you are under 16. We do not
          knowingly collect personal information from anyone under 16. If you
          believe a child has provided us with personal information, contact us
          and we will delete it.
        </p>
      </Section>

      <Section id="changes" title="Changes to This Notice">
        <p>
          We periodically review and update this Notice. The
          &ldquo;Last&nbsp;updated&rdquo; date at the top of this page reflects
          the current version. Material changes will be announced on the
          dashboard or by email. Your continued use of the Sites and Services
          after the effective date of a change constitutes acceptance of the
          updated Notice.
        </p>
      </Section>

      <Section id="contact" title="Contact Us">
        <p>
          Questions about this Notice, requests to exercise your rights,
          deletion requests, or other privacy concerns:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline underline-offset-4 hover:text-foreground"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </article>
  );
}

const TOC_ITEMS: Array<{ id: string; label: string }> = [
  { id: "about", label: "About yCAPTCHA" },
  { id: "applicability", label: "Applicability" },
  { id: "info-we-collect", label: "Information we collect" },
  { id: "how-we-use", label: "How we use information" },
  { id: "retention", label: "How we retain information" },
  { id: "disclosure", label: "How we disclose information" },
  { id: "security", label: "How we secure information" },
  { id: "third-party", label: "Third-party services" },
  { id: "gallery", label: "Content you publish to the Gallery" },
  { id: "transfers", label: "How we transfer information" },
  { id: "your-rights", label: "Your privacy rights and choices" },
  { id: "age", label: "Minimum age" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

function TableOfContents() {
  return (
    <nav
      aria-label="On this page"
      className="rounded-xl border border-border bg-background/60 p-5"
    >
      <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        On this page
      </div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {TOC_ITEMS.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
