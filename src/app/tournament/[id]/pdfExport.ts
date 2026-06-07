function openPrint(html: string) {
  const win = window.open('', '_blank')
  if (!win) { alert('Please allow popups to export PDF'); return }
  // Inject a reminder bar at the top
  const reminder = `<div style="position:fixed;top:0;left:0;right:0;background:#fbbf24;color:#0a0f0d;text-align:center;padding:8px;font-size:12px;font-weight:700;z-index:9999;font-family:Arial,sans-serif;">
    📄 To save as PDF: In the print dialog → More settings → enable <strong>"Background graphics"</strong> so colours print correctly
    <button onclick="this.parentElement.remove();window.print()" style="margin-left:12px;background:#0a0f0d;color:#fbbf24;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-weight:700;">Print / Save PDF</button>
  </div><div style="height:40px"></div>`
  win.document.write(html.replace('<body>', '<body>' + reminder))
  win.document.close()
  win.focus()
}

const BASE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background:#0a0f0d !important; color:#e8f5ee !important; font-family:'Inter',Arial,sans-serif; font-size:13px; padding:24px; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
  @media print {
    body { padding:10px; background:#0a0f0d !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    @page { margin:8mm; }
  }
  .app-header { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:14px; margin-bottom:18px; }
  .app-name { font-size:20px; font-weight:900; letter-spacing:4px; color:#e8f5ee; }
  .app-name span { color:#4ade80; }
  .tour-name { color:#fbbf24; font-size:13px; font-weight:600; margin-top:2px; }
  .meta { color:rgba(255,255,255,0.35); font-size:11px; }
  .section { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; margin-bottom:14px; overflow:hidden; }
  .section-hd { background:rgba(255,255,255,0.06); padding:9px 14px; font-size:10px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,0.45); border-bottom:1px solid rgba(255,255,255,0.06); }
  .row { display:flex; justify-content:space-between; align-items:flex-start; padding:9px 14px; border-bottom:1px solid rgba(255,255,255,0.04); gap:12px; }
  .row:last-child { border-bottom:none; }
  .row-label { color:rgba(255,255,255,0.6); font-size:12px; flex:1; line-height:1.5; }
  .row-ex { color:rgba(255,255,255,0.28); font-size:10px; margin-top:2px; font-style:italic; }
  .row-val { font-weight:700; font-size:13px; color:#4ade80; white-space:nowrap; padding-left:10px; }
  .info-box { margin:8px 14px; padding:9px 12px; border-radius:8px; font-size:11px; line-height:1.65; }
  .blue-box { background:rgba(96,165,250,0.06); border:1px solid rgba(96,165,250,0.15); color:rgba(255,255,255,0.5); }
  .yellow-box { background:rgba(251,191,36,0.05); border:1px solid rgba(251,191,36,0.12); color:rgba(255,255,255,0.5); }
  .red-box { background:rgba(248,113,113,0.07); border:1px solid rgba(248,113,113,0.2); color:rgba(255,255,255,0.5); }
  .box-title { font-weight:700; margin-bottom:4px; }
  .blue-box .box-title { color:#60a5fa; }
  .yellow-box .box-title { color:#fbbf24; }
  .red-box .box-title { color:#f87171; }
  table { width:100%; border-collapse:collapse; }
  th { padding:8px 12px; text-align:left; font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,0.3); border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02); }
  th.c { text-align:center; } th.r { text-align:right; }
  td { padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.04); vertical-align:middle; font-size:13px; }
  tr:last-child td { border-bottom:none; }
  .rank { font-size:15px; text-align:center; }
  .nm { font-weight:600; color:#e8f5ee; }
  .sub { font-size:10px; color:rgba(255,255,255,0.3); }
  .pts { font-size:19px; font-weight:700; text-align:right; }
  .footer { text-align:center; color:rgba(255,255,255,0.2); font-size:10px; margin-top:20px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.06); }
`

const R = (label: string, value: string, colour: string, example = '') =>
  `<div class="row">
    <div><div class="row-label">${label}</div>${example ? `<div class="row-ex">${example}</div>` : ''}</div>
    <div class="row-val" style="color:${colour}">${value}</div>
  </div>`

export async function exportLeaderboardPDF(leaderboard: any[], profilesMap: any, tournament: any, lang: string, allTournamentTips?: any[]) {
  const isPt = lang === 'pt'
  const appName = isPt ? 'BOLÃO DAS ESTRELAS' : 'TIPPING STARS'
  const tourName = tournament?.name || appName
  const now = new Date().toLocaleString(isPt ? 'pt-BR' : 'en-AU', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
  const sorted = [...leaderboard].sort((a:any,b:any) => b.total_points - a.total_points || (b.exact_scores??0) - (a.exact_scores??0) || (b.correct_goal_diff??0) - (a.correct_goal_diff??0))
  const MEDAL = ['🥇','🥈','🥉']

  const rows = sorted.map((row:any, i:number) => {
    const nick = profilesMap?.[row.user_id]?.nickname
    const name = nick || row.display_name || 'Player'
    const sub = nick ? row.display_name : `${row.tips_submitted ?? 0} ${isPt ? 'palpites' : 'tips'}`
    const exact = row.exact_scores ?? 0
    const gd = Math.max(0, (row.correct_goal_diff ?? 0) - exact)
    const winners = Math.max(0, (row.correct_winners ?? 0) - (row.correct_goal_diff ?? 0))
    const qPts = Number(row.qualifier_points ?? 0)
    const ptsEach = Number(tournament?.pts_qualify || 20)
    const qCount = qPts > 0 && ptsEach > 0 ? (() => { const c = qPts/ptsEach; return c%1===0?String(c):c.toFixed(1) })() : '–'
    const medal = i < 3 ? MEDAL[i] : (i+1)+'.'
    const ptsColor = i === 0 ? '#fbbf24' : '#e8f5ee'
    return `<tr>
      <td class="rank">${medal}</td>
      <td><div class="nm">${name}</div><div class="sub">${sub}</div></td>
      <td style="text-align:center;color:#4ade80;font-weight:600">${winners}</td>
      <td style="text-align:center;color:#60a5fa;font-weight:600">${gd}</td>
      <td style="text-align:center;color:#fbbf24;font-weight:600">${exact}</td>
      <td style="text-align:center;color:#a78bfa;font-weight:600">${qCount}</td>
      <td class="pts" style="color:${ptsColor}">${row.total_points}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_STYLE}</style></head><body>
  <div class="app-header">
    <div><div class="app-name">⭐ <span>${appName}</span> ⭐</div><div class="tour-name">${tourName}</div></div>
    <div style="text-align:right"><div class="meta">${isPt?'Classificação':'Leaderboard'}</div><div class="meta">${now}</div></div>
  </div>
  <div class="section">
    <div class="section-hd">📊 ${isPt?'CLASSIFICAÇÃO':'STANDINGS'}</div>
    <table><thead><tr>
      <th class="c">#</th><th>${isPt?'JOGADOR':'PLAYER'}</th>
      <th class="c">✅ ${isPt?'VIT':'WIN'}</th>
      <th class="c">⚖️ ${isPt?'SALDO':'GD'}</th>
      <th class="c">🎯 ${isPt?'EXATO':'EXACT'}</th>
      <th class="c">🗂️ ${isPt?'CLASS':'QUAL'}</th>
      <th class="r">${isPt?'PONTOS':'PTS'}</th>
    </tr></thead><tbody>${rows}</tbody></table>
  </div>
  <div class="footer">⭐ ${appName} · ${tourName} · ${now}</div>
  </body></html>`

  openPrint(html)
}

export async function exportRulesPDF(tournament: any, lang: string, approvedCount?: number) {
  const isPt = lang === 'pt'
  const appName = isPt ? 'BOLÃO DAS ESTRELAS' : 'TIPPING STARS'
  const tn = tournament
  if (!tn) return
  const now = new Date().toLocaleDateString(isPt?'pt-BR':'en-AU', { day:'numeric', month:'long', year:'numeric' })
  const tourName = tn.name || appName

  const pW = tn.pts_winner || tn.pts_correct_winner || 2
  const pD = tn.pts_goal_diff || tn.pts_correct_goal_diff || 3
  const pE = tn.pts_exact_score || tn.pts_correct_exact_score || 5
  const pB = tn.pts_big_margin_bonus || 0
  const pQ = tn.pts_qualify || tn.pts_qualifying_teams || 0
  const pTW = tn.pts_tournament_winner || 10
  const pSec = tn.pts_second_place || 6
  const pThi = tn.pts_third_place || 4
  const pSco = tn.pts_top_scorer || 8
  const lkM = tn.tip_lock_minutes || 120
  const thresh = tn.big_margin_threshold || 3
  const pTotal = pW + pD + pE
  const pool = (tn.entry_fee || 0) * (approvedCount || tn.member_count || 0)
  const cur = tn.currency || 'A$'
  const p1 = Math.floor(pool * (tn.prize_split_1st ?? 60) / 100)
  const p2 = Math.floor(pool * (tn.prize_split_2nd ?? 30) / 100)
  const p3 = Math.floor(pool * (tn.prize_split_3rd ?? 10) / 100)

  const mults = [
    [isPt?'Fase de Grupos':'Group Stage', tn.multiplier_group ?? 1],
    [isPt?'Rodada de 32':'Round of 32', tn.multiplier_r32 ?? 2],
    [isPt?'Oitavas de Final':'Round of 16', tn.multiplier_r16 ?? 3],
    [isPt?'Quartas de Final':'Quarter-Finals', tn.multiplier_qf ?? 4],
    [isPt?'Semifinais':'Semi-Finals', tn.multiplier_sf ?? 5],
    ['Final', tn.multiplier_final ?? 6],
  ]

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_STYLE}</style></head><body>
  <div class="app-header">
    <div><div class="app-name">⭐ <span>${appName}</span> ⭐</div><div class="tour-name">${tourName}</div></div>
    <div style="text-align:right"><div class="meta">${isPt?'Regras & Pontuação':'Rules & Scoring'}</div><div class="meta">${now}</div></div>
  </div>

  <div class="section">
    <div class="section-hd">⚽ ${isPt?'COMO FUNCIONA':'HOW IT WORKS'}</div>
    <div class="row" style="border-bottom:none">
      <div class="row-label" style="line-height:1.7">
        ${isPt
          ? `Para cada jogo, você aposta o placar final aos 90 minutos. Os pontos são cumulativos — cada nível de acerto adiciona pontos ao anterior. As dicas bloqueiam ${lkM} minutos antes do apito inicial.`
          : `For each match, tip the final score at 90 minutes. Points are cumulative — each level of accuracy adds on top of the previous. Tips lock ${lkM} minutes before kickoff.`}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-hd">🎯 ${isPt?'PONTUAÇÃO':'POINTS SYSTEM'}</div>
    <div class="row" style="border-bottom:none;padding-bottom:2px">
      <div class="row-label" style="color:rgba(255,255,255,0.3);font-size:11px">
        ${isPt?'Os pontos se acumulam — acertar o placar exato também conta como vencedor e saldo de gols:':'Points stack — getting the exact score also earns winner and goal difference points:'}
      </div>
    </div>
    ${R(isPt?'✅ Vencedor correto':'✅ Correct winner', `${pW} pts`, '#4ade80',
      isPt?`Ex: Tipou Brasil para vencer → Brasil vence → +${pW} pts`:`e.g. Tip Brazil to win → Brazil wins → +${pW} pts`)}
    ${R(isPt?'⚖️ Saldo de gols correto (além do vencedor)':'⚖️ Correct goal difference (on top of winner)', `+${pD} pts`, '#60a5fa',
      isPt?`Ex: Tipou 2–0 → Resultado 3–1 (mesma diferença de 2) → +${pW} + ${pD} = ${pW+pD} pts`:`e.g. Tip 2–0 → Result 3–1 (same diff of 2) → +${pW} + ${pD} = ${pW+pD} pts`)}
    ${R(isPt?'🎯 Placar exato (além do vencedor + saldo)':'🎯 Exact score (on top of winner + goal diff)', `+${pE} pts`, '#fbbf24',
      isPt?`Ex: Tipou 1–0 → Resultado 1–0 → +${pW} + ${pD} + ${pE} = ${pTotal} pts`:`e.g. Tip 1–0 → Result 1–0 → +${pW} + ${pD} + ${pE} = ${pTotal} pts`)}
    ${pB > 0 ? R(
      isPt?`🚀 Bônus goleada (${thresh}+ gols de diferença — placar exato NÃO necessário)`:`🚀 Big margin bonus (${thresh}+ goal diff — exact score NOT required)`,
      `+${pB} pts`, '#f87171',
      isPt?`Ex: Tipou 5–0 → Resultado 6–0 → ambos têm ${thresh}+ gols de diferença → bônus! +${pB} pts`:`e.g. Tip 5–0 → Result 6–0 → both have ${thresh}+ goal diff same direction → bonus! +${pB} pts`
    ) : ''}
    <div class="info-box blue-box">
      <div class="box-title">🤝 ${isPt?'EMPATES':'DRAWS'}</div>
      ${isPt
        ? `Empate é um resultado válido. Se você tipar empate e o jogo terminar empatado, ganha o vencedor correto (${pW} pts). Como todo empate tem saldo zero, você também ganha +${pD} pts. E se o placar for exato, mais +${pE} pts.<br><em style="color:rgba(255,255,255,0.28)">Ex: Tipou 1–1 → Resultado: 2–2 → +${pW} + ${pD} = ${pW+pD} pts (vencedor + saldo, não placar exato)</em>`
        : `A draw is a valid outcome. If you tip a draw and it ends level, you earn correct winner (${pW} pts). Since all draws have goal diff of 0, you also earn +${pD} pts. If the exact scoreline matches, +${pE} pts too.<br><em style="color:rgba(255,255,255,0.28)">e.g. Tip 1–1 → Result: 2–2 → +${pW} + ${pD} = ${pW+pD} pts (winner + goal diff, not exact score)</em>`}
    </div>
    <div class="info-box yellow-box" style="margin-bottom:14px">
      <div class="box-title">⏱️ ${isPt?'PRORROGAÇÃO E PÊNALTIS (FASES ELIMINATÓRIAS)':'EXTRA TIME & PENALTIES (KNOCKOUT ROUNDS)'}</div>
      ${isPt
        ? `O placar para pontuação é sempre o resultado aos 90 minutos (tempo normal). Prorrogação e pênaltis não afetam o placar para fins de palpite. Para o ponto de vencedor correto nas fases eliminatórias, o time que efetivamente avança conta — seja no tempo normal, prorrogação ou pênaltis.<br><em style="color:rgba(255,255,255,0.28)">Ex: Brasil 1–1 França aos 90 min → pênaltis → Brasil avança. Placar = 1–1. Vencedor correto = Brasil.</em>`
        : `The score for points is always the 90-minute result (regular time). Extra time and penalties do not affect the score for tipping. For the correct winner point in knockout rounds, the team that actually advances counts — whether through regular time, extra time, or penalties.<br><em style="color:rgba(255,255,255,0.28)">e.g. Brazil 1–1 France after 90 min → penalties → Brazil advances. Score = 1–1. Correct winner = Brazil.</em>`}
    </div>
  </div>

  <div class="section">
    <div class="section-hd">✖️ ${isPt?'MULTIPLICADORES POR FASE':'PHASE MULTIPLIERS'}</div>
    <div class="row" style="border-bottom:none;padding-bottom:2px">
      <div class="row-label" style="color:rgba(255,255,255,0.3);font-size:11px">
        ${isPt?'Todos os pontos são multiplicados de acordo com a fase:':'All points are multiplied based on the tournament phase:'}
      </div>
    </div>
    ${mults.filter(([,v]) => Number(v) > 0).map(([label, val]) =>
      R(String(label), `${val}x`, Number(val) > 1 ? '#fbbf24' : 'rgba(255,255,255,0.45)')
    ).join('')}
    <div style="padding:8px 14px;font-size:11px;color:rgba(255,255,255,0.3)">
      💡 ${isPt?`Ex: Placar exato na semifinal → ${pTotal} pts × ${tn.multiplier_sf||5}x = ${pTotal*(tn.multiplier_sf||5)} pts`:`e.g. Exact score in semi-final → ${pTotal} pts × ${tn.multiplier_sf||5}x = ${pTotal*(tn.multiplier_sf||5)} pts`}
    </div>
  </div>

  <div class="section">
    <div class="section-hd">🔒 ${isPt?'BLOQUEIO DAS DICAS':'TIP LOCK TIMES'}</div>
    <div class="row" style="border-bottom:none">
      <div class="row-label" style="line-height:1.8">
        ${isPt
          ? `• Palpites de partidas: bloqueiam ${lkM} minutos antes do apito inicial.<br>• Classificados por grupo: bloqueiam antes do primeiro jogo do torneio.<br>• Previsões do torneio (campeão, artilheiro): bloqueiam antes do primeiro jogo do torneio.`
          : `• Match tips lock ${lkM} minutes before each kickoff.<br>• Group qualifier picks lock before the first match of the tournament.<br>• Tournament predictions (winner, top scorer) lock before the first match of the tournament.`}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-hd">🏆 ${isPt?'PREVISÕES DO TORNEIO':'TOURNAMENT PREDICTIONS'}</div>
    ${R(isPt?'🥇 Campeão':'🥇 Tournament winner', `${pTW} pts`, '#fbbf24',
      isPt?`Ex: Tipou Brasil → Brasil vence a Copa → +${pTW} pts`:`e.g. Tip Brazil → Brazil wins the World Cup → +${pTW} pts`)}
    ${R(isPt?'🥈 Vice-campeão':'🥈 Runner-up (2nd place)', `${pSec} pts`, '#9ca3af',
      isPt?`Ex: Tipou Argentina → Argentina é vice → +${pSec} pts`:`e.g. Tip Argentina → Argentina finishes 2nd → +${pSec} pts`)}
    ${R(isPt?'🥉 3º lugar':'🥉 3rd place', `${pThi} pts`, '#b87333',
      isPt?`Ex: Tipou França → França vence 3º lugar → +${pThi} pts`:`e.g. Tip France → France wins 3rd place → +${pThi} pts`)}
    ${R(isPt?'⚽ Artilheiro':'⚽ Top scorer', `${pSco} pts`, '#4ade80',
      isPt?`Ex: Tipou Mbappé → Mbappé é artilheiro → +${pSco} pts`:`e.g. Tip Mbappé → Mbappé finishes top scorer → +${pSco} pts`)}
  </div>

  ${pQ > 0 ? `<div class="section">
    <div class="section-hd">📊 ${isPt?'CLASSIFICADOS POR GRUPO':'GROUP QUALIFIERS'}</div>
    ${R(isPt?'Seleção na posição correta (1º ou 2º)':'Team in correct position (1st or 2nd)', `${pQ} pts`, '#4ade80',
      isPt?`Ex: Tipou Brasil 1º → Brasil termina 1º → +${pQ} pts`:`e.g. Tip Brazil 1st → Brazil finishes 1st → +${pQ} pts`)}
    ${R(isPt?'Seleção avança mas posição errada':'Team qualifies but wrong position', `${Math.floor(pQ/2)} pts`, '#60a5fa',
      isPt?`Ex: Tipou Brasil 1º → Brasil termina 2º → +${Math.floor(pQ/2)} pts`:`e.g. Tip Brazil 1st → Brazil finishes 2nd → +${Math.floor(pQ/2)} pts`)}
    ${R(isPt?'Seleção eliminada ou avança como melhor 3º':"Team eliminated or advances as best 3rd", '0 pts', 'rgba(255,255,255,0.35)')}
    <div class="info-box red-box" style="margin-bottom:10px">
      <div class="box-title">⚠️ ${isPt?'Importante:':'Important:'}</div>
      ${isPt
        ? 'Apenas 1º e 2º lugares de cada grupo contam. Se um time avança como um dos melhores 3ºs colocados, você recebe 0 pontos — somente as duas primeiras posições do grupo valem.'
        : 'Only 1st and 2nd place in each group count. If a team advances as one of the best 3rd-placed teams, you get 0 points — only the top two positions in the group count.'}
    </div>
  </div>` : ''}

  ${(tn.prize_split_1st != null || tn.prize_split_2nd != null) ? `<div class="section">
    <div class="section-hd">💰 ${isPt?'PREMIAÇÃO':'PRIZE POOL'}</div>
    ${R(`🥇 ${isPt?'1º lugar':'1st place'}`, `${tn.prize_split_1st??60}%`, '#fbbf24')}
    ${R(`🥈 ${isPt?'2º lugar':'2nd place'}`, `${tn.prize_split_2nd??30}%`, '#9ca3af')}
    ${(tn.prize_split_3rd ?? 0) > 0 ? R(`🥉 ${isPt?'3º lugar':'3rd place'}`, `${tn.prize_split_3rd}%`, '#b87333') : ''}
  </div>` : ''}

  <div class="section">
    <div class="section-hd">⚖️ ${isPt?'DESEMPATE':'TIEBREAKER'}</div>
    <div class="row" style="border-bottom:none">
      <div class="row-label" style="line-height:1.8">
        ${isPt
          ? '1. Maior pontuação total<br>2. Mais placares exatos<br>3. Mais saldos de gols corretos<br>4. Mais vencedores corretos'
          : '1. Total points<br>2. Most exact scores<br>3. Most correct goal differences<br>4. Most correct winners'}
      </div>
    </div>
  </div>

  <div class="footer">⚽ ${isPt?'Boa sorte a todos!':'Good luck everyone!'} · ${appName} · ${tourName} · ${now}</div>
  </body></html>`

  openPrint(html)
}
