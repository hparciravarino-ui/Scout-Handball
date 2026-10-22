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
} from '../types/scout';
import { Button3D } from './Button3D';
import { SanctionsDialog } from './SanctionsDialog';
import {
  calculateGoalkeeperStats,
  calculateFieldPlayerStats,
  calculatePlayerTotalActions,
} from '../utils/stats';
import {
  ShieldAlert,
  RotateCcw,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface ScoutLiveScreenProps {
  activeMatch: HandballMatch | null;
  players: Player[];
  categories: { id: string; name: string }[];
  onRecordAction: (
    actionType: ActionType,
    playerId?: string,
    scoreHomeDelta?: number,
    scoreGuestDelta?: number
  ) => void;
  onUndoLastAction: () => void;
  onOpenNewMatch: () => void;
  onNavigateToRoster: () => void;
}

export const ScoutLiveScreen: React.FC<ScoutLiveScreenProps> = ({
  activeMatch,
  players,
  categories,
  onRecordAction,
  onUndoLastAction,
  onOpenNewMatch,
  onNavigateToRoster,
}) => {
  const { t, locale } = useI18n();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isSanctionsDialogOpen, setIsSanctionsDialogOpen] = useState(false);

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

  // Lista atleti per la partita
  const matchPlayers = players.filter((p) => p.categoryId === activeMatch.categoryId);
  const effectivePlayers = matchPlayers.length > 0 ? matchPlayers : players;

  // Ordina per ruolo e numero
  const goalkeepers = effectivePlayers.filter((p) => p.role === 'PORTIERE').sort((a, b) => a.number - b.number);
  const fieldPlayers = effectivePlayers.filter((p) => p.role === 'GIOCATORE').sort((a, b) => a.number - b.number);

  // Assicura che ci sia sempre un atleta selezionato
  const activePlayer =
    effectivePlayers.find((p) => p.id === selectedPlayerId) ||
    effectivePlayers[0] ||
    null;

  // Statistiche atleta selezionato
  const activeStats = activePlayer ? activeMatch.stats[activePlayer.id] : null;

  // Handler per sanzioni
  const handleAssignSanction = (pId: string, sanctionType: SanctionType) => {
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
          <span>{categoryName}</span>
          <span>{activeMatch.date}</span>
        </div>

        {/* Squadre e Punteggio */}
        <div className="grid grid-cols-5 items-center gap-2 text-center py-1">
          <div className="col-span-2 text-left">
            <span className="text-[10px] uppercase font-black tracking-wider text-[#00008B] block">
              {t.common.home}
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
            <span className="text-[10px] uppercase font-black tracking-wider text-neutral-600 block">
              {t.common.guest}
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
              onClick={() => onRecordAction('OPPONENT_GOAL_UNDO', undefined, 0, -1)}
              disabled={activeMatch.scoreGuest <= 0}
              className="h-8 px-2.5 rounded-lg bg-neutral-300 hover:bg-neutral-400 disabled:opacity-40 text-neutral-900 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Minus className="w-3.5 h-3.5" /> -1
            </button>
            <button
              type="button"
              onClick={() => onRecordAction('OPPONENT_GOAL', undefined, 0, 1)}
              className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> +1 {t.common.guest}
            </button>
          </div>
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
                onClick={() => onRecordAction('GK_GOL_SUBITO', activePlayer.id, 0, 1)}
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
                onClick={() => onRecordAction('GK_7M_SUBITO', activePlayer.id, 0, 1)}
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
                  onClick={() => onRecordAction('FP_GOL', activePlayer.id, 1, 0)}
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
                  onClick={() => onRecordAction('FP_7M_GOL', activePlayer.id, 1, 0)}
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
      />
    </div>
  );
};
