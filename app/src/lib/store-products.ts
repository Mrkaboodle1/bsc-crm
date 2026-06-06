// Big Star storefront catalogue. Edit here to add/change products (ask Jacky).
export type Product = { id: string; name: string; price: number; unit?: string; blurb: string; emoji: string }

export const PRODUCTS: Product[] = [
  { id: 'term-pass', name: 'Term Pass (10 weeks)', price: 200, blurb: 'One weekly class for the whole term — best value.', emoji: '🎟️' },
  { id: 'casual-class', name: 'Casual Class', price: 25, unit: 'class', blurb: 'Drop in to a single class.', emoji: '🤸' },
  { id: 'holiday-workshop', name: 'Holiday Workshop Day', price: 75, unit: 'day', blurb: '9am–3pm school-holiday circus fun.', emoji: '🏕️' },
  { id: 'show-ticket', name: 'Show Ticket', price: 20, unit: 'ticket', blurb: 'Come watch our young stars perform.', emoji: '⭐' },
  { id: 'tshirt', name: 'Big Star T-Shirt', price: 30, blurb: 'Official Big Star Circus tee.', emoji: '👕' },
  { id: 'gift-card', name: 'Gift Card', price: 50, blurb: 'The gift of circus — any amount.', emoji: '🎁' },
]
