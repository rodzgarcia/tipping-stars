import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ reply: 'Help chat needs GEMINI_API_KEY configured in Vercel.' })

  try {
    const { messages, tournamentContext: tc, leaderboard, lang } = await req.json()
    const isPt = lang === 'pt'
    const lockMins = tc?.lockMins ?? 120
    const tourName = tc?.name || 'this tournament'

    // Build leaderboard context string
    let lbStr = ''
    if (leaderboard && leaderboard.length > 0) {
      lbStr = '\n\nCURRENT LEADERBOARD:\n' + leaderboard.map((r: any, i: number) =>
        `${i+1}. ${r.nickname || r.display_name}: ${r.total_points}pts (${r.exact_scores} exact, ${r.correct_winners} winners, ${r.tips_submitted} tips)`
      ).join('\n')
    }

    // Calculate total points for a perfect tip
    const perfectMatch = (tc?.pts_winner || 0) + (tc?.pts_goal_diff || 0) + (tc?.pts_exact_score || 0)

    const system = isPt
      ? `Você é o assistente oficial do ${tourName} no app Tipping Stars — um bolão da Copa do Mundo 2026.

SOBRE O TORNEIO "${tourName}":
- Palpite correto do vencedor: ${tc?.pts_winner ?? '?'} pts
- Saldo de gols correto: ${tc?.pts_goal_diff ?? '?'} pts
- Placar exato: ${tc?.pts_exact_score ?? '?'} pts
- Bônus goleada (placar exato + 3+ gols de diferença): ${tc?.pts_big_margin_bonus ?? '?'} pts
- Classificado na posição correta: ${tc?.pts_qualify ?? '?'} pts
- Classificado na posição errada: ${tc?.pts_qualify ? Math.floor(tc.pts_qualify / 2) : '?'} pts
- Pontos são CUMULATIVOS: placar exato = ${perfectMatch} pts total
- Multiplicadores por fase: Grupos 1x, Oitavas(R32) 2x, 16(R16) 3x, Quartas 4x, Semifinal 5x, Final 6x
- Palpites bloqueiam ${lockMins} minutos antes do início
- Previsão 1º lugar: ${tc?.pts_tournament_winner ?? '?'} pts | 2º: ${tc?.pts_second_place ?? '?'} pts | 3º: ${tc?.pts_third_place ?? '?'} pts | Artilheiro: ${tc?.pts_top_scorer ?? '?'} pts
${lbStr}

SOBRE O APP:
- Para palpitar: aba "Palpites" → selecione o placar antes do bloqueio
- Classificados: aba "Grupos" → escolha 1º e 2º de cada grupo
- Previsões: aba "Prever" → campeão, vice, 3º e artilheiro (bloqueia no primeiro jogo)
- Todos os palpites: aba "Palpites de Todos" → visível após bloqueio
- Classificação: aba "Board"
- Seu perfil e card FIFA: aba superior direita 👤
- Se o palpite está bloqueado NÃO pode mais alterar

Responda em português brasileiro, de forma clara e direta. Se perguntarem sobre a classificação, use os dados acima. Máximo 4 frases por resposta.`

      : `You are the official assistant for ${tourName} on Tipping Stars — a World Cup 2026 tipping competition app.

ABOUT "${tourName}":
- Correct winner: ${tc?.pts_winner ?? '?'} pts
- Correct goal difference: ${tc?.pts_goal_diff ?? '?'} pts
- Exact score: ${tc?.pts_exact_score ?? '?'} pts
- Big margin bonus (exact + 3+ goal diff): ${tc?.pts_big_margin_bonus ?? '?'} pts
- Qualifier correct position: ${tc?.pts_qualify ?? '?'} pts
- Qualifier wrong position: ${tc?.pts_qualify ? Math.floor(tc.pts_qualify / 2) : '?'} pts
- Points are CUMULATIVE: exact score = ${perfectMatch} pts total
- Phase multipliers: Group 1x, R32 2x, R16 3x, QF 4x, SF 5x, Final 6x
- Tips lock ${lockMins} minutes before kickoff
- Predictions: 1st ${tc?.pts_tournament_winner ?? '?'} pts | 2nd ${tc?.pts_second_place ?? '?'} pts | 3rd ${tc?.pts_third_place ?? '?'} pts | Top scorer ${tc?.pts_top_scorer ?? '?'} pts
${lbStr}

HOW THE APP WORKS:
- To tip a match: Tips tab → enter your score before lock time
- Group qualifiers: Groups tab → pick top 2 from each group
- Tournament predictions: Predict tab → champion, runner-up, 3rd, top scorer (locks at first kickoff)
- See everyone's tips: All Tips tab → visible after each match locks
- Leaderboard: Board tab
- Your FIFA player card and stats: profile icon 👤 top right
- Once a tip is locked you CANNOT change it

If asked about the leaderboard or standings, use the data above to give specific answers with real names and scores. Keep replies to 3-4 sentences max, clear and specific to THIS tournament.`

    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const delays = [0, 4000, 8000]
    for (let attempt = 0; attempt < 3; attempt++) {
      if (delays[attempt] > 0) await new Promise(r => setTimeout(r, delays[attempt]))
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
        if (resp.status === 429) continue
        const data = await resp.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return NextResponse.json({ reply: text })
      } catch {}
    }

    return NextResponse.json({ reply: isPt ? 'O assistente está ocupado — tente novamente em instantes.' : 'The assistant is busy — please try again in a moment.' })
  } catch (e: any) {
    return NextResponse.json({ reply: 'Error: ' + e.message })
  }
}
