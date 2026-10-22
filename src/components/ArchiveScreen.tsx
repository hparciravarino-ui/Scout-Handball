/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HandballMatch, Player, Category, PlayerMatchStats } from '../types/scout';
import { Button3D } from './Button3D';
import {
  calculateGoalkeeperStats,
  calculateFieldPlayerStats,
  calculateTeamTotals,
} from '../utils/stats';
import { generateScoutReportPdf } from '../utils/pdfExport';
import {
  Plus,
  Calendar,
  MapPin,
  PlayCircle,
  FileText,
  Trash2,
  Edit,
  X,
  AlertTriangle,
  Download,
  CheckCircle,
  Eye,
  FileDown,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface ArchiveScreenProps {
  matches: HandballMatch[];
  activeMatchId: string | null;
  categories: Category[];
  players: Player[];
  onCreateMatch: (matchData: {
    homeTeam: string;
    guestTeam: string;
    categoryId: string;
    date: string;
    location: string;
    notes: string;
  }) => { success: boolean; error?: string };
  onSetActiveMatch: (matchId: string) => void;
  onDeleteMatch: (matchId: string) => void;
  onUpdateMatchStats: (matchId: string, updatedStats: Record<string, PlayerMatchStats>) => void;
}

export const ArchiveScreen: React.FC<ArchiveScreenProps> = ({
  matches,
  activeMatchId,
  categories,
  players,
  onCreateMatch,
  onSetActiveMatch,
  onDeleteMatch,
  onUpdateMatchStats,
}) => {
  const { t, locale } = useI18n();

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
    activeMatchId || (matches[0]?.id ?? null)
  );
  const [isNewMatchModalOpen, setIsNewMatchModalOpen] = useState(false);
  const [isManualEditModalOpen, setIsManualEditModalOpen] = useState(false);
  const [deleteConfirmMatchId, setDeleteConfirmMatchId] = useState<string | null>(null);

  // Form nuova partita
  const [newHomeTeam, setNewHomeTeam] = useState('Squadra Locale');
  const [newGuestTeam, setNewGuestTeam] = useState('');
  const [newCategoryId, setNewCategoryId] = useState(categories[0]?.id || '');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newLocation, setNewLocation] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Stato per la modifica manuale delle statistiche
  const [editingStatsBuffer, setEditingStatsBuffer] = useState<Record<string, PlayerMatchStats>>({});
  const [selectedEditPlayerId, setSelectedEditPlayerId] = useState<string>('');

  // Stato per la generazione e anteprima PDF
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [isPdfPreviewModalOpen, setIsPdfPreviewModalOpen] = useState(false);
  const [statsTab, setStatsTab] = useState<'giocatori' | 'portieri'>('giocatori');

  const currentMatch = matches.find((m) => m.id === selectedMatchId) || matches[0] || null;

  // Funzione di esportazione e download del referto PDF
  const handleDownloadPdf = (match: HandballMatch) => {
    try {
      const catName = categories.find((c) => c.id === match.categoryId)?.name || t.common.category;
      generateScoutReportPdf(match, catName, locale);
      setPdfSuccessMessage(`${t.archive.pdfDownloadSuccessToast} (${match.homeTeam} vs ${match.guestTeam})`);
      setTimeout(() => setPdfSuccessMessage(null), 4500);
    } catch (err: unknown) {
      console.error('Errore durante la generazione del PDF:', err);
    }
  };

  const handleOpenNewMatch = () => {
    setNewHomeTeam('Squadra Locale');
    setNewGuestTeam('');
    setNewCategoryId(categories[0]?.id || '');
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewLocation('');
    setNewNotes('');
    setFormError(null);
    setIsNewMatchModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newHomeTeam.trim()) {
      setFormError(t.archive.errorHomeRequired);
      return;
    }
    if (!newGuestTeam.trim()) {
      setFormError(t.archive.errorGuestRequired);
      return;
    }
    if (!newCategoryId) {
      setFormError(t.archive.errorCategoryRequired);
      return;
    }

    const categoryPlayers = players.filter((p) => p.categoryId === newCategoryId);
    if (categoryPlayers.length === 0) {
      setFormError(t.archive.errorNoAthletesInCategory);
      return;
    }

    const res = onCreateMatch({
      homeTeam: newHomeTeam.trim(),
      guestTeam: newGuestTeam.trim(),
      categoryId: newCategoryId,
      date: newDate,
      location: newLocation.trim(),
      notes: newNotes.trim(),
    });

    if (!res.success) {
      setFormError(res.error || t.common.error);
      return;
    }

    setIsNewMatchModalOpen(false);
  };

  const handleOpenManualEdit = () => {
    if (!currentMatch) return;
    const clonedStats: Record<string, PlayerMatchStats> = JSON.parse(
      JSON.stringify(currentMatch.stats)
    );
    setEditingStatsBuffer(clonedStats);
    const firstPId = Object.keys(clonedStats)[0] || '';
    setSelectedEditPlayerId(firstPId);
    setIsManualEditModalOpen(true);
  };

  const updateStatValue = (
    fieldGroup: 'field' | 'goalkeeper' | 'sanctions',
    fieldKey: string,
    delta: number
  ) => {
    if (!selectedEditPlayerId || !editingStatsBuffer[selectedEditPlayerId]) return;

    setEditingStatsBuffer((prev) => {
      const copy = { ...prev };
      const playerStat = { ...copy[selectedEditPlayerId] };
      const groupObj = { ...(playerStat as any)[fieldGroup] };

      const currentVal = groupObj[fieldKey] || 0;
      const newVal = Math.max(0, currentVal + delta);
      groupObj[fieldKey] = newVal;

      (playerStat as any)[fieldGroup] = groupObj;
      copy[selectedEditPlayerId] = playerStat;
      return copy;
    });
  };

  const handleSaveManualEdit = () => {
    if (!currentMatch) return;
    onUpdateMatchStats(currentMatch.id, editingStatsBuffer);
    setIsManualEditModalOpen(false);
  };

  return (
    <div className="pb-24 pt-2 px-3 max-w-2xl mx-auto space-y-4">
      {/* Intestazione e Azione Nuova Partita */}
      <div className="bg-[#F2F2F2] rounded-2xl p-3 border-2 border-neutral-300 shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase text-neutral-900">
            {t.archive.title}
          </h2>
          <p className="text-xs text-neutral-600 font-medium">
            {matches.length} {t.archive.totalMatchesStored}
          </p>
        </div>

        <div className="w-36">
          <Button3D
            variant="primary"
            text={t.archive.newMatchBtn}
            icon={<Plus className="w-4 h-4" />}
            minHeight={46}
            onClick={handleOpenNewMatch}
          />
        </div>
      </div>

      {/* Banner Notifica Successo Generazione PDF */}
      {pdfSuccessMessage && (
        <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{pdfSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setPdfSuccessMessage(null)}
            className="text-neutral-500 hover:text-neutral-800 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="bg-[#F2F2F2] rounded-2xl p-8 border-2 border-dashed border-neutral-300 text-center space-y-3">
          <Calendar className="w-10 h-10 text-neutral-400 mx-auto" />
          <h3 className="text-base font-black text-neutral-800 uppercase">
            {t.archive.noMatchesTitle}
          </h3>
          <p className="text-xs text-neutral-600 font-medium max-w-sm mx-auto">
            {t.archive.noMatchesDesc}
          </p>
          <div className="pt-2 max-w-xs mx-auto">
            <Button3D
              variant="primary"
              text={t.archive.createFirstMatchBtn}
              icon={<Plus className="w-4 h-4" />}
              minHeight={48}
              onClick={handleOpenNewMatch}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Elenco selettore orizzontale o schede partite */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase text-neutral-800 block">
              {t.archive.selectMatchFromArchive}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {matches.map((m) => {
                const isSelected = currentMatch?.id === m.id;
                const isActive = activeMatchId === m.id;
                const catName = categories.find((c) => c.id === m.categoryId)?.name || t.common.category;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMatchId(m.id)}
                    className={`
                      p-3 rounded-xl border-2 transition-all cursor-pointer text-left relative flex flex-col justify-between
                      ${
                        isSelected
                          ? 'bg-[#00008B] text-white border-amber-400 ring-2 ring-amber-300 shadow-md'
                          : 'bg-white text-neutral-900 border-neutral-300 hover:border-blue-300 shadow-sm'
                      }
                    `}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold opacity-80 mb-1">
                        <span>{catName}</span>
                        <span>{m.date}</span>
                      </div>

                      <div className="font-black text-sm truncate">
                        {m.homeTeam} vs {m.guestTeam}
                      </div>

                      <div className="mt-2 pt-1 border-t border-neutral-200/40 flex items-center justify-between">
                        <span
                          className={`text-base font-black px-2 py-0.5 rounded-lg ${
                            isSelected ? 'bg-white text-[#00008B]' : 'bg-blue-100 text-[#00008B]'
                          }`}
                        >
                          {m.scoreHome} - {m.scoreGuest}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isActive && (
                            <span className="text-[10px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                              {t.archive.liveBadge}
                            </span>
                          )}
                          <button
                            type="button"
                            title={t.archive.quickPdfBtn}
                            aria-label={`PDF ${m.homeTeam} vs ${m.guestTeam}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPdf(m);
                            }}
                            className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300 shadow'
                                : 'bg-neutral-100 hover:bg-neutral-200 text-[#00008B] border border-neutral-300'
                            }`}
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dettagli della Partita Selezionata */}
          {currentMatch && (
            <div className="bg-[#F2F2F2] rounded-2xl p-4 border-2 border-neutral-300 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-neutral-300">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase px-2 py-0.5 bg-[#00008B] text-white rounded">
                      {categories.find((c) => c.id === currentMatch.categoryId)?.name || ''}
                    </span>
                    <span className="text-xs text-neutral-600 font-bold">{currentMatch.date}</span>
                  </div>
                  <h3 className="text-lg font-black text-neutral-900 mt-1">
                    {currentMatch.homeTeam} vs {currentMatch.guestTeam}
                  </h3>
                  {currentMatch.location && (
                    <p className="text-xs text-neutral-600 flex items-center gap-1 font-medium mt-0.5">
                      <MapPin className="w-3.5 h-3.5" /> {currentMatch.location}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="text-2xl font-black bg-[#00008B] text-white px-4 py-2 rounded-xl shadow-inner border border-blue-900">
                    {currentMatch.scoreHome} - {currentMatch.scoreGuest}
                  </div>
                </div>
              </div>

              {/* Pulsanti Azioni Partita */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Button3D
                  variant="primary"
                  text={t.archive.setLiveBtnText}
                  subtext={t.archive.setLiveBtnSub}
                  icon={<PlayCircle className="w-4 h-4" />}
                  minHeight={48}
                  disabled={activeMatchId === currentMatch.id}
                  onClick={() => onSetActiveMatch(currentMatch.id)}
                />

                <Button3D
                  variant="success"
                  text={t.archive.downloadPdfBtnText}
                  subtext={t.archive.downloadPdfBtnSub}
                  icon={<Download className="w-4 h-4" />}
                  minHeight={48}
                  onClick={() => handleDownloadPdf(currentMatch)}
                />

                <Button3D
                  variant="secondary"
                  text={t.archive.previewBtnText}
                  subtext={t.archive.previewBtnSub}
                  icon={<Eye className="w-4 h-4" />}
                  minHeight={48}
                  onClick={() => setIsPdfPreviewModalOpen(true)}
                />

                <Button3D
                  variant="secondary"
                  text={t.archive.editDataBtnText}
                  subtext={t.archive.editDataBtnSub}
                  icon={<Edit className="w-4 h-4" />}
                  minHeight={48}
                  onClick={handleOpenManualEdit}
                />

                <Button3D
                  variant="destructive"
                  text={t.archive.deleteMatchBtnText}
                  subtext={t.archive.deleteMatchBtnSub}
                  icon={<Trash2 className="w-4 h-4" />}
                  minHeight={48}
                  onClick={() => setDeleteConfirmMatchId(currentMatch.id)}
                />
              </div>

              {/* Riepilogo Statistico Totali Squadra */}
              {(() => {
                const totals = calculateTeamTotals(currentMatch.stats);
                return (
                  <div className="bg-white p-3 rounded-xl border border-neutral-300 shadow-sm space-y-2">
                    <span className="text-xs font-black uppercase text-neutral-800 block">
                      {t.archive.teamPerformanceSummary}:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                        <span className="text-neutral-500 block text-[10px] font-bold">{t.archive.goalsShots}</span>
                        <strong className="text-sm text-[#00008B] font-black">
                          {totals.golTotaliSquadra} / {totals.tiriTotaliSquadra}
                        </strong>
                        <span className="block text-[10px] text-neutral-600 font-bold">
                          {totals.percentualeRealizzazioneSquadra}% {t.archive.realizationRate}
                        </span>
                      </div>

                      <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                        <span className="text-neutral-500 block text-[10px] font-bold">{t.archive.assistWinning}</span>
                        <strong className="text-sm text-emerald-700 font-black">
                          {totals.assistTotali}
                        </strong>
                      </div>

                      <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                        <span className="text-neutral-500 block text-[10px] font-bold">{t.archive.lostBalls}</span>
                        <strong className="text-sm text-red-700 font-black">
                          {totals.pallePerseTotali}
                        </strong>
                      </div>

                      <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                        <span className="text-neutral-500 block text-[10px] font-bold">{t.archive.goalkeeperSaves}</span>
                        <strong className="text-sm text-emerald-700 font-black">
                          {totals.parateTotaliPortieri} ({totals.percentualeParatePortieri}%)
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Dettaglio Statistiche Singoli Atleti a Schermo */}
              {(() => {
                const statsList = Object.values(currentMatch.stats);
                const goalkeepers = statsList.filter((s) => s.role === 'PORTIERE').sort((a, b) => a.playerNumber - b.playerNumber);
                const fieldPlayers = statsList.filter((s) => s.role === 'GIOCATORE').sort((a, b) => a.playerNumber - b.playerNumber);

                return (
                  <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-200">
                      <div>
                        <span className="text-xs font-black uppercase text-neutral-900 block">
                          {t.archive.singleAthletesBreakdownTitle}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          {t.archive.singleAthletesBreakdownSub}
                        </span>
                      </div>

                      {/* Selettore Ruoli */}
                      <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setStatsTab('giocatori')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            statsTab === 'giocatori'
                              ? 'bg-[#00008B] text-white shadow-sm'
                              : 'text-neutral-700 hover:text-neutral-950'
                          }`}
                        >
                          {t.archive.fieldPlayersTab} ({fieldPlayers.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatsTab('portieri')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            statsTab === 'portieri'
                              ? 'bg-[#00008B] text-white shadow-sm'
                              : 'text-neutral-700 hover:text-neutral-950'
                          }`}
                        >
                          {t.archive.goalkeepersTab} ({goalkeepers.length})
                        </button>
                      </div>
                    </div>

                    {/* Tabella Giocatori di Movimento */}
                    {statsTab === 'giocatori' && (
                      <div className="overflow-x-auto">
                        {fieldPlayers.length === 0 ? (
                          <div className="py-4 text-center text-xs text-neutral-500 font-semibold italic">
                            {t.archive.noFieldPlayersInMatch}
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-700 font-black text-[11px]">
                                <th className="p-2 text-center w-10">{t.archive.colJersey}</th>
                                <th className="p-2">{t.archive.colAthlete}</th>
                                <th className="p-2 text-center">{t.archive.colGoalsShots}</th>
                                <th className="p-2 text-center">{t.archive.colRealPercent}</th>
                                <th className="p-2 text-center">{t.archive.col7mScoreMiss}</th>
                                <th className="p-2 text-center">{t.archive.colAssist}</th>
                                <th className="p-2 text-center">{t.archive.colLostBalls}</th>
                                <th className="p-2 text-center">{t.archive.colSanctions}</th>
                                <th className="p-2 text-center">{t.archive.colTotalActions}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200">
                              {fieldPlayers.map((fp) => {
                                const calc = calculateFieldPlayerStats(fp.field, fp.sanctions);
                                const sanctionsArr = [
                                  fp.sanctions.giallo > 0 ? `G:${fp.sanctions.giallo}` : null,
                                  fp.sanctions.dueMinuti > 0 ? `2':${fp.sanctions.dueMinuti}` : null,
                                  fp.sanctions.rosso > 0 ? `R:${fp.sanctions.rosso}` : null,
                                  fp.sanctions.blu > 0 ? `B:${fp.sanctions.blu}` : null,
                                ].filter(Boolean).join(' ');

                                return (
                                  <tr key={fp.playerId} className="hover:bg-neutral-50">
                                    <td className="p-2 text-center font-black text-[#00008B]">#{fp.playerNumber}</td>
                                    <td className="p-2 font-bold text-neutral-900">{fp.playerName}</td>
                                    <td className="p-2 text-center font-black text-neutral-900">
                                      {calc.golTotali} / {calc.tiriTotali}
                                    </td>
                                    <td className="p-2 text-center font-bold text-emerald-700">{calc.percentualeRealizzazione}%</td>
                                    <td className="p-2 text-center font-medium text-neutral-700">{calc.rigoriGol}/{calc.rigoriPersi}</td>
                                    <td className="p-2 text-center font-bold text-neutral-800">{calc.assist}</td>
                                    <td className="p-2 text-center font-bold text-red-600">{calc.pallePerseTotali}</td>
                                    <td className="p-2 text-center text-[10px] font-bold text-amber-900">{sanctionsArr || '-'}</td>
                                    <td className="p-2 text-center font-black text-[#00008B]">{calc.totaleAzioni}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* Tabella Portieri */}
                    {statsTab === 'portieri' && (
                      <div className="overflow-x-auto">
                        {goalkeepers.length === 0 ? (
                          <div className="py-4 text-center text-xs text-neutral-500 font-semibold italic">
                            {t.archive.noGoalkeepersInMatch}
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-700 font-black text-[11px]">
                                <th className="p-2 text-center w-10">{t.archive.colJersey}</th>
                                <th className="p-2">{t.archive.colAthlete}</th>
                                <th className="p-2 text-center">{t.archive.colSavesPlay}</th>
                                <th className="p-2 text-center">{t.archive.colConcededPlay}</th>
                                <th className="p-2 text-center">{t.archive.col7mSaveConceded}</th>
                                <th className="p-2 text-center">{t.archive.colSavesTotal}</th>
                                <th className="p-2 text-center">{t.archive.colSavePercent}</th>
                                <th className="p-2 text-center">{t.archive.colSanctions}</th>
                                <th className="p-2 text-center">{t.archive.colTotalActions}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200">
                              {goalkeepers.map((gk) => {
                                const calc = calculateGoalkeeperStats(gk.goalkeeper, gk.sanctions);
                                const sanctionsArr = [
                                  gk.sanctions.giallo > 0 ? `G:${gk.sanctions.giallo}` : null,
                                  gk.sanctions.dueMinuti > 0 ? `2':${gk.sanctions.dueMinuti}` : null,
                                  gk.sanctions.rosso > 0 ? `R:${gk.sanctions.rosso}` : null,
                                  gk.sanctions.blu > 0 ? `B:${gk.sanctions.blu}` : null,
                                ].filter(Boolean).join(' ');

                                return (
                                  <tr key={gk.playerId} className="hover:bg-neutral-50">
                                    <td className="p-2 text-center font-black text-emerald-800">#{gk.playerNumber}</td>
                                    <td className="p-2 font-bold text-neutral-900">{gk.playerName}</td>
                                    <td className="p-2 text-center font-bold text-emerald-700">{calc.parateInGioco}</td>
                                    <td className="p-2 text-center font-bold text-red-600">{calc.golSubitiInGioco}</td>
                                    <td className="p-2 text-center font-medium text-neutral-700">{calc.rigoriParati}/{calc.rigoriSubiti}</td>
                                    <td className="p-2 text-center font-black text-emerald-800">{calc.parateTotali}</td>
                                    <td className="p-2 text-center font-black text-[#00008B]">{calc.percentualeParateTotale}%</td>
                                    <td className="p-2 text-center text-[10px] font-bold text-amber-900">{sanctionsArr || '-'}</td>
                                    <td className="p-2 text-center font-black text-[#00008B]">{calc.totaleAzioni}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* Banner Azione Rapida PDF */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#00008B] flex-shrink-0" />
                        <span className="text-xs text-blue-900 font-bold">
                          {t.archive.downloadBannerText}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(currentMatch)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#00008B] hover:bg-blue-900 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow transition-colors flex-shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{t.archive.downloadBannerBtn}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* MODALE NUOVA PARTITA */}
      {isNewMatchModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] overflow-hidden flex flex-col">
            <div className="bg-[#00008B] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-black text-base uppercase">{t.archive.modalNewMatchTitle}</h3>
              <button
                type="button"
                onClick={() => setIsNewMatchModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 space-y-3.5">
              {formError && (
                <div className="p-2.5 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Squadra Casa */}
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                  {t.archive.homeTeamLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.common.home}
                  value={newHomeTeam}
                  onChange={(e) => setNewHomeTeam(e.target.value)}
                  className="w-full h-11 px-3 bg-white border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:outline-none"
                />
              </div>

              {/* Squadra Ospiti */}
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                  {t.archive.guestTeamLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.common.guest}
                  value={newGuestTeam}
                  onChange={(e) => setNewGuestTeam(e.target.value)}
                  className="w-full h-11 px-3 bg-white border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:outline-none"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                  {t.common.category}:
                </label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full h-11 px-3 bg-white border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Incontro */}
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                  {t.archive.matchDateLabel}
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full h-11 px-3 bg-white border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:outline-none"
                />
              </div>

              {/* Luogo */}
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                  {t.archive.venueLabel}:
                </label>
                <input
                  type="text"
                  placeholder={t.archive.venuePlaceholder}
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full h-11 px-3 bg-white border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button3D
                  variant="secondary"
                  text={t.common.cancel}
                  onClick={() => setIsNewMatchModalOpen(false)}
                  minHeight={46}
                />
                <Button3D
                  variant="primary"
                  type="submit"
                  text={t.archive.startMatchBtn}
                  minHeight={46}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE MODIFICA MANUALE STATISTICHE */}
      {isManualEditModalOpen && currentMatch && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-[#00008B] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-black text-base uppercase">
                {t.archive.manualEditTitle}
              </h3>
              <button
                type="button"
                onClick={() => setIsManualEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {/* Selezione Atleta da correggere */}
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                  {t.archive.selectAthleteToCorrect}
                </label>
                <select
                  value={selectedEditPlayerId}
                  onChange={(e) => setSelectedEditPlayerId(e.target.value)}
                  className="w-full h-11 px-3 bg-white border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:outline-none"
                >
                  {Object.values(editingStatsBuffer).map((st) => (
                    <option key={st.playerId} value={st.playerId}>
                      #{st.playerNumber} {st.playerName} ({st.role === 'PORTIERE' ? t.common.goalkeeperShort : t.common.fieldPlayerShort})
                    </option>
                  ))}
                </select>
              </div>

              {/* Stepper di rettifica a seconda del ruolo */}
              {selectedEditPlayerId && editingStatsBuffer[selectedEditPlayerId] && (
                <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm space-y-3">
                  <div className="font-black text-sm text-neutral-900 pb-2 border-b border-neutral-200">
                    {t.archive.countersFor} #{editingStatsBuffer[selectedEditPlayerId].playerNumber} {editingStatsBuffer[selectedEditPlayerId].playerName}
                  </div>

                  {editingStatsBuffer[selectedEditPlayerId].role === 'PORTIERE' ? (
                    <div className="space-y-2">
                      <StepperRow
                        label={t.archive.colSavesPlay}
                        value={editingStatsBuffer[selectedEditPlayerId].goalkeeper.parate}
                        onMinus={() => updateStatValue('goalkeeper', 'parate', -1)}
                        onPlus={() => updateStatValue('goalkeeper', 'parate', 1)}
                      />
                      <StepperRow
                        label={t.archive.colConcededPlay}
                        value={editingStatsBuffer[selectedEditPlayerId].goalkeeper.golSubiti}
                        onMinus={() => updateStatValue('goalkeeper', 'golSubiti', -1)}
                        onPlus={() => updateStatValue('goalkeeper', 'golSubiti', 1)}
                      />
                      <StepperRow
                        label={t.pdfReport.col7mSaves}
                        value={editingStatsBuffer[selectedEditPlayerId].goalkeeper.rigoriParati}
                        onMinus={() => updateStatValue('goalkeeper', 'rigoriParati', -1)}
                        onPlus={() => updateStatValue('goalkeeper', 'rigoriParati', 1)}
                      />
                      <StepperRow
                        label={t.pdfReport.col7mConceded}
                        value={editingStatsBuffer[selectedEditPlayerId].goalkeeper.rigoriSubiti}
                        onMinus={() => updateStatValue('goalkeeper', 'rigoriSubiti', -1)}
                        onPlus={() => updateStatValue('goalkeeper', 'rigoriSubiti', 1)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <StepperRow
                        label={t.scout.goalAction}
                        value={editingStatsBuffer[selectedEditPlayerId].field.gol}
                        onMinus={() => updateStatValue('field', 'gol', -1)}
                        onPlus={() => updateStatValue('field', 'gol', 1)}
                      />
                      <StepperRow
                        label={t.scout.missedAction}
                        value={editingStatsBuffer[selectedEditPlayerId].field.tiriFuori}
                        onMinus={() => updateStatValue('field', 'tiriFuori', -1)}
                        onPlus={() => updateStatValue('field', 'tiriFuori', 1)}
                      />
                      <StepperRow
                        label={t.scout.goal7mAction}
                        value={editingStatsBuffer[selectedEditPlayerId].field.rigoriGol}
                        onMinus={() => updateStatValue('field', 'rigoriGol', -1)}
                        onPlus={() => updateStatValue('field', 'rigoriGol', 1)}
                      />
                      <StepperRow
                        label={t.scout.missed7mAction}
                        value={editingStatsBuffer[selectedEditPlayerId].field.rigoriPersi}
                        onMinus={() => updateStatValue('field', 'rigoriPersi', -1)}
                        onPlus={() => updateStatValue('field', 'rigoriPersi', 1)}
                      />
                      <StepperRow
                        label={t.scout.assistAction}
                        value={editingStatsBuffer[selectedEditPlayerId].field.assist}
                        onMinus={() => updateStatValue('field', 'assist', -1)}
                        onPlus={() => updateStatValue('field', 'assist', 1)}
                      />
                      <StepperRow
                        label={t.scout.lostPassAction}
                        value={editingStatsBuffer[selectedEditPlayerId].field.passaggiPersi}
                        onMinus={() => updateStatValue('field', 'passaggiPersi', -1)}
                        onPlus={() => updateStatValue('field', 'passaggiPersi', 1)}
                      />
                      <StepperRow
                        label={t.scout.lostCatchAction}
                        value={editingStatsBuffer[selectedEditPlayerId].field.passaggiPersiRicezione}
                        onMinus={() => updateStatValue('field', 'passaggiPersiRicezione', -1)}
                        onPlus={() => updateStatValue('field', 'passaggiPersiRicezione', 1)}
                      />
                    </div>
                  )}

                  {/* Sanzioni */}
                  <div className="pt-2 border-t border-neutral-200">
                    <span className="text-xs font-bold text-neutral-700 block mb-1.5">{t.archive.colSanctions}:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <StepperRow
                        label="Giallo (Yellow)"
                        value={editingStatsBuffer[selectedEditPlayerId].sanctions.giallo}
                        onMinus={() => updateStatValue('sanctions', 'giallo', -1)}
                        onPlus={() => updateStatValue('sanctions', 'giallo', 1)}
                      />
                      <StepperRow
                        label="2 Minuti"
                        value={editingStatsBuffer[selectedEditPlayerId].sanctions.dueMinuti}
                        onMinus={() => updateStatValue('sanctions', 'dueMinuti', -1)}
                        onPlus={() => updateStatValue('sanctions', 'dueMinuti', 1)}
                      />
                      <StepperRow
                        label="Rosso (Red)"
                        value={editingStatsBuffer[selectedEditPlayerId].sanctions.rosso}
                        onMinus={() => updateStatValue('sanctions', 'rosso', -1)}
                        onPlus={() => updateStatValue('sanctions', 'rosso', 1)}
                      />
                      <StepperRow
                        label="Blu (Blue)"
                        value={editingStatsBuffer[selectedEditPlayerId].sanctions.blu}
                        onMinus={() => updateStatValue('sanctions', 'blu', -1)}
                        onPlus={() => updateStatValue('sanctions', 'blu', 1)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-neutral-200 border-t border-neutral-300 flex justify-end gap-2">
              <Button3D
                variant="secondary"
                text={t.archive.discardChanges}
                onClick={() => setIsManualEditModalOpen(false)}
                fullWidth={false}
                minHeight={42}
                className="w-auto px-5"
              />
              <Button3D
                variant="primary"
                text={t.archive.saveCorrections}
                onClick={handleSaveManualEdit}
                fullWidth={false}
                minHeight={42}
                className="w-auto px-6"
              />
            </div>
          </div>
        </div>
      )}

      {/* CONFERMA ELIMINAZIONE PARTITA */}
      {deleteConfirmMatchId && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-red-600 p-4 space-y-3">
            <h3 className="font-black text-base uppercase text-neutral-900">
              {t.archive.deleteMatchConfirmTitle}
            </h3>
            <p className="text-xs text-neutral-700 font-medium">
              {t.archive.deleteMatchConfirmMsg}
            </p>
            <div className="pt-2 flex gap-2">
              <Button3D
                variant="secondary"
                text={t.common.cancel}
                onClick={() => setDeleteConfirmMatchId(null)}
                minHeight={44}
              />
              <Button3D
                variant="destructive"
                text={t.archive.deleteDefinitiveBtn}
                onClick={() => {
                  onDeleteMatch(deleteConfirmMatchId);
                  setDeleteConfirmMatchId(null);
                }}
                minHeight={44}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODALE ANTEPRIMA REFERTO TECNICO PDF */}
      {isPdfPreviewModalOpen && currentMatch && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-preview-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header Dialog */}
            <div className="bg-[#00008B] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-300" />
                <h3 id="pdf-preview-title" className="text-sm sm:text-base font-black tracking-wide uppercase">
                  {t.archive.pdfPreviewTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPdfPreviewModalOpen(false)}
                aria-label={t.common.close}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fascia tricolore decorativa */}
            <div className="h-1.5 w-full flex">
              <div className="w-1/3 h-full bg-[#008C45]" />
              <div className="w-1/3 h-full bg-[#F4F5F0]" />
              <div className="w-1/3 h-full bg-[#CD212A]" />
            </div>

            {/* Contenuto scorrevole anteprima */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
              {/* Box Intestazione Partita */}
              <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold text-neutral-500 border-b border-neutral-200 pb-1">
                  <span>{t.common.category}: {categories.find((c) => c.id === currentMatch.categoryId)?.name || t.common.category}</span>
                  <span>{t.common.date}: {currentMatch.date}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="font-black text-sm text-neutral-900">
                    {currentMatch.homeTeam} vs {currentMatch.guestTeam}
                  </div>
                  <div className="bg-[#00008B] text-white font-black text-sm px-2.5 py-0.5 rounded-lg shadow-inner">
                    {currentMatch.scoreHome} - {currentMatch.scoreGuest}
                  </div>
                </div>
                {currentMatch.location && (
                  <p className="text-[11px] text-neutral-600 flex items-center gap-1 font-medium">
                    <MapPin className="w-3 h-3" /> {currentMatch.location}
                  </p>
                )}
                {currentMatch.notes && (
                  <p className="text-[11px] text-neutral-600 italic bg-neutral-50 p-1.5 rounded border border-neutral-200">
                    {t.common.notes}: {currentMatch.notes}
                  </p>
                )}
              </div>

              {/* Box Riepilogo Squadra */}
              {(() => {
                const totals = calculateTeamTotals(currentMatch.stats);
                return (
                  <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm space-y-2">
                    <span className="font-black uppercase text-neutral-900 text-xs block">
                      {t.archive.pdfPreviewPerformanceIndicators}:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-1.5 bg-neutral-50 rounded-lg border border-neutral-200">
                        <span className="text-[10px] text-neutral-500 font-bold block">{t.archive.goalsShots}</span>
                        <strong className="text-sm font-black text-[#00008B]">{totals.golTotaliSquadra} / {totals.tiriTotaliSquadra}</strong>
                        <span className="text-[10px] text-neutral-600 block">{totals.percentualeRealizzazioneSquadra}%</span>
                      </div>
                      <div className="p-1.5 bg-neutral-50 rounded-lg border border-neutral-200">
                        <span className="text-[10px] text-neutral-500 font-bold block">{t.archive.assistWinning}</span>
                        <strong className="text-sm font-black text-emerald-700">{totals.assistTotali}</strong>
                      </div>
                      <div className="p-1.5 bg-neutral-50 rounded-lg border border-neutral-200">
                        <span className="text-[10px] text-neutral-500 font-bold block">{t.archive.lostBalls}</span>
                        <strong className="text-sm font-black text-red-600">{totals.pallePerseTotali}</strong>
                      </div>
                      <div className="p-1.5 bg-neutral-50 rounded-lg border border-neutral-200">
                        <span className="text-[10px] text-neutral-500 font-bold block">{t.archive.goalkeeperSaves}</span>
                        <strong className="text-sm font-black text-emerald-700">{totals.parateTotaliPortieri} ({totals.percentualeParatePortieri}%)</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Elenco Sezioni Incluse */}
              <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm space-y-2">
                <span className="font-black uppercase text-neutral-900 text-xs block">
                  {t.archive.pdfPreviewSectionsIncluded}:
                </span>
                <ul className="space-y-1.5 text-neutral-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span><strong>{t.archive.pdfPreviewHeaderDesc}</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span><strong>{t.archive.pdfPreviewFieldDesc}</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span><strong>{t.archive.pdfPreviewGkDesc}</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span><strong>{t.archive.pdfPreviewTeamDesc}</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span><strong>{t.archive.pdfPreviewFooterDesc}</strong></span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer con pulsante di download */}
            <div className="p-3 bg-neutral-200 border-t border-neutral-300 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-[11px] text-neutral-600 font-medium">
                {t.archive.pdfPreviewReadyFooter}
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button3D
                  variant="secondary"
                  text={t.archive.pdfPreviewCloseBtn}
                  onClick={() => setIsPdfPreviewModalOpen(false)}
                  fullWidth={false}
                  minHeight={42}
                  className="w-auto px-4"
                />
                <Button3D
                  variant="success"
                  text={t.archive.pdfPreviewDownloadBtn}
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => {
                    handleDownloadPdf(currentMatch);
                    setIsPdfPreviewModalOpen(false);
                  }}
                  fullWidth={false}
                  minHeight={42}
                  className="w-auto px-5"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente riga stepper per la modifica manuale
interface StepperRowProps {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}

const StepperRow: React.FC<StepperRowProps> = ({ label, value, onMinus, onPlus }) => (
  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-neutral-50 border border-neutral-200">
    <span className="text-xs font-bold text-neutral-800">{label}</span>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onMinus}
        disabled={value <= 0}
        className="w-7 h-7 rounded-md bg-neutral-200 hover:bg-neutral-300 disabled:opacity-30 flex items-center justify-center text-neutral-800 font-bold transition-colors cursor-pointer"
      >
        -
      </button>
      <span className="w-8 text-center font-black text-sm text-[#00008B]">{value}</span>
      <button
        type="button"
        onClick={onPlus}
        className="w-7 h-7 rounded-md bg-[#00008B] hover:bg-blue-800 flex items-center justify-center text-white font-bold transition-colors cursor-pointer shadow-sm"
      >
        +
      </button>
    </div>
  </div>
);
