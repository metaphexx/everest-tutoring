'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Search, GraduationCap, User, BookOpen, Mail, Phone, MessageCircleQuestion, Sparkles, RefreshCw } from 'lucide-react'
import { adminSearch, semanticAdminSearch, rebuildSearchIndex, type SearchResults, type SemanticResults } from './actions'

const EMPTY: SearchResults = { students: [], people: [], classes: [], questions: [] }
const EMPTY_SEM: SemanticResults = { hits: [], live: false, indexed: 0 }
const ENTITY_LABEL: Record<string, string> = { Student: 'Student', Question: 'Question', StudentNote: 'Note', TutorResource: 'Resource', Subject: 'Class' }

export default function SearchClient() {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<SearchResults>(EMPTY)
  const [sem, setSem] = useState<SemanticResults>(EMPTY_SEM)
  const [pending, start] = useTransition()
  const [rebuilding, startRebuild] = useTransition()
  const seq = useRef(0)

  // Debounced search as you type - exact (fast) + semantic (meaning) in parallel.
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return
    const id = ++seq.current
    const t = setTimeout(() => {
      start(async () => {
        const [r, s] = await Promise.all([adminSearch(term), semanticAdminSearch(term)])
        if (id === seq.current) { setRes(r); setSem(s) }
      })
    }, 220)
    return () => clearTimeout(t)
  }, [q])

  function rebuild() {
    startRebuild(async () => {
      const r = await rebuildSearchIndex()
      toast.success(`Indexed ${r.indexed} records.`, { description: `Embeddings model: ${r.model}` })
      if (q.trim().length >= 2) { const s = await semanticAdminSearch(q.trim()); setSem(s) }
    })
  }

  const hasQuery = q.trim().length >= 2
  // Only show results for the current (>= 2 char) query, so deleting back to a
  // short query hides stale results without setting state inside the effect.
  const shown = hasQuery ? res : EMPTY
  const total = shown.students.length + shown.people.length + shown.classes.length + shown.questions.length

  return (
    <div>
      <div className="glass-card glass-card-pad">
        <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(255,255,255,.7)', border: '1px solid rgba(15,42,79,.12)' }}>
          <Search size={18} className="text-primary flex-shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search students, parents, tutors (name, email, phone) or classes…"
            className="w-full bg-transparent outline-none text-sm text-dark"
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-2.5">
          <button type="button" onClick={rebuild} disabled={rebuilding} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 min-h-9 rounded-lg disabled:opacity-60 whitespace-nowrap flex-shrink-0" style={{ background: 'rgba(124,58,237,.1)', color: '#7C3AED' }}>
            <RefreshCw size={12} className={rebuilding ? 'animate-spin' : ''} /> {rebuilding ? 'Indexing…' : 'Rebuild semantic index'}
          </button>
          <span className="text-xs text-[var(--muted)] sm:ml-auto">{sem.live ? 'Voyage embeddings' : 'Local embeddings (set VOYAGE_API_KEY for deeper meaning)'}</span>
        </div>
      </div>

      {hasQuery && (
        <div className="mt-4 space-y-4">
          {pending && total === 0 && <p className="text-sm text-slate-500 px-1">Searching…</p>}
          {!pending && total === 0 && <p className="text-sm text-slate-500 px-1">No matches for “{q.trim()}”.</p>}

          {shown.students.length > 0 && (
            <Section title="Students" Icon={GraduationCap}>
              {shown.students.map((s) => (
                <Link key={s.id} href={`/admin/students/${s.id}`} className="result">
                  <span className="result-main">{s.name}</span>
                  <span className="result-meta">{s.meta}</span>
                  {s.status !== 'active' && <span className="result-badge">{s.status}</span>}
                </Link>
              ))}
            </Section>
          )}

          {shown.people.length > 0 && (
            <Section title="Parents & tutors" Icon={User}>
              {shown.people.map((p) => {
                const href = p.studentId ? `/admin/students/${p.studentId}` : p.role === 'tutor' ? '/admin/classes' : '/admin/students'
                return (
                  <Link key={p.id} href={href} className="result">
                    <span className="result-main">{p.name} <span className="result-role">{p.role}</span></span>
                    <span className="result-meta flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="inline-flex items-center gap-1"><Mail size={12} />{p.email}</span>
                      {p.phone && <span className="inline-flex items-center gap-1"><Phone size={12} />{p.phone}</span>}
                    </span>
                  </Link>
                )
              })}
            </Section>
          )}

          {shown.classes.length > 0 && (
            <Section title="Classes" Icon={BookOpen}>
              {shown.classes.map((c) => (
                <Link key={c.id} href={`/admin/classes/${c.id}`} className="result">
                  <span className="result-main">{c.name}</span>
                  <span className="result-meta">{c.meta}</span>
                </Link>
              ))}
            </Section>
          )}

          {shown.questions.length > 0 && (
            <Section title="Questions" Icon={MessageCircleQuestion}>
              {shown.questions.map((qn) => (
                <Link key={qn.id} href="/admin/questions" className="result">
                  <span className="result-main">{qn.title}</span>
                  <span className="result-meta">{qn.meta}</span>
                </Link>
              ))}
            </Section>
          )}

          {sem.hits.length > 0 && (
            <Section title="Related by meaning" Icon={Sparkles}>
              {sem.hits.map((h) => (
                <Link key={`${h.entity}:${h.entityId}`} href={h.url ?? '#'} className="result">
                  <span className="result-main">{h.title} <span className="result-role">{ENTITY_LABEL[h.entity] ?? h.entity}</span></span>
                  <span className="result-meta">{h.snippet}</span>
                </Link>
              ))}
            </Section>
          )}
          {sem.indexed === 0 && total > 0 && (
            <p className="text-xs text-slate-400 px-1">Tip: press “Rebuild semantic index” to enable meaning-based search across notes, questions and resources.</p>
          )}
        </div>
      )}

      <style>{`
        .result { display:flex; flex-direction:column; gap:2px; padding:11px 14px; border-radius:12px; background:rgba(255,255,255,.55); border:1px solid rgba(255,255,255,.7); transition:background .12s; }
        .result:hover { background:rgba(255,255,255,.85); }
        .result-main { font-family:var(--font-display); font-weight:700; font-size:14px; color:var(--ink-900,#0B121E); }
        .result-meta { font-size:12px; color:var(--ink-500,#5E6B7C); }
        .result-role { font-family:var(--font-ui); font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--brand-600,#007ECC); margin-left:4px; }
        .result-badge { align-self:flex-start; font-size:10px; font-weight:700; text-transform:uppercase; color:#94a3b8; }
      `}</style>
    </div>
  )
}

function Section({ title, Icon, children }: { title: string; Icon: typeof Search; children: React.ReactNode }) {
  return (
    <div className="glass-card glass-card-pad">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Icon size={14} className="text-primary" />
        <h2 className="portal-section-title">{title}</h2>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
