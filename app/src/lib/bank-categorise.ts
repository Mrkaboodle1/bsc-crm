// Big Star Books — the "smart category" brain for bank transactions.
// Suggests a BigStar category from a CommBank description, learning from the
// rules the owner has confirmed before. Plain keyword matching — no black box.

export const INCOME_CATEGORIES = [
  'Term class fees', 'Holiday workshops', 'Private lessons', 'Birthday parties', 'Incursions',
  'Events', 'Mr Kaboodle Entertainment', 'Merchandise', 'Grants', 'Donations', 'Other income',
] as const

export const EXPENSE_CATEGORIES = [
  'Rent', 'Staff wages', 'Superannuation', 'Contractors', 'Insurance', 'Equipment', 'Materials & supplies',
  'Costumes', 'Marketing', 'Software & subscriptions', 'Vehicle & travel', 'Training', 'Repairs',
  'Merchant fees', 'Bank fees', 'Office', 'Telephone & internet', 'General expenses', 'Filing fees',
  'Director loan', 'Tax & GST',
] as const

// Categories that are normally NOT subject to GST.
const NO_GST = new Set<string>(['Staff wages', 'Superannuation', 'Director loan', 'Bank fees', 'Filing fees', 'Tax & GST'])

export function categoryGstDefault(category: string | null): boolean {
  if (!category) return true
  return !NO_GST.has(category)
}

type Rule = { match_text: string; category: string; gst: boolean }

const EXPENSE_KEYWORDS: [RegExp, string][] = [
  [/RHETT WAGE|NETBANK RHETT|WAGE|PAYROLL|SALARY/, 'Staff wages'],
  [/SUPER|HOSTPLUS|AUSTRALIANSUPER|REST SUPER|SUNSUPER|ART SUPER/, 'Superannuation'],
  [/OFFICEWORKS|KMART|SPOTLIGHT|CRAFT|ETSY|TARGET|BIG W|REVERSE GARBAGE|RICCARDO|CLEVERPATCH|ART ?SUPPL/, 'Materials & supplies'],
  [/BUNNINGS|MITRE 10|TOTAL TOOLS|REPAIR|HARDWARE/, 'Repairs'],
  [/BP |CALTEX|AMPOL|7-ELEVEN|7 ELEVEN|SHELL|FUEL|UNITED PETROL|MOBIL|LINKT|TOLL|UBER|TAXI|PARKING/, 'Vehicle & travel'],
  [/WOOLWORTHS|COLES|IGA|ALDI|MCDONALD|CAFE|COFFEE|HUNGRY|KFC|SUBWAY|BAKERY|REDOX|CHEMIST/, 'General expenses'],
  // Ad spend bills as "FACEBK *XXXX Dublin IE" — not the word "Facebook" — so it
  // was silently falling through and none of the ad spend was being categorised.
  [/FACEBK|FB\.ME|META PLATFORMS|GOOGLE ADS|ADWORDS|BOOST(ED)? POST/, 'Marketing'],
  [/PRINT|PRINTERS|VISTAPRINT|SIGN|BANNER|FLYER/, 'Marketing'],
  [/FACEBOOK|META |GOOGLE|CANVA|ADOBE|MAILCHIMP|XERO|GODADDY|SQUARESPACE|VERCEL|OPENAI|ANTHROPIC|ZOOM|MICROSOFT|SPOTIFY|APPLE\.COM|NETFLIX|SUBSCRIPTION|DROPBOX|NOTION|CLICKSEND|RESEND|SUPABASE/, 'Software & subscriptions'],
  // Coach payments go out as "Transfer To <name> CommBank App BSC Coach <dates>".
  [/BSC COACH|COACH PAY|TRANSFER TO .*COACH/, 'Contractors'],
  [/JB HI ?FI|HARVEY NORMAN|THE GOOD GUYS|APPLIANCE/, 'Equipment'],
  [/BALLOO|MAD BALLOO|PARTY SUPPL|CLEVERPATCH|LINCRAFT/, 'Materials & supplies'],
  [/LIFELINE|SALVOS|VINNIES|OP ?SHOP|SAVERS/, 'Costumes'],
  [/AMCAL|CHEMIST WAREHOUSE|PRICELINE|PHARMACY|TERRY WHITE/, 'General expenses'],
  [/SUSHI|PIZZA|THAI|INDIAN|RESTAURANT|TAKEAWAY|DOMINO|GRILL D|GUZMAN/, 'General expenses'],
  [/INSURANCE|AAMI|ALLIANZ|QBE|NRMA|CGU|BIZCOVER|AON/, 'Insurance'],
  [/RENT|REAL ESTATE|PROPERTY|HARCOURTS|RAY WHITE|LJ HOOKER/, 'Rent'],
  [/TITLES|ASIC|GOVERNMENT|COUNCIL|GOLD COAST CITY|FILING|REGISTR/, 'Filing fees'],
  [/BANK FEE|ACCOUNT FEE|MONTHLY FEE|OVERDRAWN|INTL TRANSACTION FEE/, 'Bank fees'],
  [/TELSTRA|OPTUS|VODAFONE|TPG|AUSSIE BROADBAND|INTERNET|MOBILE/, 'Telephone & internet'],
  [/COSTUME|SEW|FABRIC|LYCRA/, 'Costumes'],
  [/TRAINING|COURSE|GYMNASTICS AUST|ACROBAT|FIRST AID|BLUE CARD/, 'Training'],
  [/ATO|AUSTRALIAN TAXATION|GST|BAS PAYMENT/, 'Tax & GST'],
]

const INCOME_KEYWORDS: [RegExp, string][] = [
  // Holiday-program income lands as "Direct Credit … GOLD COAST HOLID <ref>".
  [/GOLD COAST HOLID|HOLIDAY PROG|SCHOOL HOLIDAY|VACATION CARE/, 'Holiday workshops'],
  // Parents paying an invoice: "Fast Transfer From <NAME> INV 1231 <child>".
  [/\bINV ?\d{3,}|INVOICE ?\d{3,}|TERM FEE|CLASS FEE/, 'Term class fees'],
  [/NDIS|PLAN ?PARTNER|MYPLAN|PLAN ?MANAG|FAMILY CENTRE|DISABILITY|FIRST2CARE|RISE ?AND ?SHINE|SPECIALCISE/, 'Term class fees'],
  [/BIRTHDAY|PARTY/, 'Birthday parties'],
  [/RESORT|BIG4|BIG 4|HOLIDAY PARK|PARADISE/, 'Events'],
  [/SCHOOL|COLLEGE|EDU|OSHC|CHILDCARE|KINDY|C&K/, 'Incursions'],
  [/SQUARE|STRIPE|EFTPOS/, 'Other income'],
  [/KABOODLE|MAGIC|ENTERTAIN/, 'Mr Kaboodle Entertainment'],
  [/GRANT|FOUNDATION|GAMBLING|GIVIT/, 'Grants'],
  [/DONAT|GOFUNDME/, 'Donations'],
]

/** Pull a learnable "merchant" token from a CommBank description (first strong word). */
export function merchantToken(desc: string): string {
  const cleaned = (desc || '')
    .replace(/Card xx\d+.*$/i, '')
    .replace(/Value Date:.*$/i, '')
    .replace(/Direct Credit \d+/i, '')
    .replace(/Transfer (to|from) xx\d+/i, '')
    .trim()
  const words = cleaned.split(/\s+/).filter((w) => /[A-Za-z]/.test(w) && w.length >= 3 && !/^(THE|AND|PTY|LTD|AUS|AUSTRALIA)$/i.test(w))
  return (words.slice(0, 2).join(' ') || cleaned.slice(0, 24)).toUpperCase()
}

/** Suggest a category for a transaction. Learned rules win over built-in keywords. */
export function suggestCategory(description: string, direction: 'in' | 'out', rules: Rule[] = []): { category: string | null; gst: boolean } {
  const upper = (description || '').toUpperCase()
  for (const r of rules) {
    if (r.match_text && upper.includes(r.match_text.toUpperCase())) return { category: r.category, gst: r.gst }
  }
  const table = direction === 'in' ? INCOME_KEYWORDS : EXPENSE_KEYWORDS
  for (const [re, cat] of table) {
    if (re.test(upper)) return { category: cat, gst: categoryGstDefault(cat) }
  }
  return { category: null, gst: direction === 'out' }
}
