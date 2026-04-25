import { NextRequest, NextResponse } from 'next/server'

const FALLBACKS = [
  'The banter machine is still calibrating.',
  'Ask again after someone tips an exact score.',
  'Even the AI is speechless at these tips.'
]

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ banter: FALLBACKS })

  try {
    const { players, matchContext, seed } = await req.json()

    const prompt = `You are a hilarious football banter bot. Generate exactly 3 short funny lines (max 15 words each) about this World Cup tipping competition. Seed: ${seed}. Use real names. Be specific and funny.

Standings:
${players}

Recent results:
${matchContext || 'No completed matches yet'}

Reply with ONLY a JSON array of 3 strings. Example: ["line one", "line two", "line three"]`

    // First list available models to find what works
    const listResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )
    const listData = await listResp.json()
    console.log('Available models:', JSON.stringify(listData?.models?.map((m: any) => m.name)).slice(0, 500))

    // Pick first model that supports generateContent
    const availableModels: string[] = listData?.models
      ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      ?.map((m: any) => m.name.replace('models/', '')) || []
    
    console.log('Usable models:', availableModels.slice(0, 5))

    const model = availableModels.find((m: string) => m.includes('flash') || m.includes('pro')) || availableModels[0]
    if (!model) return NextResponse.json({ banter: FALLBACKS })

    console.log('Using model:', model)

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
    console.log('Generate status:', resp.status, JSON.stringify(data).slice(0, 200))
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
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
