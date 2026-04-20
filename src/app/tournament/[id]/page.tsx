'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Star, Trophy, ChevronLeft, Lock, Clock } from 'lucide-react'
import { isPast, subHours } from 'date-fns'
import { useLang } from '../../LanguageContext'
 
type Tab = 'tips' | 'leaderboard' | 'predictions' | 'qualifiers'
 
function formatLocalTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
 
 
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
 
const GROUP_LOCK_TIMES: Record<string, string> = {
  A: '2026-06-11T19:00:00Z', B: '2026-06-12T19:00:00Z',
  C: '2026-06-13T22:00:00Z', D: '2026-06-13T01:00:00Z',
  E: '2026-06-14T17:00:00Z', F: '2026-06-14T20:00:00Z',
  G: '2026-06-15T22:00:00Z', H: '2026-06-15T17:00:00Z',
  I: '2026-06-16T19:00:00Z', J: '2026-06-17T01:00:00Z',
  K: '2026-06-17T17:00:00Z', L: '2026-06-17T20:00:00Z',
}
export default function TournamentPage() {
  const { t } = useLang()
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string
  const [tab, setTab] = useState<Tab>('tips')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [tournament, setTournament] = useState<any>(null)
  const [membership, setMembership] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [myTips, setMyTips] = useState<Record<string, any>>({})
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [myTournamentTip, setMyTournamentTip] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
 
  useEffect(() => { loadAll() }, [tournamentId])
 
  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setUser(user)
 
    const [profRes, tourRes, memberRes, matchRes, tipsRes, lbRes, ttRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
      supabase.from('tournament_members').select('*').eq('tournament_id', tournamentId).eq('user_id', user.id).single(),
      supabase.from('matches').select('*').eq('tournament_id', tournamentId).order('kickoff_at'),
      supabase.from('match_tips').select('*').eq('tournament_id', tournamentId).eq('user_id', user.id),
      supabase.from('leaderboard').select('*').eq('tournament_id', tournamentId).order('total_points', { ascending: false }),
      supabase.from('tournament_tips').select('*').eq('tournament_id', tournamentId).eq('user_id', user.id).single(),
    ])
 
    setProfile(profRes.data)
    setTournament(tourRes.data)
    setMembership(memberRes.data)
    setMatches(matchRes.data || [])
    const tipsMap: Record<string, any> = {}
    tipsRes.data?.forEach((t: any) => { tipsMap[t.match_id] = t })
    setMyTips(tipsMap)
    setLeaderboard(lbRes.data || [])
    setMyTournamentTip(ttRes.data)
    setLoading(false)
  }
 
  if (loading) return <LoadingScreen />
  if (membership?.status !== 'approved') return <NotApproved status={membership?.status} />
 
  const roundOrder = ['group','r32','r16','qf','sf','third_place','final']
  const roundLabel: Record<string, string> = {
    group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16',
    qf: 'Quarter-Finals', sf: 'Semi-Finals', third_place: '3rd Place', final: 'Final'
  }
  const multiplierLabel: Record<string, number> = {
    group: tournament.multiplier_group, r32: tournament.multiplier_r32,
    r16: tournament.multiplier_r16, qf: tournament.multiplier_qf,
    sf: tournament.multiplier_sf, third_place: tournament.multiplier_sf, final: tournament.multiplier_final
  }
 
  const grouped = roundOrder.reduce((acc, r) => {
    const ms = matches.filter((m: any) => m.round === r)
    if (ms.length) acc[r] = ms
    return acc
  }, {} as Record<string, any[]>)
 
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--dark-border)', background: 'rgba(10,15,13,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}><ChevronLeft size={18} /></Link>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.06em' }}>{tournament.name}</div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>{profile?.display_name}</div>
        </div>
      </header>
 
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Tabs */}
        <div className="tab-nav" style={{ marginBottom: '1.5rem' }}>
          <button className={`tab-btn ${tab === 'tips' ? 'active' : ''}`} onClick={() => setTab('tips')}>Match Tips</button>
          <button className={`tab-btn ${tab === 'qualifiers' ? 'active' : ''}`} onClick={() => setTab('qualifiers')}>Group Qualifiers</button>
          <button className={`tab-btn ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>Leaderboard</button>
          <button className={`tab-btn ${tab === 'predictions' ? 'active' : ''}`} onClick={() => setTab('predictions')}>Tournament Tips</button>
        </div>
 
        {/* Match Tips */}
        {tab === 'tips' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
            {Object.entries(grouped).map(([round, roundMatches]) => (
              <div key={round}>
                <div className="flex items-center gap-3" style={{ marginBottom: '0.75rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>
                    {roundLabel[round]}
                  </h2>
                  <span className="badge badge-gold">{multiplierLabel[round]}x multiplier</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {roundMatches.map((match: any) => (
                    <MatchTipCard
                      key={match.id}
                      match={match}
                      tip={myTips[match.id]}
                      tournament={tournament}
                      userId={user.id}
                      onSave={loadAll}
                    />
                  ))}
                </div>
              </div>
            ))}
            {matches.length === 0 && (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                Matches haven't been added yet. Check back soon!
              </div>
            )}
          </div>
        )}
 
 
        {/* Group Qualifiers */}
        {tab === 'qualifiers' && (
          <GroupQualifierTips
            tournament={tournament}
            userId={user.id}
            existing={myTournamentTip}
            onSave={loadAll}
            t={t}
          />
        )}
 
        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div style={{ paddingBottom: '3rem' }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              {leaderboard.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No scores yet</div>
              ) : leaderboard.map((row: any, i: number) => (
                <div key={row.user_id} className={`${i < 3 ? `rank-${i+1}` : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderBottom: i < leaderboard.length-1 ? '1px solid var(--dark-border)' : 'none', background: row.user_id === user.id ? 'rgba(34,197,94,0.06)' : undefined }}>
                  <div style={{ width: 28, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b87333' : 'rgba(255,255,255,0.3)' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.95rem', color: row.user_id === user.id ? '#4ade80' : '#e8f5ee' }}>
                      {row.display_name} {row.user_id === user.id && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                      Match: {row.match_points} · Tournament: {row.tournament_points} · Tips: {row.tips_submitted}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: i === 0 ? '#fbbf24' : '#e8f5ee' }}>
                    {row.total_points}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
              Points include phase multipliers · Leaderboard updates after each match result is entered
            </div>
          </div>
        )}
 
        {/* Tournament Tips */}
        {tab === 'predictions' && (
          <TournamentTipForm
            tournament={tournament}
            userId={user.id}
            existing={myTournamentTip}
            onSave={loadAll}
          />
        )}
      </div>
    </div>
  )
}
 
 
function GroupQualifierTips({ tournament, userId, existing, onSave, t }: any) {
  const supabase = createClient()
  const [picks, setPicks] = useState<Record<string, { first: string, second: string }>>(() => {
    const init: Record<string, { first: string, second: string }> = {}
    Object.keys(GROUPS).forEach(g => {
      init[g] = {
        first: existing?.[`tip_group_${g.toLowerCase()}_1`] || '',
        second: existing?.[`tip_group_${g.toLowerCase()}_2`] || '',
      }
    })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
 
  const ptsPerGroup = tournament.pts_qualify || 0
 
  function isGroupLocked(group: string) {
    const lockTime = GROUP_LOCK_TIMES[group]
    if (!lockTime) return false
    return isPast(subHours(new Date(lockTime), 2))
  }
 
  async function save() {
    setSaving(true)
    const payload: Record<string, any> = { tournament_id: tournament.id, user_id: userId }
    Object.entries(picks).forEach(([g, p]) => {
      payload[`tip_group_${g.toLowerCase()}_1`] = p.first
      payload[`tip_group_${g.toLowerCase()}_2`] = p.second
    })
    if (existing?.id) {
      await supabase.from('tournament_tips').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('tournament_tips').insert(payload)
    }
    setSaved(true); setTimeout(() => setSaved(false), 2500)
    setSaving(false); onSave()
  }
 
  const unlockedGroups = Object.keys(GROUPS).filter(g => !isGroupLocked(g))
  const lockedGroups = Object.keys(GROUPS).filter(g => isGroupLocked(g))
 
  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>{t.groupQualifiersTitle}</h2>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>{t.groupQualifiersDesc}</p>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.3rem' }}>
          <span style={{ color: 'var(--gold)' }}>{t.fullPoints}</span> {t.correctTeamPosition} · <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t.halfPoints}</span> {t.correctTeamWrongPosition}
        </p>
        {ptsPerGroup > 0 && <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>{ptsPerGroup} {t.pts} per correct team</div>}
      </div>
 
      {unlockedGroups.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {unlockedGroups.map(group => {
            const teams = GROUPS[group]
            const lockTime = GROUP_LOCK_TIMES[group]
            return (
              <div key={group} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'var(--gold)' }}>
                    {t.lang === 'pt' ? `GRUPO ${group}` : `GROUP ${group}`}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                    {t.locksAt} {formatLocalTime(new Date(new Date(lockTime).getTime() - 2*60*60*1000).toISOString())}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.25rem' }}>🥇 {t.firstPlace}</label>
                    <select className="input" value={picks[group]?.first || ''} onChange={e => setPicks(prev => ({ ...prev, [group]: { ...prev[group], first: e.target.value } }))}>
                      <option value="">{t.selectTeam}</option>
                      {teams.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.25rem' }}>🥈 {t.secondPlace}</label>
                    <select className="input" value={picks[group]?.second || ''} onChange={e => setPicks(prev => ({ ...prev, [group]: { ...prev[group], second: e.target.value } }))}>
                      <option value="">{t.selectTeam}</option>
                      {teams.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
 
      {unlockedGroups.length > 0 && (
        <button onClick={save} disabled={saving} className="btn btn-primary" style={{ marginBottom: '2rem' }}>
          {saved ? t.savedBang : saving ? t.saving : t.saveQualifierPicks}
        </button>
      )}
 
      {lockedGroups.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>{t.lockedGroups}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {lockedGroups.map(group => {
              const p = picks[group]
              return (
                <div key={group} className="card" style={{ padding: '1.25rem', opacity: 0.7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>
                      {t.lang === 'pt' ? `GRUPO ${group}` : `GROUP ${group}`}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'rgba(255,158,11,0.7)' }}><Lock size={10} />{t.locked}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                    <div>🥇 {p?.first || <span style={{ color: 'rgba(255,255,255,0.25)' }}>{t.noPick}</span>}</div>
                    <div style={{ marginTop: '0.25rem' }}>🥈 {p?.second || <span style={{ color: 'rgba(255,255,255,0.25)' }}>{t.noPick}</span>}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
 
function MatchTipCard({ match, tip, tournament, userId, onSave }: any) {
  const { t } = useLang()
  const isLocked = match.status !== 'upcoming' || isPast(subHours(new Date(match.kickoff_at), 2))
  const [home, setHome] = useState(tip?.tip_home ?? '')
  const [away, setAway] = useState(tip?.tip_away ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()
 
  async function saveTip() {
    if (home === '' || away === '') return
    setSaving(true)
    const payload = { match_id: match.id, user_id: userId, tournament_id: tournament.id, tip_home: Number(home), tip_away: Number(away) }
    if (tip?.id) {
      await supabase.from('match_tips').update({ tip_home: Number(home), tip_away: Number(away), updated_at: new Date().toISOString() }).eq('id', tip.id)
    } else {
      await supabase.from('match_tips').insert(payload)
    }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
    setSaving(false); onSave()
  }
 
  const multiplier = { group: tournament.multiplier_group, r32: tournament.multiplier_r32, r16: tournament.multiplier_r16, qf: tournament.multiplier_qf, sf: tournament.multiplier_sf, third_place: tournament.multiplier_sf, final: tournament.multiplier_final }[match.round as string] || 1
 
  return (
    <div className="card" style={{ padding: '1rem 1.25rem', opacity: isLocked && !tip ? 0.6 : 1 }}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Teams + score display */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{match.home_team}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>vs</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{match.away_team}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
              <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
              {formatLocalTime(match.kickoff_at)}
            </span>
            {match.group_name && <span className="badge badge-grey">{match.group_name}</span>}
            {match.status === 'completed' && match.home_score !== null && (
              <span className="badge badge-green">Result: {match.home_score ?? 0}–{match.away_score ?? 0}</span>
            )}
            {match.status === 'live' && match.home_score !== null && (
              <span className="badge" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                🔴 LIVE {match.home_score}–{match.away_score}
              </span>
            )}
            {isLocked && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'rgba(255,158,11,0.7)' }}><Lock size={10} />Locked</span>}
          </div>
        </div>
 
        {/* Tip input or display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isLocked ? (
            tip ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>{tip.tip_home ?? 0}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>–</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>{tip.tip_away ?? 0}</span>
                </div>
                {tip.pts_with_multiplier > 0 && (
                  <span className="badge badge-gold">+{tip.pts_with_multiplier} pts</span>
                )}
                {match.status === 'completed' && tip.pts_with_multiplier === 0 && (
                  <span className="badge badge-grey">0 pts</span>
                )}
              </div>
            ) : <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)' }}>No tip submitted</span>
          ) : (
            <>
              <input type="number" className="score-input" min={0} max={99} value={home}
                onChange={e => setHome(e.target.value)} placeholder="0" />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>–</span>
              <input type="number" className="score-input" min={0} max={99} value={away}
                onChange={e => setAway(e.target.value)} placeholder="0" />
              <button onClick={saveTip} disabled={saving || home === '' || away === ''} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                {saved ? '✔' : saving ? '...' : tip ? 'Update' : 'Tip'}
              </button>
            </>
          )}
          <div style={{ textAlign: 'right', minWidth: 40 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--gold)', fontWeight: 600 }}>{multiplier}x</div>
          </div>
        </div>
      </div>
    </div>
  )
}
 
function TournamentTipForm({ tournament, userId, existing, onSave }: any) {
  const [winner, setWinner] = useState(existing?.tip_winner || '')
  const [second, setSecond] = useState(existing?.tip_second || '')
  const [third, setThird] = useState(existing?.tip_third || '')
  const [topScorer, setTopScorer] = useState(existing?.tip_top_scorer || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const isLocked = existing?.is_locked
  const supabase = createClient()
 
  async function save() {
    setSaving(true)
    const payload = { tournament_id: tournament.id, user_id: userId, tip_winner: winner, tip_second: second, tip_third: third, tip_top_scorer: topScorer, updated_at: new Date().toISOString() }
    if (existing?.id) await supabase.from('tournament_tips').update(payload).eq('id', existing.id)
    else await supabase.from('tournament_tips').insert(payload)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
    setSaving(false); onSave()
  }
 
  const fields = [
    { label: 'World Cup Winner', key: 'winner', val: winner, set: setWinner, pts: tournament.pts_tournament_winner },
    { label: '2nd Place (Runner-up)', key: 'second', val: second, set: setSecond, pts: tournament.pts_second_place },
    { label: '3rd Place', key: 'third', val: third, set: setThird, pts: tournament.pts_third_place },
    { label: 'Top Goal Scorer', key: 'topScorer', val: topScorer, set: setTopScorer, pts: tournament.pts_top_scorer },
  ]
 
  return (
    <div style={{ maxWidth: 480, paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Tournament Predictions</h2>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>
          Set these before the tournament starts — they lock when the first match kicks off and can't be changed.
        </p>
      </div>
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {fields.map(f => (
          <div key={f.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label className="label">{f.label}</label>
              <span className="badge badge-gold">{f.pts} pts</span>
            </div>
            {isLocked ? (
              <div style={{ padding: '0.65rem 0.9rem', background: 'rgba(255,255,255,0.04)', borderRadius: 10, fontSize: '0.9rem', color: f.val ? '#e8f5ee' : 'rgba(255,255,255,0.25)' }}>
                {f.val || 'Not submitted'}
              </div>
            ) : (
              <input className="input" type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder="Team or player name..." />
            )}
            {existing && existing[`pts_${f.key === 'topScorer' ? 'top_scorer' : f.key}`] > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '0.25rem' }}>✔ Correct! +{existing[`pts_${f.key === 'topScorer' ? 'top_scorer' : f.key}`]} pts</div>
            )}
          </div>
        ))}
        {!isLocked && (
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            {saved ? '✔ Saved!' : saving ? 'Saving...' : existing ? 'Update predictions' : 'Submit predictions'}
          </button>
        )}
        {isLocked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,158,11,0.7)', fontSize: '0.82rem' }}>
            <Lock size={13} /> Predictions locked — tournament has started
          </div>
        )}
      </div>
      {existing?.pts_total > 0 && (
        <div className="card" style={{ marginTop: '1rem', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Tournament prediction points</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#fbbf24' }}>{existing.pts_total}</span>
        </div>
      )}
    </div>
  )
}
 
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--green-light)', letterSpacing: '0.1em' }}>LOADING...</div>
    </div>
  )
}
 
function NotApproved({ status }: { status?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '1rem' }}>
          {status === 'pending' ? 'Awaiting approval' : status === 'rejected' ? 'Request rejected' : 'Not a member'}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          {status === 'pending' ? "The tournament admin hasn't approved your request yet. Sit tight!" : 'Contact the tournament admin for more info.'}
        </p>
        <Link href="/" className="btn btn-ghost">← Back to home</Link>
      </div>
    </div>
  )
}