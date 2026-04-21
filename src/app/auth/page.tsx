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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
      if (error) setError(error.message)
      else setSuccess(t.lang === 'pt' ? 'Conta criada! Verifique seu e-mail para confirmar, depois entre.' : 'Account created! Check your email to confirm, then sign in.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
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
              <div>
                <label className="label">{t.displayName}</label>
                <input className="input" type="text" placeholder={t.displayNamePlaceholder} value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="label">{t.email}</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">{t.password}</label>
              <input className="input" type="password" placeholder={mode === 'signup' ? (t.lang === 'pt' ? 'Minimo 8 caracteres' : 'At least 8 characters') : '........'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
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
