'use client'

export default function TournamentProgress({ matches, t }: any) {
  const WC_TOTAL = 104
  const STAGES = [
    { key: 'group',       label: t.lang === 'pt' ? 'Grupo' : 'Group', total: 72, color: '#4ade80' },
    { key: 'r32',         label: 'R32', total: 16, color: '#60a5fa' },
    { key: 'r16',         label: 'R16', total: 8,  color: '#a78bfa' },
    { key: 'qf',          label: t.lang === 'pt' ? 'QF' : 'QF', total: 4,  color: '#f59e0b' },
    { key: 'sf',          label: t.lang === 'pt' ? 'SF' : 'SF', total: 2,  color: '#f97316' },
    { key: 'third_place', label: t.lang === 'pt' ? '3º' : '3rd', total: 1,  color: '#6b7280' },
    { key: 'final',       label: t.lang === 'pt' ? 'Final' : 'Final', total: 1,  color: '#fbbf24' },
  ]

  const completedByStage: Record<string, number> = {}
  matches.forEach((m: any) => {
    if (m.status === 'completed') {
      completedByStage[m.round] = (completedByStage[m.round] || 0) + 1
    }
  })

  const totalCompleted = Object.values(completedByStage).reduce((s: number, n: any) => s + n, 0)
  const overallPct = Math.round((totalCompleted / WC_TOTAL) * 100)

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>
          {t.lang === 'pt' ? 'PROGRESSO DA COPA' : 'WORLD CUP PROGRESS'}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
          {totalCompleted}/{WC_TOTAL} {t.lang === 'pt' ? 'jogos' : 'matches'} · {overallPct}%
        </span>
      </div>

      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'rgba(255,255,255,0.07)', gap: 1 }}>
        {STAGES.map(stage => {
          const stageWidthPct = (stage.total / WC_TOTAL) * 100
          const completed = Math.min(completedByStage[stage.key] || 0, stage.total)
          const fillPct = (completed / stage.total) * 100
          return (
            <div key={stage.key} style={{ width: `${stageWidthPct}%`, position: 'relative', background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${fillPct}%`,
                background: stage.color,
                borderRadius: 2,
                transition: 'width 0.5s ease',
              }} />
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
        {STAGES.map(stage => {
          const completed = Math.min(completedByStage[stage.key] || 0, stage.total)
          if (completed === 0 && stage.key !== 'group') return null
          return (
            <span key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: stage.color, display: 'inline-block', flexShrink: 0 }} />
              {stage.label} {completed}/{stage.total}
            </span>
          )
        })}
      </div>
    </div>
  )
}
