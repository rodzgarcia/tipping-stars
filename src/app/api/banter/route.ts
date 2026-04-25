import { NextRequest, NextResponse } from 'next/server'

const FALLBACKS = [
  'Banter loading — check back after kickoff.',
  'The AI is still recovering from these tips.',
  'Even VAR cannot explain some of these picks.'
]

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ banter: FALLBACKS })

  try {
    const { players, matchContext, seed } = await req.json()

    const prompt = `You are a funny football banter bot for a World Cup tipping competition. Seed:${seed}.

Write exactly 3 banter lines. Each line must be under 15 words. Use the real player names below. Be specific and funny — roast bad tips, praise brave picks, mock jersey choices.

Standings:
${players}

Recent results:
${matchContext || 'No completed matches yet — joke about their predictions'}

Return ONLY this exact format with no other text:
["banter line 1 here","banter line 2 here","banter line 3 here"]`

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 1.0, 
            maxOutputTokens: 500,
            stopSequences: [']'],
          }
        })
      }
    )

    const data = await resp.json()
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Add the closing bracket back since we used it as a stop sequence
    if (text && !text.trim().endsWith(']')) text = text + ']'
    
    console.log('Gemini text:', text)

    let parsed: string[] = []
    try {
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      // Extract quoted strings as fallback
      const matches = text.match(/"([^"]{5,100})"/g)
      if (matches) parsed = matches.slice(0, 3).map((s: string) => s.slice(1, -1))
    }

    return NextResponse.json({ 
      banter: Array.isArray(parsed) && parsed.length > 0 ? parsed.slice(0, 3) : FALLBACKS 
    })
  } catch (e) {
    console.error('Banter error:', e)
    return NextResponse.json({ banter: FALLBACKS })
  }
}
