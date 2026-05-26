'use client'

export function calcAchievements(row: any, allTips: any[], leaderboard: any[]): { icon: string, label: string, desc: string, earned: boolean }[] {
  const userTips = allTips.filter((tp: any) => tp.user_id === row.user_id)
  const completed = userTips.filter((tp: any) => tp.match?.status === 'completed')
  const exactScores = completed.filter((tp: any) => Number(tp.pts_exact_score) > 0).length
  const correctWinners = completed.filter((tp: any) => Number(tp.pts_winner) > 0).length
  const total = completed.length

  const sorted = [...completed].sort((a: any, b: any) => new Date(b.match?.kickoff_at || 0).getTime() - new Date(a.match?.kickoff_at || 0).getTime())
  let currentStreak = 0
  for (const tp of sorted) {
    if (Number(tp.pts_winner) > 0) currentStreak++
    else break
  }

  const rank = [...leaderboard].sort((a: any, b: any) => b.total_points - a.total_points).findIndex((r: any) => r.user_id === row.user_id) + 1

  return [
    { icon: '🎯', label: 'Sniper',       desc: 'First exact score',           earned: exactScores >= 1 },
    { icon: '🔫', label: 'Sharp Shooter', desc: '5 exact scores',              earned: exactScores >= 5 },
    { icon: '💎', label: 'Diamond Eye',  desc: '10 exact scores',             earned: exactScores >= 10 },
    { icon: '🔥', label: 'On Fire',      desc: '3 correct picks in a row',    earned: currentStreak >= 3 },
    { icon: '⚡', label: 'Unstoppable',  desc: '5 correct picks in a row',    earned: currentStreak >= 5 },
    { icon: '🦁', label: 'Brave Heart',  desc: 'Tipped an upset (< 30% consensus correct)', earned: false },
    { icon: '📊', label: 'Consistent',   desc: '80%+ correct winner rate (min 10 tips)', earned: total >= 10 && correctWinners / total >= 0.8 },
    { icon: '🏆', label: 'Top Dog',      desc: 'Sitting in 1st place',        earned: rank === 1 },
    { icon: '🥈', label: 'Silver Fox',   desc: 'Sitting in 2nd place',        earned: rank === 2 },
    { icon: '💪', label: 'Comeback Kid', desc: 'Moved up 3+ spots this week', earned: false },
    { icon: '😬', label: 'Unlucky',      desc: '5 wrong tips in a row',       earned: (() => { let s = 0; for (const tp of sorted) { if (Number(tp.pts_with_multiplier) === 0) s++; else break }; return s >= 5 })() },
    { icon: '🌟', label: 'All In',       desc: 'Tipped every single match',   earned: row.tips_submitted > 0 && row.tips_submitted >= (leaderboard[0]?.tips_submitted || 0) },
  ]
}

export default function AchievementBadges({ row, allTips, leaderboard, compact = false }: any) {
  const achievements = calcAchievements(row, allTips, leaderboard)
  const earned = achievements.filter(a => a.earned)
  if (earned.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: compact ? '0.25rem' : '0.5rem' }}>
      {earned.map(a => (
        <span key={a.label} title={`${a.label}: ${a.desc}`} style={{
          fontSize: compact ? '0.68rem' : '0.72rem',
          padding: compact ? '0.1rem 0.35rem' : '0.15rem 0.5rem',
          borderRadius: 10,
          background: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.2)',
          color: '#fbbf24',
          cursor: 'default',
          whiteSpace: 'nowrap',
        }}>
          {a.icon} {a.label}
        </span>
      ))}
    </div>
  )
}
