'use client'
import { useState, useEffect, useRef } from 'react'

export default function HelpChat({ t, tournament, leaderboard, profilesMap }: { t: any, tournament?: any, leaderboard?: any[], profilesMap?: any }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const ispt = t.lang === 'pt'

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: ispt ? `Olá! Sou o assistente do ${tournament?.name || 'seu bolão'}. Posso te ajudar com pontuação, palpites, classificação e como usar o app. O que quer saber?` : `Hey! I'm the assistant for ${tournament?.name || 'your tournament'}. Ask me about scoring, tips, the current standings, or how the app works.` }])
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)
    try {
      const resp = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
          lang: t.lang,
          tournamentContext: {
            lockMins: tournament?.tip_lock_minutes ?? 120,
            groupLockMode: tournament?.group_lock_mode ?? 'per_match',
            pts_winner: tournament?.pts_winner,
            pts_goal_diff: tournament?.pts_goal_diff,
            pts_exact_score: tournament?.pts_exact_score,
            pts_big_margin_bonus: tournament?.pts_big_margin_bonus,
            pts_qualify: tournament?.pts_qualify,
            pts_second_place: tournament?.pts_second_place,
            pts_third_place: tournament?.pts_third_place,
            pts_top_scorer: tournament?.pts_top_scorer,
            pts_tournament_winner: tournament?.pts_tournament_winner,
            name: tournament?.name,
          },
          leaderboard: (leaderboard || []).map((r: any) => ({
            display_name: r.display_name,
            nickname: profilesMap?.[r.user_id]?.nickname,
            total_points: r.total_points,
            exact_scores: r.exact_scores,
            correct_winners: r.correct_winners,
            tips_submitted: r.tips_submitted,
          })),
        })
      })
      const data = await resp.json()
      if (data.reply && data.reply !== 'Something went wrong. Try again!') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: t.lang === 'pt' ? 'O chat de ajuda está temporariamente indisponível.' : 'Help chat is temporarily unavailable.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t.lang === 'pt' ? 'Erro de conexão. Tente novamente.' : 'Connection error. Please try again.' }])
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1000,
          width: 44, height: 44, borderRadius: 12,
          background: open ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          cursor: 'pointer', fontSize: '1rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        title={ispt ? 'Ajuda' : 'Help'}
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', right: '1.5rem', zIndex: 999,
          width: 320, maxHeight: 420,
          background: '#0d1511', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>⭐</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e8f5ee' }}>{ispt ? 'Ajuda Tipping Stars' : 'Tipping Stars Help'}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{ispt ? 'Pergunte qualquer coisa' : 'Ask me anything'}</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 200 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                maxWidth: '85%', padding: '0.5rem 0.75rem', borderRadius: 12,
                fontSize: '0.82rem', lineHeight: 1.5,
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? 'var(--green)' : 'rgba(255,255,255,0.07)',
                color: m.role === 'user' ? '#fff' : '#e8f5ee',
                borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                borderBottomLeftRadius: m.role === 'assistant' ? 4 : 12,
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', padding: '0.5rem 0.75rem', borderRadius: 12, background: 'rgba(255,255,255,0.07)', fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
                ...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.4rem' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={ispt ? 'Escreva sua pergunta...' : 'Type your question...'}
              style={{
                flex: 1, padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                color: '#fff', fontSize: '0.82rem', outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                padding: '0.5rem 0.75rem', background: 'var(--green)', border: 'none',
                borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: '0.85rem',
                opacity: !input.trim() || loading ? 0.5 : 1,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  )
}
