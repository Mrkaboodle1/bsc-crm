// Centralised env-var loading + validation.

import 'dotenv/config'

function need(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing required env var: ${key}`)
  return v
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const config = {
  // Claude
  anthropic: {
    apiKey: need('ANTHROPIC_API_KEY'),
    model: optional('JACKY_MODEL', 'claude-sonnet-4-5'),
    maxTokens: parseInt(optional('JACKY_MAX_TOKENS', '4096'), 10),
  },

  // Email — admin@bigstarcircus.com.au
  email: {
    imap: {
      host: optional('ADMIN_IMAP_HOST', 'imap.titan.email'),
      port: parseInt(optional('ADMIN_IMAP_PORT', '993'), 10),
      user: need('ADMIN_IMAP_USER'),
      password: need('ADMIN_IMAP_PASSWORD'),
    },
    smtp: {
      host: optional('ADMIN_SMTP_HOST', 'smtp.titan.email'),
      port: parseInt(optional('ADMIN_SMTP_PORT', '465'), 10),
      user: need('ADMIN_SMTP_USER'),
      password: need('ADMIN_SMTP_PASSWORD'),
    },
    fromName: optional('ADMIN_FROM_NAME', 'Jacky · Big Star Circus'),
    fromEmail: optional('ADMIN_FROM_EMAIL', 'admin@bigstarcircus.com.au'),
  },

  // Supabase
  supabase: {
    url: need('SUPABASE_URL'),
    serviceRoleKey: need('SUPABASE_SERVICE_ROLE_KEY'),
    tenantSlug: optional('SUPABASE_TENANT_SLUG', 'bigstarcircus'),
  },

  // Operating mode
  stage: parseInt(optional('JACKY_STAGE', '1'), 10) as 1 | 2 | 3,
  dryRun: optional('JACKY_DRY_RUN', 'false') === 'true',
  timezone: optional('JACKY_TZ', 'Australia/Brisbane'),

  // Logging
  logLevel: optional('LOG_LEVEL', 'info'),
  logFile: optional('LOG_FILE', ''),
}

export type Config = typeof config
