'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, Check, X, Settings, Users, Trophy, Calendar } from 'lucide-react'
import { format } from 'date-fns'

type AdminTab = 'tournaments' | 'members' | 'matches' | 'results'

export default function AdminPage() {
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
    const [membRes, matchRes] = await Promise.all([
      supabase.from('tournament_members').select('*, profile:profiles(display_name,email)').eq('tournament_id', selectedTournament).order('joined_at'),
      supabase.from('matches').select('*').eq('tournament_id', selectedTournament).order('kickoff_at'),
    ])
    setPendingMembers((membRes.data || []).filter((m: any) => m.status === 'pending'))
    setAllMembers(membRes.data || [])
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
          <TournamentSetup tournament={currentTournament} onSave={init} onCreate={init} supabase={supabase} />
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
                        <div style={{ fontWeight: 500 }}>{m.profile?.display_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>{m.profile?.email} · Requested {format(new Date(m.joined_at), 'd MMM yyyy')}</div>
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
                      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{m.profile?.display_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{m.profile?.email}</div>
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
          <ResultsEntry matches={matches.filter((m: any) => m.status !== 'completed')} onResult={enterResult} />
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
        <button onClick={saveSettings} disabled={saving} className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
          {saved ? '✔ Saved!' : saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
      )}
    </div>
  )
}

function EntryFeeToggle({ member, supabase, onUpdate }: any) {
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

function MatchManager({ matches, tournamentId, supabase, onUpdate }: any) {
  const emptyMatch = { home_team: '', away_team: '', kickoff_at: '', round: 'group', group_name: '', venue: '', tournament_id: tournamentId }
  const [form, setForm] = useState(emptyMatch)
  const [saving, setSaving] = useState(false)

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
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>ADD MATCH</h3>
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

function ResultsEntry({ matches, onResult }: any) {
  const [scores, setScores] = useState<Record<string, { home: string, away: string }>>({})

  function setScore(matchId: string, key: 'home' | 'away', val: string) {
    setScores(prev => ({ ...prev, [matchId]: { ...prev[matchId], [key]: val } }))
  }

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>ENTER RESULTS</h3>
      {matches.length === 0 && (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
          All match results have been entered — great work!
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {matches.filter((m: any) => m.status !== 'upcoming' || new Date(m.kickoff_at) <= new Date()).map((m: any) => {
          const s = scores[m.id] || { home: '', away: '' }
          return (
            <div key={m.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500 }}>{m.home_team} vs {m.away_team}</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>{format(new Date(m.kickoff_at), 'd MMM HH:mm')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="number" className="score-input" min={0} max={99} placeholder="0" value={s.home} onChange={e => setScore(m.id, 'home', e.target.value)} />
                <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>–</span>
                <input type="number" className="score-input" min={0} max={99} placeholder="0" value={s.away} onChange={e => setScore(m.id, 'away', e.target.value)} />
                <button
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                  disabled={s.home === '' || s.away === ''}
                  onClick={() => onResult(m.id, Number(s.home), Number(s.away))}
                >
                  Enter result
                </button>
              </div>
            </div>
          )
        })}
        {matches.filter((m: any) => m.status !== 'upcoming' || new Date(m.kickoff_at) <= new Date()).length === 0 && matches.length > 0 && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
            No matches have started yet — results will appear here after kickoff.
          </div>
        )}
      </div>
    </div>
  )
}
