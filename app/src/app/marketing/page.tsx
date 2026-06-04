import { redirect } from 'next/navigation'

// Marketing now opens straight into the unified Social hub.
export default function MarketingIndex() {
  redirect('/marketing/social')
}
