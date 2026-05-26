'use client'
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Star } from 'lucide-react'
import Link from 'next/link'
import { useLang, LangSwitcher } from '../LanguageContext'
import { POSITIONS } from '@/lib/constants'

function AuthForm() {
  const { t } = useLang()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const inviteCode = searchParams.get('invite') || ''
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState('')
  const [signedUp, setSignedUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const isPt = t.lang === 'pt'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)

    if (mode === 'signup') {
      if (!nickname.trim()) {
        setError(t.nicknameRequired)
        setLoading(false)
        return
      }
      if (!name.trim()) {
        setError(isPt ? 'Nome é obrigatório.' : 'Name is required.')
        setLoading(false)
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } }
      })
      if (signUpError) {
        setError(signUpError.message)
      } else if (data.user) {
        const WC_TEAMS = ['Argentina','France','England','Spain','Brazil','Portugal','Netherlands','Germany','Italy','Morocco','Croatia','United States','Mexico','Japan','Uruguay','Colombia','Senegal','Switzerland','South Korea','Ecuador','Canada','Australia','Turkey','Poland','Serbia','Scotland','Belgium','Egypt','Iran','New Zealand']
        const randomTeam = WC_TEAMS[Math.floor(Math.random() * WC_TEAMS.length)]
        const randomPosition = POSITIONS[Math.floor(Math.random() * POSITIONS.length)]
        const profilePayload = { jersey_team: randomTeam, tip_position: randomPosition, nickname: nickname.trim(), display_name: name.trim() }
        let attempts = 0
        const saveProfile = async () => {
          attempts++
          const { error: updateError } = await supabase.from('profiles')
            .update(profilePayload)
            .eq('id', data.user!.id)
          if (updateError && attempts < 8) setTimeout(saveProfile, 1000 * attempts)
        }
        setTimeout(saveProfile, 800)
        setSignedUp(true)
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) setError(signInError.message)
      else {
        // If came from an invite link, go to join page so tournament gets attached
        const code = inviteCode || manualCode.trim()
        if (code) router.push('/join/' + code)
        else router.push(redirect)
      }
    }
    setLoading(false)
  }

  async function joinWithCode() {
    const code = manualCode.trim().toUpperCase()
    if (!code) return
    const { data: tour } = await supabase.from('tournaments').select('id').eq('invite_code', code).single()
    if (!tour) {
      setError(isPt ? 'Código inválido.' : 'Invalid code.')
      return
    }
    router.push('/join/' + code)
  }

  // ── Success screen after signup ─────────────────────────────────────────────
  if (signedUp) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}><LangSwitcher /></div>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            {isPt ? 'BEM VINDO!' : 'WELCOME!'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', lineHeight: 1.6 }}>
            {isPt
              ? `Conta criada com sucesso para ${email}. Clique abaixo para entrar no bolão!`
              : `Account created for ${email}. Click below to sign in and start tipping!`}
          </p>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)' }}>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {isPt ? '💡 Nenhuma confirmação de e-mail necessária — sua conta já está ativa!' : '💡 No email confirmation needed — your account is already active!'}
            </p>
          </div>
          <button onClick={async () => {
            setLoading(true)
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
            if (signInError) {
              setSignedUp(false)
              setMode('signin')
              setError(signInError.message)
            } else {
              if (inviteCode) router.push('/join/' + inviteCode)
              else router.push(redirect)
            }
            setLoading(false)
          }} className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? '...' : isPt ? 'Entrar agora →' : 'Sign in now →'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}><LangSwitcher /></div>
        <div className="text-center" style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: 'var(--green)', borderRadius: 16, marginBottom: '1rem' }}>
            <Star size={24} fill="white" color="white" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.08em' }}>
            {isPt ? 'BOLÃO DAS ESTRELAS' : 'TIPPING STARS'}
          </h1>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {(['signin','signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, padding: '0.6rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                background: mode === m ? 'var(--green)' : 'transparent',
                color: mode === m ? '#0a0f0d' : 'rgba(255,255,255,0.5)',
                border: mode === m ? 'none' : '1px solid rgba(255,255,255,0.12)',
              }}>
                {m === 'signin' ? (isPt ? 'Entrar' : 'Sign in') : (isPt ? 'Criar conta' : 'Sign up')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'signup' && (
              <>
                <div>
                  <label className="label">{t.displayName} <span style={{ color: '#f87171' }}>*</span></label>
                  <input className="input" type="text" placeholder={t.displayNamePlaceholder} value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="label">
                    {t.nickname} <span style={{ color: '#f87171' }}>*</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginLeft: '0.4rem' }}>{t.nicknameHint}</span>
                  </label>
                  <input className="input" type="text" placeholder={t.nicknamePlaceholder} value={nickname}
                    onChange={e => setNickname(e.target.value.slice(0, 20))} required maxLength={20} />
                  {nickname.length > 0 && (
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.25rem' }}>
                      {20 - nickname.length} {isPt ? 'caracteres restantes' : 'characters remaining'}
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="label">{t.email}</label>
              <input className="input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="label">{t.password}</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>

            {error && <div style={{ color: '#f87171', fontSize: '0.85rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>{error}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? (isPt ? 'Aguarde...' : 'Loading...') : mode === 'signup' ? (isPt ? 'Criar conta' : 'Create account') : (isPt ? 'Entrar' : 'Sign in')}
            </button>
          </form>

          {/* Manual invite code entry */}
          {mode === 'signin' && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-border)' }}>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.6rem' }}>
                {isPt ? '🔑 Tem um código de convite?' : '🔑 Have an invite code?'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input className="input" type="text" placeholder={isPt ? 'Digite o código...' : 'Enter code...'}
                  value={manualCode} onChange={e => setManualCode(e.target.value.toUpperCase())}
                  style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.1em' }} maxLength={12} />
                <button onClick={joinWithCode} className="btn btn-ghost" style={{ flexShrink: 0 }}>
                  {isPt ? 'Entrar' : 'Join'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return <Suspense><AuthForm /></Suspense>
}
