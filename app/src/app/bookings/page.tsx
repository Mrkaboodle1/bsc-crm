import { redirect } from 'next/navigation'

// Bookings live in the Calendar (classes, trials, parties, shows, gigs, events).
export default function BookingsPage() {
  redirect('/calendar')
}
