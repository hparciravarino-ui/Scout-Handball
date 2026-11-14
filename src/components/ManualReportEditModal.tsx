/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  HandballMatch,
  Category,
  Player,
  ClubInfo,
  PlayerMatchStats,
  OfficialLetter,
  OfficialSanctionStats,
} from '../types/scout';
import {
  calculateAutoScoreFromMatch,
  calculatePeriodScores,
  calculateUnder14Points,
  createEmptyPlayerStats,
  getMatchOfficials,
  getPeriodsCount,
} from '../utils/stats';
import { Button3D } from './Button3D';
import {
  X,
  Edit,
  Trophy,
  FileText,
  Users,
  Search,
  Clock,
  Award,
  ArrowLeftRight,
  Download,
  RefreshCw,
  UserPlus,
  Building2,
} from 'lucide-react';
import { useI18n } from '../i18n';

export type ManualReportEditTab = 'SCORE' | 'REPORT' | 'STATS';

export interface ManualReportUpdatePayload {
  homeTeam: string;
  guestTeam: string;
  categoryId: string;
  date: string;
  location: string;
  notes: string;
  isAwayMatch: boolean;
  stats: Record<string, PlayerMatchStats>;
  officials: Record<OfficialLetter, OfficialSanctionStats>;
  manualScoreOverride?: { home: number; guest: number };
  manualPeriodScores?: {
    1?: { home: number; guest: number };
    2?: { home: number; guest: number };
    3?: { home: number; guest: number };
  };
}

interface ManualReportEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: HandballMatch | null;
  categories: Category[];
  players: Player[];
  clubInfo?: ClubInfo;
  initialTab?: ManualReportEditTab;
  onSave: (matchId: string, payload: ManualReportUpdatePayload) => void;
  onSaveAndDownloadPdf?: (matchId: string, payload: ManualReportUpdatePayload) => void;
}

export const ManualReportEditModal: React.FC<ManualReportEditModalProps> = ({
  isOpen,
  onClose,
  match,
  categories,
  players,
  clubInfo,
  initialTab = 'SCORE',
  onSave,
  onSaveAndDownloadPdf,
}) => {
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<ManualReportEditTab>(initialTab);

  // Dati Referto
  const [homeTeam, setHomeTeam] = useState('');
  const [guestTeam, setGuestTeam] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isAwayMatch, setIsAwayMatch] = useState(false);

  // Risultato & Tempi
  const [useManualScore, setUseManualScore] = useState(false);
  const [manualScoreHome, setManualScoreHome] = useState(0);
  const [manualScoreGuest, setManualScoreGuest] = useState(0);
  const [useManualPeriods, setUseManualPeriods] = useState(false);
  const [periodScoresBuffer, setPeriodScoresBuffer] = useState<
    Record<1 | 2 | 3, { home: number; guest: number }>
  >({
    1: { home: 0, guest: 0 },
    2: { home: 0, guest: 0 },
    3: { home: 0, guest: 0 },
  });

  // Statistiche Atleti & Dirigenti
  const [editingStatsBuffer, setEditingStatsBuffer] = useState<Record<string, PlayerMatchStats>>({});
  const [editingOfficialsBuffer, setEditingOfficialsBuffer] = useState<
    Record<OfficialLetter, OfficialSanctionStats>
  >({
    A: { letter: 'A', name: '', sanctions: { giallo: 0, dueMinuti: 0, rosso: 0, blu: 0 } },
    B: { letter: 'B', name: '', sanctions: { giallo: 0, dueMinuti: 0, rosso: 0, blu: 0 } },
    C: { letter: 'C', name: '', sanctions: { giallo: 0, dueMinuti: 0, rosso: 0, blu: 0 } },
    D: { letter: 'D', name: '', sanctions: { giallo: 0, dueMinuti: 0, rosso: 0, blu: 0 } },
  });
  const [selectedEditPlayerId, setSelectedEditPlayerId] = useState<string>('');
  const [manualEditSearch, setManualEditSearch] = useState('');
  const [playerToAddId, setPlayerToAddId] = useState('');

  useEffect(() => {
    if (isOpen && match) {
      setActiveTab(initialTab);
      setHomeTeam(match.homeTeam || '');
      setGuestTeam(match.guestTeam || '');
      setCategoryId(match.categoryId || categories[0]?.id || '');
      setDate(match.date || new Date().toISOString().split('T')[0]);
      setLocation(match.location || '');
      setNotes(match.notes || '');
      setIsAwayMatch(Boolean(match.isAwayMatch));

      const catObj = categories.find((c) => c.id === match.categoryId) || null;
      const autoScore = calculateAutoScoreFromMatch(match);

      if (match.manualScoreOverride) {
        setUseManualScore(true);
        setManualScoreHome(match.manualScoreOverride.home);
        setManualScoreGuest(match.manualScoreOverride.guest);
      } else {
        setUseManualScore(false);
        setManualScoreHome(autoScore.home);
        setManualScoreGuest(autoScore.guest);
      }

      const initialPeriods = calculatePeriodScores(match, catObj, catObj?.name);
      setUseManualPeriods(Boolean(match.manualPeriodScores));
      setPeriodScoresBuffer({
        1: { ...initialPeriods[1] },
        2: { ...initialPeriods[2] },
        3: { ...initialPeriods[3] },
      });

      const clonedStats: Record<string, PlayerMatchStats> = JSON.parse(
        JSON.stringify(match.stats || {})
      );
      setEditingStatsBuffer(clonedStats);

      const clonedOfficials: Record<OfficialLetter, OfficialSanctionStats> = JSON.parse(
        JSON.stringify(getMatchOfficials(match, catObj))
      );
      setEditingOfficialsBuffer(clonedOfficials);

      const sortedPlayerIds = Object.values(clonedStats)
        .sort((a, b) => a.playerNumber - b.playerNumber)
        .map((s) => s.playerId);
      setSelectedEditPlayerId(sortedPlayerIds[0] || 'OFFICIAL_A');
      setManualEditSearch('');
      setPlayerToAddId('');
    }
  }, [isOpen, match, initialTab, categories]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) || null,
    [categories, categoryId]
  );

  const numPeriods = useMemo(
    () => getPeriodsCount(selectedCategory?.name, selectedCategory),
    [selectedCategory]
  );

  // Costruisce una bozza di match in tempo reale per mostrare anteprima esatta di punteggio, tempi e U14
  const draftMatchPreview = useMemo<HandballMatch | null>(() => {
    if (!match) return null;
    const manualScoreObj = useManualScore
      ? { home: Math.max(0, manualScoreHome), guest: Math.max(0, manualScoreGuest) }
      : undefined;
    const manualPeriodsObj = useManualPeriods
      ? {
          1: { ...periodScoresBuffer[1] },
          2: { ...periodScoresBuffer[2] },
          ...(numPeriods === 3 ? { 3: { ...periodScoresBuffer[3] } } : {}),
        }
      : undefined;

    return {
      ...match,
      homeTeam: homeTeam.trim() || match.homeTeam,
      guestTeam: guestTeam.trim() || match.guestTeam,
      categoryId,
      date,
      location,
      notes,
      isAwayMatch,
      stats: editingStatsBuffer,
      officials: editingOfficialsBuffer,
      manualScoreOverride: manualScoreObj,
      manualPeriodScores: manualPeriodsObj,
    };
  }, [
    match,
    homeTeam,
    guestTeam,
    categoryId,
    date,
    location,
    notes,
    isAwayMatch,
    editingStatsBuffer,
    editingOfficialsBuffer,
    useManualScore,
    manualScoreHome,
    manualScoreGuest,
    useManualPeriods,
    periodScoresBuffer,
    numPeriods,
  ]);

  const autoScoreFromDraft = useMemo(() => {
    if (!draftMatchPreview) return { home: 0, guest: 0 };
    return calculateAutoScoreFromMatch(draftMatchPreview);
  }, [draftMatchPreview]);

  const u14Preview = useMemo(() => {
    if (!draftMatchPreview) return null;
    return calculateUnder14Points(draftMatchPreview, selectedCategory, selectedCategory?.name);
  }, [draftMatchPreview, selectedCategory]);

  const missingCategoryPlayers = useMemo(() => {
    return players
      .filter((p) => p.categoryId === categoryId && !editingStatsBuffer[p.id])
      .sort((a, b) => a.number - b.number);
  }, [players, categoryId, editingStatsBuffer]);

  if (!isOpen || !match) return null;

  const effectiveScoreHome = useManualScore ? manualScoreHome : autoScoreFromDraft.home;
  const effectiveScoreGuest = useManualScore ? manualScoreGuest : autoScoreFromDraft.guest;

  const handleSyncScoreFromStats = () => {
    setManualScoreHome(autoScoreFromDraft.home);
    setManualScoreGuest(autoScoreFromDraft.guest);
  };

  const handleApplyPeriodsSumToScore = () => {
    let h = periodScoresBuffer[1].home + periodScoresBuffer[2].home;
    let g = periodScoresBuffer[1].guest + periodScoresBuffer[2].guest;
    if (numPeriods === 3) {
      h += periodScoresBuffer[3].home;
      g += periodScoresBuffer[3].guest;
    }
    setUseManualScore(true);
    setManualScoreHome(Math.max(0, h));
    setManualScoreGuest(Math.max(0, g));
  };

  const handleTogglePeriodsManual = (enabled: boolean) => {
    if (enabled && draftMatchPreview && !useManualPeriods) {
      const currentAutoPeriods = calculatePeriodScores(
        { ...draftMatchPreview, manualPeriodScores: undefined },
        selectedCategory,
        selectedCategory?.name
      );
      setPeriodScoresBuffer({
        1: { ...currentAutoPeriods[1] },
        2: { ...currentAutoPeriods[2] },
        3: { ...currentAutoPeriods[3] },
      });
    }
    setUseManualPeriods(enabled);
  };

  const updatePeriodValue = (period: 1 | 2 | 3, side: 'home' | 'guest', newVal: number) => {
    const safeVal = Math.max(0, Math.min(999, Math.floor(Number.isNaN(newVal) ? 0 : newVal)));
    setPeriodScoresBuffer((prev) => ({
      ...prev,
      [period]: {
        ...prev[period],
        [side]: safeVal,
      },
    }));
  };

  const handleSwapSides = () => {
    setIsAwayMatch((prev) => !prev);
    setHomeTeam(guestTeam);
    setGuestTeam(homeTeam);
    setManualScoreHome(manualScoreGuest);
    setManualScoreGuest(manualScoreHome);
    setPeriodScoresBuffer((prev) => ({
      1: { home: prev[1].guest, guest: prev[1].home },
      2: { home: prev[2].guest, guest: prev[2].home },
      3: { home: prev[3].guest, guest: prev[3].home },
    }));
  };

  const updateStatDirectValue = (
    fieldGroup: 'field' | 'goalkeeper' | 'sanctions',
    fieldKey: string,
    nextValue: number
  ) => {
    if (!selectedEditPlayerId || !editingStatsBuffer[selectedEditPlayerId]) return;
    const clamped = Math.max(0, Math.min(999, Math.floor(Number.isNaN(nextValue) ? 0 : nextValue)));

    setEditingStatsBuffer((prev) => {
      const copy = { ...prev };
      const playerStat = { ...copy[selectedEditPlayerId] };

      if (fieldGroup === 'field') {
        const fieldCopy = { ...playerStat.field };
        const key = fieldKey as keyof typeof fieldCopy;
        fieldCopy[key] = clamped;
        playerStat.field = fieldCopy;
      } else if (fieldGroup === 'goalkeeper') {
        const gkCopy = { ...playerStat.goalkeeper };
        const key = fieldKey as keyof typeof gkCopy;
        gkCopy[key] = clamped;
        playerStat.goalkeeper = gkCopy;
      } else if (fieldGroup === 'sanctions') {
        const sancCopy = { ...playerStat.sanctions };
        const key = fieldKey as keyof typeof sancCopy;
        sancCopy[key] = clamped;
        playerStat.sanctions = sancCopy;
      }

      copy[selectedEditPlayerId] = playerStat;
      return copy;
    });
  };

  const updateOfficialDirectValue = (
    letter: OfficialLetter,
    fieldKey: 'giallo' | 'dueMinuti' | 'rosso' | 'blu',
    nextValue: number
  ) => {
    const clamped = Math.max(0, Math.min(99, Math.floor(Number.isNaN(nextValue) ? 0 : nextValue)));
    setEditingOfficialsBuffer((prev) => ({
      ...prev,
      [letter]: {
        ...prev[letter],
        sanctions: {
          ...prev[letter].sanctions,
          [fieldKey]: clamped,
        },
      },
    }));
  };

  const handleAddMissingPlayerToReport = () => {
    const targetId = playerToAddId || missingCategoryPlayers[0]?.id;
    if (!targetId) return;
    const pObj = players.find((p) => p.id === targetId);
    if (!pObj) return;

    setEditingStatsBuffer((prev) => ({
      ...prev,
      [pObj.id]: createEmptyPlayerStats(pObj.id, pObj.role, pObj.name, pObj.number),
    }));
    setSelectedEditPlayerId(pObj.id);
    setPlayerToAddId('');
  };

  const buildPayload = (): ManualReportUpdatePayload => ({
    homeTeam: homeTeam.trim() || match.homeTeam,
    guestTeam: guestTeam.trim() || match.guestTeam,
    categoryId: categoryId || match.categoryId,
    date: date || match.date,
    location: location.trim(),
    notes: notes.trim(),
    isAwayMatch,
    stats: editingStatsBuffer,
    officials: editingOfficialsBuffer,
    manualScoreOverride: useManualScore
      ? {
          home: Math.max(0, Math.floor(manualScoreHome)),
          guest: Math.max(0, Math.floor(manualScoreGuest)),
        }
      : undefined,
    manualPeriodScores: useManualPeriods
      ? {
          1: {
            home: Math.max(0, Math.floor(periodScoresBuffer[1].home)),
            guest: Math.max(0, Math.floor(periodScoresBuffer[1].guest)),
          },
          2: {
            home: Math.max(0, Math.floor(periodScoresBuffer[2].home)),
            guest: Math.max(0, Math.floor(periodScoresBuffer[2].guest)),
          },
          ...(numPeriods === 3
            ? {
                3: {
                  home: Math.max(0, Math.floor(periodScoresBuffer[3].home)),
                  guest: Math.max(0, Math.floor(periodScoresBuffer[3].guest)),
                },
              }
            : {}),
        }
      : undefined,
  });

  const handleSaveOnly = () => {
    onSave(match.id, buildPayload());
    onClose();
  };

  const handleSaveAndPdf = () => {
    if (!onSaveAndDownloadPdf) return;
    onSaveAndDownloadPdf(match.id, buildPayload());
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] overflow-hidden flex flex-col max-h-[93vh]">
        {/* Header Navy */}
        <div className="bg-[#00008B] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Edit className="w-5 h-5 text-amber-300 flex-shrink-0" />
            <h3
              id="manual-report-modal-title"
              className="font-black text-sm sm:text-base uppercase truncate"
            >
              {t.manualReport.modalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-bar Club */}
        <div className="bg-[#000066] text-white px-4 py-1.5 flex items-center justify-between border-t border-blue-900 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 truncate">
            {clubInfo?.logoUrl ? (
              <img src={clubInfo.logoUrl} alt="Logo" className="w-4 h-4 rounded-full object-cover bg-white" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
            )}
            <span className="font-bold text-[11px] truncate">
              {homeTeam || match.homeTeam} vs {guestTeam || match.guestTeam}
            </span>
          </div>
          <span className="bg-amber-400 text-neutral-950 font-black text-[10px] px-2 py-0.5 rounded-full flex-shrink-0">
            {effectiveScoreHome} - {effectiveScoreGuest}
          </span>
        </div>

        {/* Fascia Tricolore */}
        <div className="h-1.5 w-full flex flex-shrink-0">
          <div className="w-1/3 h-full bg-[#008C45]" />
          <div className="w-1/3 h-full bg-[#F4F5F0]" />
          <div className="w-1/3 h-full bg-[#CD212A]" />
        </div>

        {/* Barre Tab di Navigazione Interna */}
        <div className="bg-neutral-200 px-3 py-2 border-b border-neutral-300 flex gap-1.5 overflow-x-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('SCORE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'SCORE'
                ? 'bg-[#00008B] text-white shadow-sm'
                : 'bg-white text-neutral-700 hover:text-neutral-950 border border-neutral-300'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{t.manualReport.tabScore}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REPORT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'REPORT'
                ? 'bg-[#00008B] text-white shadow-sm'
                : 'bg-white text-neutral-700 hover:text-neutral-950 border border-neutral-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t.manualReport.tabReportData}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STATS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'STATS'
                ? 'bg-[#00008B] text-white shadow-sm'
                : 'bg-white text-neutral-700 hover:text-neutral-950 border border-neutral-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.manualReport.tabStats}</span>
          </button>
        </div>

        {/* Corpo Scorrevole */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-4 flex-1">
          {/* ========================================== */}
          {/* TAB 1: RISULTATO FINALE & TEMPI DI GIOCO   */}
          {/* ========================================== */}
          {activeTab === 'SCORE' && (
            <div className="space-y-3.5">
              {/* Box Riepilogo Risultato Corrente */}
              <div className="bg-white p-3.5 rounded-xl border-2 border-[#00008B]/30 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase text-[#00008B] flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>{t.pdfReport.finalResult}</span>
                  </span>
                  {useManualScore && (
                    <span className="bg-amber-400 text-neutral-950 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                      {t.manualReport.manualOverrideBadge}
                    </span>
                  )}
                </div>

                {/* Selettore Modalità Risultato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-neutral-200 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setUseManualScore(false)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      !useManualScore
                        ? 'bg-[#00008B] text-white shadow'
                        : 'text-neutral-700 hover:text-black'
                    }`}
                  >
                    {t.manualReport.scoreModeAuto}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!useManualScore) {
                        setManualScoreHome(autoScoreFromDraft.home);
                        setManualScoreGuest(autoScoreFromDraft.guest);
                      }
                      setUseManualScore(true);
                    }}
                    className={`py-2 px-2.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      useManualScore
                        ? 'bg-[#00008B] text-white shadow'
                        : 'text-neutral-700 hover:text-black'
                    }`}
                  >
                    {t.manualReport.scoreModeManual}
                  </button>
                </div>

                {!useManualScore ? (
                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 text-center space-y-1">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-right flex-1 min-w-0">
                        <span className="text-[10px] font-black uppercase text-neutral-500 block">
                          {t.common.home}
                        </span>
                        <span className="font-black text-sm text-neutral-900 truncate block">
                          {homeTeam || match.homeTeam}
                        </span>
                      </div>
                      <div className="bg-[#00008B] text-white font-black text-2xl px-4 py-1.5 rounded-xl shadow-inner">
                        {autoScoreFromDraft.home} - {autoScoreFromDraft.guest}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <span className="text-[10px] font-black uppercase text-neutral-500 block">
                          {t.common.guest}
                        </span>
                        <span className="font-black text-sm text-neutral-900 truncate block">
                          {guestTeam || match.guestTeam}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-600 font-medium pt-1">
                      {t.manualReport.autoCalculatedHint}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <NumericStepperCard
                        title={`${t.common.home}: ${homeTeam || match.homeTeam}`}
                        value={manualScoreHome}
                        onChange={(v) => setManualScoreHome(v)}
                      />
                      <NumericStepperCard
                        title={`${t.common.guest}: ${guestTeam || match.guestTeam}`}
                        value={manualScoreGuest}
                        onChange={(v) => setManualScoreGuest(v)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSyncScoreFromStats}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-xs font-bold text-neutral-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#00008B]" />
                        <span>
                          {t.manualReport.syncFromStatsBtn} ({autoScoreFromDraft.home}-{autoScoreFromDraft.guest})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyPeriodsSumToScore}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-[#00008B] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t.manualReport.applyPeriodsSumBtn}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Box Punteggi per Tempo di Gioco */}
              <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useManualPeriods}
                      onChange={(e) => handleTogglePeriodsManual(e.target.checked)}
                      className="w-4 h-4 accent-[#00008B] cursor-pointer"
                    />
                    <span className="text-xs font-black uppercase text-neutral-900">
                      {t.manualReport.manualPeriodsToggle} ({numPeriods} {t.manualReport.periodRowLabel})
                    </span>
                  </label>

                  {useManualPeriods && (
                    <button
                      type="button"
                      onClick={handleApplyPeriodsSumToScore}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black cursor-pointer"
                    >
                      {t.manualReport.applyPeriodsSumBtn}
                    </button>
                  )}
                </div>

                {!useManualPeriods ? (
                  <p className="text-[11px] text-neutral-600 font-medium bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                    {t.manualReport.autoPeriodsHint}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {([1, 2, 3] as const).slice(0, numPeriods).map((p) => (
                      <div
                        key={p}
                        className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <span className="text-xs font-black uppercase text-[#00008B] min-w-[85px]">
                          {p}° {t.manualReport.periodRowLabel}
                        </span>
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          <StepperRow
                            label={t.common.home}
                            value={periodScoresBuffer[p].home}
                            onChange={(v) => updatePeriodValue(p, 'home', v)}
                          />
                          <StepperRow
                            label={t.common.guest}
                            value={periodScoresBuffer[p].guest}
                            onChange={(v) => updatePeriodValue(p, 'guest', v)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Anteprima Calcolo Punti Under 14 in tempo reale */}
                {u14Preview?.isUnder14 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#00008B] flex items-center gap-1.5 uppercase text-[11px]">
                        <Award className="w-4 h-4 text-amber-600" />
                        <span>{t.manualReport.u14PreviewTitle}:</span>
                      </span>
                      <span className="bg-[#00008B] text-white px-2.5 py-0.5 rounded-lg font-black text-xs">
                        {u14Preview.totalMatchPoints.home} - {u14Preview.totalMatchPoints.guest}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold flex flex-wrap justify-between gap-1 pt-1 border-t border-amber-200">
                      <span>1°T: {u14Preview.periodPoints[1].home}-{u14Preview.periodPoints[1].guest}</span>
                      <span>2°T: {u14Preview.periodPoints[2].home}-{u14Preview.periodPoints[2].guest}</span>
                      <span>3°T: {u14Preview.periodPoints[3].home}-{u14Preview.periodPoints[3].guest}</span>
                      <span className="text-amber-800">
                        Extra: {u14Preview.extraPoints.home}-{u14Preview.extraPoints.guest}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: DATI & NOTE UFFICIALI DI REFERTO    */}
          {/* ========================================== */}
          {activeTab === 'REPORT' && (
            <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm space-y-3.5">
              {/* Sede Incontro + Inversione Rapida */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-black uppercase text-neutral-800">
                    {t.archive.matchModeLabel}
                  </label>
                  <button
                    type="button"
                    onClick={handleSwapSides}
                    className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 border border-amber-500 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>{t.manualReport.swapTeamNamesBtn}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-neutral-200 p-1 rounded-xl border border-neutral-300">
                  <button
                    type="button"
                    onClick={() => setIsAwayMatch(false)}
                    className={`py-2 px-3 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      !isAwayMatch
                        ? 'bg-[#00008B] text-white shadow'
                        : 'text-neutral-700 hover:text-black'
                    }`}
                  >
                    {t.archive.homeMatchMode}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAwayMatch(true)}
                    className={`py-2 px-3 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      isAwayMatch
                        ? 'bg-[#00008B] text-white shadow'
                        : 'text-neutral-700 hover:text-black'
                    }`}
                  >
                    {t.archive.awayMatchMode}
                  </button>
                </div>
              </div>

              {/* Squadre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                    {t.archive.homeTeamLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={homeTeam}
                    onChange={(e) => setHomeTeam(e.target.value)}
                    className="w-full h-10 px-3 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-bold text-sm text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                    {t.archive.guestTeamLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={guestTeam}
                    onChange={(e) => setGuestTeam(e.target.value)}
                    className="w-full h-10 px-3 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-bold text-sm text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                  />
                </div>
              </div>

              {/* Categoria, Data, Impianto */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                    {t.common.category}
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-10 px-2.5 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-bold text-xs text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                    {t.archive.matchDateLabel}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-10 px-2.5 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-bold text-xs text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                    {t.archive.venueLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t.archive.venuePlaceholder}
                    className="w-full h-10 px-2.5 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-bold text-xs text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                  />
                </div>
              </div>

              {/* Note Tecniche & Arbitrali di Referto */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black uppercase text-neutral-800">
                    {t.manualReport.notesLabel}
                  </label>
                  <span className="text-[10px] font-bold text-neutral-500">
                    {notes.length}/300
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.manualReport.notesPlaceholder}
                  className="w-full p-3 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-semibold text-xs text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none resize-y"
                />
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: STATISTICHE ATLETI & DIRIGENTI      */}
          {/* ========================================== */}
          {activeTab === 'STATS' && (
            <div className="space-y-3.5">
              {/* Aggiungi atleta dalla rosa se non presente in match.stats */}
              {missingCategoryPlayers.length > 0 && (
                <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-[#00008B]">
                    {t.manualReport.addMissingPlayerLabel}
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px] justify-end">
                    <select
                      value={playerToAddId || missingCategoryPlayers[0]?.id || ''}
                      onChange={(e) => setPlayerToAddId(e.target.value)}
                      className="h-8 px-2 bg-white border border-blue-300 rounded-lg text-xs font-bold text-neutral-900 flex-1 max-w-[200px]"
                    >
                      {missingCategoryPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.number} {p.name} ({p.role === 'PORTIERE' ? t.common.goalkeeperShort : t.common.fieldPlayerShort})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddMissingPlayerToReport}
                      className="px-2.5 py-1.5 rounded-lg bg-[#00008B] hover:bg-blue-900 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t.manualReport.addMissingPlayerBtn}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Selezione Atleta / Dirigente con filtro ricerca */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-neutral-800">
                  {t.archive.selectAthleteToCorrect}
                </label>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={manualEditSearch}
                    onChange={(e) => setManualEditSearch(e.target.value)}
                    placeholder={t.filters.searchPlayerPlaceholder}
                    className="w-full h-9 pl-8 pr-8 bg-white border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 focus:border-[#00008B] focus:outline-none"
                  />
                  {manualEditSearch && (
                    <button
                      type="button"
                      onClick={() => setManualEditSearch('')}
                      aria-label={t.common.close}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={selectedEditPlayerId}
                  onChange={(e) => setSelectedEditPlayerId(e.target.value)}
                  className="w-full h-11 px-3 bg-white border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:outline-none"
                >
                  <optgroup label={t.roster.categoryRosterTitle || 'Atleti in Rosa'}>
                    {Object.values(editingStatsBuffer)
                      .filter((st) => {
                        const q = manualEditSearch.trim().toLowerCase();
                        if (!q) return true;
                        const qNum = q.startsWith('#') ? q.slice(1).trim() : q;
                        return (
                          st.playerName.toLowerCase().includes(q) ||
                          (qNum.length > 0 &&
                            (String(st.playerNumber).includes(qNum) || `#${st.playerNumber}`.includes(q)))
                        );
                      })
                      .sort((a, b) => a.playerNumber - b.playerNumber)
                      .map((st) => (
                        <option key={st.playerId} value={st.playerId}>
                          #{st.playerNumber} {st.playerName} (
                          {st.role === 'PORTIERE' ? t.common.goalkeeperShort : t.common.fieldPlayerShort})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label={t.roster.officialsCardTitle || 'Dirigenti Panchina'}>
                    {(['A', 'B', 'C', 'D'] as OfficialLetter[]).map((offLetter) => (
                      <option key={`OFFICIAL_${offLetter}`} value={`OFFICIAL_${offLetter}`}>
                        Dirigente {offLetter}: {editingOfficialsBuffer[offLetter]?.name || `Dirigente ${offLetter}`}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Stepper per Dirigenti */}
              {selectedEditPlayerId.startsWith('OFFICIAL_') && (() => {
                const letter = selectedEditPlayerId.replace('OFFICIAL_', '') as OfficialLetter;
                const officialObj = editingOfficialsBuffer[letter];
                if (!officialObj) return null;

                return (
                  <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-200">
                      <span className="font-black text-sm text-[#00008B]">
                        Dirigente {letter}
                      </span>
                      <input
                        type="text"
                        maxLength={60}
                        value={officialObj.name}
                        onChange={(e) =>
                          setEditingOfficialsBuffer((prev) => ({
                            ...prev,
                            [letter]: { ...prev[letter], name: e.target.value },
                          }))
                        }
                        placeholder={`Nome Dirigente ${letter}`}
                        className="h-8 px-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 sm:w-64"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <StepperRow
                        label="Ammonizione (Giallo)"
                        value={officialObj.sanctions.giallo}
                        onChange={(v) => updateOfficialDirectValue(letter, 'giallo', v)}
                      />
                      <StepperRow
                        label="Sospensione 2 Minuti"
                        value={officialObj.sanctions.dueMinuti}
                        onChange={(v) => updateOfficialDirectValue(letter, 'dueMinuti', v)}
                      />
                      <StepperRow
                        label="Squalifica (Rosso)"
                        value={officialObj.sanctions.rosso}
                        onChange={(v) => updateOfficialDirectValue(letter, 'rosso', v)}
                      />
                      <StepperRow
                        label="Espulsione (Blu)"
                        value={officialObj.sanctions.blu}
                        onChange={(v) => updateOfficialDirectValue(letter, 'blu', v)}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Stepper per Atleta */}
              {!selectedEditPlayerId.startsWith('OFFICIAL_') &&
                selectedEditPlayerId &&
                editingStatsBuffer[selectedEditPlayerId] && (
                  <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm space-y-3">
                    <div className="font-black text-sm text-neutral-900 pb-2 border-b border-neutral-200">
                      {t.archive.countersFor} #{editingStatsBuffer[selectedEditPlayerId].playerNumber}{' '}
                      {editingStatsBuffer[selectedEditPlayerId].playerName}
                    </div>

                    {editingStatsBuffer[selectedEditPlayerId].role === 'PORTIERE' ? (
                      <div className="space-y-2">
                        <StepperRow
                          label={t.archive.colSavesPlay}
                          value={editingStatsBuffer[selectedEditPlayerId].goalkeeper.parate}
                          onChange={(v) => updateStatDirectValue('goalkeeper', 'parate', v)}
                        />
                        <StepperRow
                          label={t.archive.colConcededPlay}
                          value={editingStatsBuffer[selectedEditPlayerId].goalkeeper.golSubiti}
                          onChange={(v) => updateStatDirectValue('goalkeeper', 'golSubiti', v)}
                        />
                        <StepperRow
                          label={t.pdfReport.col7mSaves}
                          value={editingStatsBuffer[selectedEditPlayerId].goalkeeper.rigoriParati}
                          onChange={(v) => updateStatDirectValue('goalkeeper', 'rigoriParati', v)}
                        />
                        <StepperRow
                          label={t.pdfReport.col7mConceded}
                          value={editingStatsBuffer[selectedEditPlayerId].goalkeeper.rigoriSubiti}
                          onChange={(v) => updateStatDirectValue('goalkeeper', 'rigoriSubiti', v)}
                        />
                        <StepperRow
                          label={t.scout.gkGoalAction}
                          value={editingStatsBuffer[selectedEditPlayerId].goalkeeper.gol || 0}
                          onChange={(v) => updateStatDirectValue('goalkeeper', 'gol', v)}
                        />
                        <StepperRow
                          label={t.scout.gkAssistAction}
                          value={editingStatsBuffer[selectedEditPlayerId].goalkeeper.assist || 0}
                          onChange={(v) => updateStatDirectValue('goalkeeper', 'assist', v)}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <StepperRow
                          label={t.scout.goalAction}
                          value={editingStatsBuffer[selectedEditPlayerId].field.gol}
                          onChange={(v) => updateStatDirectValue('field', 'gol', v)}
                        />
                        <StepperRow
                          label={t.scout.missedAction}
                          value={editingStatsBuffer[selectedEditPlayerId].field.tiriFuori}
                          onChange={(v) => updateStatDirectValue('field', 'tiriFuori', v)}
                        />
                        <StepperRow
                          label={t.scout.goal7mAction}
                          value={editingStatsBuffer[selectedEditPlayerId].field.rigoriGol}
                          onChange={(v) => updateStatDirectValue('field', 'rigoriGol', v)}
                        />
                        <StepperRow
                          label={t.scout.missed7mAction}
                          value={editingStatsBuffer[selectedEditPlayerId].field.rigoriPersi}
                          onChange={(v) => updateStatDirectValue('field', 'rigoriPersi', v)}
                        />
                        <StepperRow
                          label={t.scout.assistAction}
                          value={editingStatsBuffer[selectedEditPlayerId].field.assist}
                          onChange={(v) => updateStatDirectValue('field', 'assist', v)}
                        />
                        <StepperRow
                          label={t.scout.lostPassAction}
                          value={editingStatsBuffer[selectedEditPlayerId].field.passaggiPersi}
                          onChange={(v) => updateStatDirectValue('field', 'passaggiPersi', v)}
                        />
                        <StepperRow
                          label={t.scout.lostCatchAction}
                          value={editingStatsBuffer[selectedEditPlayerId].field.passaggiPersiRicezione}
                          onChange={(v) =>
                            updateStatDirectValue('field', 'passaggiPersiRicezione', v)
                          }
                        />
                      </div>
                    )}

                    {/* Sanzioni */}
                    <div className="pt-2 border-t border-neutral-200">
                      <span className="text-xs font-bold text-neutral-700 block mb-1.5">
                        {t.archive.colSanctions}:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <StepperRow
                          label="Giallo (Yellow)"
                          value={editingStatsBuffer[selectedEditPlayerId].sanctions.giallo}
                          onChange={(v) => updateStatDirectValue('sanctions', 'giallo', v)}
                        />
                        <StepperRow
                          label="2 Minuti"
                          value={editingStatsBuffer[selectedEditPlayerId].sanctions.dueMinuti}
                          onChange={(v) => updateStatDirectValue('sanctions', 'dueMinuti', v)}
                        />
                        <StepperRow
                          label="Rosso (Red)"
                          value={editingStatsBuffer[selectedEditPlayerId].sanctions.rosso}
                          onChange={(v) => updateStatDirectValue('sanctions', 'rosso', v)}
                        />
                        <StepperRow
                          label="Blu (Blue)"
                          value={editingStatsBuffer[selectedEditPlayerId].sanctions.blu}
                          onChange={(v) => updateStatDirectValue('sanctions', 'blu', v)}
                        />
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer Azioni */}
        <div className="p-3 bg-neutral-200 border-t border-neutral-300 flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
          <Button3D
            variant="secondary"
            text={t.archive.discardChanges}
            onClick={onClose}
            fullWidth={false}
            minHeight={42}
            className="w-auto px-4"
          />
          {onSaveAndDownloadPdf && (
            <Button3D
              variant="success"
              text={t.manualReport.saveAndDownloadPdfBtn}
              icon={<Download className="w-4 h-4" />}
              onClick={handleSaveAndPdf}
              fullWidth={false}
              minHeight={42}
              className="w-auto px-4"
            />
          )}
          <Button3D
            variant="primary"
            text={t.manualReport.saveReportBtn}
            onClick={handleSaveOnly}
            fullWidth={false}
            minHeight={42}
            className="w-auto px-5"
          />
        </div>
      </div>
    </div>
  );
};

interface StepperRowProps {
  label: string;
  value: number;
  onChange: (nextVal: number) => void;
}

const StepperRow: React.FC<StepperRowProps> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg bg-neutral-50 border border-neutral-200">
    <span className="text-xs font-bold text-neutral-800 truncate">{label}</span>
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        className="w-7 h-7 rounded-md bg-neutral-200 hover:bg-neutral-300 disabled:opacity-30 flex items-center justify-center text-neutral-800 font-bold transition-colors cursor-pointer"
      >
        -
      </button>
      <input
        type="number"
        min={0}
        max={999}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-12 h-7 text-center font-black text-sm text-[#00008B] bg-white border border-neutral-300 rounded-md focus:border-[#00008B] focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-md bg-[#00008B] hover:bg-blue-800 flex items-center justify-center text-white font-bold transition-colors cursor-pointer shadow-sm"
      >
        +
      </button>
    </div>
  </div>
);

interface NumericStepperCardProps {
  title: string;
  value: number;
  onChange: (nextVal: number) => void;
}

const NumericStepperCard: React.FC<NumericStepperCardProps> = ({ title, value, onChange }) => (
  <div className="bg-neutral-50 border-2 border-neutral-300 rounded-xl p-2.5 flex flex-col items-center gap-2">
    <span className="text-xs font-black text-neutral-800 truncate max-w-full text-center">
      {title}
    </span>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        className="w-9 h-9 rounded-xl bg-neutral-200 hover:bg-neutral-300 disabled:opacity-30 font-black text-lg text-neutral-900 cursor-pointer"
      >
        -
      </button>
      <input
        type="number"
        min={0}
        max={999}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-16 h-9 text-center font-black text-xl text-[#00008B] bg-white border-2 border-[#00008B]/40 rounded-xl focus:border-[#00008B] focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-9 h-9 rounded-xl bg-[#00008B] hover:bg-blue-900 font-black text-lg text-white cursor-pointer shadow-sm"
      >
        +
      </button>
    </div>
  </div>
);
