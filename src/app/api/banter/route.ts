import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { players, matchContext, seed } = await req.json()

    const prompt = `You are a hilarious football banter bot for a World Cup tipping competition. Generate exactly 3 SHORT banter lines (max 15 words each). Each refresh must feel completely different — pick a RANDOM angle from: [roast the leader, sympathise with last place, call out a specific wrong tip, celebrate an exact score, mock someone's jersey team choice, joke about a position, contrast two players, predict who will collapse, fake confidence about the bottom player, reference a famous football failure]. Today's seed: ${seed}. Use real names/nicknames. No emojis in text.

Current standings:
${players}

Recent results and tips:
${matchContext || 'No completed matches yet — banter about predictions and jersey choices instead'}

Return ONLY a JSON array of exactly 3 strings. No other text. Example: ["line1", "line2", "line3"]`

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.0, maxOutputTokens: 400 },
        })
      }
    )

    const data = await resp.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ banter: Array.isArray(parsed) ? parsed.slice(0, 3) : [] })
  } catch (e) {
    console.error('Banter API error:', e)
    return NextResponse.json({ banter: [] }, { status: 500 })
  }
}
