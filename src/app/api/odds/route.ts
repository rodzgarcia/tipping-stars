import { NextRequest, NextResponse } from 'next/server'

// FIFA World Rankings (approximate March 2026)
const FIFA_RANKS: Record<string, number> = {
  'Argentina': 1, 'France': 2, 'England': 3, 'Spain': 4, 'Brazil': 5,
  'Portugal': 6, 'Belgium': 7, 'Netherlands': 8, 'Germany': 9, 'Italy': 10,
  'Morocco': 11, 'Croatia': 12, 'United States': 13, 'USA': 13, 'Mexico': 14,
  'Japan': 15, 'Uruguay': 16, 'Colombia': 17, 'Senegal': 18, 'Switzerland': 19,
  'Denmark': 20, 'South Korea': 21, 'Ecuador': 22, 'Canada': 23, 'Australia': 24,
  'Turkey': 25, 'Hungary': 26, 'Austria': 27, 'Ukraine': 28, 'Poland': 29,
  'Tunisia': 30, 'Peru': 31, 'Chile': 32, 'Serbia': 33, 'Slovakia': 34,
  'Czech Republic': 35, 'Czechia': 35, 'IR Iran': 36, 'Nigeria': 37, 'Norway': 38,
  'Wales': 39, 'Scotland': 40, 'Venezuela': 41, 'Paraguay': 42, 'Bolivia': 43,
  'Qatar': 44, 'Saudi Arabia': 45, 'Ghana': 46, 'South Africa': 47,
  'New Zealand': 48, 'Jamaica': 49, 'Panama': 50, 'Costa Rica': 51,
  'Honduras': 52, 'Albania': 53, 'Slovenia': 54, 'Iraq': 55, 'Mali': 56,
  'Kenya': 57, 'Haiti': 58, 'Trinidad & Tobago': 59, 'Curacao': 60,
  'Ivory Coast': 61, 'Egypt': 62, 'Jordan': 63, 'Uzbekistan': 64,
  'DR Congo': 65, 'Cape Verde': 66,
}

function getRank(team: string): number {
  return FIFA_RANKS[team] || 50
}

function calcOdds(homeRank: number, awayRank: number): { home: string, draw: string, away: string } {
  // Convert rank difference to probability
  // Lower rank = better team
  const diff = awayRank - homeRank // positive = home is better
  const homeAdv = 0.08 // home advantage ~8%

  // Sigmoid-based probability
  const homeStrength = 1 / (1 + Math.exp(diff * 0.04))
  const awayStrength = 1 - homeStrength

  // Adjust for home advantage
  let pHome = Math.min(0.75, Math.max(0.10, homeStrength + homeAdv))
  let pAway = Math.min(0.65, Math.max(0.10, awayStrength - homeAdv * 0.5))
  let pDraw = Math.max(0.18, Math.min(0.32, 1 - pHome - pAway))

  // Normalise
  const total = pHome + pDraw + pAway
  pHome /= total; pDraw /= total; pAway /= total

  // Convert to decimal odds with bookmaker margin (~5%)
  const margin = 0.95
  return {
    home: (margin / pHome).toFixed(2),
    draw: (margin / pDraw).toFixed(2),
    away: (margin / pAway).toFixed(2),
  }
}

// Cache Gemini-enhanced odds per match
const geminiCache: Record<string, any> = {}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const home = searchParams.get('home') || ''
  const away = searchParams.get('away') || ''

  if (!home || !away) return NextResponse.json({ odds: null })

  // Always return FIFA-based odds immediately as baseline
  const homeRank = getRank(home)
  const awayRank = getRank(away)
  const fifaOdds = { ...calcOdds(homeRank, awayRank), source: 'FIFA rankings' }

  // Try Gemini for better odds if available
  const apiKey = process.env.GEMINI_API_KEY
  const cacheKey = `${home}-${away}`

  if (apiKey && geminiCache[cacheKey]) {
    return NextResponse.json({ odds: geminiCache[cacheKey] })
  }

  if (apiKey) {
    try {
      const prompt = `Give realistic decimal betting odds for this World Cup 2026 match. Consider FIFA rankings, recent form, and team quality.

${home} (FIFA rank ~${homeRank}) vs ${away} (FIFA rank ~${awayRank})

Reply with ONLY JSON, no other text: {"home": 1.95, "draw": 3.40, "away": 3.80}`

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 50, temperature: 0.2 },
          })
        }
      )

      if (resp.ok) {
        const data = await resp.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const clean = text.replace(/```json\n?|\n?```/g, '').trim()
        const parsed = JSON.parse(clean)
        if (parsed.home && parsed.draw && parsed.away) {
          const result = { home: String(parsed.home), draw: String(parsed.draw), away: String(parsed.away), source: 'AI estimate' }
          geminiCache[cacheKey] = result
          return NextResponse.json({ odds: result })
        }
      }
    } catch { /* fall through to FIFA odds */ }
  }

  return NextResponse.json({ odds: fifaOdds })
}
