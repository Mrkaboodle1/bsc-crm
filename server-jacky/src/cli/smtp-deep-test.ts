#!/usr/bin/env node
// Comprehensive Titan SMTP test. Tries multiple host/port/auth combos and prints
// the SMTP transcript so we can see exactly where auth fails.

import nodemailer from 'nodemailer'
import { config } from '../config.js'

const user = config.email.smtp.user
const pass = config.email.smtp.password

const combos = [
  { host: 'smtp.titan.email', port: 465, secure: true,  label: 'titan:465 SSL' },
  { host: 'smtp.titan.email', port: 587, secure: false, label: 'titan:587 STARTTLS' },
  { host: 'smtp.titan.email', port: 587, secure: false, label: 'titan:587 STARTTLS (LOGIN)', authMethod: 'LOGIN' },
  { host: 'smtp.titan.email', port: 587, secure: false, label: 'titan:587 STARTTLS (PLAIN)', authMethod: 'PLAIN' },
]

console.log(`\nTrying SMTP with user=${user}, password length=${pass.length}\n`)

for (const c of combos) {
  console.log('━'.repeat(60))
  console.log(`${c.label}`)
  const t = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user, pass },
    authMethod: (c as { authMethod?: string }).authMethod,
    logger: false,
    debug: false,
    tls: { rejectUnauthorized: true },
  })
  try {
    const ok = await t.verify()
    console.log(`  ✅ verify() returned ${ok}`)
  } catch (e) {
    console.log(`  ❌ ${(e as Error).message}`)
  }
  t.close()
}
process.exit(0)
