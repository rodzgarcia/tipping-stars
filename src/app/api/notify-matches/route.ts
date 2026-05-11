import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseKey = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey)

    const { matchIds, tournamentId, lang } = await req.json()
    const isPt = lang === 'pt'
    const appName = isPt ? 'Bolão das Estrelas' : 'Tipping Stars'

    const { data: matches } = await supabase
      .from('matches')
      .select('id, home_team, away_team, kickoff_at, round')
      .in('id', matchIds)
      .order('kickoff_at')

    if (!matches?.length) {
      return NextResponse.json({ error: 'No matches found' }, { status: 400 })
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, name, tip_lock_minutes')
      .eq('id', tournamentId)
      .single()

    const { data: members } = await supabase
      .from('tournament_members')
      .select('user_id')
      .eq('tournament_id', tournamentId)
      .eq('status', 'approved')

    if (!members?.length) {
      return NextResponse.json({ error: 'No members found' }, { status: 400 })
    }

    const userIds = members.map((m: any) => m.user_id)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, nickname, email')
      .in('id', userIds)

    const profileMap: Record<string, any> = {}
    profiles?.forEach((p: any) => { profileMap[p.id] = p })

    const emailMap: Record<string, string> = {}
    if (serviceKey) {
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      authUsers?.users?.forEach((u: any) => { emailMap[u.id] = u.email })
    } else {
      profiles?.forEach((p: any) => { if (p.email) emailMap[p.id] = p.email })
    }

    const lockMins = tournament?.tip_lock_minutes ?? 120
    const tourName = tournament?.name || appName

    const ROUND_LABELS: Record<string, string> = isPt
      ? { group: 'Fase de Grupos', r32: 'Rodada de 32', r16: 'Oitavas de Final', qf: 'Quartas de Final', sf: 'Semifinais', final: 'Final' }
      : { group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-Finals', sf: 'Semi-Finals', final: 'Final' }

    const matchRows = matches.map((m: any) => {
      const kickoff = new Date(m.kickoff_at)
      const lockTime = new Date(kickoff.getTime() - lockMins * 60 * 1000)
      const kickoffStr = kickoff.toLocaleString(isPt ? 'pt-BR' : 'en-AU', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney'
      }) + ' AEST'
      const lockStr = lockTime.toLocaleString(isPt ? 'pt-BR' : 'en-AU', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney'
      }) + ' AEST'
      const roundLabel = ROUND_LABELS[m.round] || m.round || ''
      return '<tr>'
        + '<td style="padding:10px 14px;border-bottom:1px solid #1a2e1a;font-weight:600">' + m.home_team + ' vs ' + m.away_team + '</td>'
        + '<td style="padding:10px 14px;border-bottom:1px solid #1a2e1a;color:#fbbf24">' + kickoffStr + '</td>'
        + '<td style="padding:10px 14px;border-bottom:1px solid #1a2e1a;color:#f87171;font-size:12px">' + (isPt ? 'Bloqueia ' : 'Locks ') + lockStr + '</td>'
        + '<td style="padding:10px 14px;border-bottom:1px solid #1a2e1a;color:rgba(255,255,255,0.4);font-size:12px">' + roundLabel + '</td>'
        + '</tr>'
    }).join('')

    const tipUrl = 'https://tipping-stars.vercel.app/tournament/' + tournamentId
    let sent = 0
    let failed = 0
    let noEmail = 0
    const failedNames: string[] = []

    for (const member of members) {
      const email = emailMap[member.user_id]
      if (!email) {
        noEmail++
        continue
      }

      const name = profileMap[member.user_id]?.nickname || profileMap[member.user_id]?.display_name || 'Tipper'
      const matchCount = matches.length
      const subject = isPt
        ? '⚽ ' + matchCount + ' novo' + (matchCount > 1 ? 's jogos' : ' jogo') + ' disponível — ' + tourName
        : '⚽ ' + matchCount + ' new match' + (matchCount > 1 ? 'es' : '') + ' to tip — ' + tourName

      const html = '<!DOCTYPE html><html><body style="background:#0a0f0d;color:#e8f5ee;font-family:Arial,sans-serif;margin:0;padding:0">'
        + '<div style="max-width:540px;margin:0 auto;padding:32px 24px">'
        + '<div style="text-align:center;margin-bottom:24px">'
        + '<div style="font-size:28px;font-weight:900;letter-spacing:4px">⭐ ' + appName.toUpperCase() + ' ⭐</div>'
        + '<div style="color:#fbbf24;font-size:14px;margin-top:4px">' + tourName + '</div>'
        + '</div>'
        + '<div style="background:#0d1511;border:1px solid #1a3a1a;border-radius:12px;padding:24px">'
        + '<p style="margin:0 0 8px;font-size:18px">Hey ' + name + '! 👋</p>'
        + '<p style="color:rgba(255,255,255,0.6);margin:0 0 20px">'
        + '<strong style="color:#4ade80">'
        + matchCount + (isPt ? (matchCount > 1 ? ' novos jogos foram adicionados' : ' novo jogo foi adicionado') : (matchCount > 1 ? ' new matches have been added' : ' new match has been added'))
        + '</strong> '
        + (isPt ? 'em' : 'to') + ' <strong>' + tourName + '</strong>. '
        + (isPt ? 'Não perca seus pontos!' : "Don't miss out on points!")
        + '</p>'
        + '<table style="width:100%;border-collapse:collapse;margin-bottom:20px">'
        + '<thead><tr>'
        + '<th style="padding:8px 14px;text-align:left;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:1px;background:#0a1a0a">' + (isPt ? 'JOGO' : 'MATCH') + '</th>'
        + '<th style="padding:8px 14px;text-align:left;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:1px;background:#0a1a0a">' + (isPt ? 'INÍCIO' : 'KICKOFF') + '</th>'
        + '<th style="padding:8px 14px;text-align:left;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:1px;background:#0a1a0a">' + (isPt ? 'BLOQUEIO' : 'LOCK') + '</th>'
        + '<th style="padding:8px 14px;text-align:left;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:1px;background:#0a1a0a">' + (isPt ? 'FASE' : 'ROUND') + '</th>'
        + '</tr></thead>'
        + '<tbody>' + matchRows + '</tbody>'
        + '</table>'
        + '<a href="' + tipUrl + '" style="display:block;text-align:center;background:#22c55e;color:#0a0f0d;padding:14px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px">'
        + (isPt ? '⚽ Apostar agora →' : '⚽ Tip Now →')
        + '</a>'
        + '</div>'
        + '<p style="text-align:center;color:rgba(255,255,255,0.2);font-size:12px;margin-top:16px">'
        + (isPt ? 'Você está participando de ' : "You're in ") + tourName + '.'
        + '</p>'
        + '</div></body></html>'

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + resendKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Tipping Stars <onboarding@resend.dev>',
          to: email,
          subject,
          html,
        }),
      })

      if (res.ok) {
        sent++
      } else {
        failed++
        const errText = await res.text()
        console.error('Resend error for', email, errText)
        failedNames.push(name + ' (' + email + '): ' + errText)
      }
    }

    return NextResponse.json({ sent, failed, noEmail, total: members.length, failedNames })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
