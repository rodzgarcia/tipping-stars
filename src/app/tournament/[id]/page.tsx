'use client'
import { exportLeaderboardPDF, exportRulesPDF } from './pdfExport'

import React, { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Star, Trophy, ChevronLeft, Lock, Clock } from 'lucide-react'
import { useLang, LangSwitcher } from '../../LanguageContext'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import {
  TEAM_FLAGS, POSITIONS, POSITION_NAMES_EN, POSITION_NAMES_PT, POSITION_NAMES, POSITION_EMOJI,
  TOP_SCORERS, WC2026_TEAMS, formatLocalTime,
} from '@/lib/constants'
import AchievementBadges, { calcAchievements } from './components/AchievementBadges'
import ReminderBanner from './components/ReminderBanner'
import CountdownBar from './components/CountdownBar'
import HeadToHead from './components/HeadToHead'
import ShareCard from './components/ShareCard'
import TournamentProgress from './components/TournamentProgress'
import WinnerPredictionWall from './components/WinnerPredictionWall'
import FlagImg from './components/FlagImg'
import StatsTab from './components/StatsTab'
import HelpChat from './components/HelpChat'
import GroupQualifierTips from './components/GroupQualifierTips'


type Tab = 'tips' | 'leaderboard' | 'predictions' | 'qualifiers' | 'rules' | 'tips_reveal' | 'stats'
type SortKey = 'total_points' | 'exact_scores' | 'correct_winners' | 'correct_goal_diff'
export default function TournamentPage() {
  const { t } = useLang()
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string
  const [tab, setTab] = useState<Tab>('leaderboard')
  const [showWelcome, setShowWelcome] = useState(false)
  const [myProfile, setMyProfile] = useState<any>(null)
  const [tipsView, setTipsView] = useState<'open' | 'locked'>('open')
  const [lbSubTab, setLbSubTab] = useState<'cards'|'h2h'|'share'>('cards')
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

  // Auto-refresh tournament data when admin updates settings (prize splits etc)
  useEffect(() => {
    if (!tournamentId) return
    const ch = supabase
      .channel('tournament_update_' + tournamentId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: 'id=eq.' + tournamentId },
        ({ new: updated }) => { if (updated) setTournament(updated) })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tournamentId])

  // Auto-refresh matches when admin locks/unlocks a match
  useEffect(() => {
    if (!tournamentId) return
    const channel = supabase
      .channel('matches_lock_' + tournamentId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: 'tournament_id=eq.' + tournamentId,
      }, () => {
        // Reload just the matches
        supabase.from('matches').select('*').eq('tournament_id', tournamentId).order('kickoff_at')
          .then(({ data }) => { if (data) setMatches(data) })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tournamentId])

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

    // Welcome popup — show once when jersey_team is assigned
    const myProf = profRes.data
    if (myProf?.jersey_team) {
      setMyProfile(myProf)
      const key = `welcome_seen_${myProf.id}_${myProf.jersey_team}`
      if (!localStorage.getItem(key)) {
        setShowWelcome(true)
      }
    }

    setLoading(false)
  }

  if (loading) return <LoadingScreen />
  if (membership?.status !== 'approved') return <NotApproved status={membership?.status} />

  const roundOrder = ['group','r32','r16','qf','sf','third_place','final']
  const roundLabel: Record<string, string> = {
    group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16',
    qf: 'Quarter-Finals', sf: 'Semi-Finals', third_place: t.lang === 'pt' ? '3º Lugar' : '3rd Place', final: 'Final'
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
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tournament.name}</div>
            <a href="/global" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 6, padding: '0.15rem 0.5rem', textDecoration: 'none', background: 'rgba(96,165,250,0.06)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              🌍 {t.lang === 'pt' ? 'Global' : 'Global'}
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <Link href="/standings" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', whiteSpace: 'nowrap' }}>{t.lang === 'pt' ? 'Classificação' : 'Standings'}</Link>
            <Link href="/profile" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>👤</Link>
            <LangSwitcher />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Prize Pool Banner */}
        {tournament.entry_fee > 0 && (
          <PrizeBanner tournament={tournament} approvedCount={approvedCount} leaderboard={leaderboard} t={t} />
        )}

        <TournamentProgress matches={matches} t={t} />
        <CountdownBar matches={matches} myTips={myTips} tournament={tournament} t={t} />

        {/* Tabs */}
        <div className="tab-nav" style={{ marginBottom: '1.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', display: 'flex', flexWrap: 'nowrap' }}>
          <button data-tab="tips" className={`tab-btn ${tab === 'tips' ? 'active' : ''}`} onClick={() => setTab('tips')} style={{ flexShrink: 0, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{t.lang === 'pt' ? '⚽ Palpites' : '⚽ Tips'}</button>
          <button className={`tab-btn ${tab === 'qualifiers' ? 'active' : ''}`} onClick={() => setTab('qualifiers')} style={{ flexShrink: 0, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{t.lang === 'pt' ? '🗂️ Grupos' : '🗂️ Groups'}</button>
          <button className={`tab-btn ${tab === 'predictions' ? 'active' : ''}`} onClick={() => setTab('predictions')} style={{ flexShrink: 0, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{t.lang === 'pt' ? '🏆 Previsões' : '🏆 Predict'}</button>
          <button className={`tab-btn ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')} style={{ flexShrink: 0, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{t.lang === 'pt' ? '📊 Ranking' : '📊 Board'}</button>
          <button className={`tab-btn ${tab === 'tips_reveal' ? 'active' : ''}`} onClick={() => setTab('tips_reveal')} style={{ flexShrink: 0, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{t.lang === 'pt' ? '👁 Todos Palpites' : '👁 All Tips'}</button>
          <button className={`tab-btn ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')} style={{ flexShrink: 0, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{t.lang === 'pt' ? '📈 Stats' : '📈 Stats'}</button>
          <button className={`tab-btn ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')} style={{ flexShrink: 0, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{t.lang === 'pt' ? '📋 Regras' : '📋 Rules'}</button>
        </div>

        <ReminderBanner matches={matches} myTips={myTips} tournament={tournament} t={t} />

        {/* Match Tips */}
        {tab === 'tips' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
            {(() => {
              const lockMins = tournament?.tip_lock_minutes ?? 120
              const isMatchLocked = (m: any) => m.tip_lock_override || m.status !== 'upcoming' || new Date() >= new Date(new Date(m.kickoff_at).getTime() - lockMins * 60 * 1000)
              const openMatches = matches.filter((m: any) => !isMatchLocked(m))
              const lockedMatches = matches.filter((m: any) => isMatchLocked(m))
              return (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {([['open', `${t.openTips} (${openMatches.length})`], ['locked', `${t.lockedTips} (${lockedMatches.length})`]] as const).map(([v, label]) => (
                      <button key={v} onClick={() => setTipsView(v as any)} style={{
                        padding: '0.4rem 1rem', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
                        border: `1px solid ${tipsView === v ? 'var(--green)' : 'rgba(255,255,255,0.15)'}`,
                        background: tipsView === v ? 'rgba(74,222,128,0.1)' : 'transparent',
                        color: tipsView === v ? '#4ade80' : 'rgba(255,255,255,0.5)',
                      }}>{label}</button>
                    ))}
                  </div>
                  {(() => {
                    const viewMatches = tipsView === 'locked' ? lockedMatches : openMatches
                    if (viewMatches.length === 0) return (
                      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                        {tipsView === 'open' ? t.noOpenMatches : t.noLockedMatches}
                      </div>
                    )
                    // Group by date
                    const byDate: Record<string, any[]> = {}
                    viewMatches.forEach((m: any) => {
                      const date = new Date(m.kickoff_at).toLocaleDateString(t.lang === 'pt' ? 'pt-BR' : 'en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                      if (!byDate[date]) byDate[date] = []
                      byDate[date].push(m)
                    })
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {Object.entries(byDate).map(([date, dateMatches]) => (
                          <div key={date}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', letterSpacing: '0.08em', color: 'var(--gold)' }}>
                                {date.toUpperCase()}
                              </div>
                              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>{(dateMatches as any[]).length} matches</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                              {(dateMatches as any[]).map((match: any) => (
                                <MatchTipCard key={match.id} match={match} tip={myTips[match.id]} tournament={tournament} userId={user.id} onSave={loadAll} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </>
              )
            })()}
            {matches.length === 0 && (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                {matches.length === 0 && tournament?.status === 'upcoming'
                  ? (t.lang === 'pt' ? 'O torneio ainda não começou — volte em breve!' : "The tournament hasn't started yet — check back soon!")
                  : (t.lang === 'pt' ? 'Os jogos ainda não foram adicionados. Volte em breve!' : "Matches haven't been added yet. Check back soon!")}
              </div>
            )}
          </div>
        )}

        {tab === 'qualifiers' && (
          <GroupQualifierTips
            tournament={tournament}
            userId={user.id}
            existing={myTournamentTip}
            onSave={loadAll}
            matches={matches}
            t={t}
            allQualifierTips={allTournamentTips}
            profilesMap={profilesMap}
          />
        )}

        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div style={{ paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button onClick={() => exportLeaderboardPDF(leaderboard, profilesMap, tournament, t.lang, allTournamentTips)} className="btn btn-ghost" style={{ fontSize: '0.72rem' }}>
                📄 {t.lang === 'pt' ? 'Exportar PDF' : 'Export PDF'}
              </button>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2rem 2.5rem minmax(120px,1fr) 3.5rem 3.5rem 3.5rem 3.5rem 4.5rem', gap: '0.4rem', padding: '0.6rem 1rem', borderBottom: '1px solid var(--dark-border)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.05em', minWidth: 380 }}>
                  <div></div>
                  <div></div>
                  <div>{t.lang === 'pt' ? 'NOME' : 'NAME'}</div>
                  <div style={{ textAlign: 'center' }} title={t.lang === 'pt' ? 'Vencedor correto' : 'Correct winner'}>✅</div>
                  <div style={{ textAlign: 'center' }} title={t.lang === 'pt' ? 'Saldo de gols correto' : 'Correct goal difference'}>⚖️</div>
                  <div style={{ textAlign: 'center' }} title={t.lang === 'pt' ? 'Placar exato' : 'Exact score'}>🎯</div>
                  <div style={{ textAlign: 'center' }} title={t.lang === 'pt' ? 'Classificados corretos' : 'Correct qualifiers'}>🗂️</div>
                  <div style={{ textAlign: 'right', paddingRight: '0.5rem' }}>PTS</div>
                </div>
                {leaderboard.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', minWidth: 380 }}>{t.lang === 'pt' ? 'Nenhuma pontuação ainda.' : 'No scores yet.'}</div>
                ) : [...leaderboard].sort((a: any, b: any) => {
                    if (b.total_points !== a.total_points) return b.total_points - a.total_points
                    if (b.exact_scores !== a.exact_scores) return b.exact_scores - a.exact_scores
                    return b.correct_goal_diff - a.correct_goal_diff
                  }).map((row: any, i: number) => {
                  const exact = row.exact_scores ?? 0
                  const gd = Math.max(0, (row.correct_goal_diff ?? 0) - exact)
                  const winners = Math.max(0, (row.correct_winners ?? 0) - (row.correct_goal_diff ?? 0))
                  return (
                  <div key={row.user_id} style={{ display: 'grid', gridTemplateColumns: '2rem 2.5rem minmax(120px,1fr) 3.5rem 3.5rem 3.5rem 3.5rem 4.5rem', gap: '0.4rem', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: i < leaderboard.length-1 ? '1px solid var(--dark-border)' : 'none', background: row.user_id === user.id ? 'rgba(34,197,94,0.06)' : undefined, minWidth: 380 }}>
                    <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem', color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b87333' : 'rgba(255,255,255,0.3)' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}
                    </div>
                    <Avatar userId={row.user_id} avatars={avatars} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: row.user_id === user.id ? '#4ade80' : '#e8f5ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {profilesMap[row.user_id]?.nickname || row.display_name}
                        {row.user_id === user.id && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>({t.you})</span>}
                      </div>
                      {profilesMap[row.user_id]?.nickname && (
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row.display_name}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem', color: winners > 0 ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>{winners}</div>
                    <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem', color: gd > 0 ? '#60a5fa' : 'rgba(255,255,255,0.25)' }}>{gd}</div>
                    <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem', color: exact > 0 ? '#fbbf24' : 'rgba(255,255,255,0.25)' }}>{exact}</div>
                    <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>
                      {(() => {
                        const qPts = Number(row.qualifier_points ?? 0)
                        const ptsEach = Number(tournament?.pts_qualify || 20)
                        // Calculate count from points (1 = full, 0.5 = wrong position)
                        if (qPts > 0 && ptsEach > 0) {
                          const count = qPts / ptsEach
                          const display = count % 1 === 0 ? String(count) : count.toFixed(1)
                          return <span style={{ color: '#a78bfa' }}>{display}</span>
                        }
                        // Fall back to calculating from result_groups
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
                        const display = count % 1 === 0 ? String(count) : count.toFixed(1)
                        return <span style={{ color: count > 0 ? '#a78bfa' : 'rgba(255,255,255,0.2)' }}>{display}</span>
                      })()}
                    </div>
                    <div style={{ textAlign: 'right', paddingRight: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: i === 0 ? '#fbbf24' : row.user_id === user.id ? '#4ade80' : '#e8f5ee' }}>
                      {row.total_points}
                    </div>
                  </div>
                )})}
              </div>
            </div>
            <LeaderboardBanter
              leaderboard={leaderboard}
              profilesMap={profilesMap}
              allTips={allTips}
              matches={matches}
              tournament={tournament}
            />
            <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span>🎯 {t.lang === 'pt' ? 'Placar exato' : 'Exact score'}</span>
              <span>⚖️ {t.lang === 'pt' ? 'Saldo de gols' : 'Goal difference'}</span>
              <span>✅ {t.lang === 'pt' ? 'Só vencedor correto (sem saldo ou placar exato)' : 'Winner only (no goal diff or exact score)'}</span>
              <span>🏟️ {t.lang === 'pt' ? 'Times classificados corretos' : 'Qualifier teams correct'} (1 = certo, 0.5 = posição errada)</span>
              <span>{t.lang === 'pt' ? 'Desempate: placar exato → saldo de gols' : 'Tiebreak: exact scores → goal diff'}</span>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* H2H + Share sub-tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', marginBottom: '0.75rem' }}>
                {([['cards',t.lang === 'pt' ? '🃏 Cartões' : '🃏 Cards'],['h2h',t.lang === 'pt' ? '⚔️ Confronto' : '⚔️ Head to Head'],['share',t.lang === 'pt' ? '📤 Compartilhar' : '📤 Share']] as const).map(([v,label]) => (
                  <button key={v} onClick={() => setLbSubTab(v)} style={{
                    padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.74rem', cursor: 'pointer',
                    border: `1px solid ${lbSubTab===v ? '#fbbf24' : 'rgba(255,255,255,0.12)'}`,
                    background: lbSubTab===v ? 'rgba(251,191,36,0.1)' : 'transparent',
                    color: lbSubTab===v ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                  }}>{label}</button>
                ))}
              </div>
              {lbSubTab === 'cards' && <PlayerCards leaderboard={leaderboard} allTips={allTips} avatars={avatars} profilesMap={profilesMap} userId={user.id} t={t} />}
              {lbSubTab === 'h2h' && <HeadToHead leaderboard={leaderboard} allTips={allTips} profilesMap={profilesMap} userId={user.id} matches={matches} />}
              {lbSubTab === 'share' && <ShareCard row={leaderboard.find((r:any) => r.user_id === user.id)} leaderboard={leaderboard} profilesMap={profilesMap} tournament={tournament} />}
              <RoundStandings leaderboard={leaderboard} allTips={allTips} profilesMap={profilesMap} t={t} />
            </div>
            <LeaderboardCharts leaderboard={leaderboard} allTips={allTips} t={t} sortKey={sortKey} setSortKey={setSortKey} profilesMap={profilesMap} userId={user.id} />
          </div>
        )}


        {/* Tips Reveal — visible once a match is locked */}
        {tab === 'tips_reveal' && (
          <TipsReveal matches={matches} allTips={allTips} allTournamentTips={allTournamentTips} leaderboard={leaderboard} avatars={avatars} profilesMap={profilesMap} userId={user.id} tournament={tournament} t={t} />
        )}


        {/* Stats */}
        {tab === 'stats' && (
          <StatsTab
            matches={matches}
            allTips={allTips}
            allTournamentTips={allTournamentTips}
            leaderboard={leaderboard}
            tournament={tournament}
            profilesMap={profilesMap}
            avatars={avatars}
            userId={user.id}
            t={t}
          />
        )}

        {/* Rules */}
        {tab === 'rules' && (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => exportRulesPDF(tournament, t.lang, approvedCount)} className="btn btn-ghost" style={{ fontSize: '0.78rem' }}>
                📄 {t.lang === 'pt' ? 'Exportar Regras PDF' : 'Export Rules PDF'}
              </button>
            </div>
            <TournamentRules tournament={tournament} approvedCount={approvedCount} t={t} />
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


      {showWelcome && myProfile && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }} onClick={() => { setShowWelcome(false); localStorage.setItem(`welcome_seen_${user.id}_${myProfile?.jersey_team}`, '1') }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0d1511', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 20, padding: '2.5rem 2rem', maxWidth: 380, width: '100%',
            textAlign: 'center', position: 'relative',
          }}>
            {/* Flag + jersey */}
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>
              {POSITION_EMOJI[myProfile.tip_position] || '⚽'}
            </div>
            {(() => {
              const code = TEAM_FLAGS[myProfile.jersey_team]
              return code ? (
                <img
                  src={`https://flagcdn.com/w80/${code}.png`}
                  alt={myProfile.jersey_team}
                  style={{ width: 60, height: 45, borderRadius: 6, objectFit: 'cover', margin: '0 auto 0.75rem', display: 'block', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
                />
              ) : null
            })()}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
              YOUR TIPPING IDENTITY
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '0.05em', marginBottom: '0.25rem', color: '#fbbf24' }}>
              {(t.lang === 'pt' ? POSITION_NAMES_PT : POSITION_NAMES_EN)[myProfile.tip_position] || myProfile.tip_position}
            </h2>
            <div style={{ fontSize: '1.1rem', color: '#e8f5ee', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span>from</span>
              <strong style={{ color: '#4ade80' }}>{myProfile.jersey_team}</strong>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', lineHeight: 1.6, fontStyle: 'italic' }}>
              {(() => {
                const pos = myProfile.tip_position
                const team = myProfile.jersey_team
                if (pos === 'GK') return `The last line of defence. ${team} is counting on you to save the day — and tip some clean sheets.`
                if (pos === 'CB') return `Solid as a rock. ${team} built their defence around you. Now build your leaderboard position.`
                if (['LB','RB'].includes(pos)) return `Always overlapping, always active. A ${team} full-back who never stops — just like your tipping.`
                if (pos === 'CDM') return `The destroyer. ${team}'s engine room. You break up play and break opponents' hearts.`
                if (['CM','CAM'].includes(pos)) return `The maestro. ${team} runs through you. So does the tipping competition.`
                if (['LW','RW'].includes(pos)) return `Pace, flair, and unpredictability — just like your tips. ${team}'s flank is yours.`
                if (['ST','CF','SS'].includes(pos)) return `Goals. That's all that matters. ${team} signed you to score — now score big on the leaderboard.`
                return `Welcome to the ${team} squad. Time to show what you've got.`
              })()}
            </div>
            <button
              onClick={() => { setShowWelcome(false); localStorage.setItem(`welcome_seen_${user.id}_${myProfile?.jersey_team}`, '1') }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
            >
              Let's go! 🚀
            </button>
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.75rem' }}>
              🔒 Your team and position are permanently assigned and cannot be changed.
            </p>
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.15)', marginTop: '0.25rem' }}>
              Tap anywhere to close
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}







function LeaderboardBanter({ leaderboard, profilesMap, allTips, matches, tournament }: any) {
  const { t } = useLang()
  const [banter, setBanter] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const fetchedRef = useRef(false)
  const finishedCount = matches.filter((m: any) => m.status === 'completed').length

  useEffect(() => {
    if (leaderboard.length === 0) return
    if (fetchedRef.current) return
    fetchedRef.current = true
    const timer = setTimeout(generateBanter, 3000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderboard.length, finishedCount])


  async function generateBanter() {
    if (loading) return
    setLoading(true)

    // Build rich context
    const sorted = [...leaderboard].sort((a: any, b: any) => b.total_points - a.total_points)
    const leader = sorted[0]
    const last = sorted[sorted.length - 1]

    const players = sorted.map((r: any, i: number) => {
      const prof = profilesMap?.[r.user_id]
      const name = prof?.nickname || prof?.display_name || r.display_name
      const realName = prof?.display_name || r.display_name
      const jersey = prof?.jersey_team || 'unknown team'
      const position = prof?.tip_position || 'unknown position'
      const acc = r.tips_submitted > 0 ? Math.round((r.correct_winners / r.tips_submitted) * 100) : 0
      return `${i+1}. ${name}${name !== realName ? ` (${realName})` : ''} - ${r.total_points}pts, ${r.exact_scores} exact scores, ${r.correct_winners} correct winners, jersey: ${jersey}, position: ${position}, accuracy: ${acc}%`
    }).join('\n')

    const finishedMatches = matches.filter((m: any) => m.status === 'completed' && m.home_score !== null)
    const matchContext = finishedMatches.slice(-5).map((m: any) => {
      const tips = allTips.filter((tp: any) => tp.match_id === m.id)
      const exact = tips.filter((tp: any) => tp.tip_home === m.home_score && tp.tip_away === m.away_score)
        .map((tp: any) => profilesMap?.[tp.user_id]?.nickname || profilesMap?.[tp.user_id]?.display_name)
      const wrong = tips.filter((tp: any) => {
        const tipOut = tp.tip_home > tp.tip_away ? 'h' : tp.tip_home < tp.tip_away ? 'a' : 'd'
        const actOut = m.home_score > m.away_score ? 'h' : m.home_score < m.away_score ? 'a' : 'd'
        return tipOut !== actOut
      }).map((tp: any) => ({
        name: profilesMap?.[tp.user_id]?.nickname || profilesMap?.[tp.user_id]?.display_name || 'Someone',
        tip: `${tp.tip_home}-${tp.tip_away}`
      }))
      return `${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}: exact: [${exact.join(', ')}], wrong: [${wrong.map((w: any) => `${w.name} tipped ${w.tip}`).join(', ')}]`
    }).join('\n')

    try {
      console.log('Fetching /api/banter...')
      const resp = await fetch('/api/banter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players, matchContext, seed: Math.floor(Math.random() * 10000), lang: t.lang })
      })
      console.log('Response status:', resp.status)
      const data = await resp.json()
      console.log('Response data:', data)
      const result = Array.isArray(data.banter) && data.banter.length > 0 ? data.banter : []
      setBanter(result)
    } catch (e) {
      console.error('Banter fetch error:', e)
      setError(true)
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ margin: '0.75rem 0', padding: '0.5rem 1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
      🎤 Loading banter...
    </div>
  )

  const EMOJIS = ['🔥', '💀', '😂']

  if (banter.length === 0) return null

  return (
    <div style={{ margin: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {banter.map((line, i) => (
        <div key={i} style={{
          padding: '0.6rem 1rem',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          fontSize: '0.82rem',
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.4,
          fontStyle: 'italic',
        }}>
          {EMOJIS[i]} {line}
        </div>
      ))}
      <button onClick={() => { setBanter([]); setTimeout(generateBanter, 50) }}
        style={{ alignSelf: 'flex-end', background: 'none', border: 'none', fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '0.1rem 0.25rem' }}>
        🔄 refresh
      </button>
    </div>
  )
}


function BanterGenerator({ matchStats, leaderboard, profilesMap, tournament, allTips }: any) {
  const { t } = useLang()
  const [banter, setBanter] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  async function generateBanter() {
    setLoading(true)

    // Build context for the AI
    const finishedWithTips = matchStats.filter((ms: any) => ms.hasResult && ms.tips.length > 0)
    if (finishedWithTips.length === 0) { setLoading(false); return }

    const context = finishedWithTips.slice(0, 8).map((ms: any) => {
      const { match: m, tips, homePct, awayPct, drawPct } = ms
      const result = `${m.home_score}–${m.away_score}`
      const tippers = tips.map((tp: any) => ({
        name: profilesMap?.[tp.user_id]?.nickname || profilesMap?.[tp.user_id]?.display_name || 'Someone',
        tip: `${tp.tip_home}–${tp.tip_away}`,
        correct: tp.tip_home === m.home_score && tp.tip_away === m.away_score,
        correctWinner: (tp.tip_home > tp.tip_away && m.home_score > m.away_score) ||
                       (tp.tip_home < tp.tip_away && m.home_score < m.away_score) ||
                       (tp.tip_home === tp.tip_away && m.home_score === m.away_score),
      }))
      return `${m.home_team} vs ${m.away_team}: result ${result}. Tippers: ${tippers.map((t: any) => `${t.name} tipped ${t.tip}${t.correct ? ' (exact!)' : t.correctWinner ? ' (got winner)' : ' (wrong)'}`).join(', ')}. Consensus: ${homePct}% backed ${m.home_team}, ${drawPct}% draw, ${awayPct}% ${m.away_team}.`
    }).join('\n')

    const playerNames = Array.from(new Set(leaderboard.map((r: any) => profilesMap?.[r.user_id]?.nickname || r.display_name))).join(', ')

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a hilarious football/soccer banter bot for a World Cup tipping competition. Generate 6 short, funny banter comments (1-2 sentences each) about these results and how people tipped. Be specific about names and scores. Mix: roasting wrong tippers, praising brave correct picks, teasing the majority who got it wrong, poking fun at anyone who always tips the favourite. Be playful, not mean. Use football culture references. Players: ${playerNames}.

Match data:
${context}

Return ONLY a JSON array of 6 strings, no other text. Example format: ["comment 1", "comment 2", ...]`
          }]
        })
      })
      const data = await response.json()
      const text = data.content?.[0]?.text || '[]'
      const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim()
      const parsed = JSON.parse(clean)
      setBanter(Array.isArray(parsed) ? parsed : [])
      setGenerated(true)
    } catch (e) {
      setBanter(['Could not generate banter — the ref must have disallowed it.'])
      setGenerated(true)
    }
    setLoading(false)
  }

  const finishedCount = matchStats.filter((ms: any) => ms.hasResult).length
  if (finishedCount === 0) return null

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
        🎤 AUTO BANTER
      </h3>
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginBottom: '1rem' }}>
        AI-generated trash talk based on how everyone tipped
      </p>
      {!generated ? (
        <button
          onClick={generateBanter}
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.5rem' }}
        >
          {loading ? (t.lang === 'pt' ? '⏳ Gerando zoação...' : '⏳ Generating banter...') : (t.lang === 'pt' ? '🎤 Gerar Zoação' : '🎤 Generate Banter')}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {banter.map((line, i) => (
            <div key={i} style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              fontSize: '0.88rem',
              lineHeight: 1.5,
              color: '#e8f5ee',
            }}>
              {['🔥','😂','💀','🧢','👀','🏆'][i % 6]} {line}
            </div>
          ))}
          <button
            onClick={() => { setGenerated(false); setLoading(false) }}
            className="btn btn-ghost"
            style={{ fontSize: '0.78rem', marginTop: '0.25rem', alignSelf: 'flex-start' }}
          >
            🔄 Generate new banter
          </button>
        </div>
      )}
    </div>
  )
}


function TournamentRules({ tournament: tn, approvedCount, t }: any) {
  const ispt = t.lang === 'pt'
  const pool = (tn.entry_fee || 0) * approvedCount
  const prize1 = Math.floor(pool * (tn.prize_split_1st != null ? tn.prize_split_1st : 60) / 100)
  const prize2 = Math.floor(pool * (tn.prize_split_2nd != null ? tn.prize_split_2nd : 30) / 100)
  const prize3 = Math.floor(pool * (tn.prize_split_3rd != null ? tn.prize_split_3rd : 10) / 100)
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
          {ispt
            ? `Para cada jogo, você aposta o placar final aos 90 minutos. Os pontos são cumulativos — cada nível de acerto adiciona pontos ao anterior. As dicas bloqueiam ${tn.tip_lock_minutes || 120} minutos antes do apito inicial.`
            : `For each match, tip the final score at 90 minutes. Points are cumulative — each level of accuracy adds on top of the previous. Tips lock ${tn.tip_lock_minutes || 120} minutes before kickoff.`}
        </p>
      </Section>

      <Section emoji="🎯" title={ispt ? 'PONTUAÇÃO' : 'POINTS SYSTEM'}>
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.75rem' }}>
          {ispt ? 'Os pontos se acumulam — acertar o placar exato também conta como vencedor correto e saldo de gols correto:' : 'Points stack on top of each other — getting the exact score also earns you the winner and goal difference points:'}
        </p>
        <Row label={ispt ? '✅ Vencedor correto' : '✅ Correct winner'} value={`${pWinner} pts`} highlight="#4ade80"
          example={ispt ? `Ex: Você tipou Brasil para vencer → Brasil vence por qualquer placar → +${pWinner} pts` : `e.g. You tip Brazil to win → Brazil wins by any scoreline → +${pWinner} pts`} />
        <Row label={ispt ? '⚖️ Saldo de gols correto (além do vencedor)' : '⚖️ Correct goal difference (on top of winner)'} value={`+${pDiff} pts`} highlight="#60a5fa"
          example={ispt ? `Ex: Você tipou 2–0 → Resultado foi 3–1 (mesma diferença de 2) → +${pWinner} + ${pDiff} = ${pWinner + pDiff} pts total` : `e.g. You tip 2–0 → Result is 3–1 (same diff of 2) → +${pWinner} + ${pDiff} = ${pWinner + pDiff} pts total`} />
        <Row label={ispt ? '🎯 Placar exato (além do vencedor + saldo)' : '🎯 Exact score (on top of winner + goal diff)'} value={`+${pExact} pts`} highlight="#fbbf24"
          example={ispt ? `Ex: Você tipou 1–0 → Resultado: 1–0 → +${pWinner} + ${pDiff} + ${pExact} = ${pWinner + pDiff + pExact} pts total` : `e.g. You tip 1–0 → Result: 1–0 → +${pWinner} + ${pDiff} + ${pExact} = ${pWinner + pDiff + pExact} pts total`} />
        {pBonus > 0 && (
          <Row label={ispt ? `🚀 Bônus goleada (${tn.big_margin_threshold}+ gols de diferença — mesmo sem placar exato)` : `🚀 Big margin bonus (${tn.big_margin_threshold}+ goal difference — exact score NOT required)`} value={`+${pBonus} pts`} highlight="#f87171"
            example={ispt ? `Ex: Você tipou 5–0 → Resultado: 6–0 → diferença de 5+ gols na dica e no resultado → bônus! +${pBonus} pts. Não precisa acertar o placar exato, só a diferença de gols acima de ${tn.big_margin_threshold}.` : `e.g. You tip 5–0 → Result is 6–0 → both tip and result have ${tn.big_margin_threshold}+ goal diff, same winner → bonus! +${pBonus} pts. Exact score is NOT needed, just the big margin in the right direction.`} />
        )}
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(96,165,250,0.05)', borderRadius: 8, border: '1px solid rgba(96,165,250,0.15)' }}>
          <div style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 600, marginBottom: '0.4rem' }}>
            🤝 {ispt ? 'EMPATES' : t.lang === 'pt' ? 'EMPATES' : 'DRAWS'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            {ispt
              ? `Empate é um resultado válido. Se você tipar empate e o jogo terminar empatado, você ganha o vencedor correto (${pWinner} pts). Se o saldo de gols for 0 (qualquer empate = diferença zero), você também ganha +${pDiff} pts. E se o placar for exatamente o que você tipou, ganha mais +${pExact} pts.`
              : `A draw is a valid outcome. If you tip a draw and the match ends level, you earn the correct winner (${pWinner} pts). Since all draws have a goal difference of 0, you also earn +${pDiff} pts. And if the exact scoreline matches your tip, you earn the extra +${pExact} pts too.`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.4rem', fontStyle: 'italic' }}>
            {ispt
              ? `Ex: Você tipou 1–1 → Resultado: 2–2 → +${pWinner} + ${pDiff} = ${pWinner + pDiff} pts (vencedor + saldo, mas não o placar exato)`
              : `e.g. You tip 1–1 → Result: 2–2 → +${pWinner} + ${pDiff} = ${pWinner + pDiff} pts (winner + goal diff, but not exact score)`}
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(251,191,36,0.04)', borderRadius: 8, border: '1px solid rgba(251,191,36,0.12)' }}>
          <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600, marginBottom: '0.4rem' }}>
            ⏱️ {ispt ? 'PRORROGAÇÃO E PÊNALTIS (FASES ELIMINATÓRIAS)' : 'EXTRA TIME & PENALTIES (KNOCKOUT ROUNDS)'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            {ispt
              ? 'O placar considerado é sempre o resultado aos 90 minutos (tempo normal). Prorrogação e pênaltis não afetam o placar para fins de pontuação. Para o vencedor correto nas fases eliminatórias, conta o time que efetivamente avança — seja por gols no tempo normal, prorrogação ou pênaltis.'
              : 'The score used for points is always the 90-minute result (regular time). Extra time and penalties do not affect the score for tipping purposes. For the correct winner point in knockout rounds, the team that actually advances counts — whether through regular time, extra time, or penalties.'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.4rem', fontStyle: 'italic' }}>
            {ispt
              ? 'Ex: Brasil 1–1 França após 90 min → pênaltis → Brasil avança. Placar para pontuação = 1–1. Vencedor correto = Brasil.'
              : 'e.g. Brazil 1–1 France after 90 min → penalties → Brazil advances. Score for tips = 1–1. Correct winner = Brazil.'}
          </div>
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
          {ispt ? "• Dicas de partidas: bloqueiam 2 horas antes do apito inicial.\n• Classificados por grupo: bloqueiam antes do primeiro jogo do torneio.\n• Previsões do torneio (campeão, artilheiro): bloqueiam antes do primeiro jogo do torneio." : "• Match tips lock 2 hours before each match kicks off.\n• Group qualifier picks lock before the first match of the tournament.\n• Tournament predictions (winner, top scorer) lock before the first match of the tournament."}
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
          <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', background: 'rgba(248,113,113,0.07)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
            <span style={{ color: '#f87171', fontWeight: 600 }}>⚠️ {ispt ? 'Importante:' : 'Important:'}</span>{' '}
            {ispt
              ? `Apenas os classificados em 1º e 2º de cada grupo contam para pontuação. Se você apostou em um time para 2º lugar e ele avançou como um dos melhores 3ºs colocados, ainda assim recebe 0 pontos — somente 1º e 2º posições do grupo valem.`
              : `Only teams that finish 1st or 2nd in their group count for points. If you tipped a team to finish 2nd and they actually advance as one of the best 3rd-placed teams, you still get 0 points — only 1st and 2nd place in the group count.`}
          </div>
        </Section>
      )}

      {pool > 0 && (
        <Section emoji="💰" title={ispt ? 'PREMIAÇÃO' : 'PRIZE POOL'}>
          <Row label={ispt ? 'Premiação total' : 'Total prize pool'} value={`${cur} $${pool.toLocaleString()}`} highlight="#fbbf24" />
          <Row label={`🥇 ${ispt ? '1º lugar' : '1st place'} (${tn.prize_split_1st != null ? tn.prize_split_1st : 60}%)`} value={`${cur} $${prize1.toLocaleString()}`} highlight="#fbbf24" />
          <Row label={`🥈 ${ispt ? '2º lugar' : '2nd place'} (${tn.prize_split_2nd != null ? tn.prize_split_2nd : 30}%)`} value={`${cur} $${prize2.toLocaleString()}`} highlight="#9ca3af" />
          <Row label={`🥉 ${ispt ? '3º lugar' : '3rd place'} (${tn.prize_split_3rd != null ? tn.prize_split_3rd : 10}%)`} value={`${cur} $${prize3.toLocaleString()}`} highlight="#b87333" />
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
  const split1 = tournament.prize_split_1st != null ? Number(tournament.prize_split_1st) : 60
  const split2 = tournament.prize_split_2nd != null ? Number(tournament.prize_split_2nd) : 30
  const split3 = tournament.prize_split_3rd != null ? Number(tournament.prize_split_3rd) : 10
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

  // If no matches today, find the latest day that had completed matches
  let latestDayPtsMap: Record<string, number> = {}
  let latestDayLabel = ''
  if (!hasToday) {
    const completedTips = allTips.filter((tip: any) => Number(tip.pts_with_multiplier) > 0 && tip.match?.kickoff_at && tip.match?.status === 'completed')
    if (completedTips.length > 0) {
      // Find the most recent day with results
      const days = completedTips.map((tip: any) => {
        const d = new Date(tip.match.kickoff_at)
        d.setHours(0,0,0,0)
        return d.getTime()
      })
      const latestDay = new Date(Math.max(...days))
      latestDay.setHours(0,0,0,0)
      const nextDay = new Date(latestDay.getTime() + 86400000)
      completedTips.forEach((tip: any) => {
        const kickoff = new Date(tip.match.kickoff_at)
        if (kickoff >= latestDay && kickoff < nextDay) {
          latestDayPtsMap[tip.user_id] = (latestDayPtsMap[tip.user_id] || 0) + Number(tip.pts_with_multiplier)
        }
      })
      latestDayLabel = latestDay.toLocaleDateString(t.lang === 'pt' ? 'pt-BR' : 'en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
    }
  }

  const hasLatestDay = Object.keys(latestDayPtsMap).length > 0
  const ptsMap = hasToday ? todayPtsMap : hasLatestDay ? latestDayPtsMap : leaderboard.reduce((acc: any, r: any) => {
    acc[r.user_id] = Number(r.total_points); return acc
  }, {} as Record<string, number>)

  const sorted = [...leaderboard].sort((a: any, b: any) => (ptsMap[b.user_id] || 0) - (ptsMap[a.user_id] || 0))
  const top3 = sorted.slice(0, 3)
  const bottom3 = [...sorted].reverse().slice(0, 3)

  const heroEmojis = ['🥇', '🥈', '🥉']
  const heroTitles = t.lang === 'pt' ? ['O Profeta', 'O Oráculo', 'O Visionário'] : ['The Prophet', 'The Oracle', 'The Visionary']
  const zeroTitles = t.lang === 'pt' ? ['O Desastre', 'O Confuso', 'O Otimista'] : ['The Disaster', 'The Confused', 'The Optimist']
  const heroColors = ['#fbbf24', '#9ca3af', '#b87333']
  const zeroEmojis = ['💀', '🤡', '😵']

  const Label = ({ children, color }: any) => (
    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color, marginBottom: '0.4rem' }}>{children}</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 220, flex: 1 }}>
      {/* Round Heroes */}
      <div className="card" style={{ padding: '1rem 1.25rem', border: '1px solid rgba(251,191,36,0.15)' }}>
        <Label color="#fbbf24">{hasToday ? (t.lang === 'pt' ? '⭐ BOLA CHEIA DO DIA' : '⭐ HEROES OF THE DAY') : hasLatestDay ? (t.lang === 'pt' ? `⭐ BOLA CHEIA — ${latestDayLabel}` : `⭐ TOP — ${latestDayLabel}`) : (t.lang === 'pt' ? '⭐ MELHORES PALPITEIROS' : '⭐ TOP TIPPERS')}</Label>
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
          <Label color="#f87171">{hasToday ? (t.lang === 'pt' ? '💀 DESASTRES DO DIA' : '💀 DISASTERS OF THE DAY') : hasLatestDay ? (t.lang === 'pt' ? `💀 DESASTRES — ${latestDayLabel}` : `💀 BOTTOM — ${latestDayLabel}`) : (t.lang === 'pt' ? '💀 PIORES PALPITEIROS' : '💀 BOTTOM TIPPERS')}</Label>
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


const FLAGS: Record<string, string> = {
  Brazil:'🇧🇷',Argentina:'🇦🇷',France:'🇫🇷',England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',Germany:'🇩🇪',Spain:'🇪🇸',
  Portugal:'🇵🇹',Netherlands:'🇳🇱',USA:'🇺🇸',Mexico:'🇲🇽',Australia:'🇦🇺',Japan:'🇯🇵',
  Morocco:'🇲🇦',Senegal:'🇸🇳',Colombia:'🇨🇴',Croatia:'🇭🇷'
}

function calcRating(row: any, leaderboard?: any[]): number {
  const exact = Number(row.exact_scores) || 0
  const winners = Number(row.correct_winners) || 0
  const tips = Number(row.tips_submitted) || 0

  if (tips === 0) return 60 // no tips yet — base card

  // Accuracy rates (0–1)
  const winnerRate = winners / tips        // % of matches where picked correct winner
  const exactRate = exact / tips           // % of matches where picked exact score

  // Base: 60
  // Winner accuracy → up to +20 (linear: 0%=0, 100%=20)
  const winnerPts = winnerRate * 20

  // Exact score rate → up to +12 (harder, so rewarded more per %)
  const exactPts = exactRate * 12

  // Qualifier bonus → up to +4
  const qualPts = Math.min(4, (Number(row.qualifier_points) || 0) / 5)

  // Leaderboard position bonus → up to +3 (leader gets 3, last gets 0)
  let rankBonus = 0
  if (leaderboard && leaderboard.length > 1) {
    const sorted = [...leaderboard].sort((a: any, b: any) => b.total_points - a.total_points)
    const rank = sorted.findIndex((r: any) => r.user_id === row.user_id)
    rankBonus = rank === 0 ? 3 : rank === 1 ? 2 : rank === 2 ? 1 : 0
  }

  const raw = 60 + winnerPts + exactPts + qualPts + rankBonus
  return Math.min(99, Math.max(35, Math.round(raw)))
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

function FIFACard({ row, allTips, avatarUrl, profile, variant, label, t, leaderboard }: any) {
  const team = profile?.jersey_team || 'default'
  const position = profile?.tip_position || 'CAM'
  const colors = JERSEY_COLORS[team] || JERSEY_COLORS.default
  const flagUrl = FLAG_URLS[team]
  const rating = calcRating(row, leaderboard)
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
              {isGold ? (t.lang === 'pt' ? '⭐ BOLA CHEIA ⭐' : '⭐ TIPPER OF THE DAY ⭐') : (t.lang === 'pt' ? '😩 BOLA MURCHA 😩' : '😩 DEFLATED BALL 😩')}
            </div>
          )}

          {/* Rating + position + flag */}
          <div style={{ padding: isGold || isGrey ? '2px 12px 0' : '7px 12px 0' }}>
            <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 0.88, letterSpacing: -2, color: textColor }}>{rating}</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: subColor, marginTop: 2 }}>{(t?.lang === 'pt' ? POSITION_NAMES_PT : POSITION_NAMES_EN)[position] || position}</div>
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

  // If no today tips, find latest day with results
  const hasTodayCards = Object.keys(todayPtsMap).length > 0
  let latestCardPtsMap: Record<string, number> = {}
  let latestCardLabel = ''
  if (!hasTodayCards) {
    const completedTips = allTips.filter((tip: any) => Number(tip.pts_with_multiplier) > 0 && tip.match?.kickoff_at && tip.match?.status === 'completed')
    if (completedTips.length > 0) {
      const days = completedTips.map((tip: any) => { const d = new Date(tip.match.kickoff_at); d.setHours(0,0,0,0); return d.getTime() })
      const latestDay = new Date(Math.max(...days)); latestDay.setHours(0,0,0,0)
      const nextDay = new Date(latestDay.getTime() + 86400000)
      completedTips.forEach((tip: any) => {
        const kickoff = new Date(tip.match.kickoff_at)
        if (kickoff >= latestDay && kickoff < nextDay) {
          latestCardPtsMap[tip.user_id] = (latestCardPtsMap[tip.user_id] || 0) + Number(tip.pts_with_multiplier)
        }
      })
      latestCardLabel = latestDay.toLocaleDateString(t.lang === 'pt' ? 'pt-BR' : 'en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
    }
  }
  const hasLatestCards = Object.keys(latestCardPtsMap).length > 0
  const ptsMap = hasTodayCards ? todayPtsMap : hasLatestCards ? latestCardPtsMap : leaderboard.reduce((acc: any, r: any) => {
    acc[r.user_id] = Number(r.total_points); return acc
  }, {} as Record<string, number>)

  const sortedByToday = [...leaderboard].sort((a: any, b: any) => (ptsMap[b.user_id] || 0) - (ptsMap[a.user_id] || 0))
  const tipperRow = sortedByToday[0]
  const deflatedRow = sortedByToday[sortedByToday.length - 1]

  const hasResults = leaderboard.some((r: any) => Number(r.total_points) > 0)

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
        ⚽ {hasTodayCards ? (t.lang === 'pt' ? 'CARTÕES DO DIA' : 'CARDS OF THE DAY') : hasLatestCards ? (t.lang === 'pt' ? `CARTÕES — ${latestCardLabel}` : `CARDS — ${latestCardLabel}`) : (t.lang === 'pt' ? 'DESTAQUES DO TORNEIO' : 'TOURNAMENT HIGHLIGHTS')}
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
            leaderboard={leaderboard}
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
            label={hasTodayCards ? (t.lang === 'pt' ? '⭐ BOLA CHEIA DO DIA' : '⭐ TIPPER OF THE DAY') : hasLatestCards ? (t.lang === 'pt' ? `⭐ BOLA CHEIA — ${latestCardLabel}` : `⭐ TOP — ${latestCardLabel}`) : (t.lang === 'pt' ? '⭐ MELHOR PALPITEIRO' : '⭐ TOP TIPPER')}
            leaderboard={leaderboard}
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
            label={hasTodayCards ? (t.lang === 'pt' ? '😩 BOLA MURCHA DO DIA' : '😩 DEFLATED BALL TODAY') : hasLatestCards ? (t.lang === 'pt' ? `😩 BOLA MURCHA — ${latestCardLabel}` : `😩 DEFLATED — ${latestCardLabel}`) : (t.lang === 'pt' ? '😩 BOLA MURCHA' : '😩 LOWEST TIPPER')}
            leaderboard={leaderboard}
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
            { key: 'total_points', label: t.lang === 'pt' ? '🏆 Total de Pontos' : '🏆 Total Points' },
            { key: 'exact_scores', label: t.lang === 'pt' ? '🎯 Pts Placar Exato' : '🎯 Exact Score Pts' },
            { key: 'correct_winners', label: t.lang === 'pt' ? '✅ Pts Vencedor' : '✅ Winner Pts' },
            { key: 'correct_goal_diff', label: t.lang === 'pt' ? '⚖️ Pts Saldo de Gols' : '⚖️ Goal Diff Pts' },
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
            }}>{t.lang === 'pt' ? 'Todos' : 'All'}</button>
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
                  {row.user_id === userId && <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>({t.you})</span>}
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
              <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <Legend wrapperStyle={{ fontSize: '0.7rem', paddingTop: 10 }} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} width={80} />
                <Tooltip
                  contentStyle={{ background: '#0a0f0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }}
                  formatter={(value: any) => [`${value} pts`, sortLabel[sortKey]]}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                {sortKey === 'total_points' ? (
                  <>
                    <Bar dataKey="winner" stackId="a" fill="#4ade80" name={t.lang === 'pt' ? '✅ Vencedor' : '✅ Winner'} />
                    <Bar dataKey="goalDiff" stackId="a" fill="#60a5fa" name={t.lang === 'pt' ? '⚖️ Saldo de Gols' : '⚖️ Goal Diff'} />
                    <Bar dataKey="exact" stackId="a" fill="#fbbf24" name={t.lang === 'pt' ? '🎯 Exato' : '🎯 Exact'} />
                    <Bar dataKey="bonus" stackId="a" fill="#f87171" name={t.lang === 'pt' ? '🚀 Bônus' : '🚀 Bonus'} />
                    <Bar dataKey="qualifier" stackId="a" fill="#a78bfa" name={t.lang === 'pt' ? '🗂️ Classificados' : '🗂️ Qualifiers'} />
                    <Bar dataKey="prediction" stackId="a" fill="#f0abfc" name={t.lang === 'pt' ? '🔮 Previsões' : '🔮 Predictions'} radius={[0,4,4,0]} />
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



function TipsReveal({ matches, allTips, allTournamentTips, leaderboard, avatars, profilesMap, userId, tournament, t }: any) {
  const [view, setView] = useState<'group' | 'knockout' | 'qualifiers' | 'predictions'>('group')
  const roundLabel: Record<string, string> = {
    group: 'Group', r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third_place: '3rd', final: 'Final'
  }

  const lockMins = tournament?.tip_lock_minutes ?? 120
  const isLocked = (m: any) => {
    if (m.status === 'live' || m.status === 'completed') return true
    if (m.tip_lock_override) return true
    const lockTime = new Date(new Date(m.kickoff_at).getTime() - lockMins * 60 * 1000)
    return new Date() >= lockTime
  }

  const lockedMatches = matches.filter((m: any) => isLocked(m))
  const lockedGroup = lockedMatches.filter((m: any) => m.tip_lock_override || !m.round || m.round === 'group')
  const lockedKnockout = lockedMatches.filter((m: any) => m.round && m.round !== 'group' && !m.tip_lock_override)

  const players = leaderboard.map((r: any) => ({
    id: r.user_id,
    name: profilesMap?.[r.user_id]?.nickname || r.display_name,
    isMe: r.user_id === userId,
    avatar: avatars[r.user_id],
  }))

  const groupCount = lockedGroup.length
  const knockoutCount = lockedKnockout.length


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
        {([
          ['group', t.lang === 'pt' ? `⚽ Grupos (${groupCount})` : `⚽ Group Stage (${groupCount})`, `⚽ Grupo (${groupCount})`],
          ['knockout', t.lang === 'pt' ? `⚡ Eliminatórias (${knockoutCount})` : `⚡ Knockout (${knockoutCount})`, `⚡ Eliminatórias (${knockoutCount})`],
          ['qualifiers', '🗂️ Group Qualifiers', '🗂️ Classificados'],
          ['predictions', '🏆 Predictions', '🏆 Previsões'],
        ] as const).map(([v, en, pt]) => (
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

      {/* ── GROUP STAGE MATCH TIPS ── */}
      {(view === 'group') && (
        lockedGroup.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
            <p>{t.lang === 'pt' ? 'Palpites visíveis após o bloqueio das apostas.' : 'Tips visible once tips are locked.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: Math.max(500, lockedGroup.length * 80 + 120) }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', left: 0, background: '#0a0f0d', zIndex: 2, minWidth: 110 }}>
                    {t.lang === 'pt' ? 'JOGADOR' : 'PLAYER'}
                  </th>
                  {lockedGroup.map((m: any) => (
                    <th key={m.id} style={{ textAlign: 'center', padding: '0.4rem 0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.08)', minWidth: 72 }}>
                      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem' }}>{roundLabel[m.round] || m.round}</div>
                      <div style={{ whiteSpace: 'nowrap' }}><><FlagImg team={m.home_team} size={14} />{m.home_team?.split(' ')[0]}</></div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>vs</div>
                      <div style={{ whiteSpace: 'nowrap' }}><><FlagImg team={m.away_team} size={14} />{m.away_team?.split(' ')[0]}</></div>
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
                      {lockedGroup.map((m: any) => {
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

      {/* ── KNOCKOUT MATCH TIPS TABLE ── */}
      {view === 'knockout' && (
        lockedKnockout.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
            <p>{t.lang === 'pt' ? 'Nenhuma partida eliminatória bloqueada ainda.' : 'No locked knockout matches yet.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: Math.max(500, lockedKnockout.length * 80 + 120) }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--dark-border)' }}>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontWeight: 500, minWidth: 160, position: 'sticky', left: 0, background: 'var(--dark-card)' }}>
                    {t.lang === 'pt' ? 'JOGADOR' : 'PLAYER'}
                  </th>
                  {lockedKnockout.map((m: any) => {
                    const hFlag = TEAM_FLAGS[m.home_team] ? `https://flagcdn.com/24x18/${TEAM_FLAGS[m.home_team]}.png` : null
                    const aFlag = TEAM_FLAGS[m.away_team] ? `https://flagcdn.com/24x18/${TEAM_FLAGS[m.away_team]}.png` : null
                    return (
                    <th key={m.id} style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 500, minWidth: 80 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                        {hFlag && <img src={hFlag} style={{ width: 14, height: 10, objectFit: 'cover', borderRadius: 1 }} alt="" />}
                        <span>{m.home_team?.split(' ').slice(-1)[0]}</span>
                        <span style={{ opacity: 0.4 }}>v</span>
                        <span>{m.away_team?.split(' ').slice(-1)[0]}</span>
                        {aFlag && <img src={aFlag} style={{ width: 14, height: 10, objectFit: 'cover', borderRadius: 1 }} alt="" />}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', marginTop: 1 }}>{roundLabel[m.round] || m.round}</div>
                      {m.status === 'completed' && <div style={{ fontSize: '0.65rem', color: '#4ade80' }}>{m.home_score}–{m.away_score}</div>}
                    </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {players.map((player: any) => (
                  <tr key={player.id} style={{ borderBottom: '1px solid var(--dark-border)', background: player.isMe ? 'rgba(34,197,94,0.04)' : undefined }}>
                    <td style={{ padding: '0.6rem 1rem', position: 'sticky', left: 0, background: player.isMe ? 'rgba(34,197,94,0.06)' : 'var(--dark-card)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.08)' }}>
                          {avatars[player.id] ? <img src={avatars[player.id]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>👤</span>}
                        </div>
                        <span style={{ fontWeight: player.isMe ? 600 : 400, color: player.isMe ? '#4ade80' : '#e8f5ee', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{player.name}</span>
                      </div>
                    </td>
                    {lockedKnockout.map((m: any) => {
                      const tip = allTips.find((tp: any) => tp.match_id === m.id && tp.user_id === player.id)
                      const isExact = tip && m.status === 'completed' && tip.tip_home === m.home_score && tip.tip_away === m.away_score
                      const isWinner = tip && m.status === 'completed' && !isExact && Number(tip.pts_winner) > 0
                      return (
                        <td key={m.id} style={{ padding: '0.5rem 0.4rem', textAlign: 'center', background: isExact ? 'rgba(251,191,36,0.08)' : isWinner ? 'rgba(74,222,128,0.06)' : undefined }}>
                          {tip ? (
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: isExact ? '#fbbf24' : isWinner ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
                              {tip.tip_home}–{tip.tip_away}
                            </span>
                          ) : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem' }}>–</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── GROUP QUALIFIERS TABLE ── */}
      {view === 'qualifiers' && !tournament?.qualifiers_locked && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔒</div>
          <p>{t.lang === 'pt' ? 'Os palpites de classificados ficam visíveis após o bloqueio pelo admin.' : 'Group qualifier picks are revealed once the admin locks them.'}</p>
        </div>
      )}
      {view === 'qualifiers' && tournament?.qualifiers_locked && (
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
                                {first && <div style={{ color: '#fbbf24', whiteSpace: 'nowrap' }}>🥇 <FlagImg team={first} size={14} />{first}</div>}
                                {second && <div style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>🥈 <FlagImg team={second} size={14} />{second}</div>}
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
      {view === 'predictions' && tournament?.predictions_locked && (
        <WinnerPredictionWall allTournamentTips={allTournamentTips} profilesMap={profilesMap} leaderboard={leaderboard} t={t} />
      )}
      {view === 'predictions' && !tournament?.predictions_locked && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔒</div>
          <p>{t.lang === 'pt' ? 'As previsões ficam visíveis após o bloqueio pelo admin.' : 'Tournament predictions are revealed once the admin locks them.'}</p>
        </div>
      )}
      {view === 'predictions' && tournament?.predictions_locked && (
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
                        {tt?.[f as string] ? <><FlagImg team={tt[f as string]} />{tt[f as string]}</> : <span style={{ color: 'rgba(255,255,255,0.15)' }}>–</span>}
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
  const isLocked = match.tip_lock_override || match.status !== 'upcoming' || new Date() >= new Date(new Date(match.kickoff_at).getTime() - lockMins * 60 * 1000)
  const [home, setHome] = useState<string>(tip?.id != null ? String(tip.tip_home) : '')
  const [away, setAway] = useState<string>(tip?.id != null ? String(tip.tip_away) : '')
  const prevTipId = useRef<string | undefined>(tip?.id)

  useEffect(() => {
    if (tip?.id !== prevTipId.current) {
      prevTipId.current = tip?.id
      if (tip?.id != null) {
        setHome(String(tip.tip_home))
        setAway(String(tip.tip_away))
      } else {
        setHome('')
        setAway('')
      }
    }
  }, [tip?.id, tip?.tip_home, tip?.tip_away])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [odds, setOdds] = useState<{ home: string, draw: string, away: string, source?: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (isLocked || match.status !== 'upcoming') return
    fetch(`/api/odds?home=${encodeURIComponent(match.home_team)}&away=${encodeURIComponent(match.away_team)}`)
      .then(r => r.json())
      .then(d => { if (d.odds) setOdds(d.odds) })
      .catch(() => {})
  }, [match.id])

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
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}><><FlagImg team={match.home_team} />{match.home_team}</></span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>vs</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}><><FlagImg team={match.away_team} />{match.away_team}</></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
              <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
              {formatLocalTime(match.kickoff_at, t.lang)}
            </span>
            {match.round && (() => {
              const rl: Record<string,string> = t.lang === 'pt'
                ? { group: 'Fase de Grupos', r32: 'Rodada de 32', r16: 'Oitavas de Final', qf: 'Quartas de Final', sf: 'Semifinais', third_place: '3º Lugar', final: 'Final' }
                : { group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-Final', sf: 'Semi-Final', third_place: '3rd Place', final: 'Final' }
              return <span className="badge badge-grey" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>{rl[match.round] || match.round}</span>
            })()}
            {match.group_name && <span className="badge badge-grey">{match.group_name}</span>}
            {match.status === 'completed' && match.home_score !== null && (
              <span className="badge badge-green">{t.lang === 'pt' ? 'Resultado' : 'Result'}: {match.home_score ?? 0}–{match.away_score ?? 0}</span>
            )}
            {match.status === 'live' && match.home_score !== null && (
              <span className="badge" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                🔴 LIVE {match.home_score}–{match.away_score}
              </span>
            )}
            {isLocked && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'rgba(255,158,11,0.7)' }}><Lock size={10} />{t.lang === 'pt' ? 'Bloqueado' : 'Locked'}</span>}
          </div>
          {odds && !isLocked && (() => {
            const vals = [
              { label: match.home_team.split(' ').pop(), pct: parseInt(odds.home) },
              { label: 'Draw', pct: parseInt(odds.draw) },
              { label: match.away_team.split(' ').pop(), pct: parseInt(odds.away) },
            ]
            const sorted = [...vals].sort((a, b) => b.pct - a.pct)
            const getColor = (pct: number) => {
              if (pct === sorted[0].pct) return { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' }
              if (pct === sorted[sorted.length - 1].pct) return { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' }
              return { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' }
            }
            return (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>WIN%</span>
                {vals.map(v => {
                  const c = getColor(v.pct)
                  return <span key={v.label} style={{ fontSize: '0.72rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                    {v.label} {v.pct}%
                  </span>
                })}
                {odds.source && <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>{odds.source}</span>}
              </div>
            )
          })()}
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
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                className="score-input" value={home} placeholder="–"
                onChange={e => { const v = e.target.value.replace(/[^0-9]/g,''); setHome(v === '' ? '' : String(Math.min(15, parseInt(v)))) }}
              />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>–</span>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                className="score-input" value={away} placeholder="–"
                onChange={e => { const v = e.target.value.replace(/[^0-9]/g,''); setAway(v === '' ? '' : String(Math.min(15, parseInt(v)))) }}
              />
              <button onClick={saveTip} disabled={saving} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                {saved ? '✔' : saving ? '...' : tip ? (t.lang === 'pt' ? 'Atualizar' : 'Update') : (t.lang === 'pt' ? 'Apostar' : 'Tip')}
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
  const { t } = useLang()
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
    // Sync predictions across all user's tournaments
    const { data: memberships } = await supabase
      .from('tournament_members')
      .select('tournament_id')
      .eq('user_id', userId)
      .eq('status', 'approved')
    const tournamentIds = memberships?.map((m: any) => m.tournament_id) || [tournament.id]

    for (const tid of tournamentIds) {
      const finalTopScorer = topScorer === '__custom__' ? '' : topScorer
      const payload = { tournament_id: tid, user_id: userId, tip_winner: winner, tip_second: second, tip_third: third, tip_top_scorer: finalTopScorer, updated_at: new Date().toISOString() }
      const { data: ex } = await supabase.from('tournament_tips').select('id').eq('tournament_id', tid).eq('user_id', userId).maybeSingle()
      if (ex?.id) await supabase.from('tournament_tips').update(payload).eq('id', ex.id)
      else await supabase.from('tournament_tips').insert(payload)
    }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
    setSaving(false); onSave()
  }

  const teamFields = [
    { label: t.lang === 'pt' ? 'Campeão da Copa' : 'World Cup Winner', key: 'winner', val: winner, set: setWinner, pts: tournament.pts_tournament_winner },
    { label: t.lang === 'pt' ? '2º Lugar (Vice-campeão)' : '2nd Place (Runner-up)', key: 'second', val: second, set: setSecond, pts: tournament.pts_second_place },
    { label: t.lang === 'pt' ? '3º Lugar' : '3rd Place', key: 'third', val: third, set: setThird, pts: tournament.pts_third_place },
  ]

  return (
    <div style={{ maxWidth: 480, paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>{t.lang === 'pt' ? 'Previsões do Torneio' : 'Tournament Predictions'}</h2>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>
          {t.lang === 'pt' ? 'Defina antes do torneio começar — bloqueiam no primeiro jogo e não podem ser alteradas.' : "Set these before the tournament starts — they lock when the first match kicks off and can't be changed."}
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
                {f.val || (t.lang === 'pt' ? 'Não enviado' : 'Not submitted')}
              </div>
            ) : (
              <select className="input" style={{ background: "#1a1a2e", color: "#fff" }} value={f.val} onChange={e => f.set(e.target.value)}>
                <option value="">— {t.lang === 'pt' ? 'Selecione um time' : 'Select a team'} —</option>
                {WC2026_TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
            )}
            {existing && existing[`pts_${f.key}`] > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '0.25rem' }}>{t.lang === 'pt' ? '✔ Correto!' : '✔ Correct!'} +{existing[`pts_${f.key}`]} pts</div>
            )}
          </div>
        ))}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
            <label className="label">{t.lang === 'pt' ? 'Artilheiro' : 'Top Goal Scorer'}</label>
            <span className="badge badge-gold">{tournament.pts_top_scorer} pts</span>
          </div>
          {isLocked ? (
            <div style={{ padding: '0.65rem 0.9rem', background: 'rgba(255,255,255,0.04)', borderRadius: 10, fontSize: '0.9rem', color: topScorer ? '#e8f5ee' : 'rgba(255,255,255,0.25)' }}>
              {topScorer || (t.lang === 'pt' ? 'Não enviado' : 'Not submitted')}
            </div>
          ) : (
            <>
              <select
                className="input"
                style={{ background: '#1a1a2e', color: '#fff' }}
                value={TOP_SCORERS.includes(topScorer) ? topScorer : topScorer !== '' ? '__other__' : ''}
                onChange={e => {
                  if (e.target.value === '__other__') {
                    setTopScorer('__custom__')
                  } else {
                    setTopScorer(e.target.value)
                  }
                }}
              >
                <option value="">— {t.lang === 'pt' ? 'Selecione um jogador' : 'Select a player'} —</option>
                {TOP_SCORERS.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="__other__">{t.lang === 'pt' ? '✏️ Outro jogador...' : '✏️ Other player...'}</option>
              </select>
              {(topScorer === '__custom__' || (!TOP_SCORERS.includes(topScorer) && topScorer !== '')) && (
                <input
                  className="input"
                  type="text"
                  value={topScorer === '__custom__' ? '' : topScorer}
                  onChange={e => setTopScorer(e.target.value)}
                  placeholder={t.lang === 'pt' ? 'Digite o nome do jogador...' : 'Type player name...'}
                  style={{ marginTop: '0.4rem' }}
                  autoFocus
                />
              )}
            </>
          )}
          {existing?.pts_top_scorer > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '0.25rem' }}>✔ Correct! +{existing.pts_top_scorer} pts</div>
          )}
        </div>
        {!isLocked && (
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            {saved ? '✔ Saved!' : saving ? 'Saving...' : existing ? t.lang === 'pt' ? 'Atualizar previsões' : 'Update predictions' : t.lang === 'pt' ? 'Enviar previsões' : 'Submit predictions'}
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