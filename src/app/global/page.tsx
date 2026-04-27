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

    // Group by user — sum points across all tournaments (same games = fair)
    const byUser: Record<string, any> = {}
    for (const row of (lbRes.data || [])) {
      const uid = row.user_id
      if (!byUser[uid]) {
        byUser[uid] = {
          user_id: uid,
          total_points: 0,
          match_points: 0,
          tournament_points: 0,
          qualifier_points: 0,
          exact_scores: 0,
          correct_winners: 0,
          tips_submitted: 0,
          tournaments: [],
          profile: profiles[uid],
        }
      }
      byUser[uid].total_points += row.total_points || 0
      byUser[uid].match_points += row.match_points || 0
      byUser[uid].tournament_points += row.tournament_points || 0
      byUser[uid].qualifier_points += row.qualifier_points || 0
      byUser[uid].exact_scores += row.exact_scores || 0
      byUser[uid].correct_winners += row.correct_winners || 0
      byUser[uid].tips_submitted += row.tips_submitted || 0
      const tname = tours[row.tournament_id]
      if (tname && !byUser[uid].tournaments.includes(tname)) {
        byUser[uid].tournaments.push(tname)
      }
    }

    const sorted = Object.values(byUser)
      .filter((r: any) => r.tips_submitted > 0)
      .sort((a: any, b: any) => b.total_points - a.total_points || b.exact_scores - a.exact_scores)
    setRows(sorted)
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
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>All players · All tournaments combined · Tiebreak: exact scores</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No results yet.</div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5rem 1fr 3.5rem 3.5rem 3.5rem 4.5rem', gap: '0.5rem', padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--dark-border)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.05em' }}>
              <div>#</div><div>PLAYER · TOURNAMENT</div>
              <div style={{ textAlign: 'center' }}>🎯</div>
              <div style={{ textAlign: 'center' }}>✅</div>
              <div style={{ textAlign: 'center' }}>🏟️</div>
              <div style={{ textAlign: 'center' }}>PTS</div>
            </div>

            {rows.map((row: any, i: number) => {
              const prof = row.profile
              const name = prof?.nickname || prof?.display_name || 'Player'
              const isMe = row.user_id === user?.id
              return (
                <div key={row.user_id} style={{
                  display: 'grid', gridTemplateColumns: '2.5rem 1fr 3.5rem 3.5rem 3.5rem 4.5rem',
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
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                      {row.tournaments.map((tn: string) => (
                        <span key={tn} style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>{tn}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: row.exact_scores > 0 ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}>{row.exact_scores}</div>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: row.correct_winners > 0 ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>{row.correct_winners}</div>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: (row.qualifier_points ?? 0) > 0 ? '#60a5fa' : 'rgba(255,255,255,0.2)' }}>{row.qualifier_points ?? 0}</div>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: i === 0 ? '#fbbf24' : isMe ? '#4ade80' : '#e8f5ee' }}>{row.total_points}</div>
                </div>
              )
            })}
          </div>
        )}
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.15)', marginTop: '1rem', textAlign: 'center' }}>
          🎯 exact scores · ✅ correct winners · 🏟️ qualifier points
        </p>
      </div>
    </div>
  )
}
