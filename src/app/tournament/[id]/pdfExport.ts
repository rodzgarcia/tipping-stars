// Opens a print-ready window that matches the app's dark theme exactly

function openPrint(html: string, title: string) {
  const win = window.open('', '_blank')
  if (!win) { alert('Please allow popups to export PDF'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 800)
}

const BASE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0a0f0d;
    color: #e8f5ee;
    font-family: 'Inter', Arial, sans-serif;
    font-size: 13px;
    padding: 24px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @media print {
    body { padding: 12px; }
    @page { margin: 10mm; }
  }
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .app-name {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 4px;
    color: #e8f5ee;
  }
  .app-name span { color: #4ade80; }
  .meta { color: rgba(255,255,255,0.4); font-size: 12px; }
  .tour-name { color: #fbbf24; font-size: 14px; font-weight: 600; margin-top: 2px; }
  .section {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    margin-bottom: 16px;
    overflow: hidden;
  }
  .section-header {
    background: rgba(255,255,255,0.06);
    padding: 10px 16px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    padding: 8px 12px;
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.35);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.02);
  }
  th.center { text-align: center; }
  th.right { text-align: right; }
  td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr.me { background: rgba(74,222,128,0.05); }
  .rank { font-size: 16px; }
  .name { font-weight: 600; color: #e8f5ee; }
  .sub { font-size: 11px; color: rgba(255,255,255,0.3); }
  .pts { font-size: 20px; font-weight: 700; text-align: right; color: #e8f5ee; }
  .pts.gold { color: #fbbf24; }
  .center { text-align: center; }
  .green { color: #4ade80; font-weight: 600; }
  .blue { color: #60a5fa; font-weight: 600; }
  .yellow { color: #fbbf24; font-weight: 600; }
  .rule-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    gap: 12px;
  }
  .rule-row:last-child { border-bottom: none; }
  .rule-label { color: rgba(255,255,255,0.7); font-size: 13px; flex: 1; }
  .rule-example { color: rgba(255,255,255,0.35); font-size: 11px; margin-top: 3px; }
  .rule-value { font-weight: 700; font-size: 14px; color: #4ade80; white-space: nowrap; padding-left: 12px; }
  .warning-box {
    background: rgba(248,113,113,0.08);
    border: 1px solid rgba(248,113,113,0.2);
    border-radius: 8px;
    padding: 10px 14px;
    margin: 10px 16px;
    font-size: 12px;
    color: rgba(255,255,255,0.55);
    line-height: 1.6;
  }
  .warning-box strong { color: #f87171; }
  .footer {
    text-align: center;
    color: rgba(255,255,255,0.2);
    font-size: 11px;
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
`

export async function exportLeaderboardPDF(
  leaderboard: any[],
  profilesMap: any,
  tournament: any,
  lang: string,
  allTournamentTips?: any[]
) {
  const isPt = lang === 'pt'
  const appName = isPt ? 'BOLÃO DAS ESTRELAS' : 'TIPPING STARS'
  const tourName = tournament?.name || appName
  const now = new Date().toLocaleDateString(isPt ? 'pt-BR' : 'en-AU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const sorted = [...leaderboard].sort((a: any, b: any) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    if (b.exact_scores !== a.exact_scores) return b.exact_scores - a.exact_scores
    return (b.correct_goal_diff ?? 0) - (a.correct_goal_diff ?? 0)
  })

  const rows = sorted.map((row: any, i: number) => {
    const nick = profilesMap?.[row.user_id]?.nickname
    const name = nick || row.display_name || 'Player'
    const realName = nick ? row.display_name : ''
    const exact = row.exact_scores ?? 0
    const gd = Math.max(0, (row.correct_goal_diff ?? 0) - exact)
    const winners = Math.max(0, (row.correct_winners ?? 0) - (row.correct_goal_diff ?? 0))
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.'
    const ptsClass = i === 0 ? 'pts gold' : 'pts'
    // Qualifier count
    const tt = allTournamentTips?.find((tp: any) => tp.user_id === row.user_id)
    const qPts = Number(row.qualifier_points ?? 0)
    const ptsEach = Number(tournament?.pts_qualify || 20)
    const qCount = qPts > 0 && ptsEach > 0 ? (() => { const c = qPts / ptsEach; return c % 1 === 0 ? String(c) : c.toFixed(1) })() : '–'

    return `<tr>
      <td class="rank center">${medal}</td>
      <td>
        <div class="name">${name}</div>
        ${realName ? `<div class="sub">${realName}</div>` : ''}
        <div class="sub">${row.tips_submitted ?? 0} ${isPt ? 'palpites' : 'tips'}</div>
      </td>
      <td class="center green">${winners}</td>
      <td class="center blue">${gd}</td>
      <td class="center yellow">${exact}</td>
      <td class="center" style="color:#a78bfa;font-weight:600">${qCount}</td>
      <td class="${ptsClass}">${row.total_points}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${tourName} — ${isPt ? 'Classificação' : 'Leaderboard'}</title>
  <style>${BASE_STYLE}</style></head><body>
  <div class="app-header">
    <div>
      <div class="app-name">⭐ <span>${appName}</span> ⭐</div>
      <div class="tour-name">${tourName}</div>
    </div>
    <div style="text-align:right">
      <div class="meta">${isPt ? 'Classificação' : 'Leaderboard'}</div>
      <div class="meta">${now}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-header">📊 ${isPt ? 'CLASSIFICAÇÃO' : 'STANDINGS'}</div>
    <table>
      <thead><tr>
        <th class="center">#</th>
        <th>${isPt ? 'JOGADOR' : 'PLAYER'}</th>
        <th class="center">✅ ${isPt ? 'VIT' : 'WIN'}</th>
        <th class="center">⚖️ ${isPt ? 'SALDO' : 'GD'}</th>
        <th class="center">🎯 ${isPt ? 'EXATO' : 'EXACT'}</th>
        <th class="center">🗂️ ${isPt ? 'CLASS' : 'QUAL'}</th>
        <th class="right">${isPt ? 'PONTOS' : 'PTS'}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="footer">⭐ ${appName} · ${tourName} · ${now}</div>
  </body></html>`

  openPrint(html, tourName)
}

export async function exportRulesPDF(tournament: any, lang: string) {
  const isPt = lang === 'pt'
  const appName = isPt ? 'BOLÃO DAS ESTRELAS' : 'TIPPING STARS'
  const tn = tournament
  if (!tn) return
  const now = new Date().toLocaleDateString(isPt ? 'pt-BR' : 'en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const tourName = tn.name || appName

  const pW = tn.pts_winner ?? 2
  const pD = tn.pts_goal_diff ?? 3
  const pE = tn.pts_exact_score ?? 5
  const pB = tn.pts_big_margin_bonus ?? 0
  const pQ = tn.pts_qualify ?? 10
  const lkM = tn.tip_lock_minutes ?? 120
  const thresh = tn.big_margin_threshold ?? 3
  const pTotal = pW + pD + pE
  const pool = (tn.entry_fee || 0) * (tn.member_count || 0)
  const cur = tn.currency || 'A$'

  const mults = [
    ['group', isPt ? 'Fase de Grupos' : 'Group Stage', tn.multiplier_group ?? 1],
    ['r32', isPt ? 'Rodada de 32' : 'Round of 32', tn.multiplier_r32 ?? 2],
    ['r16', isPt ? 'Oitavas de Final' : 'Round of 16', tn.multiplier_r16 ?? 3],
    ['qf', isPt ? 'Quartas de Final' : 'Quarter-Finals', tn.multiplier_qf ?? 4],
    ['sf', isPt ? 'Semifinais' : 'Semi-Finals', tn.multiplier_sf ?? 5],
    ['final', 'Final', tn.multiplier_final ?? 6],
  ]

  const row = (label: string, value: string, example: string = '', colour: string = '#4ade80') =>
    `<div class="rule-row">
      <div>
        <div class="rule-label">${label}</div>
        ${example ? `<div class="rule-example">${example}</div>` : ''}
      </div>
      <div class="rule-value" style="color:${colour}">${value}</div>
    </div>`

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${tourName} — ${isPt ? 'Regras' : 'Rules'}</title>
  <style>${BASE_STYLE}</style></head><body>
  <div class="app-header">
    <div>
      <div class="app-name">⭐ <span>${appName}</span> ⭐</div>
      <div class="tour-name">${tourName}</div>
    </div>
    <div style="text-align:right">
      <div class="meta">${isPt ? 'Regras & Pontuação' : 'Rules & Scoring'}</div>
      <div class="meta">${now}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-header">⚽ ${isPt ? 'PONTUAÇÃO POR PARTIDA' : 'MATCH SCORING'}</div>
    ${row(isPt ? '✅ Vencedor correto' : '✅ Correct winner', `${pW} pts`, isPt ? `Ex: Tipou Brasil → Brasil vence → +${pW} pts` : `e.g. Tip Brazil → Brazil wins → +${pW} pts`, '#4ade80')}
    ${row(isPt ? '⚖️ Saldo de gols correto (além do vencedor)' : '⚖️ Correct goal difference (on top of winner)', `+${pD} pts`, isPt ? `Ex: Tipou 2–0 → Resultado 2–0 → +${pW} + ${pD} = ${pW+pD} pts` : `e.g. Tip 2–0 → Result 2–0 → +${pW} + ${pD} = ${pW+pD} pts`, '#60a5fa')}
    ${row(isPt ? '🎯 Placar exato (além do vencedor + saldo)' : '🎯 Exact score (on top of winner + goal diff)', `+${pE} pts`, isPt ? `Ex: Tipou 2–0 → Resultado 2–0 → +${pW} + ${pD} + ${pE} = ${pTotal} pts` : `e.g. Tip 2–0 → Result 2–0 → +${pW} + ${pD} + ${pE} = ${pTotal} pts`, '#fbbf24')}
    ${pB > 0 ? row(
      isPt ? `🚀 Bônus goleada (${thresh}+ gols de diferença — placar exato NÃO é necessário)` : `🚀 Big margin bonus (${thresh}+ goal diff — exact score NOT required)`,
      `+${pB} pts`,
      isPt ? `Ex: Tipou 5–0 → Resultado 6–0 → sua dica e o resultado têm ${thresh}+ gols de diferença na mesma direção → bônus! +${pB} pts` : `e.g. Tip 5–0 → Result 6–0 → both have ${thresh}+ goal diff same direction → bonus! +${pB} pts`,
      '#f87171'
    ) : ''}
  </div>

  <div class="section">
    <div class="section-header">📈 ${isPt ? 'MULTIPLICADORES POR FASE' : 'PHASE MULTIPLIERS'}</div>
    ${mults.map(([, label, mult]) => row(String(label), String(mult) + 'x', '', mult === 1 ? 'rgba(255,255,255,0.5)' : '#fbbf24')).join('')}
  </div>

  <div class="section">
    <div class="section-header">📊 ${isPt ? 'CLASSIFICADOS POR GRUPO' : 'GROUP QUALIFIERS'}</div>
    ${row(isPt ? 'Seleção na posição correta (1º ou 2º)' : 'Team in correct position (1st or 2nd)', `${pQ} pts`, isPt ? `Ex: Tipou Brasil 1º → Brasil termina 1º → +${pQ} pts` : `e.g. Tip Brazil 1st → Brazil finishes 1st → +${pQ} pts`, '#4ade80')}
    ${row(isPt ? 'Seleção avança mas posição errada' : 'Team qualifies but wrong position', `${Math.floor(pQ/2)} pts`, isPt ? `Ex: Tipou Brasil 1º → Brasil termina 2º → +${Math.floor(pQ/2)} pts` : `e.g. Tip Brazil 1st → Brazil finishes 2nd → +${Math.floor(pQ/2)} pts`, '#60a5fa')}
    ${row(isPt ? 'Seleção eliminada ou avança como melhor 3º' : "Team eliminated or advances as best 3rd", '0 pts', '', 'rgba(255,255,255,0.35)')}
    <div class="warning-box">
      <strong>⚠️ ${isPt ? 'Importante:' : 'Important:'}</strong> ${isPt
        ? `Apenas 1º e 2º lugares de cada grupo contam. Se um time avança como um dos melhores 3ºs colocados, você recebe 0 pontos.`
        : `Only 1st and 2nd place in each group count. If a team advances as one of the best 3rd-placed teams, you get 0 points.`}
    </div>
    <div class="rule-row" style="border-bottom:none">
      <div class="rule-label" style="color:rgba(255,255,255,0.4)">
        🔒 ${isPt ? `Palpites bloqueiam ${lkM} minutos antes do primeiro jogo do torneio` : `Picks lock ${lkM} minutes before the first match of the tournament`}
      </div>
    </div>
  </div>

  ${pool > 0 ? `<div class="section">
    <div class="section-header">💰 ${isPt ? 'PREMIAÇÃO' : 'PRIZE POOL'}</div>
    ${row(isPt ? 'Total' : 'Total pool', `${cur} ${pool.toLocaleString()}`, '', '#fbbf24')}
    ${row(`🥇 ${isPt ? '1º lugar' : '1st place'} (${tn.prize_split_1st ?? 60}%)`, `${cur} ${Math.floor(pool * (tn.prize_split_1st ?? 60) / 100).toLocaleString()}`, '', '#fbbf24')}
    ${row(`🥈 ${isPt ? '2º lugar' : '2nd place'} (${tn.prize_split_2nd ?? 30}%)`, `${cur} ${Math.floor(pool * (tn.prize_split_2nd ?? 30) / 100).toLocaleString()}`, '', '#9ca3af')}
    ${tn.prize_split_3rd > 0 ? row(`🥉 ${isPt ? '3º lugar' : '3rd place'} (${tn.prize_split_3rd}%)`, `${cur} ${Math.floor(pool * tn.prize_split_3rd / 100).toLocaleString()}`, '', '#b87333') : ''}
  </div>` : ''}

  <div class="section">
    <div class="section-header">⚖️ ${isPt ? 'DESEMPATE' : 'TIEBREAKER'}</div>
    <div style="padding:12px 16px;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.8">
      ${isPt
        ? '1. Maior pontuação total<br>2. Mais placares exatos<br>3. Mais saldos de gols corretos<br>4. Mais vencedores corretos'
        : '1. Total points<br>2. Most exact scores<br>3. Most correct goal differences<br>4. Most correct winners'}
    </div>
  </div>

  <div class="footer">⭐ ${appName} · ${tourName} · ${now}</div>
  </body></html>`

  openPrint(html, tourName)
}
