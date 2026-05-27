// /star-rewards — Star Reward design library.
// Lists the 11 original Canva designs from the BigStar Star Reward folder so
// coaches and admins can open the master print copy in one click. These are
// the untouched originals (not the AI-edited variants) — single source of
// truth lives in Canva folder FAFNWiFNCnM.

import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import {
  Star, ExternalLink, FileText, Trophy, BookOpen, Sparkles,
  Dumbbell, type LucideIcon,
} from 'lucide-react'

type DesignInfo = {
  title: string
  desc: string
  designId: string
  viewUrl: string
  pages: number
  Icon: LucideIcon
}

type Section = {
  id: string
  title: string
  description: string
  Icon: LucideIcon
  designs: DesignInfo[]
}

const SECTIONS: Section[] = [
  {
    id: 'skill-cards',
    title: 'Skill Cards',
    description: 'The main per-discipline progression cards. One row per level — student name, class, photo per skill, teacher sign-off.',
    Icon: Trophy,
    designs: [
      {
        title: 'Gymnastic Skill Card',
        desc: 'Pre-Conditioning + Levels 1–5 + Performance Troupe finale. 7 pages.',
        designId: 'DAGgsy0NeFo',
        viewUrl: 'https://www.canva.com/d/5a0lWtu4Esa6l8v',
        pages: 7,
        Icon: Trophy,
      },
      {
        title: 'Aerial Skill Card',
        desc: 'Silks, lyra, trapeze progression. 7 pages.',
        designId: 'DAGTcJAhKgo',
        viewUrl: 'https://www.canva.com/d/ag_CH0J5qN2wFWn',
        pages: 7,
        Icon: Trophy,
      },
      {
        title: 'Juggling Skill Card',
        desc: 'Toss patterns and progression skills. 6 pages.',
        designId: 'DAGRwgwmWb4',
        viewUrl: 'https://www.canva.com/d/mE_43LIw-IlNTQ3',
        pages: 6,
        Icon: Trophy,
      },
      {
        title: 'Hoops Skill Cards',
        desc: 'Aerial hoop / lyra progression. 7 pages.',
        designId: 'DAGQHswEo3E',
        viewUrl: 'https://www.canva.com/d/Vrh4dhmcPIc2Cb0',
        pages: 7,
        Icon: Trophy,
      },
      {
        title: 'Flower Stick Skill Cards',
        desc: 'Flower / devil stick progression. 6 pages.',
        designId: 'DAGRvDjui1w',
        viewUrl: 'https://www.canva.com/d/cmnb9e-AJT-bUhV',
        pages: 6,
        Icon: Trophy,
      },
    ],
  },
  {
    id: 'progress-cards',
    title: 'Progress Cards',
    description: 'Supplementary cards used alongside the Skill Cards.',
    Icon: Sparkles,
    designs: [
      {
        title: 'Silk / Lyra Progress Cards',
        desc: 'Supplementary aerial progression detail. 6 pages.',
        designId: 'DAFpGoqCDw4',
        viewUrl: 'https://www.canva.com/d/xWVQqAnHYYkIbAN',
        pages: 6,
        Icon: Sparkles,
      },
      {
        title: 'Acrobatics Progress Cards',
        desc: 'Acro pair and group work progression. 10 pages.',
        designId: 'DAGQH2ipfrw',
        viewUrl: 'https://www.canva.com/d/TuCw5KwnL6-xP_f',
        pages: 10,
        Icon: Sparkles,
      },
      {
        title: 'JUGGLING Progress Cards (Long)',
        desc: 'Extended juggling progression — every skill broken down. 13 pages.',
        designId: 'DAGNWx57isQ',
        viewUrl: 'https://www.canva.com/d/jADxsYLlmTgNu7d',
        pages: 13,
        Icon: Sparkles,
      },
      {
        title: 'Strength Challenge Cards',
        desc: 'Conditioning challenges to award stars. 4 pages.',
        designId: 'DAGKAoL6nYI',
        viewUrl: 'https://www.canva.com/d/eCColfReqLUyean',
        pages: 4,
        Icon: Dumbbell,
      },
    ],
  },
  {
    id: 'books',
    title: 'Books & Decoration',
    description: 'Stars challenge book and studio wall decor.',
    Icon: BookOpen,
    designs: [
      {
        title: 'BigStar Circus Stars Challenge Book 1',
        desc: 'The Stars Challenge booklet that families take home. 8 pages.',
        designId: 'DAGxH451IRs',
        viewUrl: 'https://www.canva.com/d/6dAnS_0YOtxEMvb',
        pages: 8,
        Icon: BookOpen,
      },
      {
        title: 'A3 Decoration',
        desc: 'Large-format studio wall decor for the Star Rewards system. 5 pages.',
        designId: 'DAGh0woAP_w',
        viewUrl: 'https://www.canva.com/d/wD8p859yl58UKIc',
        pages: 5,
        Icon: FileText,
      },
    ],
  },
]

export default async function StarRewardsPage() {
  const user = await verifySession()

  const totalDesigns = SECTIONS.reduce((n, s) => n + s.designs.length, 0)
  const totalPages = SECTIONS.reduce(
    (n, s) => n + s.designs.reduce((m, d) => m + d.pages, 0),
    0,
  )

  return (
    <DashboardShell
      user={user}
      currentPath="/star-rewards"
      pageTitle="Star Reward Designs"
      pageSubtitle="The original Canva print masters for every BSC Star Reward card."
      pageActions={
        <a
          href="https://www.canva.com/folder/FAFNWiFNCnM"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-colors"
        >
          <ExternalLink size={14} />
          Open Canva folder
        </a>
      }
    >
      {/* Slim summary banner */}
      <div className="bg-zinc-950 text-white rounded-xl p-5 mb-8 border border-zinc-800 flex items-center gap-5 flex-wrap">
        <div className="w-12 h-12 rounded-lg bg-[#FFC107] flex items-center justify-center shrink-0">
          <Star size={22} className="text-zinc-900 fill-zinc-900" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold tracking-tight">Star Reward Library</h2>
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
            Print masters for every Star Reward card BSC uses. Click any tile to open the
            original in Canva — edit and print from there. Don&rsquo;t modify these without
            telling Rhett.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          <span className="inline-flex items-center gap-1.5"><FileText size={12} /> {totalDesigns} designs</span>
          <span className="text-zinc-700">·</span>
          <span className="inline-flex items-center gap-1.5"><BookOpen size={12} /> {totalPages} pages</span>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.id}>
            <SectionHeader section={s} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {s.designs.map((d) => (
                <DesignRow key={d.designId} design={d} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 text-xs text-zinc-500 border-t border-zinc-200 pt-4">
        Source: Canva folder <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-[11px]">FAFNWiFNCnM</code>
        {' '}— the originals, not the AI-generated variants.
      </div>
    </DashboardShell>
  )
}

function SectionHeader({ section }: { section: Section }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-3 pb-2 border-b border-zinc-200">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
          <section.Icon size={16} />
        </span>
        <div>
          <h2 className="text-base font-bold text-zinc-900">{section.title}</h2>
          <p className="text-xs text-zinc-500 leading-snug mt-0.5">{section.description}</p>
        </div>
      </div>
      <span className="hidden sm:inline-flex shrink-0 items-center text-[10px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
        {section.designs.length} {section.designs.length === 1 ? 'design' : 'designs'}
      </span>
    </div>
  )
}

function DesignRow({ design }: { design: DesignInfo }) {
  return (
    <div className="group bg-white rounded-lg border border-zinc-200 px-4 py-3.5 hover:border-zinc-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        <span className="w-9 h-9 rounded-md bg-amber-50 text-[#B45309] flex items-center justify-center shrink-0 ring-1 ring-inset ring-amber-100">
          <design.Icon size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">
            {design.pages} {design.pages === 1 ? 'page' : 'pages'} · Canva
          </div>
          <div className="text-sm font-semibold text-zinc-900 leading-tight">
            {design.title}
          </div>
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-snug">{design.desc}</p>

          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <a
              href={design.viewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-md transition-colors"
              title="Open the original Canva design in a new tab"
            >
              <ExternalLink size={12} /> Open in Canva
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
