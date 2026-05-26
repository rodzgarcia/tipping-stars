'use client'
import { useState } from 'react'
import { useLang } from '../../../LanguageContext'

export default function HeadToHead({ leaderboard, allTips, profilesMap, userId, matches }: any) {
  const { t } = useLang()
  const [opponent, setOpponent] = useState('')

  const me = leaderboard.find((r: any) => r.user_id === userId)
  const others = leaderboard.filter((r: any) => r.user_id !== userId)
  const opp = leaderboard.find((r: any) => r.user_id === opponent)

  const completedMatches = matches.filter((m: any) => m.status === 'completed')

  const myTips = allTips.filter((tp: any) => tp.user_id === userId)
  const oppTips = allTips.filter((tp: any) => tp.user_id === opponent)

  const results = completedMatches.map((m: any) => {
    const myTip = myTips.find((tp: any) => tp.match_id === m.id)
    const oppTip = oppTips.find((tp: any) => tp.match_id === m.id)
    const myPts = Number(myTip?.pts_with_multiplier || 0)
    const oppPts = Number(oppTip?.pts_with_multiplier || 0)
    return { match: m, myTip, oppTip, myPts, oppPts,
      winner: myPts > oppPts ? 'me' : oppPts > myPts ? 'opp' : myTip && oppTip ? 'draw' : null }
  }).filter((r: any) => r.myTip || r.oppTip)

  const myWins = results.filter((r: any) => r.winner === 'me').length
  const oppWins = results.filter((r: any) => r.winner === 'opp').length
  const draws = results.filter((r: any) => r.winner === 'draw').length
  const myTotal = results.reduce((s: number, r: any) => s + r.myPts, 0)
  const oppTotal = results.reduce((s: number, r: any) => s + r.oppPts, 0)

  const myName = profilesMap?.[userId]?.nickname || me?.display_name || 'You'
  const oppName = opp ? (profilesMap?.[opponent]?.nickname || opp?.display_name) : '...'

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>⚔️ HEAD TO HEAD</h3>
        <select className="input" style={{ background: '#1a1a2e', color: '#fff', width: 'auto', flex: 1, maxWidth: 200 }}
          value={opponent} onChange={e => setOpponent(e.target.value)}>
          <option value="">Select opponent...</option>
          {others.map((r: any) => (
            <option key={r.user_id} value={r.user_id}>
              {profilesMap?.[r.user_id]?.nickname || r.display_name}
            </option>
          ))}
        </select>
      </div>

      {!opponent ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
          {t.lang === 'pt' ? 'Escolha alguém para comparar' : 'Pick someone to compare against'}
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#4ade80' }}>{myName} (you)</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: '#4ade80', lineHeight: 1 }}>{myWins}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{myTotal} pts</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem' }}>DRAWS</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#fbbf24' }}>{draws}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)' }}>{results.length} matches</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f87171' }}>{oppName}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: '#f87171', lineHeight: 1 }}>{oppWins}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{oppTotal} pts</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {results.slice().reverse().map(({ match: m, myTip, oppTip, myPts, oppPts, winner }: any) => (
              <div key={m.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                gap: '0.5rem', alignItems: 'center', padding: '0.6rem 0.75rem',
                borderRadius: 8, fontSize: '0.78rem',
                background: winner === 'me' ? 'rgba(74,222,128,0.05)' : winner === 'opp' ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {winner === 'me' && <span style={{ color: '#4ade80', fontWeight: 700 }}>▶</span>}
                  <span style={{ fontFamily: 'var(--font-display)', color: myTip ? (myPts > 0 ? '#4ade80' : '#f87171') : 'rgba(255,255,255,0.2)' }}>
                    {myTip ? `${myTip.tip_home}–${myTip.tip_away}` : '–'}
                  </span>
                  {myPts > 0 && <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>+{myPts}</span>}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                    {m.home_team.split(' ').pop()} {m.home_score}–{m.away_score} {m.away_team.split(' ').pop()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                  {oppPts > 0 && <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>+{oppPts}</span>}
                  <span style={{ fontFamily: 'var(--font-display)', color: oppTip ? (oppPts > 0 ? '#f87171' : 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.2)' }}>
                    {oppTip ? `${oppTip.tip_home}–${oppTip.tip_away}` : '–'}
                  </span>
                  {winner === 'opp' && <span style={{ color: '#f87171', fontWeight: 700 }}>◀</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
