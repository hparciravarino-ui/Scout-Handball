import {
  PlayerMatchStats,
  GoalkeeperStats,
  FieldPlayerStats,
  SanctionsStats,
  OfficialLetter,
  OfficialSanctionStats,
  Category,
  Player,
  HandballMatch,
  TeamSide,
  ClubInfo,
  PlayerRole,
  ActionLogEntry,
} from '../types/scout';

export type { TeamSide };

export const getOurSide = (match: HandballMatch): TeamSide => {
  return match.isAwayMatch ? 'GUEST' : 'HOME';
};

export const getOpponentSide = (match: HandballMatch): TeamSide => {
  return match.isAwayMatch ? 'HOME' : 'GUEST';
};

export const getScoreDeltas = (
  match: HandballMatch,
  kind: 'OURS' | 'OPPONENT'
): { home: number; guest: number } => {
  const targetSide = kind === 'OURS' ? getOurSide(match) : getOpponentSide(match);
  return {
    home: targetSide === 'HOME' ? 1 : 0,
    guest: targetSide === 'GUEST' ? 1 : 0,
  };
};

export const getOurTeamName = (match: HandballMatch, clubInfo?: ClubInfo): string => {
  const nameInMatch = match.isAwayMatch ? match.guestTeam : match.homeTeam;
  return nameInMatch || clubInfo?.name || 'Nostra Squadra';
};

export const getOpponentTeamName = (match: HandballMatch): string => {
  return match.isAwayMatch ? match.homeTeam : match.guestTeam;
};

export const getUnassignedOpponentGoals = (logOrMatch?: HandballMatch | ActionLogEntry[] | null): number => {
  if (!logOrMatch) return 0;
  const log: ActionLogEntry[] = Array.isArray(logOrMatch) ? logOrMatch : (logOrMatch.actionLog || []);
  if (!log || log.length === 0) return 0;
  let unassigned = 0;
  for (const entry of log) {
    if (entry.actionType === 'OPPONENT_GOAL') {
      unassigned += 1;
    } else if (entry.actionType === 'OPPONENT_GOAL_UNDO') {
      unassigned -= 1;
    }
  }
  return Math.max(0, unassigned);
};

export function calculateScoreFromMatch(match: HandballMatch): { home: number; guest: number } {
  const hasStats = match.stats && Object.keys(match.stats).length > 0;
  const hasActionLog = match.actionLog && match.actionLog.length > 0;

  // Se non ci sono statistiche atleti (partita senza stats o creata solo da log), mantieni il punteggio memorizzato o ricavalo dall'actionLog
  if (!hasStats) {
    if (match.scoreHome !== undefined && match.scoreGuest !== undefined && (match.scoreHome > 0 || match.scoreGuest > 0 || !hasActionLog)) {
      return {
        home: Math.max(0, match.scoreHome || 0),
        guest: Math.max(0, match.scoreGuest || 0),
      };
    }
    if (hasActionLog) {
      let h = 0;
      let g = 0;
      match.actionLog!.forEach((entry) => {
        if (entry.scoreChangeHome) h += entry.scoreChangeHome;
        if (entry.scoreChangeGuest) g += entry.scoreChangeGuest;
      });
      return { home: Math.max(0, h), guest: Math.max(0, g) };
    }
    return {
      home: Math.max(0, match.scoreHome || 0),
      guest: Math.max(0, match.scoreGuest || 0),
    };
  }

  const ourSide = getOurSide(match);
  let ourGoals = 0;
  let gkConceded = 0;

  Object.values(match.stats).forEach((st) => {
    if (st.role === 'GIOCATORE' && st.field) {
      ourGoals += (st.field.gol || 0) + (st.field.rigoriGol || 0);
    } else if (st.role === 'PORTIERE' && st.goalkeeper) {
      ourGoals += st.goalkeeper.gol || 0;
      gkConceded += (st.goalkeeper.golSubiti || 0) + (st.goalkeeper.rigoriSubiti || 0);
    }
  });

  const unassignedOpp = getUnassignedOpponentGoals(match);
  const opponentGoals = Math.max(0, gkConceded + unassignedOpp);
  ourGoals = Math.max(0, ourGoals);

  if (ourSide === 'HOME') {
    return { home: ourGoals, guest: opponentGoals };
  } else {
    return { home: opponentGoals, guest: ourGoals };
  }
}

/**
 * Verifica se una categoria o un nome categoria appartiene all'Under 14 (3 tempi di gioco)
 */
export function isUnder14Category(categoryName?: string, category?: Category | null): boolean {
  if (category?.periodsCount === 3) return true;
  if (category?.periodsCount === 2) return false;
  const name = categoryName || category?.name || '';
  return /u14|under\s*14|u-14|u\s*14/i.test(name);
}

/**
 * Restituisce il numero totale di tempi di gioco per la categoria (3 per U14, 2 per altre)
 */
export function getPeriodsCount(categoryName?: string, category?: Category | null): 2 | 3 {
  return isUnder14Category(categoryName, category) ? 3 : 2;
}

/**
 * Calcola la ripartizione dei gol segnati da ciascuna squadra nei singoli tempi di gioco
 */
export function calculatePeriodScores(
  match: HandballMatch,
  category?: Category | null,
  categoryName?: string
): Record<1 | 2 | 3, { home: number; guest: number }> {
  const numPeriods = getPeriodsCount(categoryName, category);
  const periodScores: Record<1 | 2 | 3, { home: number; guest: number }> = {
    1: { home: 0, guest: 0 },
    2: { home: 0, guest: 0 },
    3: { home: 0, guest: 0 },
  };

  if (match.actionLog && match.actionLog.length > 0) {
    const effectiveLogs: ActionLogEntry[] = [];
    match.actionLog.forEach((entry) => {
      if (entry.actionType === 'OPPONENT_GOAL_UNDO') {
        for (let i = effectiveLogs.length - 1; i >= 0; i--) {
          const prev = effectiveLogs[i];
          if (
            prev.actionType === 'OPPONENT_GOAL' ||
            prev.actionType === 'GK_GOL_SUBITO' ||
            prev.actionType === 'GK_7M_SUBITO'
          ) {
            effectiveLogs.splice(i, 1);
            break;
          }
        }
      } else if (
        entry.actionType === 'FP_GOL' ||
        entry.actionType === 'FP_7M_GOL' ||
        entry.actionType === 'GK_GOL' ||
        entry.actionType === 'OPPONENT_GOAL' ||
        entry.actionType === 'GK_GOL_SUBITO' ||
        entry.actionType === 'GK_7M_SUBITO'
      ) {
        effectiveLogs.push(entry);
      }
    });

    effectiveLogs.forEach((entry) => {
      const p = (entry.period && entry.period >= 1 && entry.period <= numPeriods ? entry.period : 1) as 1 | 2 | 3;
      if (entry.scoreChangeHome) periodScores[p].home += entry.scoreChangeHome;
      if (entry.scoreChangeGuest) periodScores[p].guest += entry.scoreChangeGuest;
    });
  }

  // Garantisci la perfetta coerenza matematica con il totale calcolato da calculateScoreFromMatch
  const totalScore = calculateScoreFromMatch(match);
  const sumHomeInPeriods = periodScores[1].home + periodScores[2].home + periodScores[3].home;
  const sumGuestInPeriods = periodScores[1].guest + periodScores[2].guest + periodScores[3].guest;

  const diffHome = totalScore.home - sumHomeInPeriods;
  const diffGuest = totalScore.guest - sumGuestInPeriods;

  const targetPeriod = (match.currentPeriod && match.currentPeriod <= numPeriods ? match.currentPeriod : 1) as 1 | 2 | 3;

  if (diffHome !== 0) {
    periodScores[targetPeriod].home = Math.max(0, periodScores[targetPeriod].home + diffHome);
  }
  if (diffGuest !== 0) {
    periodScores[targetPeriod].guest = Math.max(0, periodScores[targetPeriod].guest + diffGuest);
  }

  return periodScores;
}

export interface Under14PointsBreakdown {
  isUnder14: boolean;
  periodsCount: 2 | 3;
  periodScores: Record<1 | 2 | 3, { home: number; guest: number }>;
  periodPoints: Record<1 | 2 | 3, { home: number; guest: number }>;
  totalPeriodPoints: { home: number; guest: number };
  extraPoints: { home: number; guest: number };
  totalMatchPoints: { home: number; guest: number };
  totalGoals: { home: number; guest: number };
}

/**
 * Calcola i punti partita regolamentari FIGH per la categoria Under 14
 * - 1 punto per tempo vinto (0,5 in caso di pareggio)
 * - 2 punti extra per la squadra con più gol totali nell'incontro (1 punto ciascuna in caso di parità gol)
 */
export function calculateUnder14Points(
  match: HandballMatch,
  category?: Category | null,
  categoryName?: string
): Under14PointsBreakdown {
  const isU14 = isUnder14Category(categoryName, category);
  const numPeriods = getPeriodsCount(categoryName, category);
  const periodScores = calculatePeriodScores(match, category, categoryName);
  const totalGoals = calculateScoreFromMatch(match);

  const periodPoints: Record<1 | 2 | 3, { home: number; guest: number }> = {
    1: { home: 0, guest: 0 },
    2: { home: 0, guest: 0 },
    3: { home: 0, guest: 0 },
  };

  const totalPeriodPoints = { home: 0, guest: 0 };

  for (let p = 1; p <= numPeriods; p++) {
    const key = p as 1 | 2 | 3;
    const hG = periodScores[key].home;
    const gG = periodScores[key].guest;

    if (hG > gG) {
      periodPoints[key].home = 1.0;
      periodPoints[key].guest = 0.0;
    } else if (hG < gG) {
      periodPoints[key].home = 0.0;
      periodPoints[key].guest = 1.0;
    } else {
      periodPoints[key].home = 0.5;
      periodPoints[key].guest = 0.5;
    }

    totalPeriodPoints.home += periodPoints[key].home;
    totalPeriodPoints.guest += periodPoints[key].guest;
  }

  const extraPoints = { home: 0, guest: 0 };
  if (totalGoals.home > totalGoals.guest) {
    extraPoints.home = 2.0;
    extraPoints.guest = 0.0;
  } else if (totalGoals.home < totalGoals.guest) {
    extraPoints.home = 0.0;
    extraPoints.guest = 2.0;
  } else {
    extraPoints.home = 1.0;
    extraPoints.guest = 1.0;
  }

  const totalMatchPoints = {
    home: totalPeriodPoints.home + extraPoints.home,
    guest: totalPeriodPoints.guest + extraPoints.guest,
  };

  return {
    isUnder14: isU14,
    periodsCount: numPeriods,
    periodScores,
    periodPoints,
    totalPeriodPoints,
    extraPoints,
    totalMatchPoints,
    totalGoals,
  };
}

export const createEmptyGoalkeeperStats = (): GoalkeeperStats => ({
  parate: 0,
  golSubiti: 0,
  rigoriParati: 0,
  rigoriSubiti: 0,
  gol: 0,
  assist: 0,
});

export const createEmptyFieldPlayerStats = (): FieldPlayerStats => ({
  gol: 0,
  tiriFuori: 0,
  assist: 0,
  passaggiPersi: 0,
  passaggiPersiRicezione: 0,
  rigoriGol: 0,
  rigoriPersi: 0,
});

export const createEmptySanctionsStats = (): SanctionsStats => ({
  giallo: 0,
  dueMinuti: 0,
  rosso: 0,
  blu: 0,
});

export const createEmptyPlayerStats = (
  playerId: string,
  arg2: PlayerRole | string = 'GIOCATORE',
  arg3: number | string = '',
  arg4: PlayerRole | number = 0
): PlayerMatchStats => {
  let role: PlayerRole = 'GIOCATORE';
  let playerName = '';
  let playerNumber = 0;

  if (arg2 === 'PORTIERE' || arg2 === 'GIOCATORE') {
    role = arg2;
    playerName = typeof arg3 === 'string' ? arg3 : '';
    playerNumber = typeof arg4 === 'number' ? arg4 : 0;
  } else {
    playerName = typeof arg2 === 'string' ? arg2 : '';
    playerNumber = typeof arg3 === 'number' ? arg3 : 0;
    role = arg4 === 'PORTIERE' || arg4 === 'GIOCATORE' ? arg4 : 'GIOCATORE';
  }

  return {
    playerId,
    playerName,
    playerNumber,
    role,
    goalkeeper: createEmptyGoalkeeperStats(),
    field: createEmptyFieldPlayerStats(),
    sanctions: createEmptySanctionsStats(),
  };
};

export const createEmptyOfficialSanctions = (
  letter: OfficialLetter,
  name: string = ''
): OfficialSanctionStats => ({
  letter,
  name,
  sanctions: createEmptySanctionsStats(),
});

export const getMatchOfficials = (
  match?: HandballMatch | null,
  category?: Category | null
): Record<OfficialLetter, OfficialSanctionStats> => {
  const letters: OfficialLetter[] = ['A', 'B', 'C', 'D'];
  const res: Record<OfficialLetter, OfficialSanctionStats> = {
    A: createEmptyOfficialSanctions('A', category?.officials?.A || ''),
    B: createEmptyOfficialSanctions('B', category?.officials?.B || ''),
    C: createEmptyOfficialSanctions('C', category?.officials?.C || ''),
    D: createEmptyOfficialSanctions('D', category?.officials?.D || ''),
  };

  if (!match) return res;

  if (match.officials) {
    letters.forEach((letKey) => {
      if (match.officials?.[letKey]) {
        res[letKey] = {
          letter: letKey,
          name: match.officials[letKey].name || category?.officials?.[letKey] || '',
          sanctions: {
            giallo: match.officials[letKey].sanctions?.giallo || 0,
            dueMinuti: match.officials[letKey].sanctions?.dueMinuti || 0,
            rosso: match.officials[letKey].sanctions?.rosso || 0,
            blu: match.officials[letKey].sanctions?.blu || 0,
          },
        };
      }
    });
  }

  return res;
};

/**
 * Calcoli unificati per Portieri
 */
export interface GoalkeeperCalculatedStats {
  parateInGioco: number;
  golSubitiInGioco: number;
  rigoriParati: number;
  rigoriSubiti: number;
  gol: number;
  assist: number;
  parateTotali: number;
  golSubitiTotali: number;
  tiriTotaliFronteggiati: number;
  percentualeParateTotale: number; // 0-100
  percentualeRigoriParati: number; // 0-100
  totaleAzioni: number;
}

export function calculateGoalkeeperStats(gk: GoalkeeperStats, sanctions?: SanctionsStats): GoalkeeperCalculatedStats {
  const parateInGioco = Math.max(0, gk.parate || 0);
  const golSubitiInGioco = Math.max(0, gk.golSubiti || 0);
  const rigoriParati = Math.max(0, gk.rigoriParati || 0);
  const rigoriSubiti = Math.max(0, gk.rigoriSubiti || 0);
  const gol = Math.max(0, gk.gol || 0);
  const assist = Math.max(0, gk.assist || 0);

  const parateTotali = parateInGioco + rigoriParati;
  const golSubitiTotali = golSubitiInGioco + rigoriSubiti;
  const tiriTotaliFronteggiati = parateTotali + golSubitiTotali;

  const percentualeParateTotale =
    tiriTotaliFronteggiati > 0 ? (parateTotali / tiriTotaliFronteggiati) * 100 : 0;

  const totaleRigoriFronteggiati = rigoriParati + rigoriSubiti;
  const percentualeRigoriParati =
    totaleRigoriFronteggiati > 0 ? (rigoriParati / totaleRigoriFronteggiati) * 100 : 0;

  const totalSanctions = sanctions
    ? (sanctions.giallo || 0) + (sanctions.dueMinuti || 0) + (sanctions.rosso || 0) + (sanctions.blu || 0)
    : 0;

  const totaleAzioni = tiriTotaliFronteggiati + gol + assist + totalSanctions;

  return {
    parateInGioco,
    golSubitiInGioco,
    rigoriParati,
    rigoriSubiti,
    gol,
    assist,
    parateTotali,
    golSubitiTotali,
    tiriTotaliFronteggiati,
    percentualeParateTotale: Math.round(percentualeParateTotale * 10) / 10,
    percentualeRigoriParati: Math.round(percentualeRigoriParati * 10) / 10,
    totaleAzioni,
  };
}

/**
 * Calcoli unificati per Giocatori di movimento
 */
export interface FieldPlayerCalculatedStats {
  golAzione: number;
  tiriFuori: number;
  rigoriGol: number;
  rigoriPersi: number;
  golTotali: number;
  tiriTotali: number;
  percentualeRealizzazione: number; // 0-100
  assist: number;
  passaggiPersi: number;
  passaggiPersiRicezione: number;
  pallePerseTotali: number;
  totaleAzioni: number;
}

export function calculateFieldPlayerStats(fp: FieldPlayerStats, sanctions?: SanctionsStats): FieldPlayerCalculatedStats {
  const golAzione = Math.max(0, fp.gol || 0);
  const tiriFuori = Math.max(0, fp.tiriFuori || 0);
  const rigoriGol = Math.max(0, fp.rigoriGol || 0);
  const rigoriPersi = Math.max(0, fp.rigoriPersi || 0);
  const assist = Math.max(0, fp.assist || 0);
  const passaggiPersi = Math.max(0, fp.passaggiPersi || 0);
  const passaggiPersiRicezione = Math.max(0, fp.passaggiPersiRicezione || 0);

  const golTotali = golAzione + rigoriGol;
  const tiriTotali = golAzione + tiriFuori + rigoriGol + rigoriPersi;
  const percentualeRealizzazione =
    tiriTotali > 0 ? (golTotali / tiriTotali) * 100 : 0;

  const pallePerseTotali = passaggiPersi + passaggiPersiRicezione;

  const totalSanctions = sanctions
    ? (sanctions.giallo || 0) + (sanctions.dueMinuti || 0) + (sanctions.rosso || 0) + (sanctions.blu || 0)
    : 0;

  const totaleAzioni = tiriTotali + assist + pallePerseTotali + totalSanctions;

  return {
    golAzione,
    tiriFuori,
    rigoriGol,
    rigoriPersi,
    golTotali,
    tiriTotali,
    percentualeRealizzazione: Math.round(percentualeRealizzazione * 10) / 10,
    assist,
    passaggiPersi,
    passaggiPersiRicezione,
    pallePerseTotali,
    totaleAzioni,
  };
}

/**
 * Conteggio totale azioni per un singolo atleta in tempo reale
 */
export function calculatePlayerTotalActions(stats: PlayerMatchStats): number {
  if (stats.role === 'PORTIERE') {
    return calculateGoalkeeperStats(stats.goalkeeper, stats.sanctions).totaleAzioni;
  }
  return calculateFieldPlayerStats(stats.field, stats.sanctions).totaleAzioni;
}

/**
 * Totali di squadra
 */
export interface TeamCalculatedTotals {
  golTotaliSquadra: number;
  tiriTotaliSquadra: number;
  percentualeRealizzazioneSquadra: number;
  assistTotali: number;
  pallePerseTotali: number;
  parateTotaliPortieri: number;
  golSubitiTotaliPortieri: number;
  percentualeParatePortieri: number;
  sanzioniSquadra: {
    giallo: number;
    dueMinuti: number;
    rosso: number;
    blu: number;
  };
}

export function calculateTeamTotals(statsMap: Record<string, PlayerMatchStats>): TeamCalculatedTotals {
  let golTotaliSquadra = 0;
  let tiriTotaliSquadra = 0;
  let assistTotali = 0;
  let pallePerseTotali = 0;

  let parateTotaliPortieri = 0;
  let golSubitiTotaliPortieri = 0;

  const sanzioniSquadra = { giallo: 0, dueMinuti: 0, rosso: 0, blu: 0 };

  Object.values(statsMap).forEach((st) => {
    sanzioniSquadra.giallo += st.sanctions.giallo || 0;
    sanzioniSquadra.dueMinuti += st.sanctions.dueMinuti || 0;
    sanzioniSquadra.rosso += st.sanctions.rosso || 0;
    sanzioniSquadra.blu += st.sanctions.blu || 0;

    if (st.role === 'PORTIERE') {
      const calcGk = calculateGoalkeeperStats(st.goalkeeper);
      parateTotaliPortieri += calcGk.parateTotali;
      golSubitiTotaliPortieri += calcGk.golSubitiTotali;
      golTotaliSquadra += calcGk.gol;
      tiriTotaliSquadra += calcGk.gol;
      assistTotali += calcGk.assist;
    } else {
      const calcFp = calculateFieldPlayerStats(st.field);
      golTotaliSquadra += calcFp.golTotali;
      tiriTotaliSquadra += calcFp.tiriTotali;
      assistTotali += calcFp.assist;
      pallePerseTotali += calcFp.pallePerseTotali;
    }
  });

  const percentualeRealizzazioneSquadra =
    tiriTotaliSquadra > 0 ? (golTotaliSquadra / tiriTotaliSquadra) * 100 : 0;

  const tiriFronteggiatiPortieri = parateTotaliPortieri + golSubitiTotaliPortieri;
  const percentualeParatePortieri =
    tiriFronteggiatiPortieri > 0
      ? (parateTotaliPortieri / tiriFronteggiatiPortieri) * 100
      : 0;

  return {
    golTotaliSquadra,
    tiriTotaliSquadra,
    percentualeRealizzazioneSquadra: Math.round(percentualeRealizzazioneSquadra * 10) / 10,
    assistTotali,
    pallePerseTotali,
    parateTotaliPortieri,
    golSubitiTotaliPortieri,
    percentualeParatePortieri: Math.round(percentualeParatePortieri * 10) / 10,
    sanzioniSquadra,
  };
}

/**
 * Verifica se un atleta ha almeno un'azione o sanzione registrata nelle statistiche partita
 */
export function hasRecordedPlayerActions(stats?: PlayerMatchStats | null): boolean {
  if (!stats) return false;
  return calculatePlayerTotalActions(stats) > 0;
}

/**
 * Restituisce gli atleti effettivamente convocati ed eleggibili per una partita.
 * - Compatibilità legacy: se match.convocatedPlayerIds è undefined, include tutta la categoria.
 * - Se convocatedPlayerIds è definito, include i convocati più eventuali atleti con azioni già registrate.
 */
export function getMatchConvocatedPlayers(
  players: Player[],
  match?: HandballMatch | null
): Player[] {
  if (!match) return [];
  const categoryPlayers = players.filter((p) => p.categoryId === match.categoryId);

  if (match.convocatedPlayerIds === undefined) {
    return [...categoryPlayers].sort((a, b) => a.number - b.number);
  }

  const convSet = new Set(match.convocatedPlayerIds);
  return categoryPlayers
    .filter((p) => convSet.has(p.id) || hasRecordedPlayerActions(match.stats?.[p.id]))
    .sort((a, b) => a.number - b.number);
}

/**
 * Criteri filtro avanzato atleti
 */
export interface PlayerFilterCriteria {
  search?: string;
  role?: 'ALL' | PlayerRole;
  selectionStatus?: 'ALL' | 'SELECTED' | 'UNSELECTED';
  selectedIds?: Set<string> | string[];
  sortBy?: 'NUMBER' | 'NAME';
}

/**
 * Filtra e ordina gli atleti in base a testo (nome o #maglia), ruolo, stato selezione e ordinamento
 */
export function filterPlayersAdvanced(
  players: Player[],
  criteria: PlayerFilterCriteria = {}
): Player[] {
  const rawQuery = (criteria.search || '').trim().toLowerCase();
  const cleanNumberQuery = rawQuery.startsWith('#') ? rawQuery.slice(1).trim() : rawQuery;
  const selectedSet =
    criteria.selectedIds instanceof Set
      ? criteria.selectedIds
      : Array.isArray(criteria.selectedIds)
      ? new Set(criteria.selectedIds)
      : null;

  const filtered = players.filter((p) => {
    if (criteria.role && criteria.role !== 'ALL' && p.role !== criteria.role) {
      return false;
    }

    if (criteria.selectionStatus && criteria.selectionStatus !== 'ALL' && selectedSet) {
      const isSelected = selectedSet.has(p.id);
      if (criteria.selectionStatus === 'SELECTED' && !isSelected) return false;
      if (criteria.selectionStatus === 'UNSELECTED' && isSelected) return false;
    }

    if (rawQuery.length > 0) {
      const nameMatch = p.name.toLowerCase().includes(rawQuery);
      const numberStr = String(p.number);
      const numberMatch =
        cleanNumberQuery.length > 0 &&
        (numberStr === cleanNumberQuery || numberStr.includes(cleanNumberQuery) || `#${numberStr}`.includes(rawQuery));
      if (!nameMatch && !numberMatch) {
        return false;
      }
    }

    return true;
  });

  const sortBy = criteria.sortBy || 'NUMBER';
  return [...filtered].sort((a, b) => {
    if (sortBy === 'NAME') {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.number - b.number;
    }
    return a.number - b.number || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

/**
 * Criteri filtro avanzato archivio partite
 */
export interface MatchFilterCriteria {
  search?: string;
  categoryId?: string;
  venueMode?: 'ALL' | 'HOME' | 'AWAY';
  periodsMode?: 'ALL' | '2' | '3';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'DATE_DESC' | 'DATE_ASC' | 'SCORE_DESC';
}

/**
 * Filtra e ordina le partite in archivio per nome squadre, luogo, note, categoria, sede, tempi e intervallo date
 */
export function filterMatchesAdvanced(
  matches: HandballMatch[],
  categories: Category[],
  criteria: MatchFilterCriteria = {}
): HandballMatch[] {
  const query = (criteria.search || '').trim().toLowerCase();
  const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  const filtered = matches.filter((m) => {
    if (criteria.categoryId && criteria.categoryId !== 'ALL' && m.categoryId !== criteria.categoryId) {
      return false;
    }

    if (criteria.venueMode && criteria.venueMode !== 'ALL') {
      const isAway = Boolean(m.isAwayMatch);
      if (criteria.venueMode === 'AWAY' && !isAway) return false;
      if (criteria.venueMode === 'HOME' && isAway) return false;
    }

    if (criteria.periodsMode && criteria.periodsMode !== 'ALL') {
      const cat = catMap.get(m.categoryId);
      const pCount = getPeriodsCount(cat?.name, cat);
      if (criteria.periodsMode === '3' && pCount !== 3) return false;
      if (criteria.periodsMode === '2' && pCount !== 2) return false;
    }

    if (criteria.dateFrom && m.date < criteria.dateFrom) {
      return false;
    }

    if (criteria.dateTo && m.date > criteria.dateTo) {
      return false;
    }

    if (query.length > 0) {
      const catName = (catMap.get(m.categoryId)?.name || '').toLowerCase();
      const haystack = `${m.homeTeam} ${m.guestTeam} ${m.location || ''} ${m.notes || ''} ${catName}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });

  const sortBy = criteria.sortBy || 'DATE_DESC';
  if (sortBy === 'DATE_DESC') {
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }
  if (sortBy === 'DATE_ASC') {
    return [...filtered].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  }
  return [...filtered].sort(
    (a, b) => b.scoreHome + b.scoreGuest - (a.scoreHome + a.scoreGuest) || b.createdAt - a.createdAt
  );
}

export type MatchPlayStatus = 'TO_PLAY' | 'IN_PROGRESS' | 'PLAYED';

/**
 * Verifica se la partita ha già punteggio, azioni a referto o statistiche registrate
 */
export function hasMatchActivity(match?: HandballMatch | null): boolean {
  if (!match) return false;
  if ((match.scoreHome || 0) > 0 || (match.scoreGuest || 0) > 0) return true;
  if (match.actionLog && match.actionLog.length > 0) return true;
  if (match.stats) {
    for (const st of Object.values(match.stats)) {
      if (hasRecordedPlayerActions(st)) return true;
    }
  }
  return false;
}

/**
 * Determina lo stato operativo di una partita:
 * - TO_PLAY: partita programmata senza azioni/punti registrati
 * - IN_PROGRESS: partita con attività in corso ed attualmente attiva
 * - PLAYED: partita con attività già registrata non attiva
 */
export function getMatchPlayStatus(
  match: HandballMatch,
  activeMatchId?: string | null
): MatchPlayStatus {
  if (!hasMatchActivity(match)) {
    return 'TO_PLAY';
  }
  if (activeMatchId && match.id === activeMatchId) {
    return 'IN_PROGRESS';
  }
  return 'PLAYED';
}

/**
 * Restituisce le partite ancora da giocare ordinate per prossimità di calendario
 * (prima le date odierne/future in ordine cronologico crescente, poi eventuali arretrate).
 */
export function getMatchesToPlay(
  matches: HandballMatch[],
  referenceDate: string = new Date().toISOString().split('T')[0]
): HandballMatch[] {
  const toPlay = matches.filter((m) => !hasMatchActivity(m));
  return [...toPlay].sort((a, b) => {
    const aUpcoming = a.date >= referenceDate;
    const bUpcoming = b.date >= referenceDate;
    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;
    if (aUpcoming && bUpcoming) {
      return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
    }
    return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
  });
}

/**
 * Raggruppa le partite per data ISO (YYYY-MM-DD) per la vista calendario
 */
export function groupMatchesByDate(
  matches: HandballMatch[]
): Record<string, HandballMatch[]> {
  const grouped: Record<string, HandballMatch[]> = {};
  for (const m of matches) {
    const key = m.date || '';
    if (!key) continue;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }
  Object.values(grouped).forEach((list) => {
    list.sort((a, b) => a.createdAt - b.createdAt);
  });
  return grouped;
}
