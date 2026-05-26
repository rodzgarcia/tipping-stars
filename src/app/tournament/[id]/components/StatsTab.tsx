'use client'
import { useState } from 'react'
import { GROUPS } from '@/lib/constants'
import FlagImg from './FlagImg'

function Bar({ pct, color }: { pct: number, color: string }) {
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
    </div>
  )
}

export default function StatsTab({ matches, allTips, allTournamentTips, leaderboard, tournament, profilesMap, avatars, userId, t }: any) {
  const ispt = t.lang === 'pt'
  const [statsView, setStatsView] = useState<'upcoming' | 'finished'>('upcoming')

  const lockMins = tournament?.tip_lock_minutes ?? 120
  const upcomingLocked = matches.filter((m: any) => {
    if (m.status === 'completed') return false
    if (m.tip_lock_override) return true
    const lockTime = new Date(new Date(m.kickoff_at).getTime() - lockMins * 60 * 1000)
    return new Date() >= lockTime
  })

  const finishedMatches = matches.filter((m: any) => m.status === 'completed' && m.home_score !== null)
  const lockedMatches = [...upcomingLocked, ...finishedMatches]

  const totalTippers = leaderboard.length
  if (lockedMatches.length === 0 && totalTippers === 0) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
      <p>{ispt ? 'Stats disponíveis após o bloqueio das partidas.' : 'Stats available once matches are locked for tipping.'}</p>
    </div>
  )

  const matchStats = lockedMatches.map((m: any) => {
    const tips = allTips.filter((tp: any) => tp.match_id === m.id)
    const total = tips.length || 1
    const homeWin = tips.filter((tp: any) => tp.tip_home > tp.tip_away)
    const draw    = tips.filter((tp: any) => tp.tip_home === tp.tip_away)
    const awayWin = tips.filter((tp: any) => tp.tip_home < tp.tip_away)
    const homePct = Math.round(homeWin.length / total * 100)
    const drawPct = Math.round(draw.length / total * 100)
    const awayPct = Math.round(awayWin.length / total * 100)
    const getName = (uid: string) => profilesMap?.[uid]?.nickname || profilesMap?.[uid]?.display_name || '?'
    const homeNames = homeWin.map((tp: any) => ({ name: getName(tp.user_id), score: `${tp.tip_home}–${tp.tip_away}` }))
    const drawNames = draw.map((tp: any) => ({ name: getName(tp.user_id), score: `${tp.tip_home}–${tp.tip_away}` }))
    const awayNames = awayWin.map((tp: any) => ({ name: getName(tp.user_id), score: `${tp.tip_home}–${tp.tip_away}` }))
    const scoreCounts: Record<string, number> = {}
    tips.forEach((tp: any) => {
      const key = `${tp.tip_home}-${tp.tip_away}`
      scoreCounts[key] = (scoreCounts[key] || 0) + 1
    })
    const popularScore = Object.entries(scoreCounts).sort((a: any, b: any) => b[1] - a[1])[0]
    const hasResult = m.status === 'completed' && m.home_score !== null
    const actualOutcome = hasResult ? (m.home_score > m.away_score ? 'home' : m.home_score < m.away_score ? 'away' : 'draw') : null
    const outcomePct = actualOutcome === 'home' ? homePct : actualOutcome === 'away' ? awayPct : drawPct
    const braveTippers = hasResult && outcomePct < 30
      ? tips.filter((tp: any) => {
          const o = tp.tip_home > tp.tip_away ? 'home' : tp.tip_home < tp.tip_away ? 'away' : 'draw'
          return o === actualOutcome
        }).map((tp: any) => getName(tp.user_id))
      : []
    return { match: m, tips, total, homePct, drawPct, awayPct, homeNames, drawNames, awayNames, popularScore, braveTippers, hasResult, outcomePct }
  })

  const predictionCounts = (field: string) => {
    const counts: Record<string, number> = {}
    allTournamentTips.forEach((tt: any) => {
      const v = tt[field]
      if (v) counts[v] = (counts[v] || 0) + 1
    })
    return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 6)
  }

  const accuracyStats = leaderboard.map((row: any) => {
    const userTips = allTips.filter((tp: any) => tp.user_id === row.user_id)
    const locked = userTips.filter((tp: any) => {
      const m = matches.find((mm: any) => mm.id === tp.match_id)
      return m?.status === 'completed'
    })
    const correct = locked.filter((tp: any) => {
      const m = matches.find((mm: any) => mm.id === tp.match_id)
      if (!m) return false
      const tipOut = tp.tip_home > tp.tip_away ? 'h' : tp.tip_home < tp.tip_away ? 'a' : 'd'
      const actOut = m.home_score > m.away_score ? 'h' : m.home_score < m.away_score ? 'a' : 'd'
      return tipOut === actOut
    })
    const acc = locked.length > 0 ? Math.round(correct.length / locked.length * 100) : 0
    return {
      ...row,
      name: profilesMap?.[row.user_id]?.nickname || row.display_name,
      accuracy: acc,
      correct: correct.length,
      played: locked.length,
    }
  }).sort((a: any, b: any) => b.accuracy - a.accuracy)

  const wrongPicks: { match: string, score: string, count: number, pct: number }[] = []
  lockedMatches.filter((m: any) => m.status === 'completed').forEach((m: any) => {
    const tips = allTips.filter((tp: any) => tp.match_id === m.id)
    const scoreCounts: Record<string, number> = {}
    tips.forEach((tp: any) => {
      if (tp.tip_home !== m.home_score || tp.tip_away !== m.away_score) {
        const key = `${tp.tip_home}-${tp.tip_away}`
        scoreCounts[key] = (scoreCounts[key] || 0) + 1
      }
    })
    const top = Object.entries(scoreCounts).sort((a: any, b: any) => (b[1] as number) - (a[1] as number))[0]
    if (top && (top[1] as number) > 1) {
      wrongPicks.push({
        match: `${m.home_team} vs ${m.away_team}`,
        score: top[0],
        count: top[1] as number,
        pct: Math.round((top[1] as number) / (tips.length || 1) * 100)
      })
    }
  })
  wrongPicks.sort((a, b) => b.pct - a.pct)

  const activeMatchStats = matchStats.filter((ms: any) =>
    statsView === 'upcoming'
      ? ms.match.status !== 'completed'
      : ms.match.status === 'completed'
  )

  return (
    <div style={{ paddingBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {([['upcoming', ispt ? '🔒 Aguardando resultado' : t.lang === 'pt' ? '🔒 Bloqueado, aguardando resultado' : '🔒 Locked, awaiting result', upcomingLocked.length],
           ['finished',  ispt ? '✅ Partidas encerradas' : '✅ Finished matches', finishedMatches.length]] as const).map(([v, label, count]) => (
          <button key={v} onClick={() => setStatsView(v)} style={{
            padding: '0.45rem 1rem', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
            border: `1px solid ${statsView === v ? 'var(--green)' : 'rgba(255,255,255,0.15)'}`,
            background: statsView === v ? 'rgba(74,222,128,0.1)' : 'transparent',
            color: statsView === v ? '#4ade80' : 'rgba(255,255,255,0.5)',
          }}>
            {label} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>({count})</span>
          </button>
        ))}
      </div>

      {activeMatchStats.length === 0 && statsView === 'upcoming' && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
          <p>{ispt ? 'Nenhuma partida bloqueada ainda.' : 'No matches locked yet.'}</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>{upcomingLocked.length} locked (time), {matches.filter((m:any)=>m.tip_lock_override).length} manually locked, {allTips.length} tips loaded</p>
        </div>
      )}
      {activeMatchStats.length === 0 && statsView === 'finished' && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
          {ispt ? 'Nenhuma partida encerrada ainda.' : 'No finished matches yet.'}
        </div>
      )}

      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
          🎯 {ispt ? 'PRECISÃO DOS PALPITEIROS' : 'TIPPER ACCURACY'}
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginBottom: '1rem' }}>
          {ispt ? 'Porcentagem de resultados acertados (vencedor correto)' : 'Percentage of correct outcomes (winner) across completed matches'}
        </p>
        {accuracyStats.map((row: any, i: number) => (
          <div key={row.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.08)' }}>
              {avatars[row.user_id] ? <img src={avatars[row.user_id]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>👤</span>}
            </div>
            <div style={{ minWidth: 90, fontSize: '0.82rem', fontWeight: row.user_id === userId ? 600 : 400, color: row.user_id === userId ? '#4ade80' : '#e8f5ee' }}>
              {row.name}{row.user_id === userId ? ' ✦' : ''}
            </div>
            <Bar pct={row.accuracy} color={row.accuracy >= 60 ? '#4ade80' : row.accuracy >= 40 ? '#fbbf24' : '#f87171'} />
            <div style={{ minWidth: 60, textAlign: 'right', fontSize: '0.82rem', fontFamily: 'var(--font-display)', color: row.accuracy >= 60 ? '#4ade80' : row.accuracy >= 40 ? '#fbbf24' : '#f87171' }}>
              {row.accuracy}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', minWidth: 50, textAlign: 'right' }}>
              {row.correct}/{row.played}
            </div>
          </div>
        ))}
      </div>

      {activeMatchStats.length > 0 && (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
            ⚽ {ispt ? 'CONSENSO DAS PARTIDAS' : 'MATCH CONSENSUS'}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginBottom: '1rem' }}>
            {statsView === 'upcoming' ? (ispt ? 'Como o grupo apostou — resultado ainda não conhecido' : 'How the group tipped — result not yet known') : (ispt ? 'Como o grupo apostou vs resultado final' : 'How the group tipped vs the final result')}
          </p>
          {activeMatchStats.map(({ match: m, tips, homePct, drawPct, awayPct, homeNames, drawNames, awayNames, popularScore, braveTippers, hasResult, outcomePct }: any) => (
            <div key={m.id} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  <FlagImg team={m.home_team} size={16} />{m.home_team}
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, margin: '0 0.4rem' }}>vs</span>
                  <FlagImg team={m.away_team} size={16} />{m.away_team}
                </span>
                {hasResult && <span style={{ fontSize: '0.85rem', color: '#4ade80', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{m.home_score}–{m.away_score}</span>}
              </div>

              <div style={{ display: 'flex', gap: '0', height: 28, borderRadius: 6, overflow: 'hidden', marginBottom: '0.75rem' }}>
                {homePct > 0 && <div style={{ width: `${homePct}%`, background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#0a0f0d' }}>{homePct}%</div>}
                {drawPct > 0 && <div style={{ width: `${drawPct}%`, background: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>{drawPct}%</div>}
                {awayPct > 0 && <div style={{ width: `${awayPct}%`, background: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>{awayPct}%</div>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { names: homeNames, label: `${m.home_team} win`, color: '#4ade80', bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.15)' },
                  { names: drawNames, label: 'Draw', color: '#9ca3af', bg: 'rgba(156,163,175,0.06)', border: 'rgba(156,163,175,0.15)' },
                  { names: awayNames, label: `${m.away_team} win`, color: '#f87171', bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.15)' },
                ].filter((g: any) => g.names.length > 0).map((g: any) => (
                  <div key={g.label} style={{ padding: '0.5rem 0.75rem', background: g.bg, border: `1px solid ${g.border}`, borderRadius: 8 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: g.color, marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
                      {g.label} ({g.names.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {(() => {
                        const byScore: Record<string, string[]> = {}
                        g.names.forEach((p: any) => {
                          if (!byScore[p.score]) byScore[p.score] = []
                          byScore[p.score].push(p.name)
                        })
                        return Object.entries(byScore)
                          .sort((a, b) => b[1].length - a[1].length)
                          .map(([score, names]) => (
                            <div key={score} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '0.2rem 0.5rem' }}>
                              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', color: g.color, fontWeight: 700 }}>{score}</span>
                              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>→</span>
                              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>{names.join(', ')}</span>
                            </div>
                          ))
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              {braveTippers.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#fbbf24' }}>
                  🦁 Only {outcomePct}% tipped this — correct: <strong>{braveTippers.join(', ')}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {allTournamentTips.length > 0 && tournament?.predictions_locked && (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
            🏆 {ispt ? 'PREVISÕES DO TORNEIO' : 'TOURNAMENT PREDICTIONS'}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginBottom: '1rem' }}>
            {ispt ? 'O que o grupo apostou' : 'What the group predicted'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { field: 'tip_winner',    label: ispt ? '🏆 Campeão' : '🏆 Winner' },
              { field: 'tip_second',    label: ispt ? '🥈 Vice' : '🥈 Runner-up' },
              { field: 'tip_third',     label: ispt ? '🥉 3º lugar' : '🥉 3rd place' },
              { field: 'tip_top_scorer',label: ispt ? '⚽ Artilheiro' : '⚽ Top scorer' },
            ].map(({ field, label }) => {
              const counts = predictionCounts(field)
              const total = allTournamentTips.filter((tt: any) => tt[field]).length || 1
              return (
                <div key={field}>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</div>
                  {counts.map(([val, cnt]: any) => (
                    <div key={val} style={{ marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.15rem' }}>
                        <span style={{ color: '#e8f5ee' }}>{val}</span>
                        <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{Math.round(cnt/total*100)}%</span>
                      </div>
                      <Bar pct={Math.round(cnt/total*100)} color="#fbbf24" />
                    </div>
                  ))}
                  {counts.length === 0 && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>No picks yet</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {statsView === 'finished' && wrongPicks.length > 0 && (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
            😬 {ispt ? 'PALPITE MAIS POPULAR QUE ERROU' : 'MOST POPULAR WRONG PICK'}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginBottom: '1rem' }}>
            {ispt ? 'O placar que mais gente apostou mas não aconteceu' : 'The score most people tipped that did not happen'}
          </p>
          {wrongPicks.slice(0, 5).map((wp, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: '#e8f5ee' }}>{wp.match}</span>
                <span style={{ marginLeft: '0.5rem', color: '#f87171', fontFamily: 'var(--font-display)' }}>{wp.score.replace('-','–')}</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{wp.pct}% tipped ({wp.count})</span>
            </div>
          ))}
        </div>
      )}

      {allTournamentTips.length > 0 && tournament?.qualifiers_locked && Object.keys(GROUPS).length > 0 && (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
            🗂️ {ispt ? 'CONSENSO DOS CLASSIFICADOS' : 'GROUP QUALIFIER CONSENSUS'}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginBottom: '1rem' }}>
            {ispt ? 'Times mais apostados para avançar em cada grupo' : 'Most tipped teams to qualify in each group'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {Object.keys(GROUPS).map(group => {
              const g = group.toLowerCase()
              const counts: Record<string, number> = {}
              allTournamentTips.forEach((tt: any) => {
                const p1 = tt[`tip_group_${g}_1`]
                const p2 = tt[`tip_group_${g}_2`]
                if (p1) counts[p1] = (counts[p1] || 0) + 1
                if (p2) counts[p2] = (counts[p2] || 0) + 1
              })
              const sorted = Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3)
              if (sorted.length === 0) return null
              const maxCount = sorted[0][1] as number
              return (
                <div key={group}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gold)', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.08em' }}>GROUP {group}</div>
                  {sorted.map(([team, cnt]: any) => (
                    <div key={team} style={{ marginBottom: '0.3rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.1rem' }}>
                        <span style={{ color: '#e8f5ee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{team}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-display)', marginLeft: 4 }}>{cnt}</span>
                      </div>
                      <Bar pct={Math.round((cnt as number) / maxCount * 100)} color="#60a5fa" />
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
