import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal · Civix250",
  description:
    "Legal information for Civix250, a program of Vote Beyond Party, a 501(c)(3) nonprofit organization. Privacy policy, terms of service, accessibility, and disclaimers.",
};

const LAST_UPDATED = "July 1, 2026";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </section>
  );
}

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-lg font-bold text-slate-900">
            Civix250
          </Link>
          <Link
            href="/"
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          Legal
        </p>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Legal &amp; Policies
        </h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

        {/* Table of contents */}
        <nav className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            On this page
          </p>
          <ul className="mt-3 grid gap-2 text-sm font-semibold text-blue-600 sm:grid-cols-2">
            <li><a href="#organization" className="hover:underline">Organization &amp; Nonprofit Status</a></li>
            <li><a href="#nonpartisan" className="hover:underline">Non-Partisan Disclaimer</a></li>
            <li><a href="#privacy" className="hover:underline">Privacy Policy</a></li>
            <li><a href="#terms" className="hover:underline">Terms of Service</a></li>
            <li><a href="#donations" className="hover:underline">Donations</a></li>
            <li><a href="#accessibility" className="hover:underline">Accessibility</a></li>
            <li><a href="#disclaimer" className="hover:underline">Disclaimers &amp; Liability</a></li>
            <li><a href="#contact" className="hover:underline">Contact</a></li>
          </ul>
        </nav>

        <div className="mt-12 space-y-12">
          <Section id="organization" title="Organization & Nonprofit Status">
            <p>
              Civix250 is a civic engagement program operated by{" "}
              <strong>Vote Beyond Party</strong>, a nonprofit organization
              recognized as tax-exempt under Section 501(c)(3) of the Internal
              Revenue Code. Our Employer Identification Number (EIN) is{" "}
              <strong>39-4801426</strong>.
            </p>
            <p>
              As a 501(c)(3) organization, Vote Beyond Party operates
              exclusively for charitable and educational purposes. We do not
              participate or intervene in any political campaign on behalf of, or
              in opposition to, any candidate for public office. Contributions to
              Vote Beyond Party are tax-deductible to the extent permitted by law.
            </p>
          </Section>

          <Section id="nonpartisan" title="Non-Partisan Disclaimer">
            <p>
              Civix250 does not represent, endorse, or oppose any political
              party, candidate, campaign, or elected official. The platform is
              provided as a neutral tool to help citizens connect with their
              representatives, learn about local issues, and participate in civic
              life.
            </p>
            <p>
              Any views expressed by users, officials, or in survey results are
              those of the individuals who posted them and do not represent the
              views of Vote Beyond Party or Civix250.
            </p>
          </Section>

          <Section id="privacy" title="Privacy Policy">
            <p>
              We are committed to protecting your privacy and collecting only the
              minimum information necessary to operate the platform.
            </p>
            <p>
              <strong>What we collect.</strong> To provide the service, we store
              a limited profile for each registered user, which may include your
              name, email address, and congressional district. Officials may
              additionally provide office and jurisdiction details. Posts,
              comments, and survey responses you submit are stored so they can be
              displayed within your district.
            </p>
            <p>
              <strong>How we use your address.</strong> If you provide a street
              address, city, or ZIP code, it is used solely to confirm your
              congressional district. It is never shared with campaigns,
              candidates, or third parties.
            </p>
            <p>
              <strong>We never sell your data.</strong> We do not sell, rent, or
              trade your personal information. We do not share it with political
              campaigns, candidates, advertisers, or data brokers.
            </p>
            <p>
              <strong>Security.</strong> Your data is transmitted over encrypted
              connections and stored using industry-standard security controls
              with access restricted to authorized personnel.
            </p>
            <p>
              <strong>Your choices.</strong> You may request access to, correction
              of, or deletion of your personal information at any time by
              contacting us at the email below. When you delete your account, we
              remove your profile and associated personal data, except where we
              are required to retain limited records to comply with law.
            </p>
          </Section>

          <Section id="terms" title="Terms of Service">
            <p>
              By accessing or using Civix250 you agree to these terms. If you do
              not agree, please do not use the platform.
            </p>
            <p>
              <strong>Eligibility &amp; accounts.</strong> You are responsible for
              maintaining the confidentiality of your account credentials and for
              all activity under your account. You agree to provide accurate
              information and to keep it up to date.
            </p>
            <p>
              <strong>Acceptable use.</strong> You agree not to post unlawful,
              harassing, defamatory, hateful, or misleading content; not to
              impersonate others; not to disrupt or attempt to gain unauthorized
              access to the platform; and not to use the service for partisan
              campaign activity. We may moderate, remove, or escalate content and
              may suspend accounts that violate these terms.
            </p>
            <p>
              <strong>Content.</strong> You retain ownership of the content you
              submit and grant us a limited license to display it within the
              platform for the purpose of operating the service.
            </p>
          </Section>

          <Section id="donations" title="Donations">
            <p>
              Donations to Vote Beyond Party support the operation of the Civix250
              platform and are tax-deductible to the extent permitted by law under
              Section 501(c)(3). We will provide a receipt for your records. No
              goods or services are provided in exchange for a contribution unless
              expressly stated.
            </p>
          </Section>

          <Section id="accessibility" title="Accessibility">
            <p>
              We are committed to making Civix250 usable by everyone, including
              people with disabilities, and we strive to follow the Web Content
              Accessibility Guidelines (WCAG) 2.1 Level AA where feasible.
            </p>
            <p>
              If you encounter an accessibility barrier, please contact us so we
              can help and continue improving the platform.
            </p>
          </Section>

          <Section id="disclaimer" title="Disclaimers & Limitation of Liability">
            <p>
              The platform is provided &quot;as is&quot; and &quot;as
              available&quot; without warranties of any kind, express or implied.
              We do not guarantee that information on the platform — including
              representative contact details, district mappings, or survey results
              — is complete, current, or error-free.
            </p>
            <p>
              To the fullest extent permitted by law, Vote Beyond Party and
              Civix250 are not liable for any indirect, incidental, or
              consequential damages arising from your use of the platform.
            </p>
          </Section>

          <Section id="contact" title="Contact">
            <p>
              For privacy requests, legal questions, or general inquiries, contact
              us at{" "}
              <a
                href="mailto:legal@civix250.org"
                className="font-semibold text-blue-600 hover:underline"
              >
                legal@civix250.org
              </a>
              .
            </p>
            <p className="text-xs text-slate-500">
              Vote Beyond Party · 501(c)(3) nonprofit · EIN 39-4801426 ·
              civix250.ai
            </p>
          </Section>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white py-8 px-5 text-center text-xs text-slate-500">
        © 2026 Civix250, a program of Vote Beyond Party. This platform does not
        represent any political party, candidate, or campaign.
      </footer>
    </main>
  );
}
