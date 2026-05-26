export const TEAM_FLAGS: Record<string, string> = {
  'Albania':'al',  'Argentina':'ar',  'Australia':'au',  'Austria':'at',
  'Belgium':'be',  'Bolivia':'bo',  'Brazil':'br',  'Canada':'ca',
  'Chile':'cl',  'Colombia':'co',  'Costa Rica':'cr',  'Croatia':'hr',
  'Czech Republic':'cz',  'Czechia':'cz',  'Ecuador':'ec',  'Egypt':'eg',
  'England':'gb-eng',  'France':'fr',  'Germany':'de',  'Ghana':'gh',
  'Greece':'gr',  'Honduras':'hn',  'Hungary':'hu',  'IR Iran':'ir',
  'Italy':'it',  'Jamaica':'jm',  'Japan':'jp',  'Kenya':'ke',
  'Mali':'ml',  'Mexico':'mx',  'Morocco':'ma',  'Netherlands':'nl',
  'New Zealand':'nz',  'Nigeria':'ng',  'Panama':'pa',  'Paraguay':'py',
  'Peru':'pe',  'Poland':'pl',  'Portugal':'pt',  'Qatar':'qa',
  'Saudi Arabia':'sa',  'Senegal':'sn',  'Serbia':'rs',  'Slovakia':'sk',
  'Slovenia':'si',  'South Korea':'kr',  'Spain':'es',  'Switzerland':'ch',
  'Trinidad & Tobago':'tt',  'Tunisia':'tn',  'Turkey':'tr',  'Ukraine':'ua',
  'United States':'us',  'USA':'us',  'Uruguay':'uy',  'Venezuela':'ve',
  'Wales':'gb-wls',  'Scotland':'gb-sct',  'South Africa':'za',  'Bosnia and Herzegovina':'ba',
  'Cape Verde':'cv',  'Curacao':'cw',  'DR Congo':'cd',  'Haiti':'ht',
  'Iraq':'iq',  'Jordan':'jo',  'Norway':'no',  'Sweden':'se',
  'Uzbekistan':'uz',  'Ivory Coast':'ci',  'Cameroon':'cm',
  'Algeria':'dz',  'Iran':'ir',
}

export const POSITIONS = ['ST','CF','LW','RW','CAM','CM','CDM','LB','RB','CB','GK','SS']

export const POSITION_NAMES_EN: Record<string, string> = {
  ST: 'Striker', CF: 'Centre Forward', LW: 'Left Winger', RW: 'Right Winger',
  CAM: 'Attacking Mid', CM: 'Central Mid', CDM: 'Defensive Mid',
  LB: 'Left Back', RB: 'Right Back', CB: 'Centre Back', GK: 'Goalkeeper', SS: 'Second Striker',
  WB: 'Water Boy'
}

export const POSITION_NAMES_PT: Record<string, string> = {
  ST: 'Atacante', CF: 'Centroavante', LW: 'Ponta Esquerda', RW: 'Ponta Direita',
  CAM: 'Meia Atacante', CM: 'Meia', CDM: 'Volante',
  LB: 'Lateral Esquerdo', RB: 'Lateral Direito', CB: 'Zagueiro', GK: 'Goleiro', SS: 'Segundo Atacante',
  WB: 'Gandula'
}

export const POSITION_NAMES = POSITION_NAMES_EN

export const POSITION_EMOJI: Record<string, string> = {
  ST: '⚽', CF: '🎯', LW: '💨', RW: '💨', CAM: '🪄',
  CM: '🔄', CDM: '🛡️', LB: '🏃', RB: '🏃', CB: '🧱', GK: '🧤', SS: '⚡'
}

export const TOP_SCORERS = [
  'Alexander Sørloth',
  'Antoine Griezmann',
  'Bernardo Silva',
  'Bruno Fernandes',
  'Bukayo Saka',
  'Cody Gakpo',
  'Cole Palmer',
  'Cristiano Ronaldo',
  'Dani Olmo',
  'Darwin Núñez',
  'Dušan Vlahović',
  'Eberechi Eze',
  'Erling Haaland',
  'Estêvão',
  'Ferran Torres',
  'Florian Wirtz',
  'Gabriel Martinelli',
  'Gonçalo Ramos',
  'Harry Kane',
  'Heung-Min Son',
  'Hugo Ekitike',
  'Jamal Musiala',
  'Jean-Philippe Mateta',
  'João Félix',
  'Jude Bellingham',
  'Julián Álvarez',
  'Kai Havertz',
  'Kingsley Coman',
  'Kylian Mbappé',
  'Lamine Yamal',
  'Lautaro Martínez',
  'Lionel Messi',
  'Lois Openda',
  'Luis Díaz',
  'Luka Modrić',
  'Marcus Rashford',
  'Mateo Retegui',
  'Matheus Cunha',
  'Mikel Oyarzabal',
  'Mohamed Salah',
  'Neymar',
  'Nick Woltemade',
  'Nico Williams',
  'Ollie Watkins',
  'Ousmane Dembélé',
  'Pedri',
  'Randal Kolo Muani',
  'Raphinha',
  'Richarlison',
  'Rodrygo',
  'Romelu Lukaku',
  'Santiago Giménez',
  'Serge Gnabry',
  'Viktor Gyökeres',
  'Vinicius Jr.',
  'Youssef En-Nesyri',
  'Álvaro Morata',
].sort()

export const WC2026_TEAMS = [
  'Algeria','Argentina','Australia','Austria','Belgium','Bosnia and Herzegovina',
  'Brazil','Canada','Cape Verde','Colombia','Croatia','Curacao','Czechia',
  'DR Congo','Ecuador','Egypt','England','France','Germany','Ghana','Haiti',
  'Iran','Iraq','Ivory Coast','Japan','Jordan','Mexico','Morocco','Netherlands',
  'New Zealand','Norway','Panama','Paraguay','Portugal','Qatar','Saudi Arabia',
  'Scotland','Senegal','South Africa','South Korea','Spain','Sweden','Switzerland',
  'Tunisia','Turkey','Uruguay','USA','Uzbekistan'
].sort()

export const GROUPS: Record<string, string[]> = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['USA', 'Paraguay', 'Australia', 'Turkey'],
  E: ['Germany', 'Ivory Coast', 'Ecuador', 'Curacao'],
  F: ['Netherlands', 'Sweden', 'Tunisia', 'Japan'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
}

export const GROUP_LOCK_TIMES: Record<string, string> = {
  A: '2026-06-11T19:00:00Z', B: '2026-06-12T19:00:00Z',
  C: '2026-06-13T22:00:00Z', D: '2026-06-13T01:00:00Z',
  E: '2026-06-14T17:00:00Z', F: '2026-06-14T20:00:00Z',
  G: '2026-06-15T22:00:00Z', H: '2026-06-15T17:00:00Z',
  I: '2026-06-16T19:00:00Z', J: '2026-06-17T01:00:00Z',
  K: '2026-06-17T17:00:00Z', L: '2026-06-17T20:00:00Z',
}

export function formatLocalTime(dateStr: string, lang?: string) {
  const date = new Date(dateStr)
  return date.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
