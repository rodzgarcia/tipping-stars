import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ reply: 'Help chat is not configured yet.' })

  try {
    const { messages, tournamentContext } = await req.json()
    const lockMins = tournamentContext?.lockMins ?? 120
    const groupMode = tournamentContext?.groupLockMode ?? 'per_match'

    const system = `You are a friendly helper for Tipping Stars, a World Cup 2026 tipping competition app. Answer clearly and completely — never cut off mid-sentence. Keep answers to 3-4 sentences max.

This tournament's settings:
- Tips lock ${lockMins} minutes before each match kickoff
- Group stage lock: ${groupMode === 'first_game' ? 'all group tips lock before the tournament\'s first match' : `each match locks ${lockMins} minutes before its own kickoff`}
- Points for correct winner: ${tournamentContext?.pts_winner ?? 'set by admin'}
- Points for exact score: ${tournamentContext?.pts_exact_score ?? 'set by admin'}

How tipping works:
- MATCH TIPS: Enter your predicted score. Tips lock ${lockMins} min before kickoff. Points awarded cumulatively: correct winner + correct goal difference + exact score + big margin bonus (exact score with 3+ goal difference).
- TOURNAMENT TIPS: Predict overall winner, 2nd place, 3rd place and top scorer. These lock before the tournament starts.
- GROUP QUALIFIERS: Pick which 2 teams qualify from each group (1st and 2nd). Correct position = full points, correct team but wrong position = half points.
- LEADERBOARD: Shows total points. Tiebreak order: most exact scores, then most correct goal differences.
- Phase multipliers on match tips: Group stage 1x, Round of 32 2x, Round of 16 3x, Quarterfinals 4x, Semifinals 5x, Final 6x.
- ALL TIPS tab: See everyone's tips once a match is locked.
- STATS tab: Consensus percentages, accuracy rankings, banter.

Always give complete answers. Never end mid-sentence.`

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
          generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
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
