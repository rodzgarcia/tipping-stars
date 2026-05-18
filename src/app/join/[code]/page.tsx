'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { useLang } from '@/app/LanguageContext'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLang()
  const isPt = t.lang === 'pt'

  const [status, setStatus] = useState<'loading' | 'joining' | 'done' | 'error' | 'already' | 'nickname_required'>('loading')
  const [message, setMessage] = useState('')
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Not logged in — redirect to auth with invite code
      router.push(`/auth?invite=${code}`)
      return
    }

    // Check if they have a nickname
    const { data: profile } = await supabase.from('profiles').select('nickname, display_name').eq('id', user.id).single()
    if (!profile?.nickname?.trim()) {
      setStatus('nickname_required')
      return
    }

    await joinTournament(user.id)
  }

  async function saveNicknameAndJoin() {
    if (!nickname.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/auth?invite=${code}`); return }

    await supabase.from('profiles').update({ nickname: nickname.trim() }).eq('id', user.id)
    await joinTournament(user.id)
    setSaving(false)
  }

  async function joinTournament(userId: string) {
    setStatus('joining')
    // Find tournament by invite code
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, name')
      .eq('invite_code', code)
      .single()

    if (!tournament) {
      setStatus('error')
      setMessage(isPt ? 'Link de convite inválido ou expirado.' : 'Invalid or expired invite link.')
      return
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('tournament_members')
      .select('id, status')
      .eq('tournament_id', tournament.id)
      .eq('user_id', userId)
      .single()

    if (existing) {
      setStatus('already')
      setMessage(isPt
        ? `Você já está no ${tournament.name} (${existing.status === 'approved' ? 'aprovado' : 'aguardando aprovação'}).`
        : `You're already in ${tournament.name} (${existing.status === 'approved' ? 'approved' : 'pending approval'}).`)
      setTimeout(() => router.push(`/tournament/${tournament.id}`), 2000)
      return
    }

    // Insert pending membership
    const { error } = await supabase.from('tournament_members').insert({
      tournament_id: tournament.id,
      user_id: userId,
      status: 'pending',
      joined_at: new Date().toISOString()
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    setStatus('done')
    setMessage(isPt
      ? `Pedido enviado para ${tournament.name}! Aguarde a aprovação do admin.`
      : `Join request sent for ${tournament.name}! Waiting for admin approval.`)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: 'var(--green)', borderRadius: 16, marginBottom: '1.5rem' }}>
          <Star size={24} fill="white" color="white" />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '0.08em', marginBottom: '1.5rem' }}>
          {isPt ? 'BOLÃO DAS ESTRELAS' : 'TIPPING STARS'}
        </h1>

        {status === 'loading' && (
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>{isPt ? 'Carregando...' : 'Loading...'}</p>
        )}

        {status === 'nickname_required' && (
          <div className="card" style={{ padding: '1.5rem', textAlign: 'left' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.06em', marginBottom: '0.5rem', color: '#fbbf24' }}>
              {isPt ? 'APELIDO NECESSÁRIO' : 'NICKNAME REQUIRED'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {isPt
                ? 'Antes de entrar no torneio, escolha um apelido. Será exibido no placar.'
                : 'Before joining, pick a nickname. This is how you\'ll appear on the leaderboard.'}
            </p>
            <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
              {isPt ? 'Apelido' : 'Nickname'} <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              value={nickname}
              onChange={e => setNickname(e.target.value.slice(0, 20))}
              maxLength={20}
              placeholder={isPt ? 'Ex: Craque, Palpiteiro...' : 'e.g. Oracle, GuessKing...'}
              style={{ marginBottom: '0.25rem' }}
              autoFocus
            />
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginBottom: '1rem' }}>
              {20 - nickname.length} {isPt ? 'caracteres restantes' : 'characters remaining'}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={!nickname.trim() || saving}
              onClick={saveNicknameAndJoin}
            >
              {saving ? '...' : isPt ? 'Confirmar e entrar' : 'Confirm & join'}
            </button>
          </div>
        )}

        {status === 'joining' && (
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>{isPt ? 'Enviando pedido...' : 'Sending join request...'}</p>
        )}

        {status === 'done' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎉</div>
            <p style={{ color: '#4ade80', fontWeight: 600, marginBottom: '0.5rem' }}>{message}</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem' }}>
              {isPt ? 'Você receberá acesso assim que o admin aprovar.' : "You'll get access once the admin approves you."}
            </p>
          </div>
        )}

        {status === 'already' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</div>
            <p style={{ color: '#4ade80', fontWeight: 600 }}>{message}</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', marginTop: '0.5rem' }}>
              {isPt ? 'Redirecionando...' : 'Redirecting...'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>❌</div>
            <p style={{ color: '#f87171', fontWeight: 600 }}>{message}</p>
          </div>
        )}
      </div>
    </div>
  )
}
