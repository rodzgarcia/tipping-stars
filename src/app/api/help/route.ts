import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ reply: 'Help chat is not configured yet.' })

  try {
    const { messages, tournamentContext: tc } = await req.json()
    const lockMins = tc?.lockMins ?? 120
    const groupMode = tc?.groupLockMode ?? 'per_match'

    const system = `You are a friendly helper for Tipping Stars, a World Cup 2026 tipping competition app. Answer clearly and completely in 3-4 sentences. Never cut off mid-sentence. Always use the EXACT point values below — never say "max points" or "full points", say the actual number.

This tournament's scoring:
- Correct winner: ${tc?.pts_winner ?? '?'} pts
- Correct goal difference: ${tc?.pts_goal_diff ?? '?'} pts  
- Exact score: ${tc?.pts_exact_score ?? '?'} pts
- Big margin bonus (exact + 3+ goal diff): ${tc?.pts_big_margin_bonus ?? '?'} pts
- Qualifying team correct position: ${tc?.pts_qualify ?? '?'} pts per team
- Qualifying team wrong position (1st vs 2nd): ${tc?.pts_qualify ? Math.floor(tc.pts_qualify / 2) : '?'} pts
- Tournament winner prediction: ${tc?.pts_second_place ? tc.pts_second_place * 2 : '?'} pts (estimate)
- 2nd place prediction: ${tc?.pts_second_place ?? '?'} pts
- 3rd place prediction: ${tc?.pts_third_place ?? '?'} pts
- Top scorer prediction: ${tc?.pts_top_scorer ?? '?'} pts

Points are CUMULATIVE per match — e.g. if exact score: earn pts_winner + pts_goal_diff + pts_exact_score all together = ${(tc?.pts_winner ?? 0) + (tc?.pts_goal_diff ?? 0) + (tc?.pts_exact_score ?? 0)} pts total (plus big margin bonus if applicable).

Phase multipliers: Group 1x, R32 2x, R16 3x, QF 4x, SF 5x, Final 6x — multiply total match pts by these.

Tips lock ${lockMins} minutes before kickoff. Group lock: ${groupMode === 'first_game' ? 'all group tips lock before the first match' : `each match locks ${lockMins} min before its own kickoff`}.

LEADERBOARD tiebreak: most exact scores → most correct goal differences.`

    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const delays = [0, 4000, 8000]
    for (let attempt = 0; attempt < 3; attempt++) {
      if (delays[attempt] > 0) await new Promise(r => setTimeout(r, delays[attempt]))
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents,
            generationConfig: { maxOutputTokens: 800, temperature: 0.5 },
          })
        }
      )
      if (resp.status === 429) { console.log(`429 attempt ${attempt + 1}`); continue }
      const data = await resp.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return NextResponse.json({ reply: text })
    }
    return NextResponse.json({ reply: 'The AI is busy — please try again in a moment.' })
  } catch (e) {
    console.error('Help error:', e)
    return NextResponse.json({ reply: 'Something went wrong. Try again!' })
  }
}
