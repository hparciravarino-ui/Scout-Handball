/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Player,
  HandballMatch,
  PlayerRole,
  ClubInfo,
} from '../types/scout';
import {
  filterPlayersAdvanced,
  hasRecordedPlayerActions,
  calculatePlayerTotalActions,
} from '../utils/stats';
import { Button3D } from './Button3D';
import {
  X,
  Search,
  CheckSquare,
  Square,
  Users,
  Lock,
  RotateCcw,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface ConvocatiChecklistPanelProps {
  categoryPlayers: Player[];
  selectedIds: string[];
  onChangeSelectedIds: (nextIds: string[]) => void;
  match?: HandballMatch | null;
  maxHeightClass?: string;
}

export const ConvocatiChecklistPanel: React.FC<ConvocatiChecklistPanelProps> = ({
  categoryPlayers,
  selectedIds,
  onChangeSelectedIds,
  match,
  maxHeightClass = 'max-h-60',
}) => {
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | PlayerRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SELECTED' | 'UNSELECTED'>('ALL');
  const [sortBy, setSortBy] = useState<'NUMBER' | 'NAME'>('NUMBER');

  // Set di giocatori bloccati perché hanno già azioni registrate nella partita
  const lockedIds = useMemo(() => {
    const locked = new Set<string>();
    if (!match?.stats) return locked;
    for (const p of categoryPlayers) {
      if (hasRecordedPlayerActions(match.stats[p.id])) {
        locked.add(p.id);
      }
    }
    return locked;
  }, [categoryPlayers, match]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const visiblePlayers = useMemo(() => {
    return filterPlayersAdvanced(categoryPlayers, {
      search: searchQuery,
      role: roleFilter,
      selectionStatus: statusFilter,
      selectedIds: selectedSet,
      sortBy,
    });
  }, [categoryPlayers, searchQuery, roleFilter, statusFilter, selectedSet, sortBy]);

  const selectedGkCount = useMemo(
    () => categoryPlayers.filter((p) => p.role === 'PORTIERE' && selectedSet.has(p.id)).length,
    [categoryPlayers, selectedSet]
  );

  const selectedFpCount = useMemo(
    () => categoryPlayers.filter((p) => p.role === 'GIOCATORE' && selectedSet.has(p.id)).length,
    [categoryPlayers, selectedSet]
  );

  const hasActiveFilter =
    searchQuery.trim().length > 0 ||
    roleFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    sortBy !== 'NUMBER';

  const handleTogglePlayer = (playerId: string) => {
    if (selectedSet.has(playerId)) {
      if (lockedIds.has(playerId)) return; // Impedisce rimozione se ha già azioni
      onChangeSelectedIds(selectedIds.filter((id) => id !== playerId));
    } else {
      onChangeSelectedIds([...selectedIds, playerId]);
    }
  };

  const handleSelectAllVisible = () => {
    const next = new Set(selectedIds);
    visiblePlayers.forEach((p) => next.add(p.id));
    onChangeSelectedIds(Array.from(next));
  };

  const handleDeselectAllVisible = () => {
    const visibleIds = new Set(visiblePlayers.map((p) => p.id));
    const next = selectedIds.filter((id) => {
      if (lockedIds.has(id)) return true; // Mantiene bloccati
      return !visibleIds.has(id);
    });
    onChangeSelectedIds(next);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('NUMBER');
  };

  return (
    <div className="bg-white rounded-xl border-2 border-neutral-300 p-3 space-y-2.5 shadow-sm">
      {/* Intestazione + Contatori Convocati */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-200">
        <div>
          <span className="text-xs font-black uppercase text-[#00008B] flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{t.convocati.sectionTitle}</span>
          </span>
          <span className="text-[11px] text-neutral-600 font-medium block">
            {t.convocati.sectionSubtitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="bg-[#00008B] text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-sm">
            {selectedIds.length} / {categoryPlayers.length}
          </span>
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-md">
            {t.convocati.goalkeepersShortLabel}: {selectedGkCount}
          </span>
          <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-black px-2 py-0.5 rounded-md">
            {t.convocati.fieldPlayersShortLabel}: {selectedFpCount}
          </span>
        </div>
      </div>

      {/* Ricerca e Filtri Avanzati */}
      {categoryPlayers.length > 0 && (
        <div className="space-y-2 bg-neutral-50 p-2 rounded-xl border border-neutral-200">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.filters.searchPlayerPlaceholder}
              className="w-full h-9 pl-8 pr-8 bg-white border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 focus:border-[#00008B] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t.common.close}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Filtro Ruolo */}
            <select
              aria-label={t.filters.roleFilterLabel}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'ALL' | PlayerRole)}
              className="h-8 px-2 bg-white border border-neutral-300 rounded-lg text-[11px] font-bold text-neutral-800 focus:border-[#00008B] focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t.filters.allRoles}</option>
              <option value="PORTIERE">{t.roster.goalkeepersTitle}</option>
              <option value="GIOCATORE">{t.roster.fieldPlayersTitle}</option>
            </select>

            {/* Filtro Stato Selezione */}
            <select
              aria-label={t.convocati.selectedCounter}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'SELECTED' | 'UNSELECTED')}
              className="h-8 px-2 bg-white border border-neutral-300 rounded-lg text-[11px] font-bold text-neutral-800 focus:border-[#00008B] focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t.convocati.statusAll}</option>
              <option value="SELECTED">{t.convocati.statusSelected}</option>
              <option value="UNSELECTED">{t.convocati.statusUnselected}</option>
            </select>

            {/* Ordinamento */}
            <select
              aria-label={t.filters.sortByLabel}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'NUMBER' | 'NAME')}
              className="h-8 px-2 bg-white border border-neutral-300 rounded-lg text-[11px] font-bold text-neutral-800 focus:border-[#00008B] focus:outline-none cursor-pointer"
            >
              <option value="NUMBER">{t.filters.sortNumberAsc}</option>
              <option value="NAME">{t.filters.sortNameAsc}</option>
            </select>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-8 px-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-[11px] font-black flex items-center gap-1 cursor-pointer ml-auto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t.filters.resetFiltersBtn}</span>
              </button>
            )}
          </div>

          {/* Azioni Rapide Bulk */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-200">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{t.convocati.selectAllBtn}</span>
              </button>
              <button
                type="button"
                onClick={handleDeselectAllVisible}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                <span>{t.convocati.deselectAllBtn}</span>
              </button>
            </div>

            <span className="text-[10px] font-bold text-neutral-500">
              {t.filters.showingCountPrefix} {visiblePlayers.length} {t.filters.showingOfLabel} {categoryPlayers.length}
            </span>
          </div>
        </div>
      )}

      {/* Elenco Checkboxes Atleti */}
      {categoryPlayers.length === 0 ? (
        <div className="p-4 text-center text-xs text-neutral-600 font-bold bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
          {t.scout.noPlayersCategory}
        </div>
      ) : visiblePlayers.length === 0 ? (
        <div className="p-4 text-center text-xs text-neutral-600 font-bold bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
          {t.convocati.noPlayersMatchFilter}
        </div>
      ) : (
        <div className={`${maxHeightClass} overflow-y-auto space-y-1.5 pr-1`}>
          {visiblePlayers.map((player) => {
            const isChecked = selectedSet.has(player.id);
            const isLocked = lockedIds.has(player.id);
            const isGk = player.role === 'PORTIERE';
            const actionsCount = match?.stats?.[player.id]
              ? calculatePlayerTotalActions(match.stats[player.id])
              : 0;

            return (
              <label
                key={player.id}
                title={isLocked ? t.convocati.lockedTooltip : undefined}
                className={`flex items-center justify-between gap-2 p-2 rounded-xl border-2 transition-all select-none ${
                  isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                } ${
                  isChecked
                    ? isGk
                      ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                      : 'bg-blue-50 border-[#00008B] shadow-sm'
                    : 'bg-neutral-50 border-neutral-200 opacity-75 hover:opacity-100 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isLocked}
                    onChange={() => handleTogglePlayer(player.id)}
                    className="w-5 h-5 accent-[#00008B] rounded cursor-pointer flex-shrink-0"
                  />

                  <span
                    className={`w-8 h-8 rounded-lg text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm ${
                      isGk ? 'bg-emerald-700' : 'bg-[#00008B]'
                    }`}
                  >
                    #{player.number}
                  </span>

                  <div className="min-w-0">
                    <span className="font-bold text-neutral-900 text-xs sm:text-sm block truncate">
                      {player.name}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase ${
                        isGk ? 'text-emerald-700' : 'text-blue-900'
                      }`}
                    >
                      {isGk ? t.common.goalkeeper : t.common.fieldPlayer}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-400 text-amber-900 text-[10px] font-black">
                      <Lock className="w-3 h-3" />
                      <span>
                        {t.convocati.lockedHasActionsBadge} ({actionsCount})
                      </span>
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ConvocatiModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: HandballMatch | null;
  players: Player[];
  categoryName: string;
  clubInfo?: ClubInfo;
  onSave: (matchId: string, convocatedPlayerIds: string[]) => void;
}

export const ConvocatiModal: React.FC<ConvocatiModalProps> = ({
  isOpen,
  onClose,
  match,
  players,
  categoryName,
  clubInfo,
  onSave,
}) => {
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categoryPlayers = useMemo(() => {
    if (!match) return [];
    return players
      .filter((p) => p.categoryId === match.categoryId)
      .sort((a, b) => a.number - b.number);
  }, [players, match]);

  useEffect(() => {
    if (isOpen && match) {
      if (match.convocatedPlayerIds !== undefined) {
        const validSet = new Set(match.convocatedPlayerIds);
        // Assicura che eventuali giocatori con azioni già registrate risultino selezionati
        categoryPlayers.forEach((p) => {
          if (hasRecordedPlayerActions(match.stats?.[p.id])) {
            validSet.add(p.id);
          }
        });
        setSelectedIds(Array.from(validSet));
      } else {
        // Legacy match senza lista: preseleziona tutta la categoria
        setSelectedIds(categoryPlayers.map((p) => p.id));
      }
      setErrorMsg(null);
    }
  }, [isOpen, match, categoryPlayers]);

  if (!isOpen || !match) return null;

  const handleConfirm = () => {
    if (categoryPlayers.length > 0 && selectedIds.length === 0) {
      setErrorMsg(t.convocati.errorMinOnePlayer);
      return;
    }
    onSave(match.id, selectedIds);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="convocati-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#00008B] text-white px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider block">
              {categoryName} • {match.homeTeam} vs {match.guestTeam}
            </span>
            <h3 id="convocati-modal-title" className="text-base font-black uppercase tracking-wide">
              {t.convocati.modalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-bar Club */}
        <div className="bg-[#000066] text-white px-4 py-1.5 flex items-center justify-between border-t border-blue-900 text-xs">
          <div className="flex items-center gap-2 truncate">
            {clubInfo?.logoUrl ? (
              <img src={clubInfo.logoUrl} alt="Logo" className="w-4 h-4 rounded-full object-cover bg-white" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
            )}
            <span className="font-bold text-[11px] truncate">
              {clubInfo?.name || t.common.appName}
            </span>
          </div>
          <span className="bg-amber-400 text-neutral-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase flex-shrink-0">
            {match.date}
          </span>
        </div>

        {/* Fascia Tricolore */}
        <div className="h-1.5 w-full flex">
          <div className="w-1/3 h-full bg-[#008C45]" />
          <div className="w-1/3 h-full bg-[#F4F5F0]" />
          <div className="w-1/3 h-full bg-[#CD212A]" />
        </div>

        {/* Contenuto Scorrevole */}
        <div className="p-4 overflow-y-auto space-y-3">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <ConvocatiChecklistPanel
            categoryPlayers={categoryPlayers}
            selectedIds={selectedIds}
            onChangeSelectedIds={(next) => {
              setSelectedIds(next);
              if (next.length > 0 && errorMsg) setErrorMsg(null);
            }}
            match={match}
            maxHeightClass="max-h-[45vh]"
          />
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-200 border-t border-neutral-300 flex justify-end gap-2">
          <Button3D
            variant="secondary"
            text={t.common.cancel}
            onClick={onClose}
            fullWidth={false}
            minHeight={42}
            className="w-auto px-5"
          />
          <Button3D
            variant="primary"
            text={t.convocati.saveBtn}
            onClick={handleConfirm}
            fullWidth={false}
            minHeight={42}
            className="w-auto px-6"
          />
        </div>
      </div>
    </div>
  );
};
