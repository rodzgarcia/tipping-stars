import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ reply: 'Help chat is not configured yet.' })

  try {
    const { messages, tournamentContext } = await req.json()
    const lockMins = tournamentContext?.lockMins ?? 120
    const groupMode = tournamentContext?.groupLockMode ?? 'per_match'

    const system = `You are a friendly helper for Tipping Stars, a World Cup 2026 tipping competition app. Answer clearly and completely. Keep answers to 3-4 sentences max. Never cut off mid-sentence.

Tournament settings:
- Tips lock ${lockMins} minutes before each match kickoff
- Group lock: ${groupMode === 'first_game' ? 'all group tips lock before the first match' : `each match locks ${lockMins} min before kickoff`}

How it works:
- MATCH TIPS: Predict the score. Locks ${lockMins} min before kickoff. Points: correct winner + goal diff + exact score + big margin bonus. Phase multipliers: Group 1x, R32 2x, R16 3x, QF 4x, SF 5x, Final 6x.
- GROUP QUALIFIERS: Pick 1st and 2nd in each group. Correct position = full pts, correct team wrong position = half pts.
- TOURNAMENT TIPS: Predict winner, 2nd, 3rd, top scorer.
- LEADERBOARD: Total points. Tiebreak: exact scores then goal differences.`

    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    // Retry once on 429
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 3000))
      
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

      if (resp.status === 429) {
        if (attempt === 0) continue
        return NextResponse.json({ reply: 'Too many requests — please wait a moment and try again.' })
      }

      const data = await resp.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      return NextResponse.json({ reply: text || 'Sorry, I could not answer that right now.' })
    }

    return NextResponse.json({ reply: 'Please try again in a moment.' })
  } catch (e) {
    console.error('Help error:', e)
    return NextResponse.json({ reply: 'Something went wrong. Try again!' })
  }
}
