import { NextRequest, NextResponse } from 'next/server'

// Cache odds for 6 hours to save API calls (500/month free tier)
const oddsCache: Record<string, { data: any, timestamp: number }> = {}
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

// Map our team names to The Odds API team names
const TEAM_MAP: Record<string, string> = {
  'United States': 'USA',
  'IR Iran': 'Iran',
  'South Korea': 'Korea Republic',
  'Czech Republic': 'Czechia',
  'Trinidad & Tobago': 'Trinidad and Tobago',
}

function normalise(name: string) {
  return (TEAM_MAP[name] || name).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function fuzzyMatch(a: string, b: string) {
  const na = normalise(a)
  const nb = normalise(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) return NextResponse.json({ odds: {} })

  const { searchParams } = new URL(req.url)
  const home = searchParams.get('home') || ''
  const away = searchParams.get('away') || ''
  const cacheKey = 'wc2026'

  try {
    // Check cache
    const cached = oddsCache[cacheKey]
    let allOdds: any[] = []

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      allOdds = cached.data
    } else {
      // Fetch FIFA World Cup odds
      const resp = await fetch(
        `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup_winner/odds?apiKey=${apiKey}&regions=au,uk&markets=h2h&oddsFormat=decimal`,
        { next: { revalidate: 21600 } }
      )
      
      if (!resp.ok) {
        // Try generic soccer
        const resp2 = await fetch(
          `https://api.the-odds-api.com/v4/sports?apiKey=${apiKey}`,
        )
        const sports = await resp2.json()
        console.log('Available sports:', JSON.stringify(sports).slice(0, 500))
        return NextResponse.json({ odds: null, message: 'WC odds not available yet' })
      }

      allOdds = await resp.json()
      oddsCache[cacheKey] = { data: allOdds, timestamp: Date.now() }
      console.log(`Fetched ${allOdds.length} matches from Odds API`)
    }

    // Find the matching game
    const match = allOdds.find((game: any) =>
      fuzzyMatch(game.home_team, home) && fuzzyMatch(game.away_team, away) ||
      fuzzyMatch(game.home_team, away) && fuzzyMatch(game.away_team, home)
    )

    if (!match) {
      return NextResponse.json({ odds: null, message: `No odds found for ${home} vs ${away}` })
    }

    // Get best odds from bookmakers
    const bookmakers = match.outcomes || match.bookmakers?.[0]?.markets?.[0]?.outcomes || []
    const h2h = match.bookmakers?.find((b: any) => b.markets?.find((m: any) => m.key === 'h2h'))
    const outcomes = h2h?.markets?.find((m: any) => m.key === 'h2h')?.outcomes || []

    if (outcomes.length === 0) return NextResponse.json({ odds: null })

    // Find home, draw, away odds
    const homeOdds = outcomes.find((o: any) => fuzzyMatch(o.name, home))?.price
    const awayOdds = outcomes.find((o: any) => fuzzyMatch(o.name, away))?.price
    const drawOdds = outcomes.find((o: any) => o.name === 'Draw')?.price

    return NextResponse.json({
      odds: {
        home: homeOdds ? Number(homeOdds).toFixed(2) : null,
        draw: drawOdds ? Number(drawOdds).toFixed(2) : null,
        away: awayOdds ? Number(awayOdds).toFixed(2) : null,
        bookmaker: h2h?.title || 'Bookmaker',
      }
    })
  } catch (e) {
    console.error('Odds API error:', e)
    return NextResponse.json({ odds: null })
  }
}
