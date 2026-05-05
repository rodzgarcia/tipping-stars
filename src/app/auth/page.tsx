'use client'
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Star } from 'lucide-react'
import Link from 'next/link'
import { useLang, LangSwitcher } from '../LanguageContext'

function AuthForm() {
  const { t } = useLang()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)

    if (mode === 'signup' && !nickname.trim()) {
      setError(t.nicknameRequired)
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } }
      })
      if (signUpError) {
        setError(signUpError.message)
      } else if (data.user) {
        // Random jersey team + position assignment
        const WC_TEAMS = ['Argentina','France','England','Spain','Brazil','Portugal','Netherlands','Germany','Italy','Morocco','Croatia','United States','Mexico','Japan','Uruguay','Colombia','Senegal','Switzerland','South Korea','Ecuador','Canada','Australia','Turkey','Poland','Serbia','Scotland','Belgium','Egypt','Iran','New Zealand']
        const POSITIONS = ['ST','CF','LW','RW','CAM','CM','CDM','LB','RB','CB','GK']
        const randomTeam = WC_TEAMS[Math.floor(Math.random() * WC_TEAMS.length)]
        const randomPosition = POSITIONS[Math.floor(Math.random() * POSITIONS.length)]

        // Retry saving profile since Supabase trigger takes a moment
        let attempts = 0
        const saveProfile = async () => {
          attempts++
          const updateData: any = { jersey_team: randomTeam, tip_position: randomPosition }
          if (nickname.trim()) updateData.nickname = nickname.trim()
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', data.user!.id)
          if (updateError && attempts < 5) {
            setTimeout(saveProfile, 800)
          }
        }
        setTimeout(saveProfile, 600)
        setSuccess(t.lang === 'pt'
          t.accountCreated)
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) setError(signInError.message)
      else router.push(redirect)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <LangSwitcher />
        </div>
        <div className="text-center" style={{ marginBottom: '2.5rem' }}>
          <div style={{ width: 52, height: 52, background: 'var(--green)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Star size={24} fill="white" color="white" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.08em' }}>TIPPING STARS</div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', marginTop: '0.3rem' }}>FIFA World Cup 2026</p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <div className="tab-nav" style={{ marginBottom: '1.5rem' }}>
            <button className={`tab-btn ${mode === 'signin' ? 'active' : ''}`} onClick={() => setMode('signin')}>{t.logIn}</button>
            <button className={`tab-btn ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>{t.createAccount}</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'signup' && (
              <>
                <div>
                  <label className="label">{t.displayName}</label>
                  <input className="input" type="text" placeholder={t.displayNamePlaceholder} value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="label">
                    {t.lang === 'pt' t.nickname}
                    <span style={{ color: '#f87171', marginLeft: '0.25rem' }}>*</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginLeft: '0.4rem', fontSize: '0.78rem' }}>
                      {t.lang === 'pt' t.nicknameHint}
                    </span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder={t.nicknamePlaceholder}
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    maxLength={20}
                    required
                  />
                  {nickname.length > 0 && (
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.25rem' }}>
                      {20 - nickname.length} {t.lang === 'pt' ? 'caracteres restantes' : 'characters remaining'}
                    </p>
                  )}
                </div>
              </>
            )}
            <div>
              <label className="label">{t.email}</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">{t.password}</label>
              <input className="input" type="password"
                placeholder={mode === 'signup' ? (t.lang === 'pt' ? 'Minimo 8 caracteres' : 'At least 8 characters') : '........'}
                value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>

            {error && <p style={{ color: '#f87171', fontSize: '0.85rem', background: 'rgba(239,68,68,0.1)', padding: '0.6rem 0.9rem', borderRadius: 8 }}>{error}</p>}
            {success && <p style={{ color: '#4ade80', fontSize: '0.85rem', background: 'rgba(34,197,94,0.1)', padding: '0.6rem 0.9rem', borderRadius: 8 }}>{success}</p>}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.75rem' }}>
              {loading ? (t.lang === 'pt' ? 'Aguarde...' : 'Please wait...') : mode === 'signup' ? t.createAccount : t.logIn}
            </button>
          </form>

          {mode === 'signup' && (
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '1rem' }}>
              {t.lang === 'pt'
                ? 'Apos o cadastro, o administrador aprovara sua conta antes de voce comecar a apostar.'
                : 'After signing up, the tournament admin will approve your account before you can start tipping.'}
            </p>
          )}
        </div>

        <div className="text-center" style={{ marginTop: '1.5rem' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>{t.backToHome}</Link>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div style={{ color: 'var(--green-light)' }}>LOADING...</div></div>}>
      <AuthForm />
    </Suspense>
  )
}
