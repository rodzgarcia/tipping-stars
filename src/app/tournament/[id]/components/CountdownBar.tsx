'use client'
import { useState, useEffect } from 'react'

export default function CountdownBar({ matches, myTips, tournament, t }: any) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  const lockMins = tournament?.tip_lock_minutes ?? 120

  const next = matches
    .filter((m: any) => {
      if (m.status !== 'upcoming') return false
      if (m.tip_lock_override) return false
      const lockTime = new Date(new Date(m.kickoff_at).getTime() - lockMins * 60 * 1000)
      return lockTime > now
    })
    .sort((a: any, b: any) => {
      const la = new Date(a.kickoff_at).getTime() - lockMins * 60 * 1000
      const lb = new Date(b.kickoff_at).getTime() - lockMins * 60 * 1000
      return la - lb
    })[0]

  if (!next) return null

  const lockTime = new Date(new Date(next.kickoff_at).getTime() - lockMins * 60 * 1000)
  const secsLeft = Math.max(0, Math.floor((lockTime.getTime() - now.getTime()) / 1000))

  const days = Math.floor(secsLeft / 86400)
  const hours = Math.floor((secsLeft % 86400) / 3600)
  const mins = Math.floor((secsLeft % 3600) / 60)
  const secs = secsLeft % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  const isUrgent = secsLeft < 7200
  const isWarning = secsLeft < 86400

  let timeStr: string
  if (days > 0) {
    timeStr = days + 'd ' + hours + 'h'
  } else if (hours > 0) {
    timeStr = hours + 'h ' + pad(mins) + 'm'
  } else {
    timeStr = pad(mins) + ':' + pad(secs)
  }

  const color = isUrgent ? '#f87171' : isWarning ? '#fbbf24' : '#4ade80'
  const bg = isUrgent ? 'rgba(239,68,68,0.08)' : isWarning ? 'rgba(251,191,36,0.06)' : 'rgba(74,222,128,0.05)'
  const border = isUrgent ? 'rgba(239,68,68,0.2)' : isWarning ? 'rgba(251,191,36,0.15)' : 'rgba(74,222,128,0.15)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.5rem 0.85rem', borderRadius: 8, marginBottom: '0.75rem',
      background: bg, border: `1px solid ${border}`,
    }}>
      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
        {t?.lang === 'pt' ? 'Próximo bloqueio:' : 'Next lock:'}
      </span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e8f5ee', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {next.home_team} vs {next.away_team}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color, flexShrink: 0, letterSpacing: '0.03em' }}>
        {timeStr}
      </span>
    </div>
  )
}
