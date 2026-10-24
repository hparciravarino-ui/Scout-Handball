/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AppDatabase,
  loadAppDatabase,
  saveAppDatabase,
  createSafetyBackup,
  sanitizeInput,
  wipeAllLocalData,
  DEFAULT_INITIAL_CATEGORIES,
  DEFAULT_CLUB_INFO,
  StorageLoadResult,
} from './utils/storage';
import {
  Category,
  Player,
  HandballMatch,
  ActionType,
  ActionLogEntry,
  PlayerMatchStats,
  BackupData,
  ClubInfo,
  OfficialLetter,
  CategoryOfficials,
  OfficialSanctionStats,
  TeamSide,
} from './types/scout';
import {
  createEmptyPlayerStats,
  getMatchOfficials,
  calculateScoreFromMatch,
  getOurSide,
  getOpponentSide,
  getOpponentTeamName,
  getScoreDeltas,
  getUnassignedOpponentGoals,
} from './utils/stats';
import { isTargetAllowed } from './utils/actionRules';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { ScoutLiveScreen } from './components/ScoutLiveScreen';
import { RosterScreen } from './components/RosterScreen';
import { ArchiveScreen } from './components/ArchiveScreen';
import { BackupScreen } from './components/BackupScreen';
import { PrivacySecurityModal } from './components/PrivacySecurityModal';
import { ClubInfoModal } from './components/ClubInfoModal';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useI18n } from './i18n';

export default function App() {
  const { t, locale } = useI18n();

  const [loadResult] = useState<StorageLoadResult>(() => loadAppDatabase());
  const [database, setDatabase] = useState<AppDatabase>(loadResult.data);
  const [saveStatus, setSaveStatus] = useState<'ok' | 'error'>('ok');
  const [corruptionAlertDismissed, setCorruptionAlertDismissed] = useState(false);

  const [currentTab, setCurrentTab] = useState<NavTab>('scout');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [systemNotification, setSystemNotification] = useState<{
    type: 'success' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // Salvataggio reattivo fuori dall'updater di setState (Fase C.1)
  useEffect(() => {
    const success = saveAppDatabase(database);
    setSaveStatus(success ? 'ok' : 'error');
  }, [database]);

  // Flush immediato su pagehide e visibilitychange
  useEffect(() => {
    const handleFlush = () => {
      saveAppDatabase(database);
    };

    window.addEventListener('pagehide', handleFlush);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFlush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handleFlush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [database]);

  const updateDatabase = useCallback((updater: (prev: AppDatabase) => AppDatabase) => {
    setDatabase(updater);
  }, []);

  // Mostra notifica temporanea
  const showToast = useCallback((type: 'success' | 'warning' | 'info', text: string) => {
    setSystemNotification({ type, text });
    setTimeout(() => {
      setSystemNotification((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  }, []);

  // Aggiorna anagrafica e logo società
  const handleUpdateClubInfo = useCallback(
    (updatedClub: ClubInfo) => {
      updateDatabase((prev) => ({
        ...prev,
        clubInfo: updatedClub,
      }));
      showToast('success', t.club.saveSuccessToast);
    },
    [showToast, t.club.saveSuccessToast, updateDatabase]
  );

  // Partita attualmente attiva
  const activeMatch =
    database.matches.find((m) => m.id === database.activeMatchId) ||
    database.matches[0] ||
    null;

  // ==========================================
  // LOGICA AZIONI PARTITA (LIVE SCOUTING)
  // ==========================================
  const handleRecordAction = useCallback(
    (
      actionType: ActionType,
      playerId?: string,
      scoreHomeDelta: number = 0,
      scoreGuestDelta: number = 0,
      officialLetter?: OfficialLetter
    ) => {
      // 1. Difesa in profondità: verifica destinatari ammessi
      const playerObj = playerId ? database.players.find((p) => p.id === playerId) : undefined;
      const targetCheck = playerId ? playerObj?.role : officialLetter ? officialLetter : undefined;
      if (!isTargetAllowed(actionType, targetCheck)) {
        showToast('warning', t.backup.targetNotAllowedWarning);
        return;
      }

      updateDatabase((prev) => {
        const matchIndex = prev.matches.findIndex(
          (m) => m.id === (prev.activeMatchId || prev.matches[0]?.id)
        );
        if (matchIndex === -1) return prev;

        const currentMatch = prev.matches[matchIndex];

        // Rifiuto OPPONENT_GOAL_UNDO se nessun gol non assegnato disponibile
        if (actionType === 'OPPONENT_GOAL_UNDO') {
          const currentUnassigned = getUnassignedOpponentGoals(currentMatch);
          if (currentUnassigned <= 0) {
            showToast('warning', t.backup.unassignedOpponentGoalUndoForbidden);
            return prev;
          }
        }

        const categoryForMatch = prev.categories.find((c) => c.id === currentMatch.categoryId);
        const nextOfficials = getMatchOfficials(currentMatch, categoryForMatch);
        const targetOfficial = officialLetter ? nextOfficials[officialLetter] : null;

        const player = playerId ? prev.players.find((p) => p.id === playerId) : undefined;
        const nextStats = { ...currentMatch.stats };
        const targetPlayerStats = playerId
          ? nextStats[playerId] ||
            createEmptyPlayerStats(
              playerId,
              player?.role || 'GIOCATORE',
              player?.name || 'Atleta',
              player?.number || 0
            )
          : null;

        // Descrizione leggibile dell'evento per il registro
        let label = '';
        if (officialLetter && targetOfficial) {
          const offName = targetOfficial.name ? ` (${targetOfficial.name})` : '';
          const offPrefix = `Dirigente ${officialLetter}${offName}`;
          switch (actionType) {
            case 'SANCTION_OFFICIAL_GIALLO':
            case 'SANCTION_GIALLO':
              label = `${offPrefix}: ${t.sanctions.yellowCardText}`;
              break;
            case 'SANCTION_OFFICIAL_DUE_MINUTI':
            case 'SANCTION_DUE_MINUTI':
              label = `${offPrefix}: ${t.sanctions.twoMinText}`;
              break;
            case 'SANCTION_OFFICIAL_ROSSO':
            case 'SANCTION_ROSSO':
              label = `${offPrefix}: ${t.sanctions.redCardText}`;
              break;
            case 'SANCTION_OFFICIAL_BLU':
            case 'SANCTION_BLU':
              label = `${offPrefix}: ${t.sanctions.blueCardText}`;
              break;
          }
        } else if (targetPlayerStats) {
          const pPrefix = `#${targetPlayerStats.playerNumber} ${targetPlayerStats.playerName}`;
          switch (actionType) {
            case 'GK_PARATA':
              label = `${pPrefix}: ${t.scout.saveAction}`;
              break;
            case 'GK_GOL_SUBITO':
              label = `${pPrefix}: ${t.scout.concededAction} (+1)`;
              break;
            case 'GK_7M_PARATO':
              label = `${pPrefix}: ${t.scout.save7mAction}`;
              break;
            case 'GK_7M_SUBITO':
              label = `${pPrefix}: ${t.scout.conceded7mAction} (+1)`;
              break;
            case 'FP_GOL':
              label = `${pPrefix}: ${t.scout.goalAction} (+1)`;
              break;
            case 'FP_TIRO_FUORI':
              label = `${pPrefix}: ${t.scout.missedAction}`;
              break;
            case 'FP_ASSIST':
              label = `${pPrefix}: ${t.scout.assistAction}`;
              break;
            case 'FP_PASSAGGIO_PERSO':
              label = `${pPrefix}: ${t.scout.lostPassAction}`;
              break;
            case 'FP_RICEZIONE_PERSA':
              label = `${pPrefix}: ${t.scout.lostCatchAction}`;
              break;
            case 'FP_7M_GOL':
              label = `${pPrefix}: ${t.scout.goal7mAction} (+1)`;
              break;
            case 'FP_7M_PERSO':
              label = `${pPrefix}: ${t.scout.missed7mAction}`;
              break;
            case 'SANCTION_GIALLO':
              label = `${pPrefix}: ${t.sanctions.yellowCardText}`;
              break;
            case 'SANCTION_DUE_MINUTI':
              label = `${pPrefix}: ${t.sanctions.twoMinText}`;
              break;
            case 'SANCTION_ROSSO':
              label = `${pPrefix}: ${t.sanctions.redCardText}`;
              break;
            case 'SANCTION_BLU':
              label = `${pPrefix}: ${t.sanctions.blueCardText}`;
              break;
          }
        } else if (actionType === 'OPPONENT_GOAL') {
          const oppName = getOpponentTeamName(currentMatch) || t.common.guest;
          label = `${oppName}: +1 ${t.scout.goals}`;
        } else if (actionType === 'OPPONENT_GOAL_UNDO') {
          const oppName = getOpponentTeamName(currentMatch) || t.common.guest;
          label = `${oppName}: -1 ${t.scout.goals}`;
        }

        let entryTeamSide: TeamSide | undefined = undefined;
        let finalHomeDelta = scoreHomeDelta;
        let finalGuestDelta = scoreGuestDelta;

        if (actionType === 'FP_GOL' || actionType === 'FP_7M_GOL') {
          entryTeamSide = getOurSide(currentMatch);
          const deltas = getScoreDeltas(currentMatch, 'OURS');
          finalHomeDelta = deltas.home;
          finalGuestDelta = deltas.guest;
        } else if (
          actionType === 'OPPONENT_GOAL' ||
          actionType === 'GK_GOL_SUBITO' ||
          actionType === 'GK_7M_SUBITO'
        ) {
          entryTeamSide = getOpponentSide(currentMatch);
          const deltas = getScoreDeltas(currentMatch, 'OPPONENT');
          finalHomeDelta = deltas.home;
          finalGuestDelta = deltas.guest;
        } else if (actionType === 'OPPONENT_GOAL_UNDO') {
          entryTeamSide = getOpponentSide(currentMatch);
          const deltas = getScoreDeltas(currentMatch, 'OPPONENT');
          finalHomeDelta = -deltas.home;
          finalGuestDelta = -deltas.guest;
        }

        const logEntry: ActionLogEntry = {
          id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: Date.now(),
          actionType,
          label,
          playerId,
          playerName: targetPlayerStats?.playerName,
          playerNumber: targetPlayerStats?.playerNumber,
          role: targetPlayerStats?.role,
          officialLetter,
          officialName: targetOfficial?.name,
          scoreChangeHome: finalHomeDelta,
          scoreChangeGuest: finalGuestDelta,
          teamSide: entryTeamSide,
        };

        if (officialLetter) {
          const off = { ...nextOfficials[officialLetter], sanctions: { ...nextOfficials[officialLetter].sanctions } };
          if (actionType === 'SANCTION_OFFICIAL_GIALLO' || actionType === 'SANCTION_GIALLO') {
            off.sanctions.giallo = Math.max(0, off.sanctions.giallo + 1);
          } else if (actionType === 'SANCTION_OFFICIAL_DUE_MINUTI' || actionType === 'SANCTION_DUE_MINUTI') {
            off.sanctions.dueMinuti = Math.max(0, off.sanctions.dueMinuti + 1);
          } else if (actionType === 'SANCTION_OFFICIAL_ROSSO' || actionType === 'SANCTION_ROSSO') {
            off.sanctions.rosso = Math.max(0, off.sanctions.rosso + 1);
          } else if (actionType === 'SANCTION_OFFICIAL_BLU' || actionType === 'SANCTION_BLU') {
            off.sanctions.blu = Math.max(0, off.sanctions.blu + 1);
          }
          nextOfficials[officialLetter] = off;
        }

        if (playerId && targetPlayerStats) {
          const updatedPStats = JSON.parse(JSON.stringify(targetPlayerStats)) as PlayerMatchStats;

          switch (actionType) {
            case 'GK_PARATA':
              updatedPStats.goalkeeper.parate = Math.max(0, updatedPStats.goalkeeper.parate + 1);
              break;
            case 'GK_GOL_SUBITO':
              updatedPStats.goalkeeper.golSubiti = Math.max(0, updatedPStats.goalkeeper.golSubiti + 1);
              break;
            case 'GK_7M_PARATO':
              updatedPStats.goalkeeper.rigoriParati = Math.max(0, updatedPStats.goalkeeper.rigoriParati + 1);
              break;
            case 'GK_7M_SUBITO':
              updatedPStats.goalkeeper.rigoriSubiti = Math.max(0, updatedPStats.goalkeeper.rigoriSubiti + 1);
              break;
            case 'FP_GOL':
              updatedPStats.field.gol = Math.max(0, updatedPStats.field.gol + 1);
              break;
            case 'FP_TIRO_FUORI':
              updatedPStats.field.tiriFuori = Math.max(0, updatedPStats.field.tiriFuori + 1);
              break;
            case 'FP_ASSIST':
              updatedPStats.field.assist = Math.max(0, updatedPStats.field.assist + 1);
              break;
            case 'FP_PASSAGGIO_PERSO':
              updatedPStats.field.passaggiPersi = Math.max(0, updatedPStats.field.passaggiPersi + 1);
              break;
            case 'FP_RICEZIONE_PERSA':
              updatedPStats.field.passaggiPersiRicezione = Math.max(0, updatedPStats.field.passaggiPersiRicezione + 1);
              break;
            case 'FP_7M_GOL':
              updatedPStats.field.rigoriGol = Math.max(0, updatedPStats.field.rigoriGol + 1);
              break;
            case 'FP_7M_PERSO':
              updatedPStats.field.rigoriPersi = Math.max(0, updatedPStats.field.rigoriPersi + 1);
              break;
            case 'SANCTION_GIALLO':
              updatedPStats.sanctions.giallo = Math.max(0, updatedPStats.sanctions.giallo + 1);
              break;
            case 'SANCTION_DUE_MINUTI':
              updatedPStats.sanctions.dueMinuti = Math.max(0, updatedPStats.sanctions.dueMinuti + 1);
              break;
            case 'SANCTION_ROSSO':
              updatedPStats.sanctions.rosso = Math.max(0, updatedPStats.sanctions.rosso + 1);
              break;
            case 'SANCTION_BLU':
              updatedPStats.sanctions.blu = Math.max(0, updatedPStats.sanctions.blu + 1);
              break;
          }

          nextStats[playerId] = updatedPStats;
        }

        const matchToScore: HandballMatch = {
          ...currentMatch,
          stats: nextStats,
          officials: nextOfficials,
          actionLog: [...(currentMatch.actionLog || []), logEntry],
          updatedAt: Date.now(),
        };

        const newScores = calculateScoreFromMatch(matchToScore);

        const nextMatches = [...prev.matches];
        nextMatches[matchIndex] = {
          ...matchToScore,
          scoreHome: newScores.home,
          scoreGuest: newScores.guest,
        };

        return { ...prev, matches: nextMatches };
      });
    },
    [database.players, showToast, t, updateDatabase]
  );

  // ==========================================
  // LOGICA ANNULLA SIMMETRICO (UNDO)
  // ==========================================
  const handleUndoLastAction = useCallback(() => {
    updateDatabase((prev) => {
      const matchIndex = prev.matches.findIndex(
        (m) => m.id === (prev.activeMatchId || prev.matches[0]?.id)
      );
      if (matchIndex === -1) return prev;

      const currentMatch = prev.matches[matchIndex];
      const log = [...(currentMatch.actionLog || [])];
      const lastEntry = log.pop();
      if (!lastEntry) return prev;

      const nextStats = { ...currentMatch.stats };
      const categoryForMatch = prev.categories.find((c) => c.id === currentMatch.categoryId);
      const nextOfficials = getMatchOfficials(currentMatch, categoryForMatch);

      if (lastEntry.officialLetter) {
        const off = { ...nextOfficials[lastEntry.officialLetter], sanctions: { ...nextOfficials[lastEntry.officialLetter].sanctions } };
        if (lastEntry.actionType === 'SANCTION_OFFICIAL_GIALLO' || lastEntry.actionType === 'SANCTION_GIALLO') {
          off.sanctions.giallo = Math.max(0, off.sanctions.giallo - 1);
        } else if (lastEntry.actionType === 'SANCTION_OFFICIAL_DUE_MINUTI' || lastEntry.actionType === 'SANCTION_DUE_MINUTI') {
          off.sanctions.dueMinuti = Math.max(0, off.sanctions.dueMinuti - 1);
        } else if (lastEntry.actionType === 'SANCTION_OFFICIAL_ROSSO' || lastEntry.actionType === 'SANCTION_ROSSO') {
          off.sanctions.rosso = Math.max(0, off.sanctions.rosso - 1);
        } else if (lastEntry.actionType === 'SANCTION_OFFICIAL_BLU' || lastEntry.actionType === 'SANCTION_BLU') {
          off.sanctions.blu = Math.max(0, off.sanctions.blu - 1);
        }
        nextOfficials[lastEntry.officialLetter] = off;
      }

      if (lastEntry.playerId && nextStats[lastEntry.playerId]) {
        const pStats = JSON.parse(JSON.stringify(nextStats[lastEntry.playerId])) as PlayerMatchStats;

        switch (lastEntry.actionType) {
          case 'GK_PARATA':
            pStats.goalkeeper.parate = Math.max(0, pStats.goalkeeper.parate - 1);
            break;
          case 'GK_GOL_SUBITO':
            pStats.goalkeeper.golSubiti = Math.max(0, pStats.goalkeeper.golSubiti - 1);
            break;
          case 'GK_7M_PARATO':
            pStats.goalkeeper.rigoriParati = Math.max(0, pStats.goalkeeper.rigoriParati - 1);
            break;
          case 'GK_7M_SUBITO':
            pStats.goalkeeper.rigoriSubiti = Math.max(0, pStats.goalkeeper.rigoriSubiti - 1);
            break;
          case 'FP_GOL':
            pStats.field.gol = Math.max(0, pStats.field.gol - 1);
            break;
          case 'FP_TIRO_FUORI':
            pStats.field.tiriFuori = Math.max(0, pStats.field.tiriFuori - 1);
            break;
          case 'FP_ASSIST':
            pStats.field.assist = Math.max(0, pStats.field.assist - 1);
            break;
          case 'FP_PASSAGGIO_PERSO':
            pStats.field.passaggiPersi = Math.max(0, pStats.field.passaggiPersi - 1);
            break;
          case 'FP_RICEZIONE_PERSA':
            pStats.field.passaggiPersiRicezione = Math.max(0, pStats.field.passaggiPersiRicezione - 1);
            break;
          case 'FP_7M_GOL':
            pStats.field.rigoriGol = Math.max(0, pStats.field.rigoriGol - 1);
            break;
          case 'FP_7M_PERSO':
            pStats.field.rigoriPersi = Math.max(0, pStats.field.rigoriPersi - 1);
            break;
          case 'SANCTION_GIALLO':
            pStats.sanctions.giallo = Math.max(0, pStats.sanctions.giallo - 1);
            break;
          case 'SANCTION_DUE_MINUTI':
            pStats.sanctions.dueMinuti = Math.max(0, pStats.sanctions.dueMinuti - 1);
            break;
          case 'SANCTION_ROSSO':
            pStats.sanctions.rosso = Math.max(0, pStats.sanctions.rosso - 1);
            break;
          case 'SANCTION_BLU':
            pStats.sanctions.blu = Math.max(0, pStats.sanctions.blu - 1);
            break;
        }

        nextStats[lastEntry.playerId] = pStats;
      }

      const matchToScore: HandballMatch = {
        ...currentMatch,
        stats: nextStats,
        officials: nextOfficials,
        actionLog: log,
        updatedAt: Date.now(),
      };

      const newScores = calculateScoreFromMatch(matchToScore);

      const nextMatches = [...prev.matches];
      nextMatches[matchIndex] = {
        ...matchToScore,
        scoreHome: newScores.home,
        scoreGuest: newScores.guest,
      };

      return { ...prev, matches: nextMatches };
    });

    showToast('info', t.scout.undoSuccessToast);
  }, [showToast, t.scout.undoSuccessToast, updateDatabase]);

  // ==========================================
  // GESTIONE ATLETI (ROSA) & SANITIZZAZIONE
  // ==========================================
  const handleAddPlayer = (newPlayerData: Omit<Player, 'id'>): { success: boolean; error?: string } => {
    const cleanName = sanitizeInput(newPlayerData.name, 60);
    const newPlayer: Player = {
      ...newPlayerData,
      name: cleanName,
      id: `ply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    updateDatabase((prev) => ({
      ...prev,
      players: [...prev.players, newPlayer],
    }));

    showToast('success', `${t.roster.athleteAddedToast}: #${newPlayer.number} ${newPlayer.name}`);
    return { success: true };
  };

  const handleUpdatePlayer = (updatedPlayer: Player): { success: boolean; error?: string } => {
    const cleanPlayer: Player = {
      ...updatedPlayer,
      name: sanitizeInput(updatedPlayer.name, 60),
    };

    updateDatabase((prev) => {
      const nextPlayers = prev.players.map((p) => (p.id === cleanPlayer.id ? cleanPlayer : p));
      const nextMatches = prev.matches.map((m) => {
        if (m.stats[cleanPlayer.id]) {
          return {
            ...m,
            stats: {
              ...m.stats,
              [cleanPlayer.id]: {
                ...m.stats[cleanPlayer.id],
                playerName: cleanPlayer.name,
                playerNumber: cleanPlayer.number,
                role: cleanPlayer.role,
              },
            },
          };
        }
        return m;
      });

      return {
        ...prev,
        players: nextPlayers,
        matches: nextMatches,
      };
    });

    showToast('success', `${t.roster.athleteUpdatedToast}: #${cleanPlayer.number} ${cleanPlayer.name}`);
    return { success: true };
  };

  const handleDeletePlayer = (playerId: string) => {
    updateDatabase((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
    }));

    showToast('info', t.roster.athleteRemovedToast);
  };

  const handleTogglePlayerStatus = (playerId: string) => {
    updateDatabase((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === playerId ? { ...p, active: !p.active } : p)),
    }));
  };

  // ==========================================
  // GESTIONE CATEGORIE & DIRIGENTI
  // ==========================================
  const handleAddCategory = (name: string): { success: boolean; error?: string } => {
    const cleanName = sanitizeInput(name, 60);

    const newCategory: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
    };

    updateDatabase((prev) => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));

    showToast('success', `${t.roster.categoryCreatedToast}: "${newCategory.name}"`);
    return { success: true };
  };

  const handleUpdateCategory = (id: string, name: string): { success: boolean; error?: string } => {
    const cleanName = sanitizeInput(name, 60);

    updateDatabase((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, name: cleanName } : c)),
    }));

    showToast('success', `${t.roster.categoryUpdatedToast}: "${cleanName}"`);
    return { success: true };
  };

  const handleDeleteCategory = (categoryId: string): { success: boolean; error?: string } => {
    if (database.categories.length <= 1) {
      showToast('warning', t.roster.cannotDeleteLastCategory);
      return { success: false, error: t.roster.cannotDeleteLastCategory };
    }

    updateDatabase((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== categoryId),
      players: prev.players.filter((p) => p.categoryId !== categoryId),
    }));

    showToast('info', t.roster.categoryRemovedToast);
    return { success: true };
  };

  const handleUpdateCategoryOfficials = (categoryId: string, officials: CategoryOfficials) => {
    const cleanOfficials: CategoryOfficials = {
      A: officials.A ? sanitizeInput(officials.A, 60) : '',
      B: officials.B ? sanitizeInput(officials.B, 60) : '',
      C: officials.C ? sanitizeInput(officials.C, 60) : '',
      D: officials.D ? sanitizeInput(officials.D, 60) : '',
    };

    updateDatabase((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, officials: cleanOfficials } : c)),
    }));

    showToast('success', t.roster.officialsSavedToast);
  };

  // ==========================================
  // GESTIONE PARTITE & ARCHIVIO
  // ==========================================
  const handleCreateMatch = (data: {
    homeTeam: string;
    guestTeam: string;
    categoryId: string;
    date: string;
    location: string;
    notes: string;
    isAwayMatch?: boolean;
  }) => {
    const categoryPlayers = database.players.filter((p) => p.categoryId === data.categoryId);
    if (categoryPlayers.length === 0) {
      showToast('warning', t.archive.errorNoAthletesInCategory);
      return { success: false, error: t.archive.errorNoAthletesInCategory };
    }

    const initialStats: Record<string, PlayerMatchStats> = {};
    categoryPlayers.forEach((p) => {
      initialStats[p.id] = createEmptyPlayerStats(p.id, p.role, p.name, p.number);
    });

    const categoryForMatch = database.categories.find((c) => c.id === data.categoryId);
    const initialOfficials = getMatchOfficials(null, categoryForMatch);

    const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMatch: HandballMatch = {
      id: matchId,
      homeTeam: sanitizeInput(data.homeTeam, 60),
      guestTeam: sanitizeInput(data.guestTeam, 60),
      categoryId: data.categoryId,
      date: data.date,
      location: sanitizeInput(data.location, 80),
      notes: sanitizeInput(data.notes, 300),
      isAwayMatch: Boolean(data.isAwayMatch),
      scoreHome: 0,
      scoreGuest: 0,
      stats: initialStats,
      officials: initialOfficials,
      actionLog: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    updateDatabase((prev) => ({
      ...prev,
      matches: [newMatch, ...prev.matches],
      activeMatchId: matchId,
    }));

    setCurrentTab('scout');
    showToast('success', `${t.archive.matchCreatedToast}: "${data.homeTeam} vs ${data.guestTeam}"`);
    return { success: true };
  };

  const handleSetActiveMatch = (matchId: string) => {
    updateDatabase((prev) => ({
      ...prev,
      activeMatchId: matchId,
    }));
    setCurrentTab('scout');
    showToast('info', t.archive.matchSetActiveToast);
  };

  const handleDeleteMatch = (matchId: string) => {
    updateDatabase((prev) => {
      const nextMatches = prev.matches.filter((m) => m.id !== matchId);
      const nextActiveId = prev.activeMatchId === matchId ? nextMatches[0]?.id || null : prev.activeMatchId;
      return {
        ...prev,
        matches: nextMatches,
        activeMatchId: nextActiveId,
      };
    });

    showToast('info', t.archive.matchDeletedToast);
  };

  const handleUpdateMatchStats = (
    matchId: string,
    updatedStats: Record<string, PlayerMatchStats>,
    updatedOfficials?: Record<OfficialLetter, OfficialSanctionStats>
  ) => {
    updateDatabase((prev) => {
      const matchIndex = prev.matches.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return prev;

      const targetMatch = prev.matches[matchIndex];
      const updatedMatch: HandballMatch = {
        ...targetMatch,
        stats: updatedStats,
        officials: updatedOfficials || targetMatch.officials,
        updatedAt: Date.now(),
      };

      const newScores = calculateScoreFromMatch(updatedMatch);

      const nextMatches = [...prev.matches];
      nextMatches[matchIndex] = {
        ...updatedMatch,
        scoreHome: newScores.home,
        scoreGuest: newScores.guest,
      };

      return { ...prev, matches: nextMatches };
    });

    showToast('success', t.archive.statsUpdatedToast);
  };

  // ==========================================
  // INVERSIONE SEDE INCONTRO CASA <-> OSPITI
  // ==========================================
  const handleToggleMatchMode = useCallback(
    (targetMatchId?: string) => {
      const idToToggle = targetMatchId || activeMatch?.id;
      if (!idToToggle) return;

      updateDatabase((prev) => {
        const matchIndex = prev.matches.findIndex((m) => m.id === idToToggle);
        if (matchIndex === -1) return prev;

        const currentMatch = prev.matches[matchIndex];
        const newIsAwayMatch = !currentMatch.isAwayMatch;

        // Inverti i nomi delle squadre CASA <-> OSPITI
        const newHomeTeam = currentMatch.guestTeam;
        const newGuestTeam = currentMatch.homeTeam;

        const updatedMatch: HandballMatch = {
          ...currentMatch,
          homeTeam: newHomeTeam,
          guestTeam: newGuestTeam,
          isAwayMatch: newIsAwayMatch,
          updatedAt: Date.now(),
        };

        const newScores = calculateScoreFromMatch(updatedMatch);

        const nextMatches = [...prev.matches];
        nextMatches[matchIndex] = {
          ...updatedMatch,
          scoreHome: newScores.home,
          scoreGuest: newScores.guest,
        };

        return { ...prev, matches: nextMatches };
      });

      showToast('info', t.scout.switchHomeGuestToast);
    },
    [activeMatch, showToast, t.scout.switchHomeGuestToast, updateDatabase]
  );

  // ==========================================
  // RIPRISTINO BACKUP SICURO (FASE C.5)
  // ==========================================
  const handleRestoreBackup = useCallback(
    (backupData: BackupData): { ok: boolean; safetyBackupCreated: boolean; persisted: boolean } => {
      const safetyBackupCreated = createSafetyBackup(database);

      const restoredDb: AppDatabase = {
        schemaVersion: backupData.schemaVersion,
        initialized: true,
        clubInfo: backupData.clubInfo || database.clubInfo || { ...DEFAULT_CLUB_INFO },
        categories: backupData.categories,
        players: backupData.players,
        matches: backupData.matches,
        activeMatchId: backupData.matches[0]?.id || null,
      };

      const persisted = saveAppDatabase(restoredDb);
      setDatabase(restoredDb);
      return { ok: true, safetyBackupCreated, persisted };
    },
    [database]
  );

  // ==========================================
  // CANCELLAZIONE TOTALE (DIRITTO ALL'OBLIO - GDPR ART. 17)
  // ==========================================
  const handleWipeAllData = () => {
    wipeAllLocalData();
    const cleanDb: AppDatabase = {
      schemaVersion: 1,
      initialized: true,
      clubInfo: { ...DEFAULT_CLUB_INFO },
      categories: [...DEFAULT_INITIAL_CATEGORIES],
      players: [],
      matches: [],
      activeMatchId: null,
    };
    saveAppDatabase(cleanDb);
    setDatabase(cleanDb);
    showToast('info', t.privacyModal.rightToErasureDesc);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#808080] text-neutral-900 select-none">
      {/* Header unificato con Barra Navy e Tricolore */}
      <Header
        title={t.common.appName}
        subtitle={
          activeMatch
            ? `${activeMatch.homeTeam} vs ${activeMatch.guestTeam} (${activeMatch.scoreHome}-${activeMatch.scoreGuest})`
            : undefined
        }
        clubInfo={database.clubInfo}
        onOpenClubModal={() => setIsClubModalOpen(true)}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
      />

      {/* Banner persistente di errore salvataggio (spazio esaurito) - NON chiudibile */}
      {saveStatus === 'error' && (
        <div className="max-w-2xl mx-auto w-full px-3 pt-2">
          <div className="p-3 rounded-xl border-2 border-red-700 bg-red-600 text-white flex items-center justify-between text-xs font-black shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-white" />
              <span>{t.backup.saveStorageErrorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('backup')}
              className="px-3 py-1 bg-white text-red-700 rounded-lg font-black text-xs hover:bg-neutral-100 transition-colors shadow-sm ml-2 cursor-pointer flex-shrink-0"
            >
              {t.backup.goToBackupBtn}
            </button>
          </div>
        </div>
      )}

      {/* Avviso informativo per recupero da file corrotto */}
      {loadResult.recoveredFromCorrupt && !corruptionAlertDismissed && (
        <div className="max-w-2xl mx-auto w-full px-3 pt-2">
          <div className="p-3 rounded-xl border-2 border-amber-600 bg-amber-500 text-neutral-950 flex items-center justify-between text-xs font-black shadow-md">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 flex-shrink-0 text-neutral-950" />
              <span>{t.backup.corruptDbBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setCorruptionAlertDismissed(true)}
              className="text-xs font-black opacity-80 hover:opacity-100 ml-2 px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Banner Notifiche di Sistema */}
      {systemNotification && (
        <div className="max-w-2xl mx-auto w-full px-3 pt-2">
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-black shadow-md ${
              systemNotification.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : systemNotification.type === 'warning'
                ? 'bg-amber-500 text-neutral-950 border-amber-600'
                : 'bg-[#00008B] text-white border-blue-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {systemNotification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : systemNotification.type === 'warning' ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Info className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{systemNotification.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setSystemNotification(null)}
              className="text-xs font-black opacity-80 hover:opacity-100 ml-2 px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Contenuto Principale (Schermata attiva) */}
      <main className="flex-1 w-full max-w-4xl mx-auto">
        {currentTab === 'scout' && (
          <ScoutLiveScreen
            activeMatch={activeMatch}
            players={database.players}
            categories={database.categories}
            clubInfo={database.clubInfo}
            onRecordAction={handleRecordAction}
            onUndoLastAction={handleUndoLastAction}
            onToggleMatchMode={handleToggleMatchMode}
            onNavigateToRoster={() => setCurrentTab('roster')}
            onOpenNewMatch={() => setCurrentTab('archive')}
          />
        )}

        {currentTab === 'roster' && (
          <RosterScreen
            categories={database.categories}
            players={database.players}
            clubInfo={database.clubInfo}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddPlayer={handleAddPlayer}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
            onUpdateCategoryOfficials={handleUpdateCategoryOfficials}
          />
        )}

        {currentTab === 'archive' && (
          <ArchiveScreen
            matches={database.matches}
            categories={database.categories}
            players={database.players}
            clubInfo={database.clubInfo}
            activeMatchId={database.activeMatchId}
            onSetActiveMatch={handleSetActiveMatch}
            onDeleteMatch={handleDeleteMatch}
            onCreateMatch={handleCreateMatch}
            onUpdateMatchStats={handleUpdateMatchStats}
            onToggleMatchMode={handleToggleMatchMode}
          />
        )}

        {currentTab === 'backup' && (
          <BackupScreen
            currentDatabase={database}
            onRestoreBackup={handleRestoreBackup}
            matches={database.matches}
            categories={database.categories}
            onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
            onOpenClubModal={() => setIsClubModalOpen(true)}
          />
        )}
      </main>

      {/* Barra di Navigazione Inferiore */}
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Modale Informativa Cybersicurezza & Privacy */}
      <PrivacySecurityModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onWipeData={handleWipeAllData}
      />

      {/* Modale Anagrafica e Logo Club / Società */}
      <ClubInfoModal
        isOpen={isClubModalOpen}
        clubInfo={database.clubInfo}
        onClose={() => setIsClubModalOpen(false)}
        onSave={handleUpdateClubInfo}
      />
    </div>
  );
}
