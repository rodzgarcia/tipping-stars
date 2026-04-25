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

    // Try gemini-1.5-flash first (widely available), fall back to gemini-pro
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro']
    let text = ''

    for (const model of models) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 1.1, maxOutputTokens: 300 },
            })
          }
        )
        const data = await resp.json()
        console.log(`Model ${model} status:`, resp.status)
        console.log(`Model ${model} response:`, JSON.stringify(data).slice(0, 300))

        text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (text) {
          console.log('Got text from model:', model, text)
          break
        }
      } catch (modelErr) {
        console.log(`Model ${model} failed:`, modelErr)
      }
    }

    if (!text) {
      console.log('All models returned empty text')
      return NextResponse.json({ banter: FALLBACKS })
    }

    // Parse response
    let parsed: string[] = []
    try {
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      const matches = text.match(/"([^"]{10,80})"/g)
      if (matches) parsed = matches.map((s: string) => s.slice(1, -1))
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ banter: FALLBACKS })
    }

    return NextResponse.json({ banter: parsed.slice(0, 3) })
  } catch (e) {
    console.error('Banter API error:', e)
    return NextResponse.json({ banter: FALLBACKS })
  }
}
