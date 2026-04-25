import { NextRequest, NextResponse } from 'next/server'

const SYSTEM = `You are a friendly helper for Tipping Stars, a World Cup 2026 tipping competition app. Answer questions clearly and concisely.

Key features:
- MATCH TIPS: Tip the score for each match. Locks X minutes before kickoff (set by admin). Points: correct winner + correct goal difference + exact score + big margin bonus. All cumulative.
- TOURNAMENT TIPS: Predict winner, 2nd, 3rd place and top scorer before the tournament starts.
- GROUP QUALIFIERS: Pick which team finishes 1st and 2nd in each group.
- LEADERBOARD: Total points. Tiebreak: most exact scores → most correct goal differences.
- ALL TIPS: See how everyone tipped once a match is locked.
- STATS: Match consensus, accuracy rates, banter.
- RULES tab: Full scoring explanation with examples.

Phase multipliers: Group stage 1x, Round of 32 2x, Round of 16 3x, QF 4x, SF 5x, Final 6x.
Group qualifiers: correct position = full points, correct team wrong position = half points, doesn't qualify = 0.

Keep answers short and friendly. Max 3 sentences.`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    // Build Gemini conversation format
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: { maxOutputTokens: 300 },
        })
      }
    )

    const data = await resp.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not help with that right now.'
    return NextResponse.json({ reply: text })
  } catch (e) {
    console.error('Help API error:', e)
    return NextResponse.json({ reply: 'Something went wrong. Try again!' }, { status: 500 })
  }
}
