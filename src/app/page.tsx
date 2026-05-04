'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Trophy, Star, Users, ChevronRight, LogOut, Settings } from 'lucide-react'
import { useLang, LangSwitcher } from './LanguageContext'

export default function HomePage() {
  const { t } = useLang()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [myMemberships, setMyMemberships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const [profRes, membRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('tournament_members')
          .select('*, tournament:tournaments(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])
      setProfile(profRes.data)
      setMyMemberships(membRes.data || [])
    }
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--green-light)', letterSpacing: '0.1em' }}>
        LOADING...
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--dark-border)', background: 'rgba(10,15,13,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width: 36, height: 36, background: 'var(--green)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={18} fill="white" color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.08em', color: '#e8f5ee' }}>TIPPING STARS</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/standings" className="btn btn-ghost" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}>Standings</Link>
                {profile?.is_super_admin && (
                  <Link href="/admin" className="btn btn-ghost" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}>
                    <Settings size={14} /> Admin
                  </Link>
                )}
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{profile?.display_name}</span>
                <button onClick={signOut} className="btn btn-ghost" style={{ padding: '0.45rem 0.7rem' }}>
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <Link href="/auth" className="btn btn-primary">Sign in</Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 0.95, letterSpacing: '0.04em', color: '#e8f5ee', marginBottom: '1rem' }}>
          FIFA WORLD CUP<br/>
          <span style={{ color: 'var(--gold)' }}>2026</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', maxWidth: 480, margin: '0 auto 2.5rem' }}>
          Tip every match, predict the winner, top scorer, and more. Climb the leaderboard with your crew.
        </p>
        {!user && (
          <Link href="/auth" className="btn btn-gold" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
            Join a tournament
          </Link>
        )}
      </div>

      {/* My Tournaments — only tournaments the user belongs to */}
      {user && (
        <div className="max-w-5xl mx-auto px-4 pb-16">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.08em', marginBottom: '1rem', color: 'rgba(255,255,255,0.6)' }}>
            MY TOURNAMENTS
          </h2>
          {myMemberships.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              You haven't joined any tournaments yet. Use your invite link to join one.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {myMemberships.map((m, i) => {
                const t = m.tournament
                if (!t) return null
                return (
                  <div key={t.id} className="card card-hover fade-up" style={{ padding: '1.5rem', animationDelay: `${i * 0.05}s` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: '0.5rem' }}>
                          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.05em', color: '#e8f5ee' }}>{t.name}</h3>
                          <span className={`badge ${t.status === 'active' ? 'badge-green' : t.status === 'completed' ? 'badge-grey' : 'badge-gold'}`}>
                            {t.status}
                          </span>
                        </div>
                        {t.description && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{t.description}</p>}
                        <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
                          {t.entry_fee > 0 && <span>Entry: {t.currency} ${t.entry_fee}</span>}
                          <span className={`badge ${m.status === 'approved' ? 'badge-green' : m.status === 'rejected' ? 'badge-red' : 'badge-grey'}`}>
                            {m.status === 'approved' ? 'Joined' : m.status === 'pending' ? 'Awaiting approval' : 'Rejected'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.status === 'approved' ? (
                          <Link href={`/tournament/${t.id}`} className="btn btn-primary">
                            Open <ChevronRight size={14} />
                          </Link>
                        ) : m.status === 'pending' ? (
                          <span className="btn btn-ghost" style={{ cursor: 'default', fontSize: '0.8rem' }}>Pending approval</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
