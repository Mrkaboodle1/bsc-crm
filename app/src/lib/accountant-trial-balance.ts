// BSC CRM — Accountant's Draft Trial Balance (source of truth for Reconcile).
//
// Captured from the accountant's "Comparative Trial Balance as at 30 June 2026"
// (draft, dated 22 Jun 2026). These are the figures Big Star Books reconciles
// the live Xero numbers against. When the accountant issues a new trial balance,
// update the numbers here (or, later, import a fresh PDF).
//
// Sign convention: positive = the natural balance of that line
// (income/liabilities are credits, expenses/assets are debits) shown as a
// plain positive dollar figure for display.

export const ACCOUNTANT_TB = {
  label: "Accountant's draft — 30 Jun 2026",
  asAt: '2026-06-30',
  netProfit: 27074.04,
  // The one-off extra director fee taken in June, which is in Xero's live wages
  // ($95k) but NOT in this draft (wages $75k). This is the headline difference.
  oneOffDirectorFee: 20000,

  income: [
    { name: 'BigStar income (classes & workshops)', amount: 105490.83, xero: 'Sale - BigStar income' },
    { name: 'Performances', amount: 155528.64, xero: 'Sale - Perfomance' },
    { name: 'Square sales', amount: 19800.46, xero: 'Square Sales' },
    { name: 'Interest received', amount: 2.28, xero: 'Interest Income' },
  ],

  // Accountant's expense lines (their chart of accounts). Note the accountant
  // reclassifies heavily at year end (depreciation, asset write-offs, income
  // tax to equity), so individual categories will NOT line up with Xero — only
  // totals and balances reconcile cleanly. Shown side-by-side for reference.
  expenses: [
    { name: 'Wages', amount: 75000.0 },
    { name: 'Subcontractors', amount: 38352.72 },
    { name: 'Office Equipment (written off)', amount: 54496.64 },
    { name: 'Rent on land & buildings', amount: 17754.55 },
    { name: 'Marketing', amount: 14347.2 },
    { name: 'Superannuation', amount: 13602.32 },
    { name: 'Motor vehicle — fuel & oil', amount: 10325.96 },
    { name: 'Admin Expense', amount: 5408.25 },
    { name: 'Depreciation — other', amount: 5161.0 },
    { name: 'Accountancy', amount: 4636.41 },
    { name: 'Staff training', amount: 3667.71 },
    { name: 'Subscriptions', amount: 3081.17 },
    { name: 'Costume', amount: 1821.92 },
    { name: 'Fines', amount: 1669.0 },
    { name: 'Square fees', amount: 1298.16 },
    { name: 'Travel & accommodation', amount: 1209.82 },
    { name: 'Telephone', amount: 983.0 },
    { name: 'General expenses', amount: 333.36 },
    { name: 'Filing fees', amount: 329.0 },
    { name: 'Meeting cost', amount: 197.1 },
    { name: 'Bank fees & charges', amount: 72.88 },
  ],

  // Key balances that DO map to Xero accounts. Each has a Xero account name and,
  // where known, a plain-English note explaining any expected gap.
  balances: [
    { name: 'Main bank account (CBA 5090)', amount: 5725.64, xero: 'BIGSTAR CIRCUS PTY LTD', kind: 'asset' as const },
    { name: 'Business saver', amount: 645.6, xero: 'Bus Online Saver', kind: 'asset' as const },
    { name: 'Money owed to you (debtors)', amount: 7327.07, xero: 'Accounts Receivable', kind: 'asset' as const },
    { name: 'Director loan', amount: 46596.98, xero: 'Owner A Drawings', kind: 'asset' as const,
      note: 'Xero tracks this as "Owner Drawings" and groups it differently — expect the figures to differ; what matters is the trend.' },
    { name: 'Equipment loan (LDV van)', amount: 41571.04, xero: 'Loan', kind: 'liability' as const },
    { name: 'PAYG tax withheld (owed to ATO)', amount: 14820.0, xero: 'PAYG Withholdings Payable', kind: 'liability' as const,
      note: 'Xero is higher because it already includes the June pay run (the $20k director fee); the accountant draft was taken just before it.' },
    { name: 'Super owing', amount: 2849.4, xero: 'Superannuation Payable', kind: 'liability' as const,
      note: 'Xero is exactly $2,400 higher — that is the 12% super on the one-off $20k director fee, not yet in the accountant draft.' },
  ],
} as const

export type AccountantTB = typeof ACCOUNTANT_TB
