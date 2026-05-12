// Shared mock data for the /demo experience.
// Mirrors the real Supabase schema closely so the same components can render
// either path without branching.

import type { BscUser } from '@/lib/dal'

export const demoUser: BscUser = {
  id: 'demo-user',
  tenantId: 'demo-tenant',
  email: 'rhett@bigstarcircus.com.au',
  fullName: 'Rhett Morrow',
  role: 'owner',
}

export type DemoClass = {
  id: string
  name: string
  start_time: string
  duration_minutes: number
  discipline: string
  age_min: number | null
  age_max: number | null
  capacity: number
  coach: string
  enrolled: number
  marked: number
}

// "Today" = Wednesday (homeschool morning + fusion afternoon)
export const demoTodayClasses: DemoClass[] = [
  { id: 'c-wed-1', name: 'Homeschool Acro',     start_time: '09:30', duration_minutes: 60, discipline: 'homeschool', age_min: 5, age_max: 15, capacity: 10, coach: 'Rodrigo Hoyos', enrolled: 6, marked: 6 },
  { id: 'c-wed-2', name: 'Homeschool Circus',   start_time: '10:30', duration_minutes: 60, discipline: 'homeschool', age_min: 5, age_max: 15, capacity: 10, coach: 'Rhett Morrow',  enrolled: 8, marked: 5 },
  { id: 'c-wed-3', name: 'Homeschool Aerial',   start_time: '11:30', duration_minutes: 60, discipline: 'aerial',     age_min: 5, age_max: 15, capacity: 6,  coach: 'Tamara Seiler', enrolled: 4, marked: 0 },
  { id: 'c-wed-4', name: 'Circus Fusion 5-8',   start_time: '15:45', duration_minutes: 60, discipline: 'fusion',     age_min: 5, age_max: 8,  capacity: 10, coach: 'Charlie',       enrolled: 9, marked: 0 },
  { id: 'c-wed-5', name: 'Circus Fusion 8-15',  start_time: '16:45', duration_minutes: 60, discipline: 'fusion',     age_min: 8, age_max: 15, capacity: 10, coach: 'Aliyah',        enrolled: 7, marked: 0 },
]

export type DemoRosterEntry = {
  enrolmentId: string
  studentId: string
  firstName: string
  lastName: string | null
  age: number | null
  medical: string | null
  starTier: number
  totalStars: number
  attendanceId: string | null
  status: null | 'present' | 'late' | 'absent' | 'makeup' | 'excused'
  starsToday: number
}

// Rosters keyed by class id — only populate a few for demo purposes
export const demoRosters: Record<string, DemoRosterEntry[]> = {
  'c-wed-1': [
    roster('s1', 'Ella',   'Anderson', 7,  null, 4, 42, 'present'),
    roster('s2', 'Oscar',  'Edwards',  10, null, 5, 77, 'present'),
    roster('s3', 'Ruby',   'Edwards',  8,  null, 3, 34, 'present'),
    roster('s4', 'Arjun',  'Iyer',     11, null, 5, 91, 'late'),
    roster('s5', 'Priya',  'Iyer',     9,  null, 4, 56, 'present'),
    roster('s6', 'Rohan',  'Iyer',     7,  null, 3, 17, 'absent'),
  ],
  'c-wed-2': [
    roster('s7',  'Cooper',  'Foster',     7,  null, 2, 8,  'present'),
    roster('s8',  'Jasper',  'Davis',      9,  'Asthma — has inhaler', 3, 19, 'present'),
    roster('s9',  'Indigo',  'Henderson',  6,  null, 1, 5,  'late'),
    roster('s10', 'Hannah',  'Lee',        10, null, 3, 31, 'present'),
    roster('s11', 'Jack',    'Bennett',    8,  null, 3, 28, 'present'),
    roster('s12', 'Mia',     'Bennett',    6,  null, 2, 11, null),
    roster('s13', 'Mateo',   'Garcia',     11, 'NDIS: 1:1 support', 3, 22, null),
    roster('s14', 'Lily',    'Chen',       11, null, 4, 68, null),
  ],
  'c-wed-3': [
    roster('s14', 'Lily',    'Chen',     11, null, 4, 68, null),
    roster('s15', 'Sophie',  'Marston',  10, null, 3, 28, null),
    roster('s16', 'Aria',    'White',    9,  null, 2, 13, null),
    roster('s17', 'Iris',    'Hong',     12, null, 4, 49, null),
  ],
  'c-wed-4': [
    roster('s18', 'Cooper',  'Foster',    6,  null, 2, 8,  null),
    roster('s19', 'Indigo',  'Henderson', 6,  null, 1, 5,  null),
    roster('s20', 'Mia',     'Bennett',   6,  null, 2, 11, null),
    roster('s21', 'Hudson',  'Walker',    7,  null, 2, 9,  null),
    roster('s22', 'Maya',    'Patel',     7,  'Mild dairy intolerance', 1, 4, null),
    roster('s23', 'Lachie',  'Reilly',    5,  null, 1, 2,  null),
    roster('s24', 'Olive',   'Ko',        6,  null, 1, 3,  null),
    roster('s25', 'Ezra',    'Singh',     8,  null, 2, 12, null),
    roster('s26', 'Charlie', 'Park',      7,  null, 1, 6,  null),
  ],
  'c-wed-5': [
    roster('s27', 'Hannah',  'Lee',      10, null, 3, 31, null),
    roster('s28', 'Jasper',  'Davis',     9, 'Asthma — has inhaler', 3, 19, null),
    roster('s29', 'Sophie',  'Marston',  10, null, 3, 28, null),
    roster('s30', 'Iris',    'Hong',     12, null, 4, 49, null),
    roster('s31', 'Ruby',    'Edwards',   9, null, 3, 34, null),
    roster('s32', 'Arjun',   'Iyer',     11, null, 5, 91, null),
    roster('s33', 'Priya',   'Iyer',      9, null, 4, 56, null),
  ],
}

function roster(
  id: string,
  firstName: string,
  lastName: string,
  age: number,
  medical: string | null,
  starTier: number,
  totalStars: number,
  status: DemoRosterEntry['status']
): DemoRosterEntry {
  return {
    enrolmentId: `e-${id}`,
    studentId: id,
    firstName,
    lastName,
    age,
    medical,
    starTier,
    totalStars,
    attendanceId: status ? `a-${id}` : null,
    status,
    starsToday: 0,
  }
}

// Star ledger sample
export type DemoLedgerEntry = {
  id: string
  date: string
  student: string
  stars: number
  reason: string
  notes: string | null
  coach: string
}

export const demoLedger: DemoLedgerEntry[] = [
  { id: 'l1',  date: '2026-05-12', student: 'Ella Anderson',   stars: 2, reason: 'skill_milestone', notes: 'First cartwheel landing on her feet', coach: 'Rhett Morrow' },
  { id: 'l2',  date: '2026-05-12', student: 'Oscar Edwards',   stars: 3, reason: 'showcase',         notes: 'Lead role rehearsal — held the whole scene together', coach: 'Rhett Morrow' },
  { id: 'l3',  date: '2026-05-12', student: 'Arjun Iyer',      stars: 1, reason: 'attendance',       notes: '10 weeks straight, no absences', coach: 'Rodrigo Hoyos' },
  { id: 'l4',  date: '2026-05-11', student: 'Lily Chen',       stars: 3, reason: 'skill_milestone', notes: 'Crucifix on silks (clean)', coach: 'Rhett Morrow' },
  { id: 'l5',  date: '2026-05-11', student: 'Priya Iyer',      stars: 2, reason: 'discipline',       notes: 'Helped pack up without being asked', coach: 'Rodrigo Hoyos' },
  { id: 'l6',  date: '2026-05-10', student: 'Jack Bennett',    stars: 1, reason: 'social_tag',       notes: 'Tagged BSC on Instagram', coach: 'Rhett Morrow' },
  { id: 'l7',  date: '2026-05-09', student: 'Oscar Edwards',   stars: 2, reason: 'attendance',       notes: '10 weeks straight, no absences', coach: 'Rodrigo Hoyos' },
  { id: 'l8',  date: '2026-05-08', student: 'Ruby Edwards',    stars: 1, reason: 'discipline',       notes: 'Quietest listener in class', coach: 'Rhett Morrow' },
  { id: 'l9',  date: '2026-05-07', student: 'Mateo Garcia',    stars: 2, reason: 'skill_milestone', notes: 'First handstand against the wall', coach: 'Rhett Morrow' },
  { id: 'l10', date: '2026-05-05', student: 'Hannah Lee',      stars: 1, reason: 'referral',         notes: 'Family referred the Cooper kids', coach: 'Rhett Morrow' },
]

export const TIER_NAMES = ['', 'Spark', 'Shining', 'Rising', 'Star', 'BigStar Trainee']
export const TIER_THRESHOLDS = [0, 0, 6, 16, 36, 76]

// Demo students + families — flat list for the /demo/students + /demo/families pages.

export type DemoStudent = {
  id: string
  firstName: string
  lastName: string
  age: number
  familyId: string
  familyName: string
  lifecycle: string
  totalStars: number
  starTier: number
  traineeStatus: 'not_yet' | 'invited' | 'active'
  medical: string | null
}

export type DemoFamily = {
  id: string
  name: string
  primaryParent: string
  email: string
  phone: string
  lifecycle: string
  source: string
  weeklyFee: number
  studentCount: number
  tags: string[]
  notes: string | null
}

export const demoFamilies: DemoFamily[] = [
  { id: 'f1',  name: 'Anderson',   primaryParent: 'Sarah Anderson',   email: 'sarah.anderson@example.com',   phone: '0411 111 111', lifecycle: 'active', source: 'fb_ad',         weeklyFee: 27,  studentCount: 1, tags: ['homeschool'], notes: 'Loves homeschool morning — quiet, focused.' },
  { id: 'f2',  name: 'Bennett',    primaryParent: 'Mike Bennett',     email: 'mike.bennett@example.com',     phone: '0411 222 222', lifecycle: 'active', source: 'word_of_mouth', weeklyFee: 54,  studentCount: 2, tags: ['siblings'], notes: null },
  { id: 'f3',  name: 'Chen',       primaryParent: 'Lisa Chen',        email: 'lisa.chen@example.com',        phone: '0411 333 333', lifecycle: 'active', source: 'instagram',     weeklyFee: 27,  studentCount: 1, tags: ['aerial'], notes: 'Lily is on the aerial trainee track — invite to Show Programme term 3.' },
  { id: 'f4',  name: 'Davis',      primaryParent: 'Karen Davis',      email: 'karen.davis@example.com',      phone: '0411 444 444', lifecycle: 'active', source: 'google',        weeklyFee: 27,  studentCount: 1, tags: [], notes: 'Jasper has asthma — inhaler in his bag.' },
  { id: 'f5',  name: 'Edwards',    primaryParent: 'Tom Edwards',      email: 'tom.edwards@example.com',      phone: '0411 555 555', lifecycle: 'active', source: 'word_of_mouth', weeklyFee: 54,  studentCount: 2, tags: ['siblings', 'homeschool'], notes: null },
  { id: 'f6',  name: 'Foster',     primaryParent: 'Jen Foster',       email: 'jen.foster@example.com',       phone: '0411 666 666', lifecycle: 'active', source: 'school',        weeklyFee: 27,  studentCount: 1, tags: [], notes: null },
  { id: 'f7',  name: 'Garcia',     primaryParent: 'Carlos Garcia',    email: 'carlos.garcia@example.com',    phone: '0411 777 777', lifecycle: 'active', source: 'fb_ad',         weeklyFee: 27,  studentCount: 1, tags: ['ndis'], notes: 'NDIS plan-managed. 1:1 support required during class.' },
  { id: 'f8',  name: 'Henderson',  primaryParent: 'Amy Henderson',    email: 'amy.henderson@example.com',    phone: '0411 888 888', lifecycle: 'active', source: 'walkin',        weeklyFee: 27,  studentCount: 1, tags: [], notes: null },
  { id: 'f9',  name: 'Iyer',       primaryParent: 'Priya Iyer',       email: 'priya.iyer@example.com',       phone: '0411 999 999', lifecycle: 'active', source: 'open_day',      weeklyFee: 81,  studentCount: 3, tags: ['siblings'], notes: 'Three kids — Arjun is on the Trainee track.' },
  { id: 'f10', name: 'Jackson',    primaryParent: 'Marcus Jackson',   email: 'marcus.jackson@example.com',   phone: '0412 111 111', lifecycle: 'active', source: 'word_of_mouth', weeklyFee: 30,  studentCount: 1, tags: ['adult'], notes: 'Adult class on Monday nights.' },
  { id: 'f11', name: 'Kim',        primaryParent: 'Soo Kim',          email: 'soo.kim@example.com',          phone: '0412 222 222', lifecycle: 'active', source: 'instagram',     weeklyFee: 20,  studentCount: 1, tags: ['toddler'], notes: null },
  { id: 'f12', name: 'Lee',        primaryParent: 'David Lee',        email: 'david.lee@example.com',        phone: '0412 333 333', lifecycle: 'active', source: 'fb_ad',         weeklyFee: 27,  studentCount: 1, tags: [], notes: null },
  { id: 'f13', name: 'Murphy',     primaryParent: 'Brigid Murphy',    email: 'brigid.murphy@example.com',    phone: '0412 444 444', lifecycle: 'trial',  source: 'instagram',     weeklyFee: 0,   studentCount: 1, tags: [], notes: 'Trial class booked for Sat 17 May.' },
  { id: 'f14', name: 'Nguyen',     primaryParent: 'Linh Nguyen',      email: 'linh.nguyen@example.com',      phone: '0412 555 555', lifecycle: 'trial',  source: 'google',        weeklyFee: 0,   studentCount: 1, tags: [], notes: null },
  { id: 'f15', name: 'Okafor',     primaryParent: 'Chioma Okafor',    email: 'chioma.okafor@example.com',    phone: '0412 666 666', lifecycle: 'lead',   source: 'fb_ad',         weeklyFee: 0,   studentCount: 0, tags: [], notes: 'Enquired via FB ad — interested in aerial.' },
  { id: 'f16', name: 'Patel',      primaryParent: 'Anjali Patel',     email: 'anjali.patel@example.com',     phone: '0412 777 777', lifecycle: 'lead',   source: 'walkin',        weeklyFee: 0,   studentCount: 0, tags: ['ndis'], notes: 'NDIS plan-managed; awaiting service agreement.' },
  { id: 'f17', name: 'Quinn',      primaryParent: 'Sean Quinn',       email: 'sean.quinn@example.com',       phone: '0412 888 888', lifecycle: 'lead',   source: 'instagram',     weeklyFee: 0,   studentCount: 0, tags: [], notes: null },
  { id: 'f18', name: 'Roberts',    primaryParent: 'Helen Roberts',    email: 'helen.roberts@example.com',    phone: '0412 999 999', lifecycle: 'past',   source: 'school',        weeklyFee: 0,   studentCount: 0, tags: [], notes: 'Moved interstate end of 2025.' },
]

export const demoStudents: DemoStudent[] = [
  { id: 's1',  firstName: 'Ella',    lastName: 'Anderson',   age: 7,  familyId: 'f1',  familyName: 'Anderson',   lifecycle: 'active', totalStars: 42, starTier: 4, traineeStatus: 'not_yet', medical: null },
  { id: 's2',  firstName: 'Jack',    lastName: 'Bennett',    age: 8,  familyId: 'f2',  familyName: 'Bennett',    lifecycle: 'active', totalStars: 28, starTier: 3, traineeStatus: 'not_yet', medical: null },
  { id: 's3',  firstName: 'Mia',     lastName: 'Bennett',    age: 6,  familyId: 'f2',  familyName: 'Bennett',    lifecycle: 'active', totalStars: 11, starTier: 2, traineeStatus: 'not_yet', medical: null },
  { id: 's4',  firstName: 'Lily',    lastName: 'Chen',       age: 11, familyId: 'f3',  familyName: 'Chen',       lifecycle: 'active', totalStars: 68, starTier: 4, traineeStatus: 'invited', medical: null },
  { id: 's5',  firstName: 'Jasper',  lastName: 'Davis',      age: 9,  familyId: 'f4',  familyName: 'Davis',      lifecycle: 'active', totalStars: 19, starTier: 3, traineeStatus: 'not_yet', medical: 'Asthma — has inhaler' },
  { id: 's6',  firstName: 'Oscar',   lastName: 'Edwards',    age: 10, familyId: 'f5',  familyName: 'Edwards',    lifecycle: 'active', totalStars: 77, starTier: 5, traineeStatus: 'active',  medical: null },
  { id: 's7',  firstName: 'Ruby',    lastName: 'Edwards',    age: 8,  familyId: 'f5',  familyName: 'Edwards',    lifecycle: 'active', totalStars: 34, starTier: 3, traineeStatus: 'not_yet', medical: null },
  { id: 's8',  firstName: 'Cooper',  lastName: 'Foster',     age: 7,  familyId: 'f6',  familyName: 'Foster',     lifecycle: 'active', totalStars: 8,  starTier: 2, traineeStatus: 'not_yet', medical: null },
  { id: 's9',  firstName: 'Mateo',   lastName: 'Garcia',     age: 11, familyId: 'f7',  familyName: 'Garcia',     lifecycle: 'active', totalStars: 22, starTier: 3, traineeStatus: 'not_yet', medical: 'NDIS — 1:1 support during class' },
  { id: 's10', firstName: 'Indigo',  lastName: 'Henderson',  age: 6,  familyId: 'f8',  familyName: 'Henderson',  lifecycle: 'active', totalStars: 5,  starTier: 1, traineeStatus: 'not_yet', medical: null },
  { id: 's11', firstName: 'Arjun',   lastName: 'Iyer',       age: 11, familyId: 'f9',  familyName: 'Iyer',       lifecycle: 'active', totalStars: 91, starTier: 5, traineeStatus: 'active',  medical: null },
  { id: 's12', firstName: 'Priya',   lastName: 'Iyer',       age: 9,  familyId: 'f9',  familyName: 'Iyer',       lifecycle: 'active', totalStars: 56, starTier: 4, traineeStatus: 'invited', medical: null },
  { id: 's13', firstName: 'Rohan',   lastName: 'Iyer',       age: 7,  familyId: 'f9',  familyName: 'Iyer',       lifecycle: 'active', totalStars: 17, starTier: 3, traineeStatus: 'not_yet', medical: null },
  { id: 's14', firstName: 'Marcus',  lastName: 'Jackson',    age: 33, familyId: 'f10', familyName: 'Jackson',    lifecycle: 'active', totalStars: 3,  starTier: 1, traineeStatus: 'not_yet', medical: null },
  { id: 's15', firstName: 'Sora',    lastName: 'Kim',        age: 2,  familyId: 'f11', familyName: 'Kim',        lifecycle: 'active', totalStars: 4,  starTier: 1, traineeStatus: 'not_yet', medical: null },
  { id: 's16', firstName: 'Hannah',  lastName: 'Lee',        age: 10, familyId: 'f12', familyName: 'Lee',        lifecycle: 'active', totalStars: 31, starTier: 3, traineeStatus: 'not_yet', medical: null },
  { id: 's17', firstName: 'Olivia',  lastName: 'Murphy',     age: 8,  familyId: 'f13', familyName: 'Murphy',     lifecycle: 'trial',  totalStars: 0,  starTier: 1, traineeStatus: 'not_yet', medical: null },
  { id: 's18', firstName: 'Liam',    lastName: 'Nguyen',     age: 7,  familyId: 'f14', familyName: 'Nguyen',     lifecycle: 'trial',  totalStars: 0,  starTier: 1, traineeStatus: 'not_yet', medical: null },
]
