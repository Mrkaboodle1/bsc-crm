#!/usr/bin/env node
// Updates BOTH ADMIN_IMAP_PASSWORD and ADMIN_SMTP_PASSWORD in .env
// to the same value (Titan uses one password for both).

import { promises as fs } from 'node:fs'
import readline from 'node:readline/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ENV_PATH = path.join(HERE, '.env')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

console.log('\n🔑 Update admin@bigstarcircus.com.au password in .env\n')
const pwd = (await rl.question('Paste the NEW admin@ Titan password:\n> ')).trim()
rl.close()

if (!pwd) {
  console.error('❌ No password entered. Aborting.')
  process.exit(1)
}

let content = await fs.readFile(ENV_PATH, 'utf8')
// Replace ALL existing ADMIN_*_PASSWORD lines
content = content
  .split('\n')
  .map((line) => {
    if (line.startsWith('ADMIN_IMAP_PASSWORD=')) return `ADMIN_IMAP_PASSWORD=${pwd}`
    if (line.startsWith('ADMIN_SMTP_PASSWORD=')) return `ADMIN_SMTP_PASSWORD=${pwd}`
    return line
  })
  .join('\n')

await fs.writeFile(ENV_PATH, content, 'utf8')
console.log('\n✅ .env updated — admin@ password refreshed for both IMAP and SMTP.\n')
