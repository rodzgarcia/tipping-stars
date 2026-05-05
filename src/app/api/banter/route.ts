import { NextRequest, NextResponse } from 'next/server'

const FALLBACKS = [
  "Someone here tips with the same strategy as a broken compass.",
  "The leaderboard is basically a monument to one person's suffering.",
  "Statistically, a random number generator would outperform half this group.",
]

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ banter: FALLBACKS })

  try {
    const { players, matchContext, seed, lang } = await req.json()
    const isPt = lang === 'pt'

    const prompt = isPt
      ? `Você é um bot de zoação hilarante para um grupo de amigos do WhatsApp que está jogando um bolão da Copa do Mundo. Gere exatamente 3 frases curtas e engraçadas (máx 18 palavras cada) sobre esta competição. Semente aleatória: ${seed}.

ESTILO: Como um amigo próximo que conhece todos há anos. Zoe sem piedade mas com carinho. Use os nomes reais. Seja específico sobre erros de palpite. Pode mencionar que alguém parece adivinhar no escuro, ou que está pagando para participar e perder, ou que talvez devesse apostar em time que não existe. Se a pessoa está em primeiro, faça graça que foi sorte. Se está em último, não deixe escapar.

Classificação e contexto:
${players}

Resultados recentes:
${matchContext || 'Nenhum jogo encerrado ainda'}

Responda APENAS com um array JSON de 3 strings, nada mais. Exemplo: ["frase um", "frase dois", "frase três"]`

      : `You are a savage but loveable banter bot for a tight-knit WhatsApp group running a World Cup tipping comp. Generate exactly 3 short roast lines (max 18 words each) about this competition. Random seed: ${seed}.

STYLE: Like a close mate who's known everyone for years. Ruthless but affectionate. Use real names. Be brutally specific about bad tips. Roast the person in last place mercilessly. If someone is winning, imply it's pure luck or a fluke. Reference specific wrong scores if available. Feel free to suggest someone tips by asking their cat, throwing darts blindfolded, or consulting a Magic 8-Ball. Mention that someone clearly didn't watch a single match before tipping. If scores are very close, create drama. Throw in a football reference or two.

Standings and context:
${players}

Recent results:
${matchContext || 'No completed matches yet — the suffering is just beginning'}

Reply with ONLY a JSON array of 3 strings, nothing else. Example: ["line one", "line two", "line three"]`

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest']
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
              generationConfig: { temperature: 1.3, maxOutputTokens: 400 },
            })
          }
        )
        const data = await resp.json()
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (text) break
      } catch {}
    }

    if (!text) return NextResponse.json({ banter: FALLBACKS })

    let parsed: string[] = []
    try {
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      const matches = text.match(/"([^"]{10,100})"/g)
      if (matches) parsed = matches.map((s: string) => s.slice(1, -1))
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ banter: FALLBACKS })
    }

    return NextResponse.json({ banter: parsed.slice(0, 3) })
  } catch (e) {
    return NextResponse.json({ banter: FALLBACKS })
  }
}
