/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PlayerMatchStats,
  GoalkeeperStats,
  FieldPlayerStats,
  SanctionsStats,
  OfficialLetter,
  OfficialSanctionStats,
  Category,
  HandballMatch,
} from '../types/scout';

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

export const createEmptyPlayerStats = (
  playerId: string,
  playerName: string,
  playerNumber: number,
  role: 'PORTIERE' | 'GIOCATORE'
): PlayerMatchStats => ({
  playerId,
  playerName,
  playerNumber,
  role,
  goalkeeper: createEmptyGoalkeeperStats(),
  field: createEmptyFieldPlayerStats(),
  sanctions: createEmptySanctionsStats(),
});

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
