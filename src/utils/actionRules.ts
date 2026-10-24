/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActionType, PlayerRole, OfficialLetter } from '../types/scout';

export interface EligibleTargets {
  roles: readonly PlayerRole[];
  allowsOfficials: boolean;
  requiresTarget: boolean;
}

/**
 * Tabella autoritativa unica che definisce i destinatari ammessi per ogni tipo di azione.
 * - FP_*       -> solo giocatori di movimento, nessun dirigente
 * - GK_*       -> solo portieri, nessun dirigente
 * - SANCTION_* -> tutti gli atleti e i dirigenti A-D
 * - OPPONENT_* -> azioni collettive senza atleta o dirigente
 */
const ACTION_TARGET_RULES: Record<ActionType, EligibleTargets> = {
  // FP_* -> solo giocatori di movimento, nessun dirigente
  FP_GOL: { roles: ['GIOCATORE'], allowsOfficials: false, requiresTarget: true },
  FP_TIRO_FUORI: { roles: ['GIOCATORE'], allowsOfficials: false, requiresTarget: true },
  FP_ASSIST: { roles: ['GIOCATORE'], allowsOfficials: false, requiresTarget: true },
  FP_PASSAGGIO_PERSO: { roles: ['GIOCATORE'], allowsOfficials: false, requiresTarget: true },
  FP_RICEZIONE_PERSA: { roles: ['GIOCATORE'], allowsOfficials: false, requiresTarget: true },
  FP_7M_GOL: { roles: ['GIOCATORE'], allowsOfficials: false, requiresTarget: true },
  FP_7M_PERSO: { roles: ['GIOCATORE'], allowsOfficials: false, requiresTarget: true },

  // GK_* -> solo portieri, nessun dirigente
  GK_PARATA: { roles: ['PORTIERE'], allowsOfficials: false, requiresTarget: true },
  GK_GOL_SUBITO: { roles: ['PORTIERE'], allowsOfficials: false, requiresTarget: true },
  GK_7M_PARATO: { roles: ['PORTIERE'], allowsOfficials: false, requiresTarget: true },
  GK_7M_SUBITO: { roles: ['PORTIERE'], allowsOfficials: false, requiresTarget: true },

  // SANCTION_* per atleti e dirigenti (nella griglia live o modale generico)
  SANCTION_GIALLO: { roles: ['GIOCATORE', 'PORTIERE'], allowsOfficials: true, requiresTarget: true },
  SANCTION_DUE_MINUTI: { roles: ['GIOCATORE', 'PORTIERE'], allowsOfficials: true, requiresTarget: true },
  SANCTION_ROSSO: { roles: ['GIOCATORE', 'PORTIERE'], allowsOfficials: true, requiresTarget: true },
  SANCTION_BLU: { roles: ['GIOCATORE', 'PORTIERE'], allowsOfficials: true, requiresTarget: true },

  // SANCTION_OFFICIAL_* -> specifiche per dirigenti panchina A-D
  SANCTION_OFFICIAL_GIALLO: { roles: [], allowsOfficials: true, requiresTarget: true },
  SANCTION_OFFICIAL_DUE_MINUTI: { roles: [], allowsOfficials: true, requiresTarget: true },
  SANCTION_OFFICIAL_ROSSO: { roles: [], allowsOfficials: true, requiresTarget: true },
  SANCTION_OFFICIAL_BLU: { roles: [], allowsOfficials: true, requiresTarget: true },

  // Azioni collettive avversari
  OPPONENT_GOAL: { roles: [], allowsOfficials: false, requiresTarget: false },
  OPPONENT_GOAL_UNDO: { roles: [], allowsOfficials: false, requiresTarget: false },
};

/**
 * Restituisce i destinatari ammessi per un dato tipo di azione.
 */
export function getEligibleTargets(actionType: ActionType): EligibleTargets {
  return ACTION_TARGET_RULES[actionType] ?? { roles: [], allowsOfficials: false, requiresTarget: false };
}

/**
 * Verifica se un destinatario (ruolo atleta o lettera/tipo dirigente) è ammesso per l'azione.
 * Supporta target: 'PORTIERE' | 'GIOCATORE' | 'A' | 'B' | 'C' | 'D' | 'DIRIGENTE' | undefined.
 */
export function isTargetAllowed(
  actionType: ActionType,
  target?: PlayerRole | OfficialLetter | 'DIRIGENTE'
): boolean {
  const rule = getEligibleTargets(actionType);

  if (!target) {
    return !rule.requiresTarget;
  }

  if (target === 'PORTIERE' || target === 'GIOCATORE') {
    return rule.roles.includes(target);
  }

  if (target === 'A' || target === 'B' || target === 'C' || target === 'D' || target === 'DIRIGENTE') {
    return rule.allowsOfficials;
  }

  return false;
}
