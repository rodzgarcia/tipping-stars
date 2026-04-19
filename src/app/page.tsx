'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Star, ChevronRight, LogOut, Settings } from 'lucide-react'
import { useLang, LangSwitcher } from './LanguageContext'

export default function HomePage() {
  const { t } = useLang()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [tournaments, setTournaments] = useState<any[]>([])
  const [myMemberships, setMyMemberships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: memberships } = await supabase.from('tournament_members').select('*').eq('user_id', user.id)
      setMyMemberships(memberships || [])
    }
    const { data: tours } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false })
    setTournaments(tours || [])
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
      <header style={{ borderBottom: '1px solid var(--dark-border)', background: 'rgba(10,15,13,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width: 36, height: 36, background: 'var(--green)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={18} fill="white" color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.08em', color: '#e8f5ee' }}>{t.appName}</span>
          </div>
          <div className="flex items-center gap-3">
            <LangSwitcher />
            {user ? (
              <>
                <Link href="/standings" className="btn btn-ghost" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}>{t.standings}</Link>
                {profile?.is_super_admin && (
                  <Link href="/admin" className="btn btn-ghost" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}>
                    <Settings size={14} /> {t.admin}
                  </Link>
                )}
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{profile?.display_name}</span>
                <button onClick={signOut} className="btn btn-ghost" style={{ padding: '0.45rem 0.7rem' }}>
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <Link href="/auth" className="btn btn-primary">{t.signIn}</Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 0.95, letterSpacing: '0.04em', color: '#e8f5ee', marginBottom: '1rem' }}>
          FIFA WORLD CUP<br/>
          <span style={{ color: 'var(--gold)' }}>2026</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', maxWidth: 480, margin: '0 auto 2.5rem' }}>
          {t.tagline}
        </p>
        {!user && (
          <Link href="/auth" className="btn btn-gold" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
            {t.joinTournament}
          </Link>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-16">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.08em', marginBottom: '1rem', color: 'rgba(255,255,255,0.6)' }}>
          {t.tournaments}
        </h2>
        {tournaments.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            {t.noTournaments}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {tournaments.map((tournament: any, i: number) => {
              const membership = myMemberships.find((m: any) => m.tournament_id === tournament.id)
              return (
                <div key={tournament.id} className="card card-hover fade-up" style={{ padding: '1.5rem', animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: '0.5rem' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.05em', color: '#e8f5ee' }}>{tournament.name}</h3>
                        <span className={`badge ${tournament.status === 'active' ? 'badge-green' : tournament.status === 'completed' ? 'badge-grey' : 'badge-gold'}`}>
                          {tournament.status === 'upcoming' ? t.statusUpcoming : tournament.status === 'active' ? t.statusActive : t.statusCompleted}
                        </span>
                      </div>
                      {tournament.description && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{tournament.description}</p>}
                      <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
                        {tournament.entry_fee > 0 && <span>{t.entry}: {tournament.currency} ${tournament.entry_fee}</span>}
                        {membership && (
                          <span className={`badge ${membership.status === 'approved' ? 'badge-green' : membership.status === 'rejected' ? 'badge-red' : 'badge-grey'}`}>
                            {membership.status === 'approved' ? t.joined : membership.status === 'pending' ? t.awaiting : t.rejected}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {membership?.status === 'approved' ? (
                        <Link href={`/tournament/${tournament.id}`} className="btn btn-primary">
                          {t.open} <ChevronRight size={14} />
                        </Link>
                      ) : membership?.status === 'pending' ? (
                        <span className="btn btn-ghost" style={{ cursor: 'default' }}>{t.pending}</span>
                      ) : !membership && user ? (
                        <JoinButton tournamentId={tournament.id} userId={user.id} onJoin={loadData} label={t.requestToJoin} />
                      ) : !user ? (
                        <Link href="/auth" className="btn btn-ghost">{t.signInToJoin}</Link>
                      ) : null}
                    </div>
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

function JoinButton({ tournamentId, userId, onJoin, label }: { tournamentId: string, userId: string, onJoin: () => void, label: string }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function join() {
    setLoading(true)
    await supabase.from('tournament_members').insert({ tournament_id: tournamentId, user_id: userId })
    onJoin()
    setLoading(false)
  }

  return (
    <button onClick={join} disabled={loading} className="btn btn-primary">
      {loading ? '...' : label}
    </button>
  )
}
