/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Player,
  ActionType,
  OfficialLetter,
  OfficialSanctionStats,
  ClubInfo,
} from '../types/scout';
import { isTargetAllowed } from '../utils/actionRules';
import { X, User, Shield, CheckCircle, Building2 } from 'lucide-react';
import { useI18n } from '../i18n';

interface ActionAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: ActionType | null;
  actionLabel: string;
  players: Player[];
  officials: Record<OfficialLetter, OfficialSanctionStats>;
  clubInfo?: ClubInfo;
  onAssign: (playerId?: string, officialLetter?: OfficialLetter) => void;
}

export const ActionAssignModal: React.FC<ActionAssignModalProps> = ({
  isOpen,
  onClose,
  actionType,
  actionLabel,
  players,
  officials,
  clubInfo,
  onAssign,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'atleti' | 'dirigenti'>('atleti');

  // Resetta sempre la scheda su 'atleti' a ogni apertura o cambio azione
  useEffect(() => {
    if (isOpen) {
      setActiveTab('atleti');
    }
  }, [isOpen, actionType]);

  if (!isOpen || !actionType) return null;

  const allowsGoalkeepers = isTargetAllowed(actionType, 'PORTIERE');
  const allowsFieldPlayers = isTargetAllowed(actionType, 'GIOCATORE');
  const allowsOfficials = isTargetAllowed(actionType, 'A');

  const eligibleGoalkeepers = allowsGoalkeepers
    ? players.filter((p) => p.role === 'PORTIERE').sort((a, b) => a.number - b.number)
    : [];
  const eligibleFieldPlayers = allowsFieldPlayers
    ? players.filter((p) => p.role === 'GIOCATORE').sort((a, b) => a.number - b.number)
    : [];
  const totalEligiblePlayers = eligibleGoalkeepers.length + eligibleFieldPlayers.length;

  const handleSelectPlayer = (pId: string) => {
    onAssign(pId, undefined);
    onClose();
  };

  const handleSelectOfficial = (letter: OfficialLetter) => {
    onAssign(undefined, letter);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-assign-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modale */}
        <div className="bg-[#00008B] text-white px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider block">
              {t.scout.recordActionsFor || 'Assegnazione Dato Partita'}
            </span>
            <h3 id="action-assign-modal-title" className="text-base sm:text-lg font-black tracking-wide">
              {actionLabel}
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

        {/* Fascia Associazione Società Registrata */}
        <div className="bg-[#000066] text-white px-4 py-1.5 flex items-center justify-between border-t border-blue-900 text-xs">
          <div className="flex items-center gap-2 truncate">
            {clubInfo?.logoUrl ? (
              <img src={clubInfo.logoUrl} alt="Logo" className="w-4 h-4 rounded-full object-cover bg-white" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
            )}
            <span className="font-bold text-[11px] truncate">
              {clubInfo?.name || 'Società Registrata'}
            </span>
          </div>
          <span className="bg-amber-400 text-neutral-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase flex-shrink-0">
            ROSA & DIRIGENTI
          </span>
        </div>

        {/* Selettore Schede Atleti / Dirigenti (Dirigenti visibile solo se l'azione li ammette) */}
        {allowsOfficials && (
          <div className="bg-neutral-200 px-4 py-2 border-b border-neutral-300 flex items-center justify-between gap-2">
            <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-neutral-300 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('atleti')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'atleti'
                    ? 'bg-[#00008B] text-white shadow-sm'
                    : 'text-neutral-700 hover:text-neutral-950'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{t.roster.categoryRosterTitle || 'Atleti in Rosa'} ({totalEligiblePlayers})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dirigenti')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'dirigenti'
                    ? 'bg-[#00008B] text-white shadow-sm'
                    : 'text-neutral-700 hover:text-neutral-950'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{t.roster.officialsCardTitle || 'Dirigenti'} (4)</span>
              </button>
            </div>
          </div>
        )}

        {/* Contenuto Selezionabile */}
        <div className="p-4 overflow-y-auto space-y-4 max-h-[60vh]">
          {activeTab === 'atleti' && (
            <div className="space-y-4">
              {/* Portieri (se ammessi) */}
              {allowsGoalkeepers && eligibleGoalkeepers.length > 0 && (
                <div>
                  <span className="text-xs font-black uppercase text-emerald-800 block mb-2">
                    {t.roster.goalkeepersTitle} ({eligibleGoalkeepers.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {eligibleGoalkeepers.map((gk) => (
                      <button
                        key={gk.id}
                        type="button"
                        onClick={() => handleSelectPlayer(gk.id)}
                        className="p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between text-left bg-emerald-50 border-emerald-400 hover:bg-emerald-100 ring-1 ring-emerald-300"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-black text-sm shadow">
                            #{gk.number}
                          </div>
                          <div>
                            <span className="font-bold text-neutral-900 text-sm block">{gk.name}</span>
                            <span className="text-[10px] text-emerald-700 font-bold uppercase">{t.common.goalkeeper}</span>
                          </div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-emerald-600 opacity-60 hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Giocatori di Movimento (se ammessi) */}
              {allowsFieldPlayers && eligibleFieldPlayers.length > 0 && (
                <div>
                  <span className="text-xs font-black uppercase text-[#00008B] block mb-2">
                    {t.roster.fieldPlayersTitle} ({eligibleFieldPlayers.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {eligibleFieldPlayers.map((fp) => (
                      <button
                        key={fp.id}
                        type="button"
                        onClick={() => handleSelectPlayer(fp.id)}
                        className="p-3 rounded-xl border-2 border-neutral-300 bg-white hover:border-[#00008B] hover:bg-blue-50 transition-all cursor-pointer flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-[#00008B] text-white flex items-center justify-center font-black text-sm shadow">
                            #{fp.number}
                          </div>
                          <div>
                            <span className="font-bold text-neutral-900 text-sm block">{fp.name}</span>
                            <span className="text-[10px] text-blue-900 font-bold uppercase">{t.common.fieldPlayer}</span>
                          </div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-[#00008B] opacity-60 hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {totalEligiblePlayers === 0 && (
                <div className="py-8 text-center text-xs text-neutral-600 font-bold">
                  {t.sanctions.noRosterOptions}
                </div>
              )}
            </div>
          )}

          {activeTab === 'dirigenti' && allowsOfficials && (
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-neutral-800 block mb-2">
                {t.sanctions.selectOfficialLabel || 'Ufficiali di Panchina Accreditati'}
              </span>

              {(['A', 'B', 'C', 'D'] as OfficialLetter[]).map((letter) => {
                const off = officials[letter];
                const officialTitle =
                  letter === 'A'
                    ? 'Dirigente Accompagnatore (A)'
                    : letter === 'B'
                    ? 'Capo Allenatore (B)'
                    : letter === 'C'
                    ? 'Vice Allenatore (C)'
                    : 'Medico / Fisioterapista (D)';

                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleSelectOfficial(letter)}
                    className="w-full p-3 rounded-xl border-2 border-neutral-300 bg-white hover:border-[#00008B] hover:bg-blue-50 transition-all cursor-pointer flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center font-black text-base shadow">
                        {letter}
                      </div>
                      <div>
                        <span className="font-bold text-neutral-900 text-sm block">
                          {off?.name || `Dirigente ${letter}`}
                        </span>
                        <span className="text-[10px] text-neutral-600 font-bold">{officialTitle}</span>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-amber-600 opacity-60 hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Modale */}
        <div className="p-3 bg-neutral-200 border-t border-neutral-300 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-300 hover:bg-neutral-400 text-neutral-900 font-bold text-xs cursor-pointer transition-colors"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
