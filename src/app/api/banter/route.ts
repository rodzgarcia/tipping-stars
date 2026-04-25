import { NextRequest, NextResponse } from 'next/server'

const FALLBACKS = [
  'The banter machine is still calibrating.',
  'Ask again after someone tips an exact score.',
  'Even the AI is speechless at these tips.'
]

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set')
    return NextResponse.json({ banter: FALLBACKS })
  }

  try {
    const { players, matchContext, seed } = await req.json()

    const prompt = `You are a hilarious football banter bot. Generate exactly 3 short funny lines (max 15 words each) about this World Cup tipping competition. Seed: ${seed}.

Use real names. Be specific and funny.

Standings:
${players}

Recent results:
${matchContext || 'No completed matches yet'}

Reply with ONLY a JSON array of 3 strings, nothing else. Example: ["line one", "line two", "line three"]`

    // Try models in order of likelihood to work
    const models = [
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash-8b',
      'gemini-1.5-flash-002',
      'gemini-1.5-pro-latest',
    ]
    let text = ''

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 1.1, maxOutputTokens: 300 },
          })
        })
        const data = await resp.json()
        console.log(`${model}: status=${resp.status}`)
        if (resp.status === 200) {
          text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (text) { console.log('Success with', model); break }
        }
      } catch (e) {
        console.log(`${model} failed:`, e)
      }
    }

    if (!text) return NextResponse.json({ banter: FALLBACKS })

    let parsed: string[] = []
    try {
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      const matches = text.match(/"([^"]{10,80})"/g)
      if (matches) parsed = matches.map((s: string) => s.slice(1, -1))
    }

    return NextResponse.json({ 
      banter: Array.isArray(parsed) && parsed.length > 0 ? parsed.slice(0, 3) : FALLBACKS 
    })
  } catch (e) {
    console.error('Banter error:', e)
    return NextResponse.json({ banter: FALLBACKS })
  }
}
