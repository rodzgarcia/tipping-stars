'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Trophy, Star, Users, ChevronRight, LogOut, Settings } from 'lucide-react'
 
export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [tournaments, setTournaments] = useState<any[]>([])
  const [myMemberships, setMyMemberships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
 
  useEffect(() => {
    loadData()
  }, [])
 
  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: memberships } = await supabase
        .from('tournament_members')
        .select('*, tournament:tournaments(*)')
        .eq('user_id', user.id)
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
                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} />
                    : <span style={{ fontSize: '1.2rem' }}>👤</span>
                  }
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{profile?.display_name}</span>
                </Link>
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
 
      {/* Tournaments */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.08em', marginBottom: '1rem', color: 'rgba(255,255,255,0.6)' }}>
          TOURNAMENTS
        </h2>
        {tournaments.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            No tournaments yet. Admin will set them up soon.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {tournaments.map((t, i) => {
              const membership = myMemberships.find(m => m.tournament_id === t.id)
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
                        {membership && (
                          <span className={`badge ${membership.status === 'approved' ? 'badge-green' : membership.status === 'rejected' ? 'badge-red' : 'badge-grey'}`}>
                            {membership.status === 'approved' ? 'Joined' : membership.status === 'pending' ? 'Awaiting approval' : 'Rejected'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {membership?.status === 'approved' ? (
                        <Link href={`/tournament/${t.id}`} className="btn btn-primary">
                          Open <ChevronRight size={14} />
                        </Link>
                      ) : membership?.status === 'pending' ? (
                        <span className="btn btn-ghost" style={{ cursor: 'default' }}>Pending</span>
                      ) : !membership && user ? (
                        <JoinButton tournamentId={t.id} userId={user.id} onJoin={loadData} />
                      ) : !user ? (
                        <Link href="/auth" className="btn btn-ghost">Sign in to join</Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
 
function JoinButton({ tournamentId, userId, onJoin }: { tournamentId: string, userId: string, onJoin: () => void }) {
  const [showModal, setShowModal] = useState(false)
 
  return (
    <>
      <button onClick={() => setShowModal(true)} className="btn btn-primary">
        Request to join
      </button>
      {showModal && (
        <JoinModal
          tournamentId={tournamentId}
          userId={userId}
          onJoin={() => { setShowModal(false); onJoin() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
 
function JoinModal({ tournamentId, userId, onJoin, onClose }: any) {
  const [step, setStep] = useState<'photo' | 'joining'>('photo')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
 
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError('')
  }
 
  async function handleJoin() {
    setUploading(true)
    try {
      let avatarUrl = null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${userId}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl
        await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId)
      }
      await supabase.from('tournament_members').insert({ tournament_id: tournamentId, user_id: userId })
      onJoin()
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
      setUploading(false)
    }
  }
 
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ padding: '2rem', maxWidth: 400, width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Join Tournament</h2>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>Upload a selfie so your crew can see you on the leaderboard! You can skip this and add one later.</p>
 
        {/* Photo upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {preview
              ? <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '2.5rem' }}>📸</span>
            }
          </div>
          <label style={{ cursor: 'pointer' }}>
            <span className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              {preview ? 'Change photo' : 'Choose photo'}
            </span>
            <input type="file" accept="image/*" capture="user" onChange={handleFile} style={{ display: 'none' }} />
          </label>
        </div>
 
        {error && <p style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
 
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleJoin} disabled={uploading} className="btn btn-primary" style={{ flex: 1 }}>
            {uploading ? 'Joining...' : file ? 'Upload & Join' : 'Join without photo'}
          </button>
        </div>
      </div>
    </div>
  )
}
 