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
} from './types/scout';
import { createEmptyPlayerStats, getMatchOfficials } from './utils/stats';
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

  const [database, setDatabase] = useState<AppDatabase>(() => {
    const result = loadAppDatabase();
    return result.data;
  });

  const [currentTab, setCurrentTab] = useState<NavTab>('scout');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [systemNotification, setSystemNotification] = useState<{
    type: 'success' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // Salva ogni modifica nel database persistente in locale
  const updateDatabase = useCallback((updater: (prev: AppDatabase) => AppDatabase) => {
    setDatabase((prev) => {
      const next = updater(prev);
      saveAppDatabase(next);
      return next;
    });
  }, []);

  // Mostra notifica temporanea
  const showToast = useCallback((type: 'success' | 'warning' | 'info', text: string) => {
    setSystemNotification({ type, text });
    setTimeout(() => {
      setSystemNotification((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  }, []);

  // Aggiorna anagrafica e logo società
  const handleUpdateClubInfo = useCallback((updatedClub: ClubInfo) => {
    updateDatabase((prev) => ({
      ...prev,
      clubInfo: updatedClub,
    }));
    showToast('success', t.club.saveSuccessToast);
  }, [t, updateDatabase, showToast]);

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
      if (!activeMatch) return;

      const player = playerId ? database.players.find((p) => p.id === playerId) : undefined;
      const targetPlayerStats = playerId
        ? activeMatch.stats[playerId] ||
          createEmptyPlayerStats(
            playerId,
            player?.name || 'Atleta',
            player?.number || 0,
            player?.role || 'GIOCATORE'
          )
        : null;

      const currentCategory = database.categories.find((c) => c.id === activeMatch.categoryId);
      const currentOfficials = getMatchOfficials(activeMatch, currentCategory);
      const targetOfficial = officialLetter ? currentOfficials[officialLetter] : null;

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
      } else if (player && targetPlayerStats) {
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
        label = `${t.common.guest}: +1 ${t.scout.goals}`;
      } else if (actionType === 'OPPONENT_GOAL_UNDO') {
        label = `${t.common.guest}: -1 ${t.scout.goals}`;
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
        scoreChangeHome: scoreHomeDelta,
        scoreChangeGuest: scoreGuestDelta,
      };

      updateDatabase((prev) => {
        const matchIndex = prev.matches.findIndex((m) => m.id === activeMatch.id);
        if (matchIndex === -1) return prev;

        const currentMatch = prev.matches[matchIndex];
        const nextStats = { ...currentMatch.stats };
        const categoryForMatch = prev.categories.find((c) => c.id === currentMatch.categoryId);
        const nextOfficials = getMatchOfficials(currentMatch, categoryForMatch);

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

        const nextMatches = [...prev.matches];
        nextMatches[matchIndex] = {
          ...currentMatch,
          scoreHome: Math.max(0, currentMatch.scoreHome + scoreHomeDelta),
          scoreGuest: Math.max(0, currentMatch.scoreGuest + scoreGuestDelta),
          stats: nextStats,
          officials: nextOfficials,
          actionLog: [...(currentMatch.actionLog || []), logEntry],
          updatedAt: Date.now(),
        };

        return { ...prev, matches: nextMatches };
      });
    },
    [activeMatch, database.categories, database.players, t, updateDatabase]
  );

  // ==========================================
  // LOGICA ANNULLA SIMMETRICO (UNDO)
  // ==========================================
  const handleUndoLastAction = useCallback(() => {
    if (!activeMatch || !activeMatch.actionLog || activeMatch.actionLog.length === 0) return;

    updateDatabase((prev) => {
      const matchIndex = prev.matches.findIndex((m) => m.id === activeMatch.id);
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

      const nextMatches = [...prev.matches];
      nextMatches[matchIndex] = {
        ...currentMatch,
        scoreHome: Math.max(0, currentMatch.scoreHome - (lastEntry.scoreChangeHome || 0)),
        scoreGuest: Math.max(0, currentMatch.scoreGuest - (lastEntry.scoreChangeGuest || 0)),
        stats: nextStats,
        officials: nextOfficials,
        actionLog: log,
        updatedAt: Date.now(),
      };

      return { ...prev, matches: nextMatches };
    });

    showToast('info', t.scout.undoSuccessToast);
  }, [activeMatch, showToast, t, updateDatabase]);

  // ==========================================
  // GESTIONE ATLETI (ROSA) & SANITIZZAZIONE
  // ==========================================
  const handleAddPlayer = (newPlayerData: Omit<Player, 'id'>) => {
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

    showToast('success', `${t.roster.athleteAddedToast} (#${newPlayer.number} ${newPlayer.name})`);
    return { success: true };
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    const cleanName = sanitizeInput(updatedPlayer.name, 60);
    const sanitizedPlayer = { ...updatedPlayer, name: cleanName };

    updateDatabase((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === sanitizedPlayer.id ? sanitizedPlayer : p)),
    }));

    showToast('success', `${t.roster.athleteUpdatedToast} (#${sanitizedPlayer.number} ${sanitizedPlayer.name})`);
    return { success: true };
  };

  const handleDeletePlayer = (playerId: string) => {
    const p = database.players.find((pl) => pl.id === playerId);
    updateDatabase((prev) => ({
      ...prev,
      players: prev.players.filter((pl) => pl.id !== playerId),
    }));

    showToast('info', `${t.roster.athleteRemovedToast} (${p?.name || ''})`);
  };

  // ==========================================
  // GESTIONE CATEGORIE
  // ==========================================
  const handleAddCategory = (name: string) => {
    const cleanName = sanitizeInput(name, 40);
    const id = `cat_${Date.now()}`;
    const newCat: Category = { id, name: cleanName };

    updateDatabase((prev) => ({
      ...prev,
      categories: [...prev.categories, newCat],
    }));

    showToast('success', `${t.roster.categoryCreatedToast} "${cleanName}"`);
    return { success: true };
  };

  const handleUpdateCategory = (id: string, name: string) => {
    const cleanName = sanitizeInput(name, 40);
    updateDatabase((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, name: cleanName } : c)),
    }));

    showToast('success', `${t.roster.categoryUpdatedToast} "${cleanName}"`);
    return { success: true };
  };

  const handleUpdateCategoryOfficials = (categoryId: string, officials: CategoryOfficials) => {
    const sanitizedOfficials: CategoryOfficials = {
      A: officials.A ? sanitizeInput(officials.A, 60) : '',
      B: officials.B ? sanitizeInput(officials.B, 60) : '',
      C: officials.C ? sanitizeInput(officials.C, 60) : '',
      D: officials.D ? sanitizeInput(officials.D, 60) : '',
    };

    updateDatabase((prev) => {
      const nextCategories = prev.categories.map((c) =>
        c.id === categoryId ? { ...c, officials: sanitizedOfficials } : c
      );

      const nextMatches = prev.matches.map((m) => {
        if (m.categoryId === categoryId) {
          const currentOff = getMatchOfficials(m, { id: categoryId, name: '', officials: sanitizedOfficials });
          return {
            ...m,
            officials: {
              A: { ...currentOff.A, name: sanitizedOfficials.A || currentOff.A.name },
              B: { ...currentOff.B, name: sanitizedOfficials.B || currentOff.B.name },
              C: { ...currentOff.C, name: sanitizedOfficials.C || currentOff.C.name },
              D: { ...currentOff.D, name: sanitizedOfficials.D || currentOff.D.name },
            },
          };
        }
        return m;
      });

      return { ...prev, categories: nextCategories, matches: nextMatches };
    });

    showToast('success', t.roster.officialsSavedToast);
  };

  const handleDeleteCategory = (id: string) => {
    updateDatabase((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      players: prev.players.filter((p) => p.categoryId !== id),
    }));

    showToast('info', t.roster.categoryRemovedToast);
    return { success: true };
  };

  // ==========================================
  // GESTIONE PARTITE (CREAZIONE, STATO, MODIFICHE)
  // ==========================================
  const handleCreateMatch = (data: {
    homeTeam: string;
    guestTeam: string;
    categoryId: string;
    date: string;
    location: string;
    notes: string;
  }) => {
    const matchId = `match_${Date.now()}`;
    const cleanHome = sanitizeInput(data.homeTeam, 60);
    const cleanGuest = sanitizeInput(data.guestTeam, 60);
    const cleanLocation = sanitizeInput(data.location, 80);
    const cleanNotes = sanitizeInput(data.notes, 200);

    const categoryPlayers = database.players.filter((p) => p.categoryId === data.categoryId);
    const initialStats: Record<string, PlayerMatchStats> = {};

    categoryPlayers.forEach((p) => {
      initialStats[p.id] = createEmptyPlayerStats(p.id, p.name, p.number, p.role);
    });

    const category = database.categories.find((c) => c.id === data.categoryId);
    const initialOfficials = getMatchOfficials(null, category);

    const newMatch: HandballMatch = {
      id: matchId,
      homeTeam: cleanHome,
      guestTeam: cleanGuest,
      categoryId: data.categoryId,
      date: data.date,
      location: cleanLocation,
      notes: cleanNotes,
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

      let newScoreHome = 0;
      Object.values(updatedStats).forEach((st) => {
        if (st.role === 'GIOCATORE') {
          newScoreHome += (st.field.gol || 0) + (st.field.rigoriGol || 0);
        }
      });

      const nextMatches = [...prev.matches];
      nextMatches[matchIndex] = {
        ...nextMatches[matchIndex],
        stats: updatedStats,
        officials: updatedOfficials || nextMatches[matchIndex].officials,
        scoreHome: newScoreHome,
        updatedAt: Date.now(),
      };

      return { ...prev, matches: nextMatches };
    });

    showToast('success', t.archive.statsUpdatedToast);
  };

  // ==========================================
  // RIPRISTINO BACKUP
  // ==========================================
  const handleRestoreBackup = (backupData: BackupData) => {
    createSafetyBackup(database);

    const restoredDb: AppDatabase = {
      schemaVersion: backupData.schemaVersion,
      initialized: true,
      clubInfo: backupData.clubInfo || database.clubInfo || { ...DEFAULT_CLUB_INFO },
      categories: backupData.categories,
      players: backupData.players,
      matches: backupData.matches,
      activeMatchId: backupData.matches[0]?.id || null,
    };

    updateDatabase(() => restoredDb);
  };

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
            onRecordAction={handleRecordAction}
            onUndoLastAction={handleUndoLastAction}
            onOpenNewMatch={() => setCurrentTab('archive')}
            onNavigateToRoster={() => setCurrentTab('roster')}
          />
        )}

        {currentTab === 'roster' && (
          <RosterScreen
            categories={database.categories}
            players={database.players}
            onAddPlayer={handleAddPlayer}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onUpdateCategoryOfficials={handleUpdateCategoryOfficials}
          />
        )}

        {currentTab === 'archive' && (
          <ArchiveScreen
            matches={database.matches}
            activeMatchId={database.activeMatchId}
            categories={database.categories}
            players={database.players}
            clubInfo={database.clubInfo}
            onCreateMatch={handleCreateMatch}
            onSetActiveMatch={handleSetActiveMatch}
            onDeleteMatch={handleDeleteMatch}
            onUpdateMatchStats={handleUpdateMatchStats}
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

      {/* Modale Informativa su Privacy GDPR, Cybersecurity e Diritti di Sviluppo */}
      <PrivacySecurityModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onWipeData={handleWipeAllData}
      />

      {/* Modale Anagrafica e Dati Società */}
      <ClubInfoModal
        isOpen={isClubModalOpen}
        clubInfo={database.clubInfo}
        onClose={() => setIsClubModalOpen(false)}
        onSave={handleUpdateClubInfo}
      />

      {/* Barra Navigazione Inferiore per Smartphone */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        activeMatchScore={
          activeMatch
            ? { home: activeMatch.scoreHome, guest: activeMatch.scoreGuest }
            : null
        }
      />
    </div>
  );
}
