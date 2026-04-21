'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import Link from 'next/link'
import { useLang, LangSwitcher } from '../../LanguageContext'
 
export default function JoinPage() {
  const { t } = useLang()
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const supabase = createClient()
 
  const [tournament, setTournament] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [membership, setMembership] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
 
  useEffect(() => { load() }, [code])
 
  async function load() {
    const [{ data: tour }, { data: { user } }] = await Promise.all([
      supabase.from('tournaments').select('*').eq('invite_code', code).single(),
      supabase.auth.getUser(),
    ])
 
    if (!tour) { setLoading(false); return }
    setTournament(tour)
    setUser(user)
 
    // Check if link expired (tournament started = has completed or live matches)
    const { data: startedMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tour.id)
      .in('status', ['completed', 'live'])
      .limit(1)
 
    if (startedMatches && startedMatches.length > 0) {
      setExpired(true)
      setLoading(false)
      return
    }
 
    if (user) {
      const { data: mem } = await supabase
        .from('tournament_members')
        .select('*')
        .eq('tournament_id', tour.id)
        .eq('user_id', user.id)
        .single()
      setMembership(mem)
    }
 
    setLoading(false)
  }
 
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError('')
  }
 
  async function handleJoin() {
    if (!user || !tournament) return
    setJoining(true)
    setError('')
    try {
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)
      }
      await supabase.from('tournament_members').insert({ tournament_id: tournament.id, user_id: user.id })
      setJoined(true)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    }
    setJoining(false)
  }
 
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--green-light)', letterSpacing: '0.1em' }}>LOADING...</div>
    </div>
  )
 
  if (!tournament) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Invalid invite link</div>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>This invite link doesn't exist or has been removed.</p>
        <Link href="/" className="btn btn-ghost">← Back to home</Link>
      </div>
    </div>
  )
 
  if (expired) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏰</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Invite expired</div>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
          <strong style={{ color: '#e8f5ee' }}>{tournament.name}</strong> has already started.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginBottom: '2rem' }}>Invite links expire once the tournament kicks off. Contact the admin to be added manually.</p>
        <Link href="/" className="btn btn-ghost">← Back to home</Link>
      </div>
    </div>
  )
 
  if (joined) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>You're in!</div>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>
          Your request to join <strong style={{ color: '#e8f5ee' }}>{tournament.name}</strong> has been sent. The admin will approve you shortly.
        </p>
        <Link href="/" className="btn btn-primary">Go to home →</Link>
      </div>
    </div>
  )
 
  if (membership) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Already joined!</div>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>
          You're {membership.status === 'approved' ? 'already a member of' : 'awaiting approval for'} <strong style={{ color: '#e8f5ee' }}>{tournament.name}</strong>.
        </p>
        <Link href={membership.status === 'approved' ? `/tournament/${tournament.id}` : '/'} className="btn btn-primary">
          {membership.status === 'approved' ? 'Go to tournament →' : 'Back to home →'}
        </Link>
      </div>
    </div>
  )
 
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Header */}
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <LangSwitcher />
        </div>
 
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <div style={{ width: 56, height: 56, background: 'var(--green)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Star size={26} fill="white" color="white" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>YOU'VE BEEN INVITED TO</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#e8f5ee' }}>{tournament.name}</div>
          {tournament.description && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>{tournament.description}</p>}
          {tournament.entry_fee > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--gold)' }}>
              Entry fee: {tournament.currency} ${tournament.entry_fee}
            </div>
          )}
        </div>
 
        {!user ? (
          /* Not logged in — prompt to sign up */
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Create an account or sign in to join this tournament.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href={`/auth?redirect=/join/${code}`} className="btn btn-primary">Sign up / Sign in</Link>
            </div>
          </div>
        ) : (
          /* Logged in — show join form with selfie */
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
              Add your selfie
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
              Your photo appears on your FIFA-style player card in the leaderboard. You can skip this and add it later from your profile.
            </p>
 
            {/* Selfie upload */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {preview
                    ? <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                    : <span style={{ fontSize: '2.5rem' }}>📸</span>
                  }
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <label style={{ cursor: 'pointer' }}>
                  <span className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}>
                    📷 {preview ? 'Retake' : 'Take selfie'}
                  </span>
                  <input type="file" accept="image/*" capture="user" onChange={handleFile} style={{ display: 'none' }} />
                </label>
                <label style={{ cursor: 'pointer' }}>
                  <span className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}>
                    🖼 Choose photo
                  </span>
                  <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
 
            {error && <p style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
 
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={handleJoin} disabled={joining} className="btn btn-primary" style={{ width: '100%' }}>
                {joining ? 'Joining...' : file ? '🎉 Upload & Request to join' : 'Request to join (no photo)'}
              </button>
              {file && (
                <button onClick={() => { setFile(null); setPreview(null) }} className="btn btn-ghost" style={{ width: '100%', fontSize: '0.8rem' }}>
                  Skip photo
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}