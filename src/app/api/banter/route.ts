import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { players, matchContext, seed } = await req.json()

    const prompt = `You are a hilarious football banter bot. Generate exactly 3 short funny banter lines (max 15 words each) about this World Cup tipping competition. Seed: ${seed}.

Use real player names. Be specific and funny. Mix roasting wrong tippers, praising lucky ones, mocking jersey choices.

Standings:
${players}

Recent results:
${matchContext || 'No completed matches yet — joke about their pre-tournament predictions instead'}

IMPORTANT: Respond with ONLY a JSON array. No markdown, no explanation. Example:
["Rodrigo leads but picks Brazil every game — original strategy", "Bruno called a 3-0, got a 0-3 — at least the goals were right", "Last place, but proud"]`

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.2, maxOutputTokens: 300, responseMimeType: 'application/json' },
        })
      }
    )

    const data = await resp.json()
    console.log('Gemini raw response:', JSON.stringify(data).slice(0, 500))

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('Gemini text:', text)

    if (!text) {
      return NextResponse.json({ banter: ['Gemini had nothing to say. Shocking.', 'The banter engine is warming up.', 'Try again — the ref is reviewing it.'] })
    }

    // Try to parse JSON, handle various formats Gemini might return
    let parsed: string[] = []
    try {
      // Remove markdown fences if present
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      // If JSON parse fails, extract quoted strings
      const matches = text.match(/"([^"]+)"/g)
      if (matches) {
        parsed = matches.map((s: string) => s.replace(/"/g, '')).filter((s: string) => s.length > 10)
      }
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      parsed = ['The banter machine is still loading.', 'Ask again after a goal or two.', 'Even the AI is speechless at these tips.']
    }

    return NextResponse.json({ banter: parsed.slice(0, 3) })
  } catch (e) {
    console.error('Banter API error:', e)
    return NextResponse.json({ banter: ['Banter temporarily suspended by VAR.', 'Technical difficulties — blame the ref.', 'The banter will resume shortly.'] }, { status: 200 })
  }
}
