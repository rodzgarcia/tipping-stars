import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ reply: 'Help chat is not configured yet.' })

  try {
    const { messages, tournamentContext } = await req.json()
    const lockMins = tournamentContext?.lockMins ?? 120
    const groupMode = tournamentContext?.groupLockMode ?? 'per_match'

    const system = `You are a friendly helper for Tipping Stars, a World Cup 2026 tipping competition app. Answer questions clearly in 2-3 sentences max.

This tournament's specific settings:
- Tips lock ${lockMins} minutes before each match kickoff
- Group stage lock mode: ${groupMode === 'first_game' ? 'all group tips lock before the first match of the tournament' : `each match locks ${lockMins} minutes before its own kickoff`}
- Points per correct winner: ${tournamentContext?.pts_winner ?? 'configured by admin'}
- Points per exact score: ${tournamentContext?.pts_exact_score ?? 'configured by admin'}

Key features:
- MATCH TIPS: Tip the score. Locks ${lockMins} min before kickoff. Points: correct winner + correct goal difference + exact score + big margin bonus (3+ goal difference on exact score). All cumulative.
- TOURNAMENT TIPS: Predict winner, 2nd, 3rd place and top scorer.
- GROUP QUALIFIERS: Pick which team finishes 1st and 2nd in each group.
- LEADERBOARD: Total points. Tiebreak: exact scores then goal differences.
- Phase multipliers: Group 1x, R32 2x, R16 3x, QF 4x, SF 5x, Final 6x.
- Group qualifiers: correct position = full points, correct team wrong position = half points.

Be concise and friendly.`

    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
        })
      }
    )

    const data = await resp.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    return NextResponse.json({ reply: text || 'Sorry, I could not answer that right now.' })
  } catch (e) {
    console.error('Help error:', e)
    return NextResponse.json({ reply: 'Something went wrong. Try again!' })
  }
}
