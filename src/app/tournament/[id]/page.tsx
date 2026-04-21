'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Star, Trophy, ChevronLeft, Lock, Clock } from 'lucide-react'
import { format, isPast, subHours } from 'date-fns'

type Tab = 'tips' | 'leaderboard' | 'predictions'

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
      setLeaderboard(Object.entries(totals).map(([id, v]) => ({ user_id: id, ...v })).sort((a, b) => b.pts - a.pts))

      const { data: tt } = await supabase
        .from('tournament_tips')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .single()
      setMyTournamentTip(tt)
    }

    setLoading(false)
  }

  async function saveTip(matchId: string, home: number, away: number) {
    const existing = myTips[matchId]
    if (existing) {
      await supabase.from('match_tips').update({ tip_home: home, tip_away: away, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('match_tips').insert({ match_id: matchId, user_id: user.id, tournament_id: tournamentId, tip_home: home, tip_away: away })
    }
    setMyTips(prev => ({ ...prev, [matchId]: { ...prev[matchId], tip_home: home, tip_away: away } }))
  }

  async function saveTournamentTip(field: string, value: string) {
    if (myTournamentTip) {
      await supabase.from('tournament_tips').update({ [field]: value }).eq('id', myTournamentTip.id)
      setMyTournamentTip((prev: any) => ({ ...prev, [field]: value }))
    } else {
      const { data } = await supabase.from('tournament_tips').insert({ tournament_id: tournamentId, user_id: user.id, [field]: value }).select().single()
      setMyTournamentTip(data)
    }
  }

  function isLocked(kickoffAt: string) {
    return isPast(subHours(new Date(kickoffAt), 2))
  }

  const ispt = profile?.preferred_language === 'pt'

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
          {membership.status === 'pending' ? (ispt ? 'Aguardando aprovação' : 'Awaiting approval') : (ispt ? 'Pedido rejeitado' : 'Request rejected')}
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

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
          <ChevronLeft size={16} /> {ispt ? 'Início' : 'Home'}
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', margin: 0 }}>{tournament.name}</h1>
        </div>
        <Star size={20} style={{ color: 'var(--gold)' }} />
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
        {(['tips', 'leaderboard', 'predictions'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '0.85rem', background: 'none', border: 'none', cursor: 'pointer',
            color: tab === t ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
            borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
            fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase'
          }}>
            {t === 'tips' ? (ispt ? 'Palpites' : 'Tips') : t === 'leaderboard' ? (ispt ? 'Ranking' : 'Leaderboard') : (ispt ? 'Previsões' : 'Predictions')}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 1rem' }}>
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
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{match.stage} · {match.group_label}</span>
                    <span style={{ fontSize: '0.75rem', color: locked ? 'var(--red)' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {locked ? <><Lock size={12} /> {ispt ? 'Encerrado' : 'Locked'}</> : format(new Date(match.kickoff_at), 'dd MMM, HH:mm')}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ textAlign: 'right', fontWeight: 600 }}>{match.home_team}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="number" min={0} max={99}
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
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>×</span>
                      <input
                        type="number" min={0} max={99}
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
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{ispt ? 'Resultado:' : 'Result:'} {match.home_score}–{match.away_score}</span>
                      <span style={{ color: 'var(--gold)', fontWeight: 600 }}>+{tip?.pts_with_multiplier ?? 0} pts</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

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
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: i === 0 ? 'var(--gold)' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.3)', minWidth: 28 }}>
                  #{i + 1}
                </span>
                <span style={{ flex: 1, fontWeight: entry.user_id === user?.id ? 600 : 400 }}>
                  {entry.name} {entry.user_id === user?.id ? '(you)' : ''}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.1rem' }}>{entry.pts}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'predictions' && (
          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.06em', marginBottom: '1.25rem', color: 'rgba(255,255,255,0.6)' }}>
                🏆 {ispt ? 'PREVISÕES DO TORNEIO' : 'TOURNAMENT PREDICTIONS'}
              </h3>
              {[
                { field: 'tip_winner', label: ispt ? 'Campeão' : 'Winner', pts: tournament.pts_tournament_winner },
                { field: 'tip_second', label: ispt ? '2º lugar' : '2nd Place', pts: tournament.pts_second_place },
                { field: 'tip_third', label: ispt ? '3º lugar' : '3rd Place', pts: tournament.pts_third_place },
                { field: 'tip_top_scorer', label: ispt ? 'Artilheiro' : 'Top Scorer', pts: tournament.pts_top_scorer },
              ].map(({ field, label, pts }) => (
                <div key={field} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <span>{label}</span>
                    <span style={{ color: 'var(--gold)', fontSize: '0.75rem' }}>+{pts} pts</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={myTournamentTip?.[field] || ''}
                    disabled={myTournamentTip?.is_locked}
                    onBlur={e => { if (e.target.value) saveTournamentTip(field, e.target.value) }}
                    placeholder={ispt ? 'Digite o nome...' : 'Type a name...'}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
              ))}
              {myTournamentTip?.is_locked && (
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
                  <Lock size={12} style={{ display: 'inline', marginRight: 4 }} />
                  {ispt ? 'Previsões encerradas.' : 'Predictions are locked.'}
                </p>
              )}
            </div>
            <TournamentRules tn={tournament} ispt={ispt} />
          </div>
        )}
      </div>
    </div>
  )
}

function TournamentRules({ tn, ispt }: { tn: any; ispt: boolean }) {
  return (
    <div style={{ maxWidth: 600, paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
          📋 {tn.name} — {ispt ? 'Regras' : 'Rules'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
          {ispt ? 'Como os pontos são calculados' : 'How points are calculated'}
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.06em', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>
          ⚽ {ispt ? 'PONTOS POR PARTIDA' : 'MATCH POINTS'}
        </h3>
        {[
          { label: ispt ? 'Acertar o vencedor' : 'Correct winner', pts: tn.pts_correct_winner },
          { label: ispt ? 'Acertar a diferença de gols' : 'Correct goal difference', pts: tn.pts_correct_goal_diff },
          { label: ispt ? 'Acertar o placar exato' : 'Correct exact score', pts: tn.pts_correct_exact_score },
          { label: ispt ? 'Bônus: placar exato com 3+ gols de diferença' : 'Bonus: exact score with 3+ goal margin', pts: tn.pts_big_margin_bonus },
        ].map(({ label, pts }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.9rem' }}>{label}</span>
            <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>+{pts}</span>
          </div>
        ))}
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.75rem' }}>
          {ispt ? '* Os pontos são cumulativos por partida.' : '* Points are cumulative per match.'}
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.06em', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>
          🔢 {ispt ? 'MULTIPLICADORES DE FASE' : 'PHASE MULTIPLIERS'}
        </h3>
        {[
          { stage: ispt ? 'Fase de grupos' : 'Group stage', mult: '×1' },
          { stage: ispt ? 'Rodada de 32' : 'Round of 32', mult: '×2' },
          { stage: ispt ? 'Oitavas' : 'Round of 16', mult: '×3' },
          { stage: ispt ? 'Quartas' : 'Quarter-finals', mult: '×4' },
          { stage: ispt ? 'Semifinais' : 'Semi-finals', mult: '×5' },
          { stage: ispt ? 'Final' : 'Final', mult: '×6' },
        ].map(({ stage, mult }) => (
          <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.9rem' }}>{stage}</span>
            <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{mult}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.06em', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>
          🏆 {ispt ? 'PREVISÕES DO TORNEIO' : 'TOURNAMENT PREDICTIONS'}
        </h3>
        {[
          { label: ispt ? 'Campeão' : 'Winner', pts: tn.pts_tournament_winner },
          { label: ispt ? '2º lugar' : '2nd Place', pts: tn.pts_second_place },
          { label: ispt ? '3º lugar' : '3rd Place', pts: tn.pts_third_place },
          { label: ispt ? 'Artilheiro' : 'Top Scorer', pts: tn.pts_top_scorer },
        ].map(({ label, pts }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.9rem' }}>{label}</span>
            <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>+{pts}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
