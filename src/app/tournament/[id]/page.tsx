'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Star, Trophy, ChevronLeft, Lock, Clock } from 'lucide-react'
import { isPast, subHours, subMinutes } from 'date-fns'
import { useLang } from '../../LanguageContext'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const TEAM_FLAGS: Record<string, string> = {
  'Albania':'🇦🇱',  'Argentina':'🇦🇷',  'Australia':'🇦🇺',  'Austria':'🇦🇹',
  'Belgium':'🇧🇪',  'Bolivia':'🇧🇴',  'Brazil':'🇧🇷',  'Canada':'🇨🇦',
  'Chile':'🇨🇱',  'Colombia':'🇨🇴',  'Costa Rica':'🇨🇷',  'Croatia':'🇭🇷',
  'Czech Republic':'🇨🇿',  'Czechia':'🇨🇿',  'Ecuador':'🇪🇨',  'Egypt':'🇪🇬',
  'France':'🇫🇷',  'Germany':'🇩🇪',  'Ghana':'🇬🇭',  'Greece':'🇬🇷',
  'Honduras':'🇭🇳',  'Hungary':'🇭🇺',  'IR Iran':'🇮🇷',  'Italy':'🇮🇹',
  'Jamaica':'🇯🇲',  'Japan':'🇯🇵',  'Kenya':'🇰🇪',  'Mali':'🇲🇱',
  'Mexico':'🇲🇽',  'Morocco':'🇲🇦',  'Netherlands':'🇳🇱',  'New Zealand':'🇳🇿',
  'Nigeria':'🇳🇬',  'Panama':'🇵🇦',  'Paraguay':'🇵🇾',  'Peru':'🇵🇪',
  'Poland':'🇵🇱',  'Portugal':'🇵🇹',  'Qatar':'🇶🇦',  'Saudi Arabia':'🇸🇦',
  'Senegal':'🇸🇳',  'Serbia':'🇷🇸',  'Slovakia':'🇸🇰',  'Slovenia':'🇸🇮',
  'South Korea':'🇰🇷',  'Spain':'🇪🇸',  'Switzerland':'🇨🇭',  'Trinidad & Tobago':'🇹🇹',
  'Tunisia':'🇹🇳',  'Turkey':'🇹🇷',  'Ukraine':'🇺🇦',  'United States':'🇺🇸',
  'USA':'🇺🇸',  'Uruguay':'🇺🇾',  'Venezuela':'🇻🇪',  'South Africa':'🇿🇦',
  'Bosnia and Herzegovina':'🇧🇦',  'Cape Verde':'🇨🇻',  'Curacao':'🇨🇼',  'DR Congo':'🇨🇩',
  'Haiti':'🇭🇹',  'Iraq':'🇮🇶',  'Jordan':'🇯🇴',  'Norway':'🇳🇴',
  'Sweden':'🇸🇪',  'Uzbekistan':'🇺🇿',  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿',  'Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Wales':'🏴󠁧󠁢󠁷󠁬󠁳󠁿',
}

const TOP_SCORERS = [
  'Antoine Griezmann','Bukayo Saka','Bernardo Silva','Bruno Fernandes',
  'Cody Gakpo','Dušan Vlahović','Éder Militão','Erling Haaland',
  'Ferran Torres','Florian Wirtz','Gabriel Martinelli','Gavi',
  'Harry Kane','Heung-Min Son','Jamal Musiala','João Félix',
  'Jude Bellingham','Julián Álvarez','Kai Havertz','Kaoru Mitoma',
  'Kylian Mbappé','Lautaro Martínez','Leroy Sané','Lionel Messi',
  'Luka Modrić','Marcus Rashford','Memphis Depay','Neymar',
  'Ousmane Dembélé','Pedri','Phil Foden','Randal Kolo Muani',
  'Raphinha','Richarlison','Rodrygo','Romelu Lukaku',
  'Viktor Gyökeres','Vinicius Jr.','Youssef En-Nesyri','Donyell Malen',
].sort()


const WC2026_TEAMS = [
  'Algeria','Argentina','Australia','Austria','Belgium','Bosnia and Herzegovina',
  'Brazil','Canada','Cape Verde','Colombia','Croatia','Curacao','Czechia',
  'DR Congo','Ecuador','Egypt','England','France','Germany','Ghana','Haiti',
  'Iran','Iraq','Ivory Coast','Japan','Jordan','Mexico','Morocco','Netherlands',
  'New Zealand','Norway','Panama','Paraguay','Portugal','Qatar','Saudi Arabia',
  'Scotland','Senegal','South Africa','South Korea','Spain','Sweden','Switzerland',
  'Tunisia','Turkey','Uruguay','USA','Uzbekistan'
].sort()




type Tab = 'tips' | 'leaderboard' | 'predictions' | 'qualifiers' | 'rules' | 'tips_reveal'
type SortKey = 'total_points' | 'exact_scores' | 'correct_winners' | 'correct_goal_diff'

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
  const [tab, setTab] = useState<Tab>('leaderboard')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [tournament, setTournament] = useState<any>(null)
  const [membership, setMembership] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [myTips, setMyTips] = useState<Record<string, any>>({})
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [myTournamentTip, setMyTournamentTip] = useState<any>(null)
  const [allTips, setAllTips] = useState<any[]>([])
  const [allTournamentTips, setAllTournamentTips] = useState<any[]>([])
  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({})
  const [approvedCount, setApprovedCount] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>('total_points')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [tournamentId])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setUser(user)

    const [profRes, tourRes, memberRes, matchRes, tipsRes, allTipsRes, lbRes, allProfilesRes, approvedMembersRes, ttRes, allTtRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
      supabase.from('tournament_members').select('*').eq('tournament_id', tournamentId).eq('user_id', user.id).single(),
      supabase.from('matches').select('*').eq('tournament_id', tournamentId).order('kickoff_at'),
      supabase.from('match_tips').select('*, match:matches(round, kickoff_at, status, home_score, away_score)').eq('tournament_id', tournamentId).eq('user_id', user.id),
      supabase.from('match_tips').select('id, match_id, user_id, tip_home, tip_away, pts_with_multiplier, pts_exact_score, pts_goal_diff, pts_winner, pts_big_margin, match:matches(round, kickoff_at, status)').eq('tournament_id', tournamentId),
      supabase.from('leaderboard').select('*').eq('tournament_id', tournamentId).order('total_points', { ascending: false }),
      supabase.from('profiles').select('id, display_name, nickname, avatar_url, jersey_team, tip_position'),
      supabase.from('tournament_members').select('id').eq('tournament_id', tournamentId).eq('status', 'approved'),
      supabase.from('tournament_tips').select('*').eq('tournament_id', tournamentId).eq('user_id', user.id).maybeSingle(),
      supabase.from('tournament_tips').select('*').eq('tournament_id', tournamentId),
    ])

    setProfile(profRes.data)
    setTournament(tourRes.data)
    setMembership(memberRes.data)
    setMatches(matchRes.data || [])
    const tipsMap: Record<string, any> = {}
    tipsRes.data?.forEach((t: any) => { tipsMap[t.match_id] = t })
    setMyTips(tipsMap)
    setLeaderboard(lbRes.data || [])
    setAllTips(allTipsRes.data || [])
    const avatarMap: Record<string, string> = {}
    const profileMap: Record<string, any> = {}
    allProfilesRes.data?.forEach((p: any) => {
      if (p.avatar_url) avatarMap[p.id] = p.avatar_url
      profileMap[p.id] = p
    })
    setAvatars(avatarMap)
    setProfilesMap(profileMap)
    setApprovedCount(approvedMembersRes.data?.length || 0)
    if (ttRes.error) console.warn('tournament_tips load:', ttRes.error.message)
    setMyTournamentTip(ttRes.data || null)
    setAllTournamentTips(allTtRes.data || [])
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
        {/* Prize Pool Banner */}
        {tournament.entry_fee > 0 && (
          <PrizeBanner tournament={tournament} approvedCount={approvedCount} leaderboard={leaderboard} t={t} />
        )}

        {/* Tabs */}
        <div className="tab-nav" style={{ marginBottom: '1.5rem' }}>
          <button className={`tab-btn ${tab === 'tips' ? 'active' : ''}`} onClick={() => setTab('tips')}>Match Tips</button>
          <button className={`tab-btn ${tab === 'qualifiers' ? 'active' : ''}`} onClick={() => setTab('qualifiers')}>Group Qualifiers</button>
          <button className={`tab-btn ${tab === 'predictions' ? 'active' : ''}`} onClick={() => setTab('predictions')}>Tournament Tips</button>
          <button className={`tab-btn ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>Leaderboard</button>
          <button className={`tab-btn ${tab === 'tips_reveal' ? 'active' : ''}`} onClick={() => setTab('tips_reveal')}>{t.lang === 'pt' ? '👁 Palpites' : '👁 All Tips'}</button>
          <button className={`tab-btn ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>📋 {t.lang === 'pt' ? 'Regras' : 'Rules'}</button>
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
            matches={matches}
            t={t}
          />
        )}

        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div style={{ paddingBottom: '3rem' }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2rem 2.5rem 1fr 3.5rem 3.5rem 3.5rem 3.5rem 4rem', gap: '0.4rem', padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--dark-border)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.05em' }}>
                <div></div>
                <div></div>
                <div>{t.lang === 'pt' ? 'NOME' : 'NAME'}</div>
                <div style={{ textAlign: 'center' }} title="Exact scores">🎯</div>
                <div style={{ textAlign: 'center' }} title="Correct goal difference">⚖️</div>
                <div style={{ textAlign: 'center' }} title="Correct winner">✅</div>
                <div style={{ textAlign: 'center' }} title="Qualifier teams correct">🏟️</div>
                <div style={{ textAlign: 'center' }}>{t.lang === 'pt' ? 'PTS' : 'PTS'}</div>
              </div>
              {leaderboard.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>{t.noScoresYet}</div>
              ) : [...leaderboard].sort((a: any, b: any) => {
                  if (b.total_points !== a.total_points) return b.total_points - a.total_points
                  if (b.exact_scores !== a.exact_scores) return b.exact_scores - a.exact_scores
                  return b.correct_goal_diff - a.correct_goal_diff
                }).map((row: any, i: number) => (
                <div key={row.user_id}
                  style={{ display: 'grid', gridTemplateColumns: '2rem 2.5rem 1fr 3.5rem 3.5rem 3.5rem 3.5rem 4rem', gap: '0.4rem', alignItems: 'center', padding: '0.9rem 1.25rem', borderBottom: i < leaderboard.length-1 ? '1px solid var(--dark-border)' : 'none', background: row.user_id === user.id ? 'rgba(34,197,94,0.06)' : undefined }}>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem', color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b87333' : 'rgba(255,255,255,0.3)' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}
                  </div>
                  <Avatar userId={row.user_id} avatars={avatars} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: row.user_id === user.id ? '#4ade80' : '#e8f5ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {profilesMap[row.user_id]?.nickname || row.display_name}
                      {row.user_id === user.id && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>({t.you})</span>}
                    </div>
                    {profilesMap[row.user_id]?.nickname && (
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.display_name}
                      </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', marginTop: profilesMap[row.user_id]?.nickname ? '0' : '0.1rem' }}>
                      {t.lang === 'pt' ? `${row.tips_submitted} palpites` : `${row.tips_submitted} tips`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem', color: row.exact_scores > 0 ? '#fbbf24' : 'rgba(255,255,255,0.25)' }}>
                    {row.exact_scores ?? 0}
                  </div>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem', color: row.correct_goal_diff > 0 ? '#60a5fa' : 'rgba(255,255,255,0.25)' }}>
                    {row.correct_goal_diff ?? 0}
                  </div>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem', color: row.correct_winners > 0 ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>
                    {row.correct_winners ?? 0}
                  </div>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                    {(() => {
                      const tt = allTournamentTips.find((tp: any) => tp.user_id === row.user_id)
                      const groups = tournament?.result_groups
                      if (!tt || !groups) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>–</span>
                      let count = 0
                      Object.entries(groups).forEach(([g, res]: any) => {
                        const pick1 = tt[`tip_group_${g.toLowerCase()}_1`]
                        const pick2 = tt[`tip_group_${g.toLowerCase()}_2`]
                        if (pick1 === res.first) count += 1
                        else if (pick1 === res.second) count += 0.5
                        if (pick2 === res.second) count += 1
                        else if (pick2 === res.first) count += 0.5
                      })
                      return <span style={{ color: count > 0 ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>{count}</span>
                    })()}
                  </div>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: i === 0 ? '#fbbf24' : row.user_id === user.id ? '#4ade80' : '#e8f5ee' }}>
                    {row.total_points}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span>🎯 {t.lang === 'pt' ? 'Placar exato' : 'Exact score'}</span>
              <span>⚖️ {t.lang === 'pt' ? 'Saldo de gols' : 'Goal difference'}</span>
              <span>✅ {t.lang === 'pt' ? 'Vencedor correto' : 'Correct winner'}</span>
              <span>🏟️ {t.lang === 'pt' ? 'Times classificados corretos' : 'Qualifier teams correct'} (1 = certo, 0.5 = posição errada)</span>
              <span>{t.lang === 'pt' ? 'Desempate: placar exato → saldo de gols' : 'Tiebreak: exact scores → goal diff'}</span>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <PlayerCards leaderboard={leaderboard} allTips={allTips} avatars={avatars} profilesMap={profilesMap} userId={user.id} t={t} />
              <RoundStandings leaderboard={leaderboard} allTips={allTips} profilesMap={profilesMap} t={t} />
            </div>
            <LeaderboardCharts leaderboard={leaderboard} allTips={allTips} t={t} sortKey={sortKey} setSortKey={setSortKey} profilesMap={profilesMap} userId={user.id} />
          </div>
        )}


        {/* Tips Reveal — visible once a match is locked */}
        {tab === 'tips_reveal' && (
          <TipsReveal matches={matches} allTips={allTips} allTournamentTips={allTournamentTips} leaderboard={leaderboard} avatars={avatars} profilesMap={profilesMap} userId={user.id} t={t} />
        )}

        {/* Rules */}
        {tab === 'rules' && (
          <TournamentRules tournament={tournament} approvedCount={approvedCount} t={t} />
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


function GroupQualifierTips({ tournament, userId, existing, onSave, t, matches }: any) {
  const supabase = createClient()
  // localPicks only holds unsaved edits — we always fall back to existing (DB) for display
  const [localPicks, setLocalPicks] = useState<Record<string, { first?: string, second?: string }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Helper: get current value for a group/position — prefer local edits, fall back to DB
  function getVal(group: string, pos: 'first' | 'second'): string {
    if (localPicks[group]?.[pos] !== undefined) return localPicks[group][pos] || ''
    const g = group.toLowerCase()
    return existing?.[`tip_group_${g}_${pos === 'first' ? '1' : '2'}`] || ''
  }

  function setPick(group: string, pos: 'first' | 'second', val: string) {
    setLocalPicks(prev => ({ ...prev, [group]: { ...prev[group], [pos]: val } }))
  }

  const ptsPerGroup = tournament.pts_qualify || 0
  // Honour DB lock — read from tournament object (set by admin via tournaments table)
  const dbLocked = tournament?.qualifiers_locked || false

  function isGroupLocked(group: string) {
    if (dbLocked) return true  // Admin has manually locked all qualifier tips
    const lockMins = tournament?.tip_lock_minutes ?? 120
    const mode = tournament?.group_lock_mode ?? 'per_match'
    if (mode === 'first_game') {
      const first = (matches || []).filter((m: any) => m.round === 'group').sort((a: any, b: any) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())[0]
      if (!first) return false
      return isPast(subMinutes(new Date(first.kickoff_at), lockMins))
    }
    const lockTime = GROUP_LOCK_TIMES[group]
    if (!lockTime) return false
    return isPast(subMinutes(new Date(lockTime), lockMins))
  }

  async function save() {
    setSaving(true)
    const result = await supabase.rpc('save_qualifier_picks', {
      p_user_id: userId,
      p_tournament_id: tournament.id,
      p_a1: getVal('A','first'), p_a2: getVal('A','second'),
      p_b1: getVal('B','first'), p_b2: getVal('B','second'),
      p_c1: getVal('C','first'), p_c2: getVal('C','second'),
      p_d1: getVal('D','first'), p_d2: getVal('D','second'),
      p_e1: getVal('E','first'), p_e2: getVal('E','second'),
      p_f1: getVal('F','first'), p_f2: getVal('F','second'),
      p_g1: getVal('G','first'), p_g2: getVal('G','second'),
      p_h1: getVal('H','first'), p_h2: getVal('H','second'),
      p_i1: getVal('I','first'), p_i2: getVal('I','second'),
      p_j1: getVal('J','first'), p_j2: getVal('J','second'),
      p_k1: getVal('K','first'), p_k2: getVal('K','second'),
      p_l1: getVal('L','first'), p_l2: getVal('L','second'),
    })
    if (result.error) {
      console.error('Qualifier save error:', result.error)
      alert('Save failed: ' + result.error.message)
      setSaving(false)
      return
    }
    setSaved(true); setTimeout(() => setSaved(false), 2500)
    setSaving(false)
    setLocalPicks({})
    onSave()
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
                    <select className="input" style={{ background: "#1a1a2e", color: "#fff" }} value={getVal(group, 'first')} onChange={e => setPick(group, 'first', e.target.value)}>
                      <option value="">{t.selectTeam}</option>
                      {teams.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.25rem' }}>🥈 {t.secondPlace}</label>
                    <select className="input" style={{ background: "#1a1a2e", color: "#fff" }} value={getVal(group, 'second')} onChange={e => setPick(group, 'second', e.target.value)}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
            {saved ? '✔ ' + t.savedBang : saving ? t.saving : t.saveQualifierPicks}
          </button>
          {saved && (
            <span style={{ fontSize: '0.85rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: 5 }}>
              ✔ {t.lang === 'pt' ? 'Palpites guardados com sucesso!' : 'Your qualifier picks have been saved!'}
            </span>
          )}
        </div>
      )}

      {lockedGroups.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>{t.lockedGroups}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {lockedGroups.map(group => {
              // getVal reads from existing (DB) first, then local edits
              const first = getVal(group, 'first')
              const second = getVal(group, 'second')
              return (
                <div key={group} className="card" style={{ padding: '1.25rem', opacity: 0.7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>
                      {t.lang === 'pt' ? `GRUPO ${group}` : `GROUP ${group}`}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'rgba(255,158,11,0.7)' }}><Lock size={10} />{t.locked}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                    <div>🥇 {first ? <span>{TEAM_FLAGS[first] || ''} {first}</span> : <span style={{ color: 'rgba(255,255,255,0.25)' }}>{t.noPick}</span>}</div>
                    <div style={{ marginTop: '0.25rem' }}>🥈 {second ? <span>{TEAM_FLAGS[second] || ''} {second}</span> : <span style={{ color: 'rgba(255,255,255,0.25)' }}>{t.noPick}</span>}</div>
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





function TournamentRules({ tournament: tn, approvedCount, t }: any) {
  const ispt = t.lang === 'pt'
  const pool = (tn.entry_fee || 0) * approvedCount
  const prize1 = Math.floor(pool * (tn.prize_split_1st || 60) / 100)
  const prize2 = Math.floor(pool * (tn.prize_split_2nd || 30) / 100)
  const prize3 = Math.floor(pool * (tn.prize_split_3rd || 10) / 100)
  const cur = tn.currency || 'AUD'

  const pWinner   = tn.pts_winner           || tn.pts_correct_winner       || 2
  const pDiff     = tn.pts_goal_diff         || tn.pts_correct_goal_diff    || 3
  const pExact    = tn.pts_exact_score       || tn.pts_correct_exact_score  || 5
  const pBonus    = tn.pts_big_margin_bonus  || 0
  const pTourWin  = tn.pts_tournament_winner || 10
  const pSecond   = tn.pts_second_place      || 6
  const pThird    = tn.pts_third_place       || 4
  const pScorer   = tn.pts_top_scorer        || 8
  const pQualify  = tn.pts_qualify           || tn.pts_qualifying_teams     || 0

  const Section = ({ emoji, title, children }: any) => (
    <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', color: '#e8f5ee' }}>{title}</h3>
      </div>
      {children}
    </div>
  )

  const Row = ({ label, value, highlight, example }: any) => (
    <div style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', flex: 1 }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: highlight || '#e8f5ee', whiteSpace: 'nowrap' }}>{value}</span>
      </div>
      {example && (
        <p style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.25)', margin: '0.2rem 0 0', fontStyle: 'italic' }}>{example}</p>
      )}
    </div>
  )

  return (
    <div style={{ maxWidth: 600, paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
          📋 {tn.name} — {ispt ? 'Regras' : 'Rules'}
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>
          {ispt ? 'Tudo que você precisa saber para jogar e ganhar.' : 'Everything you need to know to play and win.'}
        </p>
      </div>

      <Section emoji="⚽" title={ispt ? 'COMO FUNCIONA' : 'HOW IT WORKS'}>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
          {ispt ? 'Para cada jogo, você deve acertar o placar. Quanto mais preciso, mais pontos você ganha. As dicas ficam bloqueadas 2 horas antes do início de cada partida.' : 'For each match, tip the final score. The more accurate your prediction, the more points you earn. Tips lock 2 hours before each match kicks off.'}
        </p>
      </Section>

      <Section emoji="🎯" title={ispt ? 'PONTUAÇÃO' : 'POINTS SYSTEM'}>
        <Row label={ispt ? '✅ Vencedor correto' : '✅ Correct winner'} value={`${pWinner} pts`} highlight="#4ade80"
          example={ispt ? `Ex: Você tipou Brasil para vencer → Brasil vence 2–0 → +${pWinner} pts` : `e.g. You tip Brazil to win → Brazil wins 2–0 → +${pWinner} pts`} />
        <Row label={ispt ? '⚖️ Saldo de gols correto' : '⚖️ Correct goal difference'} value={`${pDiff} pts`} highlight="#60a5fa"
          example={ispt ? `Ex: Você tipou Brasil 2–0 → Resultado foi 3–1 (mesma diferença de 2) → +${pWinner + pDiff} pts total` : `e.g. You tip Brazil 2–0 → Result is 3–1 (same diff of 2) → +${pWinner + pDiff} pts total`} />
        <Row label={ispt ? '🎯 Placar exato' : '🎯 Exact score'} value={`${pExact} pts`} highlight="#fbbf24"
          example={ispt ? `Ex: Você tipou Brasil 1–0 Escócia → Resultado: Brasil 1–0 Escócia → +${pWinner + pDiff + pExact} pts total` : `e.g. You tip Brazil 1–0 Scotland → Result: Brazil 1–0 Scotland → +${pWinner + pDiff + pExact} pts total`} />
        {pBonus > 0 && (
          <Row label={ispt ? `🚀 Bônus goleada (${tn.big_margin_threshold}+ gols de diferença)` : `🚀 Big margin bonus (${tn.big_margin_threshold}+ goal difference)`} value={`+${pBonus} pts`} highlight="#f87171"
            example={ispt ? `Ex: Você tipou Brasil 4–0 → Resultado: Brasil 4–0 → +${pWinner + pDiff + pExact + pBonus} pts total` : `e.g. You tip Brazil 4–0 → Result: Brazil 4–0 → +${pWinner + pDiff + pExact + pBonus} pts total`} />
        )}
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
          {ispt ? '💡 Os pontos são cumulativos — acertar o placar exato também conta como vencedor correto e saldo de gols.' : '💡 Points are cumulative — an exact score also counts as correct winner and correct goal difference.'}
        </div>
      </Section>

      <Section emoji="✖️" title={ispt ? 'MULTIPLICADORES POR FASE' : 'PHASE MULTIPLIERS'}>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
          {ispt ? 'Todos os pontos são multiplicados de acordo com a fase do torneio:' : 'All points are multiplied based on the tournament phase:'}
        </p>
        {[
          [ispt ? 'Fase de Grupos' : 'Group Stage', tn.multiplier_group],
          [ispt ? 'Rodada de 32' : 'Round of 32', tn.multiplier_r32],
          [ispt ? 'Oitavas de Final' : 'Round of 16', tn.multiplier_r16],
          [ispt ? 'Quartas de Final' : 'Quarter-Finals', tn.multiplier_qf],
          [ispt ? 'Semifinais' : 'Semi-Finals', tn.multiplier_sf],
          [ispt ? 'Final' : 'Final', tn.multiplier_final],
        ].filter(([, v]) => v > 0).map(([label, val]) => (
          <Row key={String(label)} label={String(label)} value={`${val}x`} highlight={Number(val) > 1 ? '#fbbf24' : undefined} />
        ))}
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
          {ispt ? `💡 Ex: Placar exato nas semifinais → ${pWinner + pDiff + pExact} pts × ${tn.multiplier_sf || 5}x = ${(pWinner + pDiff + pExact) * (tn.multiplier_sf || 5)} pts` : `💡 e.g. Exact score in the semi-finals → ${pWinner + pDiff + pExact} pts × ${tn.multiplier_sf || 5}x = ${(pWinner + pDiff + pExact) * (tn.multiplier_sf || 5)} pts`}
        </div>
      </Section>

      <Section emoji="🔒" title={ispt ? 'BLOQUEIO DAS DICAS' : 'TIP LOCK TIMES'}>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
          {ispt ? "• Dicas de partidas: bloqueiam 2 horas antes do apito inicial.\n• Classificados por grupo: bloqueiam 2 horas antes do primeiro jogo de cada grupo.\n• Previsões do torneio (campeão, artilheiro): bloqueiam antes do primeiro jogo do torneio." : "• Match tips lock 2 hours before each match kicks off.\n• Group qualifier picks lock 2 hours before each group's first match.\n• Tournament predictions (winner, top scorer) lock before the first match of the tournament."}
        </p>
      </Section>

      <Section emoji="🏆" title={ispt ? 'PREVISÕES DO TORNEIO' : 'TOURNAMENT PREDICTIONS'}>
        <Row label={ispt ? 'Campeão' : 'Tournament winner'} value={`${pTourWin} pts`} highlight="#fbbf24"
          example={ispt ? `Ex: Você tipou Brasil → Brasil vence a Copa → +${pTourWin} pts` : `e.g. You tip Brazil → Brazil wins the World Cup → +${pTourWin} pts`} />
        <Row label={ispt ? 'Vice-campeão' : 'Runner-up (2nd place)'} value={`${pSecond} pts`} highlight="#9ca3af"
          example={ispt ? `Ex: Você tipou Argentina → Argentina é vice-campeã → +${pSecond} pts` : `e.g. You tip Argentina → Argentina finishes 2nd → +${pSecond} pts`} />
        <Row label={ispt ? '3º lugar' : '3rd place'} value={`${pThird} pts`} highlight="#b87333"
          example={ispt ? `Ex: Você tipou França → França vence o 3º lugar → +${pThird} pts` : `e.g. You tip France → France wins the 3rd place match → +${pThird} pts`} />
        <Row label={ispt ? 'Artilheiro' : 'Top scorer'} value={`${pScorer} pts`} highlight="#4ade80"
          example={ispt ? `Ex: Você tipou Mbappé → Mbappé termina artilheiro → +${pScorer} pts` : `e.g. You tip Mbappé → Mbappé finishes as top scorer → +${pScorer} pts`} />
      </Section>

      {pQualify > 0 && (
        <Section emoji="📊" title={ispt ? 'CLASSIFICADOS POR GRUPO' : 'GROUP QUALIFIERS'}>
          <Row label={ispt ? 'Seleção na posição correta' : 'Team in correct position'} value={`${pQualify} pts`} highlight="#4ade80"
            example={ispt ? `Ex: Você tipou Brasil 1º → Brasil termina 1º no grupo → +${pQualify} pts` : `e.g. You tip Brazil 1st → Brazil finishes 1st in group → +${pQualify} pts`} />
          <Row label={ispt ? 'Seleção avança mas na posição errada' : 'Team qualifies but wrong position'} value={`${Math.floor(pQualify / 2)} pts`} highlight="#60a5fa"
            example={ispt ? `Ex: Você tipou Brasil 1º → Brasil termina 2º → +${Math.floor(pQualify / 2)} pts` : `e.g. You tip Brazil 1st → Brazil finishes 2nd → +${Math.floor(pQualify / 2)} pts`} />
          <Row label={ispt ? 'Seleção não avança' : "Team doesn't qualify"} value="0 pts" highlight="rgba(255,255,255,0.25)"
            example={ispt ? 'Ex: Você tipou Brasil 1º → Brasil é eliminado na fase de grupos → 0 pts' : 'e.g. You tip Brazil 1st → Brazil knocked out in group stage → 0 pts'} />
        </Section>
      )}

      {pool > 0 && (
        <Section emoji="💰" title={ispt ? 'PREMIAÇÃO' : 'PRIZE POOL'}>
          <Row label={ispt ? 'Premiação total' : 'Total prize pool'} value={`${cur} $${pool.toLocaleString()}`} highlight="#fbbf24" />
          <Row label={`🥇 ${ispt ? '1º lugar' : '1st place'} (${tn.prize_split_1st || 60}%)`} value={`${cur} $${prize1.toLocaleString()}`} highlight="#fbbf24" />
          <Row label={`🥈 ${ispt ? '2º lugar' : '2nd place'} (${tn.prize_split_2nd || 30}%)`} value={`${cur} $${prize2.toLocaleString()}`} highlight="#9ca3af" />
          <Row label={`🥉 ${ispt ? '3º lugar' : '3rd place'} (${tn.prize_split_3rd || 10}%)`} value={`${cur} $${prize3.toLocaleString()}`} highlight="#b87333" />
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
            {ispt ? `* Baseado em ${approvedCount} jogadores × ${cur} $${tn.entry_fee} de entrada. Atualiza conforme novos jogadores são aprovados.` : `* Based on ${approvedCount} players × ${cur} $${tn.entry_fee} entry fee. Updates as new players are approved.`}
          </div>
        </Section>
      )}

      <Section emoji="⚖️" title={ispt ? 'DESEMPATE' : 'TIEBREAKER'}>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
          {ispt ? 'Em caso de empate em pontos, o desempate é feito pela ordem: 1. Maior número de placares exatos → 2. Maior número de saldos de gols corretos → 3. Maior número de vencedores corretos.' : 'If players are tied on points, the tiebreaker order is: 1. Most exact scores → 2. Most correct goal differences → 3. Most correct winners.'}
        </p>
      </Section>

      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', marginTop: '1rem' }}>
        {ispt ? '⚽ Boa sorte a todos!' : '⚽ Good luck everyone!'}
      </div>
    </div>
  )
}
function PrizeBanner({ tournament, approvedCount, leaderboard, t }: any) {
  const pool = (tournament.entry_fee || 0) * approvedCount
  const split1 = Number(tournament.prize_split_1st) || 60
  const split2 = Number(tournament.prize_split_2nd) || 30
  const split3 = Number(tournament.prize_split_3rd) || 10
  const prize1 = Math.floor(pool * split1 / 100)
  const prize2 = Math.floor(pool * split2 / 100)
  const prize3 = Math.floor(pool * split3 / 100)
  const currency = tournament.currency || 'AUD'

  // Get current top 3
  const sorted = [...leaderboard].sort((a: any, b: any) => b.total_points - a.total_points)
  const top3 = sorted.slice(0, 3)

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', fontWeight: 600 }}>
            {t.lang === 'pt' ? 'PREMIAÇÃO TOTAL' : 'TOTAL PRIZE POOL'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#fbbf24', letterSpacing: '0.02em', lineHeight: 1 }}>
            {currency} ${pool.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>
            {approvedCount} {t.lang === 'pt' ? 'jogadores' : 'players'} × {currency} ${tournament.entry_fee}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { emoji: '🥇', label: `${split1}%`, amount: prize1, name: top3[0]?.total_points > 0 ? top3[0]?.display_name : null },
            { emoji: '🥈', label: `${split2}%`, amount: prize2, name: top3[1]?.total_points > 0 ? top3[1]?.display_name : null },
            { emoji: '🥉', label: `${split3}%`, amount: prize3, name: top3[2]?.total_points > 0 ? top3[2]?.display_name : null },
          ].map(({ emoji, label, amount, name }) => (
            <div key={emoji} style={{ textAlign: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 10, minWidth: 80 }}>
              <div style={{ fontSize: '1.1rem' }}>{emoji}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#fbbf24' }}>${amount.toLocaleString()}</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{label}</div>
              {name && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name.split(' ')[0]}</div>}
            </div>
          ))}
        </div>
      </div>
      {pool === 0 && (
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)' }}>
          {t.lang === 'pt' ? 'Premiação atualiza conforme os jogadores são aprovados.' : 'Prize pool updates as players get approved.'}
        </div>
      )}
    </div>
  )
}


function RoundStandings({ leaderboard, allTips, profilesMap, t }: any) {
  if (!leaderboard.length) return null

  // Get today's points per player
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayPtsMap: Record<string, number> = {}
  allTips.forEach((tip: any) => {
    const kickoff = new Date(tip.match?.kickoff_at || 0)
    if (kickoff >= today && Number(tip.pts_with_multiplier) > 0) {
      todayPtsMap[tip.user_id] = (todayPtsMap[tip.user_id] || 0) + Number(tip.pts_with_multiplier)
    }
  })

  const hasToday = Object.keys(todayPtsMap).length > 0
  const ptsMap = hasToday ? todayPtsMap : leaderboard.reduce((acc: any, r: any) => {
    acc[r.user_id] = Number(r.total_points); return acc
  }, {} as Record<string, number>)

  const sorted = [...leaderboard].sort((a: any, b: any) => (ptsMap[b.user_id] || 0) - (ptsMap[a.user_id] || 0))
  const top3 = sorted.slice(0, 3)
  const bottom3 = [...sorted].reverse().slice(0, 3)

  const heroEmojis = ['🥇', '🥈', '🥉']
  const heroTitles = ['The Prophet', 'The Oracle', 'The Visionary']
  const zeroTitles = ['The Disaster', 'The Confused', 'The Optimist']
  const heroColors = ['#fbbf24', '#9ca3af', '#b87333']
  const zeroEmojis = ['💀', '🤡', '😵']

  const Label = ({ children, color }: any) => (
    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color, marginBottom: '0.4rem' }}>{children}</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 220, flex: 1 }}>
      {/* Round Heroes */}
      <div className="card" style={{ padding: '1rem 1.25rem', border: '1px solid rgba(251,191,36,0.15)' }}>
        <Label color="#fbbf24">{hasToday ? (t.lang === 'pt' ? '⭐ HERÓIS DO DIA' : '⭐ HEROES OF THE DAY') : (t.lang === 'pt' ? '⭐ TOP TIPPERS' : '⭐ TOP TIPPERS')}</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {top3.map((row: any, i: number) => {
            const pts = ptsMap[row.user_id] || 0
            return (
              <div key={row.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem', width: 20 }}>{heroEmojis[i]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: heroColors[i] }}>{profilesMap?.[row.user_id]?.nickname || row.display_name.split(' ')[0]}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>{heroTitles[i]}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: heroColors[i] }}>{pts}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Round Zeroes */}
      {leaderboard.length > 1 && (
        <div className="card" style={{ padding: '1rem 1.25rem', border: '1px solid rgba(248,113,113,0.15)' }}>
          <Label color="#f87171">{hasToday ? (t.lang === 'pt' ? '💀 DESASTRES DO DIA' : '💀 DISASTERS OF THE DAY') : (t.lang === 'pt' ? '💀 BOTTOM TIPPERS' : '💀 BOTTOM TIPPERS')}</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {bottom3.map((row: any, i: number) => {
              const pts = ptsMap[row.user_id] || 0
              return (
                <div key={row.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem', width: 20 }}>{zeroEmojis[i]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f87171' }}>{profilesMap?.[row.user_id]?.nickname || row.display_name.split(' ')[0]}</div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>{zeroTitles[i]}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#f87171' }}>{pts}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Jersey colors per team
const JERSEY_COLORS: Record<string, { primary: string, secondary: string, accent: string }> = {
  Brazil:      { primary: '#009c3b', secondary: '#FEDD00', accent: '#002776' },
  Argentina:   { primary: '#74acdf', secondary: '#ffffff', accent: '#74acdf' },
  France:      { primary: '#002395', secondary: '#ED2939', accent: '#ffffff' },
  England:     { primary: '#ffffff', secondary: '#CF081F', accent: '#00247D' },
  Germany:     { primary: '#ffffff', secondary: '#000000', accent: '#DD0000' },
  Spain:       { primary: '#AA151B', secondary: '#F1BF00', accent: '#AA151B' },
  Portugal:    { primary: '#006600', secondary: '#FF0000', accent: '#FFD700' },
  Netherlands: { primary: '#FF6600', secondary: '#ffffff', accent: '#003DA5' },
  USA:         { primary: '#B22234', secondary: '#3C3B6E', accent: '#ffffff' },
  Mexico:      { primary: '#006847', secondary: '#CE1126', accent: '#ffffff' },
  Australia:   { primary: '#FFD700', secondary: '#00843D', accent: '#ffffff' },
  Japan:       { primary: '#000080', secondary: '#BC002D', accent: '#ffffff' },
  Morocco:     { primary: '#C1272D', secondary: '#006233', accent: '#ffffff' },
  Senegal:     { primary: '#00853F', secondary: '#FDEF42', accent: '#E31B23' },
  Colombia:    { primary: '#FCD116', secondary: '#003087', accent: '#CE1126' },
  Croatia:     { primary: '#FF0000', secondary: '#ffffff', accent: '#0000CD' },
  default:     { primary: '#1a4a3a', secondary: '#4ade80', accent: '#ffffff' },
}

const POSITIONS = ['ST','CF','LW','RW','CAM','CM','CDM','LB','RB','CB','GK','SS']
const FLAGS: Record<string, string> = {
  Brazil:'🇧🇷',Argentina:'🇦🇷',France:'🇫🇷',England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',Germany:'🇩🇪',Spain:'🇪🇸',
  Portugal:'🇵🇹',Netherlands:'🇳🇱',USA:'🇺🇸',Mexico:'🇲🇽',Australia:'🇦🇺',Japan:'🇯🇵',
  Morocco:'🇲🇦',Senegal:'🇸🇳',Colombia:'🇨🇴',Croatia:'🇭🇷'
}

function calcRating(row: any): number {
  const pts = Number(row.total_points) || 0
  const exact = Number(row.exact_scores) || 0
  const winners = Number(row.correct_winners) || 0
  const tips = Number(row.tips_submitted) || 1
  const acc = Math.round((winners / tips) * 100)
  const raw = Math.min(99, Math.max(10, Math.round(pts * 1.5 + exact * 3 + acc * 0.3)))
  return raw
}

const FLAG_URLS: Record<string, string> = {
  Brazil:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/br.svg',
  Argentina:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/ar.svg',
  France:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/fr.svg',
  England:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/gb-eng.svg',
  Germany:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/de.svg',
  Spain:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/es.svg',
  Portugal:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/pt.svg',
  Netherlands:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/nl.svg',
  USA:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/us.svg',
  Mexico:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/mx.svg',
  Australia:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/au.svg',
  Japan:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/jp.svg',
  Morocco:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/ma.svg',
  Senegal:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/sn.svg',
  Colombia:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/co.svg',
  Croatia:'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/hr.svg',
}

function JerseySVG({ colors, isGrey }: { colors: any, isGrey: boolean }) {
  const c1 = isGrey ? '#444' : colors.primary
  const c2 = isGrey ? '#333' : colors.secondary
  return (
    <svg viewBox="0 0 120 80" style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 120, height: 80, opacity: isGrey ? 0.4 : 0.85 }}>
      <path d="M15 10 L0 30 L20 38 L20 80 L100 80 L100 38 L120 30 L105 10 L80 4 Q60 16 40 4 Z" fill={c1} />
      <path d="M40 4 Q60 16 80 4 L80 22 Q60 10 40 22 Z" fill={c2} />
      <path d="M0 30 L20 38 L20 50 L0 42 Z" fill={c2} opacity="0.5" />
      <path d="M120 30 L100 38 L100 50 L120 42 Z" fill={c2} opacity="0.5" />
    </svg>
  )
}

function FIFACard({ row, allTips, avatarUrl, profile, variant, label, t }: any) {
  const team = profile?.jersey_team || 'default'
  const position = profile?.tip_position || 'CAM'
  const colors = JERSEY_COLORS[team] || JERSEY_COLORS.default
  const flagUrl = FLAG_URLS[team]
  const rating = calcRating(row)
  const userTips = allTips.filter((tip: any) => tip.user_id === row.user_id)
  const pts = Number(row.total_points) || 0
  const exact = Number(row.exact_scores) || 0
  const winners = Number(row.correct_winners) || 0
  const gdf = Number(row.correct_goal_diff) || 0
  const tips = Number(row.tips_submitted) || 0
  const acc = tips > 0 ? Math.round((winners / tips) * 100) : 0

  const sortedTips = [...userTips].sort((a: any, b: any) => new Date(a.match?.kickoff_at || 0).getTime() - new Date(b.match?.kickoff_at || 0).getTime())
  let streak = 0
  for (let i = sortedTips.length - 1; i >= 0; i--) {
    if (Number(sortedTips[i].pts_with_multiplier) > 0) streak++
    else break
  }

  const isGold = variant === 'gold'
  const isGrey = variant === 'grey'
  const cardBg = isGold
    ? 'radial-gradient(ellipse at 35% 25%, #5a3a00, #2d1c00 55%, #120b00)'
    : isGrey
    ? 'radial-gradient(ellipse at 35% 25%, #2a2a2a, #141414 55%, #080808)'
    : `radial-gradient(ellipse at 35% 25%, ${colors.primary}cc, #060d0a 65%)`
  const borderColor = isGold ? '#c9a227' : isGrey ? '#4a4a4a' : colors.secondary + 'aa'
  const textColor = isGold ? '#ffd700' : isGrey ? '#777' : '#ffffff'
  const subColor = isGold ? '#c9a227' : isGrey ? '#555' : 'rgba(255,255,255,0.5)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {label && <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: isGold ? '#c9a227' : isGrey ? '#555' : 'rgba(255,255,255,0.35)', textAlign: 'center' }}>{label}</div>}
      <div style={{ width: 175, height: 360, position: 'relative', borderRadius: 14, overflow: 'hidden', flexShrink: 0, boxShadow: isGold ? '0 0 30px rgba(201,162,39,0.3)' : 'none' }}>
        {/* BG */}
        <div style={{ position: 'absolute', inset: 0, background: cardBg }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.07) 0%,transparent 50%)', zIndex: 9, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 3, borderRadius: 11, border: `${isGold ? '2.5px' : '2px'} ${isGrey ? 'dashed' : 'solid'} ${borderColor}`, zIndex: 10, pointerEvents: 'none' }} />
        {isGold && <div style={{ position: 'absolute', inset: 7, borderRadius: 8, border: '1px solid rgba(201,162,39,0.25)', zIndex: 8, pointerEvents: 'none' }} />}

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 5 }}>
          {/* Top badge */}
          {(isGold || isGrey) && (
            <div style={{ textAlign: 'center', padding: '5px 0 0', fontSize: '7px', fontWeight: 700, letterSpacing: '0.13em', color: isGold ? '#c9a227' : '#555' }}>
              {isGold ? '⭐ TIPPER OF THE DAY ⭐' : '😩 DEFLATED BALL 😩'}
            </div>
          )}

          {/* Rating + position + flag */}
          <div style={{ padding: isGold || isGrey ? '2px 12px 0' : '7px 12px 0' }}>
            <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 0.88, letterSpacing: -2, color: textColor }}>{rating}</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: subColor, marginTop: 2 }}>{position}</div>
            <div style={{ width: 28, height: 20, borderRadius: 3, overflow: 'hidden', marginTop: 4, border: `1px solid ${borderColor}` }}>
              {flagUrl
                ? <img src={flagUrl} alt={team} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🌍</div>
              }
            </div>
          </div>

          {/* Player photo — large centred circle, no jersey */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 140, height: 140,
              borderRadius: '50%',
              overflow: 'hidden',
              border: `2px solid ${borderColor}`,
              background: 'rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover', objectPosition: 'center center',
                    filter: isGrey ? 'grayscale(1) brightness(0.7)' : 'none',
                  }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 80 80" width="80" height="80" style={{ filter: isGrey ? 'grayscale(1)' : 'none', opacity: 0.4 }}>
                    <circle cx="40" cy="28" r="18" fill="rgba(255,255,255,0.5)"/>
                    <path d="M5 80 Q5 50 40 50 Q75 50 75 80" fill="rgba(255,255,255,0.5)"/>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div style={{ textAlign: 'center', padding: '4px 8px 1px', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {(profile?.nickname || row.display_name).toUpperCase()}
          </div>
          {profile?.nickname && (
            <div style={{ textAlign: 'center', padding: '0 8px 3px', fontSize: 8, color: subColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.7 }}>
              {row.display_name}
            </div>
          )}

          {/* Divider */}
          <div style={{ margin: '0 12px', height: 1, background: borderColor, opacity: 0.3 }} />

          {/* Stats — 6 in 2 cols */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', padding: '5px 10px 8px', gap: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {([['PTS', pts], ['EXC', exact], ['ACC', acc + '%']] as [string, any][]).map(([lbl, val]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1.6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: textColor, minWidth: 28 }}>{val}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: subColor }}>{lbl}</span>
                </div>
              ))}
            </div>
            <div style={{ width: 1, margin: '0 5px', background: borderColor, opacity: 0.3 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 6 }}>
              {([['WIN', winners], ['GDF', gdf], ['STK', streak]] as [string, any][]).map(([lbl, val]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1.6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: textColor, minWidth: 28 }}>{val}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: subColor }}>{lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlayerCards({ leaderboard, allTips, avatars, profilesMap, userId, t }: any) {
  if (!leaderboard.length) return null

  // My card
  const myRow = leaderboard.find((r: any) => r.user_id === userId)

  // Today's tipper — who earned most pts today
  const today = new Date()
  today.setHours(0,0,0,0)
  const todayTips = allTips.filter((tip: any) => {
    const kickoff = new Date(tip.match?.kickoff_at || 0)
    return kickoff >= today && Number(tip.pts_with_multiplier) > 0
  })
  const todayPtsMap: Record<string, number> = {}
  todayTips.forEach((tip: any) => {
    todayPtsMap[tip.user_id] = (todayPtsMap[tip.user_id] || 0) + Number(tip.pts_with_multiplier)
  })

  // If no today tips, use all time best/worst
  const ptsMap = Object.keys(todayPtsMap).length > 0 ? todayPtsMap : leaderboard.reduce((acc: any, r: any) => {
    acc[r.user_id] = Number(r.total_points); return acc
  }, {} as Record<string, number>)

  const sortedByToday = [...leaderboard].sort((a: any, b: any) => (ptsMap[b.user_id] || 0) - (ptsMap[a.user_id] || 0))
  const tipperRow = sortedByToday[0]
  const deflatedRow = sortedByToday[sortedByToday.length - 1]

  const hasResults = leaderboard.some((r: any) => Number(r.total_points) > 0)

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
        ⚽ {t.lang === 'pt' ? 'CARTÕES DO DIA' : 'CARDS OF THE DAY'}
      </h3>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        {myRow && (
          <FIFACard
            row={myRow}
            allTips={allTips}
            avatarUrl={avatars[myRow.user_id]}
            profile={profilesMap[myRow.user_id]}
            variant="default"
            label={t.lang === 'pt' ? '👤 SEU CARTÃO' : '👤 YOUR CARD'}
            t={t}
          />
        )}
        {hasResults && tipperRow && tipperRow.user_id !== deflatedRow?.user_id && (
          <FIFACard
            row={tipperRow}
            allTips={allTips}
            avatarUrl={avatars[tipperRow.user_id]}
            profile={profilesMap[tipperRow.user_id]}
            variant="gold"
            label={t.lang === 'pt' ? '⭐ TIPPER DO DIA' : '⭐ TIPPER OF THE DAY'}
            t={t}
          />
        )}
        {hasResults && deflatedRow && leaderboard.length > 1 && (
          <FIFACard
            row={deflatedRow}
            allTips={allTips}
            avatarUrl={avatars[deflatedRow.user_id]}
            profile={profilesMap[deflatedRow.user_id]}
            variant="grey"
            label={t.lang === 'pt' ? '😩 BOLA MURCHA' : '😩 DEFLATED BALL'}
            t={t}
          />
        )}
      </div>
      {!hasResults && (
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.5rem' }}>
          {t.lang === 'pt' ? 'Cartões aparecem após o primeiro resultado!' : 'Cards appear after the first match result!'}
        </p>
      )}
    </div>
  )
}

const CHART_COLORS = ['#4ade80','#fbbf24','#60a5fa','#f87171','#c084fc','#34d399','#fb923c','#a78bfa','#f472b6','#38bdf8']

const ROUND_ORDER = ['group','r32','r16','qf','sf','third_place','final']

function LeaderboardCharts({ leaderboard, allTips, t, sortKey, setSortKey, profilesMap, userId }: any) {
  if (!leaderboard.length) return null
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(() => new Set(leaderboard.map((r: any) => r.user_id)))

  function togglePlayer(id: string) {
    setSelectedPlayers(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) } // always keep at least 1
      else next.add(id)
      return next
    })
  }
  function selectAll() { setSelectedPlayers(new Set(leaderboard.map((r: any) => r.user_id))) }

  // Sort players by selected metric
  const sortedLeaderboard = [...leaderboard].sort((a: any, b: any) => {
    if (sortKey === 'exact_scores') return b.exact_scores - a.exact_scores
    if (sortKey === 'correct_winners') return b.correct_winners - a.correct_winners
    if (sortKey === 'correct_goal_diff') return b.correct_goal_diff - a.correct_goal_diff
    return b.total_points - a.total_points
  })

  // Bar chart — one bar per player showing the selected metric
  const barData = sortedLeaderboard.map((row: any) => {
    const userTips = allTips.filter((tip: any) => tip.user_id === row.user_id)
    const exactPts = userTips.reduce((s: number, tip: any) => s + (Number(tip.pts_exact_score) || 0), 0)
    const goalDiffPts = userTips.reduce((s: number, tip: any) => s + (Number(tip.pts_goal_diff) || 0), 0)
    const winnerPts = userTips.reduce((s: number, tip: any) => s + (Number(tip.pts_winner) || 0), 0)
    const bonusPts = userTips.reduce((s: number, tip: any) => s + (Number(tip.pts_big_margin) || 0), 0)
    const nick = profilesMap?.[row.user_id]?.nickname
    const name = nick || (row.display_name.length > 12 ? row.display_name.split(' ')[0] : row.display_name)
    return {
      name,
      fullName: row.display_name,
      // For total: show stacked breakdown
      winner: winnerPts,
      goalDiff: goalDiffPts,
      exact: exactPts,
      bonus: bonusPts,
      total: Number(row.total_points) || 0,
      // For individual filters: single value
      value: sortKey === 'total_points' ? Number(row.total_points)
        : sortKey === 'exact_scores' ? exactPts
        : sortKey === 'correct_winners' ? winnerPts
        : goalDiffPts,
    }
  })

  // Line chart — progression per match
  const matchMeta: Record<string, any> = {}
  allTips.forEach((tip: any) => {
    if (tip.match_id && tip.match) matchMeta[tip.match_id] = tip.match
  })

  const completedMatchIds = Array.from(new Set(
    allTips
      .filter((tip: any) => tip.match?.status === 'completed')
      .map((tip: any) => tip.match_id as string)
  )) as string[]

  const sortedMatches = completedMatchIds
    .filter(id => matchMeta[id])
    .sort((a, b) => new Date(matchMeta[a]?.kickoff_at || 0).getTime() - new Date(matchMeta[b]?.kickoff_at || 0).getTime())

  const filteredLeaderboard = sortedLeaderboard.filter((r: any) => selectedPlayers.has(r.user_id))
  const players = filteredLeaderboard.map((row: any) => ({ id: row.user_id, name: profilesMap?.[row.user_id]?.nickname || row.display_name }))

  const progressionData = sortedMatches.map((matchId: string, idx: number) => {
    const meta = matchMeta[matchId]
    const roundShort = meta?.round === 'group' ? 'G' : (meta?.round || '').toUpperCase().replace('THIRD_PLACE','3P')
    const point: any = { match: `${roundShort}${idx + 1}` }
    players.forEach((p: any) => {
      const matchesUpTo = sortedMatches.slice(0, idx + 1)
      const playerTips = allTips.filter((tip: any) => tip.user_id === p.id && matchesUpTo.includes(tip.match_id))
      if (sortKey === 'total_points') {
        point[p.name] = playerTips.reduce((s: number, tip: any) => s + (Number(tip.pts_with_multiplier) || 0), 0)
      } else if (sortKey === 'exact_scores') {
        point[p.name] = playerTips.reduce((s: number, tip: any) => s + (Number(tip.pts_exact_score) || 0), 0)
      } else if (sortKey === 'correct_winners') {
        point[p.name] = playerTips.reduce((s: number, tip: any) => s + (Number(tip.pts_winner) || 0), 0)
      } else {
        point[p.name] = playerTips.reduce((s: number, tip: any) => s + (Number(tip.pts_goal_diff) || 0), 0)
      }
    })
    return point
  })

  const sortLabel: Record<string, string> = {
    total_points: '🏆 Total Points',
    exact_scores: '🎯 Exact Score Points',
    correct_winners: '✅ Winner Points',
    correct_goal_diff: '⚖️ Goal Diff Points',
  }

  const barColor: Record<string, string> = {
    total_points: '#4ade80',
    exact_scores: '#fbbf24',
    correct_winners: '#4ade80',
    correct_goal_diff: '#60a5fa',
  }

  return (
    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Sort buttons */}
      <div>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem' }}>
          {t.lang === 'pt' ? 'Visualizar por:' : 'View charts by:'}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {([
            { key: 'total_points', label: '🏆 Total Points' },
            { key: 'exact_scores', label: '🎯 Exact Score Pts' },
            { key: 'correct_winners', label: '✅ Winner Pts' },
            { key: 'correct_goal_diff', label: '⚖️ Goal Diff Pts' },
          ] as { key: SortKey, label: string }[]).map(opt => (
            <button key={opt.key} onClick={() => setSortKey(opt.key)} style={{
              padding: '0.4rem 0.85rem', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer', border: 'none',
              background: sortKey === opt.key ? 'var(--green)' : 'rgba(255,255,255,0.07)',
              color: sortKey === opt.key ? '#fff' : 'rgba(255,255,255,0.5)',
              fontWeight: sortKey === opt.key ? 600 : 400, transition: 'all 0.15s',
            }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Player filter for progression chart */}
      {leaderboard.length > 1 && (
        <div>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem' }}>
            {t.lang === 'pt' ? 'Comparar jogadores:' : 'Compare players:'}
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={selectAll} style={{
              padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.72rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)',
              background: selectedPlayers.size === leaderboard.length ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: 'rgba(255,255,255,0.6)',
            }}>All</button>
            {leaderboard.map((row: any, i: number) => {
              const name = profilesMap?.[row.user_id]?.nickname || row.display_name.split(' ')[0]
              const isSelected = selectedPlayers.has(row.user_id)
              const color = CHART_COLORS[i % CHART_COLORS.length]
              return (
                <button key={row.user_id} onClick={() => togglePlayer(row.user_id)} style={{
                  padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.72rem', cursor: 'pointer',
                  border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.1)'}`,
                  background: isSelected ? color + '22' : 'transparent',
                  color: isSelected ? color : 'rgba(255,255,255,0.35)',
                  fontWeight: isSelected ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}>
                  {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />}
                  {name}
                  {row.user_id === userId && <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>(you)</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Chart 1: Line chart — progression (shown first) */}
      {progressionData.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>
            📈 {t.lang === 'pt' ? 'PROGRESSÃO' : 'PROGRESSION'} — {sortLabel[sortKey].toUpperCase()}
          </h3>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginBottom: '1rem' }}>
            {t.lang === 'pt' ? 'Acumulado após cada jogo' : 'Cumulative after each match'}
          </p>
          <div className="card" style={{ padding: '1.5rem' }}>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={progressionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="match" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} interval={Math.max(0, Math.floor(progressionData.length / 12))} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Tooltip contentStyle={{ background: '#0a0f0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }} labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                {players.map((p: any, i: number) => (
                  <Line key={p.id} type="monotone" dataKey={p.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Chart 2: Bar chart — points per player */}
      {barData.some((d: any) => d.value > 0) && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>
            📊 {sortLabel[sortKey].toUpperCase()}
          </h3>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginBottom: '1rem' }}>
            {t.lang === 'pt' ? 'Pontos por jogador' : 'Points per player'}
          </p>
          <div className="card" style={{ padding: '1.5rem' }}>
            <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 55)}>
              <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} width={80} />
                <Tooltip
                  contentStyle={{ background: '#0a0f0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }}
                  formatter={(value: any) => [`${value} pts`, sortLabel[sortKey]]}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                {sortKey === 'total_points' ? (
                  <>
                    <Bar dataKey="winner" stackId="a" fill="#4ade80" name="✅ Winner" />
                    <Bar dataKey="goalDiff" stackId="a" fill="#60a5fa" name="⚖️ Goal Diff" />
                    <Bar dataKey="exact" stackId="a" fill="#fbbf24" name="🎯 Exact" />
                    <Bar dataKey="bonus" stackId="a" fill="#f87171" name="🚀 Bonus" radius={[0,4,4,0]} />
                  </>
                ) : (
                  <Bar dataKey="value" fill={barColor[sortKey]} radius={[0,4,4,0]}
                    label={{ position: 'right', fill: 'rgba(255,255,255,0.5)', fontSize: 12, formatter: (v: any) => v > 0 ? `${v}` : '' }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  )
}



function TipsReveal({ matches, allTips, allTournamentTips, leaderboard, avatars, profilesMap, userId, t }: any) {
  const [view, setView] = useState<'matches' | 'qualifiers' | 'predictions'>('matches')
  const roundLabel: Record<string, string> = {
    group: 'Group', r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third_place: '3rd', final: 'Final'
  }

  const lockedMatches = matches.filter((m: any) => {
    if (m.status === 'live' || m.status === 'completed') return true
    return new Date() >= new Date(m.kickoff_at)
  })

  const players = leaderboard.map((r: any) => ({
    id: r.user_id,
    name: profilesMap?.[r.user_id]?.nickname || r.display_name,
    isMe: r.user_id === userId,
    avatar: avatars[r.user_id],
  }))

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
        {t.lang === 'pt' ? "👁 Palpites de Todos" : "👁 Everyone's Tips"}
      </h2>
      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginBottom: '1rem' }}>
        {t.lang === 'pt' ? 'Visível após bloqueio de cada partida.' : 'Visible once each match or category is locked.'}
      </p>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {([['matches', '⚽ Match Tips', '⚽ Partidas'], ['qualifiers', '🗂️ Group Qualifiers', '🗂️ Classificados'], ['predictions', '🏆 Predictions', '🏆 Previsões']] as const).map(([v, en, pt]) => (
          <button key={v} onClick={() => setView(v as any)} style={{
            padding: '0.4rem 1rem', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
            border: `1px solid ${view === v ? 'var(--green)' : 'rgba(255,255,255,0.15)'}`,
            background: view === v ? 'rgba(74,222,128,0.12)' : 'transparent',
            color: view === v ? '#4ade80' : 'rgba(255,255,255,0.5)',
          }}>
            {t.lang === 'pt' ? pt : en}
          </button>
        ))}
      </div>

      {/* ── MATCH TIPS TABLE ── */}
      {view === 'matches' && (
        lockedMatches.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
            <p>{t.lang === 'pt' ? 'Palpites visíveis após o início das partidas.' : 'Tips visible once matches kick off.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: Math.max(500, lockedMatches.length * 80 + 120) }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', left: 0, background: '#0a0f0d', zIndex: 2, minWidth: 110 }}>
                    {t.lang === 'pt' ? 'JOGADOR' : 'PLAYER'}
                  </th>
                  {lockedMatches.map((m: any) => (
                    <th key={m.id} style={{ textAlign: 'center', padding: '0.4rem 0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.08)', minWidth: 72 }}>
                      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem' }}>{roundLabel[m.round] || m.round}</div>
                      <div style={{ whiteSpace: 'nowrap' }}>{TEAM_FLAGS[m.home_team] || ''}{m.home_team?.split(' ')[0]}</div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>vs</div>
                      <div style={{ whiteSpace: 'nowrap' }}>{TEAM_FLAGS[m.away_team] || ''}{m.away_team?.split(' ')[0]}</div>
                      {m.status === 'completed' && m.home_score !== null && (
                        <div style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.72rem', marginTop: '0.2rem' }}>{m.home_score}–{m.away_score}</div>
                      )}
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--gold)', fontWeight: 700, fontSize: '0.72rem', borderBottom: '1px solid rgba(255,255,255,0.08)', minWidth: 60 }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player: any) => {
                  const totalPts = leaderboard.find((r: any) => r.user_id === player.id)?.total_points || 0
                  return (
                    <tr key={player.id} style={{ background: player.isMe ? 'rgba(74,222,128,0.04)' : 'transparent' }}>
                      <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', left: 0, background: player.isMe ? 'rgba(74,222,128,0.06)' : '#0a0f0d', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.08)' }}>
                            {player.avatar ? <img src={player.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>👤</span>}
                          </div>
                          <span style={{ color: player.isMe ? '#4ade80' : '#e8f5ee', fontWeight: player.isMe ? 600 : 400, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                            {player.name}{player.isMe ? ' ✦' : ''}
                          </span>
                        </div>
                      </td>
                      {lockedMatches.map((m: any) => {
                        const tip = allTips.find((tp: any) => tp.match_id === m.id && tp.user_id === player.id)
                        const hasResult = m.status === 'completed' && m.home_score !== null
                        const exact = hasResult && tip && tip.tip_home === m.home_score && tip.tip_away === m.away_score
                        const correctWin = hasResult && tip && (
                          (tip.tip_home > tip.tip_away && m.home_score > m.away_score) ||
                          (tip.tip_home < tip.tip_away && m.home_score < m.away_score) ||
                          (tip.tip_home === tip.tip_away && m.home_score === m.away_score)
                        )
                        return (
                          <td key={m.id} style={{ textAlign: 'center', padding: '0.5rem 0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: exact ? 'rgba(251,191,36,0.08)' : correctWin ? 'rgba(74,222,128,0.06)' : 'transparent' }}>
                            {tip ? (
                              <div>
                                <span style={{ fontFamily: 'var(--font-display)', color: exact ? '#fbbf24' : correctWin ? '#4ade80' : 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                                  {tip.tip_home}–{tip.tip_away}
                                </span>
                                {hasResult && <div style={{ fontSize: '0.6rem', marginTop: '0.1rem' }}>{exact ? '🎯' : correctWin ? '✅' : '❌'}</div>}
                                {hasResult && Number(tip.pts_with_multiplier) > 0 && <div style={{ fontSize: '0.6rem', color: '#fbbf24' }}>+{tip.pts_with_multiplier}</div>}
                              </div>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.72rem' }}>–</span>
                            )}
                          </td>
                        )
                      })}
                      <td style={{ textAlign: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--gold)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                        {totalPts}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── GROUP QUALIFIERS TABLE ── */}
      {view === 'qualifiers' && (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {allTournamentTips.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '2rem' }}>
              {t.lang === 'pt' ? 'Nenhum palpite registrado ainda.' : 'No qualifier picks submitted yet.'}
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '0.72rem', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', left: 0, background: '#0a0f0d', minWidth: 110 }}>
                    {t.lang === 'pt' ? 'JOGADOR' : 'PLAYER'}
                  </th>
                  {['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => (
                    <th key={g} style={{ textAlign: 'center', padding: '0.5rem 0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '0.72rem', borderBottom: '1px solid rgba(255,255,255,0.08)', minWidth: 110 }}>
                      Group {g}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((player: any) => {
                  const tt = allTournamentTips.find((tp: any) => tp.user_id === player.id)
                  return (
                    <tr key={player.id} style={{ background: player.isMe ? 'rgba(74,222,128,0.04)' : 'transparent' }}>
                      <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', left: 0, background: player.isMe ? 'rgba(74,222,128,0.06)' : '#0a0f0d' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.08)' }}>
                            {player.avatar ? <img src={player.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>👤</span>}
                          </div>
                          <span style={{ color: player.isMe ? '#4ade80' : '#e8f5ee', fontWeight: player.isMe ? 600 : 400, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                            {player.name}{player.isMe ? ' ✦' : ''}
                          </span>
                        </div>
                      </td>
                      {['a','b','c','d','e','f','g','h','i','j','k','l'].map(g => {
                        const first = tt?.[`tip_group_${g}_1`]
                        const second = tt?.[`tip_group_${g}_2`]
                        return (
                          <td key={g} style={{ textAlign: 'center', padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.72rem' }}>
                            {first || second ? (
                              <div>
                                {first && <div style={{ color: '#fbbf24', whiteSpace: 'nowrap' }}>🥇 <span style={{fontFamily:'"Segoe UI Emoji","Apple Color Emoji",sans-serif'}}>{TEAM_FLAGS[first] || ''}</span>{first}</div>}
                                {second && <div style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>🥈 <span style={{fontFamily:'"Segoe UI Emoji","Apple Color Emoji",sans-serif'}}>{TEAM_FLAGS[second] || ''}</span>{second}</div>}
                              </div>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.15)' }}>–</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── PREDICTIONS TABLE ── */}
      {view === 'predictions' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 500 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '0.72rem', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', left: 0, background: '#0a0f0d', minWidth: 110 }}>
                  {t.lang === 'pt' ? 'JOGADOR' : 'PLAYER'}
                </th>
                {['🏆 Winner', '🥈 2nd', '🥉 3rd', '⚽ Top Scorer'].map(h => (
                  <th key={h} style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '0.72rem', borderBottom: '1px solid rgba(255,255,255,0.08)', minWidth: 100 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((player: any) => {
                const tt = allTournamentTips.find((tp: any) => tp.user_id === player.id)
                return (
                  <tr key={player.id} style={{ background: player.isMe ? 'rgba(74,222,128,0.04)' : 'transparent' }}>
                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', left: 0, background: player.isMe ? 'rgba(74,222,128,0.06)' : '#0a0f0d' }}>
                      <span style={{ color: player.isMe ? '#4ade80' : '#e8f5ee', fontWeight: player.isMe ? 600 : 400, fontSize: '0.78rem' }}>{player.name}</span>
                    </td>
                    {(['tip_winner','tip_second','tip_third','tip_top_scorer'] as const).map(f => (
                      <td key={f} style={{ textAlign: 'center', padding: '0.5rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', color: tt ? '#e8f5ee' : 'rgba(255,255,255,0.2)', fontSize: '0.78rem' }}>
                        {tt?.[f as string] ? <><span style={{fontFamily:'"Segoe UI Emoji","Apple Color Emoji",sans-serif'}}>{TEAM_FLAGS[tt[f as string]] || ''}</span> {tt[f as string]}</> : <span style={{ color: 'rgba(255,255,255,0.15)' }}>–</span>}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


function Avatar({ userId, avatars, size = 32, style = {} }: { userId: string, avatars: Record<string, string>, size?: number, style?: any }) {
  const url = avatars[userId]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {url
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.45 }}>👤</span>
      }
    </div>
  )
}

function MatchTipCard({ match, tip, tournament, userId, onSave }: any) {
  const { t } = useLang()
  const lockMins = tournament?.tip_lock_minutes ?? 120
  const isLocked = match.status !== 'upcoming' || isPast(subMinutes(new Date(match.kickoff_at), lockMins))
  const [home, setHome] = useState(tip?.tip_home ?? '')
  const [away, setAway] = useState(tip?.tip_away ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  async function saveTip() {
    setSaving(true)
    const h = home === '' ? 0 : Number(home)
    const a = away === '' ? 0 : Number(away)
    const payload = { match_id: match.id, user_id: userId, tournament_id: tournament.id, tip_home: h, tip_away: a }
    if (tip?.id) {
      await supabase.from('match_tips').update({ tip_home: h, tip_away: a, updated_at: new Date().toISOString() }).eq('id', tip.id)
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
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{TEAM_FLAGS[match.home_team] || '🏳️'} {match.home_team}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>vs</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{TEAM_FLAGS[match.away_team] || '🏳️'} {match.away_team}</span>
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
              <input type="number" className="score-input" min={0} max={15} value={home}
                onChange={e => { const v = parseInt(e.target.value); setHome(isNaN(v) ? "" : String(Math.min(15, Math.max(0, v)))) }} placeholder="0" />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>–</span>
              <input type="number" className="score-input" min={0} max={15} value={away}
                onChange={e => { const v = parseInt(e.target.value); setAway(isNaN(v) ? "" : String(Math.min(15, Math.max(0, v)))) }} placeholder="0" />
              <button onClick={saveTip} disabled={saving} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
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

function TournamentTipForm({ tournament, userId, existing, onSave }: any) { // tournament has qualifiers_locked and predictions_locked
  const [winner, setWinner] = useState(existing?.tip_winner || '')
  const [second, setSecond] = useState(existing?.tip_second || '')
  const [third, setThird] = useState(existing?.tip_third || '')
  const [topScorer, setTopScorer] = useState(existing?.tip_top_scorer || '')

  // Sync state if existing loads after first render
  useEffect(() => {
    if (existing) {
      setWinner(existing.tip_winner || '')
      setSecond(existing.tip_second || '')
      setThird(existing.tip_third || '')
      setTopScorer(existing.tip_top_scorer || '')
    }
  }, [existing?.id, existing?.updated_at])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const isLocked = tournament?.predictions_locked || false
  const supabase = createClient()

  async function save() {
    setSaving(true)
    const payload = { tournament_id: tournament.id, user_id: userId, tip_winner: winner, tip_second: second, tip_third: third, tip_top_scorer: topScorer, updated_at: new Date().toISOString() }
    if (existing?.id) await supabase.from('tournament_tips').update(payload).eq('id', existing.id)
    else await supabase.from('tournament_tips').insert(payload)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
    setSaving(false); onSave()
  }

  const teamFields = [
    { label: 'World Cup Winner', key: 'winner', val: winner, set: setWinner, pts: tournament.pts_tournament_winner },
    { label: '2nd Place (Runner-up)', key: 'second', val: second, set: setSecond, pts: tournament.pts_second_place },
    { label: '3rd Place', key: 'third', val: third, set: setThird, pts: tournament.pts_third_place },
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
        {teamFields.map(f => (
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
              <select className="input" style={{ background: "#1a1a2e", color: "#fff" }} value={f.val} onChange={e => f.set(e.target.value)}>
                <option value="">— Select a team —</option>
                {WC2026_TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
            )}
            {existing && existing[`pts_${f.key}`] > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '0.25rem' }}>✔ Correct! +{existing[`pts_${f.key}`]} pts</div>
            )}
          </div>
        ))}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
            <label className="label">Top Goal Scorer</label>
            <span className="badge badge-gold">{tournament.pts_top_scorer} pts</span>
          </div>
          {isLocked ? (
            <div style={{ padding: '0.65rem 0.9rem', background: 'rgba(255,255,255,0.04)', borderRadius: 10, fontSize: '0.9rem', color: topScorer ? '#e8f5ee' : 'rgba(255,255,255,0.25)' }}>
              {topScorer || 'Not submitted'}
            </div>
          ) : (
            <>
              <select
                className="input"
                style={{ background: '#1a1a2e', color: '#fff' }}
                value={TOP_SCORERS.includes(topScorer) ? topScorer : topScorer ? '__other__' : ''}
                onChange={e => { if (e.target.value === '__other__') setTopScorer(''); else setTopScorer(e.target.value) }}
              >
                <option value="">— Select a player —</option>
                {TOP_SCORERS.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="__other__">✏️ Other player...</option>
              </select>
              {(!TOP_SCORERS.includes(topScorer) && topScorer !== '') || topScorer === '' && false ? null : null}
              {topScorer === '' || TOP_SCORERS.includes(topScorer) ? null : (
                <input className="input" type="text" value={topScorer} onChange={e => setTopScorer(e.target.value)}
                  placeholder="Type player name..." style={{ marginTop: '0.4rem' }} />
              )}
            </>
          )}
          {existing?.pts_top_scorer > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '0.25rem' }}>✔ Correct! +{existing.pts_top_scorer} pts</div>
          )}
        </div>
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