// Word-timed cursor paths for each Learning Centre module. Timestamps were
// estimated from each script's word positions at ~2.6 words/second (Jacky's
// real HeyGen pace). x and y are % of the demo iframe; `click` shows a
// yellow ripple at that point — used when she says "tap" / "click" / "hit".
//
// To tweak timing: play the module, note the exact second the word lands,
// and edit atSec here. Cheaper than re-rendering with HeyGen.

import type { TrainingModule } from './modules'

type Spot = { atSec: number; x: number; y: number; click?: boolean; label?: string }

export const CURSOR_PATHS: Record<string, Spot[]> = {
  // Module 1 — Welcome (general intro, no specific UI calls)
  welcome: [
    { atSec:  2,   x: 50, y: 18, label: 'top of dashboard' },
    { atSec:  7,   x: 13, y: 30, click: true, label: 'inbox (admin email)' },
    { atSec: 11,   x: 55, y: 42, label: 'drafted reply' },
    { atSec: 14,   x: 70, y: 50, click: true, label: 'approve tap' },
    { atSec: 20,   x: 13, y: 22, label: 'sidebar — you in charge' },
    { atSec: 26,   x: 50, y: 60, label: 'every part of the system' },
  ],

  // Module 2 — Dashboard ("five tiles", "pending approvals", "today's classes", "Jacky Today")
  dashboard: [
    { atSec:  3,   x: 50, y: 16, label: 'top of dashboard' },
    { atSec:  6,   x: 15, y: 28, click: true, label: 'Pending Approval tile' },
    { atSec:  9,   x: 32, y: 28, label: 'Families tile' },
    { atSec: 11,   x: 48, y: 28, label: 'Students tile' },
    { atSec: 13,   x: 64, y: 28, label: 'Active Classes tile' },
    { atSec: 15,   x: 80, y: 28, label: 'Open Leads tile' },
    { atSec: 18,   x: 15, y: 28, click: true, label: 'red Pending number' },
    { atSec: 22,   x: 40, y: 58, click: true, label: "today's class row" },
    { atSec: 27,   x: 78, y: 50, label: 'Jacky Today card' },
  ],

  // Module 3 — Roll Call (grid, tap class, tap cell, Mark All, info, star)
  'roll-call': [
    { atSec:  2,   x: 13, y: 33, click: true, label: 'sidebar Roll Call' },
    { atSec:  5,   x: 50, y: 35, label: 'week grid' },
    { atSec:  8,   x: 50, y: 25, label: 'today highlighted' },
    { atSec: 11,   x: 42, y: 38, click: true, label: 'tap any class' },
    { atSec: 15,   x: 40, y: 55, click: true, label: 'tap a cell' },
    { atSec: 19,   x: 70, y: 80, click: true, label: 'Mark All Here Today' },
    { atSec: 24,   x: 60, y: 58, click: true, label: 'info bubble' },
    { atSec: 28,   x: 65, y: 65, click: true, label: 'award a star' },
  ],

  // Module 4 — Contacts (search bar, filter pills, Smart Lists, click contact)
  contacts: [
    { atSec:  2,   x: 13, y: 38, click: true, label: 'sidebar Contacts' },
    { atSec:  6,   x: 50, y: 14, label: '~1700 contacts' },
    { atSec: 10,   x: 45, y: 18, click: true, label: 'search bar' },
    { atSec: 14,   x: 65, y: 25, label: 'filter pills' },
    { atSec: 18,   x: 35, y: 28, click: true, label: 'Smart Lists tab' },
    { atSec: 22,   x: 55, y: 28, click: true, label: 'Add Smart List' },
    { atSec: 27,   x: 45, y: 60, click: true, label: 'click any contact' },
  ],

  // Module 5 — Inbox (approve tick, edit pencil, reject cross)
  inbox: [
    { atSec:  2,   x: 13, y: 30, click: true, label: 'sidebar Inbox' },
    { atSec:  6,   x: 50, y: 35, label: 'draft card' },
    { atSec: 10,   x: 72, y: 40, click: true, label: 'green tick approve' },
    { atSec: 14,   x: 72, y: 50, click: true, label: 'pencil edit' },
    { atSec: 19,   x: 72, y: 60, click: true, label: 'red cross reject' },
    { atSec: 25,   x: 50, y: 75, label: "nothing sends without you" },
  ],

  // Module 6 — Bulk Send (channel, filter, message, tokens, Create Drafts)
  'bulk-send': [
    { atSec:  2,   x: 13, y: 45, click: true, label: 'sidebar Marketing' },
    { atSec:  5,   x: 40, y: 25, click: true, label: 'channel email/SMS' },
    { atSec:  9,   x: 60, y: 32, label: 'filter recipients' },
    { atSec: 13,   x: 50, y: 50, label: 'message field' },
    { atSec: 17,   x: 55, y: 50, label: '{first_name} token' },
    { atSec: 22,   x: 50, y: 82, click: true, label: 'Create Drafts' },
  ],

  // Module 7 — Ask Jacky chat
  'jacky-chat': [
    { atSec:  2,   x: 13, y: 22, click: true, label: 'sidebar Ask Jacky' },
    { atSec:  6,   x: 50, y: 50, label: 'chat area' },
    { atSec: 10,   x: 50, y: 70, label: 'draft a follow-up' },
    { atSec: 14,   x: 50, y: 80, click: true, label: 'type a question' },
    { atSec: 19,   x: 80, y: 80, click: true, label: 'microphone button' },
  ],

  // Module 8 — Tasks
  tasks: [
    { atSec:  2,   x: 13, y: 50, click: true, label: 'sidebar Tasks' },
    { atSec:  5,   x: 75, y: 16, click: true, label: 'Add task button' },
    { atSec:  9,   x: 50, y: 30, label: 'title + due date + priority' },
    { atSec: 13,   x: 50, y: 22, click: true, label: 'filter Open/Today/Overdue' },
    { atSec: 18,   x: 15, y: 55, click: true, label: 'checkbox done' },
  ],

  // Module 9 — Companies
  companies: [
    { atSec:  2,   x: 13, y: 50, click: true, label: 'sidebar Companies' },
    { atSec:  6,   x: 50, y: 30, label: 'school row' },
    { atSec: 10,   x: 50, y: 40, label: 'NDIS plan manager row' },
    { atSec: 14,   x: 50, y: 50, label: 'supplier / venue row' },
    { atSec: 18,   x: 60, y: 60, label: 'linked-contact panel' },
    { atSec: 22,   x: 35, y: 22, click: true, label: 'category picker' },
  ],

  // Module 10 — Reports
  reports: [
    { atSec:  2,   x: 13, y: 60, click: true, label: 'Bulk Actions log' },
    { atSec:  6,   x: 50, y: 40, label: 'campaign rows' },
    { atSec: 11,   x: 50, y: 60, label: "Jacky's daily activity" },
    { atSec: 16,   x: 78, y: 28, label: 'Jacky Today card' },
    { atSec: 22,   x: 50, y: 70, label: 'roll-vs-billing report' },
  ],

  // Module 11 — Tips (music, voice mic, audit log)
  tips: [
    { atSec:  3,   x: 92, y: 90, click: true, label: 'floating Music button' },
    { atSec:  8,   x: 78, y: 80, click: true, label: 'voice mic in Ask Jacky' },
    { atSec: 13,   x: 50, y: 50, label: 'audit log' },
    { atSec: 18,   x: 50, y: 75, label: 'every send waits for you' },
    { atSec: 24,   x: 50, y: 30, label: 'trust the system' },
  ],
}

export function pathFor(module: TrainingModule): Spot[] | undefined {
  return CURSOR_PATHS[module.id]
}
