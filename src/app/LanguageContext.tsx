'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import { Lang, T } from './translations'

type LanguageContextType = {
  lang: Lang
  setLang: (l: Lang) => void
  t: typeof T['en'] & { lang: Lang }
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: T['en'],
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  const tWithLang = { ...T[lang], lang } as typeof T['en'] & { lang: Lang }
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: tWithLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}

export function LangSwitcher() {
  const { lang, setLang } = useLang()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      <button
        onClick={() => setLang('en')}
        title="English"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
          fontSize: '1.35rem', lineHeight: 1,
          opacity: lang === 'en' ? 1 : 0.35,
          filter: lang === 'en' ? 'none' : 'grayscale(0.5)',
          transform: lang === 'en' ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.15s ease',
        }}
      >
        🇦🇺
      </button>
      <button
        onClick={() => setLang('pt')}
        title="Português"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
          fontSize: '1.35rem', lineHeight: 1,
          opacity: lang === 'pt' ? 1 : 0.35,
          filter: lang === 'pt' ? 'none' : 'grayscale(0.5)',
          transform: lang === 'pt' ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.15s ease',
        }}
      >
        🇧🇷
      </button>
    </div>
  )
}
