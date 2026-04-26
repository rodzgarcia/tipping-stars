import { NextRequest, NextResponse } from 'next/server'

// Cache odds in memory — Gemini odds don't change, no need to re-fetch
const cache: Record<string, any> = {}

export async function GET(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ odds: null })

  const { searchParams } = new URL(req.url)
  const home = searchParams.get('home') || ''
  const away = searchParams.get('away') || ''
  const cacheKey = `${home}-${away}`

  if (cache[cacheKey]) return NextResponse.json({ odds: cache[cacheKey] })

  try {
    const prompt = `You are a football odds expert. Give realistic decimal betting odds for this World Cup 2026 match based on team strength, FIFA rankings and recent form.

Match: ${home} vs ${away}

Return ONLY a JSON object, no other text:
{"home": 2.10, "draw": 3.40, "away": 3.20}

Use realistic decimal odds (e.g. strong favourite 1.40-1.80, slight favourite 1.90-2.40, even match 2.50-3.20, underdog 3.50-8.00, big underdog 8.00+). Home team gets slight advantage.`

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 60, temperature: 0.3 },
        })
      }
    )

    if (resp.status === 429) return NextResponse.json({ odds: null })

    const data = await resp.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = text.replace(/```json\n?|\n?```/g, '').trim()
    const odds = JSON.parse(clean)

    if (odds.home && odds.draw && odds.away) {
      cache[cacheKey] = { ...odds, source: 'AI estimate' }
      return NextResponse.json({ odds: cache[cacheKey] })
    }

    return NextResponse.json({ odds: null })
  } catch (e) {
    return NextResponse.json({ odds: null })
  }
}
