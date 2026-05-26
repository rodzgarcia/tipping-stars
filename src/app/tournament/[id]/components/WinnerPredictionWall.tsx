'use client'
import { TEAM_FLAGS } from '@/lib/constants'

export default function WinnerPredictionWall({ allTournamentTips, profilesMap, leaderboard, t }: any) {
  if (!allTournamentTips?.length) return null
  const tips = allTournamentTips.filter((tt: any) => tt.predicted_winner)
  if (!tips.length) return null

  const byWinner: Record<string, any[]> = {}
  tips.forEach((tt: any) => {
    const w = tt.predicted_winner
    if (!byWinner[w]) byWinner[w] = []
    const name = profilesMap?.[tt.user_id]?.nickname || profilesMap?.[tt.user_id]?.display_name || '?'
    byWinner[w].push(name)
  })
  const sorted = Object.entries(byWinner).sort((a, b) => b[1].length - a[1].length)

  return (
    <div className="card" style={{ overflow: 'hidden', marginBottom: '1.25rem' }}>
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--dark-border)', background: 'rgba(251,191,36,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em', color: '#fbbf24' }}>
          🏆 {t.lang === 'pt' ? 'QUEM VAI GANHAR A COPA?' : 'WHO WINS THE WORLD CUP?'}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{tips.length} predictions</span>
      </div>
      <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {sorted.map(([team, names]) => {
          const code = TEAM_FLAGS[team]
          const pct = Math.round((names.length / tips.length) * 100)
          return (
            <div key={team}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {code && <img src={`https://flagcdn.com/w40/${code}.png`} style={{ height: 16, borderRadius: 2 }} alt="" />}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1 }}>{team}</span>
                <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontFamily: 'var(--font-display)' }}>{names.length} pick{names.length > 1 ? 's' : ''}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: '0.2rem' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(251,191,36,0.5)', borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{names.join(', ')}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
