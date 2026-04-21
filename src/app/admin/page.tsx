'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, Check, X, Settings, Users, Trophy, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { useLang } from '../LanguageContext'

type AdminTab = 'tournaments' | 'members' | 'matches' | 'results'

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
    const [membRes, matchRes, profilesRes] = await Promise.all([
      supabase.from('tournament_members').select('*').eq('tournament_id', selectedTournament).order('joined_at'),
      supabase.from('matches').select('*').eq('tournament_id', selectedTournament).order('kickoff_at'),
      supabase.from('profiles').select('id,display_name,email'),
    ])
    const profiles = profilesRes.data || []
    const members = (membRes.data || []).map((m: any) => ({
      ...m,
      profiles: profiles.find((p: any) => p.id === m.user_id)
    }))
    setPendingMembers(members.filter((m: any) => m.status === 'pending'))
    setAllMembers(members)
    setMatches(matchRes.data || [])
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
    // Set scores first, then calc points (function only needs home_score not null)
    await supabase.from('matches').update({ home_score: homeScore, away_score: awayScore, status: 'completed' }).eq('id', matchId)
    await supabase.rpc('calculate_match_points', { p_match_id: matchId })
    // Revert status back to live
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontFamily: 'var(--font-display)', color: 'var(--green-light)', letterSpacing: '0.1em' }}>LOADING...</div></div>

  const currentTournament = tournaments.find((t: any) => t.id === selectedTournament)

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
        {tab === 'results' && (
          <ResultsEntry matches={matches} onSave={saveResult} onLock={lockResult} onEdit={lockResult} onGoLive={goLive} onUpdateLive={updateLiveScore} onEndLive={endLive} />
        )}
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

function ResultsEntry({ matches, onSave, onLock, onEdit, onGoLive, onUpdateLive, onEndLive }: any) {
  const [scores, setScores] = useState<Record<string, { home: string, away: string }>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

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
