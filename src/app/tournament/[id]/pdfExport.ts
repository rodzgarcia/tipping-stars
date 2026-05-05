export async function exportLeaderboardPDF(leaderboard: any[], profilesMap: any, tournament: any, lang: string) {
  const isPt = lang === 'pt'
  const appName = isPt ? 'Bolão das Estrelas' : 'Tipping Stars'
  const title = tournament?.name || appName
  const sorted = [...leaderboard].sort((a: any, b: any) => b.total_points - a.total_points)
  const now = new Date().toLocaleDateString(isPt ? 'pt-BR' : 'en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const MEDAL = ['🥇', '🥈', '🥉']

  const rows = sorted.map((row: any, i: number) => {
    const name = profilesMap?.[row.user_id]?.nickname || row.display_name || 'Player'
    const exact = row.exact_scores ?? 0
    const gd = Math.max(0, (row.correct_goal_diff ?? 0) - exact)
    const winners = Math.max(0, (row.correct_winners ?? 0) - (row.correct_goal_diff ?? 0))
    const medal = i < 3 ? MEDAL[i] : String(i + 1) + '.'
    const bg = i % 2 === 0 ? '#f9fafb' : '#fff'
    const ptColor = i === 0 ? '#ca8a04' : '#111'
    return '<tr style="background:' + bg + '">'
      + '<td style="padding:8px 12px;font-weight:700;font-size:16px">' + medal + '</td>'
      + '<td style="padding:8px 12px;font-weight:600">' + name + '</td>'
      + '<td style="padding:8px 12px;text-align:center;color:#16a34a;font-weight:700">' + (row.tips_submitted ?? 0) + '</td>'
      + '<td style="padding:8px 12px;text-align:center;color:#ca8a04;font-weight:700">' + exact + '</td>'
      + '<td style="padding:8px 12px;text-align:center;color:#2563eb">' + gd + '</td>'
      + '<td style="padding:8px 12px;text-align:center;color:#16a34a">' + winners + '</td>'
      + '<td style="padding:8px 12px;text-align:center;font-size:18px;font-weight:900;color:' + ptColor + '">' + row.total_points + '</td>'
      + '</tr>'
  }).join('')

  const style = 'body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111}'
    + '.hd{background:#0a0f0d;color:white;padding:24px;border-radius:12px;margin-bottom:20px;text-align:center}'
    + '.t{font-size:28px;font-weight:900;letter-spacing:4px;margin:0}'
    + '.s{font-size:16px;opacity:0.6;margin:4px 0 0}'
    + 'table{width:100%;border-collapse:collapse;font-size:14px}'
    + 'th{background:#0a0f0d;color:white;padding:10px 12px;text-align:left;font-size:11px;letter-spacing:1px}'
    + '.f{margin-top:16px;text-align:center;font-size:11px;color:#999}'

  const lbl = isPt ? 'JOGADOR' : 'PLAYER'
  const lbl2 = isPt ? 'PALPITES' : 'TIPS'
  const lbl3 = isPt ? 'EXATO' : 'EXACT'
  const lbl4 = isPt ? 'SALDO' : 'GOAL DIFF'
  const lbl5 = isPt ? 'VENCEDOR' : 'WINNER'
  const lbl6 = isPt ? 'PONTOS' : 'POINTS'
  const lbl7 = isPt ? 'Ranking' : 'Leaderboard'
  const lbl8 = isPt ? 'Gerado em' : 'Generated on'

  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + style + '</style></head><body>'
    + '<div class="hd"><div class="t">⭐ ' + appName + ' ⭐</div>'
    + '<div class="s">' + title + ' — ' + lbl7 + ' — ' + now + '</div></div>'
    + '<table><thead><tr>'
    + '<th>#</th><th>' + lbl + '</th>'
    + '<th style="text-align:center">' + lbl2 + '</th>'
    + '<th style="text-align:center">🎯 ' + lbl3 + '</th>'
    + '<th style="text-align:center">⚖️ ' + lbl4 + '</th>'
    + '<th style="text-align:center">✅ ' + lbl5 + '</th>'
    + '<th style="text-align:center">' + lbl6 + '</th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table>'
    + '<div class="f">' + lbl8 + ' ' + now + ' · ' + appName + '</div>'
    + '</body></html>'

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}

export async function exportRulesPDF(tournament: any, lang: string) {
  const isPt = lang === 'pt'
  const appName = isPt ? 'Bolão das Estrelas' : 'Tipping Stars'
  const tn = tournament
  if (!tn) return
  const now = new Date().toLocaleDateString(isPt ? 'pt-BR' : 'en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  const pW = tn.pts_winner ?? 2
  const pD = tn.pts_goal_diff ?? 3
  const pE = tn.pts_exact_score ?? 5
  const pB = tn.pts_big_margin_bonus ?? 5
  const pQ = tn.pts_qualify ?? 10
  const lkM = tn.tip_lock_minutes ?? 120
  const thresh = tn.big_margin_threshold ?? 3
  const mG = tn.multiplier_group ?? 1
  const mR32 = tn.multiplier_r32 ?? 2
  const mR16 = tn.multiplier_r16 ?? 3
  const mQF = tn.multiplier_qf ?? 4
  const mSF = tn.multiplier_sf ?? 5
  const mF = tn.multiplier_final ?? 6
  const pTW = tn.pts_tournament_winner ?? 0
  const pTP2 = tn.pts_second_place ?? 0
  const pTP3 = tn.pts_third_place ?? 0
  const pTS = tn.pts_top_scorer ?? 0
  const cur = tn.currency || 'A$'
  const fee = tn.entry_fee || 0
  const s1 = tn.prize_split_1st || 60
  const s2 = tn.prize_split_2nd || 30
  const s3 = tn.prize_split_3rd || 10

  const style = 'body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111;font-size:13px}'
    + '.hd{background:#0a0f0d;color:white;padding:20px 24px;border-radius:12px;margin-bottom:20px}'
    + '.t{font-size:22px;font-weight:900;letter-spacing:3px;margin:0}'
    + '.s{font-size:13px;opacity:0.6;margin:4px 0 0}'
    + 'h2{font-size:13px;letter-spacing:2px;color:#166534;border-bottom:2px solid #166534;padding-bottom:4px;margin:16px 0 8px;text-transform:uppercase}'
    + '.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}'
    + '.row{display:flex;justify-content:space-between;padding:5px 10px;background:#f9fafb;border-radius:6px;border-left:3px solid #16a34a}'
    + '.pts{font-weight:900;color:#ca8a04}'
    + '.note{background:#fefce8;border:1px solid #fde047;border-radius:6px;padding:8px 12px;font-size:12px;color:#713f12;margin:8px 0}'
    + '.prize{background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin-bottom:12px}'
    + '.ft{margin-top:16px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:8px}'

  const h2 = (txt: string) => '<h2>' + txt + '</h2>'
  const row = (label: string, pts: string) => '<div class="row"><span>' + label + '</span><span class="pts">' + pts + '</span></div>'
  const note = (txt: string) => '<div class="note">' + txt + '</div>'
  const p = (txt: string) => '<p style="margin:4px 0 8px">' + txt + '</p>'

  let body = '<div class="hd"><div class="t">⭐ ' + appName + '</div>'
    + '<div class="s">' + tn.name + ' — ' + (isPt ? 'Regras do Torneio' : 'Tournament Rules') + ' — ' + now + '</div></div>'

  // PRIZE POOL FIRST
  if (fee > 0) {
    body += '<div class="prize">'
    body += '<div style="font-size:16px;font-weight:900;margin-bottom:8px">💰 ' + (isPt ? 'PREMIAÇÃO' : 'PRIZE POOL') + '</div>'
    body += '<div style="font-size:13px;margin-bottom:4px">' + (isPt ? 'Entrada' : 'Entry fee') + ': <strong>' + cur + ' $' + fee + '</strong> ' + (isPt ? 'por jogador' : 'per player') + '</div>'
    body += '<div style="display:flex;gap:16px;margin-top:8px">'
    body += '<div>🥇 ' + (isPt ? '1º lugar' : '1st place') + ': <strong>' + s1 + '%</strong></div>'
    body += '<div>🥈 ' + (isPt ? '2º lugar' : '2nd place') + ': <strong>' + s2 + '%</strong></div>'
    body += '<div>🥉 ' + (isPt ? '3º lugar' : '3rd place') + ': <strong>' + s3 + '%</strong></div>'
    body += '</div></div>'
  }

  // HOW IT WORKS
  body += h2(isPt ? '⚽ Como Funciona' : '⚽ How It Works')
  body += p(isPt
    ? 'Aposte no placar final aos 90 minutos. Palpites bloqueiam ' + lkM + ' min antes do início. Pontos são cumulativos — cada nível de acerto adiciona ao anterior.'
    : 'Tip the final score at 90 minutes. Tips lock ' + lkM + ' min before kickoff. Points are cumulative — each level of accuracy adds on top.')

  // POINTS SYSTEM
  body += h2(isPt ? '🎯 Sistema de Pontuação' : '🎯 Points System')
  body += '<div class="grid">'
    + row('✅ ' + (isPt ? 'Vencedor correto' : 'Correct winner'), '+' + pW + ' pts')
    + row('⚖️ ' + (isPt ? 'Saldo de gols correto' : 'Correct goal diff'), '+' + pD + ' pts')
    + row('🎯 ' + (isPt ? 'Placar exato' : 'Exact score'), '+' + pE + ' pts')
    + (pB > 0 ? row('🚀 ' + (isPt ? 'Bônus goleada (' + thresh + '+ gols)' : 'Big margin (' + thresh + '+ goals)'), '+' + pB + ' pts') : '')
    + '</div>'
  body += note(isPt
    ? '💡 Exemplo máximo: Você apostou 4–0, resultado foi 4–0 → +' + pW + ' + ' + pD + ' + ' + pE + (pB > 0 ? ' + ' + pB : '') + ' = ' + (pW + pD + pE + (pB > 0 ? pB : 0)) + ' pts'
    : '💡 Max example: You tip 4–0, result is 4–0 → +' + pW + ' + ' + pD + ' + ' + pE + (pB > 0 ? ' + ' + pB : '') + ' = ' + (pW + pD + pE + (pB > 0 ? pB : 0)) + ' pts')

  // PHASE MULTIPLIERS
  body += h2(isPt ? '🏆 Multiplicadores por Fase' : '🏆 Phase Multipliers')
  body += '<div class="grid">'
    + row(isPt ? 'Fase de Grupos' : 'Group Stage', '×' + mG)
    + row(isPt ? 'Oitavas de Final' : 'Round of 32', '×' + mR32)
    + row(isPt ? 'Oitavas' : 'Round of 16', '×' + mR16)
    + row(isPt ? 'Quartas de Final' : 'Quarter-Finals', '×' + mQF)
    + row(isPt ? 'Semifinais' : 'Semi-Finals', '×' + mSF)
    + row(isPt ? 'Final' : 'Final', '×' + mF)
    + '</div>'
  body += note(isPt
    ? '💡 Exemplo: Placar exato na Final = ' + pE + ' × ' + mF + ' = ' + (pE * mF) + ' pts!'
    : '💡 Example: Exact score in the Final = ' + pE + ' × ' + mF + ' = ' + (pE * mF) + ' pts!')

  // TOURNAMENT PREDICTIONS
  if (pTW > 0 || pTP2 > 0 || pTS > 0) {
    body += h2(isPt ? '🔮 Previsões do Torneio' : '🔮 Tournament Predictions')
    body += '<div class="grid">'
    if (pTW > 0) body += row('🏆 ' + (isPt ? 'Campeão da Copa' : 'World Cup Winner'), pTW + ' pts')
    if (pTP2 > 0) body += row('🥈 ' + (isPt ? '2º Lugar' : '2nd Place'), pTP2 + ' pts')
    if (pTP3 > 0) body += row('🥉 ' + (isPt ? '3º Lugar' : '3rd Place'), pTP3 + ' pts')
    if (pTS > 0) body += row('⚽ ' + (isPt ? 'Artilheiro' : 'Top Scorer'), pTS + ' pts')
    body += '</div>'
  }

  // GROUP QUALIFIERS
  body += h2(isPt ? '🗂️ Classificados por Grupo' : '🗂️ Group Qualifiers')
  body += p(isPt
    ? 'Escolha os 2 primeiros de cada grupo. ' + pQ + ' pts posição correta · ' + (pQ / 2) + ' pts time certo posição errada.'
    : 'Pick top 2 from each group. ' + pQ + ' pts correct position · ' + (pQ / 2) + ' pts correct team wrong position.')

  // DRAWS & EXTRA TIME
  body += h2(isPt ? '🤝 Empates & Prorrogação' : '🤝 Draws & Extra Time')
  body += p(isPt
    ? 'Empate vale vencedor (+' + pW + ') + saldo (+' + pD + '). Placar exato = +' + pE + ' também. Prorrogação/pênaltis não afetam pontuação — placar é sempre aos 90 min.'
    : 'Draw earns winner (+' + pW + ') + goal diff (+' + pD + '). Exact score = +' + pE + ' too. Extra time/penalties do not affect scoring — score is always at 90 min.')

  body += '<div class="ft">⭐ ' + appName + ' · ' + now + '</div>'

  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + style + '</style></head><body>' + body + '</body></html>'

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}
