// The for-profit entity's legal identity — printed on every tax invoice.
// A valid Australian tax invoice over $82.50 must show the supplier's
// identity and ABN, so this block is not cosmetic.
export const BUSINESS = {
  legalName: 'BIGSTAR CIRCUS PTY LTD',
  abn: '18 678 780 722',
  address: 'Unit 1/14 Harper St, Molendinar QLD 4214',
  bank: {
    accountName: 'BIGSTAR CIRCUS PTY LTD',
    // Set BSC_BANK_BSB / BSC_BANK_ACCOUNT in env to print the numbers on
    // invoices. Until then the invoice says details are provided separately.
    bsb: process.env.BSC_BANK_BSB || '',
    account: process.env.BSC_BANK_ACCOUNT || '',
  },
}

export function supplierBlock(): string[] {
  return [`Supplier: ${BUSINESS.legalName}`, `ABN: ${BUSINESS.abn}`, BUSINESS.address, '']
}

export function bankBlock(): string[] {
  const b = BUSINESS.bank
  if (b.bsb && b.account) return ['', 'Bank details', `Account name: ${b.accountName}`, `BSB: ${b.bsb}`, `Account number: ${b.account}`]
  return ['', `Payment by bank transfer — account details provided separately.`]
}
