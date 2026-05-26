'use client'
import { useState } from 'react'
import { useLang } from '../../../LanguageContext'

export default function ShareCard({ row, leaderboard, profilesMap, tournament }: any) {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)
  if (!row) return null

  const rank = [...leaderboard].sort((a: any, b: any) => b.total_points - a.total_points)
    .findIndex((r: any) => r.user_id === row.user_id) + 1
  const name = profilesMap?.[row.user_id]?.nickname || row.display_name || 'Player'
  const total = leaderboard.length
  const exact = row.exact_scores ?? 0
  const winners = Math.max(0, (row.correct_winners ?? 0) - (row.correct_goal_diff ?? 0))
  const gd = Math.max(0, (row.correct_goal_diff ?? 0) - exact)
  const MEDAL = ['🥇', '🥈', '🥉']
  const medal = rank <= 3 ? MEDAL[rank - 1] : `#${rank}`

  const appName = t.lang === 'pt' ? 'Bolão das Estrelas' : 'Tipping Stars'
  const tourName = tournament?.name || appName
  const text = medal + ' ' + name + ' | ' + tourName + ' 🌍\n'
    + '📊 ' + row.total_points + ' pts · Rank ' + rank + '/' + total + '\n'
    + '🎯 ' + exact + ' exact · ⚖️ ' + gd + ' goal diff · ✅ ' + winners + ' winners\n'
    + '⭐ tipping-stars.vercel.app'

  function copyToClipboard() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>📤 SHARE YOUR STATS</h3>
      <div className="card" style={{ padding: '1.25rem', marginBottom: '0.75rem', background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)' }}>
        <pre style={{ fontFamily: 'inherit', fontSize: '0.85rem', lineHeight: 1.7, color: '#e8f5ee', margin: 0, whiteSpace: 'pre-wrap' }}>{text}</pre>
      </div>
      <button onClick={copyToClipboard} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
        {copied ? t.lang === 'pt' ? '✅ Copiado! Cole no WhatsApp' : '✅ Copied! Paste in WhatsApp' : t.lang === 'pt' ? '📋 Copiar' : '📋 Copy to clipboard'}
      </button>
    </div>
  )
}
