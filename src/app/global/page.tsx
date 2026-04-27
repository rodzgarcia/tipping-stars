'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang, LangSwitcher } from '../LanguageContext'
import { Trophy } from 'lucide-react'

export default function GlobalLeaderboard() {
  const router = useRouter()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setUser(user)

    const [lbRes, toursRes, profilesRes] = await Promise.all([
      supabase.from('leaderboard').select('*'),
      supabase.from('tournaments').select('id, name'),
      supabase.from('profiles').select('id, display_name, nickname, avatar_url'),
    ])

    const tours: Record<string, string> = {}
    toursRes.data?.forEach((t: any) => { tours[t.id] = t.name })
    const profiles: Record<string, any> = {}
    profilesRes.data?.forEach((p: any) => { profiles[p.id] = p })

    // One row per player per tournament — keep completely separate
    const allRows = (lbRes.data || [])
      .filter((r: any) => r.tips_submitted > 0)
      .map((row: any) => ({
        ...row,
        profile: profiles[row.user_id],
        tournament_name: tours[row.tournament_id] || 'Tournament',
      }))
      .sort((a: any, b: any) => b.total_points - a.total_points || b.exact_scores - a.exact_scores)

    setRows(allRows)
    setLoading(false)
  }

  const MEDAL = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen">
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textDecoration: 'none' }}>← Back</Link>
          <LangSwitcher />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 40, height: 40, background: 'var(--gold)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trophy size={20} color="#0a0f0d" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.08em' }}>GLOBAL LEADERBOARD</h1>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
              All players · All tournaments · Each entry ranked independently
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No results yet.</div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5rem 1fr 3.5rem 3.5rem 4.5rem', gap: '0.5rem', padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--dark-border)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.05em' }}>
              <div>#</div>
              <div>PLAYER · TOURNAMENT</div>
              <div style={{ textAlign: 'center' }}>🎯</div>
              <div style={{ textAlign: 'center' }}>✅</div>
              <div style={{ textAlign: 'center' }}>PTS</div>
            </div>

            {rows.map((row: any, i: number) => {
              const prof = row.profile
              const name = prof?.nickname || prof?.display_name || 'Player'
              const isMe = row.user_id === user?.id

              return (
                <div key={`${row.user_id}-${row.tournament_id}`} style={{
                  display: 'grid', gridTemplateColumns: '2.5rem 1fr 3.5rem 3.5rem 4.5rem',
                  gap: '0.5rem', alignItems: 'center', padding: '0.85rem 1.25rem',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--dark-border)' : 'none',
                  background: isMe ? 'rgba(34,197,94,0.05)' : undefined,
                }}>
                  {/* Rank */}
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: i < 3 ? '#fbbf24' : 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                    {i < 3 ? MEDAL[i] : i + 1}
                  </div>

                  {/* Name + tournament */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isMe ? '#4ade80' : '#e8f5ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {name}{isMe ? ' ✦' : ''}
                    </div>
                    {prof?.nickname && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prof.display_name}</div>
                    )}
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                      {row.tournament_name}
                    </span>
                  </div>

                  {/* Exact scores */}
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: row.exact_scores > 0 ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}>
                    {row.exact_scores}
                  </div>

                  {/* Correct winners */}
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: row.correct_winners > 0 ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>
                    {row.correct_winners}
                  </div>

                  {/* Total points */}
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: i === 0 ? '#fbbf24' : isMe ? '#4ade80' : '#e8f5ee' }}>
                    {row.total_points}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.15)', marginTop: '1rem', textAlign: 'center' }}>
          Players in multiple tournaments appear once per tournament · 🎯 exact scores · ✅ correct winners
        </p>
      </div>
    </div>
  )
}
