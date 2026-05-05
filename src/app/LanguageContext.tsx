'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Lang, T } from './translations'

type TWithLang = typeof T['en'] & { lang: Lang }
type LanguageContextType = {
  lang: Lang
  setLang: (l: Lang) => void
  t: TWithLang
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: { ...T['en'], lang: 'en' },
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')
  const [showPicker, setShowPicker] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load saved language from localStorage
    const saved = localStorage.getItem('tipping_lang') as Lang | null
    if (saved === 'en' || saved === 'pt') {
      setLangState(saved)
      setShowPicker(false)
    } else {
      // First visit — show picker
      setShowPicker(true)
    }
    setMounted(true)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('tipping_lang', l)
    setShowPicker(false)
  }

  const tWithLang: TWithLang = { ...T[lang], lang }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: tWithLang }}>
      {children}
      {/* Language picker popup — shows on first visit */}
      {mounted && showPicker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem',
        }}>
          <div style={{
            background: '#0d1511', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '2.5rem 2rem', maxWidth: 380, width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⭐</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              TIPPING STARS
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginBottom: '2rem' }}>
              Choose your language · Escolha seu idioma
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setLang('en')} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: '1.25rem 1.75rem', cursor: 'pointer',
                transition: 'all 0.2s', flex: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#4ade80')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              >
                <img src="https://flagcdn.com/w80/au.png" alt="Australia" style={{ width: 52, borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.06em', color: '#e8f5ee' }}>ENGLISH</span>
              </button>
              <button onClick={() => setLang('pt')} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: '1.25rem 1.75rem', cursor: 'pointer',
                transition: 'all 0.2s', flex: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#4ade80')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              >
                <img src="https://flagcdn.com/w80/br.png" alt="Brazil" style={{ width: 52, borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.06em', color: '#e8f5ee' }}>PORTUGUÊS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}

// Compact flag switcher — always visible in headers
export function LangSwitcher() {
  const { lang, setLang } = useLang()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '3px 6px' }}>
      <button
        onClick={() => setLang('en')}
        title="English"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
          borderRadius: 5, lineHeight: 1, transition: 'all 0.15s ease',
          opacity: lang === 'en' ? 1 : 0.3,
          backgroundColor: lang === 'en' ? 'rgba(255,255,255,0.1)' : 'transparent',
        } as any}
      >
        <img src="https://flagcdn.com/w40/au.png" alt="EN" style={{ width: 22, height: 16, borderRadius: 2, display: 'block' }} />
      </button>
      <button
        onClick={() => setLang('pt')}
        title="Português"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
          borderRadius: 5, lineHeight: 1, transition: 'all 0.15s ease',
          opacity: lang === 'pt' ? 1 : 0.3,
          backgroundColor: lang === 'pt' ? 'rgba(255,255,255,0.1)' : 'transparent',
        } as any}
      >
        <img src="https://flagcdn.com/w40/br.png" alt="PT" style={{ width: 22, height: 16, borderRadius: 2, display: 'block' }} />
      </button>
    </div>
  )
}
