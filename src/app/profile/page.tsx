'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang, LangSwitcher } from '../LanguageContext'
import { ChevronLeft, Camera } from 'lucide-react'

const POSITION_NAMES: Record<string, string> = {
  ST: 'Striker', CF: 'Centre Forward', LW: 'Left Winger', RW: 'Right Winger',
  CAM: 'Attacking Mid', CM: 'Central Mid', CDM: 'Defensive Mid',
  LB: 'Left Back', RB: 'Right Back', CB: 'Centre Back', GK: 'Goalkeeper', SS: 'Second Striker'
}
const POSITION_EMOJI: Record<string, string> = {
  ST: '⚽', CF: '🎯', LW: '💨', RW: '💨', CAM: '🪄',
  CM: '🔄', CDM: '🛡️', LB: '🏃', RB: '🏃', CB: '🧱', GK: '🧤', SS: '⚡'
}
const TEAM_FLAGS: Record<string, string> = {
  'Argentina':'ar','France':'fr','England':'gb-eng','Spain':'es','Brazil':'br',
  'Portugal':'pt','Netherlands':'nl','Germany':'de','Italy':'it','Morocco':'ma',
  'Croatia':'hr','United States':'us','USA':'us','Mexico':'mx','Japan':'jp',
  'Uruguay':'uy','Colombia':'co','Senegal':'sn','Switzerland':'ch','Australia':'au',
  'South Korea':'kr','Ecuador':'ec','Canada':'ca','Turkey':'tr','Ukraine':'ua',
  'Poland':'pl','Serbia':'rs','Scotland':'gb-sct','Wales':'gb-wls','Belgium':'be',
  'Ghana':'gh','Tunisia':'tn','Egypt':'eg','Algeria':'dz',
  'Norway':'no','Sweden':'se','Austria':'at','Czech Republic':'cz','Czechia':'cz',
  'Iran':'ir','Saudi Arabia':'sa','Qatar':'qa','Iraq':'iq','Jordan':'jo',
  'New Zealand':'nz','Paraguay':'py','Bolivia':'bo','Peru':'pe',
  'Chile':'cl','Venezuela':'ve','Honduras':'hn','Panama':'pa','Costa Rica':'cr',
  'Jamaica':'jm','DR Congo':'cd','Ivory Coast':'ci','Mali':'ml','Cape Verde':'cv',
  'South Africa':'za','Cameroon':'cm','Nigeria':'ng','Haiti':'ht','Uzbekistan':'uz',
  'Slovakia':'sk','Slovenia':'si','Hungary':'hu','Greece':'gr','Albania':'al',
  'Bosnia and Herzegovina':'ba','Curacao':'cw','Trinidad and Tobago':'tt',
}

export default function ProfilePage() {
  const { t } = useLang()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [leaderboardRows, setLeaderboardRows] = useState<any[]>([])
  const [allTips, setAllTips] = useState<any[]>([])
  const [tournaments, setTournaments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedTourId, setSelectedTourId] = useState<string>('')
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setUser(user)

    const [profRes, lbRes, tipsRes, toursRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('leaderboard').select('*').eq('user_id', user.id),
      supabase.from('match_tips').select('*, match:matches(round, kickoff_at, status, home_score, away_score, home_team, away_team)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tournaments').select('id, name'),
    ])

    setProfile(profRes.data)
    setLeaderboardRows(lbRes.data || [])
    setAllTips(tipsRes.data || [])
    setSelectedTourId(lbRes.data?.[0]?.tournament_id || '')
    const tourMap: Record<string, string> = {}
    toursRes.data?.forEach((t: any) => { tourMap[t.id] = t.name })
    setTournaments(toursRes.data || [])
    setLoading(false)
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      setProfile((p: any) => ({ ...p, avatar_url: publicUrl }))
    }
    setUploading(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--green-light)', letterSpacing: '0.1em' }}>LOADING...</div>
    </div>
  )

  // Use selected tournament for stats
  const selectedRow = leaderboardRows.find((r: any) => r.tournament_id === selectedTourId) || leaderboardRows[0]
  const totalPts = selectedRow?.total_points || 0
  const totalTips = selectedRow?.tips_submitted || 0
  const totalExact = selectedRow?.exact_scores || 0
  const totalWinners = selectedRow?.correct_winners || 0
  const totalGD = selectedRow?.correct_goal_diff || 0
  const winnerRate = totalTips > 0 ? Math.round((totalWinners / totalTips) * 100) : 0
  const exactRate = totalTips > 0 ? Math.round((totalExact / totalTips) * 100) : 0

  // Last 10 form
  const completed = allTips
    .filter((tp: any) => tp.match?.status === 'completed')
    .slice(0, 10)
  const form = completed.map((tp: any) => {
    if (Number(tp.pts_exact_score) > 0) return { icon: '🎯', label: 'Exact', color: '#fbbf24' }
    if (Number(tp.pts_goal_diff) > 0) return { icon: '⚖️', label: 'Goal diff', color: '#60a5fa' }
    if (Number(tp.pts_winner) > 0) return { icon: '✅', label: 'Winner', color: '#4ade80' }
    return { icon: '❌', label: 'Miss', color: 'rgba(255,255,255,0.2)' }
  })

  // Streak
  let streak = 0
  for (const tp of allTips.filter((tp: any) => tp.match?.status === 'completed')) {
    if (Number(tp.pts_winner) > 0) streak++
    else break
  }

  const flagCode = TEAM_FLAGS[profile?.jersey_team]
  const posEmoji = POSITION_EMOJI[profile?.tip_position] || '⚽'
  const posName = POSITION_NAMES[profile?.tip_position] || profile?.tip_position || '—'

  return (
    <div className="min-h-screen" style={{ background: 'var(--dark)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--dark-border)', background: 'rgba(10,15,13,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}><ChevronLeft size={20} /></Link>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', flex: 1 }}>MY PROFILE</span>
          <LangSwitcher />
        </div>
      </header>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

        {/* Hero card */}
        <div className="card" style={{ padding: '2rem', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          {/* Background flag watermark */}
          {flagCode && (
            <img src={`https://flagcdn.com/w160/${flagCode}.png`} alt="" style={{
              position: 'absolute', right: -10, top: -10, width: 120, opacity: 0.06, filter: 'blur(2px)', pointerEvents: 'none'
            }} />
          )}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', position: 'relative' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.08)', border: '3px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : '👤'}
              </div>
              <label style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, background: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--dark-card)' }}>
                <Camera size={13} color="#0a0f0d" />
                <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Name + identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.04em', color: '#e8f5ee', lineHeight: 1.1 }}>
                {profile?.nickname || profile?.display_name}
              </div>
              {profile?.nickname && (
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.15rem' }}>{profile.display_name}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {flagCode && <img src={`https://flagcdn.com/w40/${flagCode}.png`} style={{ height: 18, borderRadius: 3 }} alt={profile?.jersey_team} />}
                <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 600 }}>{profile?.jersey_team || '—'}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                <span style={{ fontSize: '0.85rem' }}>{posEmoji} {posName}</span>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>
                🔒 Team and position permanently assigned
              </div>
            </div>
          </div>
        </div>

        {/* Tournament selector — if in multiple tournaments */}
        {leaderboardRows.length > 1 && (
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {leaderboardRows.map((row: any) => {
              const tname = tournaments.find((t: any) => t.id === row.tournament_id)?.name || 'Tournament'
              return (
                <button key={row.tournament_id} onClick={() => setSelectedTourId(row.tournament_id)} style={{
                  padding: '0.35rem 0.85rem', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer',
                  border: `1px solid ${selectedTourId === row.tournament_id ? '#4ade80' : 'rgba(255,255,255,0.12)'}`,
                  background: selectedTourId === row.tournament_id ? 'rgba(74,222,128,0.1)' : 'transparent',
                  color: selectedTourId === row.tournament_id ? '#4ade80' : 'rgba(255,255,255,0.5)',
                }}>{tname}</button>
              )
            })}
          </div>
        )}

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: t.lang === 'pt' ? 'Pontos' : 'Points', value: totalPts, color: '#fbbf24', icon: '⭐' },
            { label: t.lang === 'pt' ? 'Palpites' : 'Tips', value: totalTips, color: '#e8f5ee', icon: '📝' },
            { label: t.lang === 'pt' ? '🎯 Exatos' : '🎯 Exact Scores', value: totalExact, color: '#fbbf24', icon: '' },
            { label: t.lang === 'pt' ? '✅ Vencedores' : '✅ Winners', value: Math.max(0, totalWinners - totalGD), color: '#4ade80', icon: '' },
            { label: t.lang === 'pt' ? 'Acertos' : 'Win Accuracy', value: `${winnerRate}%`, color: winnerRate >= 60 ? '#4ade80' : '#e8f5ee', icon: '📊' },
            { label: t.lang === 'pt' ? 'Taxa Exata' : 'Exact Rate', value: `${exactRate}%`, color: exactRate >= 15 ? '#fbbf24' : '#e8f5ee', icon: '🎯' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: '0.875rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.25rem', lineHeight: 1.2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Current streak */}
        {streak > 0 && (
          <div className="card" style={{ padding: '0.875rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <span style={{ fontSize: '1.5rem' }}>{streak >= 5 ? '⚡' : '🔥'}</span>
            <div>
              <div style={{ fontWeight: 600, color: '#fbbf24' }}>{streak} correct pick{streak > 1 ? 's' : ''} in a row!</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{streak >= 5 ? t.lang === 'pt' ? 'Imparável!' : 'Unstoppable!' : streak >= 3 ? 'On fire!' : t.lang === 'pt' ? 'Continue assim' : 'Keep it going'}</div>
            </div>
          </div>
        )}

        {/* Form guide */}
        {form.length > 0 && (
          <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>LAST {form.length} RESULTS</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {form.map((f: any, i: number) => (
                <div key={i} title={f.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: '1.2rem' }}>{f.icon}</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.color }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)' }}>
              <span>🎯 Exact</span><span>⚖️ Goal diff</span><span>✅ Winner</span><span>❌ Miss</span>
            </div>
          </div>
        )}

        {/* Per-tournament breakdown */}
        {leaderboardRows.length > 0 && (
          <div className="card" style={{ overflow: 'hidden', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--dark-border)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
              TOURNAMENT BREAKDOWN
            </div>
            {leaderboardRows.map((row: any) => {
              const tourName = tournaments.find((t: any) => t.id === row.tournament_id)?.name || 'Tournament'
              const winRate = row.tips_submitted > 0 ? Math.round((row.correct_winners / row.tips_submitted) * 100) : 0
              return (
                <div key={row.tournament_id} style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--dark-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#60a5fa' }}>{tourName}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: '#fbbf24' }}>{row.total_points} pts</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', flexWrap: 'wrap' }}>
                    <span>🎯 {row.exact_scores} exact</span>
                    <span>✅ {row.correct_winners} winners</span>
                    <span>📝 {row.tips_submitted} tips</span>
                    <span>📊 {winRate}% accuracy</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Recent tips */}
        {allTips.filter((tp: any) => tp.match?.status === 'completed').length > 0 && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--dark-border)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
              RECENT TIPS
            </div>
            {allTips.filter((tp: any) => tp.match?.status === 'completed').slice(0, 10).map((tp: any) => {
              const m = tp.match
              const pts = Number(tp.pts_with_multiplier) || 0
              const isExact = Number(tp.pts_exact_score) > 0
              const isGD = Number(tp.pts_goal_diff) > 0 && !isExact
              const isWinner = Number(tp.pts_winner) > 0 && !isGD && !isExact
              const icon = isExact ? '🎯' : isGD ? '⚖️' : isWinner ? '✅' : '❌'
              const color = isExact ? '#fbbf24' : isGD ? '#60a5fa' : isWinner ? '#4ade80' : 'rgba(255,255,255,0.2)'
              return (
                <div key={tp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--dark-border)', fontSize: '0.82rem' }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#e8f5ee' }}>
                      {m?.home_team} vs {m?.away_team}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                      Result: {m?.home_score}–{m?.away_score} · Tipped: {tp.tip_home}–{tp.tip_away}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', color, fontWeight: 700, flexShrink: 0 }}>
                    {pts > 0 ? `+${pts}` : '0'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
