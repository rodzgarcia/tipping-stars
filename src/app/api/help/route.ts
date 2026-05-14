import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ reply: 'GEMINI_API_KEY not set in Vercel environment variables.' })

  try {
    const { messages, tournamentContext: tc, leaderboard, lang } = await req.json()
    const isPt = lang === 'pt'
    const lockMins = tc?.lockMins ?? 120
    const tourName = tc?.name || 'this tournament'

    let lbStr = ''
    if (leaderboard && leaderboard.length > 0) {
      lbStr = '\n\nCURRENT LEADERBOARD:\n' + leaderboard.map((r: any, i: number) =>
        `${i+1}. ${r.nickname || r.display_name}: ${r.total_points}pts (${r.exact_scores} exact, ${r.correct_winners} winners, ${r.tips_submitted} tips)`
      ).join('\n')
    }

    const perfectMatch = (tc?.pts_winner || 0) + (tc?.pts_goal_diff || 0) + (tc?.pts_exact_score || 0)

    const system = isPt
      ? `Você é o assistente oficial do ${tourName} no Tipping Stars — bolão da Copa do Mundo 2026.

PONTUAÇÃO DO TORNEIO:
- Vencedor correto: ${tc?.pts_winner ?? '?'} pts
- Saldo de gols correto: ${tc?.pts_goal_diff ?? '?'} pts
- Placar exato: ${tc?.pts_exact_score ?? '?'} pts (soma total: ${perfectMatch} pts)
- Bônus goleada (placar exato + 3+ gols): ${tc?.pts_big_margin_bonus ?? '?'} pts
- Classificado posição correta: ${tc?.pts_qualify ?? '?'} pts | posição errada: ${tc?.pts_qualify ? Math.floor(tc.pts_qualify/2) : '?'} pts
- Multiplicadores: Grupos 1x | R32 2x | R16 3x | Quartas 4x | Semifinal 5x | Final 6x
- Palpites bloqueiam ${lockMins} min antes do início
- Previsões: Campeão ${tc?.pts_tournament_winner ?? '?'} pts | Vice ${tc?.pts_second_place ?? '?'} pts | 3º ${tc?.pts_third_place ?? '?'} pts | Artilheiro ${tc?.pts_top_scorer ?? '?'} pts
${lbStr}

COMO USAR O APP:
- Palpitar partida: aba "Palpites" → escolha o placar antes do bloqueio
- Classificados de grupo: aba "Grupos" → escolha 1º e 2º de cada grupo
- Previsões do torneio: aba "Prever" → campeão, vice, 3º e artilheiro
- Ver palpites de todos: aba "Palpites de Todos" → visível após bloqueio
- Classificação: aba "Board"
- Card FIFA e perfil: ícone 👤 no canto superior direito

Responda em português brasileiro, máximo 4 frases, específico para este torneio. Se perguntarem sobre a classificação, use os dados acima com nomes reais.`

      : `You are the official assistant for ${tourName} on Tipping Stars — World Cup 2026 tipping competition app.

TOURNAMENT SCORING:
- Correct winner: ${tc?.pts_winner ?? '?'} pts
- Correct goal difference: ${tc?.pts_goal_diff ?? '?'} pts
- Exact score: ${tc?.pts_exact_score ?? '?'} pts (combined total: ${perfectMatch} pts)
- Big margin bonus (exact score + 3+ goal diff): ${tc?.pts_big_margin_bonus ?? '?'} pts
- Qualifier correct position: ${tc?.pts_qualify ?? '?'} pts | wrong position: ${tc?.pts_qualify ? Math.floor(tc.pts_qualify/2) : '?'} pts
- Phase multipliers: Group 1x | R32 2x | R16 3x | QF 4x | SF 5x | Final 6x
- Tips lock ${lockMins} minutes before kickoff
- Predictions: Champion ${tc?.pts_tournament_winner ?? '?'} pts | Runner-up ${tc?.pts_second_place ?? '?'} pts | 3rd ${tc?.pts_third_place ?? '?'} pts | Top scorer ${tc?.pts_top_scorer ?? '?'} pts
${lbStr}

HOW THE APP WORKS:
- Tip a match: Tips tab → enter score before lock time
- Group qualifiers: Groups tab → pick top 2 from each group
- Tournament predictions: Predict tab → champion, runner-up, 3rd, top scorer
- See everyone's tips: All Tips tab → visible after each match locks
- Leaderboard: Board tab
- FIFA player card and profile: 👤 icon top right

Answer in max 4 sentences, specific to this tournament. If asked about standings, use the leaderboard data above with real names and scores.`

    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.0-pro']

    for (const model of models) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: system }] },
              contents,
              generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
            })
          }
        )
        const data = await resp.json()
        console.log(`[help] ${model} status=${resp.status} error=${data.error?.message || 'none'}`)
        if (resp.status === 429 || resp.status === 503) continue
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return NextResponse.json({ reply: text })
        if (data.error) continue
      } catch (e: any) {
        console.error(`[help] ${model} threw:`, e.message)
      }
    }

    return NextResponse.json({ reply: isPt
      ? 'Não consegui conectar ao assistente agora. Tente novamente em alguns segundos.'
      : 'Could not reach the assistant right now. Please try again in a few seconds.'
    })
  } catch (e: any) {
    console.error('[help] outer error:', e)
    return NextResponse.json({ reply: 'Error: ' + e.message })
  }
}
