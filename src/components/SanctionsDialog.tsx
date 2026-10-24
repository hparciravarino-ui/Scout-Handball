/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, SanctionType, OfficialLetter, OfficialSanctionStats } from '../types/scout';
import { Button3D } from './Button3D';
import { X, AlertTriangle, ShieldAlert, Shield, User } from 'lucide-react';
import { useI18n } from '../i18n';

interface SanctionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  selectedPlayerId?: string | null;
  onAssignSanction: (
    playerId: string,
    sanctionType: SanctionType,
    officialLetter?: OfficialLetter
  ) => void;
  playerSanctionsSummary?: Record<string, { giallo: number; dueMinuti: number; rosso: number; blu: number }>;
  officials?: Record<OfficialLetter, OfficialSanctionStats>;
}

export const SanctionsDialog: React.FC<SanctionsDialogProps> = ({
  isOpen,
  onClose,
  players,
  selectedPlayerId,
  onAssignSanction,
  playerSanctionsSummary = {},
  officials,
}) => {
  const { t } = useI18n();

  const [targetType, setTargetType] = useState<'athlete' | 'official'>('athlete');
  const [activePlayerId, setActivePlayerId] = useState<string>(
    selectedPlayerId || (players[0]?.id ?? '')
  );
  const [activeOfficialLetter, setActiveOfficialLetter] = useState<OfficialLetter>('A');

  React.useEffect(() => {
    if (selectedPlayerId) {
      setActivePlayerId(selectedPlayerId);
      setTargetType('athlete');
    } else if (players.length > 0 && !activePlayerId) {
      setActivePlayerId(players[0].id);
    }
  }, [selectedPlayerId, players]);

  if (!isOpen) return null;

  const currentPlayer = players.find((p) => p.id === activePlayerId);
  const currentSanctions = currentPlayer
    ? playerSanctionsSummary[currentPlayer.id] || { giallo: 0, dueMinuti: 0, rosso: 0, blu: 0 }
    : { giallo: 0, dueMinuti: 0, rosso: 0, blu: 0 };

  const currentOfficial = officials?.[activeOfficialLetter] || {
    letter: activeOfficialLetter,
    name: '',
    sanctions: { giallo: 0, dueMinuti: 0, rosso: 0, blu: 0 },
  };

  const handleSelectAndAssign = (type: SanctionType) => {
    if (targetType === 'athlete') {
      if (!activePlayerId) return;
      onAssignSanction(activePlayerId, type);
    } else {
      onAssignSanction('', type, activeOfficialLetter);
    }
    onClose();
  };

  const officialLetters: OfficialLetter[] = ['A', 'B', 'C', 'D'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sanction-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Intestazione Dialog */}
        <div className="bg-[#00008B] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-300" />
            <h2 id="sanction-dialog-title" className="text-base md:text-lg font-black tracking-wide uppercase">
              {t.sanctions.dialogTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fascia tricolore decorativa */}
        <div className="h-1.5 w-full flex">
          <div className="w-1/3 h-full bg-[#008C45]" />
          <div className="w-1/3 h-full bg-[#F4F5F0]" />
          <div className="w-1/3 h-full bg-[#CD212A]" />
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {/* Selettore Destinatario: Atleta o Dirigente Panchina */}
          <div className="flex bg-neutral-200 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTargetType('athlete')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                targetType === 'athlete'
                  ? 'bg-[#00008B] text-white shadow-sm'
                  : 'text-neutral-700 hover:text-black'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{t.sanctions.targetTabAthlete}</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetType('official')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                targetType === 'official'
                  ? 'bg-[#00008B] text-white shadow-sm'
                  : 'text-neutral-700 hover:text-black'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t.sanctions.targetTabOfficial}</span>
            </button>
          </div>

          {/* Destinatario: Atleta */}
          {targetType === 'athlete' ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="sanction-player-select" className="block text-xs font-black uppercase text-neutral-800 mb-1.5">
                  {t.sanctions.selectRecipientLabel}:
                </label>
                <div className="relative">
                  <select
                    id="sanction-player-select"
                    value={activePlayerId}
                    onChange={(e) => setActivePlayerId(e.target.value)}
                    className="w-full h-12 px-3 py-2 bg-white border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:outline-none shadow-inner"
                  >
                    {players.length === 0 ? (
                      <option value="">{t.sanctions.noRosterOptions}</option>
                    ) : (
                      players.map((p) => {
                        const sanc = playerSanctionsSummary[p.id];
                        const summaryTxt = sanc
                          ? `[G:${sanc.giallo} | 2m:${sanc.dueMinuti} | R:${sanc.rosso} | B:${sanc.blu}]`
                          : '';
                        const roleLabel = p.role === 'PORTIERE' ? t.common.goalkeeperShort : t.common.fieldPlayerShort;
                        return (
                          <option key={p.id} value={p.id}>
                            #{p.number} - {p.name} ({roleLabel}) {summaryTxt}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              </div>

              {/* Dettagli Atleta Selezionato & Sanzioni attuali */}
              {currentPlayer && (
                <div className="bg-white p-3 rounded-xl border border-neutral-300 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-[#00008B] text-white flex items-center justify-center font-black text-lg">
                      #{currentPlayer.number}
                    </div>
                    <div>
                      <div className="font-black text-neutral-900 text-sm">{currentPlayer.name}</div>
                      <div className="text-xs text-neutral-600 font-medium">
                        {t.common.role}:{' '}
                        <span className="font-bold">
                          {currentPlayer.role === 'PORTIERE' ? t.common.goalkeeper : t.common.fieldPlayer}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges sanzioni attuali */}
                  <div className="flex gap-1.5 items-center">
                    <span className="inline-flex flex-col items-center px-1.5 py-0.5 rounded bg-yellow-100 border border-yellow-400 text-yellow-900 font-bold text-[10px]" title="Giallo">
                      <span>G</span>
                      <span className="font-black">{currentSanctions.giallo}</span>
                    </span>
                    <span className="inline-flex flex-col items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-500 text-amber-900 font-bold text-[10px]" title="2 Minuti">
                      <span>2&apos;</span>
                      <span className="font-black">{currentSanctions.dueMinuti}</span>
                    </span>
                    <span className="inline-flex flex-col items-center px-1.5 py-0.5 rounded bg-red-100 border border-red-500 text-red-900 font-bold text-[10px]" title="Rosso">
                      <span>R</span>
                      <span className="font-black">{currentSanctions.rosso}</span>
                    </span>
                    <span className="inline-flex flex-col items-center px-1.5 py-0.5 rounded bg-blue-100 border border-blue-500 text-blue-900 font-bold text-[10px]" title="Blu">
                      <span>B</span>
                      <span className="font-black">{currentSanctions.blu}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Destinatario: Dirigente Panchina (A, B, C, D) */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 mb-1.5">
                  {t.sanctions.selectOfficialLabel}:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {officialLetters.map((letKey) => {
                    const isSelected = activeOfficialLetter === letKey;
                    const offObj = officials?.[letKey];
                    return (
                      <button
                        key={letKey}
                        type="button"
                        onClick={() => setActiveOfficialLetter(letKey)}
                        className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#00008B] text-white border-blue-900 shadow-md'
                            : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        <span className="font-black text-sm">Dir. {letKey}</span>
                        <span className="text-[10px] truncate max-w-full font-semibold opacity-90">
                          {offObj?.name ? offObj.name.split(' ')[0] : `Uff. ${letKey}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dettagli Dirigente Selezionato & Sanzioni attuali */}
              <div className="bg-white p-3 rounded-xl border border-neutral-300 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-[#00008B] text-amber-300 flex items-center justify-center font-black text-lg shadow">
                    {currentOfficial.letter}
                  </div>
                  <div>
                    <div className="font-black text-neutral-900 text-sm">
                      Dirigente {currentOfficial.letter}
                      {currentOfficial.name ? ` - ${currentOfficial.name}` : ''}
                    </div>
                    <div className="text-xs text-neutral-600 font-medium">
                      {t.common.role}: <span className="font-bold text-[#00008B]">{t.sanctions.officialRole}</span>
                    </div>
                  </div>
                </div>

                {/* Badges sanzioni attuali dirigente */}
                <div className="flex gap-1.5 items-center">
                  <span className="inline-flex flex-col items-center px-1.5 py-0.5 rounded bg-yellow-100 border border-yellow-400 text-yellow-900 font-bold text-[10px]" title="Giallo">
                    <span>G</span>
                    <span className="font-black">{currentOfficial.sanctions.giallo}</span>
                  </span>
                  <span className="inline-flex flex-col items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-500 text-amber-900 font-bold text-[10px]" title="2 Minuti">
                    <span>2&apos;</span>
                    <span className="font-black">{currentOfficial.sanctions.dueMinuti}</span>
                  </span>
                  <span className="inline-flex flex-col items-center px-1.5 py-0.5 rounded bg-red-100 border border-red-500 text-red-900 font-bold text-[10px]" title="Rosso">
                    <span>R</span>
                    <span className="font-black">{currentOfficial.sanctions.rosso}</span>
                  </span>
                  <span className="inline-flex flex-col items-center px-1.5 py-0.5 rounded bg-blue-100 border border-blue-500 text-blue-900 font-bold text-[10px]" title="Blu">
                    <span>B</span>
                    <span className="font-black">{currentOfficial.sanctions.blu}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Griglia Pulsanti Sanzioni 3D */}
          <div className="space-y-2.5 pt-1">
            <p className="text-xs font-black uppercase text-neutral-800 text-center">
              {t.sanctions.tapSanctionInstruction}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Cartellino Giallo */}
              <Button3D
                variant="cardYellow"
                text={t.sanctions.yellowCardText}
                subtext={t.sanctions.yellowCardSub}
                minHeight={54}
                onClick={() => handleSelectAndAssign('GIALLO')}
                disabled={targetType === 'athlete' && !currentPlayer}
              />

              {/* Sospensione 2 Minuti */}
              <Button3D
                variant="cardTwoMin"
                text={t.sanctions.twoMinText}
                subtext={t.sanctions.twoMinSub}
                minHeight={54}
                onClick={() => handleSelectAndAssign('DUE_MINUTI')}
                disabled={targetType === 'athlete' && !currentPlayer}
              />

              {/* Cartellino Rosso */}
              <Button3D
                variant="cardRed"
                text={t.sanctions.redCardText}
                subtext={t.sanctions.redCardSub}
                minHeight={54}
                onClick={() => handleSelectAndAssign('ROSSO')}
                disabled={targetType === 'athlete' && !currentPlayer}
              />

              {/* Cartellino Blu */}
              <Button3D
                variant="cardBlue"
                text={t.sanctions.blueCardText}
                subtext={t.sanctions.blueCardSub}
                minHeight={54}
                onClick={() => handleSelectAndAssign('BLU')}
                disabled={targetType === 'athlete' && !currentPlayer}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              {targetType === 'official'
                ? t.sanctions.officialActionLoggedNotice
                : t.sanctions.immediateLogNotice}
            </span>
          </div>
        </div>

        {/* Footer chiusura */}
        <div className="p-3 bg-neutral-200 border-t border-neutral-300 flex justify-end">
          <Button3D
            variant="secondary"
            text={t.sanctions.cancelOperation}
            onClick={onClose}
            fullWidth={false}
            minHeight={42}
            className="w-auto px-6"
          />
        </div>
      </div>
    </div>
  );
};
