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

    const [lbRes, toursRes, profilesRes, matchesRes] = await Promise.all([
      supabase.from('leaderboard').select('*'),
      supabase.from('tournaments').select('*'),
      supabase.from('profiles').select('id, display_name, nickname, avatar_url'),
      supabase.from('matches').select('id, tournament_id, status, round'),
    ])

    const tours: Record<string, any> = {}
    toursRes.data?.forEach((t: any) => { tours[t.id] = t })

    const profiles: Record<string, any> = {}
    profilesRes.data?.forEach((p: any) => { profiles[p.id] = p })

    // Calculate max possible points per tournament
    // Max per match = pts_winner + pts_goal_diff + pts_exact_score + pts_big_margin_bonus
    // Weighted by multiplier per round
    const multipliers: Record<string, number> = {
      group: 1, r32: 2, r16: 3, qf: 4, sf: 5, third_place: 5, final: 6
    }

    const tourMaxPts: Record<string, number> = {}
    for (const [tid, t] of Object.entries(tours)) {
      const maxPerMatch = (t.pts_winner || 0) + (t.pts_goal_diff || 0) + 
                          (t.pts_exact_score || 0) + (t.pts_big_margin_bonus || 0)
      const completedMatches = (matchesRes.data || []).filter((m: any) => 
        m.tournament_id === tid && m.status === 'completed'
      )
      // Sum max pts × multiplier for each completed match
      let maxTotal = 0
      for (const m of completedMatches) {
        const mult = multipliers[m.round] || 1
        maxTotal += maxPerMatch * mult
      }
      tourMaxPts[tid] = maxTotal || 1 // avoid div by zero
    }

    // One row per player per tournament, with normalised score
    const allRows = (lbRes.data || [])
      .filter((r: any) => r.tips_submitted > 0)
      .map((row: any) => {
        const maxPts = tourMaxPts[row.tournament_id] || 1
        const pct = Math.round((row.match_points / maxPts) * 100)
        return {
          ...row,
          profile: profiles[row.user_id],
          tournament_name: tours[row.tournament_id]?.name || 'Tournament',
          pct: Math.min(100, pct), // cap at 100%
        }
      })
      .sort((a: any, b: any) => b.pct - a.pct || b.total_points - a.total_points)

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ width: 40, height: 40, background: 'var(--gold)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trophy size={20} color="#0a0f0d" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.08em' }}>GLOBAL LEADERBOARD</h1>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
              Ranked by % of max possible points — fair across different tournament scoring
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem', padding: '0.6rem 1rem', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 10, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
          💡 Score % = match points ÷ maximum possible match points in that tournament. Levels the playing field when tournaments use different point values.
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No results yet.</div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5rem 1fr 4rem 3.5rem 3.5rem', gap: '0.5rem', padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--dark-border)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.05em' }}>
              <div>#</div>
              <div>PLAYER · TOURNAMENT</div>
              <div style={{ textAlign: 'center' }}>SCORE%</div>
              <div style={{ textAlign: 'center' }}>🎯</div>
              <div style={{ textAlign: 'center' }}>✅</div>
            </div>

            {rows.map((row: any, i: number) => {
              const prof = row.profile
              const name = prof?.nickname || prof?.display_name || 'Player'
              const isMe = row.user_id === user?.id
              return (
                <div key={`${row.user_id}-${row.tournament_id}`} style={{
                  display: 'grid', gridTemplateColumns: '2.5rem 1fr 4rem 3.5rem 3.5rem',
                  gap: '0.5rem', alignItems: 'center', padding: '0.85rem 1.25rem',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--dark-border)' : 'none',
                  background: isMe ? 'rgba(34,197,94,0.05)' : undefined,
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: i < 3 ? '#fbbf24' : 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                    {i < 3 ? MEDAL[i] : i + 1}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isMe ? '#4ade80' : '#e8f5ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {name}{isMe ? ' ✦' : ''}
                    </div>
                    {prof?.nickname && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{prof.display_name}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                        {row.tournament_name}
                      </span>
                      <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)' }}>{row.total_points} pts</span>
                    </div>
                  </div>

                  {/* Score % with bar */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: i === 0 ? '#fbbf24' : isMe ? '#4ade80' : '#e8f5ee' }}>
                      {row.pct}%
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 2 }}>
                      <div style={{ height: '100%', width: `${row.pct}%`, background: i === 0 ? '#fbbf24' : isMe ? '#4ade80' : '#60a5fa', borderRadius: 2 }} />
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: row.exact_scores > 0 ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}>
                    {row.exact_scores}
                  </div>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: row.correct_winners > 0 ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>
                    {row.correct_winners}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.15)', marginTop: '1rem', textAlign: 'center' }}>
          Each player appears once per tournament · raw points shown in grey · 🎯 exact scores · ✅ correct winners
        </p>
      </div>
    </div>
  )
}
