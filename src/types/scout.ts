/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlayerRole = 'PORTIERE' | 'GIOCATORE';

export type SanctionType = 'GIALLO' | 'DUE_MINUTI' | 'ROSSO' | 'BLU';

export type OfficialLetter = 'A' | 'B' | 'C' | 'D';

export interface CategoryOfficials {
  A?: string; // Nome Dirigente A
  B?: string; // Nome Dirigente B
  C?: string; // Nome Dirigente C
  D?: string; // Nome Dirigente D
}

export interface OfficialSanctionStats {
  letter: OfficialLetter;
  name: string;
  sanctions: SanctionsStats;
}

export interface Category {
  id: string;
  name: string;
  officials?: CategoryOfficials;
}

export interface Player {
  id: string;
  name: string;
  number: number; // 0-99
  role: PlayerRole;
  categoryId: string;
  active: boolean;
}

// Statistiche specifiche per Portiere
export interface GoalkeeperStats {
  parate: number; // Parate su tiro in gioco
  golSubiti: number; // Gol subiti in gioco
  rigoriParati: number; // 7 metri parati
  rigoriSubiti: number; // 7 metri subiti
}

// Statistiche specifiche per Giocatore di movimento
export interface FieldPlayerStats {
  gol: number; // Gol su azione
  tiriFuori: number; // Tiri fuori / parati dall'avversario
  assist: number; // Assist vincente
  passaggiPersi: number; // Palla persa in passaggio
  passaggiPersiRicezione: number; // Palla persa in ricezione
  rigoriGol: number; // 7 metri realizzato
  rigoriPersi: number; // 7 metri fallito / parato
}

// Sanzioni disciplinari
export interface SanctionsStats {
  giallo: number;
  dueMinuti: number;
  rosso: number;
  blu: number;
}

export interface PlayerMatchStats {
  playerId: string;
  playerName: string;
  playerNumber: number;
  role: PlayerRole;
  goalkeeper: GoalkeeperStats;
  field: FieldPlayerStats;
  sanctions: SanctionsStats;
}

export const ACTION_TYPES = [
  // Portieri
  'GK_PARATA',
  'GK_GOL_SUBITO',
  'GK_7M_PARATO',
  'GK_7M_SUBITO',
  // Giocatori
  'FP_GOL',
  'FP_TIRO_FUORI',
  'FP_ASSIST',
  'FP_PASSAGGIO_PERSO',
  'FP_RICEZIONE_PERSA',
  'FP_7M_GOL',
  'FP_7M_PERSO',
  // Sanzioni Giocatori
  'SANCTION_GIALLO',
  'SANCTION_DUE_MINUTI',
  'SANCTION_ROSSO',
  'SANCTION_BLU',
  // Sanzioni Ufficiali / Dirigenti
  'SANCTION_OFFICIAL_GIALLO',
  'SANCTION_OFFICIAL_DUE_MINUTI',
  'SANCTION_OFFICIAL_ROSSO',
  'SANCTION_OFFICIAL_BLU',
  // Generiche / Avversari
  'OPPONENT_GOAL',
  'OPPONENT_GOAL_UNDO',
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export type TeamSide = 'HOME' | 'GUEST';

export interface ActionLogEntry {
  id: string;
  timestamp: number;
  actionType: ActionType;
  label: string;
  playerId?: string;
  playerName?: string;
  playerNumber?: number;
  role?: PlayerRole;
  officialLetter?: OfficialLetter;
  officialName?: string;
  scoreChangeHome: number;
  scoreChangeGuest: number;
  teamSide?: TeamSide;
}

export interface HandballMatch {
  id: string;
  homeTeam: string;
  guestTeam: string;
  categoryId: string;
  date: string; // ISO date YYYY-MM-DD
  location: string;
  notes: string;
  isAwayMatch?: boolean; // true se partita in Trasferta (Fuori Casa)
  scoreHome: number;
  scoreGuest: number;
  stats: Record<string, PlayerMatchStats>; // key is playerId
  officials?: Record<OfficialLetter, OfficialSanctionStats>;
  actionLog: ActionLogEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface ClubInfo {
  name: string; // Denominazione Società (es. "Pallamano Secchia Rubiera")
  codeFIGH?: string; // Codice / Matricola Federale FIGH
  city?: string; // Città / Sede sociale
  gymnasium?: string; // Palasport di casa / Impianto di gara
  presidentOrReferent?: string; // Presidente / Dirigente responsabile
  coach?: string; // Allenatore / Direttore Tecnico
  email?: string; // Email ufficiale societaria
  phone?: string; // Recapito telefonico
  colors?: string; // Colori sociali (es. "Bianco-Rosso")
  notes?: string; // Note societarie
  logoUrl?: string; // Data URL Base64 immagine logo (max 500 KB)
}

export interface BackupData {
  schemaVersion: number;
  exportDate: string;
  app: string;
  clubInfo?: ClubInfo;
  categories: Category[];
  players: Player[];
  matches: HandballMatch[];
}
