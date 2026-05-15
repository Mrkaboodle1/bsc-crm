#!/usr/bin/env node
// One-shot: prompt for the new Anthropic API key and patch .env.

import { promises as fs } from 'node:fs'
import readline from 'node:readline/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ENV_PATH = path.join(HERE, '.env')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

console.log('\n🔑 Replace the Anthropic API key in .env\n')
const key = (await rl.question('Paste the NEW key (starts with sk-ant-...):\n> ')).trim()
rl.close()

if (!key) {
  console.error('❌ No key entered. Aborting.')
  process.exit(1)
}

let content = await fs.readFile(ENV_PATH, 'utf8')
// Remove ALL existing ANTHROPIC_API_KEY lines (in case there are duplicates)
content = content
  .split('\n')
  .filter((line) => !/^ANTHROPIC_API_KEY=/.test(line))
  .join('\n')
// Add the new key at the top of the Anthropic section, OR just append
if (content.includes('# Claude / Anthropic')) {
  content = content.replace(/# Claude \/ Anthropic\n/, `# Claude / Anthropic\nANTHROPIC_API_KEY=${key}\n`)
} else {
  content += `\nANTHROPIC_API_KEY=${key}\n`
}
await fs.writeFile(ENV_PATH, content, 'utf8')
console.log('\n✅ .env updated. Old key removed, new key in place.\n')
