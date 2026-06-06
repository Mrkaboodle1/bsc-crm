import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { CopyButton } from '@/components/copy-button'
import { ExternalLink } from 'lucide-react'

const BASE = 'https://app-chi-silk-29.vercel.app'

export default async function ClientPortalPage() {
  const user = await verifySession()
  const url = `${BASE}/portal`
  return (
    <DashboardShell user={user} currentPath="/marketing/client-portal" pageTitle="Client Portal" pageSubtitle="One link for parents — booking, shop, parties, feedback.">
      <div className="space-y-6 max-w-3xl">
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="font-semibold text-zinc-900 mb-1">Your Parent Hub is live</h3>
          <p className="text-sm text-zinc-500 mb-4">Share this one link with families (link in bio, emails, flyers). It gives them a tidy menu of everything self-service — book a trial, shop, party enquiries, the class-match quiz, contact and feedback.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <a href={url} target="_blank" className="inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-4 py-2 rounded-lg"><ExternalLink size={15} /> Open the hub</a>
            <CopyButton text={url} label="Copy hub link" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="font-semibold text-zinc-900 mb-3">What&apos;s inside</h3>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm text-zinc-700">
            <li>🎪 Book a free trial</li>
            <li>🎟️ Shop (passes, tickets, merch)</li>
            <li>🎂 Birthday party enquiries</li>
            <li>❓ “Which class?” quiz</li>
            <li>✉️ Contact us</li>
            <li>⭐ Give feedback</li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <strong>Coming next:</strong> a private parent <em>login</em> to view their own bookings, invoices and their child&apos;s progress. The shareable hub above works for everyone today — no login needed.
        </div>
      </div>
    </DashboardShell>
  )
}
