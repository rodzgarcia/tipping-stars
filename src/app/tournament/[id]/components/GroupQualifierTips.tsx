'use client'
import { useState } from 'react'
import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { GROUPS, GROUP_LOCK_TIMES, formatLocalTime } from '@/lib/constants'
import FlagImg from './FlagImg'

export default function GroupQualifierTips({ tournament, userId, existing, onSave, t, matches, allQualifierTips, profilesMap }: any) {
  const supabase = createClient()
  const [localPicks, setLocalPicks] = useState<Record<string, { first?: string, second?: string }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  function getVal(group: string, pos: 'first' | 'second'): string {
    if (localPicks[group]?.[pos] !== undefined) return localPicks[group][pos] || ''
    const g = group.toLowerCase()
    return existing?.[`tip_group_${g}_${pos === 'first' ? '1' : '2'}`] || ''
  }

  function setPick(group: string, pos: 'first' | 'second', val: string) {
    setLocalPicks(prev => ({ ...prev, [group]: { ...prev[group], [pos]: val } }))
  }

  const ptsPerGroup = tournament.pts_qualify || 0
  const dbLocked = tournament?.qualifiers_locked || false

  function isGroupLocked(group: string) {
    if (dbLocked) return true
    const lockMins = tournament?.tip_lock_minutes ?? 120
    const firstMatch = (matches || [])
      .filter((m: any) => m.round === 'group')
      .sort((a: any, b: any) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())[0]
    if (!firstMatch) return false
    return new Date() >= new Date(new Date(firstMatch.kickoff_at).getTime() - lockMins * 60 * 1000)
  }

  async function save() {
    setSaving(true)
    const { data: memberships } = await supabase
      .from('tournament_members')
      .select('tournament_id')
      .eq('user_id', userId)
      .eq('status', 'approved')

    const tournamentIds = memberships?.map((m: any) => m.tournament_id) || [tournament.id]
    const picks = {
      p_a1: getVal('A','first'), p_a2: getVal('A','second'),
      p_b1: getVal('B','first'), p_b2: getVal('B','second'),
      p_c1: getVal('C','first'), p_c2: getVal('C','second'),
      p_d1: getVal('D','first'), p_d2: getVal('D','second'),
      p_e1: getVal('E','first'), p_e2: getVal('E','second'),
      p_f1: getVal('F','first'), p_f2: getVal('F','second'),
      p_g1: getVal('G','first'), p_g2: getVal('G','second'),
      p_h1: getVal('H','first'), p_h2: getVal('H','second'),
      p_i1: getVal('I','first'), p_i2: getVal('I','second'),
      p_j1: getVal('J','first'), p_j2: getVal('J','second'),
      p_k1: getVal('K','first'), p_k2: getVal('K','second'),
      p_l1: getVal('L','first'), p_l2: getVal('L','second'),
    }
    let anyError = null
    for (const tid of tournamentIds) {
      const result = await supabase.rpc('save_qualifier_picks', {
        p_user_id: userId,
        p_tournament_id: tid,
        ...picks,
      })
      if (result.error) anyError = result.error
    }
    if (anyError) {
      setSaveError(anyError.message)
      setSaving(false)
      return
    }
    setSaveError('')
    setSaved(true); setTimeout(() => setSaved(false), 2500)
    setSaving(false)
    setLocalPicks({})
    onSave()
  }

  const unlockedGroups = Object.keys(GROUPS).filter(g => !isGroupLocked(g))
  const lockedGroups = Object.keys(GROUPS).filter(g => isGroupLocked(g))

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>{t.groupQualifiersTitle}</h2>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>{t.groupQualifiersDesc}</p>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.3rem' }}>
          <span style={{ color: 'var(--gold)' }}>{t.fullPoints}</span> {t.correctTeamPosition} · <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t.halfPoints}</span> {t.correctTeamWrongPosition}
        </p>
        {ptsPerGroup > 0 && <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>{ptsPerGroup} {t.pts} per correct team</div>}
      </div>

      {unlockedGroups.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {unlockedGroups.map(group => {
            const teams = GROUPS[group]
            const lockTime = GROUP_LOCK_TIMES[group]
            return (
              <div key={group} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'var(--gold)' }}>
                    {t.lang === 'pt' ? `GRUPO ${group}` : `GROUP ${group}`}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                    {t.locksAt} {formatLocalTime(new Date(new Date(lockTime).getTime() - 2*60*60*1000).toISOString())}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.25rem' }}>🥇 {t.firstPlace}</label>
                    <select className="input" style={{ background: "#1a1a2e", color: "#fff" }} value={getVal(group, 'first')} onChange={e => setPick(group, 'first', e.target.value)}>
                      <option value="">{t.selectTeam}</option>
                      {teams.map(tm => <option key={tm} value={tm} disabled={tm === getVal(group, 'second')}>{tm}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.25rem' }}>🥈 {t.secondPlace}</label>
                    <select className="input" style={{ background: "#1a1a2e", color: "#fff" }} value={getVal(group, 'second')} onChange={e => setPick(group, 'second', e.target.value)}>
                      <option value="">{t.selectTeam}</option>
                      {teams.map(tm => <option key={tm} value={tm} disabled={tm === getVal(group, 'first')}>{tm}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {unlockedGroups.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
            {saved ? '✔ ' + t.savedBang : saving ? t.saving : t.saveQualifierPicks}
          </button>
          {saved && (
            <span style={{ fontSize: '0.85rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: 5 }}>
              ✔ {t.lang === 'pt' ? 'Palpites guardados com sucesso!' : 'Your qualifier picks have been saved!'}
            </span>
          )}
          {saveError && (
            <span style={{ color: '#f87171', fontSize: '0.85rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
              {saveError}
            </span>
          )}
        </div>
      )}

      {lockedGroups.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>{t.lockedGroups}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {lockedGroups.map(group => {
              const first = getVal(group, 'first')
              const second = getVal(group, 'second')
              return (
                <div key={group} className="card" style={{ padding: '1.25rem', opacity: 0.7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>
                      {t.lang === 'pt' ? `GRUPO ${group}` : `GROUP ${group}`}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'rgba(255,158,11,0.7)' }}><Lock size={10} />{t.locked}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                    <div>🥇 {first ? <span><><FlagImg team={first} />{first}</></span> : <span style={{ color: 'rgba(255,255,255,0.25)' }}>{t.noPick}</span>}</div>
                    <div style={{ marginTop: '0.25rem' }}>🥈 {second ? <span><><FlagImg team={second} />{second}</></span> : <span style={{ color: 'rgba(255,255,255,0.25)' }}>{t.noPick}</span>}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
