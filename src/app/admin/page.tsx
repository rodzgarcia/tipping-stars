'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, Check, X, Settings, Users, Trophy, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { useLang } from '../LanguageContext'

type AdminTab = 'tournaments' | 'members' | 'matches' | 'results' | 'leaderboard' | 'pending' | 'backup' | 'notify'

function AdminLeaderboard({ tournamentId, supabase, tournaments }: any) {
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const tournament = tournaments.find((t: any) => t.id === tournamentId)

  useEffect(() => {
    if (!tournamentId) return
    setLoading(true)
    Promise.all([
      supabase.from('leaderboard').select('*').eq('tournament_id', tournamentId).order('total_points', { ascending: false }),
      supabase.from('profiles').select('id, display_name, nickname'),
    ]).then(([lbRes, profRes]: any) => {
      setLeaderboard(lbRes.data || [])
      const map: Record<string, any> = {}
      profRes.data?.forEach((p: any) => { map[p.id] = p })
      setProfiles(map)
      setLoading(false)
    })
  }, [tournamentId])

  if (loading) return <div style={{ padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>
        🏆 LEADERBOARD — {tournament?.name}
      </h2>
      {leaderboard.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.3)' }}>No scores yet.</p>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 3rem 3rem 3rem 3rem 3rem 3rem 3rem 4rem', gap: '0.4rem', padding: '0.6rem 1rem', borderBottom: '1px solid var(--dark-border)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.05em', minWidth: 520 }}>
            <div>#</div><div>PLAYER</div>
            <div style={{ textAlign: 'center' }} title='Exact scores'>🎯</div>
            <div style={{ textAlign: 'center' }} title='Goal diff only'>⚖️</div>
            <div style={{ textAlign: 'center' }} title='Correct winners'>✅</div>
            <div style={{ textAlign: 'center' }} title='Qualifier count'>🗂️#</div>
            <div style={{ textAlign: 'center' }} title='Qualifier pts'>🗂️pts</div>
            <div style={{ textAlign: 'center' }} title='Prediction points'>🔮</div>
            <div style={{ textAlign: 'center' }}>MATCH</div>
            <div style={{ textAlign: 'center' }}>TOTAL</div>
          </div>
          {leaderboard.map((row: any, i: number) => {
            const prof = profiles[row.user_id]
            const name = prof?.nickname || prof?.display_name || row.display_name
            const exact = row.exact_scores ?? 0
            const gd = Math.max(0, (row.correct_goal_diff ?? 0) - exact)
            const winners = Math.max(0, (row.correct_winners ?? 0) - (row.correct_goal_diff ?? 0))
            const qPts = row.qualifier_points ?? 0
            const ptsEach = row.pts_qualify ?? 20
            const qCount = qPts > 0 && ptsEach > 0 ? (() => { const c = qPts / ptsEach; return c % 1 === 0 ? String(c) : c.toFixed(1) })() : '–'
            const predPts = row.prediction_points ?? null
            return (
              <div key={row.user_id} style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 3rem 3rem 3rem 3rem 3rem 3rem 3rem 4rem', gap: '0.4rem', alignItems: 'center', padding: '0.65rem 1rem', borderBottom: i < leaderboard.length - 1 ? '1px solid var(--dark-border)' : 'none', minWidth: 520 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b87333' : 'rgba(255,255,255,0.3)' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e8f5ee' }}>{name}</div>
                  {prof?.nickname && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{prof.display_name}</div>}
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>{row.tips_submitted} tips</div>
                </div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: exact > 0 ? '#fbbf24' : 'rgba(255,255,255,0.25)' }}>{exact}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: gd > 0 ? '#60a5fa' : 'rgba(255,255,255,0.25)' }}>{gd}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: winners > 0 ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>{winners}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: qPts > 0 ? '#a78bfa' : 'rgba(255,255,255,0.25)' }}>{qCount}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: qPts > 0 ? '#a78bfa' : 'rgba(255,255,255,0.25)' }}>{qPts}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: predPts ? '#f0abfc' : 'rgba(255,255,255,0.2)' }}>{predPts ?? '–'}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{row.match_points ?? 0}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: i === 0 ? '#fbbf24' : '#e8f5ee' }}>{row.total_points}</div>
              </div>
            )
          })}
          </div>
        </div>
      )}
      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.75rem' }}>
        🎯 Exact · ⚖️ GD · ✅ Win · 🗂️pts Qual pts · 🗂️# Qual count · 🔮 Predictions · MATCH pts
      </p>
    </div>
  )
}


const WC_TEAMS = [
  "TBD",
  "Argentina","Australia","Belgium","Bosnia and Herzegovina","Brazil",
  "Cameroon","Canada","Cape Verde","Colombia","Costa Rica","Croatia",
  "Curacao","DR Congo","Ecuador","Egypt","England","France","Germany",
  "Ghana","Haiti","Honduras","Iran","Iraq","Ivory Coast","Jamaica",
  "Japan","Jordan","Mali","Mexico","Morocco","Netherlands","New Zealand",
  "Nigeria","Norway","Panama","Peru","Poland","Portugal","Qatar",
  "Saudi Arabia","Scotland","Senegal","Serbia","Slovakia","Slovenia",
  "South Africa","South Korea","Spain","Sweden","Switzerland",
  "Trinidad and Tobago","Tunisia","Turkey","Ukraine","United States",
  "Uruguay","Uzbekistan","Venezuela","Wales"
]

function KnockoutTemplates({ supabase, tournaments }: any) {
  const ROUNDS = [
    { key: 'r32', label: 'Round of 32', games: 16, multiplier: '2x' },
    { key: 'r16', label: 'Round of 16', games: 8, multiplier: '3x' },
    { key: 'qf',  label: 'Quarter-finals', games: 4, multiplier: '4x' },
    { key: 'sf',  label: 'Semi-finals', games: 2, multiplier: '5x' },
    { key: 'third_place', label: '3rd Place', games: 1, multiplier: '5x' },
    { key: 'final', label: 'Final', games: 1, multiplier: '6x' },
  ]

  const [templates, setTemplates] = useState<Record<string, any[]>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeRound, setActiveRound] = useState('r32')

  useEffect(() => {
    // Load existing knockout templates from all tournaments (use first tournament as reference)
    if (!tournaments.length) return
    const tid = tournaments[0].id
    supabase.from('matches').select('*')
      .eq('tournament_id', tid)
      .in('round', ['r32','r16','qf','sf','third_place','final'])
      .order('kickoff_at')
      .then(({ data }: any) => {
        const byRound: Record<string, any[]> = {}
        data?.forEach((m: any) => {
          if (!byRound[m.round]) byRound[m.round] = []
          byRound[m.round].push({ home: m.home_team, away: m.away_team, kickoff: m.kickoff_at?.slice(0,16) || '', venue: m.venue || '' })
        })
        setTemplates(byRound)
      })
  }, [tournaments.length])

  function setMatch(round: string, idx: number, field: string, val: string) {
    setTemplates(prev => {
      const arr = [...(prev[round] || [])]
      if (!arr[idx]) arr[idx] = { home: '', away: '', kickoff: '', venue: '' }
      arr[idx] = { ...arr[idx], [field]: val }
      return { ...prev, [round]: arr }
    })
  }

  function addMatch(round: string) {
    setTemplates(prev => ({
      ...prev,
      [round]: [...(prev[round] || []), { home: 'TBD', away: 'TBD', kickoff: '', venue: '' }]
    }))
  }

  function removeMatch(round: string, idx: number) {
    setTemplates(prev => ({
      ...prev,
      [round]: (prev[round] || []).filter((_: any, i: number) => i !== idx)
    }))
  }

  async function saveRound(round: string) {
    setSaving(true)
    const matches = templates[round] || []
    if (!matches.length) { setSaving(false); return }

    // Apply to ALL tournaments
    for (const t of tournaments) {
      // Delete existing knockout matches for this round in this tournament
      await supabase.from('matches').delete()
        .eq('tournament_id', t.id).eq('round', round)

      // Insert new ones
      const toInsert = matches
        .filter((m: any) => m.kickoff)
        .map((m: any) => ({
          tournament_id: t.id,
          round,
          home_team: m.home || 'TBD',
          away_team: m.away || 'TBD',
          kickoff_at: new Date(m.kickoff).toISOString(),
          venue: m.venue || null,
          status: 'upcoming',
        }))
      if (toInsert.length) await supabase.from('matches').insert(toInsert)
    }

    setSaved(true); setTimeout(() => setSaved(false), 3000); setSaving(false)
  }

  // WC 2026 official R32 bracket slots
  const R32_BRACKET = [
    // June 28
    { home: '2A', away: '2B',      kickoff: '2026-06-28T15:00', venue: 'SoFi Stadium, Los Angeles' },
    // June 29
    { home: '1C', away: '2F',      kickoff: '2026-06-29T13:00', venue: 'NRG Stadium, Houston' },
    { home: '1E', away: '3ABCDF',  kickoff: '2026-06-29T16:30', venue: 'Gillette Stadium, Boston' },
    { home: '1F', away: '2C',      kickoff: '2026-06-29T21:00', venue: 'Estadio AKRON, Guadalajara' },
    // June 30
    { home: '2E', away: '2I',      kickoff: '2026-06-30T13:00', venue: 'AT&T Stadium, Dallas' },
    { home: '1I', away: '3CDFGH',  kickoff: '2026-06-30T17:00', venue: 'MetLife Stadium, New York' },
    { home: '1A', away: '3CEFHI',  kickoff: '2026-06-30T21:00', venue: 'Estadio Azteca, Mexico City' },
    // July 1
    { home: '1L', away: '3EHIJK',  kickoff: '2026-07-01T12:00', venue: 'Mercedes-Benz Stadium, Atlanta' },
    { home: '1G', away: '3AEHIJ',  kickoff: '2026-07-01T16:00', venue: 'Lumen Field, Seattle' },
    { home: '1D', away: '3BEFIJ',  kickoff: '2026-07-01T17:00', venue: 'Levi\'s Stadium, San Francisco' },
    // July 2
    { home: '2D', away: '2G',      kickoff: '2026-07-02T14:00', venue: 'AT&T Stadium, Dallas' },
    { home: '1H', away: '2J',      kickoff: '2026-07-02T18:00', venue: 'Hard Rock Stadium, Miami' },
    { home: '1K', away: '3DEIJL',  kickoff: '2026-07-02T21:30', venue: 'Arrowhead Stadium, Kansas City' },
    // July 3
    { home: '2K', away: '2L',      kickoff: '2026-07-03T14:00', venue: 'BMO Field, Toronto' },
    { home: '1J', away: '2H',      kickoff: '2026-07-03T18:00', venue: 'Hard Rock Stadium, Miami' },
    { home: '1B', away: '3EFGIJ',  kickoff: '2026-07-03T21:00', venue: 'BC Place, Vancouver' },
  ]

  // Map group positions to actual teams from standings data
  async function autoPopulateR32() {
    if (!tournaments.length) return
    // Use the first tournament but also try without tournament filter
    const tid = tournaments[0].id

    // Load ALL completed matches across ALL tournaments — deduplicate by teams+date
    const { data: allMatches } = await supabase.from('matches')
      .select('*').eq('status', 'completed')

    if (!allMatches?.length) {
      alert('No completed matches found anywhere. Enter some results first.')
      return
    }

    // Deduplicate by home+away+date so multiple tournaments don't double-count
    const seen = new Set<string>()
    const matches = allMatches.filter((m: any) => {
      const key = `${m.home_team?.toLowerCase()}-${m.away_team?.toLowerCase()}-${m.kickoff_at?.slice(0,10)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // All WC 2026 group teams — use to identify group stage matches
    const GROUP_TEAMS: Record<string, string[]> = {
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

    // Calculate group standings from completed matches
    const groups: Record<string, Record<string, any>> = {}
    for (const [g, teams] of Object.entries(GROUP_TEAMS)) {
      groups[g] = {}
      teams.forEach(t => { groups[g][t] = { pts: 0, gd: 0, gf: 0, ga: 0 } })
    }

    let counted = 0
    for (const m of matches) {
      if (m.home_score === null || m.away_score === null) continue
      // Find which group this match belongs to
      for (const [g, teams] of Object.entries(GROUP_TEAMS)) {
        const teamsLower = teams.map(t => t.toLowerCase())
        if (teamsLower.includes(m.home_team?.toLowerCase()) && teamsLower.includes(m.away_team?.toLowerCase())) {
          // Normalise team name to match our GROUP_TEAMS keys
          const home = teams.find(t => t.toLowerCase() === m.home_team?.toLowerCase()) || m.home_team
          const away = teams.find(t => t.toLowerCase() === m.away_team?.toLowerCase()) || m.away_team
          const hs = Number(m.home_score), as_ = Number(m.away_score)
          groups[g][home].gf += hs; groups[g][home].ga += as_
          groups[g][away].gf += as_; groups[g][away].ga += hs
          groups[g][home].gd = groups[g][home].gf - groups[g][home].ga
          groups[g][away].gd = groups[g][away].gf - groups[g][away].ga
          if (hs > as_) { groups[g][home].pts += 3 }
          else if (hs === as_) { groups[g][home].pts += 1; groups[g][away].pts += 1 }
          else { groups[g][away].pts += 3 }
          counted++
          break
        }
      }
    }

    if (counted === 0) {
      alert(`Found ${matches.length} completed matches but none matched the group stage teams. Check that team names in your matches match the groups exactly.`)
      return
    }

    // Sort each group to get 1st and 2nd
    const standings: Record<string, string[]> = {}
    for (const [g, teams] of Object.entries(groups)) {
      standings[g] = Object.entries(teams)
        .sort(([,a]: any, [,b]: any) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
        .map(([team]) => team)
    }

    // Map position slot to actual team name
    function resolve(slot: string): string {
      const m1 = slot.match(/^1([A-L])$/)
      const m2 = slot.match(/^2([A-L])$/)
      if (m1) return standings[m1[1]]?.[0] || slot
      if (m2) return standings[m2[1]]?.[1] || slot
      return 'TBD'
    }

    const populated = R32_BRACKET.map(m => ({
      home: resolve(m.home),
      away: resolve(m.away),
      kickoff: m.kickoff,
      venue: m.venue,
    }))

    setTemplates(prev => ({ ...prev, r32: populated }))
    setActiveRound('r32')
    alert(`✅ R32 populated from ${counted} group stage results. Best 3rd place slots are set to TBD — update manually once all groups finish.`)
  }

  const roundData = ROUNDS.find(r => r.key === activeRound)!
  const roundMatches = templates[activeRound] || []

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.35rem', color: 'rgba(255,255,255,0.5)' }}>
        ⚡ KNOCKOUT MATCH TEMPLATES
      </h2>
      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.25rem' }}>
        Set up knockout matches once — they auto-populate to <strong>all {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}</strong>. Use TBD for teams not yet known.
      </p>

      {/* Round tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {ROUNDS.map(r => (
          <button key={r.key} onClick={() => setActiveRound(r.key)} style={{
            padding: '0.4rem 0.85rem', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
            border: `1px solid ${activeRound === r.key ? 'var(--green)' : 'rgba(255,255,255,0.12)'}`,
            background: activeRound === r.key ? 'rgba(74,222,128,0.1)' : 'transparent',
            color: activeRound === r.key ? '#4ade80' : 'rgba(255,255,255,0.5)',
          }}>
            {r.label}
            <span style={{ marginLeft: 5, fontSize: '0.65rem', opacity: 0.6 }}>{r.multiplier}</span>
            {(templates[r.key]?.length || 0) > 0 && (
              <span style={{ marginLeft: 5, fontSize: '0.65rem', background: 'rgba(74,222,128,0.2)', borderRadius: 8, padding: '0 4px' }}>
                {templates[r.key].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Match list for active round */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.06em', color: 'var(--green-light)' }}>
            {roundData.label}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
              {roundData.games} games expected · {roundData.multiplier} multiplier
            </span>
            {activeRound === 'r32' && (
              <button onClick={autoPopulateR32} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: '#60a5fa', borderColor: 'rgba(96,165,250,0.3)' }}>
                ⚡ Auto-populate from standings
              </button>
            )}
          </div>
        </div>

        {roundMatches.length === 0 && (
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>
            No matches yet. Add them below — you can use TBD for teams not yet confirmed.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {roundMatches.map((m: any, idx: number) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto auto', gap: '0.5rem', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
              <select className="input" style={{ background: '#1a1a2e', color: '#fff' }} value={m.home} onChange={e => setMatch(activeRound, idx, 'home', e.target.value)}>
                {WC_TEAMS.map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-display)' }}>vs</span>
              <select className="input" style={{ background: '#1a1a2e', color: '#fff' }} value={m.away} onChange={e => setMatch(activeRound, idx, 'away', e.target.value)}>
                {WC_TEAMS.map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="datetime-local" className="input" value={m.kickoff} onChange={e => setMatch(activeRound, idx, 'kickoff', e.target.value)} style={{ width: 'auto' }} />
              <button onClick={() => removeMatch(activeRound, idx)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => addMatch(activeRound)} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>
            + Add match
          </button>
          {roundMatches.length > 0 && (
            <button onClick={() => saveRound(activeRound)} disabled={saving} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
              {saved ? '✔ Saved to all tournaments!' : saving ? 'Saving...' : `⚡ Save ${roundData.label} to all ${tournaments.length} tournaments`}
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '0.85rem 1.25rem', background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)' }}>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
          💡 <strong>Workflow:</strong> Add matches with TBD teams as soon as kickoff times are confirmed. Then come back and update team names once the group stage finishes. Saving a round <strong>replaces</strong> existing matches for that round across all tournaments.
        </p>
      </div>
    </div>
  )
}


function PendingTips({ tournamentId, supabase, tournaments }: any) {
  const [qualifierTips, setQualifierTips] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [matchTips, setMatchTips] = useState<any[]>([])
  const [tournamentTips, setTournamentTips] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'matches' | 'knockout' | 'qualifiers' | 'predictions'>('matches')
  const tournament = tournaments.find((t: any) => t.id === tournamentId)

  useEffect(() => {
    if (!tournamentId) return
    setLoading(true)
    Promise.all([
      supabase.from('tournament_members').select('user_id').eq('tournament_id', tournamentId).eq('status', 'approved'),
      supabase.from('matches').select('id, home_team, away_team, kickoff_at, round, status, tip_lock_override').eq('tournament_id', tournamentId).order('kickoff_at'),
      supabase.from('match_tips').select('user_id, match_id').eq('tournament_id', tournamentId),
      supabase.from('tournament_tips').select('*').eq('tournament_id', tournamentId),
      supabase.from('profiles').select('id, display_name, nickname, avatar_url'),
    ]).then(([membRes, matchRes, tipRes, ttRes, profRes]: any) => {
      setMembers(membRes.data || [])
      setQualifierTips(ttRes.data || [])
      setMatches(matchRes.data || [])
      setMatchTips(tipRes.data || [])
      setTournamentTips(ttRes.data || [])
      const map: Record<string, any> = {}
      profRes.data?.forEach((p: any) => { map[p.id] = p })
      setProfiles(map)
      setLoading(false)
    })
  }, [tournamentId])

  if (loading) return <div style={{ padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>

  const lockMins = tournament?.tip_lock_minutes ?? 120
  const memberIds = members.map((m: any) => m.user_id)

  // Upcoming matches NOT yet locked — these are the ones people still need to tip
  const upcomingMatches = matches.filter((m: any) => {
    if (m.status !== 'upcoming') return false
    if (m.tip_lock_override) return false
    const lockTime = new Date(new Date(m.kickoff_at).getTime() - lockMins * 60 * 1000)
    return new Date() < lockTime
  }).sort((a: any, b: any) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())

  // Group stage pending only
  const matchPending = upcomingMatches.filter((m: any) => !m.round || m.round === 'group').map((m: any) => {
    const tipped = new Set(matchTips.filter((t: any) => t.match_id === m.id).map((t: any) => t.user_id))
    const missing = memberIds.filter(uid => !tipped.has(uid))
    const kickoff = new Date(m.kickoff_at)
    const lockTime = new Date(kickoff.getTime() - lockMins * 60 * 1000)
    const minsUntilLock = Math.round((lockTime.getTime() - Date.now()) / 60000)
    return { match: m, tipped: tipped.size, missing, total: memberIds.length, minsUntilLock }
  }).filter((m: any) => m.missing.length > 0)

  // For predictions — who hasn't submitted tournament tips
  const predictedIds = new Set(tournamentTips.map((t: any) => t.user_id))
  const missingPredictions = memberIds.filter(uid => !predictedIds.has(uid))

  // Who hasn't submitted qualifier picks
  const submittedQualifierIds = new Set(qualifierTips.filter((qt: any) =>
    Object.keys(qt).some(k => k.startsWith('tip_group_') && qt[k])
  ).map((qt: any) => qt.user_id))
  const missingQualifiers = memberIds.filter(uid => !submittedQualifierIds.has(uid))

  const roundLabel: Record<string, string> = {
    group: 'Group', r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third_place: '3rd', final: 'Final'
  }

  const getName = (uid: string) => profiles[uid]?.nickname || profiles[uid]?.display_name || uid.slice(0,8)

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>
        ⏳ PENDING TIPS — {tournament?.name}
      </h2>

      {/* Consolidated WhatsApp export */}
      {(() => {
        const allMissing: string[] = []
        const lines: string[] = []
        const pending = upcomingMatches.filter((m: any) => {
          const tipped = new Set(matchTips.filter((t: any) => t.match_id === m.id).map((t: any) => t.user_id))
          const missing = memberIds.filter((uid: string) => !tipped.has(uid))
          if (missing.length === 0) return false
          const ROUND: Record<string,string> = { group: 'Grupo', r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third_place: '3º', final: 'Final' }
          const lockTime = new Date(new Date(m.kickoff_at).getTime() - lockMins * 60 * 1000)
          const minsLeft = Math.round((lockTime.getTime() - Date.now()) / 60000)
          const h = Math.floor(minsLeft / 60), d = Math.floor(h / 24)
          const timeStr = d > 0 ? d + 'd ' + (h%24) + 'h' : h > 0 ? h + 'h' : minsLeft + 'm'
          lines.push(`⚽ *${m.home_team} vs ${m.away_team}* (${ROUND[m.round] || m.round}) — 🔒 ${timeStr}\n${missing.map((uid: string) => '• ' + getName(uid)).join('\n')}`)
          return true
        })
        if (lines.length === 0) return null
        return (
          <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
              📋 {pending.length} game{pending.length !== 1 ? 's' : ''} with pending tips
            </span>
            <button onClick={() => {
              const text = `🏆 *PALPITES PENDENTES*\n\n${lines.join('\n\n')}\n\nTip now: https://tipping-stars.vercel.app`
              navigator.clipboard.writeText(text).then(() => alert('Copied! Paste in WhatsApp'))
            }} style={{ fontSize: '0.75rem', color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 6, padding: '0.3rem 0.8rem', cursor: 'pointer', fontWeight: 600 }}>
              📲 Copy all for WhatsApp
            </button>
          </div>
        )
      })()}

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {([
          ['matches', `⚽ Group`],
          ['knockout', `⚡ Knockout`],
          ['qualifiers', `🗂️ Qualifiers`],
          ['predictions', `🏆 Predictions`]
        ] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '0.4rem 1rem', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
            border: `1px solid ${view === v ? 'var(--green)' : 'rgba(255,255,255,0.15)'}`,
            background: view === v ? 'rgba(74,222,128,0.1)' : 'transparent',
            color: view === v ? '#4ade80' : 'rgba(255,255,255,0.5)',
          }}>
            {label}
            {v === 'qualifiers' && missingQualifiers.length > 0 && (
              <span style={{ marginLeft: 5, background: '#f87171', color: '#0a0f0d', borderRadius: 10, fontSize: '0.65rem', padding: '0 5px', fontWeight: 700 }}>
                {missingQualifiers.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {view === 'matches' && (
        <div>
          {matchPending.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              ✅ All members have tipped every upcoming match!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.25rem' }}>
                Upcoming matches with missing tips — chase these players before the lock!
              </p>
              {matchPending.map(({ match: m, tipped, missing, total, minsUntilLock }: any) => (
                <div key={m.id} className="card" style={{ padding: '1rem 1.25rem', borderLeft: `3px solid ${minsUntilLock < 120 ? '#f87171' : minsUntilLock < 360 ? '#fbbf24' : 'rgba(255,255,255,0.1)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.home_team} vs {m.away_team}</span>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                        {roundLabel[m.round] || m.round}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.72rem', color: minsUntilLock < 120 ? '#f87171' : minsUntilLock < 360 ? '#fbbf24' : 'rgba(255,255,255,0.4)' }}>
                        🔒 {minsUntilLock > 60 ? `${Math.floor(minsUntilLock/60)}h ${minsUntilLock%60}m` : `${minsUntilLock}m`} until lock
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#4ade80' }}>{tipped}/{total} done</span>
                      <span style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 600 }}>{missing.length} missing</span>
                    </div>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: '0.6rem' }}>
                    <div style={{ height: '100%', width: `${(tipped/total)*100}%`, background: '#4ade80', borderRadius: 2 }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                    {missing.map((uid: string) => (
                      <span key={uid} style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: 10, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                        {getName(uid)}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => {
                    const text = `⚽ *${m.home_team} vs ${m.away_team}*\n🔒 Locks soon — missing tips:\n${missing.map((uid: string) => `• ${getName(uid)}`).join('\n')}\n\nTip now: https://tipping-stars.vercel.app`
                    navigator.clipboard.writeText(text).then(() => alert('Copied! Paste in WhatsApp'))
                  }} style={{ fontSize: '0.68rem', color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer' }}>
                    📋 Copy for WhatsApp
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'predictions' && (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600 }}>Tournament Predictions (Winner, 2nd, 3rd, Top Scorer)</h3>
            <span style={{ fontSize: '0.78rem', color: missingPredictions.length > 0 ? '#f87171' : '#4ade80' }}>
              {memberIds.length - missingPredictions.length}/{memberIds.length} submitted
            </span>
          </div>
          {missingPredictions.length === 0 ? (
            <p style={{ color: '#4ade80', fontSize: '0.85rem' }}>✅ All members have submitted predictions!</p>
          ) : (
            <>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.75rem' }}>Missing predictions from:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {missingPredictions.map((uid: string) => (
                  <span key={uid} style={{ fontSize: '0.78rem', padding: '0.25rem 0.75rem', borderRadius: 10, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                    {getName(uid)}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}


      {view === 'knockout' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {upcomingMatches.filter((m: any) => m.round && m.round !== 'group').length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
              No upcoming knockout matches yet
            </div>
          ) : upcomingMatches.filter((m: any) => m.round && m.round !== 'group').map((m: any) => {
            const tippedSet = new Set(matchTips.filter((t: any) => t.match_id === m.id).map((t: any) => t.user_id))
            const missingUids = memberIds.filter(uid => !tippedSet.has(uid))
            if (missingUids.length === 0) return null
            const lockTime = new Date(new Date(m.kickoff_at).getTime() - lockMins * 60 * 1000)
            const minsLeft = Math.round((lockTime.getTime() - new Date().getTime()) / 60000)
            const hoursLeft = Math.floor(minsLeft / 60)
            const daysLeft = Math.floor(hoursLeft / 24)
            const timeStr = daysLeft > 0 ? daysLeft + 'd ' + (hoursLeft % 24) + 'h' : hoursLeft > 0 ? hoursLeft + 'h ' + (minsLeft % 60) + 'm' : minsLeft + 'm'
            const isRed = minsLeft < 120
            const ROUND: Record<string,string> = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third_place: '3rd', final: 'Final' }
            return (
              <div key={m.id} className="card" style={{ padding: '1rem 1.25rem', borderLeft: `3px solid ${isRed ? '#f87171' : '#60a5fa'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{m.home_team} vs {m.away_team}</span>
                    <span style={{ marginLeft: 8, fontSize: '0.72rem', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '2px 6px', borderRadius: 4 }}>{ROUND[m.round] || m.round}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                      {missingUids.length}/{memberIds.length} missing
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: isRed ? '#f87171' : '#fbbf24' }}>
                      {timeStr}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  {missingUids.map(uid => (
                    <span key={uid} style={{ padding: '0.2rem 0.6rem', borderRadius: 10, background: isRed ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)', border: `1px solid ${isRed ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.12)'}`, fontSize: '0.75rem', color: isRed ? '#f87171' : 'rgba(255,255,255,0.7)' }}>
                      {getName(uid)}
                    </span>
                  ))}
                </div>
                <button onClick={() => {
                  const text = `⚡ *${m.home_team} vs ${m.away_team}* (${ROUND[m.round] || m.round})\n🔒 Locks soon — missing tips:\n${missingUids.map((uid: string) => `• ${getName(uid)}`).join('\n')}\n\nTip now: https://tipping-stars.vercel.app`
                  navigator.clipboard.writeText(text).then(() => alert('Copied! Paste in WhatsApp'))
                }} style={{ fontSize: '0.68rem', color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer' }}>
                  📋 Copy for WhatsApp
                </button>
              </div>
            )
          })}
        </div>
      )}

      {view === 'qualifiers' && (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600 }}>🗂️ Group Qualifier Picks</h3>
            <span style={{ fontSize: '0.78rem', color: missingQualifiers.length > 0 ? '#f87171' : '#4ade80' }}>
              {memberIds.length - missingQualifiers.length}/{memberIds.length} submitted
            </span>
          </div>
          {missingQualifiers.length === 0 ? (
            <p style={{ color: '#4ade80', fontSize: '0.85rem' }}>✅ All members have submitted qualifier picks!</p>
          ) : (
            <>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.75rem' }}>Missing qualifier picks from:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {missingQualifiers.map((uid: string) => (
                  <span key={uid} style={{ fontSize: '0.78rem', padding: '0.25rem 0.75rem', borderRadius: 10, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                    {getName(uid)}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function BackupPanel({ supabase, tournaments }: any) {
  const [status, setStatus] = useState<Record<string, 'idle' | 'loading' | 'done'>>({})
  const [lastBackup, setLastBackup] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('last_backup') : null
  )

  async function fetchAll(table: string, filters?: Record<string, string>) {
    let query = supabase.from(table).select('*')
    if (filters) Object.entries(filters).forEach(([k, v]) => { query = query.eq(k, v) })
    const { data, error } = await query
    if (error) throw new Error(`${table}: ${error.message}`)
    return data || []
  }

  async function downloadXLSX(filename: string, sheets: Record<string, any[]>) {
    // Load SheetJS from CDN if not already loaded
    if (!(window as any).XLSX) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load SheetJS'))
        document.head.appendChild(script)
      })
    }
    const XLSX = (window as any).XLSX
    const wb = XLSX.utils.book_new()
    Object.entries(sheets).forEach(([name, data]) => {
      if (!(data as any[])?.length) return
      const ws = XLSX.utils.json_to_sheet(data)
      const cols = Object.keys((data as any[])[0]).map((k: string) => ({ wch: Math.max(k.length, 14) }))
      ws['!cols'] = cols
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
    })
    XLSX.writeFile(wb, filename)
  }

  async function backupAll() {
    setStatus(s => ({ ...s, all: 'loading' }))
    try {
      const [matchTips, tournamentTips, leaderboard, profiles, matches, members] = await Promise.all([
        fetchAll('match_tips'),
        fetchAll('tournament_tips'),
        fetchAll('leaderboard'),
        fetchAll('profiles'),
        fetchAll('matches'),
        fetchAll('tournament_members'),
      ])

      const date = new Date().toISOString().slice(0, 10)
      downloadXLSX(`tipping-stars-backup-${date}.xlsx`, {
        'Match Tips': matchTips,
        'Tournament Predictions': tournamentTips,
        'Leaderboard': leaderboard,
        'Profiles': profiles,
        'Matches': matches,
        'Members': members,
        'Tournaments': tournaments,
      })
      const now = new Date().toLocaleString('en-AU')
      setLastBackup(now)
      localStorage.setItem('last_backup', now)
      setStatus(s => ({ ...s, all: 'done' }))
      setTimeout(() => setStatus(s => ({ ...s, all: 'idle' })), 3000)
    } catch (e: any) {
      alert('Backup failed: ' + e.message)
      setStatus(s => ({ ...s, all: 'idle' }))
    }
  }

  async function backupTable(key: string, table: string, label: string) {
    setStatus(s => ({ ...s, [key]: 'loading' }))
    try {
      const data = await fetchAll(table)
      const date = new Date().toISOString().slice(0, 10)
      downloadXLSX(`tipping-stars-${key}-${date}.xlsx`, { [label]: data })
      setStatus(s => ({ ...s, [key]: 'done' }))
      setTimeout(() => setStatus(s => ({ ...s, [key]: 'idle' })), 3000)
    } catch (e: any) {
      alert(`Backup of ${label} failed: ` + e.message)
      setStatus(s => ({ ...s, [key]: 'idle' }))
    }
  }

  const tables = [
    { key: 'match_tips', table: 'match_tips', label: 'Match Tips', desc: 'All score predictions for every match', icon: '⚽' },
    { key: 'tournament_tips', table: 'tournament_tips', label: 'Tournament Predictions', desc: 'Winner, top scorer, group qualifier picks', icon: '🏆' },
    { key: 'leaderboard', table: 'leaderboard', label: 'Leaderboard', desc: 'Current points and stats for all players', icon: '📊' },
    { key: 'profiles', table: 'profiles', label: 'Profiles', desc: 'Player names, nicknames, avatars', icon: '👤' },
    { key: 'matches', table: 'matches', label: 'Matches', desc: 'All match data and results', icon: '📅' },
    { key: 'members', table: 'tournament_members', label: 'Members', desc: 'Tournament membership records', icon: '👥' },
  ]

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.35rem', color: 'rgba(255,255,255,0.5)' }}>
        💾 DATA BACKUP
      </h2>
      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        Download a JSON snapshot of your data. Store it somewhere safe — Google Drive, email, etc.
      </p>

      {/* Full backup */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#4ade80', marginBottom: '0.25rem' }}>
              📦 Full Backup — All Data
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
              Downloads everything in one file — tips, predictions, leaderboard, matches, profiles, members.
            </p>
            {lastBackup && (
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.35rem' }}>
                Last backup: {lastBackup}
              </p>
            )}
          </div>
          <button
            onClick={backupAll}
            disabled={status.all === 'loading'}
            className="btn btn-primary"
            style={{ flexShrink: 0, minWidth: 160 }}
          >
            {status.all === 'loading' ? '⏳ Exporting...' : status.all === 'done' ? '✅ Downloaded!' : '💾 Download Full Backup (.xlsx)'}
          </button>
        </div>
      </div>

      {/* Individual tables */}
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.75rem' }}>
        OR EXPORT INDIVIDUAL TABLES
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {tables.map(({ key, table, label, desc, icon }) => (
          <div key={key} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.15rem' }}>{icon} {label}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{desc}</div>
            </div>
            <button
              onClick={() => backupTable(key, table, label)}
              disabled={status[key] === 'loading'}
              className="btn btn-ghost"
              style={{ fontSize: '0.78rem', flexShrink: 0 }}
            >
              {status[key] === 'loading' ? '⏳ Exporting...' : status[key] === 'done' ? '✅ Done!' : '⬇️ Export'}
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '1rem 1.25rem', marginTop: '1.5rem', background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)' }}>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          💡 <strong>Tip:</strong> Run a Full Backup before and after major match days. Supabase also keeps automatic daily backups for 7 days on the free tier — this is an extra safety net you control.
        </p>
      </div>
    </div>
  )
}


function NotifyPanel({ tournamentId, supabase, tournaments }: any) {
  const [matches, setMatches] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [lang, setLang] = useState<'en'|'pt'>('en')

  useEffect(() => {
    supabase.from('matches').select('*')
      .eq('tournament_id', tournamentId)
      .eq('status', 'upcoming')
      .order('kickoff_at')
      .then(({ data }: any) => setMatches(data || []))
  }, [tournamentId])

  function toggleAll() {
    if (selected.size === matches.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(matches.map((m: any) => m.id)))
    }
  }

  async function sendNotifications() {
    if (selected.size === 0) return alert('Select at least one match')
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/notify-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchIds: Array.from(selected),
          tournamentId,
          lang,
        }),
      })
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setResult({ error: e.message })
    }
    setSending(false)
  }

  const ROUND: Record<string, string> = {
    group: 'Group', r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', final: 'Final'
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.35rem', color: 'rgba(255,255,255,0.5)' }}>
        📧 NOTIFY PLAYERS
      </h2>
      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.25rem' }}>
        Select upcoming matches to include in the notification email. One email per player with all selected matches.
      </p>

      {/* Lang selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Email language:</span>
        <button onClick={() => setLang('en')} style={{ padding: '0.25rem 0.75rem', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer', border: `1px solid ${lang==='en' ? '#4ade80' : 'rgba(255,255,255,0.12)'}`, background: lang==='en' ? 'rgba(74,222,128,0.1)' : 'transparent', color: lang==='en' ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>🇦🇺 English</button>
        <button onClick={() => setLang('pt')} style={{ padding: '0.25rem 0.75rem', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer', border: `1px solid ${lang==='pt' ? '#4ade80' : 'rgba(255,255,255,0.12)'}`, background: lang==='pt' ? 'rgba(74,222,128,0.1)' : 'transparent', color: lang==='pt' ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>🇧🇷 Português</button>
      </div>

      {/* Select all */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <button onClick={toggleAll} className="btn btn-ghost" style={{ fontSize: '0.78rem' }}>
          {selected.size === matches.length ? 'Deselect all' : 'Select all'}
        </button>
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{selected.size} of {matches.length} selected</span>
      </div>

      {/* Match list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem', maxHeight: 400, overflowY: 'auto' }}>
        {matches.map((m: any) => {
          const isSelected = selected.has(m.id)
          const kickoff = new Date(m.kickoff_at).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' })
          return (
            <div key={m.id} onClick={() => {
              const next = new Set(selected)
              isSelected ? next.delete(m.id) : next.add(m.id)
              setSelected(next)
            }} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.7rem 1rem', borderRadius: 8, cursor: 'pointer',
              background: isSelected ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isSelected ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? '#4ade80' : 'rgba(255,255,255,0.2)'}`, background: isSelected ? '#4ade80' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isSelected && <span style={{ color: '#0a0f0d', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.home_team} vs {m.away_team}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{kickoff} AEST · {ROUND[m.round] || m.round}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Send button */}
      <button
        onClick={sendNotifications}
        disabled={sending || selected.size === 0}
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center', opacity: selected.size === 0 ? 0.5 : 1 }}
      >
        {sending ? '⏳ Sending...' : `📧 Send to all players (${selected.size} match${selected.size !== 1 ? 'es' : ''})`}
      </button>

      {/* Result */}
      {result && (
        <div style={{ marginTop: '1rem', padding: '0.875rem 1.25rem', borderRadius: 8, background: result.error ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${result.error ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)'}` }}>
          {result.error
            ? <div style={{ color: '#f87171', fontSize: '0.85rem' }}>❌ Error: {result.error}</div>
            : <div>
                <div style={{ color: '#4ade80', fontSize: '0.85rem', marginBottom: result.failed > 0 || result.noEmail > 0 ? '0.5rem' : 0 }}>
                  ✅ Sent to {result.sent} player{result.sent !== 1 ? 's' : ''}
                </div>
                {result.failed > 0 && (
                  <div style={{ color: '#f87171', fontSize: '0.78rem' }}>
                    <div>❌ {result.failed} email{result.failed > 1 ? 's' : ''} failed</div>
                    {result.failedNames?.map((n: string, i: number) => (
                      <div key={i} style={{ marginTop: '0.2rem', opacity: 0.8, fontSize: '0.72rem' }}>· {n}</div>
                    ))}
                    <div style={{ marginTop: '0.35rem', opacity: 0.6, fontSize: '0.72rem' }}>
                      Note: Resend free tier only sends to verified emails. Add your domain at resend.com/domains to send to everyone.
                    </div>
                  </div>
                )}
                {result.noEmail > 0 && (
                  <div style={{ color: '#fbbf24', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                    ⚠️ {result.noEmail} player{result.noEmail > 1 ? 's' : ''} had no email on file — add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars to fix this.
                  </div>
                )}
              </div>
          }
        </div>
      )}
    </div>
  )
}


export default function AdminPage() {
  const { t } = useLang()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [tab, setTab] = useState<AdminTab>('tournaments')
  const [masterTab, setMasterTab] = useState<'setup'|'knockout'>('setup')
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>('')
  const [pendingMembers, setPendingMembers] = useState<any[]>([])
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [tournamentTips, setTournamentTips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [propagatedCount, setPropagatedCount] = useState(0)
  const supabase = createClient()

  useEffect(() => { init() }, [])
  useEffect(() => { if (selectedTournament) loadTournamentData() }, [selectedTournament])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof?.is_super_admin) { router.push('/'); return }
    setUser(user); setProfile(prof)
    const { data: tours } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false })
    setTournaments(tours || [])
    if (tours?.length) setSelectedTournament(tours[0].id)
    setLoading(false)
  }

  async function loadTournamentData() {
    const [membRes, matchRes, profilesRes, ttRes] = await Promise.all([
      supabase.from('tournament_members').select('*').eq('tournament_id', selectedTournament).order('joined_at'),
      supabase.from('matches').select('*').eq('tournament_id', selectedTournament).order('kickoff_at'),
      supabase.from('profiles').select('id,display_name,email,jersey_team,tip_position'),
      supabase.from('tournaments').select('*').eq('id', selectedTournament).single(),
    ])
    const profiles = profilesRes.data || []
    const members = (membRes.data || []).map((m: any) => ({
      ...m,
      profiles: profiles.find((p: any) => p.id === m.user_id)
    }))
    setPendingMembers(members.filter((m: any) => m.status === 'pending'))
    setAllMembers(members)
    setMatches(matchRes.data || [])
    setTournamentTips(ttRes.data || null)
  }

  async function approveMember(memberId: string, approve: boolean) {
    await supabase.from('tournament_members').update({
      status: approve ? 'approved' : 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    }).eq('id', memberId)
    loadTournamentData()
  }

  // Find all matches across all tournaments with same teams + date (±2h window)
  async function getAllMatchingMatches(matchId: string) {
    const { data: match } = await supabase.from('matches').select('home_team, away_team, kickoff_at').eq('id', matchId).single()
    if (!match) return [matchId]
    const kickoff = new Date(match.kickoff_at)
    const from = new Date(kickoff.getTime() - 2 * 60 * 60 * 1000).toISOString()
    const to = new Date(kickoff.getTime() + 2 * 60 * 60 * 1000).toISOString()
    const { data: matches } = await supabase.from('matches').select('id')
      .eq('home_team', match.home_team).eq('away_team', match.away_team)
      .gte('kickoff_at', from).lte('kickoff_at', to)
    return (matches || []).map((m: any) => m.id)
  }

  async function saveResult(matchId: string, homeScore: number, awayScore: number) {
    const ids = await getAllMatchingMatches(matchId)
    await Promise.all(ids.map(id => supabase.from('matches').update({ home_score: homeScore, away_score: awayScore }).eq('id', id)))
    setPropagatedCount(ids.length)
    loadTournamentData()
  }

  async function goLive(matchId: string) {
    const ids = await getAllMatchingMatches(matchId)
    await Promise.all(ids.map(id => supabase.from('matches').update({ status: 'live', home_score: 0, away_score: 0, result_locked: false }).eq('id', id)))
    loadTournamentData()
  }

  async function updateLiveScore(matchId: string, homeScore: number, awayScore: number) {
    const ids = await getAllMatchingMatches(matchId)
    await Promise.all(ids.map(id => supabase.from('matches').update({ home_score: homeScore, away_score: awayScore }).eq('id', id)))
    await Promise.all(ids.map(id => supabase.rpc('calculate_match_points', { p_match_id: id })))
    await Promise.all(ids.map(id => supabase.from('matches').update({ status: 'live' }).eq('id', id)))
    loadTournamentData()
  }

  async function endLive(matchId: string, homeScore: number, awayScore: number) {
    const ids = await getAllMatchingMatches(matchId)
    await Promise.all(ids.map(id => supabase.from('matches').update({ home_score: homeScore, away_score: awayScore, status: 'completed', result_locked: true }).eq('id', id)))
    await Promise.all(ids.map(id => supabase.rpc('calculate_match_points', { p_match_id: id })))
    loadTournamentData()
  }

  async function lockResult(matchId: string, homeScore: number, awayScore: number) {
    const ids = await getAllMatchingMatches(matchId)
    await Promise.all(ids.map(id => supabase.from('matches').update({ home_score: homeScore, away_score: awayScore, status: 'completed', result_locked: true }).eq('id', id)))
    await Promise.all(ids.map(id => supabase.rpc('calculate_match_points', { p_match_id: id })))
    loadTournamentData()
  }

  async function enterResult(matchId: string, homeScore: number, awayScore: number) {
    const ids = await getAllMatchingMatches(matchId)
    await Promise.all(ids.map(id => supabase.from('matches').update({ home_score: homeScore, away_score: awayScore, status: 'completed' }).eq('id', id)))
    await Promise.all(ids.map(id => supabase.rpc('calculate_match_points', { p_match_id: id })))
    loadTournamentData()
  }

  const currentTournament = tournaments.find((t: any) => t.id === selectedTournament)
  async function saveTournamentResults(results: { winner: string, second: string, third: string, top_scorer: string, group_results: Record<string, { first: string, second: string }> }) {
    // Run across ALL tournaments so results are synced everywhere
    const allTournamentIds = tournaments.map((t: any) => t.id)

    // Qualifier points for each tournament
    await Promise.all(allTournamentIds.map(async (tid: string) => {
      const tour = tournaments.find((t: any) => t.id === tid)
      const pts = tour?.pts_qualify || tour?.pts_qualifying_teams || 10
      if (results.group_results && Object.keys(results.group_results).length > 0) {
        await supabase.rpc('calculate_qualifier_points', {
          p_tournament_id: tid,
          p_pts_per_team: pts,
          p_groups: results.group_results as any,
        })
      }
    }))

    // Prediction points for each tournament
    if (results.winner || results.second || results.third || results.top_scorer) {
      await Promise.all(allTournamentIds.map((tid: string) =>
        supabase.rpc('calculate_tournament_points', {
          p_tournament_id: tid,
          p_winner: results.winner || '',
          p_second: results.second || '',
          p_third: results.third || '',
          p_top_scorer: results.top_scorer || '',
        })
      ))
    }

    loadTournamentData()
  }

  async function calculateGroupQualifierPoints(groupResults: Record<string, { first: string, second: string }>, ptsOverride?: number) {
    const ptsPerTeam = ptsOverride || currentTournament?.pts_qualify || currentTournament?.pts_qualifying_teams || 10
    if (!groupResults || Object.keys(groupResults).length === 0) return

    const { error } = await supabase.rpc('calculate_qualifier_points', {
      p_tournament_id: selectedTournament,
      p_pts_per_team: ptsPerTeam,
      p_groups: groupResults as any,
    })
    if (error) alert('Points calculation failed: ' + error.message)
  }


  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontFamily: 'var(--font-display)', color: 'var(--green-light)', letterSpacing: '0.1em' }}>LOADING...</div></div>

  return (
    <div className="min-h-screen">
      <header style={{ borderBottom: '1px solid var(--dark-border)', background: 'rgba(10,15,13,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}><ChevronLeft size={18} /></Link>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.08em', flex: 1 }}>ADMIN PANEL</span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>{profile?.display_name}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6 pb-16">
        {/* Tournament selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <select value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)} className="input" style={{ maxWidth: 280 }}>
            {tournaments.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {pendingMembers.length > 0 && (
            <span className="badge badge-red">{pendingMembers.length} pending approval</span>
          )}
        </div>

        {/* Tabs */}
        <div className="tab-nav" style={{ marginBottom: '1.5rem', overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch', paddingBottom: '2px' }}>
          <button className={`tab-btn ${tab === 'tournaments' ? 'active' : ''}`} onClick={() => setTab('tournaments')}><Settings size={13} style={{display:'inline',marginRight:4}}/>Setup</button>
          <button className={`tab-btn ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}><Users size={13} style={{display:'inline',marginRight:4}}/>Members {pendingMembers.length > 0 && `(${pendingMembers.length})`}</button>
          <button className={`tab-btn ${tab === 'matches' ? 'active' : ''}`} onClick={() => setTab('matches')}><Calendar size={13} style={{display:'inline',marginRight:4}}/>Matches</button>
          <button className={`tab-btn ${tab === 'results' ? 'active' : ''}`} onClick={() => setTab('results')}><Trophy size={13} style={{display:'inline',marginRight:4}}/>Results</button>
          <button className={`tab-btn ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>🏆 Leaderboard</button>
          <button className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>⏳ Pending Tips</button>
          <button className={`tab-btn ${tab === 'backup' ? 'active' : ''}`} onClick={() => setTab('backup')}>💾 Backup</button>
          <button className={`tab-btn ${tab === 'notify' ? 'active' : ''}`} onClick={() => setTab('notify')}>📧 Notify</button>
        </div>

        {/* Tournament Setup */}
        {tab === 'tournaments' && (
          <>
          <TournamentSetup tournament={currentTournament} onSave={init} onCreate={init} supabase={supabase} />
          {currentTournament?.invite_code && (
            <div className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.06em' }}>INVITE LINK</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <code style={{ flex: 1, fontSize: '0.78rem', color: '#4ade80', background: 'rgba(74,222,128,0.08)', padding: '0.5rem 0.75rem', borderRadius: 8, wordBreak: 'break-all' }}>
                  {typeof window !== 'undefined' ? window.location.origin + '/join/' + currentTournament.invite_code : '/join/' + currentTournament.invite_code}
                </code>
                <button className="btn btn-primary" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', flexShrink: 0 }}
                  onClick={() => { const url = window.location.origin + '/join/' + currentTournament.invite_code; navigator.clipboard.writeText(url).then(() => alert('Invite link copied!')) }}>
                  Copy link
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.5rem' }}>
                Link expires once the first match result is entered.
              </p>
            </div>
          )}
          </>
        )}

        {/* Members */}
        {tab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {pendingMembers.length > 0 && (
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', color: '#f87171', marginBottom: '0.75rem' }}>PENDING APPROVAL</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {pendingMembers.map((m: any) => (
                    <div key={m.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{m.profiles?.display_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>{m.profiles?.email} · Requested {format(new Date(m.joined_at), 'd MMM yyyy')}</div>
                      </div>
                      <button onClick={() => approveMember(m.id, true)} className="btn btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}>
                        <Check size={13} /> Approve
                      </button>
                      <button onClick={() => approveMember(m.id, false)} className="btn btn-danger" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}>
                        <X size={13} /> Reject
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>ALL MEMBERS ({allMembers.length})</h3>
              <div className="card" style={{ overflow: 'hidden' }}>
                {allMembers.map((m: any, i: number) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: i < allMembers.length-1 ? '1px solid var(--dark-border)' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{m.profiles?.display_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{m.profiles?.email}</div>
                      {m.profiles?.jersey_team && (
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                          🏷️ {m.profiles.jersey_team} · {m.profiles.tip_position}
                        </div>
                      )}
                    </div>
                    <span className={`badge ${m.status === 'approved' ? 'badge-green' : m.status === 'rejected' ? 'badge-red' : 'badge-grey'}`}>{m.status}</span>
                    {m.status === 'approved' && (
                      <>
                        <EntryFeeToggle member={m} supabase={supabase} onUpdate={loadTournamentData} />
                        <button
                          title="Reassign random team & position"
                          onClick={async () => {
                            const WC_TEAMS = ['Argentina','France','England','Spain','Brazil','Portugal','Netherlands','Germany','Italy','Morocco','Croatia','United States','Mexico','Japan','Uruguay','Colombia','Senegal','Switzerland','South Korea','Ecuador','Canada','Australia','Turkey','Poland','Serbia','Scotland','Belgium','Egypt','Iran','New Zealand']
                            const POSITIONS = ['ST','CF','LW','RW','CAM','CM','CDM','LB','RB','CB','GK','WB','WB']
                            const team = WC_TEAMS[Math.floor(Math.random() * WC_TEAMS.length)]
                            const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)]
                            await supabase.from('profiles').update({ jersey_team: team, tip_position: pos }).eq('id', m.user_id)
                            loadTournamentData()
                            alert(`Reassigned ${m.profiles?.display_name} → ${team} · ${pos}`)
                          }}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}
                        >🎲</button>
                      </>
                    )}
                  </div>
                ))}
                {allMembers.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No members yet</div>}
              </div>
            </div>
          </div>
        )}

        {/* Matches */}
        {tab === 'matches' && (
          <MatchManager matches={matches} tournamentId={selectedTournament} supabase={supabase} onUpdate={loadTournamentData} />
        )}

        {/* Results */}
        {tab === 'leaderboard' && selectedTournament && (
          <AdminLeaderboard tournamentId={selectedTournament} supabase={supabase} tournaments={tournaments} />
        )}

        {tab === 'pending' && selectedTournament && (
          <PendingTips tournamentId={selectedTournament} supabase={supabase} tournaments={tournaments} />
        )}

        {tab === 'backup' && (
          <BackupPanel supabase={supabase} tournaments={tournaments} />
        )}

        {tab === 'notify' && selectedTournament && (
          <NotifyPanel tournamentId={selectedTournament} supabase={supabase} tournaments={tournaments} />
        )}


        {tab === 'results' && (
          <div style={{ marginBottom: '0.75rem', padding: '0.6rem 1rem', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 10, fontSize: '0.78rem', color: 'rgba(96,165,250,0.7)' }}>
            ℹ️ Results automatically propagate to <strong>all tournaments</strong> with the same match (same teams + kickoff time).
            {propagatedCount > 1 && <span style={{ marginLeft: 8, color: '#4ade80' }}>✔ Last update applied to {propagatedCount} tournaments.</span>}
          </div>
        )}
        {tab === 'results' && (
          <ResultsEntry matches={matches} tournament={currentTournament} tournamentId={selectedTournament} supabase={supabase} onSave={saveResult} onLock={lockResult} onEdit={lockResult} onGoLive={goLive} onUpdateLive={updateLiveScore} onEndLive={endLive} onSaveTournamentResults={saveTournamentResults} />
        )}
      </div>
    </div>
  )
}

function TournamentResultsEntry({ tournament, tournamentId, supabase, onSave }: any) {
  const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']
  const [groupResults, setGroupResults] = useState<Record<string, { first: string, second: string }>>({})
  const [winner, setWinner] = useState('')
  const [second, setSecond] = useState('')
  const [third, setThird] = useState('')
  const [topScorer, setTopScorer] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [teamsByGroup, setTeamsByGroup] = useState<Record<string, string[]>>({})

  // Load persisted results from tournaments table on mount / tournament change
  useEffect(() => {
    if (!tournamentId) return

    // Load match teams for dropdowns
    supabase.from('matches').select('home_team,away_team,group_name,round').eq('tournament_id', tournamentId).eq('round', 'group')
      .then(({ data }: any) => {
        const map: Record<string, Set<string>> = {}
        data?.forEach((m: any) => {
          if (!m.group_name) return
          const raw = String(m.group_name).trim()
          const key = raw.length === 1 ? raw : raw.replace(/^group\s*/i, '').trim()
          if (!map[key]) map[key] = new Set()
          map[key].add(m.home_team)
          map[key].add(m.away_team)
        })
        const result: Record<string, string[]> = {}
        Object.entries(map).forEach(([g, s]) => { result[g] = Array.from(s).sort() })
        setTeamsByGroup(result)
      })

    // Load saved results from tournaments table
    supabase.from('tournaments').select('result_winner,result_second,result_third,result_top_scorer,result_groups').eq('id', tournamentId).single()
      .then(({ data }: any) => {
        if (!data) return
        if (data.result_winner) setWinner(data.result_winner)
        if (data.result_second) setSecond(data.result_second)
        if (data.result_third) setThird(data.result_third)
        if (data.result_top_scorer) setTopScorer(data.result_top_scorer)
        if (data.result_groups) {
          try {
            const g = typeof data.result_groups === 'string' ? JSON.parse(data.result_groups) : data.result_groups
            setGroupResults(g)
          } catch {}
        }
      })
  }, [tournamentId])

  function setGroup(group: string, pos: 'first' | 'second', val: string) {
    setGroupResults(prev => ({ ...prev, [group]: { ...(prev[group] || { first: '', second: '' }), [pos]: val } }))
  }

  async function persistAndCalculate() {
    setSaving(true)
    // Use RPC to bypass RLS and persist results
    const { error } = await supabase.rpc('save_tournament_results', {
      p_tournament_id: tournamentId,
      p_winner: winner || '',
      p_second: second || '',
      p_third: third || '',
      p_top_scorer: topScorer || '',
      p_groups: groupResults as any,
    })
    if (error) {
      console.error('Save results error:', error)
      alert('Failed to save: ' + error.message)
      setSaving(false)
      return
    }
    // Load back what was saved so local state matches DB
    setGroupResults(groupResults)
    // Now calculate points
    await onSave({ winner, second, third, top_scorer: topScorer, group_results: groupResults })
    setSaved(true); setTimeout(() => setSaved(false), 3000); setSaving(false)
  }

  async function handleSave() { await persistAndCalculate() }
  async function handleRecalculate() { await persistAndCalculate() }

  const selectStyle = { background: '#1a1a2e', color: '#fff', width: '100%' }
  const activeGroups = GROUPS.filter(g => teamsByGroup[g]?.length > 0)

  return (
    <div className="card" style={{ padding: '1.5rem', marginTop: '0.5rem' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.35rem', color: 'rgba(255,255,255,0.5)' }}>
        🏆 TOURNAMENT & GROUP RESULTS
      </h3>
      <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginBottom: '1.5rem' }}>
        Enter final results to calculate qualifier and prediction points. You can update these as groups finish.
      </p>

      {/* Group qualifier results */}
      {activeGroups.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.45)', marginBottom: '0.75rem' }}>
            🗂️ GROUP RESULTS (1st & 2nd place)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {activeGroups.map(group => {
              const teams = teamsByGroup[group] || []
              const g = groupResults[group] || { first: '', second: '' }
              return (
                <div key={group} className="card" style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
                    GROUP {group}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: '0.2rem' }}>🥇 1st</label>
                      <select className="input" style={selectStyle} value={g.first} onChange={e => setGroup(group, 'first', e.target.value)}>
                        <option value="">— Select —</option>
                        {teams.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: '0.2rem' }}>🥈 2nd</label>
                      <select className="input" style={selectStyle} value={g.second} onChange={e => setGroup(group, 'second', e.target.value)}>
                        <option value="">— Select —</option>
                        {teams.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tournament prediction results */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.45)', marginBottom: '0.75rem' }}>
          🌍 TOURNAMENT PREDICTION RESULTS
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: '🏆 World Cup Winner', val: winner, set: setWinner },
            { label: '🥈 2nd Place', val: second, set: setSecond },
            { label: '🥉 3rd Place', val: third, set: setThird },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.3rem' }}>{label}</label>
              <select className="input" style={{...selectStyle}} value={val} onChange={e => set(e.target.value)}>
                <option value="">— Select team —</option>
                {WC_TEAMS.map((tm: string) => <option key={tm} value={tm}>{tm}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.3rem' }}>⚽ Top Scorer</label>
            <select className="input" style={{...selectStyle}}
                value={['Kylian Mbappé','Erling Haaland','Vinicius Jr.','Rodrygo','Lautaro Martínez','Julián Álvarez','Lionel Messi','Neymar','Raphinha','Bruno Fernandes','Bernardo Silva','João Félix','Pedri','Gavi','Ferran Torres','Harry Kane','Jude Bellingham','Phil Foden','Bukayo Saka','Marcus Rashford','Cody Gakpo','Memphis Depay','Donyell Malen','Dušan Vlahović','Luka Modrić','Romelu Lukaku','Leroy Sané','Jamal Musiala','Florian Wirtz','Kai Havertz','Heung-Min Son','Kaoru Mitoma','Richarlison','Gabriel Martinelli','Éder Militão','Antoine Griezmann','Ousmane Dembélé','Randal Kolo Muani','Youssef En-Nesyri','Viktor Gyökeres'].includes(topScorer) ? topScorer : topScorer ? '__other__' : ''}
                onChange={e => { if (e.target.value === '__other__') setTopScorer(''); else setTopScorer(e.target.value) }}
              >
                <option value="">— Select a player —</option>
                {['Kylian Mbappé','Erling Haaland','Vinicius Jr.','Rodrygo','Lautaro Martínez','Julián Álvarez','Lionel Messi','Neymar','Raphinha','Bruno Fernandes','Bernardo Silva','João Félix','Pedri','Gavi','Ferran Torres','Harry Kane','Jude Bellingham','Phil Foden','Bukayo Saka','Marcus Rashford','Cody Gakpo','Memphis Depay','Donyell Malen','Dušan Vlahović','Luka Modrić','Romelu Lukaku','Leroy Sané','Jamal Musiala','Florian Wirtz','Kai Havertz','Heung-Min Son','Kaoru Mitoma','Richarlison','Gabriel Martinelli','Éder Militão','Antoine Griezmann','Ousmane Dembélé','Randal Kolo Muani','Youssef En-Nesyri','Viktor Gyökeres'].sort().map(p => <option key={p} value={p}>{p}</option>)}
                <option value="__other__">✏️ Other player...</option>
              </select>
              {topScorer && !['Kylian Mbappé','Erling Haaland','Vinicius Jr.','Rodrygo','Lautaro Martínez','Julián Álvarez','Lionel Messi','Neymar','Raphinha','Bruno Fernandes','Bernardo Silva','João Félix','Pedri','Gavi','Ferran Torres','Harry Kane','Jude Bellingham','Phil Foden','Bukayo Saka','Marcus Rashford','Cody Gakpo','Memphis Depay','Donyell Malen','Dušan Vlahović','Luka Modrić','Romelu Lukaku','Leroy Sané','Jamal Musiala','Florian Wirtz','Kai Havertz','Heung-Min Son','Kaoru Mitoma','Richarlison','Gabriel Martinelli','Éder Militão','Antoine Griezmann','Ousmane Dembélé','Randal Kolo Muani','Youssef En-Nesyri','Viktor Gyökeres'].includes(topScorer) && (
                <input type="text" className="input" style={{...selectStyle, marginTop: '0.4rem'}} value={topScorer} onChange={e => setTopScorer(e.target.value)} placeholder="Player name..." />
              )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary" disabled={saving} onClick={handleSave} style={{ padding: '0.6rem 1.5rem' }}>
          {saved ? '✔ Points Calculated!' : saving ? 'Calculating...' : '⚡ Save Results & Calculate Points'}
        </button>
        <button className="btn btn-ghost" disabled={saving} onClick={handleRecalculate} style={{ padding: '0.6rem 1.1rem', fontSize: '0.82rem' }}>
          🔄 {saving ? 'Calculating...' : 'Recalculate Points Only'}
        </button>
      </div>
    </div>
  )
}


function TournamentSetup({ tournament, onSave, onCreate, supabase }: any) {
  const [form, setForm] = useState(tournament ? { ...tournament } : {})
  useEffect(() => { setForm(tournament ? { ...tournament } : {}) }, [tournament?.id])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newFee, setNewFee] = useState('0')
  const [newCurrency, setNewCurrency] = useState('A$')

  async function saveSettings() {
    setSaving(true)
    // Parse numeric fields properly — keep decimals for multipliers
    const numericFields = [
      'pts_winner','pts_goal_diff','pts_exact_score','pts_big_margin_bonus','big_margin_threshold',
      'pts_qualify','tip_lock_minutes','entry_fee',
      'multiplier_group','multiplier_r32','multiplier_r16','multiplier_qf','multiplier_sf','multiplier_final',
      'pts_tournament_winner','pts_second_place','pts_third_place','pts_top_scorer',
      'prize_split_1st','prize_split_2nd','prize_split_3rd',
    ]
    const payload: any = { ...form, updated_at: new Date().toISOString() }
    numericFields.forEach(f => {
      if (payload[f] !== undefined && payload[f] !== '' && payload[f] !== null) {
        const parsed = parseFloat(String(payload[f]))
        if (!isNaN(parsed)) payload[f] = parsed
      }
    })
    const { error } = await supabase.from('tournaments').update(payload).eq('id', tournament.id)
    if (error) { alert('Save failed: ' + error.message); setSaving(false); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onSave()
    setSaving(false)
  }

  async function createTournament() {
    if (!newName.trim()) return
    setCreating(true)
    await supabase.from('tournaments').insert({ name: newName, description: newDesc, entry_fee: Number(newFee) || 0, currency: newCurrency })
    setNewName(''); setNewDesc(''); setNewFee('0'); onCreate(); setCreating(false)
  }

  const field = (label: string, key: string, type = 'number') => (
    <div key={key}>
      <label className="label">{label}</label>
      <input
        type={type}
        step={type === 'number' ? 'any' : undefined}
        className="input"
        value={form[key] ?? ''}
        onChange={e => setForm({ ...form, [key]: type === 'number' ? e.target.value : e.target.value })}
      />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Create new */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>CREATE NEW TOURNAMENT</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div><label className="label">Tournament name</label><input type="text" className="input" placeholder="e.g. Work Crew Cup" value={newName} onChange={e => setNewName(e.target.value)} /></div>
          <div><label className="label">Description (optional)</label><input type="text" className="input" placeholder="Brief description..." value={newDesc} onChange={e => setNewDesc(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}><label className="label">Entry fee</label><input type="number" className="input" value={newFee} onChange={e => setNewFee(e.target.value)} /></div>
            <div><label className="label">Currency</label>
              <select className="input" style={{ background: '#1a1a2e', color: '#fff' }} value={newCurrency} onChange={e => setNewCurrency(e.target.value)}>
                <option value="A$">A$ (AUD)</option>
                <option value="R$">R$ (BRL)</option>
                <option value="US$">US$ (USD)</option>
                <option value="£">£ (GBP)</option>
                <option value="€">€ (EUR)</option>
              </select>
            </div>
          </div>
          <button onClick={createTournament} disabled={creating || !newName.trim()} className="btn btn-gold"><Plus size={14} />{creating ? 'Creating...' : 'Create tournament'}</button>
        </div>
      </div>

      {/* Points config */}
      {tournament && (
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>POINTS CONFIG — {tournament.name.toUpperCase()}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {field('Correct winner', 'pts_winner')}
          {field('Correct goal diff', 'pts_goal_diff')}
          {field('Exact score', 'pts_exact_score')}
          {field('Big margin bonus', 'pts_big_margin_bonus')}
          {field('Big margin threshold (goals)', 'big_margin_threshold')}
          {field('Qualifying teams (per team)', 'pts_qualify')}
          {field('Tournament winner', 'pts_tournament_winner')}
          {field('2nd place', 'pts_second_place')}
          {field('3rd place', 'pts_third_place')}
          {field('Top scorer', 'pts_top_scorer')}
        </div>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.06em', margin: '1.25rem 0 0.75rem', color: 'rgba(255,255,255,0.4)' }}>🔒 TIP LOCK SETTINGS</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label className="label">Minutes before kick-off to lock tips</label>
            <input type="number" className="input" min={0} max={10080} value={form.tip_lock_minutes ?? 120}
              onChange={e => setForm({ ...form, tip_lock_minutes: Number(e.target.value) })} />
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.25rem' }}>e.g. 120 = 2 hours, 60 = 1 hour, 1 = 1 minute before</p>
          </div>
          <div>
            <label className="label">Group stage lock mode</label>
            <select className="input" value={form.group_lock_mode ?? 'per_match'}
              onChange={e => setForm({ ...form, group_lock_mode: e.target.value })}>
              <option value="per_match">Lock each match individually (per kick-off)</option>
              <option value="first_game">Lock all group tips before Group Game 1</option>
            </select>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.25rem' }}>
              "First game" locks ALL group tips before the tournament's first match kicks off
            </p>
          </div>
        </div>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.06em', margin: '1.25rem 0 0.75rem', color: 'rgba(255,255,255,0.4)' }}>PHASE MULTIPLIERS</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {field('Group stage', 'multiplier_group')}
          {field('Round of 32', 'multiplier_r32')}
          {field('Round of 16', 'multiplier_r16')}
          {field('Quarter-finals', 'multiplier_qf')}
          {field('Semi-finals', 'multiplier_sf')}
          {field('Final', 'multiplier_final')}
        </div>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.06em', margin: '1.25rem 0 0.75rem', color: 'rgba(255,255,255,0.4)' }}>PRIZE POOL SPLIT</h4>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>
          Set the % each place receives. Must total 100%. Prize pool = entry fee x approved members.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div>
            <label className="label">1st place %</label>
            <input type="number" className="input" min={0} max={100}
              value={form.prize_split_1st !== undefined && form.prize_split_1st !== null ? form.prize_split_1st : 60}
              onChange={e => setForm({ ...form, prize_split_1st: e.target.value === '' ? '' : Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">2nd place %</label>
            <input type="number" className="input" min={0} max={100}
              value={form.prize_split_2nd !== undefined && form.prize_split_2nd !== null ? form.prize_split_2nd : 30}
              onChange={e => setForm({ ...form, prize_split_2nd: e.target.value === '' ? '' : Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">3rd place %</label>
            <input type="number" className="input" min={0} max={100}
              value={form.prize_split_3rd !== undefined && form.prize_split_3rd !== null ? form.prize_split_3rd : 10}
              onChange={e => setForm({ ...form, prize_split_3rd: e.target.value === '' ? '' : Number(e.target.value) })} />
          </div>
        </div>
        {(() => {
          const total = (Number(form.prize_split_1st) || 0) + (Number(form.prize_split_2nd) || 0) + (Number(form.prize_split_3rd) || 0)
          return (
            <div style={{ fontSize: '0.78rem', marginBottom: '0.5rem', color: total === 100 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
              Total: {total}% {total === 100 ? 'Good' : '- must equal 100%'}
            </div>
          )
        })()}
        <button onClick={saveSettings} disabled={saving} className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
      )}
    </div>
  )
}

function EntryFeeToggle({ member, supabase, onUpdate }: any) {
  const { t } = useLang()
  const [paid, setPaid] = useState(member.entry_fee_paid)
  async function toggle() {
    const next = !paid
    await supabase.from('tournament_members').update({ entry_fee_paid: next }).eq('id', member.id)
    setPaid(next); onUpdate()
  }
  return (
    <button onClick={toggle} className={`badge ${paid ? 'badge-green' : 'badge-grey'}`} style={{ cursor: 'pointer', border: 'none', background: paid ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)' }}>
      {paid ? '$ Paid' : '$ Unpaid'}
    </button>
  )
}

const FIFA2026_MATCHES = [
  { home_team: 'Mexico', away_team: 'South Africa', kickoff_at: '2026-06-11T19:00:00Z', round: 'group', group_name: 'Group A', venue: 'Mexico City' },
  { home_team: 'South Korea', away_team: 'Czechia', kickoff_at: '2026-06-12T02:00:00Z', round: 'group', group_name: 'Group A', venue: 'Guadalajara' },
  { home_team: 'Czechia', away_team: 'South Africa', kickoff_at: '2026-06-18T16:00:00Z', round: 'group', group_name: 'Group A', venue: 'Atlanta' },
  { home_team: 'Mexico', away_team: 'South Korea', kickoff_at: '2026-06-19T03:00:00Z', round: 'group', group_name: 'Group A', venue: 'Guadalajara' },
  { home_team: 'Czechia', away_team: 'Mexico', kickoff_at: '2026-06-25T01:00:00Z', round: 'group', group_name: 'Group A', venue: 'Mexico City' },
  { home_team: 'South Africa', away_team: 'South Korea', kickoff_at: '2026-06-25T01:00:00Z', round: 'group', group_name: 'Group A', venue: 'Guadalajara' },
  { home_team: 'Canada', away_team: 'Bosnia and Herzegovina', kickoff_at: '2026-06-12T19:00:00Z', round: 'group', group_name: 'Group B', venue: 'Toronto' },
  { home_team: 'Qatar', away_team: 'Switzerland', kickoff_at: '2026-06-13T19:00:00Z', round: 'group', group_name: 'Group B', venue: 'Santa Clara' },
  { home_team: 'Switzerland', away_team: 'Bosnia and Herzegovina', kickoff_at: '2026-06-18T19:00:00Z', round: 'group', group_name: 'Group B', venue: 'Los Angeles' },
  { home_team: 'Canada', away_team: 'Qatar', kickoff_at: '2026-06-18T22:00:00Z', round: 'group', group_name: 'Group B', venue: 'Vancouver' },
  { home_team: 'Switzerland', away_team: 'Canada', kickoff_at: '2026-06-24T19:00:00Z', round: 'group', group_name: 'Group B', venue: 'Vancouver' },
  { home_team: 'Bosnia and Herzegovina', away_team: 'Qatar', kickoff_at: '2026-06-24T19:00:00Z', round: 'group', group_name: 'Group B', venue: 'Seattle' },
  { home_team: 'Brazil', away_team: 'Morocco', kickoff_at: '2026-06-13T22:00:00Z', round: 'group', group_name: 'Group C', venue: 'East Rutherford' },
  { home_team: 'Haiti', away_team: 'Scotland', kickoff_at: '2026-06-14T01:00:00Z', round: 'group', group_name: 'Group C', venue: 'Foxborough' },
  { home_team: 'Scotland', away_team: 'Morocco', kickoff_at: '2026-06-19T22:00:00Z', round: 'group', group_name: 'Group C', venue: 'Foxborough' },
  { home_team: 'Brazil', away_team: 'Haiti', kickoff_at: '2026-06-20T01:00:00Z', round: 'group', group_name: 'Group C', venue: 'Philadelphia' },
  { home_team: 'Scotland', away_team: 'Brazil', kickoff_at: '2026-06-24T22:00:00Z', round: 'group', group_name: 'Group C', venue: 'Miami' },
  { home_team: 'Morocco', away_team: 'Haiti', kickoff_at: '2026-06-24T22:00:00Z', round: 'group', group_name: 'Group C', venue: 'Atlanta' },
  { home_team: 'USA', away_team: 'Paraguay', kickoff_at: '2026-06-13T01:00:00Z', round: 'group', group_name: 'Group D', venue: 'Los Angeles' },
  { home_team: 'Australia', away_team: 'Turkey', kickoff_at: '2026-06-14T04:00:00Z', round: 'group', group_name: 'Group D', venue: 'Vancouver' },
  { home_team: 'USA', away_team: 'Australia', kickoff_at: '2026-06-19T19:00:00Z', round: 'group', group_name: 'Group D', venue: 'Seattle' },
  { home_team: 'Turkey', away_team: 'Paraguay', kickoff_at: '2026-06-20T04:00:00Z', round: 'group', group_name: 'Group D', venue: 'Santa Clara' },
  { home_team: 'Turkey', away_team: 'USA', kickoff_at: '2026-06-25T02:00:00Z', round: 'group', group_name: 'Group D', venue: 'Los Angeles' },
  { home_team: 'Paraguay', away_team: 'Australia', kickoff_at: '2026-06-25T02:00:00Z', round: 'group', group_name: 'Group D', venue: 'Santa Clara' },
  { home_team: 'Germany', away_team: 'Curacao', kickoff_at: '2026-06-14T17:00:00Z', round: 'group', group_name: 'Group E', venue: 'Houston' },
  { home_team: 'Ivory Coast', away_team: 'Ecuador', kickoff_at: '2026-06-14T23:00:00Z', round: 'group', group_name: 'Group E', venue: 'Philadelphia' },
  { home_team: 'Germany', away_team: 'Ivory Coast', kickoff_at: '2026-06-20T20:00:00Z', round: 'group', group_name: 'Group E', venue: 'Toronto' },
  { home_team: 'Ecuador', away_team: 'Curacao', kickoff_at: '2026-06-21T00:00:00Z', round: 'group', group_name: 'Group E', venue: 'Kansas City' },
  { home_team: 'Ecuador', away_team: 'Germany', kickoff_at: '2026-06-25T20:00:00Z', round: 'group', group_name: 'Group E', venue: 'East Rutherford' },
  { home_team: 'Curacao', away_team: 'Ivory Coast', kickoff_at: '2026-06-25T20:00:00Z', round: 'group', group_name: 'Group E', venue: 'Philadelphia' },
  { home_team: 'Netherlands', away_team: 'Japan', kickoff_at: '2026-06-14T20:00:00Z', round: 'group', group_name: 'Group F', venue: 'Arlington' },
  { home_team: 'Sweden', away_team: 'Tunisia', kickoff_at: '2026-06-15T02:00:00Z', round: 'group', group_name: 'Group F', venue: 'Guadalajara' },
  { home_team: 'Netherlands', away_team: 'Sweden', kickoff_at: '2026-06-20T17:00:00Z', round: 'group', group_name: 'Group F', venue: 'Houston' },
  { home_team: 'Tunisia', away_team: 'Japan', kickoff_at: '2026-06-21T04:00:00Z', round: 'group', group_name: 'Group F', venue: 'Guadalajara' },
  { home_team: 'Japan', away_team: 'Sweden', kickoff_at: '2026-06-25T23:00:00Z', round: 'group', group_name: 'Group F', venue: 'Dallas' },
  { home_team: 'Tunisia', away_team: 'Netherlands', kickoff_at: '2026-06-25T23:00:00Z', round: 'group', group_name: 'Group F', venue: 'Kansas City' },
  { home_team: 'Belgium', away_team: 'Egypt', kickoff_at: '2026-06-15T22:00:00Z', round: 'group', group_name: 'Group G', venue: 'Seattle' },
  { home_team: 'Iran', away_team: 'New Zealand', kickoff_at: '2026-06-16T04:00:00Z', round: 'group', group_name: 'Group G', venue: 'Los Angeles' },
  { home_team: 'Belgium', away_team: 'Iran', kickoff_at: '2026-06-21T19:00:00Z', round: 'group', group_name: 'Group G', venue: 'Los Angeles' },
  { home_team: 'New Zealand', away_team: 'Egypt', kickoff_at: '2026-06-22T01:00:00Z', round: 'group', group_name: 'Group G', venue: 'Vancouver' },
  { home_team: 'New Zealand', away_team: 'Belgium', kickoff_at: '2026-06-26T20:00:00Z', round: 'group', group_name: 'Group G', venue: 'Seattle' },
  { home_team: 'Egypt', away_team: 'Iran', kickoff_at: '2026-06-26T20:00:00Z', round: 'group', group_name: 'Group G', venue: 'Vancouver' },
  { home_team: 'Spain', away_team: 'Cape Verde', kickoff_at: '2026-06-15T17:00:00Z', round: 'group', group_name: 'Group H', venue: 'Atlanta' },
  { home_team: 'Saudi Arabia', away_team: 'Uruguay', kickoff_at: '2026-06-15T22:00:00Z', round: 'group', group_name: 'Group H', venue: 'Miami' },
  { home_team: 'Spain', away_team: 'Saudi Arabia', kickoff_at: '2026-06-21T16:00:00Z', round: 'group', group_name: 'Group H', venue: 'Atlanta' },
  { home_team: 'Uruguay', away_team: 'Cape Verde', kickoff_at: '2026-06-21T22:00:00Z', round: 'group', group_name: 'Group H', venue: 'Miami' },
  { home_team: 'Cape Verde', away_team: 'Saudi Arabia', kickoff_at: '2026-06-26T00:00:00Z', round: 'group', group_name: 'Group H', venue: 'Houston' },
  { home_team: 'Uruguay', away_team: 'Spain', kickoff_at: '2026-06-27T00:00:00Z', round: 'group', group_name: 'Group H', venue: 'Guadalajara' },
  { home_team: 'France', away_team: 'Senegal', kickoff_at: '2026-06-16T19:00:00Z', round: 'group', group_name: 'Group I', venue: 'East Rutherford' },
  { home_team: 'Iraq', away_team: 'Norway', kickoff_at: '2026-06-16T22:00:00Z', round: 'group', group_name: 'Group I', venue: 'Foxborough' },
  { home_team: 'France', away_team: 'Iraq', kickoff_at: '2026-06-22T21:00:00Z', round: 'group', group_name: 'Group I', venue: 'Philadelphia' },
  { home_team: 'Norway', away_team: 'Senegal', kickoff_at: '2026-06-23T00:00:00Z', round: 'group', group_name: 'Group I', venue: 'East Rutherford' },
  { home_team: 'Norway', away_team: 'France', kickoff_at: '2026-06-27T19:00:00Z', round: 'group', group_name: 'Group I', venue: 'Foxborough' },
  { home_team: 'Senegal', away_team: 'Iraq', kickoff_at: '2026-06-27T19:00:00Z', round: 'group', group_name: 'Group I', venue: 'Toronto' },
  { home_team: 'Argentina', away_team: 'Algeria', kickoff_at: '2026-06-17T01:00:00Z', round: 'group', group_name: 'Group J', venue: 'Kansas City' },
  { home_team: 'Austria', away_team: 'Jordan', kickoff_at: '2026-06-17T04:00:00Z', round: 'group', group_name: 'Group J', venue: 'Santa Clara' },
  { home_team: 'Argentina', away_team: 'Austria', kickoff_at: '2026-06-22T17:00:00Z', round: 'group', group_name: 'Group J', venue: 'Dallas' },
  { home_team: 'Jordan', away_team: 'Algeria', kickoff_at: '2026-06-23T03:00:00Z', round: 'group', group_name: 'Group J', venue: 'Santa Clara' },
  { home_team: 'Algeria', away_team: 'Austria', kickoff_at: '2026-06-27T23:00:00Z', round: 'group', group_name: 'Group J', venue: 'Kansas City' },
  { home_team: 'Jordan', away_team: 'Argentina', kickoff_at: '2026-06-28T02:00:00Z', round: 'group', group_name: 'Group J', venue: 'Miami' },
  { home_team: 'Portugal', away_team: 'DR Congo', kickoff_at: '2026-06-17T17:00:00Z', round: 'group', group_name: 'Group K', venue: 'Houston' },
  { home_team: 'Uzbekistan', away_team: 'Colombia', kickoff_at: '2026-06-18T02:00:00Z', round: 'group', group_name: 'Group K', venue: 'Mexico City' },
  { home_team: 'Portugal', away_team: 'Uzbekistan', kickoff_at: '2026-06-23T17:00:00Z', round: 'group', group_name: 'Group K', venue: 'Houston' },
  { home_team: 'Colombia', away_team: 'DR Congo', kickoff_at: '2026-06-24T02:00:00Z', round: 'group', group_name: 'Group K', venue: 'Guadalajara' },
  { home_team: 'Colombia', away_team: 'Portugal', kickoff_at: '2026-06-28T19:00:00Z', round: 'group', group_name: 'Group K', venue: 'Dallas' },
  { home_team: 'DR Congo', away_team: 'Uzbekistan', kickoff_at: '2026-06-28T22:00:00Z', round: 'group', group_name: 'Group K', venue: 'Seattle' },
  { home_team: 'England', away_team: 'Croatia', kickoff_at: '2026-06-17T20:00:00Z', round: 'group', group_name: 'Group L', venue: 'Dallas' },
  { home_team: 'Ghana', away_team: 'Panama', kickoff_at: '2026-06-17T23:00:00Z', round: 'group', group_name: 'Group L', venue: 'Toronto' },
  { home_team: 'England', away_team: 'Ghana', kickoff_at: '2026-06-23T20:00:00Z', round: 'group', group_name: 'Group L', venue: 'Foxborough' },
  { home_team: 'Panama', away_team: 'Croatia', kickoff_at: '2026-06-23T23:00:00Z', round: 'group', group_name: 'Group L', venue: 'Toronto' },
  { home_team: 'Croatia', away_team: 'Ghana', kickoff_at: '2026-06-28T23:00:00Z', round: 'group', group_name: 'Group L', venue: 'Boston' },
  { home_team: 'Panama', away_team: 'England', kickoff_at: '2026-06-29T02:00:00Z', round: 'group', group_name: 'Group L', venue: 'Miami' },
]

function MatchManager({ matches, tournamentId, supabase, onUpdate }: any) {
  const emptyMatch = { home_team: '', away_team: '', kickoff_at: '', round: 'group', group_name: '', venue: '', tournament_id: tournamentId }
  const [form, setForm] = useState(emptyMatch)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const emptyKo = { home_team: '', away_team: '', kickoff_at: '', round: 'r32', venue: '', tournament_id: tournamentId }
  const [koForm, setKoForm] = useState(emptyKo)
  const [koTimezone, setKoTimezone] = useState('')
  const [savingKo, setSavingKo] = useState(false)
  const [lockingMatch, setLockingMatch] = useState<string | null>(null)

  async function importFIFA2026() {
    if (!confirm('This will add all 72 FIFA World Cup 2026 group stage matches. Continue?')) return
    setImporting(true)
    const toInsert = FIFA2026_MATCHES.map(m => ({ ...m, tournament_id: tournamentId }))
    for (let i = 0; i < toInsert.length; i += 20) {
      await supabase.from('matches').insert(toInsert.slice(i, i + 20))
    }
    setImportDone(true)
    setImporting(false)
    onUpdate()
  }

  async function addMatch() {
    if (!form.home_team || !form.away_team || !form.kickoff_at) return
    setSaving(true)
    await supabase.from('matches').insert(form)
    setForm(emptyMatch); onUpdate(); setSaving(false)
  }

  async function toggleMatchLock(matchId: string, currentlyLocked: boolean) {
    setLockingMatch(matchId)
    const { error } = await supabase
      .from('matches')
      .update({ tip_lock_override: !currentlyLocked })
      .eq('id', matchId)
    if (error) alert('Lock failed: ' + error.message)
    else onUpdate()
    setLockingMatch(null)
  }

  async function addKoMatch() {
    if (!koForm.home_team || !koForm.away_team || !koForm.kickoff_at) return
    setSavingKo(true)
    try {
      // Insert into ALL tournaments so everyone sees the knockout match
      const { data: allTours, error: tourErr } = await supabase.from('tournaments').select('id')
      if (tourErr) { alert('Error fetching tournaments: ' + tourErr.message); setSavingKo(false); return }
      
      // koForm.kickoff_at is already in UTC after timezone conversion — append Z to prevent browser re-converting
      const kickoffISO = new Date(koForm.kickoff_at + 'Z').toISOString()
      const inserts = (allTours || []).map((t: any) => ({
        home_team: koForm.home_team,
        away_team: koForm.away_team,
        kickoff_at: kickoffISO,
        round: koForm.round,
        venue: koForm.venue || null,
        group_name: null,
        status: 'upcoming',
        tournament_id: t.id,
      }))
      
      console.log('Inserting knockout matches:', inserts)
      const { error } = await supabase.from('matches').insert(inserts)
      if (error) {
        alert('Error adding match: ' + error.message)
        console.error('Insert error:', error)
      } else {
        alert(`✅ Match added to ${inserts.length} tournament(s)!`)
        setKoForm(emptyKo)
        onUpdate()
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    }
    setSavingKo(false)
  }

  async function deleteMatch(id: string) {
    if (!confirm('Delete this match and all its tips from ALL tournaments?')) return
    // Get match details to delete all copies across tournaments
    const { data: m } = await supabase.from('matches').select('home_team, away_team, kickoff_at').eq('id', id).single()
    if (m) {
      // Delete tips first (cascade may not be set)
      const { data: copies } = await supabase.from('matches').select('id').eq('home_team', m.home_team).eq('away_team', m.away_team).eq('kickoff_at', m.kickoff_at)
      if (copies?.length) {
        const ids = copies.map((c: any) => c.id)
        await supabase.from('match_tips').delete().in('match_id', ids)
        await supabase.from('matches').delete().in('id', ids)
      }
    } else {
      await supabase.from('matches').delete().eq('id', id)
    }
    onUpdate()
  }

  const rounds = [
    { value: 'group', label: 'Group stage' }, { value: 'r32', label: 'Round of 32' },
    { value: 'r16', label: 'Round of 16' }, { value: 'qf', label: 'Quarter-finals' },
    { value: 'sf', label: 'Semi-finals' }, { value: 'third_place', label: '3rd Place' }, { value: 'final', label: 'Final' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '1.5rem', background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.5rem', color: 'var(--gold)' }}>🌍 FIFA WORLD CUP 2026 — AUTO IMPORT</h3>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>Automatically add all 72 group stage matches with correct times (stored in UTC). Times will display in each user's local timezone.</p>
        <button onClick={importFIFA2026} disabled={importing || importDone} className="btn btn-gold">
          {importDone ? '✔ All 72 matches imported!' : importing ? 'Importing...' : '⚡ Import all FIFA 2026 group stage matches'}
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>ADD MATCH MANUALLY</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div><label className="label">Home team</label><input type="text" className="input" placeholder="e.g. Brazil" value={form.home_team} onChange={e => setForm({...form,home_team:e.target.value})} /></div>
          <div><label className="label">Away team</label><input type="text" className="input" placeholder="e.g. Argentina" value={form.away_team} onChange={e => setForm({...form,away_team:e.target.value})} /></div>
          <div><label className="label">Kickoff (local time)</label><input type="datetime-local" className="input" value={form.kickoff_at} onChange={e => setForm({...form,kickoff_at:e.target.value})} /></div>
          <div><label className="label">Round</label>
            <select className="input" value={form.round} onChange={e => setForm({...form,round:e.target.value})}>
              {rounds.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div><label className="label">Group (optional)</label><input type="text" className="input" placeholder="e.g. Group A" value={form.group_name} onChange={e => setForm({...form,group_name:e.target.value})} /></div>
          <div><label className="label">Venue (optional)</label><input type="text" className="input" placeholder="e.g. SoFi Stadium" value={form.venue} onChange={e => setForm({...form,venue:e.target.value})} /></div>
        </div>
        <button onClick={addMatch} disabled={saving} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          <Plus size={14} />{saving ? 'Adding...' : 'Add match'}
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem', background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.15)', marginBottom: '0' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.5rem', color: '#60a5fa' }}>⚡ ADD KNOCKOUT MATCH</h3>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
          Add knockout matches to all tournaments at once. Use TBD if teams aren't confirmed yet.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Home team</label>
              <select className="input" style={{ background: '#1a1a2e', color: koForm.home_team ? '#fff' : 'rgba(255,255,255,0.4)' }} value={koForm.home_team} onChange={e => setKoForm({...koForm, home_team: e.target.value})}>
                <option value="">Select team...</option>
                {WC_TEAMS.map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Away team</label>
              <select className="input" style={{ background: '#1a1a2e', color: koForm.away_team ? '#fff' : 'rgba(255,255,255,0.4)' }} value={koForm.away_team} onChange={e => setKoForm({...koForm, away_team: e.target.value})}>
                <option value="">Select team...</option>
                {WC_TEAMS.map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Round</label>
              <select className="input" value={koForm.round} onChange={e => setKoForm({...koForm,round:e.target.value})}>
                <option value="r32">Round of 32</option>
                <option value="r16">Round of 16</option>
                <option value="qf">Quarter-finals</option>
                <option value="sf">Semi-finals</option>
                <option value="third_place">3rd Place</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div>
              <label className="label">Venue (optional)</label>
              <input type="text" className="input" placeholder="e.g. SoFi Stadium" value={koForm.venue} onChange={e => setKoForm({...koForm,venue:e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label">Kickoff time (enter local time, then convert to UTC)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <input type="datetime-local" className="input" value={koForm.kickoff_at} onChange={e => setKoForm({...koForm,kickoff_at:e.target.value})} />
              <select className="input" style={{ background: '#1a1a2e', color: '#fff' }}
                value={koTimezone}
                onChange={e => {
                  const tz = e.target.value
                  setKoTimezone(tz)
                  if (!koForm.kickoff_at || !tz) return
                  const offsetHours = Number(tz)
                  // Treat the input value as the LOCAL time at the venue (naive, no browser TZ)
                  // Parse it manually to avoid browser adding its own timezone offset
                  const [datePart, timePart] = koForm.kickoff_at.split('T')
                  const [year, month, day] = datePart.split('-').map(Number)
                  const [hour, minute] = timePart.split(':').map(Number)
                  // Convert venue local time to UTC by subtracting venue offset
                  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - offsetHours * 60 * 60 * 1000
                  const utc = new Date(utcMs)
                  const pad = (n: number) => String(n).padStart(2,'0')
                  const utcStr = `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth()+1)}-${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}:${pad(utc.getUTCMinutes())}`
                  setKoForm(prev => ({...prev, kickoff_at: utcStr}))
                }}>
                <option value="">Select timezone of venue</option>
                <option value="10">🇦🇺 Sydney AEST (UTC+10)</option>
                <option value="11">🇦🇺 Sydney AEDT (UTC+11) — daylight saving</option>
                <option value="-3">🇧🇷 Brazil BRT (UTC-3)</option>
                <option value="-4">🇺🇸 ET (UTC-4) — New York / Miami</option>
                <option value="-5">🇺🇸 CT (UTC-5) — Dallas / Kansas City</option>
                <option value="-6">🇺🇸 MT (UTC-6) — Denver / Phoenix / Mexico City</option>
                <option value="-7">🇺🇸 PT (UTC-7) — LA / Seattle / Vancouver</option>
                <option value="0">UTC (UTC+0)</option>
              </select>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.25rem' }}>
              Enter local kickoff time → select venue timezone → field auto-converts to UTC
            </p>
            {koForm.kickoff_at && (
              <div style={{ fontSize: '0.72rem', marginTop: '0.35rem' }}>
                {koTimezone
                  ? <span style={{ color: '#4ade80' }}>✅ Sydney time: {new Date(koForm.kickoff_at + 'Z').toLocaleString('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })} AEST</span>
                  : <span style={{ color: '#f87171' }}>⚠️ Select a timezone above to convert correctly</span>
                }
              </div>
            )}
          </div>
        </div>
        <button onClick={addKoMatch} disabled={savingKo || !koForm.home_team || !koForm.away_team || !koForm.kickoff_at} className="btn btn-primary" style={{ marginTop: '1rem', background: 'rgba(96,165,250,0.2)', borderColor: '#60a5fa', color: '#60a5fa' }}>
          <Plus size={14} />{savingKo ? 'Adding...' : 'Add knockout match'}
        </button>
      </div>


      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>MATCHES ({matches.length})</h3>
        <div className="card" style={{ overflow: 'hidden' }}>
          {matches.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No matches added yet</div>}
          {matches.map((m: any, i: number) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', borderBottom: i < matches.length-1 ? '1px solid var(--dark-border)' : 'none' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{m.home_team} vs {m.away_team}</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>{m.round} · {format(new Date(m.kickoff_at), 'd MMM HH:mm')}</span>
                {m.group_name && <span className="badge badge-grey" style={{ marginLeft: '0.5rem' }}>{m.group_name}</span>}
              </div>
              <span className={`badge ${m.status === 'completed' ? 'badge-green' : m.status === 'live' ? 'badge-gold' : 'badge-grey'}`}>{m.status}</span>
              {m.status === 'completed' && <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-display)' }}>{m.home_score}–{m.away_score}</span>}
              <button
                onClick={() => toggleMatchLock(m.id, !!m.tip_lock_override)}
                disabled={lockingMatch === m.id}
                title={m.tip_lock_override ? 'Unlock tipping' : 'Manually lock tipping'}
                style={{ background: 'none', border: `1px solid ${m.tip_lock_override ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, color: m.tip_lock_override ? '#fbbf24' : 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                {lockingMatch === m.id ? '...' : m.tip_lock_override ? '🔒 Locked' : '🔒 Lock'}
              </button>
              <button onClick={() => deleteMatch(m.id)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', padding: '0.25rem' }}><X size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultsEntry({ matches, tournament, tournamentId, supabase, onSave, onLock, onEdit, onGoLive, onUpdateLive, onEndLive, onSaveTournamentResults }: any) {
  const [scores, setScores] = useState<Record<string, { home: string, away: string }>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [lockingQualifiers, setLockingQualifiers] = useState(false)
  const [lockingPredictions, setLockingPredictions] = useState(false)
  const [qualifiersLocked, setQualifiersLocked] = useState<boolean | null>(null)
  const [predictionsLocked, setPredictionsLocked] = useState<boolean | null>(null)

  // Load lock state directly from tournaments table (always reliable)
  useEffect(() => {
    if (!tournamentId) return
    supabase.from('tournaments').select('qualifiers_locked, predictions_locked').eq('id', tournamentId).single()
      .then(({ data }: any) => {
        if (data) {
          setQualifiersLocked(data.qualifiers_locked || false)
          setPredictionsLocked(data.predictions_locked || false)
        }
      })
  }, [tournamentId])

  async function toggleQualifiers() {
    const newVal = !qualifiersLocked
    if (newVal && !confirm('Lock group qualifier picks? Players will not be able to edit until you unlock.')) return
    setLockingQualifiers(true)
    // Update tournaments table (single source of truth)
    await supabase.from('tournaments').update({ qualifiers_locked: newVal }).eq('id', tournamentId)
    // Also sync all existing tip rows
    await supabase.from('tournament_tips').update({ is_locked: newVal }).eq('tournament_id', tournamentId)
    setQualifiersLocked(newVal)
    setLockingQualifiers(false)
  }

  async function togglePredictions() {
    const newVal = !predictionsLocked
    if (newVal && !confirm('Lock tournament predictions (winner, 2nd, 3rd, top scorer)?')) return
    setLockingPredictions(true)
    // Update tournaments table (single source of truth)
    await supabase.from('tournaments').update({ predictions_locked: newVal }).eq('id', tournamentId)
    // Also sync all existing tip rows
    await supabase.from('tournament_tips').update({ is_locked: newVal }).eq('tournament_id', tournamentId)
    setPredictionsLocked(newVal)
    setLockingPredictions(false)
  }

  function setScore(matchId: string, key: 'home' | 'away', val: string) {
    setScores(prev => ({ ...prev, [matchId]: { ...prev[matchId], [key]: val } }))
  }

  function startEdit(m: any) {
    setEditing(m.id)
    setScores(prev => ({ ...prev, [m.id]: { home: String(m.home_score), away: String(m.away_score) } }))
  }

  async function handleSave(matchId: string) {
    const s = scores[matchId]
    if (!s) return
    const homeVal = s.home === '' || s.home === '-' ? 0 : Number(s.home)
    const awayVal = s.away === '' || s.away === '-' ? 0 : Number(s.away)
    setSaving(matchId)
    await onSave(matchId, homeVal, awayVal)
    setSaving(null)
  }

  async function handleLock(matchId: string) {
    const s = scores[matchId]
    if (!s) return
    const homeVal = s.home === '' || s.home === '-' ? 0 : Number(s.home)
    const awayVal = s.away === '' || s.away === '-' ? 0 : Number(s.away)
    if (!confirm('Lock this result? Points will be calculated and players will see the score.')) return
    setSaving(matchId)
    await onLock(matchId, homeVal, awayVal)
    setSaving(null)
  }

  const live = matches.filter((m: any) => m.status === 'live')
  const pending = matches.filter((m: any) => m.status !== 'completed' && m.status !== 'live')
  const completed = matches.filter((m: any) => m.status === 'completed')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Admin lock controls */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.03)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', marginBottom: '0.35rem', color: 'rgba(255,255,255,0.5)' }}>🔐 LOCK / UNLOCK TIPPING</h3>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>
          Toggle to lock or unlock player editing. You can lock and re-open as needed.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem',
              borderColor: qualifiersLocked ? '#f87171' : 'rgba(251,191,36,0.5)',
              color: qualifiersLocked ? '#f87171' : '#fbbf24' }}
            disabled={lockingQualifiers || qualifiersLocked === null}
            onClick={toggleQualifiers}
          >
            {lockingQualifiers ? '...' : qualifiersLocked ? '🔓 Unlock Group Qualifier Picks' : '🔒 Lock Group Qualifier Picks'}
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem',
              borderColor: predictionsLocked ? '#f87171' : 'rgba(251,191,36,0.5)',
              color: predictionsLocked ? '#f87171' : '#fbbf24' }}
            disabled={lockingPredictions || predictionsLocked === null}
            onClick={togglePredictions}
          >
            {lockingPredictions ? '...' : predictionsLocked ? '🔓 Unlock Tournament Predictions' : '🔒 Lock Tournament Predictions'}
          </button>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.75rem' }}>
          🔒 = players cannot edit · 🔓 = players can edit · Current state loads from database on page open
        </p>
      </div>

      {live.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.75rem', color: '#f87171' }}>🔴 LIVE NOW</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {live.map((m: any) => {
              const s = scores[m.id] !== undefined ? scores[m.id] : { home: String(m.home_score ?? 0), away: String(m.away_score ?? 0) }
              const isSaving = saving === m.id
              return (
                <div key={m.id} className="card" style={{ padding: '1rem 1.25rem', border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
                      <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>LIVE</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{m.home_team} vs {m.away_team}</span>
                      {m.round && (() => { const rl: Record<string,string> = { group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-Final', sf: 'Semi-Final', third_place: '3rd Place', final: 'Final' }; return <span style={{ fontSize: '0.68rem', color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '0.1rem 0.45rem', borderRadius: 4 }}>{rl[m.round] || m.round}</span> })()}
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#f87171' }}>{m.home_score ?? 0}–{m.away_score ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input type="number" className="score-input" min={0} max={99} value={s.home} onChange={e => setScore(m.id, 'home', e.target.value)} onBlur={e => { if(e.target.value === '' || e.target.value === '-') setScore(m.id, 'home', '0') }} />
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>–</span>
                    <input type="number" className="score-input" min={0} max={99} value={s.away} onChange={e => setScore(m.id, 'away', e.target.value)} onBlur={e => { if(e.target.value === '' || e.target.value === '-') setScore(m.id, 'away', '0') }} />
                    <button className="btn btn-ghost" style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem', color: '#f87171' }} disabled={isSaving} onClick={async () => { setSaving(m.id); await onUpdateLive(m.id, Number(s.home), Number(s.away)); setSaving(null) }}>
                      {isSaving ? '...' : '⚡ Update Score'}
                    </button>
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'rgba(34,197,94,0.2)', borderColor: '#4ade80', color: '#4ade80' }} disabled={isSaving} onClick={async () => { if(confirm('End match and lock final result?')) { setSaving(m.id); await onEndLive(m.id, Number(s.home), Number(s.away)); setSaving(null) } }}>
                      ✔ Full Time
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.5)' }}>PENDING RESULTS</h3>
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>
          Enter the score and click <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Save</strong> to store it privately, or <strong style={{ color: '#4ade80' }}>Lock Result</strong> to publish it and calculate points.
        </p>
        {pending.length === 0 && (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
            All match results have been locked — great work!
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {pending.map((m: any) => {
            const s = scores[m.id] || { home: m.home_score !== null ? String(m.home_score) : '', away: m.away_score !== null ? String(m.away_score) : '' }
            const isSaving = saving === m.id
            const hasSavedScore = m.home_score !== null && m.away_score !== null
            return (
              <div key={m.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 600 }}>{m.home_team} vs {m.away_team}</span>
                    {m.round && (() => { const rl: Record<string,string> = { group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-Final', sf: 'Semi-Final', third_place: '3rd Place', final: 'Final' }; return <span style={{ fontSize: '0.68rem', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '0.1rem 0.45rem', borderRadius: 4, border: '1px solid rgba(96,165,250,0.2)' }}>{rl[m.round] || m.round}</span> })()}
                    {m.group_name && <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{m.group_name}</span>}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{new Date(m.kickoff_at).toLocaleString(undefined, {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false})}</span>
                  {hasSavedScore && <span className="badge badge-grey" style={{ marginLeft: '0.5rem' }}>Draft: {m.home_score}–{m.away_score}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input type="number" className="score-input" min={0} max={99} placeholder="0" value={s.home} onChange={e => setScore(m.id, 'home', e.target.value)} onBlur={e => { if(e.target.value === '' || e.target.value === '-') setScore(m.id, 'home', '0') }} />
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>–</span>
                  <input type="number" className="score-input" min={0} max={99} placeholder="0" value={s.away} onChange={e => setScore(m.id, 'away', e.target.value)} onBlur={e => { if(e.target.value === '' || e.target.value === '-') setScore(m.id, 'away', '0') }} />
                  <button className="btn btn-ghost" style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }} disabled={isSaving || s.home === '' || s.away === ''} onClick={() => handleSave(m.id)}>
                    {isSaving ? '...' : 'Save'}
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem', color: '#f87171' }} disabled={isSaving} onClick={() => onGoLive(m.id)}>
                    🔴 Go Live
                  </button>
                  <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'rgba(34,197,94,0.2)', borderColor: '#4ade80', color: '#4ade80' }} disabled={isSaving || s.home === '' || s.away === ''} onClick={() => handleLock(m.id)}>
                    🔒 Lock Result
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tournament & Group Results — before locked section */}
      <TournamentResultsEntry tournament={tournament} tournamentId={tournamentId} supabase={supabase} onSave={onSaveTournamentResults} />

      {completed.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>LOCKED RESULTS — CLICK EDIT TO CORRECT</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {completed.map((m: any) => {
              const s = scores[m.id] || { home: String(m.home_score), away: String(m.away_score) }
              const isEditing = editing === m.id
              const isSaving = saving === m.id
              return (
                <div key={m.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 500 }}>{m.home_team} vs {m.away_team}</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>{new Date(m.kickoff_at).toLocaleString(undefined, {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false})}</span>
                  </div>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="number" className="score-input" min={0} max={99} value={s.home} onChange={e => setScore(m.id, 'home', e.target.value)} onBlur={e => { if(e.target.value === '' || e.target.value === '-') setScore(m.id, 'home', '0') }} />
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>–</span>
                      <input type="number" className="score-input" min={0} max={99} value={s.away} onChange={e => setScore(m.id, 'away', e.target.value)} onBlur={e => { if(e.target.value === '' || e.target.value === '-') setScore(m.id, 'away', '0') }} />
                      <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} disabled={isSaving} onClick={async () => { setSaving(m.id); await onEdit(m.id, Number(s.home), Number(s.away)); setSaving(null); setEditing(null) }}>
                        {isSaving ? '...' : 'Save & Lock'}
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{m.home_score}–{m.away_score}</span>
                      <span className="badge badge-green">locked</span>
                      <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => startEdit(m)}>
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
