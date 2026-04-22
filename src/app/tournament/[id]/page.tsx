'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Star, Trophy, ChevronLeft, Lock, Clock } from 'lucide-react'
import { format, isPast, subHours } from 'date-fns'

type Tab = 'tips' | 'tournament-tips' | 'leaderboard' | 'rules'

// Official FIFA World Cup 2026 qualified teams (48 teams)
const WC2026_TEAMS = [
  'Albania','Argentina','Australia','Austria','Belgium','Bolivia',
  'Brazil','Canada','Chile','Colombia','Costa Rica','Croatia',
  'Czech Republic','Ecuador','Egypt','England','France','Germany',
  'Ghana','Greece','Honduras','Hungary','IR Iran','Italy',
  'Jamaica','Japan','Kenya','Mali','Mexico','Morocco',
  'Netherlands','New Zealand','Nigeria','Panama','Paraguay','Peru',
  'Poland','Portugal','Qatar','Saudi Arabia','Senegal','Serbia',
  'Slovakia','Slovenia','South Korea','Spain','Switzerland',
  'Trinidad & Tobago','Tunisia','Turkey','Ukraine','United States',
  'Uruguay','Venezuela','Wales',
  // remaining playoff spots
  'AFC Playoff','CAF Playoff','CONCACAF Playoff','CONMEBOL-OFC Playoff',
  'UEFA Playoff 1','UEFA Playoff 2',
].sort()

const TOP_SCORERS = [
  'Kylian Mbappé','Erling Haaland','Vinicius Jr.','Rodrygo',
  'Lautaro Martínez','Julián Álvarez','Lionel Messi','Neymar',
  'Raphinha','Bruno Fernandes','Bernardo Silva','João Félix',
  'Pedri','Gavi','Ferran Torres','Harry Kane','Jude Bellingham',
  'Phil Foden','Bukayo Saka','Marcus Rashford','Cody Gakpo',
  'Memphis Depay','Donyell Malen','Dušan Vlahović','Luka Modrić',
  'Romelu Lukaku','Leroy Sané','Jamal Musiala','Florian Wirtz',
  'Kai Havertz','Heung-Min Son','Kaoru Mitoma','Richarlison',
  'Gabriel Martinelli','Éder Militão','Antoine Griezmann',
  'Ousmane Dembélé','Randal Kolo Muani','Youssef En-Nesyri',
  'Viktor Gyökeres',
].sort()

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export default function TournamentPage() {
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
  const [myGroupTips, setMyGroupTips] = useState<Record<string, { first: string; second: string }>>({})
  const [teamsByGroup, setTeamsByGroup] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setUser(user)

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    const { data: tn } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single()
    setTournament(tn)

    const { data: mem } = await supabase
      .from('tournament_members')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id)
      .single()
    setMembership(mem)

    if (mem?.status === 'approved') {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('kickoff_at')
      setMatches(matchData || [])

      // Build teams-by-group from actual match data
      const groupMap: Record<string, Set<string>> = {}
      matchData?.forEach((m: any) => {
        const g = m.group_label
        if (g && (m.stage === 'Group' || m.stage === 'group' || m.stage === 'Group Stage')) {
          if (!groupMap[g]) groupMap[g] = new Set()
          if (m.home_team) groupMap[g].add(m.home_team)
          if (m.away_team) groupMap[g].add(m.away_team)
        }
      })
      const groupTeams: Record<string, string[]> = {}
      Object.entries(groupMap).forEach(([g, set]) => {
        groupTeams[g] = Array.from(set).sort()
      })
      setTeamsByGroup(groupTeams)

      const { data: tipsData } = await supabase
        .from('match_tips')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
      const tipsMap: Record<string, any> = {}
      tipsData?.forEach(t => { tipsMap[t.match_id] = t })
      setMyTips(tipsMap)

      const { data: lb } = await supabase
        .from('match_tips')
        .select('user_id, pts_with_multiplier, profile:profiles(display_name)')
        .eq('tournament_id', tournamentId)
        .eq('is_locked', true)
      const totals: Record<string, { name: string; pts: number }> = {}
      lb?.forEach((r: any) => {
        if (!totals[r.user_id]) totals[r.user_id] = { name: r.profile?.display_name || 'Unknown', pts: 0 }
        totals[r.user_id].pts += r.pts_with_multiplier || 0
      })
      setLeaderboard(
        Object.entries(totals)
          .map(([id, v]) => ({ user_id: id, ...v }))
          .sort((a, b) => b.pts - a.pts)
      )

      const { data: tt } = await supabase
        .from('tournament_tips')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .single()
      setMyTournamentTip(tt)

      const { data: gt } = await supabase
        .from('group_qualifier_tips')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
      const groupTipMap: Record<string, { first: string; second: string }> = {}
      gt?.forEach((g: any) => {
        groupTipMap[g.group_label] = { first: g.tip_first || '', second: g.tip_second || '' }
      })
      setMyGroupTips(groupTipMap)
    }

    setLoading(false)
  }

  async function saveTip(matchId: string, home: number, away: number) {
    const existing = myTips[matchId]
    if (existing) {
      await supabase.from('match_tips')
        .update({ tip_home: home, tip_away: away, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('match_tips').insert({
        match_id: matchId, user_id: user.id,
        tournament_id: tournamentId, tip_home: home, tip_away: away,
      })
    }
    setMyTips(prev => ({ ...prev, [matchId]: { ...prev[matchId], tip_home: home, tip_away: away } }))
  }

  async function saveTournamentTip(field: string, value: string) {
    if (myTournamentTip) {
      await supabase.from('tournament_tips').update({ [field]: value }).eq('id', myTournamentTip.id)
      setMyTournamentTip((prev: any) => ({ ...prev, [field]: value }))
    } else {
      const { data } = await supabase.from('tournament_tips')
        .insert({ tournament_id: tournamentId, user_id: user.id, [field]: value })
        .select().single()
      setMyTournamentTip(data)
    }
  }

  async function saveGroupTip(group: string, position: 'first' | 'second', value: string) {
    const updated = { ...(myGroupTips[group] || { first: '', second: '' }), [position]: value }
    setMyGroupTips(prev => ({ ...prev, [group]: updated }))

    const { data: existing_row, error } = await supabase
      .from('group_qualifier_tips')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id)
      .eq('group_label', group)
      .maybeSingle()

    if (existing_row) {
      await supabase.from('group_qualifier_tips')
        .update({ [`tip_${position}`]: value })
        .eq('id', existing_row.id)
    } else {
      await supabase.from('group_qualifier_tips').insert({
        tournament_id: tournamentId,
        user_id: user.id,
        group_label: group,
        tip_first: position === 'first' ? value : (myGroupTips[group]?.first || ''),
        tip_second: position === 'second' ? value : (myGroupTips[group]?.second || ''),
      })
    }
  }

  function isLocked(kickoffAt: string) {
    return isPast(subHours(new Date(kickoffAt), 2))
  }

  // First kickoff per group — group tips lock 2h before first match in that group
  function isGroupLocked(group: string) {
    const groupMatches = matches.filter(m =>
      m.group_label === group &&
      (m.stage === 'Group' || m.stage === 'group' || m.stage === 'Group Stage')
    )
    if (!groupMatches.length) return false
    const first = groupMatches.reduce((a, b) =>
      new Date(a.kickoff_at) < new Date(b.kickoff_at) ? a : b
    )
    return isLocked(first.kickoff_at)
  }

  const ispt = profile?.preferred_language === 'pt'
  const tournamentLocked = !!myTournamentTip?.is_locked

  // Point values from tournament config — fall back to sensible defaults
  const pts = {
    winner:      tournament?.pts_correct_winner       ?? 2,
    diff:        tournament?.pts_correct_goal_diff    ?? 3,
    exact:       tournament?.pts_correct_exact_score  ?? 5,
    bonus:       tournament?.pts_big_margin_bonus     ?? 3,
    tourWinner:  tournament?.pts_tournament_winner    ?? 10,
    second:      tournament?.pts_second_place         ?? 6,
    third:       tournament?.pts_third_place          ?? 4,
    topScorer:   tournament?.pts_top_scorer           ?? 8,
    qualifying:  tournament?.pts_qualifying_teams     ?? 10,
  }

  // Dropdown + option styles
  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 2rem 0.5rem 0.75rem',
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    color: '#ffffff',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.6)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.6rem center',
  }

  const smallSelectStyle: React.CSSProperties = {
    ...selectStyle,
    padding: '0.4rem 1.8rem 0.4rem 0.6rem',
    fontSize: '0.82rem',
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  if (!tournament) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.5)' }}>Tournament not found</p>
    </div>
  )

  if (!membership) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Trophy size={48} style={{ color: 'var(--gold)', margin: '0 auto 1rem' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>{tournament.name}</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
          {ispt ? 'Você precisa entrar neste torneio para dar palpites.' : 'You need to join this tournament to submit tips.'}
        </p>
        <button className="btn btn-primary" onClick={async () => {
          await supabase.from('tournament_members').insert({ tournament_id: tournamentId, user_id: user.id, status: 'pending' })
          loadAll()
        }}>
          {ispt ? 'Solicitar entrada' : 'Request to join'}
        </button>
        <div style={{ marginTop: '1.5rem' }}>
          <Link href="/" className="btn btn-ghost">← {ispt ? 'Voltar' : 'Back'}</Link>
        </div>
      </div>
    </div>
  )

  if (membership.status === 'pending' || membership.status === 'rejected') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Clock size={48} style={{ color: 'var(--gold)', margin: '0 auto 1rem' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
          {membership.status === 'pending'
            ? (ispt ? 'Aguardando aprovação' : 'Awaiting approval')
            : (ispt ? 'Pedido rejeitado' : 'Request rejected')}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          {membership.status === 'pending'
            ? (ispt ? 'O admin ainda não aprovou seu pedido. Aguarde!' : "The tournament admin hasn't approved your request yet. Sit tight!")
            : (ispt ? 'Entre em contato com o admin.' : 'Contact the tournament admin for more info.')}
        </p>
        <Link href="/" className="btn btn-ghost">← {ispt ? 'Voltar' : 'Back to home'}</Link>
      </div>
    </div>
  )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'tips',           label: ispt ? 'Palpites'  : 'Match Tips' },
    { key: 'tournament-tips',label: ispt ? 'Previsões' : 'Tournament Tips' },
    { key: 'leaderboard',    label: ispt ? 'Ranking'   : 'Leaderboard' },
    { key: 'rules',          label: ispt ? 'Regras'    : 'Rules' },
  ]

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
          <ChevronLeft size={16} /> {ispt ? 'Início' : 'Home'}
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', margin: 0 }}>{tournament.name}</h1>
        </div>
        <Star size={20} style={{ color: 'var(--gold)' }} />
      </div>

      {/* ── Main tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, minWidth: 80, padding: '0.85rem 0.5rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: tab === t.key ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
            borderBottom: tab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
            fontFamily: 'var(--font-display)', fontSize: '0.7rem',
            letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* ════════════════════════════════
            MATCH TIPS
        ════════════════════════════════ */}
        {tab === 'tips' && (
          <div>
            {matches.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '3rem' }}>
                {ispt ? 'Nenhuma partida cadastrada ainda.' : 'No matches added yet.'}
              </p>
            )}
            {matches.map(match => {
              const locked = isLocked(match.kickoff_at)
              const tip = myTips[match.id]
              return (
                <div key={match.id} className="card" style={{ marginBottom: '1rem', opacity: locked ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                      {match.stage}{match.group_label ? ` · Group ${match.group_label}` : ''}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: locked ? '#e05555' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {locked
                        ? <><Lock size={12} /> {ispt ? 'Encerrado' : 'Locked'}</>
                        : format(new Date(match.kickoff_at), 'dd MMM, HH:mm')}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ textAlign: 'right', fontWeight: 600 }}>{match.home_team}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="number" min={0} max={99}
                        defaultValue={tip?.tip_home ?? ''}
                        disabled={locked}
                        onBlur={e => {
                          const h = parseInt(e.target.value)
                          const awEl = e.target.parentElement?.querySelector('input:last-of-type') as HTMLInputElement
                          const a = parseInt(awEl?.value)
                          if (!isNaN(h) && !isNaN(a)) saveTip(match.id, h, a)
                        }}
                        style={{ width: 48, textAlign: 'center', padding: '0.4rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', fontSize: '1.1rem' }}
                      />
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>–</span>
                      <input type="number" min={0} max={99}
                        defaultValue={tip?.tip_away ?? ''}
                        disabled={locked}
                        onBlur={e => {
                          const a = parseInt(e.target.value)
                          const hmEl = e.target.parentElement?.querySelector('input:first-of-type') as HTMLInputElement
                          const h = parseInt(hmEl?.value)
                          if (!isNaN(h) && !isNaN(a)) saveTip(match.id, h, a)
                        }}
                        style={{ width: 48, textAlign: 'center', padding: '0.4rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', fontSize: '1.1rem' }}
                      />
                    </div>
                    <span style={{ fontWeight: 600 }}>{match.away_team}</span>
                  </div>
                  {match.status === 'completed' && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {ispt ? 'Resultado:' : 'Result:'} {match.home_score}–{match.away_score}
                      </span>
                      <span style={{ color: 'var(--gold)', fontWeight: 600 }}>+{tip?.pts_with_multiplier ?? 0} pts</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ════════════════════════════════
            TOURNAMENT TIPS
            (Predictions + Group Qualifiers combined)
        ════════════════════════════════ */}
        {tab === 'tournament-tips' && (
          <div>

            {/* ── Section 1: Tournament Predictions ── */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.06em', marginBottom: '0.35rem', color: 'rgba(255,255,255,0.5)' }}>
                🏆 {ispt ? 'PREVISÕES DO TORNEIO' : 'TOURNAMENT PREDICTIONS'}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginBottom: '1.25rem' }}>
                {ispt ? 'Bloqueado no início do primeiro jogo.' : 'Locks when the first match kicks off.'}
              </p>

              {/* Winner / 2nd / 3rd — team dropdowns */}
              {[
                { field: 'tip_winner', label: ispt ? 'Campeão' : 'Winner',    p: pts.tourWinner },
                { field: 'tip_second', label: ispt ? '2º lugar' : '2nd Place', p: pts.second },
                { field: 'tip_third',  label: ispt ? '3º lugar' : '3rd Place', p: pts.third },
              ].map(({ field, label, p }) => (
                <div key={field} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <span>{label}</span>
                    <span style={{ color: 'var(--gold)', fontSize: '0.75rem' }}>+{p} pts</span>
                  </label>
                  <select
                    value={myTournamentTip?.[field] || ''}
                    disabled={tournamentLocked}
                    onChange={e => saveTournamentTip(field, e.target.value)}
                    style={selectStyle}
                  >
                    <option value="" style={{ background: '#1a1a2e', color: '#fff' }}>
                      {ispt ? '— Selecione uma seleção —' : '— Select a team —'}
                    </option>
                    {WC2026_TEAMS.map(t => (
                      <option key={t} value={t} style={{ background: '#1a1a2e', color: '#fff' }}>{t}</option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Top Scorer — dropdown + free text fallback */}
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <span>{ispt ? 'Artilheiro' : 'Top Scorer'}</span>
                  <span style={{ color: 'var(--gold)', fontSize: '0.75rem' }}>+{pts.topScorer} pts</span>
                </label>
                <select
                  value={TOP_SCORERS.includes(myTournamentTip?.tip_top_scorer || '') ? myTournamentTip.tip_top_scorer : '__other__'}
                  disabled={tournamentLocked}
                  onChange={e => {
                    if (e.target.value === '__other__') {
                      saveTournamentTip('tip_top_scorer', '')
                    } else {
                      saveTournamentTip('tip_top_scorer', e.target.value)
                    }
                  }}
                  style={{ ...selectStyle, marginBottom: '0.4rem' }}
                >
                  <option value="" style={{ background: '#1a1a2e', color: '#fff' }}>
                    {ispt ? '— Selecione um jogador —' : '— Select a player —'}
                  </option>
                  {TOP_SCORERS.map(p => (
                    <option key={p} value={p} style={{ background: '#1a1a2e', color: '#fff' }}>{p}</option>
                  ))}
                  <option value="__other__" style={{ background: '#1a1a2e', color: 'rgba(255,255,255,0.5)' }}>
                    {ispt ? '✏️ Outro jogador...' : '✏️ Other player...'}
                  </option>
                </select>
                {/* Free text shown when "other" is selected or value not in list */}
                {(myTournamentTip?.tip_top_scorer !== undefined &&
                  myTournamentTip?.tip_top_scorer !== '' &&
                  !TOP_SCORERS.includes(myTournamentTip?.tip_top_scorer)) && (
                  <input
                    type="text"
                    defaultValue={myTournamentTip?.tip_top_scorer}
                    disabled={tournamentLocked}
                    onBlur={e => { if (e.target.value) saveTournamentTip('tip_top_scorer', e.target.value) }}
                    placeholder={ispt ? 'Nome do jogador...' : 'Player name...'}
                    style={{ ...selectStyle, backgroundImage: 'none', padding: '0.5rem 0.75rem' }}
                  />
                )}
              </div>

              {tournamentLocked && (
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Lock size={12} /> {ispt ? 'Previsões encerradas.' : 'Predictions are locked.'}
                </p>
              )}
            </div>

            {/* ── Section 2: Group Qualifiers ── */}
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.06em', marginBottom: '0.35rem', color: 'rgba(255,255,255,0.5)' }}>
                  🗂️ {ispt ? 'CLASSIFICADOS POR GRUPO' : 'GROUP QUALIFIERS'}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>
                  {ispt
                    ? `Posição certa: +${pts.qualifying} pts · Avança mas posição errada: +${Math.floor(pts.qualifying / 2)} pts · Não avança: 0 pts`
                    : `Correct position: +${pts.qualifying} pts · Qualifies but wrong position: +${Math.floor(pts.qualifying / 2)} pts · Doesn't qualify: 0 pts`}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {ispt ? 'Bloqueado 2h antes do primeiro jogo de cada grupo.' : 'Locks 2 hours before the first match in each group.'}
                </p>
              </div>

              {GROUPS.map(group => {
                const groupTeams = teamsByGroup[group] || []
                const hasTeams = groupTeams.length > 0
                const locked = isGroupLocked(group)
                const currentTip = myGroupTips[group]

                return (
                  <div key={group} className="card" style={{ marginBottom: '0.75rem', opacity: locked ? 0.75 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 32 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--gold)', lineHeight: 1 }}>
                          {group}
                        </span>
                        {locked && <Lock size={10} style={{ color: '#e05555', marginTop: 3 }} />}
                      </div>
                      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                        {(['first', 'second'] as const).map(pos => (
                          <div key={pos}>
                            <label style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>
                              {pos === 'first'
                                ? (ispt ? `1º lugar · +${pts.qualifying}pts` : `1st · +${pts.qualifying}pts`)
                                : (ispt ? `2º lugar · +${pts.qualifying}pts` : `2nd · +${pts.qualifying}pts`)}
                            </label>
                            {hasTeams ? (
                              <select
                                value={currentTip?.[pos] || ''}
                                disabled={locked}
                                onChange={e => saveGroupTip(group, pos, e.target.value)}
                                style={smallSelectStyle}
                              >
                                <option value="" style={{ background: '#1a1a2e', color: '#fff' }}>
                                  {ispt ? '— Selecione —' : '— Select —'}
                                </option>
                                {groupTeams.map(t => (
                                  <option key={t} value={t} style={{ background: '#1a1a2e', color: '#fff' }}>{t}</option>
                                ))}
                              </select>
                            ) : (
                              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', margin: 0, paddingTop: '0.3rem' }}>
                                {ispt ? 'Partidas ainda não adicionadas' : 'Matches not added yet'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            LEADERBOARD
        ════════════════════════════════ */}
        {tab === 'leaderboard' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.06em', marginBottom: '1rem', color: 'rgba(255,255,255,0.6)' }}>
              {ispt ? 'CLASSIFICAÇÃO' : 'STANDINGS'}
            </h2>
            {leaderboard.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '2rem' }}>
                {ispt ? 'Nenhum ponto registrado ainda.' : 'No points yet — check back after matches are played.'}
              </p>
            )}
            {leaderboard.map((entry, i) => (
              <div key={entry.user_id} className="card" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: '1.2rem', minWidth: 32,
                  color: i === 0 ? 'var(--gold)' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.3)',
                }}>
                  #{i + 1}
                </span>
                <span style={{ flex: 1, fontWeight: entry.user_id === user?.id ? 600 : 400 }}>
                  {entry.name}{entry.user_id === user?.id ? (ispt ? ' (você)' : ' (you)') : ''}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.1rem' }}>
                  {entry.pts}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ════════════════════════════════
            RULES
        ════════════════════════════════ */}
        {tab === 'rules' && (
          <div style={{ paddingBottom: '3rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                📋 {tournament.name}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                {ispt ? 'Como os pontos são calculados neste torneio' : 'How points are calculated in this tournament'}
              </p>
            </div>

            {/* Match points */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.06em', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.5)' }}>
                ⚽ {ispt ? 'PONTOS POR PARTIDA' : 'MATCH POINTS'}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {ispt ? 'Cumulativo — você ganha tudo que acertou.' : 'Cumulative — you earn every tier you get right.'}
              </p>
              {[
                {
                  label: ispt ? 'Acertar o vencedor' : 'Correct winner',
                  p: pts.winner,
                  eg: ispt
                    ? `Ex: Você tipou Brasil para vencer → Brasil vence 2–0 → +${pts.winner} pts`
                    : `e.g. You tip Brazil to win → Brazil wins 2–0 → +${pts.winner} pts`,
                },
                {
                  label: ispt ? 'Acertar a diferença de gols' : 'Correct goal difference',
                  p: pts.diff,
                  eg: ispt
                    ? `Ex: Você tipou Brasil 2–0 → Resultado foi 3–1 (diferença 2) → +${pts.winner + pts.diff} pts total`
                    : `e.g. You tip Brazil 2–0 → Result is 3–1 (diff of 2) → +${pts.winner + pts.diff} pts total`,
                },
                {
                  label: ispt ? 'Placar exato' : 'Correct exact score',
                  p: pts.exact,
                  eg: ispt
                    ? `Ex: Você tipou Brasil 1–0 Escócia → Resultado: Brasil 1–0 Escócia → +${pts.winner + pts.diff + pts.exact} pts total`
                    : `e.g. You tip Brazil 1–0 Scotland → Result: Brazil 1–0 Scotland → +${pts.winner + pts.diff + pts.exact} pts total`,
                },
                {
                  label: ispt ? 'Bônus: placar exato com 3+ gols de diferença' : 'Bonus: exact score with 3+ goal margin',
                  p: pts.bonus,
                  eg: ispt
                    ? `Ex: Você tipou Brasil 4–0 → Resultado: Brasil 4–0 → +${pts.winner + pts.diff + pts.exact + pts.bonus} pts total`
                    : `e.g. You tip Brazil 4–0 → Result: Brazil 4–0 → +${pts.winner + pts.diff + pts.exact + pts.bonus} pts total`,
                },
              ].map(({ label, p, eg }) => (
                <div key={label} style={{ padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', flex: 1 }}>{label}</span>
                    <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>+{p} pts</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>{eg}</p>
                </div>
              ))}
            </div>

            {/* Phase multipliers */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.06em', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.5)' }}>
                🔢 {ispt ? 'MULTIPLICADORES DE FASE' : 'PHASE MULTIPLIERS'}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {ispt
                  ? `Ex: Placar exato na semifinal → ${pts.winner + pts.diff + pts.exact} × 5 = ${(pts.winner + pts.diff + pts.exact) * 5} pts`
                  : `e.g. Exact score in a semi-final → ${pts.winner + pts.diff + pts.exact} × 5 = ${(pts.winner + pts.diff + pts.exact) * 5} pts`}
              </p>
              {[
                { stage: ispt ? 'Fase de grupos' : 'Group stage',    mult: '×1' },
                { stage: ispt ? 'Rodada de 32'  : 'Round of 32',     mult: '×2' },
                { stage: ispt ? 'Oitavas'       : 'Round of 16',     mult: '×3' },
                { stage: ispt ? 'Quartas'       : 'Quarter-finals',  mult: '×4' },
                { stage: ispt ? 'Semifinais'    : 'Semi-finals',     mult: '×5' },
                { stage: ispt ? 'Final'         : 'Final',           mult: '×6' },
              ].map(({ stage, mult }) => (
                <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '0.9rem' }}>{stage}</span>
                  <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{mult}</span>
                </div>
              ))}
            </div>

            {/* Tournament predictions */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.06em', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.5)' }}>
                🏆 {ispt ? 'PREVISÕES DO TORNEIO' : 'TOURNAMENT PREDICTIONS'}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {ispt ? 'Submetidas antes do primeiro jogo. Bloqueadas no pontapé inicial.' : 'Submitted before the first match. Locked at kick-off.'}
              </p>
              {[
                { label: ispt ? 'Campeão' : 'Winner',       p: pts.tourWinner, eg: ispt ? `Ex: Você tipou Brasil → Brasil vence → +${pts.tourWinner} pts` : `e.g. You tip Brazil → Brazil wins → +${pts.tourWinner} pts` },
                { label: ispt ? '2º lugar' : '2nd Place',   p: pts.second,     eg: ispt ? `Ex: Argentina vice → +${pts.second} pts` : `e.g. Argentina finishes 2nd → +${pts.second} pts` },
                { label: ispt ? '3º lugar' : '3rd Place',   p: pts.third,      eg: ispt ? `Ex: França 3º → +${pts.third} pts` : `e.g. France finishes 3rd → +${pts.third} pts` },
                { label: ispt ? 'Artilheiro' : 'Top Scorer',p: pts.topScorer,  eg: ispt ? `Ex: Você tipou Mbappé → Mbappé artilheiro → +${pts.topScorer} pts` : `e.g. You tip Mbappé → Mbappé top scorer → +${pts.topScorer} pts` },
              ].map(({ label, p, eg }) => (
                <div key={label} style={{ padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', flex: 1 }}>{label}</span>
                    <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>+{p} pts</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>{eg}</p>
                </div>
              ))}
            </div>

            {/* Group qualifiers */}
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.06em', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.5)' }}>
                🗂️ {ispt ? 'CLASSIFICADOS POR GRUPO' : 'GROUP QUALIFIERS'}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {ispt
                  ? 'Preveja o 1º e 2º de cada grupo. Cada seleção vale pontos independentemente.'
                  : 'Predict 1st and 2nd in each group. Each team is scored independently.'}
              </p>
              {[
                {
                  label: ispt ? 'Seleção na posição correta' : 'Team in correct position',
                  p: pts.qualifying,
                  eg: ispt
                    ? `Ex: Você tipou Brasil 1º → Brasil termina 1º → +${pts.qualifying} pts`
                    : `e.g. You tip Brazil 1st → Brazil finishes 1st → +${pts.qualifying} pts`,
                },
                {
                  label: ispt ? 'Seleção avança mas na posição errada' : 'Team qualifies but wrong position',
                  p: Math.floor(pts.qualifying / 2),
                  eg: ispt
                    ? `Ex: Você tipou Brasil 1º → Brasil termina 2º → +${Math.floor(pts.qualifying / 2)} pts`
                    : `e.g. You tip Brazil 1st → Brazil finishes 2nd → +${Math.floor(pts.qualifying / 2)} pts`,
                },
                {
                  label: ispt ? 'Seleção não avança' : 'Team doesn\'t qualify',
                  p: 0,
                  eg: ispt
                    ? 'Ex: Você tipou Brasil 1º → Brasil cai na fase de grupos → 0 pts'
                    : 'e.g. You tip Brazil 1st → Brazil is eliminated in group stage → 0 pts',
                },
              ].map(({ label, p, eg }) => (
                <div key={label} style={{ padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', flex: 1 }}>{label}</span>
                    <span style={{ color: p === 0 ? 'rgba(255,255,255,0.3)' : 'var(--gold)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>+{p} pts</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>{eg}</p>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
