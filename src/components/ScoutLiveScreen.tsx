/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  HandballMatch,
  Player,
  ActionType,
  SanctionType,
  OfficialLetter,
  Category,
  ClubInfo,
} from '../types/scout';
import { Button3D } from './Button3D';
import { SanctionsDialog } from './SanctionsDialog';
import { ActionAssignModal } from './ActionAssignModal';
import {
  calculateGoalkeeperStats,
  calculateFieldPlayerStats,
  calculatePlayerTotalActions,
  getMatchOfficials,
  getOurSide,
  getOpponentSide,
  getScoreDeltas,
  getOurTeamName,
  getOpponentTeamName,
  getUnassignedOpponentGoals,
  createEmptyPlayerStats,
} from '../utils/stats';
import {
  ShieldAlert,
  RotateCcw,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Building2,
  ArrowLeftRight,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface ScoutLiveScreenProps {
  activeMatch: HandballMatch | null;
  players: Player[];
  categories: Category[];
  clubInfo?: ClubInfo;
  onRecordAction: (
    actionType: ActionType,
    playerId?: string,
    scoreHomeDelta?: number,
    scoreGuestDelta?: number,
    officialLetter?: OfficialLetter
  ) => void;
  onUndoLastAction: () => void;
  onOpenNewMatch: () => void;
  onNavigateToRoster: () => void;
  onToggleMatchMode: () => void;
}

export const ScoutLiveScreen: React.FC<ScoutLiveScreenProps> = ({
  activeMatch,
  players,
  categories,
  clubInfo,
  onRecordAction,
  onUndoLastAction,
  onOpenNewMatch,
  onNavigateToRoster,
  onToggleMatchMode,
}) => {
  const { t, locale } = useI18n();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isSanctionsDialogOpen, setIsSanctionsDialogOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<{
    isOpen: boolean;
    actionType: ActionType | null;
    actionLabel: string;
  }>({
    isOpen: false,
    actionType: null,
    actionLabel: '',
  });

  // Se non c'è nessuna partita creata, stato vuoto guidato
  if (!activeMatch) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-[#00008B] mb-4 border-2 border-[#00008B]">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-black uppercase tracking-wide mb-2">
          {t.scout.noActiveMatchTitle}
        </h2>
        <p className="text-black font-semibold text-sm max-w-sm mb-6">
          {players.length === 0
            ? t.scout.noActiveMatchDescRoster
            : t.scout.noActiveMatchDescMatch}
        </p>

        {players.length === 0 ? (
          <Button3D
            variant="primary"
            text={t.scout.goToRosterBtn}
            icon={<ArrowRight className="w-5 h-5" />}
            onClick={onNavigateToRoster}
            fullWidth={false}
            className="w-auto px-8"
          />
        ) : (
          <Button3D
            variant="primary"
            text={t.scout.createNewMatchBtn}
            icon={<Plus className="w-5 h-5" />}
            onClick={onOpenNewMatch}
            fullWidth={false}
            className="w-auto px-8"
          />
        )}
      </div>
    );
  }

  // Categoria della partita
  const categoryName =
    categories.find((c) => c.id === activeMatch.categoryId)?.name || t.common.category;

  // Lista atleti per la partita (rigorosamente della categoria della partita)
  const matchPlayers = players.filter((p) => p.categoryId === activeMatch.categoryId);
  const effectivePlayers = matchPlayers;

  // Ordina per ruolo e numero
  const goalkeepers = effectivePlayers.filter((p) => p.role === 'PORTIERE').sort((a, b) => a.number - b.number);
  const fieldPlayers = effectivePlayers.filter((p) => p.role === 'GIOCATORE').sort((a, b) => a.number - b.number);

  // Assicura che ci sia sempre un atleta selezionato se la rosa non è vuota
  const activePlayer =
    effectivePlayers.find((p) => p.id === selectedPlayerId) ||
    effectivePlayers[0] ||
    null;

  // Statistiche atleta selezionato (crea statistiche vuote in lettura se aggiunto dopo la creazione della partita, senza mutare lo stato durante il render)
  const activeStats = activePlayer
    ? (activeMatch.stats[activePlayer.id] ??
       createEmptyPlayerStats(activePlayer.id, activePlayer.role, activePlayer.name, activePlayer.number))
    : null;

  // Ufficiali di squadra (Dirigenti Panchina)
  const currentCategory = categories.find((c) => c.id === activeMatch.categoryId);
  const matchOfficials = getMatchOfficials(activeMatch, currentCategory);
  const ourDeltas = getScoreDeltas(activeMatch, 'OURS');
  const oppDeltas = getScoreDeltas(activeMatch, 'OPPONENT');

  // Handler per sanzioni (atleti e dirigenti panchina)
  const handleAssignSanction = (pId: string, sanctionType: SanctionType, officialLetter?: OfficialLetter) => {
    if (officialLetter) {
      const offActionType: ActionType =
        sanctionType === 'GIALLO'
          ? 'SANCTION_OFFICIAL_GIALLO'
          : sanctionType === 'DUE_MINUTI'
          ? 'SANCTION_OFFICIAL_DUE_MINUTI'
          : sanctionType === 'ROSSO'
          ? 'SANCTION_OFFICIAL_ROSSO'
          : 'SANCTION_OFFICIAL_BLU';
      onRecordAction(offActionType, undefined, 0, 0, officialLetter);
      return;
    }

    switch (sanctionType) {
      case 'GIALLO':
        onRecordAction('SANCTION_GIALLO', pId, 0, 0);
        break;
      case 'DUE_MINUTI':
        onRecordAction('SANCTION_DUE_MINUTI', pId, 0, 0);
        break;
      case 'ROSSO':
        onRecordAction('SANCTION_ROSSO', pId, 0, 0);
        break;
      case 'BLU':
        onRecordAction('SANCTION_BLU', pId, 0, 0);
        break;
    }
  };

  const handleOpenActionAssign = (type: ActionType, label: string) => {
    setAssignModal({
      isOpen: true,
      actionType: type,
      actionLabel: label,
    });
  };

  const handleAssignFromModal = (playerId?: string, officialLetter?: OfficialLetter) => {
    if (!assignModal.actionType || !activeMatch) return;

    let scoreHomeDelta = 0;
    let scoreGuestDelta = 0;

    if (assignModal.actionType === 'FP_GOL' || assignModal.actionType === 'FP_7M_GOL') {
      const deltas = getScoreDeltas(activeMatch, 'OURS');
      scoreHomeDelta = deltas.home;
      scoreGuestDelta = deltas.guest;
    } else if (assignModal.actionType === 'GK_GOL_SUBITO' || assignModal.actionType === 'GK_7M_SUBITO') {
      const deltas = getScoreDeltas(activeMatch, 'OPPONENT');
      scoreHomeDelta = deltas.home;
      scoreGuestDelta = deltas.guest;
    }

    let finalActionType = assignModal.actionType;
    if (officialLetter) {
      if (finalActionType === 'SANCTION_GIALLO') finalActionType = 'SANCTION_OFFICIAL_GIALLO';
      else if (finalActionType === 'SANCTION_DUE_MINUTI') finalActionType = 'SANCTION_OFFICIAL_DUE_MINUTI';
      else if (finalActionType === 'SANCTION_ROSSO') finalActionType = 'SANCTION_OFFICIAL_ROSSO';
      else if (finalActionType === 'SANCTION_BLU') finalActionType = 'SANCTION_OFFICIAL_BLU';
    }

    onRecordAction(
      finalActionType,
      playerId,
      scoreHomeDelta,
      scoreGuestDelta,
      officialLetter
    );
  };

  // Mappa sanzioni per tutti gli atleti per il dialog
  const playerSanctionsSummary: Record<string, { giallo: number; dueMinuti: number; rosso: number; blu: number }> = {};
  effectivePlayers.forEach((p) => {
    const st = activeMatch.stats[p.id];
    if (st) {
      playerSanctionsSummary[p.id] = { ...st.sanctions };
    }
  });

  return (
    <div className="pb-24 pt-2 px-3 max-w-2xl mx-auto space-y-3">
      {/* Tabellone Segnapunti & Dettagli Partita */}
      <div className="bg-[#F2F2F2] rounded-2xl p-3 border-2 border-neutral-300 shadow-md">
        <div className="flex items-center justify-between text-xs text-neutral-600 font-bold border-b border-neutral-300 pb-1 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="bg-[#00008B] text-white px-2 py-0.5 rounded text-[10px] font-black">{categoryName}</span>
            {activeMatch.isAwayMatch ? (
              <span className="bg-amber-500 text-neutral-950 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                ✈️ TRASFERTA
              </span>
            ) : (
              <span className="bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                🏠 IN CASA
              </span>
            )}
            <button
              type="button"
              onClick={onToggleMatchMode}
              className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 hover:bg-amber-300 text-neutral-950 border border-amber-500 shadow-sm transition-all flex items-center gap-1 cursor-pointer ml-1"
              title={t.scout.switchHomeGuestBtn || 'Inverti Casa / Ospiti'}
            >
              <ArrowLeftRight className="w-3 h-3 text-neutral-950" />
              <span>{t.scout.switchHomeGuestBtn || 'Inverti Casa / Ospiti'}</span>
            </button>
          </div>
          <span className="text-[11px] font-bold text-neutral-500">{activeMatch.date}</span>
        </div>

        {/* Squadre e Punteggio */}
        {(() => {
          const isAway = activeMatch.isAwayMatch ?? false;
          const oppSide = getOpponentSide(activeMatch);
          const oppScore = oppSide === 'HOME' ? activeMatch.scoreHome : activeMatch.scoreGuest;
          const unassignedOpp = getUnassignedOpponentGoals(activeMatch);

          return (
            <>
              <div className="grid grid-cols-5 items-center gap-2 text-center py-1">
                <div className="col-span-2 text-left">
                  <span className="text-[10px] uppercase font-black tracking-wider text-[#00008B] flex items-center gap-1">
                    <span>{t.common.home}</span>
                    {!isAway && <span className="bg-amber-400 text-neutral-950 px-1 rounded text-[9px] font-black">{t.pdfReport.ourTeamMarker || '(NOI)'}</span>}
                  </span>
                  <span className="text-base sm:text-lg font-black text-neutral-900 truncate block">
                    {activeMatch.homeTeam}
                  </span>
                </div>

                <div className="col-span-1 flex flex-col items-center justify-center bg-[#00008B] text-white py-1.5 px-3 rounded-xl shadow-inner border border-blue-900">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
                    {activeMatch.scoreHome} - {activeMatch.scoreGuest}
                  </span>
                  <span className="text-[9px] font-bold text-amber-300 uppercase tracking-widest mt-0.5">
                    {t.common.live}
                  </span>
                </div>

                <div className="col-span-2 text-right">
                  <span className="text-[10px] uppercase font-black tracking-wider text-neutral-600 flex items-center justify-end gap-1">
                    {isAway && <span className="bg-amber-400 text-neutral-950 px-1 rounded text-[9px] font-black">{t.pdfReport.ourTeamMarker || '(NOI)'}</span>}
                    <span>{t.common.guest}</span>
                  </span>
                  <span className="text-base sm:text-lg font-black text-neutral-900 truncate block">
                    {activeMatch.guestTeam}
                  </span>
                </div>
              </div>

              {/* Gol rapido per avversari */}
              <div className="mt-2.5 pt-2 border-t border-neutral-300 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700">{t.scout.opponentGoalLabel}:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const deltas = getScoreDeltas(activeMatch, 'OPPONENT');
                      onRecordAction('OPPONENT_GOAL_UNDO', undefined, -deltas.home, -deltas.guest);
                    }}
                    disabled={unassignedOpp <= 0}
                    className="h-8 px-2.5 rounded-lg bg-neutral-300 hover:bg-neutral-400 disabled:opacity-40 text-neutral-900 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" /> -1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const deltas = getScoreDeltas(activeMatch, 'OPPONENT');
                      onRecordAction('OPPONENT_GOAL', undefined, deltas.home, deltas.guest);
                    }}
                    className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> +1 {t.scout.opponentGoalBtn || 'Avversari'}
                  </button>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* ⚡ PRIMO PIANO: GESTIONE DATI PARTITA (AZIONI & EVENTI) */}
      <div className="bg-[#F2F2F2] rounded-2xl p-3 border-2 border-[#00008B] shadow-md space-y-2">
        <div>
          <h3 className="text-xs font-black uppercase text-[#00008B] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            {t.scout.actionGridTitle || '⚡ GESTIONE DATI PARTITA (AZIONI & EVENTI)'}
          </h3>
          <p className="text-[11px] text-neutral-600 font-semibold" style={{ fontSize: '10px' }}>
            {t.scout.actionGridSubtitle || 'Seleziona un\'azione per aprire l\'elenco ROSA e DIRIGENTI a cui assegnarla:'}
          </p>
        </div>

        {/* Griglia Funzioni Rilevazione Partita */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Gol Azione */}
          <Button3D
            variant="success"
            text="Gol su Azione"
            subtext="+1 per la tua squadra"
            minHeight={50}
            style={{ height: '57.7031px', width: '154px' }}
            textStyle={{ fontSize: '11px', width: '97.844px' }}
            subtextStyle={{ fontSize: '7px' }}
            onClick={() => handleOpenActionAssign('FP_GOL', 'Gol su Azione (+1)')}
          />

          {/* Gol 7 Metri */}
          <Button3D
            variant="success"
            text="Gol 7 Metri"
            subtext="Rigore trasformato (+1)"
            minHeight={50}
            onClick={() => handleOpenActionAssign('FP_7M_GOL', 'Gol 7 Metri (+1)')}
          />

          {/* Tiro Fuori */}
          <Button3D
            variant="secondary"
            text="Tiro Fuori / Parato"
            subtext="Conclusione fallita"
            minHeight={50}
            onClick={() => handleOpenActionAssign('FP_TIRO_FUORI', 'Tiro Fuori / Parato')}
          />

          {/* 7m Sbagliato */}
          <Button3D
            variant="secondary"
            text="7m Sbagliato"
            subtext="Rigore fallito/parato"
            minHeight={50}
            onClick={() => handleOpenActionAssign('FP_7M_PERSO', '7m Sbagliato')}
          />

          {/* Assist */}
          <Button3D
            variant="primary"
            text="Assist Vincente"
            subtext="Passaggio gol"
            minHeight={50}
            onClick={() => handleOpenActionAssign('FP_ASSIST', 'Assist Vincente')}
          />

          {/* Passaggio Perso */}
          <Button3D
            variant="destructive"
            text="Passaggio Perso"
            subtext="Errore di passaggio"
            minHeight={50}
            onClick={() => handleOpenActionAssign('FP_PASSAGGIO_PERSO', 'Passaggio Perso')}
          />

          {/* Ricezione Persa */}
          <Button3D
            variant="destructive"
            text="Ricezione Persa"
            subtext="Palla persa in presa"
            minHeight={50}
            onClick={() => handleOpenActionAssign('FP_RICEZIONE_PERSA', 'Ricezione Persa')}
          />

          {/* Parata Portiere */}
          <Button3D
            variant="success"
            text="Parata Portiere"
            subtext="Tiro az. respinto"
            minHeight={50}
            onClick={() => handleOpenActionAssign('GK_PARATA', 'Parata Portiere')}
          />

          {/* Gol Subito Portiere */}
          <Button3D
            variant="destructive"
            text="Gol Subito (Portiere)"
            subtext="Rete subita (+1 avv.)"
            minHeight={50}
            onClick={() => handleOpenActionAssign('GK_GOL_SUBITO', 'Gol Subito Portiere (+1 Avv.)')}
          />

          {/* Parata 7m Portiere */}
          <Button3D
            variant="success"
            text="Parata 7m Portiere"
            subtext="Rigore respinto"
            minHeight={50}
            onClick={() => handleOpenActionAssign('GK_7M_PARATO', 'Parata 7m Portiere')}
          />

          {/* Cartellino Giallo */}
          <Button3D
            variant="cardYellow"
            text="Cartellino Giallo"
            subtext="Ammonizione (IHF)"
            minHeight={50}
            onClick={() => handleOpenActionAssign('SANCTION_GIALLO', 'Cartellino Giallo (Ammonizione)')}
          />

          {/* 2 Minuti */}
          <Button3D
            variant="secondary"
            text="2 Minuti Sospensione"
            subtext="Inferiorità temporanea"
            minHeight={50}
            onClick={() => handleOpenActionAssign('SANCTION_DUE_MINUTI', 'Sospensione 2 Minuti')}
          />

          {/* Cartellino Rosso */}
          <Button3D
            variant="destructive"
            text="Cartellino Rosso"
            subtext="Squalifica (IHF)"
            minHeight={50}
            onClick={() => handleOpenActionAssign('SANCTION_ROSSO', 'Cartellino Rosso (Squalifica)')}
          />

          {/* Cartellino Blu */}
          <Button3D
            variant="primary"
            text="Cartellino Blu"
            subtext="Rapporto scritto"
            minHeight={50}
            onClick={() => handleOpenActionAssign('SANCTION_BLU', 'Cartellino Blu (Rapporto)')}
          />
        </div>
      </div>

      {/* Selettore Atleti Orizzontale a Scorrimento */}
      <div className="bg-[#F2F2F2] rounded-2xl p-2.5 border-2 border-neutral-300 shadow-sm">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-xs font-black uppercase text-neutral-800">
            {t.scout.selectAthleteTitle}:
          </span>
          {activePlayer && (
            <span className="text-xs font-bold text-[#00008B] bg-blue-100 px-2 py-0.5 rounded-full">
              #{activePlayer.number} {activePlayer.name}
            </span>
          )}
        </div>

        {effectivePlayers.length === 0 ? (
          <div className="p-3 text-center text-xs text-neutral-600 font-bold">
            {t.scout.noPlayersCategory}{' '}
            <button
              type="button"
              onClick={onNavigateToRoster}
              className="text-[#00008B] underline font-black ml-1 cursor-pointer"
            >
              {t.scout.addPlayersLink}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Riga Portieri */}
            {goalkeepers.length > 0 && (
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block mb-1">
                  {t.scout.goalkeepersSection}
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {goalkeepers.map((gk) => {
                    const isSelected = activePlayer?.id === gk.id;
                    const st = activeMatch.stats[gk.id];
                    const totActions = st ? calculatePlayerTotalActions(st) : 0;

                    return (
                      <button
                        key={gk.id}
                        type="button"
                        onClick={() => setSelectedPlayerId(gk.id)}
                        className={`
                          flex-shrink-0 min-w-[70px] px-2 py-1.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[48px]
                          ${
                            isSelected
                              ? 'bg-[#00008B] text-white border-amber-400 ring-2 ring-amber-300 shadow-md scale-105'
                              : 'bg-white text-neutral-900 border-neutral-300 hover:border-blue-400'
                          }
                        `}
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-black text-sm">#{gk.number}</span>
                          <span className="text-[10px] opacity-80 font-bold">{t.common.goalkeeperShort}</span>
                        </div>
                        <span className="text-[11px] font-bold truncate max-w-[65px] leading-tight">
                          {gk.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold mt-0.5 px-1 rounded-full ${
                            isSelected ? 'bg-amber-400 text-neutral-950 font-black' : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          {t.common.actions}: {totActions}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Riga Giocatori di Movimento */}
            {fieldPlayers.length > 0 && (
              <div>
                <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider block mb-1">
                  {t.scout.fieldPlayersSection}
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {fieldPlayers.map((fp) => {
                    const isSelected = activePlayer?.id === fp.id;
                    const st = activeMatch.stats[fp.id];
                    const totActions = st ? calculatePlayerTotalActions(st) : 0;

                    return (
                      <button
                        key={fp.id}
                        type="button"
                        onClick={() => setSelectedPlayerId(fp.id)}
                        className={`
                          flex-shrink-0 min-w-[70px] px-2 py-1.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[48px]
                          ${
                            isSelected
                              ? 'bg-[#00008B] text-white border-amber-400 ring-2 ring-amber-300 shadow-md scale-105'
                              : 'bg-white text-neutral-900 border-neutral-300 hover:border-blue-400'
                          }
                        `}
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-black text-sm">#{fp.number}</span>
                          <span className="text-[10px] opacity-80 font-bold">{t.common.fieldPlayerShort}</span>
                        </div>
                        <span className="text-[11px] font-bold truncate max-w-[65px] leading-tight">
                          {fp.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold mt-0.5 px-1 rounded-full ${
                            isSelected ? 'bg-amber-400 text-neutral-950 font-black' : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          {t.common.actions}: {totActions}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scheda Riepilogo Atleta Attivo & Pulsante Cartellini */}
      {activePlayer && activeStats && (
        <div className="bg-[#F2F2F2] rounded-2xl p-3 border-2 border-neutral-300 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#00008B] text-white flex items-center justify-center font-black text-xl flex-shrink-0 shadow">
              #{activePlayer.number}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-neutral-900 text-base truncate">
                  {activePlayer.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-black bg-blue-200 text-blue-900 flex-shrink-0">
                  {activePlayer.role === 'PORTIERE' ? t.common.goalkeeper : t.common.fieldPlayer}
                </span>
              </div>

              {/* Statistiche riepilogative live in tempo reale */}
              <div className="text-xs text-neutral-700 font-semibold flex items-center gap-3 mt-0.5 flex-wrap">
                {activePlayer.role === 'PORTIERE' ? (
                  <>
                    <span>
                      {t.scout.saves}:{' '}
                      <strong className="text-emerald-700">
                        {calculateGoalkeeperStats(activeStats.goalkeeper).parateTotali}
                      </strong>
                    </span>
                    <span>
                      %:{' '}
                      <strong>
                        {calculateGoalkeeperStats(activeStats.goalkeeper).percentualeParateTotale}%
                      </strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {t.scout.goals}:{' '}
                      <strong className="text-emerald-700">
                        {calculateFieldPlayerStats(activeStats.field).golTotali}
                      </strong>
                    </span>
                    <span>
                      %:{' '}
                      <strong>
                        {calculateFieldPlayerStats(activeStats.field).percentualeRealizzazione}%
                      </strong>
                    </span>
                    <span>
                      {t.scout.assist}:{' '}
                      <strong>{calculateFieldPlayerStats(activeStats.field).assist}</strong>
                    </span>
                  </>
                )}
                <span>
                  {t.scout.totalActions}:{' '}
                  <strong className="text-[#00008B]">
                    {calculatePlayerTotalActions(activeStats)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Pulsante Finestra Cartellini */}
          <div className="flex-shrink-0 w-32">
            <Button3D
              variant="cardYellow"
              text={t.sanctions.yellowCardText.split(' ')[0]}
              subtext={t.scout.sanctionsBtnSub}
              icon={<ShieldAlert className="w-4 h-4 text-black" />}
              minHeight={52}
              onClick={() => setIsSanctionsDialogOpen(true)}
            />
          </div>
        </div>
      )}

      {/* PANNELLO PULSANTI AZIONE (PORTIERI vs GIOCATORI) */}
      {activePlayer && activeStats ? (
        <div className="bg-[#F2F2F2] rounded-2xl p-3 border-2 border-neutral-300 shadow-md">
          <div className="text-xs font-black uppercase text-neutral-800 mb-2 flex items-center justify-between">
            <span>{t.scout.recordActionsFor} #{activePlayer.number} {activePlayer.name}:</span>
            <span className="text-[11px] font-bold text-neutral-500">{t.scout.oneTouchRecord}</span>
          </div>

          {activePlayer.role === 'PORTIERE' ? (
            /* Pulsanti specifici Portieri */
            <div className="grid grid-cols-2 gap-3">
              <Button3D
                variant="success"
                text={t.scout.saveAction}
                subtext={t.scout.saveActionSub}
                minHeight={56}
                badge={activeStats.goalkeeper.parate}
                onClick={() => onRecordAction('GK_PARATA', activePlayer.id, 0, 0)}
              />

              <Button3D
                variant="destructive"
                text={t.scout.concededAction}
                subtext={t.scout.concededActionSub}
                minHeight={56}
                badge={activeStats.goalkeeper.golSubiti}
                onClick={() => onRecordAction('GK_GOL_SUBITO', activePlayer.id, oppDeltas.home, oppDeltas.guest)}
              />

              <Button3D
                variant="success"
                text={t.scout.save7mAction}
                subtext={t.scout.save7mActionSub}
                minHeight={56}
                badge={activeStats.goalkeeper.rigoriParati}
                onClick={() => onRecordAction('GK_7M_PARATO', activePlayer.id, 0, 0)}
              />

              <Button3D
                variant="destructive"
                text={t.scout.conceded7mAction}
                subtext={t.scout.conceded7mActionSub}
                minHeight={56}
                badge={activeStats.goalkeeper.rigoriSubiti}
                onClick={() => onRecordAction('GK_7M_SUBITO', activePlayer.id, oppDeltas.home, oppDeltas.guest)}
              />
            </div>
          ) : (
            /* Pulsanti specifici Giocatori di Movimento */
            <div className="space-y-3">
              {/* Tiri e Gol */}
              <div className="grid grid-cols-2 gap-3">
                <Button3D
                  variant="success"
                  text={t.scout.goalAction}
                  subtext={t.scout.goalActionSub}
                  minHeight={56}
                  badge={activeStats.field.gol}
                  onClick={() => onRecordAction('FP_GOL', activePlayer.id, ourDeltas.home, ourDeltas.guest)}
                />

                <Button3D
                  variant="secondary"
                  text={t.scout.missedAction}
                  subtext={t.scout.missedActionSub}
                  minHeight={56}
                  badge={activeStats.field.tiriFuori}
                  onClick={() => onRecordAction('FP_TIRO_FUORI', activePlayer.id, 0, 0)}
                />
              </div>

              {/* Rigori 7 metri */}
              <div className="grid grid-cols-2 gap-3">
                <Button3D
                  variant="success"
                  text={t.scout.goal7mAction}
                  subtext={t.scout.goal7mActionSub}
                  minHeight={54}
                  badge={activeStats.field.rigoriGol}
                  onClick={() => onRecordAction('FP_7M_GOL', activePlayer.id, ourDeltas.home, ourDeltas.guest)}
                />

                <Button3D
                  variant="secondary"
                  text={t.scout.missed7mAction}
                  subtext={t.scout.missed7mActionSub}
                  minHeight={54}
                  badge={activeStats.field.rigoriPersi}
                  onClick={() => onRecordAction('FP_7M_PERSO', activePlayer.id, 0, 0)}
                />
              </div>

              {/* Assist e Palle Perse */}
              <div className="grid grid-cols-3 gap-2">
                <Button3D
                  variant="primary"
                  text={t.scout.assistAction}
                  subtext={t.scout.assistActionSub}
                  minHeight={52}
                  badge={activeStats.field.assist}
                  onClick={() => onRecordAction('FP_ASSIST', activePlayer.id, 0, 0)}
                />

                <Button3D
                  variant="destructive"
                  text={t.scout.lostPassAction}
                  subtext={t.scout.lostPassActionSub}
                  minHeight={52}
                  badge={activeStats.field.passaggiPersi}
                  onClick={() => onRecordAction('FP_PASSAGGIO_PERSO', activePlayer.id, 0, 0)}
                />

                <Button3D
                  variant="destructive"
                  text={t.scout.lostCatchAction}
                  subtext={t.scout.lostCatchActionSub}
                  minHeight={52}
                  badge={activeStats.field.passaggiPersiRicezione}
                  onClick={() => onRecordAction('FP_RICEZIONE_PERSA', activePlayer.id, 0, 0)}
                />
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Pulsante Annulla (Undo) e Ultima Azione Registrata */}
      <div className="bg-[#F2F2F2] rounded-2xl p-3 border-2 border-neutral-300 shadow-sm flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-black uppercase text-neutral-500 block">
            {t.scout.lastActionRecorded}:
          </span>
          {activeMatch.actionLog && activeMatch.actionLog.length > 0 ? (
            <p className="text-xs font-bold text-neutral-900 truncate">
              {activeMatch.actionLog[activeMatch.actionLog.length - 1].label}
            </p>
          ) : (
            <p className="text-xs italic text-neutral-500">{t.scout.noActionRecordedYet}</p>
          )}
        </div>

        <div className="w-36 flex-shrink-0">
          <Button3D
            variant="destructive"
            text={t.scout.undoBtnText}
            subtext={t.scout.undoBtnSub}
            icon={<RotateCcw className="w-4 h-4" />}
            minHeight={48}
            onClick={onUndoLastAction}
            disabled={!activeMatch.actionLog || activeMatch.actionLog.length === 0}
          />
        </div>
      </div>

      {/* Registro Eventi Recenti */}
      {activeMatch.actionLog && activeMatch.actionLog.length > 0 && (
        <div className="bg-[#F2F2F2] rounded-2xl p-3 border-2 border-neutral-300 shadow-sm">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-neutral-300">
            <span className="text-xs font-black uppercase text-neutral-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#00008B]" />
              {t.scout.recentActionsLogTitle} ({activeMatch.actionLog.length})
            </span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {activeMatch.actionLog
              .slice(-6)
              .reverse()
              .map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-neutral-200"
                >
                  <span className="font-bold text-neutral-800 truncate mr-2">
                    {log.label}
                  </span>
                  <span className="text-[10px] text-neutral-500 flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString(locale === 'it' ? 'it-IT' : 'en-US', {
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Finestra Dialog per Assegnazione Cartellini */}
      <SanctionsDialog
        isOpen={isSanctionsDialogOpen}
        onClose={() => setIsSanctionsDialogOpen(false)}
        players={effectivePlayers}
        selectedPlayerId={activePlayer?.id || null}
        onAssignSanction={handleAssignSanction}
        playerSanctionsSummary={playerSanctionsSummary}
        officials={matchOfficials}
        clubInfo={clubInfo}
      />

      {/* Modale Rilevazione Azione -> Selezione Rosa / Dirigenti */}
      <ActionAssignModal
        isOpen={assignModal.isOpen}
        onClose={() => setAssignModal((prev) => ({ ...prev, isOpen: false }))}
        actionType={assignModal.actionType}
        actionLabel={assignModal.actionLabel}
        players={effectivePlayers}
        officials={matchOfficials}
        clubInfo={clubInfo}
        onAssign={handleAssignFromModal}
      />
    </div>
  );
};
