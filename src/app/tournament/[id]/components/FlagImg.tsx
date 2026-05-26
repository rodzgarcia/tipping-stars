'use client'
import { TEAM_FLAGS } from '@/lib/constants'

export default function FlagImg({ team, size = 20 }: { team: string, size?: number }) {
  const code = TEAM_FLAGS[team]
  if (!code) return null
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={team}
      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4, borderRadius: 2 }}
    />
  )
}
