import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function PoliciesPage() {
  const user = await verifySession()
  return (
    <DashboardShell
      user={user}
      currentPath="/compliance/policies"
      pageTitle="📋 Policies & Terms"
      pageSubtitle="The rules and T&Cs for workshops, Kids Night Out, memberships and Play On vouchers"
    >
      <div className="max-w-3xl space-y-5 pb-12">
        <Banner>
          These are Big Star Circus&apos; standard terms. They&apos;re shown to parents at booking and apply to every
          paid program. <strong>All payments are non-refundable</strong> — please read before booking.
        </Banner>

        <Section title="💳 Bookings & payment (all programs)">
          <Li>A spot is only confirmed once payment is made in full at the time of booking.</Li>
          <Li>Prices are per child, per session, in Australian dollars and include GST where applicable.</Li>
          <Li>Spaces are limited and allocated first-come, first-served.</Li>
          <Li><strong>All bookings are non-refundable and non-transferable to cash.</strong> See the Refund Policy below.</Li>
        </Section>

        <Section title="🏕️ School Holiday Workshops">
          <Li><strong>$85 per child, per day.</strong> Runs 9:00am–3:00pm.</Li>
          <Li>Drop-off from 9:00am, pick-up by 3:00pm. Please be on time — late pick-up fees may apply.</Li>
          <Li>Children must bring <strong>morning tea, lunch and a labelled water bottle</strong>. Nut-aware venue.</Li>
          <Li>Members may book ahead of the general public each round, then spots open to everyone.</Li>
          <Li>A completed waiver and current medical/allergy information are required before the child attends.</Li>
          <Li>No refunds for change of mind, illness or non-attendance (see Refund Policy).</Li>
        </Section>

        <Section title="🌙 Kids Night Out">
          <Li><strong>$85 per child.</strong> Includes disco, circus games, pizza, prizes and a wind-down movie.</Li>
          <Li>Drop-off and pick-up times are shown on each event. Please collect on time.</Li>
          <Li>Children will only be released to a parent/guardian or a person named at booking.</Li>
          <Li>Please advise all allergies and medical needs at booking. A waiver is required.</Li>
          <Li>No refunds for change of mind, illness or non-attendance (see Refund Policy).</Li>
        </Section>

        <Section title="⭐ Yearly Membership / Subscription">
          <Li>Membership is billed as a yearly subscription and gives access to weekly term classes.</Li>
          <Li>Holiday Workshops and Kids Night Out are <strong>extra</strong> and not included in the subscription.</Li>
          <Li>Subscriptions are non-refundable. Loyalty rewards apply for attendance milestones (10 / 20 / 40 classes a year).</Li>
        </Section>

        <Section title="🎟️ Play On Vouchers">
          <Li>Play On vouchers are <strong>valid for 5 weeks of the term</strong> from the date redeemed (not the full 10-week term).</Li>
          <Li>One voucher per child, applied to term class fees. Vouchers have no cash value and are non-refundable.</Li>
          <Li>Vouchers cannot be exchanged for cash, transferred between children, or carried over once expired.</Li>
          <Li>Any class fees beyond the voucher&apos;s value and validity period are payable by the family.</Li>
        </Section>

        <Section title="↩️ Refund Policy">
          <Li><strong>All bookings and payments are non-refundable</strong>, including for change of mind, illness, injury or non-attendance.</Li>
          <Li>If <em>Big Star Circus</em> cancels a session, you&apos;ll be offered a credit or transfer to another date.</Li>
          <Li>Credits (where offered at our discretion) are valid for 6 months and are non-transferable to cash.</Li>
        </Section>

        <Section title="🛟 Health, safety & consent">
          <Li>A signed waiver (liability, medical and photo/social consent) is required before participation.</Li>
          <Li>Parents must disclose all medical conditions, allergies and dietary needs at booking.</Li>
          <Li>We follow child-safe practices; staff hold current Blue Cards and first-aid where required.</Li>
        </Section>

        <Section title="📸 Photography">
          <Li>We may photograph/film sessions for promotion. You can opt out via the waiver&apos;s photo-consent option.</Li>
        </Section>

        <Section title="🔁 Changes by Big Star Circus">
          <Li>We may adjust timings, activities, coaches or pricing for future programs. Changes won&apos;t affect a session already paid for.</Li>
        </Section>

        <p className="text-xs text-zinc-400">Last updated June 2026 · Big Star Circus, Gold Coast. Questions? Contact the office.</p>
      </div>
    </DashboardShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5">
      <h3 className="font-extrabold text-zinc-900 mb-2">{title}</h3>
      <ul className="space-y-1.5 text-sm text-zinc-700">{children}</ul>
    </div>
  )
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2"><span className="text-[#D72027] shrink-0">•</span><span>{children}</span></li>
}
function Banner({ children }: { children: React.ReactNode }) {
  return <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">{children}</div>
}
