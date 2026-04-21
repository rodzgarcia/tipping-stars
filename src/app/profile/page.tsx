'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useLang } from '../LanguageContext'
 
export default function ProfilePage() {
  const { t } = useLang()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
 
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      if (prof?.avatar_url) setPreview(prof.avatar_url)
    }
    load()
  }, [])
 
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError('')
    setShowGuide(false)
  }
 
  async function save() {
    if (!file || !user) return
    setUploading(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    }
    setUploading(false)
  }
 
  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--green-light)', letterSpacing: '0.1em' }}>{t.loading}</div>
    </div>
  )
 
  return (
    <div className="min-h-screen">
      <header style={{ borderBottom: '1px solid var(--dark-border)', background: 'rgba(10,15,13,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}><ChevronLeft size={18} /></Link>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.08em' }}>
            {t.lang === 'pt' ? 'MEU PERFIL' : 'MY PROFILE'}
          </span>
        </div>
      </header>
 
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
 
          {/* Photo with face guide */}
          <div style={{ position: 'relative' }}>
            {/* Current photo / placeholder */}
            <div style={{ width: 130, height: 130, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--green)', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {preview
                ? <img src={preview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                : <span style={{ fontSize: '3.5rem' }}>👤</span>
              }
            </div>
            {/* Camera button */}
            <button onClick={() => setShowGuide(true)} style={{ position: 'absolute', bottom: 2, right: 2, width: 36, height: 36, borderRadius: '50%', background: 'var(--green)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📸</button>
          </div>
 
          {/* Face guide overlay */}
          {showGuide && (
            <div style={{ width: '100%', background: 'rgba(0,0,0,0.4)', borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              {/* Visual guide */}
              <div style={{ position: 'relative', width: 160, height: 160 }}>
                {/* Dashed circle guide */}
                <svg width="160" height="160" style={{ position: 'absolute', inset: 0 }}>
                  <circle cx="80" cy="80" r="72" fill="none" stroke="var(--green)" strokeWidth="2" strokeDasharray="8 4" />
                  {/* Head shape guide */}
                  <ellipse cx="80" cy="68" rx="36" ry="42" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.4)" strokeWidth="1.5" strokeDasharray="4 3" />
                  {/* Shoulder guides */}
                  <path d="M30 140 Q80 115 130 140" fill="none" stroke="rgba(74,222,128,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingTop: '60%' }}>
                  {t.lang === 'pt' ? 'Centralize\nseu rosto' : 'Centre\nyour face'}
                </div>
              </div>
 
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
                  {t.lang === 'pt'
                    ? 'Posicione seu rosto dentro do círculo. A foto aparecerá no seu cartão FIFA!'
                    : 'Position your face inside the circle. Your photo will appear on your FIFA card!'}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                  {t.lang === 'pt' ? 'Dica: use boa iluminação e câmera frontal' : 'Tip: use good lighting and front camera'}
                </p>
              </div>
 
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <label style={{ cursor: 'pointer' }}>
                  <span className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.55rem 1.2rem' }}>
                    📷 {t.lang === 'pt' ? 'Tirar selfie' : 'Take selfie'}
                  </span>
                  <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={handleFile} style={{ display: 'none' }} />
                </label>
                <label style={{ cursor: 'pointer' }}>
                  <span className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '0.55rem 1.2rem' }}>
                    🖼 {t.lang === 'pt' ? 'Escolher foto' : 'Choose photo'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                </label>
                <button onClick={() => setShowGuide(false)} className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '0.55rem 1rem', color: 'rgba(255,255,255,0.3)' }}>
                  {t.lang === 'pt' ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
 
          {/* Name + email */}
          {!showGuide && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{profile.display_name}</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.25rem' }}>{profile.email}</div>
              {profile.jersey_team && (
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.35rem' }}>
                  {t.lang === 'pt' ? 'Equipe' : 'Team'}: {profile.jersey_team} · {profile.tip_position}
                </div>
              )}
            </div>
          )}
 
          {/* Save button */}
          {file && !showGuide && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {error && <p style={{ color: '#f87171', fontSize: '0.82rem', textAlign: 'center' }}>{error}</p>}
              <button onClick={save} disabled={uploading} className="btn btn-primary" style={{ width: '100%' }}>
                {uploading ? (t.lang === 'pt' ? 'Enviando...' : 'Uploading...') : saved ? '✔ Saved!' : (t.lang === 'pt' ? 'Salvar foto' : 'Save photo')}
              </button>
            </div>
          )}
 
          {!file && !showGuide && (
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              {profile.avatar_url
                ? (t.lang === 'pt' ? 'Clique no 📸 para trocar sua foto' : 'Click 📸 to change your photo')
                : (t.lang === 'pt' ? 'Adicione uma foto para aparecer no seu cartão FIFA!' : 'Add a photo to appear on your FIFA card!')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}