import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ banter: ['No API key set — even the AI gave up on this group.'] })

  try {
    const { players, matchContext, seed, lang } = await req.json()
    const isPt = lang === 'pt'

    const ptPrompt = `Você é um bot de zoação IMPLACÁVEL para um grupo de amigos que está jogando um bolão da Copa do Mundo. Você conhece todo mundo há anos e não tem NENHUM filtro. Gere exatamente 3 zoações DIFERENTES e ENGRAÇADAS sobre essa competição. Semente: ${seed}.

REGRAS DE OURO:
- Use os apelidos/nomes reais das pessoas — quanto mais específico melhor
- Zoação é sobre os PALPITES, não sobre futebol em geral
- Quem está em último: destrua sem piedade
- Quem está em primeiro: diga que foi sorte, que até um cego acertaria, que deve estar trapaceando
- Mencione scores específicos se disponível (tipo "quem deu 3-0 num jogo que terminou 1-1?")
- Invente teorias ridículas: tipou baseado no nome do time, no uniforme, pediu pro filho de 4 anos, consultou horóscopo
- Pode falar que alguém paga pra perder, que está disputando com si mesmo pelo último lugar
- Use expressões brasileiras: "tá de zueira", "meteu o pé", "palpite de padeiro", "apostou no errado de olho fechado"
- NUNCA repita a mesma estrutura duas vezes
- Máximo 20 palavras por frase — curto e certeiro

Classificação atual:
${players}

Resultados e palpites recentes:
${matchContext || 'Nenhum jogo encerrado — o sofrimento mal começou'}

Responda APENAS com array JSON de 3 strings. Exemplo: ["frase1", "frase2", "frase3"]`

    const enPrompt = `You are a RUTHLESS roast bot for a tight WhatsApp group running a World Cup tipping comp. You've known everyone for years and have ZERO filter. Generate exactly 3 DIFFERENT savage roasts about this competition. Seed: ${seed}.

GOLDEN RULES:
- Use real names/nicknames — the more specific the better
- Roast is about their TIPS, not football in general
- Last place: absolutely destroy them, show no mercy
- First place: imply pure dumb luck, suggest they're cheating, say even a goldfish could've done it
- Reference SPECIFIC wrong scores if available (like "who actually tipped 4-0 on that 1-1 draw?")
- Invent ridiculous theories: tipped based on kit colour, asked their dog, used a horoscope, let their toddler smash the keyboard
- Suggest the last place person is competing against themselves for the wooden spoon
- Call out anyone who tipped the exact wrong score (got winner wrong AND score wrong)
- If scores are close: manufacture drama about who's about to collapse
- Mix football banter: "hasn't watched a match", "tips from vibes only", "confusing this with cricket"
- NEVER repeat the same structure twice — vary the format
- Max 20 words per line — short and brutal

Current standings:
${players}

Recent results and tips:
${matchContext || 'No completed matches yet — the suffering is just beginning'}

Reply with ONLY a JSON array of 3 strings. Example: ["line1", "line2", "line3"]`

    const models = ['gemini-1.5-flash-8b', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-lite']
    let text = ''

    for (const model of models) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: isPt ? ptPrompt : enPrompt }] }],
              generationConfig: { temperature: 1.6, maxOutputTokens: 500 },
            })
          }
        )
        const data = await resp.json()
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (text) break
      } catch {}
    }

    if (!text) return NextResponse.json({ banter: isPt
      ? ['O bot tentou zoar mas deu erro — como os seus palpites.']
      : ['The AI tried to roast but errored out — just like your tips.']
    })

    let parsed: string[] = []
    try {
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      const matches = text.match(/"([^"]{10,150})"/g)
      if (matches) parsed = matches.map((s: string) => s.slice(1, -1))
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ banter: isPt
        ? ['Nem o AI conseguiu encontrar palavras para descrever esses palpites.']
        : ['Even the AI was speechless at how bad these tips are.']
      })
    }

    return NextResponse.json({ banter: parsed.slice(0, 3) })
  } catch (e) {
    return NextResponse.json({ banter: ['Error generating banter — the tips were so bad it crashed the AI.'] })
  }
}
