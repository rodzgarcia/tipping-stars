import { NextRequest, NextResponse } from 'next/server'

const FIFA_RANKS: Record<string, number> = {
  'Argentina': 1, 'France': 2, 'England': 3, 'Spain': 4, 'Brazil': 5,
  'Portugal': 6, 'Belgium': 7, 'Netherlands': 8, 'Germany': 9, 'Italy': 10,
  'Morocco': 11, 'Croatia': 12, 'United States': 13, 'USA': 13, 'Mexico': 14,
  'Japan': 15, 'Uruguay': 16, 'Colombia': 17, 'Senegal': 18, 'Switzerland': 19,
  'South Korea': 21, 'Ecuador': 22, 'Canada': 23, 'Australia': 24,
  'Turkey': 25, 'Austria': 27, 'Ukraine': 28, 'Poland': 29,
  'Tunisia': 30, 'Peru': 31, 'Chile': 32, 'Serbia': 33, 'Slovakia': 34,
  'Czech Republic': 35, 'Czechia': 35, 'IR Iran': 36, 'Nigeria': 37,
  'Wales': 39, 'Scotland': 40, 'Venezuela': 41, 'Paraguay': 42, 'Bolivia': 43,
  'Qatar': 44, 'Saudi Arabia': 45, 'Ghana': 46, 'South Africa': 47,
  'New Zealand': 48, 'Jamaica': 49, 'Panama': 50, 'Costa Rica': 51,
  'Honduras': 52, 'Albania': 53, 'Slovenia': 54, 'Iraq': 55, 'Mali': 56,
  'Kenya': 57, 'Haiti': 58, 'Trinidad & Tobago': 59, 'Curacao': 60,
  'Ivory Coast': 61, 'Egypt': 62, 'Jordan': 63, 'Uzbekistan': 64,
  'DR Congo': 65, 'Cape Verde': 66, 'Greece': 30, 'Hungary': 26, 'Norway': 38,
}

function getRank(team: string): number {
  return FIFA_RANKS[team] || 55
}

function calcOdds(homeRank: number, awayRank: number) {
  // diff > 0 means away is worse (home is better)
  const diff = awayRank - homeRank
  const homeAdv = 0.06

  // sigmoid: positive diff → homeStrength closer to 1 (home better)
  const homeStrength = 1 / (1 + Math.exp(-diff * 0.05))
  const awayStrength = 1 - homeStrength

  let pHome = Math.min(0.78, Math.max(0.10, homeStrength + homeAdv))
  let pAway = Math.min(0.70, Math.max(0.08, awayStrength - homeAdv * 0.5))
  let pDraw = Math.max(0.15, Math.min(0.32, 1 - pHome - pAway))

  const total = pHome + pDraw + pAway
  pHome /= total; pDraw /= total; pAway /= total

  // Return as percentages directly
  return {
    home: Math.round(pHome * 100) + '%',
    draw: Math.round(pDraw * 100) + '%',
    away: Math.round(pAway * 100) + '%',
    source: 'FIFA rankings'
  }
}

const geminiCache: Record<string, any> = {}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const home = searchParams.get('home') || ''
  const away = searchParams.get('away') || ''
  if (!home || !away) return NextResponse.json({ odds: null })

  const cacheKey = `${home}-${away}`
  if (geminiCache[cacheKey]) return NextResponse.json({ odds: geminiCache[cacheKey] })

  const homeRank = getRank(home)
  const awayRank = getRank(away)
  const fifaOdds = calcOdds(homeRank, awayRank)

  const apiKey = process.env.GEMINI_API_KEY
  if (apiKey) {
    try {
      const prompt = `Give win probability percentages for this World Cup 2026 match. ${home} (FIFA rank ~${homeRank}) vs ${away} (FIFA rank ~${awayRank}). Consider team quality, form, and that this is a neutral venue. Reply ONLY with JSON: {"home": 65, "draw": 20, "away": 15} where values are integers that sum to 100.`

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 40, temperature: 0.2 },
          })
        }
      )

      if (resp.ok) {
        const data = await resp.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const clean = text.replace(/```json\n?|\n?```/g, '').trim()
        const parsed = JSON.parse(clean)
        if (parsed.home && parsed.draw && parsed.away) {
          const result = {
            home: parsed.home + '%',
            draw: parsed.draw + '%',
            away: parsed.away + '%',
            source: 'AI estimate'
          }
          geminiCache[cacheKey] = result
          return NextResponse.json({ odds: result })
        }
      }
    } catch { /* fall through */ }
  }

  geminiCache[cacheKey] = fifaOdds
  return NextResponse.json({ odds: fifaOdds })
}
