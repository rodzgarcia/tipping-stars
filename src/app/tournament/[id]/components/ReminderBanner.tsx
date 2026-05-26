'use client'
import { useState, useEffect } from 'react'

export default function ReminderBanner({ matches, myTips, tournament, t }: any) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const lockMins = tournament?.tip_lock_minutes ?? 120

  const urgent = matches.filter((m: any) => {
    if (m.status !== 'upcoming') return false
    if (m.tip_lock_override) return false
    if (myTips[m.id]) return false
    const lockTime = new Date(new Date(m.kickoff_at).getTime() - lockMins * 60 * 1000)
    const minsLeft = (lockTime.getTime() - now.getTime()) / 60000
    return minsLeft > 0 && minsLeft <= 24 * 60
  }).sort((a: any, b: any) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())

  if (urgent.length === 0) return null

  const next = urgent[0]
  const lockTime = new Date(new Date(next.kickoff_at).getTime() - lockMins * 60 * 1000)
  const minsLeft = Math.round((lockTime.getTime() - now.getTime()) / 60000)
  const hoursLeft = Math.floor(minsLeft / 60)
  const minsRem = minsLeft % 60
  const isRed = minsLeft < 120
  const isYellow = minsLeft < 360 && !isRed

  const countdownStr = hoursLeft > 0
    ? `${hoursLeft}h ${minsRem}m`
    : `${minsLeft}m`

  return (
    <div style={{
      margin: '0 0 1rem',
      padding: '0.75rem 1rem',
      borderRadius: 10,
      background: isRed ? 'rgba(239,68,68,0.08)' : isYellow ? 'rgba(251,191,36,0.08)' : 'rgba(74,222,128,0.06)',
      border: `1px solid ${isRed ? 'rgba(239,68,68,0.25)' : isYellow ? 'rgba(251,191,36,0.25)' : 'rgba(74,222,128,0.15)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <span style={{ fontSize: '1.1rem' }}>{isRed ? '🚨' : isYellow ? '⚠️' : '⏰'}</span>
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isRed ? '#f87171' : isYellow ? '#fbbf24' : '#4ade80' }}>
            {urgent.length === 1
              ? `${next.home_team} vs ${next.away_team} — tip lock in ${countdownStr}`
              : `${urgent.length} matches closing soon — next: ${next.home_team} vs ${next.away_team} in ${countdownStr}`}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            {urgent.length > 1
              ? urgent.slice(1, 3).map((m: any) => `${m.home_team} vs ${m.away_team}`).join(' · ') + (urgent.length > 3 ? ` +${urgent.length - 3} more` : '')
              : t.lang === 'pt' ? 'Você ainda não apostou neste jogo' : "You haven't tipped this match yet"}
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          const btn = document.querySelector('[data-tab="tips"]') as HTMLElement
          if (btn) btn.click()
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        style={{
          padding: '0.35rem 0.85rem', borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0,
          background: isRed ? 'rgba(239,68,68,0.15)' : isYellow ? 'rgba(251,191,36,0.15)' : 'rgba(74,222,128,0.15)',
          border: `1px solid ${isRed ? 'rgba(239,68,68,0.3)' : isYellow ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)'}`,
          color: isRed ? '#f87171' : isYellow ? '#fbbf24' : '#4ade80',
        }}
      >
        {t.lang === 'pt' ? 'Apostar agora →' : 'Tip now →'}
      </button>
    </div>
  )
}
