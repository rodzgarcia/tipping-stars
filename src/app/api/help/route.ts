import { NextRequest, NextResponse } from 'next/server'

const SYSTEM = `You are a friendly helper for Tipping Stars, a World Cup 2026 tipping competition app. Answer questions clearly and concisely in 2-3 sentences max.

Key features:
- MATCH TIPS: Tip the score for each match. Locks X minutes before kickoff. Points: correct winner + correct goal difference + exact score + big margin bonus. All cumulative.
- TOURNAMENT TIPS: Predict winner, 2nd, 3rd place and top scorer before the tournament starts.
- GROUP QUALIFIERS: Pick which team finishes 1st and 2nd in each group.
- LEADERBOARD: Total points. Tiebreak: most exact scores then most correct goal differences.
- ALL TIPS: See how everyone tipped once a match is locked.
- STATS: Match consensus percentages, accuracy rates, banter.
- RULES tab: Full scoring explanation with examples.

Phase multipliers: Group stage 1x, Round of 32 2x, Round of 16 3x, QF 4x, SF 5x, Final 6x.
Group qualifiers: correct position = full points, correct team wrong position = half points, wrong team = 0.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ reply: 'Help chat is not configured yet.' })

  try {
    const { messages } = await req.json()

    // Build conversation for Gemini
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
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
        })
      }
    )

    const data = await resp.json()
    console.log('Help status:', resp.status)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    return NextResponse.json({ reply: text || 'Sorry, I could not answer that right now.' })
  } catch (e) {
    console.error('Help error:', e)
    return NextResponse.json({ reply: 'Something went wrong. Try again!' })
  }
}
