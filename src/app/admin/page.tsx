'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, Check, X, Settings, Users, Trophy, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { useLang } from '../LanguageContext'

type AdminTab = 'tournaments' | 'members' | 'matches' | 'results'

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
          <div style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 4rem 4rem 4rem 4rem 5rem', gap: '0.5rem', padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--dark-border)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.05em' }}>
            <div>#</div><div>PLAYER</div>
            <div style={{ textAlign: 'center' }}>🎯</div>
            <div style={{ textAlign: 'center' }}>✅</div>
            <div style={{ textAlign: 'center' }}>🏟️</div>
            <div style={{ textAlign: 'center' }}>MATCH</div>
            <div style={{ textAlign: 'center' }}>TOTAL</div>
          </div>
          {leaderboard.map((row: any, i: number) => {
            const prof = profiles[row.user_id]
            const name = prof?.nickname || prof?.display_name || row.display_name
            return (
              <div key={row.user_id} style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 4rem 4rem 4rem 4rem 5rem', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: i < leaderboard.length - 1 ? '1px solid var(--dark-border)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b87333' : 'rgba(255,255,255,0.3)' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e8f5ee' }}>{name}</div>
                  {prof?.nickname && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{prof.display_name}</div>}
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>{row.tips_submitted} tips</div>
                </div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: row.exact_scores > 0 ? '#fbbf24' : 'rgba(255,255,255,0.25)' }}>{row.exact_scores ?? 0}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: row.correct_winners > 0 ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>{row.correct_winners ?? 0}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: (row.qualifier_points ?? 0) > 0 ? '#60a5fa' : 'rgba(255,255,255,0.25)' }}>{row.qualifier_points ?? 0}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.6)' }}>{row.match_points ?? 0}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: i === 0 ? '#fbbf24' : '#e8f5ee' }}>{row.total_points}</div>
              </div>
            )
          })}
        </div>
      )}
      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.75rem' }}>
        🎯 Exact scores · ✅ Correct winners · 🏟️ Qualifier pts · MATCH = match tip pts only
      </p>
    </div>
  )
}


export default function AdminPage() {
  const { t } = useLang()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [tab, setTab] = useState<AdminTab>('tournaments')
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>('')
  const [pendingMembers, setPendingMembers] = useState<any[]>([])
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [tournamentTips, setTournamentTips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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
      supabase.from('profiles').select('id,display_name,email'),
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

  async function saveResult(matchId: string, homeScore: number, awayScore: number) {
    await supabase.from('matches').update({ home_score: homeScore, away_score: awayScore }).eq('id', matchId)
    loadTournamentData()
  }

  async function goLive(matchId: string) {
    await supabase.from('matches').update({ status: 'live', home_score: 0, away_score: 0, result_locked: false }).eq('id', matchId)
    loadTournamentData()
  }

  async function updateLiveScore(matchId: string, homeScore: number, awayScore: number) {
    // Update score, calculate points (keeps leaderboard live), stay in live status
    await supabase.from('matches').update({ home_score: homeScore, away_score: awayScore }).eq('id', matchId)
    await supabase.rpc('calculate_match_points', { p_match_id: matchId })
    await supabase.from('matches').update({ status: 'live' }).eq('id', matchId)
    loadTournamentData()
  }

  async function endLive(matchId: string, homeScore: number, awayScore: number) {
    await supabase.from('matches').update({ home_score: homeScore, away_score: awayScore, status: 'completed', result_locked: true }).eq('id', matchId)
    await supabase.rpc('calculate_match_points', { p_match_id: matchId })
    loadTournamentData()
  }

  async function lockResult(matchId: string, homeScore: number, awayScore: number) {
    await supabase.from('matches').update({ home_score: homeScore, away_score: awayScore, status: 'completed', result_locked: true }).eq('id', matchId)
    await supabase.rpc('calculate_match_points', { p_match_id: matchId })
    loadTournamentData()
  }

  async function enterResult(matchId: string, homeScore: number, awayScore: number) {
    await supabase.from('matches').update({ home_score: homeScore, away_score: awayScore, status: 'completed' }).eq('id', matchId)
    await supabase.rpc('calculate_match_points', { p_match_id: matchId })
    loadTournamentData()
  }

  const currentTournament = tournaments.find((t: any) => t.id === selectedTournament)
  async function saveTournamentResults(results: { winner: string, second: string, third: string, top_scorer: string, group_results: Record<string, { first: string, second: string }> }) {
    const pts = currentTournament?.pts_qualify || currentTournament?.pts_qualifying_teams || 10
    await calculateGroupQualifierPoints(results.group_results, pts)
    if (results.winner || results.second || results.third || results.top_scorer) {
      await supabase.rpc('calculate_tournament_points', {
        p_tournament_id: selectedTournament,
        p_winner: results.winner || '',
        p_second: results.second || '',
        p_third: results.third || '',
        p_top_scorer: results.top_scorer || '',
      })
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
        <div className="tab-nav" style={{ marginBottom: '1.5rem' }}>
          <button className={`tab-btn ${tab === 'tournaments' ? 'active' : ''}`} onClick={() => setTab('tournaments')}><Settings size={13} style={{display:'inline',marginRight:4}}/>Setup</button>
          <button className={`tab-btn ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}><Users size={13} style={{display:'inline',marginRight:4}}/>Members {pendingMembers.length > 0 && `(${pendingMembers.length})`}</button>
          <button className={`tab-btn ${tab === 'matches' ? 'active' : ''}`} onClick={() => setTab('matches')}><Calendar size={13} style={{display:'inline',marginRight:4}}/>Matches</button>
          <button className={`tab-btn ${tab === 'results' ? 'active' : ''}`} onClick={() => setTab('results')}><Trophy size={13} style={{display:'inline',marginRight:4}}/>Results</button>
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
                    </div>
                    <span className={`badge ${m.status === 'approved' ? 'badge-green' : m.status === 'rejected' ? 'badge-red' : 'badge-grey'}`}>{m.status}</span>
                    {m.status === 'approved' && (
                      <EntryFeeToggle member={m} supabase={supabase} onUpdate={loadTournamentData} />
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
                {['Albania','Argentina','Australia','Austria','Belgium','Bolivia','Brazil','Canada','Chile','Colombia','Costa Rica','Croatia','Czech Republic','Ecuador','Egypt','England','France','Germany','Ghana','Greece','Honduras','Hungary','IR Iran','Italy','Jamaica','Japan','Kenya','Mali','Mexico','Morocco','Netherlands','New Zealand','Nigeria','Panama','Paraguay','Peru','Poland','Portugal','Qatar','Saudi Arabia','Senegal','Serbia','Slovakia','Slovenia','South Korea','Spain','Switzerland','Trinidad & Tobago','Tunisia','Turkey','Ukraine','United States','Uruguay','Venezuela','Wales'].map((tm: string) => <option key={tm} value={tm}>{tm}</option>)}
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newFee, setNewFee] = useState('0')

  async function saveSettings() {
    setSaving(true)
    await supabase.from('tournaments').update({ ...form, updated_at: new Date().toISOString() }).eq('id', tournament.id)
    setSaved(true); setTimeout(() => setSaved(false), 2000); onSave(); setSaving(false)
  }

  async function createTournament() {
    if (!newName.trim()) return
    setCreating(true)
    await supabase.from('tournaments').insert({ name: newName, description: newDesc, entry_fee: Number(newFee) || 0 })
    setNewName(''); setNewDesc(''); setNewFee('0'); onCreate(); setCreating(false)
  }

  const field = (label: string, key: string, type = 'number') => (
    <div key={key}>
      <label className="label">{label}</label>
      <input type={type} className="input" value={form[key]} onChange={e => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} />
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
          <div><label className="label">Entry fee (AUD)</label><input type="number" className="input" value={newFee} onChange={e => setNewFee(e.target.value)} /></div>
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
            <input type="number" className="input" min={0} max={100} value={form.prize_split_1st ?? 60}
              onChange={e => setForm({ ...form, prize_split_1st: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">2nd place %</label>
            <input type="number" className="input" min={0} max={100} value={form.prize_split_2nd ?? 30}
              onChange={e => setForm({ ...form, prize_split_2nd: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">3rd place %</label>
            <input type="number" className="input" min={0} max={100} value={form.prize_split_3rd ?? 10}
              onChange={e => setForm({ ...form, prize_split_3rd: Number(e.target.value) })} />
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
  const [savingKo, setSavingKo] = useState(false)

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

  async function addKoMatch() {
    if (!koForm.home_team || !koForm.away_team || !koForm.kickoff_at) return
    setSavingKo(true)
    await supabase.from('matches').insert({ ...koForm, group_name: null })
    setKoForm(emptyKo); onUpdate(); setSavingKo(false)
  }

  async function deleteMatch(id: string) {
    if (!confirm('Delete this match?')) return
    await supabase.from('matches').delete().eq('id', id)
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
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem' }}>
          Add knockout matches early — use TBD placeholders if teams aren't confirmed yet. Edit the match later to fill in the real team names once known.
        </p>
        <p style={{ fontSize: '0.78rem', color: 'rgba(96,165,250,0.5)', marginBottom: '1rem' }}>
          💡 Tip: Add the match with TBD teams &amp; correct kickoff time right away so tippers can see it's coming. Edit teams when they're confirmed.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label className="label">Home team</label>
            <input type="text" className="input" placeholder="e.g. Brazil or TBD" value={koForm.home_team} onChange={e => setKoForm({...koForm,home_team:e.target.value})} />
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
              {['TBD','Winner Group A','Runner-up Group B'].map(s => (
                <button key={s} onClick={() => setKoForm({...koForm,home_team:s})} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 10, border: '1px solid rgba(96,165,250,0.3)', background: 'transparent', color: '#60a5fa', cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Away team</label>
            <input type="text" className="input" placeholder="e.g. Argentina or TBD" value={koForm.away_team} onChange={e => setKoForm({...koForm,away_team:e.target.value})} />
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
              {['TBD','Winner Group C','Runner-up Group D'].map(s => (
                <button key={s} onClick={() => setKoForm({...koForm,away_team:s})} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 10, border: '1px solid rgba(96,165,250,0.3)', background: 'transparent', color: '#60a5fa', cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
          <div><label className="label">Kickoff (local time)</label><input type="datetime-local" className="input" value={koForm.kickoff_at} onChange={e => setKoForm({...koForm,kickoff_at:e.target.value})} /></div>
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
          <div><label className="label">Venue (optional)</label><input type="text" className="input" placeholder="e.g. SoFi Stadium" value={koForm.venue} onChange={e => setKoForm({...koForm,venue:e.target.value})} /></div>
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
    if (!s || s.home === '' || s.away === '') return
    setSaving(matchId)
    await onSave(matchId, Number(s.home), Number(s.away))
    setSaving(null)
  }

  async function handleLock(matchId: string) {
    const s = scores[matchId]
    if (!s || s.home === '' || s.away === '') return
    if (!confirm('Lock this result? Points will be calculated and players will see the score.')) return
    setSaving(matchId)
    await onLock(matchId, Number(s.home), Number(s.away))
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
                    <span style={{ fontWeight: 600 }}>{m.home_team} vs {m.away_team}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginLeft: '1rem', color: '#f87171' }}>{m.home_score ?? 0}–{m.away_score ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input type="number" className="score-input" min={0} max={99} value={s.home} onChange={e => setScore(m.id, 'home', e.target.value)} />
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>–</span>
                    <input type="number" className="score-input" min={0} max={99} value={s.away} onChange={e => setScore(m.id, 'away', e.target.value)} />
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
                  <span style={{ fontWeight: 500 }}>{m.home_team} vs {m.away_team}</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>{new Date(m.kickoff_at).toLocaleString(undefined, {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false})}</span>
                  {hasSavedScore && <span className="badge badge-grey" style={{ marginLeft: '0.5rem' }}>Draft: {m.home_score}–{m.away_score}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input type="number" className="score-input" min={0} max={99} placeholder="0" value={s.home} onChange={e => setScore(m.id, 'home', e.target.value)} />
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>–</span>
                  <input type="number" className="score-input" min={0} max={99} placeholder="0" value={s.away} onChange={e => setScore(m.id, 'away', e.target.value)} />
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
                      <input type="number" className="score-input" min={0} max={99} value={s.home} onChange={e => setScore(m.id, 'home', e.target.value)} />
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>–</span>
                      <input type="number" className="score-input" min={0} max={99} value={s.away} onChange={e => setScore(m.id, 'away', e.target.value)} />
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
