'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

const GROUPS: Record<string, string[]> = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['USA', 'Paraguay', 'Australia', 'Turkey'],
  E: ['Germany', 'Ivory Coast', 'Ecuador', 'Curacao'],
  F: ['Netherlands', 'Sweden', 'Tunisia', 'Japan'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
}

type TeamStats = {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
}

function calcStandings(teams: string[], matches: any[]): TeamStats[] {
  const stats: Record<string, TeamStats> = {}
  teams.forEach(t => {
    stats[t] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
  })

  matches.forEach((m: any) => {
    if (m.status !== 'completed' || m.home_score === null) return
    const home = m.home_team
    const away = m.away_team
    if (!stats[home] || !stats[away]) return

    const hs = Number(m.home_score)
    const as_ = Number(m.away_score)

    stats[home].played++
    stats[away].played++
    stats[home].gf += hs
    stats[home].ga += as_
    stats[away].gf += as_
    stats[away].ga += hs
    stats[home].gd = stats[home].gf - stats[home].ga
    stats[away].gd = stats[away].gf - stats[away].ga

    if (hs > as_) {
      stats[home].won++; stats[home].points += 3
      stats[away].lost++
    } else if (hs === as_) {
      stats[home].drawn++; stats[home].points++
      stats[away].drawn++; stats[away].points++
    } else {
      stats[away].won++; stats[away].points += 3
      stats[home].lost++
    }
  })

  return Object.values(stats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.gd !== a.gd) return b.gd - a.gd
    return b.gf - a.gf
  })
}

export default function StandingsPage() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('matches').select('*')
      setMatches(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--green-light)', letterSpacing: '0.1em' }}>LOADING...</div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <header style={{ borderBottom: '1px solid var(--dark-border)', background: 'rgba(10,15,13,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}><ChevronLeft size={18} /></Link>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.08em', flex: 1 }}>FIFA WORLD CUP 2026 — GROUP STANDINGS</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '1.5rem' }}>
          {Object.entries(GROUPS).map(([group, teams]) => {
            const groupMatches = matches.filter((m: any) =>
              teams.some(t => t.toLowerCase() === m.home_team?.toLowerCase()) &&
              teams.some(t => t.toLowerCase() === m.away_team?.toLowerCase())
            )
            const standings = calcStandings(teams, groupMatches)
            const played = groupMatches.filter((m: any) => m.status === 'completed').length
            return (
              <div key={group} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--dark-border)', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', color: 'var(--gold)' }}>GROUP {group}</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{played}/6 played</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--dark-border)' }}>
                      <th style={{ padding: '0.5rem 1rem 0.5rem 1.25rem', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontWeight: 500, width: '40%' }}>Team</th>
                      <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>P</th>
                      <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>W</th>
                      <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>D</th>
                      <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>L</th>
                      <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>GF</th>
                      <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>GA</th>
                      <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>GD</th>
                      <th style={{ padding: '0.5rem 1.25rem 0.5rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={s.team} style={{
                        borderBottom: i < standings.length - 1 ? '1px solid var(--dark-border)' : 'none',
                        background: i < 2 ? 'rgba(34,197,94,0.04)' : i === 2 ? 'rgba(251,191,36,0.03)' : undefined
                      }}>
                        <td style={{ padding: '0.65rem 1rem 0.65rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.68rem', fontWeight: 700, flexShrink: 0,
                              background: i < 2 ? 'rgba(34,197,94,0.2)' : i === 2 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)',
                              color: i < 2 ? '#4ade80' : i === 2 ? '#fbbf24' : 'rgba(255,255,255,0.3)'
                            }}>{i + 1}</span>
                            <span style={{ fontWeight: i < 2 ? 600 : 400, color: i < 2 ? '#e8f5ee' : 'rgba(255,255,255,0.65)', fontSize: '0.83rem' }}>{s.team}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>{s.played}</td>
                        <td style={{ padding: '0.65rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>{s.won}</td>
                        <td style={{ padding: '0.65rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>{s.drawn}</td>
                        <td style={{ padding: '0.65rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>{s.lost}</td>
                        <td style={{ padding: '0.65rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>{s.gf}</td>
                        <td style={{ padding: '0.65rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>{s.ga}</td>
                        <td style={{ padding: '0.65rem 0.4rem', textAlign: 'center', color: s.gd > 0 ? '#4ade80' : s.gd < 0 ? '#f87171' : 'rgba(255,255,255,0.45)', fontWeight: s.gd !== 0 ? 600 : 400 }}>
                          {s.gd > 0 ? `+${s.gd}` : s.gd}
                        </td>
                        <td style={{ padding: '0.65rem 1.25rem 0.65rem 0.4rem', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: i < 2 ? '#4ade80' : '#e8f5ee' }}>{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '0.4rem 1.25rem', borderTop: '1px solid var(--dark-border)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', display: 'flex', gap: '1.25rem' }}>
                  <span><span style={{ color: 'rgba(34,197,94,0.7)' }}>●</span> Advances automatically</span>
                  <span><span style={{ color: 'rgba(251,191,36,0.5)' }}>●</span> Possible best 3rd place</span>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--dark-border)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
          <div style={{ marginBottom: '0.25rem' }}><strong style={{ color: 'rgba(255,255,255,0.45)' }}>Points:</strong> Win = 3 pts · Draw = 1 pt · Loss = 0 pts</div>
          <div style={{ marginBottom: '0.25rem' }}><strong style={{ color: 'rgba(255,255,255,0.45)' }}>Tiebreakers (in order):</strong> Points → Goal difference → Goals scored → Head-to-head results → Fair play record → FIFA ranking</div>
          <div><strong style={{ color: 'rgba(255,255,255,0.45)' }}>Advancing:</strong> Top 2 from each group (24 teams) + 8 best 3rd-place teams = 32 teams total advance to Round of 32</div>
        </div>
      </div>
    </div>
  )
}
