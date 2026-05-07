import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "../section";

export const metadata: Metadata = {
  title: "Acceptable Use Policy · yCAPTCHA",
  description:
    "Rules for using yCAPTCHA, uploading images, and publishing to the public Gallery.",
};

const LAST_UPDATED = "April 18, 2026";

export default function AcceptableUsePolicyPage() {
  return (
    <article className="flex flex-col gap-6 text-[15px] leading-relaxed text-foreground/90">
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Acceptable Use Policy
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight lg:text-4xl">
          Acceptable Use Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated {LAST_UPDATED}
        </p>
      </header>

      <Section title="Summary">
        <p>
          This policy applies to everyone who uses yCAPTCHA, whether you are a
          site owner embedding the widget, a publisher sharing an image set to
          the Gallery, or an end user solving a challenge. By using the service
          you agree to these rules. See also the{" "}
          <Link
            href="/legal/privacy-policy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section title="1. Prohibited content and activities">
        <p>
          You may not use yCAPTCHA, nor allow your users or any third party to
          use yCAPTCHA:
        </p>
        <p>
          <strong>For any unlawful purpose</strong>, including but not limited
          to:
        </p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>Fraud, deceptive practices, or other scams;</li>
          <li>
            Impersonation, phishing, or misrepresenting authorization to act on
            behalf of others or yCAPTCHA;
          </li>
          <li>The sale of illegal goods or services;</li>
          <li>Hate speech;</li>
          <li>
            The sharing or threat of sharing of nonconsensual intimate imagery,
            or the like, including the use of synthetic media and/or deepfakes.
          </li>
        </ul>
        <p>Further, you may not use yCAPTCHA:</p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            To violate the rights of others, including but not limited to
            harassment, or infringing or misappropriating intellectual property;
          </li>
          <li>
            To threaten, promote, or enable violence, terrorism, or other
            serious harm;
          </li>
          <li>
            For any content or activity that promotes or enables child sexual
            exploitation or abuse;
          </li>
          <li>
            To enable the sending or creation of unsolicited mass messages —
            also known as &lsquo;spam&rsquo; — or spammy, &lsquo;clickbait,
            &rsquo; or &lsquo;clickfraud&rsquo; content or schemes;
          </li>
          <li>
            To create an undue burden on yCAPTCHA&rsquo;s websites,
            infrastructure, or the networks or services connected to our
            systems;
          </li>
          <li>
            To scrape, proxy, act as a VPN, or host media for hot-linking;
          </li>
          <li>
            To engage in any name-squatting behavior within yCAPTCHA-related
            namespaces (including site keys and account handles), or to attempt
            to resell, barter, trade, or inactively hold namespace entities for
            future use;
          </li>
          <li>
            To rent, lease, loan, or sell access to, or otherwise attempt to
            transfer or make the service available to any third party;
          </li>
          <li>
            To produce multiple accounts on yCAPTCHA or to circumvent any rules,
            limits, or rate-limited features imposed by our usage guidelines;
          </li>
          <li>
            To undermine the security or integrity of computing systems or
            networks of yCAPTCHA, its partners, or any other person, or to
            attempt to gain unauthorized access to the service or its related
            systems or network;
          </li>
          <li>
            To use automation to interact with yCAPTCHA&rsquo;s website for
            unintended purposes such as creating multiple accounts, running
            automated searches, submitting requests or queries, or extracting
            content or data from the site;
          </li>
          <li>
            To farm CAPTCHA solutions, resell verification tokens, or build a
            service whose purpose is to defeat yCAPTCHA challenges on sites you
            do not own;
          </li>
          <li>To use the service for any other objectionable purpose.</li>
        </ul>
        <p>
          You may conduct benchmark tests of the service. If you publicly
          disclose the results of any benchmark tests performed by you, or by a
          third party on your behalf, the results must include all necessary
          information for others to replicate the tests.
        </p>
      </Section>

      <Section title="2. Images you upload">
        <p>
          Every image you upload — whether used only on your own site or
          published to the Gallery — must comply with these rules. You are
          responsible for the content you upload.
        </p>
        <p>Do not upload:</p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            Content you do not have the right to use. This includes copyrighted
            material you did not create or licence, trademarked logos used in a
            way that implies endorsement, and material that violates
            someone&rsquo;s right of publicity.
          </li>
          <li>
            Personally identifiable information (PII) of any kind — real names
            tied to addresses, government IDs, financial records, health
            records, private contact details.
          </li>
          <li>
            Faces of private individuals who have not consented to being used as
            CAPTCHA content.
          </li>
          <li>Any imagery of minors, clothed or otherwise, in any context.</li>
          <li>Nudity, sexual content, or sexually suggestive content.</li>
          <li>
            Graphic violence, gore, or content depicting real-world harm to
            people or animals.
          </li>
          <li>
            Hate symbols, content that harasses a protected group, or content
            that promotes terrorism or extremist violence.
          </li>
          <li>
            Malware, phishing material, deceptive content, or content that
            impersonates a real person or brand to mislead viewers.
          </li>
        </ul>
      </Section>

      <Section title="3. Publishing to the public Gallery">
        <p>
          The Gallery is a shared, public pool of image sets that any yCAPTCHA
          user can reuse. Publishing is irreversible in practice: once a gallery
          item exists, anyone can view it, copy it, or embed it in their own
          CAPTCHA puzzles. By publishing an image set you represent and agree
          that:
        </p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            You own the images, or you otherwise have the right to share them
            for this purpose.
          </li>
          <li>
            You grant yCAPTCHA and any other user of the Gallery a perpetual,
            worldwide, royalty-free, non-exclusive licence to display, copy,
            cache, redistribute, and embed the images as part of a CAPTCHA
            challenge.
          </li>
          <li>
            You understand that the images will be publicly visible and
            downloadable, that search engines and third parties may index them,
            and that they cannot be made private after the fact.
          </li>
          <li>You will not publish content that violates Section 2 above.</li>
          <li>
            Frozen-snapshot rule: deleting or editing the source image set on
            your dashboard does <strong>not</strong> change what is already
            public in the Gallery. A takedown must be requested separately.
          </li>
        </ul>
      </Section>

      <Section title="4. Puzzle and challenge behaviour">
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            Do not configure puzzles that require end users to identify real
            people, identify minors, or classify content listed in Section 2.
          </li>
          <li>
            Do not use the CAPTCHA interaction to collect end-user input beyond
            image selection, or to fingerprint end users beyond what the widget
            documents.
          </li>
          <li>
            The{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[13px]">
              origin
            </code>{" "}
            value submitted by the widget is advisory site-context, not a
            security claim. Your real security boundary is the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[13px]">
              siteverify
            </code>{" "}
            endpoint called with your private{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[13px]">
              secretKey
            </code>
            . Keep your secret key secret.
          </li>
        </ul>
      </Section>

      <Section title="5. Reporting and takedowns">
        <p>
          If a Gallery item infringes your rights, violates this policy, or
          otherwise needs to come down, email{" "}
          <a
            href="mailto:ycaptcha@xyspg.moe"
            className="underline underline-offset-4 hover:text-foreground"
          >
            ycaptcha@xyspg.moe
          </a>{" "}
          with:
        </p>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>A link to the specific Gallery item.</li>
          <li>
            The reason for the takedown (rights claim, policy category, safety
            concern).
          </li>
          <li>
            Proof of your claim where applicable (e.g. for copyright claims,
            evidence of ownership).
          </li>
        </ul>
        <p>
          We will review and act at our discretion. We can remove any Gallery
          item, suspend any account, and revoke any site key at any time for
          violations of this policy.
        </p>
      </Section>

      <Section title="6. Enforcement">
        <p>
          Violations of this policy may result in removal of content, suspension
          of your account, revocation of API keys, and where warranted, referral
          to law enforcement. We may enforce this policy without prior notice.
        </p>
      </Section>

      <Section title="7. Changes">
        <p>
          We may update this policy as the service evolves. The &ldquo;Last
          updated&rdquo; date at the top of the page reflects the current
          version. Continued use of yCAPTCHA after a change constitutes
          acceptance of the updated policy.
        </p>
      </Section>
    </article>
  );
}
