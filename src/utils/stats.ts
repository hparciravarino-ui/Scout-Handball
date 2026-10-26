import {
  PlayerMatchStats,
  GoalkeeperStats,
  FieldPlayerStats,
  SanctionsStats,
  OfficialLetter,
  OfficialSanctionStats,
  Category,
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

  const totaleAzioni = tiriTotaliFronteggiati + totalSanctions;

  return {
    parateInGioco,
    golSubitiInGioco,
    rigoriParati,
    rigoriSubiti,
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
