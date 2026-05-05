export async function exportLeaderboardPDF(leaderboard: any[], profilesMap: any, tournament: any, lang: string) {
  const isPt = lang === 'pt'
  const appName = isPt ? 'BOLÃO DAS ESTRELAS' : 'TIPPING STARS'
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
    + '.h{background:#0a0f0d;color:white;padding:24px;border-radius:12px;margin-bottom:20px;text-align:center}'
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
    + '<div class="h"><div class="t">STAR ' + appName + ' STAR</div>'
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
  const appName = isPt ? 'BOLÃO DAS ESTRELAS' : 'TIPPING STARS'
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

  const style = 'body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111;font-size:13px}'
    + '.hd{background:#0a0f0d;color:white;padding:20px 24px;border-radius:12px;margin-bottom:20px}'
    + '.t{font-size:24px;font-weight:900;letter-spacing:3px;margin:0}'
    + '.s{font-size:14px;opacity:0.6;margin:4px 0 0}'
    + 'h2{font-size:13px;letter-spacing:2px;color:#166534;border-bottom:2px solid #166534;padding-bottom:4px;margin:16px 0 8px}'
    + '.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}'
    + '.row{display:flex;justify-content:space-between;padding:6px 10px;background:#f9fafb;border-radius:6px;border-left:3px solid #16a34a}'
    + '.pts{font-weight:900;color:#ca8a04}'
    + '.note{background:#fefce8;border:1px solid #fde047;border-radius:6px;padding:8px 12px;font-size:12px;color:#713f12;margin:8px 0}'
    + '.ft{margin-top:16px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:8px}'

  const h2 = (txt: string) => '<h2>' + txt + '</h2>'
  const row = (label: string, pts: string) => '<div class="row"><span>' + label + '</span><span class="pts">' + pts + '</span></div>'
  const note = (txt: string) => '<div class="note">' + txt + '</div>'
  const p = (txt: string) => '<p>' + txt + '</p>'

  let body = '<div class="hd"><div class="t">STAR ' + appName + '</div>'
    + '<div class="s">' + tn.name + ' — ' + (isPt ? 'Regras do Torneio' : 'Tournament Rules') + ' — ' + now + '</div></div>'

  body += h2(isPt ? '⚽ COMO FUNCIONA' : '⚽ HOW IT WORKS')
  body += p(isPt
    ? 'Para cada jogo, aposte no placar final aos 90 minutos. Os palpites bloqueiam ' + lkM + ' minutos antes do início. Pontos são cumulativos.'
    : 'Tip the final score at 90 minutes. Tips lock ' + lkM + ' minutes before kickoff. Points are cumulative.')

  body += h2(isPt ? '🎯 SISTEMA DE PONTUAÇÃO' : '🎯 POINTS SYSTEM')
  body += '<div class="grid">'
    + row('✅ ' + (isPt ? 'Vencedor correto' : 'Correct winner'), '+' + pW + ' pts')
    + row('⚖️ ' + (isPt ? 'Saldo de gols correto' : 'Correct goal difference'), '+' + pD + ' pts')
    + row('🎯 ' + (isPt ? 'Placar exato' : 'Exact score'), '+' + pE + ' pts')
    + (pB > 0 ? row('🚀 ' + (isPt ? 'Bônus goleada (' + thresh + '+ gols)' : 'Big margin bonus (' + thresh + '+ goals)'), '+' + pB + ' pts') : '')
    + '</div>'
  body += note(isPt
    ? '💡 Exemplo: Você apostou 2–0, resultado foi 2–0 → +' + pW + ' + ' + pD + ' + ' + pE + ' = ' + (pW + pD + pE) + ' pontos'
    : '💡 Example: You tip 2–0, result is 2–0 → +' + pW + ' + ' + pD + ' + ' + pE + ' = ' + (pW + pD + pE) + ' pts total')

  body += h2(isPt ? '🏆 MULTIPLICADORES POR FASE' : '🏆 PHASE MULTIPLIERS')
  body += p(isPt
    ? 'Grupos (×1) → Oitavas (×2) → Quartas (×3) → Quartas de Final (×4) → Semifinais (×5) → Final (×6)'
    : 'Group Stage (×1) → R32 (×2) → R16 (×3) → QF (×4) → SF (×5) → Final (×6)')

  body += h2(isPt ? '🤝 EMPATES' : '🤝 DRAWS')
  body += p(isPt
    ? 'Empate é válido. Aposte empate e acerte → vencedor (+' + pW + ') + saldo de gols (+' + pD + '). Placar exato → +' + pE + ' também.'
    : 'A draw is valid. Tip a draw and it ends level → winner (+' + pW + ') + goal diff (+' + pD + '). Exact score → +' + pE + ' too.')

  body += h2(isPt ? '⏱️ PRORROGAÇÃO E PÊNALTIS' : '⏱️ EXTRA TIME & PENALTIES')
  body += p(isPt
    ? 'Placar sempre aos 90 min. Prorrogação e pênaltis não afetam a pontuação. Vencedor = time que avança.'
    : 'Score is always at 90 minutes. Extra time and penalties do not affect scoring. Winner = team that advances.')

  body += h2(isPt ? '🗂️ CLASSIFICADOS POR GRUPO' : '🗂️ GROUP QUALIFIERS')
  body += p(isPt
    ? 'Escolha os 2 primeiros de cada grupo. ' + pQ + ' pontos para posição correta, ' + (pQ / 2) + ' para time certo posição errada.'
    : 'Pick top 2 from each group. ' + pQ + ' pts for correct position, ' + (pQ / 2) + ' for correct team wrong position.')

  if (tn.entry_fee > 0) {
    body += h2(isPt ? '💰 PREMIAÇÃO' : '💰 PRIZE POOL')
    body += p(isPt
      ? 'Entrada: ' + tn.currency + ' $' + tn.entry_fee + '. Divisão: 🥇 ' + (tn.prize_split_1st || 60) + '% · 🥈 ' + (tn.prize_split_2nd || 30) + '% · 🥉 ' + (tn.prize_split_3rd || 10) + '%'
      : 'Entry: ' + tn.currency + ' $' + tn.entry_fee + '. Split: 🥇 ' + (tn.prize_split_1st || 60) + '% · 🥈 ' + (tn.prize_split_2nd || 30) + '% · 🥉 ' + (tn.prize_split_3rd || 10) + '%')
  }

  body += '<div class="ft">' + appName + ' · ' + now + '</div>'

  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + style + '</style></head><body>' + body + '</body></html>'

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}
