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
} from '../types/scout';
import {
  filterMatchesAdvanced,
  getMatchPlayStatus,
  getMatchesToPlay,
  groupMatchesByDate,
} from '../utils/stats';
import { ConvocatiChecklistPanel } from './ConvocatiModal';
import { Button3D } from './Button3D';
import {
  X,
  Calendar as CalendarIcon,
  ListChecks,
  Play,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Building2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface MatchScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'LIST' | 'CALENDAR';
  matches: HandballMatch[];
  activeMatchId: string | null;
  categories: Category[];
  players: Player[];
  clubInfo?: ClubInfo;
  onSelectMatch: (matchId: string) => void;
  onCreateMatch?: (data: {
    homeTeam: string;
    guestTeam: string;
    categoryId: string;
    date: string;
    location: string;
    notes: string;
    isAwayMatch?: boolean;
    convocatedPlayerIds?: string[];
    setAsActive?: boolean;
  }) => { success: boolean; error?: string };
}

function formatIsoDate(year: number, monthIndex0: number, day: number): string {
  const m = String(monthIndex0 + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export const MatchScheduleModal: React.FC<MatchScheduleModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'LIST',
  matches,
  activeMatchId,
  categories,
  players,
  clubInfo,
  onSelectMatch,
  onCreateMatch,
}) => {
  const { t, locale } = useI18n();
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR' | 'NEW'>(initialTab);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TO_PLAY' | 'PLAYED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Stato Vista Calendario
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  // Stato Form Nuova Partita in Calendario
  const [matchMode, setMatchMode] = useState<'CASA' | 'TRASFERTA'>('CASA');
  const [newHomeTeam, setNewHomeTeam] = useState(clubInfo?.name || 'Squadra Locale');
  const [newGuestTeam, setNewGuestTeam] = useState('');
  const [newCategoryId, setNewCategoryId] = useState(categories[0]?.id || '');
  const [newDate, setNewDate] = useState(todayIso);
  const [newLocation, setNewLocation] = useState(clubInfo?.gymnasium || '');
  const [selectedConvocatedIds, setSelectedConvocatedIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setViewMode(initialTab);
      setSearchQuery('');
      setCategoryFilter('ALL');
      setFormError(null);

      // Se ci sono partite da giocare e si apre in lista, mostra subito il filtro utile o Tutte
      const toPlayCount = matches.filter((m) => getMatchPlayStatus(m, activeMatchId) === 'TO_PLAY').length;
      setStatusFilter(toPlayCount > 0 ? 'TO_PLAY' : 'ALL');

      // Centra il calendario sul giorno odierno (o sulla prossima partita se futura)
      const now = new Date();
      setCalendarYear(now.getFullYear());
      setCalendarMonth(now.getMonth());
      setSelectedDate(todayIso);
    }
  }, [isOpen, initialTab, todayIso]);

  const toPlayMatches = useMemo(() => getMatchesToPlay(matches, todayIso), [matches, todayIso]);
  const playedOrLiveCount = matches.length - toPlayMatches.length;

  const nextUpcomingMatch = useMemo(() => {
    return toPlayMatches.find((m) => m.id !== activeMatchId) || toPlayMatches[0] || null;
  }, [toPlayMatches, activeMatchId]);

  const filteredListMatches = useMemo(() => {
    const base = filterMatchesAdvanced(matches, categories, {
      search: searchQuery,
      categoryId: categoryFilter,
      sortBy: statusFilter === 'TO_PLAY' ? 'DATE_ASC' : 'DATE_DESC',
    });

    if (statusFilter === 'TO_PLAY') {
      return base.filter((m) => getMatchPlayStatus(m, activeMatchId) === 'TO_PLAY');
    }
    if (statusFilter === 'PLAYED') {
      return base.filter((m) => getMatchPlayStatus(m, activeMatchId) !== 'TO_PLAY');
    }
    // In 'ALL', ordina mettendo prima Da Giocare / Live e poi Giocate
    return [...base].sort((a, b) => {
      const sa = getMatchPlayStatus(a, activeMatchId);
      const sb = getMatchPlayStatus(b, activeMatchId);
      const rank = (s: string) => (s === 'IN_PROGRESS' ? 0 : s === 'TO_PLAY' ? 1 : 2);
      if (rank(sa) !== rank(sb)) return rank(sa) - rank(sb);
      if (sa === 'TO_PLAY') return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
      return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
    });
  }, [matches, categories, searchQuery, categoryFilter, statusFilter, activeMatchId]);

  const matchesByDate = useMemo(() => groupMatchesByDate(matches), [matches]);

  const selectedDateMatches = useMemo(() => {
    return matchesByDate[selectedDate] || [];
  }, [matchesByDate, selectedDate]);

  const newMatchCategoryPlayers = useMemo(() => {
    return players
      .filter((p) => p.categoryId === newCategoryId)
      .sort((a, b) => a.number - b.number);
  }, [players, newCategoryId]);

  // Griglia giorni del mese (settimana che inizia di Lunedì)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    // getDay(): 0=Dom, 1=Lun ... 6=Sab -> converti a 0=Lun ... 6=Dom
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: Array<{ day: number | null; isoDate: string | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, isoDate: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        day,
        isoDate: formatIsoDate(calendarYear, calendarMonth, day),
      });
    }
    return cells;
  }, [calendarYear, calendarMonth]);

  if (!isOpen) return null;

  const weekdayLabels =
    locale === 'it'
      ? ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const monthTitle = new Date(calendarYear, calendarMonth, 1).toLocaleDateString(
    locale === 'it' ? 'it-IT' : 'en-US',
    { month: 'long', year: 'numeric' }
  );

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth());
    setSelectedDate(todayIso);
  };

  const handleOpenNewForm = (prefillDate?: string) => {
    const defaultCatId = categories[0]?.id || '';
    setMatchMode('CASA');
    setNewHomeTeam(clubInfo?.name || 'Squadra Locale');
    setNewGuestTeam('');
    setNewCategoryId(defaultCatId);
    setNewDate(prefillDate || selectedDate || todayIso);
    setNewLocation(clubInfo?.gymnasium || '');
    setSelectedConvocatedIds(
      players.filter((p) => p.categoryId === defaultCatId).map((p) => p.id)
    );
    setFormError(null);
    setViewMode('NEW');
  };

  const handleNewCategoryChange = (catId: string) => {
    setNewCategoryId(catId);
    setSelectedConvocatedIds(players.filter((p) => p.categoryId === catId).map((p) => p.id));
    setFormError(null);
  };

  const handleCreateScheduleMatch = (startLive: boolean) => {
    if (!onCreateMatch) return;
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

    const catPlayers = players.filter((p) => p.categoryId === newCategoryId);
    if (catPlayers.length === 0) {
      setFormError(t.archive.errorNoAthletesInCategory);
      return;
    }

    if (selectedConvocatedIds.length === 0) {
      setFormError(t.convocati.errorMinOnePlayer);
      return;
    }

    const res = onCreateMatch({
      homeTeam: newHomeTeam.trim(),
      guestTeam: newGuestTeam.trim(),
      categoryId: newCategoryId,
      date: newDate,
      location: newLocation.trim(),
      notes: '',
      isAwayMatch: matchMode === 'TRASFERTA',
      convocatedPlayerIds: selectedConvocatedIds,
      setAsActive: startLive,
    });

    if (!res.success) {
      setFormError(res.error || t.common.error);
      return;
    }

    if (startLive) {
      onClose();
    } else {
      // Centra il calendario sulla data appena programmata
      const parts = newDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setCalendarYear(parts[0]);
        setCalendarMonth(parts[1] - 1);
      }
      setSelectedDate(newDate);
      setViewMode('CALENDAR');
    }
  };

  const handleSelectAndClose = (matchId: string) => {
    onSelectMatch(matchId);
    onClose();
  };

  const renderMatchRow = (m: HandballMatch) => {
    const status = getMatchPlayStatus(m, activeMatchId);
    const isCurrentActive = m.id === activeMatchId;
    const catName = categories.find((c) => c.id === m.categoryId)?.name || t.common.category;

    return (
      <div
        key={m.id}
        className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between gap-2.5 ${
          isCurrentActive
            ? 'bg-blue-50 border-[#00008B] ring-1 ring-blue-300 shadow-sm'
            : status === 'TO_PLAY'
            ? 'bg-white border-emerald-400 hover:border-emerald-600 shadow-sm'
            : 'bg-white border-neutral-300 hover:border-blue-400 shadow-sm'
        }`}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="bg-[#00008B] text-white text-[10px] font-black px-1.5 py-0.5 rounded">
              {catName}
            </span>
            <span className="text-[11px] font-bold text-neutral-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {m.date}
            </span>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                m.isAwayMatch
                  ? 'bg-amber-200 text-amber-950'
                  : 'bg-emerald-100 text-emerald-900'
              }`}
            >
              {m.isAwayMatch ? '✈️ TRASFERTA' : '🏠 CASA'}
            </span>
            {status === 'TO_PLAY' ? (
              <span className="bg-amber-400 text-neutral-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                {t.schedule.statusToPlay}
              </span>
            ) : isCurrentActive ? (
              <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                {t.schedule.statusLiveNow}
              </span>
            ) : (
              <span className="bg-neutral-200 text-neutral-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                {t.schedule.statusPlayed} ({m.scoreHome}-{m.scoreGuest})
              </span>
            )}
          </div>

          <div className="font-black text-sm text-neutral-900 truncate">
            {m.homeTeam} <span className="text-neutral-400 font-bold">vs</span> {m.guestTeam}
          </div>

          {m.location && (
            <div className="text-[11px] text-neutral-500 font-semibold flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{m.location}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleSelectAndClose(m.id)}
          className={`px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 flex-shrink-0 cursor-pointer transition-all shadow-sm active:scale-95 ${
            isCurrentActive
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
              : 'bg-[#00008B] hover:bg-blue-900 text-white border border-blue-950'
          }`}
        >
          {isCurrentActive ? (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{t.schedule.currentlyActiveBtn}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.schedule.playLiveBtn}</span>
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-schedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Navy */}
        <div className="bg-[#00008B] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarIcon className="w-5 h-5 text-amber-300 flex-shrink-0" />
            <h3 id="match-schedule-modal-title" className="text-sm sm:text-base font-black uppercase tracking-wide truncate">
              {t.schedule.modalTitle}
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
        <div className="bg-[#000066] text-white px-4 py-1.5 flex items-center justify-between border-t border-blue-900 text-xs flex-shrink-0">
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
            {toPlayMatches.length} {t.schedule.filterToPlay}
          </span>
        </div>

        {/* Fascia Tricolore */}
        <div className="h-1.5 w-full flex flex-shrink-0">
          <div className="w-1/3 h-full bg-[#008C45]" />
          <div className="w-1/3 h-full bg-[#F4F5F0]" />
          <div className="w-1/3 h-full bg-[#CD212A]" />
        </div>

        {/* Barra Tab Principale: Lista / Calendario / Nuova */}
        {viewMode !== 'NEW' && (
          <div className="bg-neutral-200 px-3 py-2 border-b border-neutral-300 flex items-center justify-between gap-2 flex-wrap flex-shrink-0">
            <div className="flex gap-1 bg-white p-1 rounded-xl border border-neutral-300">
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewMode === 'LIST'
                    ? 'bg-[#00008B] text-white shadow-sm'
                    : 'text-neutral-700 hover:text-neutral-950'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>{t.schedule.tabList}</span>
                {toPlayMatches.length > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      viewMode === 'LIST'
                        ? 'bg-amber-400 text-neutral-950'
                        : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    {toPlayMatches.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('CALENDAR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewMode === 'CALENDAR'
                    ? 'bg-[#00008B] text-white shadow-sm'
                    : 'text-neutral-700 hover:text-neutral-950'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{t.schedule.tabCalendar}</span>
              </button>
            </div>

            {onCreateMatch && categories.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenNewForm(viewMode === 'CALENDAR' ? selectedDate : todayIso)}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.schedule.scheduleNewBtn}</span>
              </button>
            )}
          </div>
        )}

        {/* Corpo Scorrevole */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1">
          {/* ========================================== */}
          {/* VISTA 1: LISTA PARTITE DA GIOCARE / TUTTE  */}
          {/* ========================================== */}
          {viewMode === 'LIST' && (
            <div className="space-y-3">
              {/* Scorciatoia Prossima Partita in Calendario */}
              {nextUpcomingMatch && (
                <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-xl p-3 border-2 border-amber-400 shadow-sm flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">
                      ⚡ {t.schedule.nextToPlayBanner} • {nextUpcomingMatch.date}
                    </span>
                    <div className="font-black text-sm text-neutral-900 truncate">
                      {nextUpcomingMatch.homeTeam} vs {nextUpcomingMatch.guestTeam}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectAndClose(nextUpcomingMatch.id)}
                    className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow flex-shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t.schedule.playLiveBtn}</span>
                  </button>
                </div>
              )}

              {/* Filtri Stato + Ricerca + Categoria */}
              <div className="bg-white rounded-xl p-2.5 border border-neutral-300 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('TO_PLAY')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      statusFilter === 'TO_PLAY'
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {t.schedule.filterToPlay} ({toPlayMatches.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      statusFilter === 'ALL'
                        ? 'bg-[#00008B] text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {t.schedule.filterAll} ({matches.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('PLAYED')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      statusFilter === 'PLAYED'
                        ? 'bg-[#00008B] text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {t.schedule.filterPlayed} ({playedOrLiveCount})
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="relative sm:col-span-2">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.filters.searchMatchPlaceholder}
                      className="w-full h-9 pl-8 pr-7 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
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

                  <select
                    aria-label={t.filters.categoryFilterLabel}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-9 px-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                  >
                    <option value="ALL">{t.schedule.allCategoriesOption}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Elenco Partite Filtrate */}
              {filteredListMatches.length === 0 ? (
                <div className="bg-white rounded-xl p-6 border-2 border-dashed border-neutral-300 text-center space-y-2.5">
                  <CalendarIcon className="w-8 h-8 text-neutral-400 mx-auto" />
                  <p className="text-xs font-bold text-neutral-600">
                    {t.schedule.noMatchesInFilter}
                  </p>
                  {onCreateMatch && categories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenNewForm(todayIso)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.schedule.scheduleNewBtn}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredListMatches.map(renderMatchRow)}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* VISTA 2: CALENDARIO MENSILE INTERATTIVO    */}
          {/* ========================================== */}
          {viewMode === 'CALENDAR' && (
            <div className="space-y-3">
              {/* Controlli Mese */}
              <div className="bg-white rounded-xl p-3 border border-neutral-300 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Prev"
                    className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 flex items-center justify-center text-neutral-800 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black uppercase text-[#00008B]">
                      {monthTitle}
                    </span>
                    <button
                      type="button"
                      onClick={handleGoToday}
                      className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-[#00008B] border border-blue-200 text-[10px] font-black cursor-pointer"
                    >
                      {t.schedule.todayBtn}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next"
                    className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 flex items-center justify-center text-neutral-800 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Intestazione Giorni Settimana */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {weekdayLabels.map((wd) => (
                    <span
                      key={wd}
                      className="text-[10px] font-black uppercase text-neutral-500 py-1"
                    >
                      {wd}
                    </span>
                  ))}
                </div>

                {/* Celle Giorni */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((cell, idx) => {
                    if (!cell.day || !cell.isoDate) {
                      return <div key={`empty-${idx}`} className="h-11 rounded-lg bg-neutral-50/50" />;
                    }

                    const dayMatches = matchesByDate[cell.isoDate] || [];
                    const toPlayInDay = dayMatches.filter(
                      (m) => getMatchPlayStatus(m, activeMatchId) === 'TO_PLAY'
                    ).length;
                    const playedInDay = dayMatches.length - toPlayInDay;
                    const isSelected = selectedDate === cell.isoDate;
                    const isToday = todayIso === cell.isoDate;

                    return (
                      <button
                        key={cell.isoDate}
                        type="button"
                        onClick={() => setSelectedDate(cell.isoDate!)}
                        className={`h-11 rounded-lg border flex flex-col items-center justify-between py-1 px-1 transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-[#00008B] text-white border-amber-400 ring-2 ring-amber-300 shadow'
                            : isToday
                            ? 'bg-blue-50 text-[#00008B] border-[#00008B] font-black'
                            : dayMatches.length > 0
                            ? 'bg-emerald-50/70 text-neutral-900 border-emerald-300 hover:border-[#00008B]'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        <span className="text-xs font-black leading-none">{cell.day}</span>
                        <div className="flex items-center gap-0.5">
                          {toPlayInDay > 0 && (
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isSelected ? 'bg-amber-300' : 'bg-emerald-600'
                              }`}
                              title={`${toPlayInDay} ${t.schedule.legendToPlay}`}
                            />
                          )}
                          {playedInDay > 0 && (
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-[#00008B]'
                              }`}
                              title={`${playedInDay} ${t.schedule.legendPlayed}`}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div className="flex items-center justify-center gap-4 pt-1 border-t border-neutral-200 text-[10px] font-bold text-neutral-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                    {t.schedule.legendToPlay}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00008B] inline-block" />
                    {t.schedule.legendPlayed}
                  </span>
                </div>
              </div>

              {/* Partite nella Data Selezionata */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase text-neutral-800">
                    {t.schedule.matchesOnDateTitle} {selectedDate} ({selectedDateMatches.length})
                  </span>
                  {onCreateMatch && categories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenNewForm(selectedDate)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t.schedule.createForDateBtn}</span>
                    </button>
                  )}
                </div>

                {selectedDateMatches.length === 0 ? (
                  <div className="bg-white rounded-xl p-4 border border-dashed border-neutral-300 text-center text-xs font-bold text-neutral-500">
                    {t.schedule.noMatchesOnDate}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDateMatches.map(renderMatchRow)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VISTA 3: PROGRAMMA NUOVA PARTITA           */}
          {/* ========================================== */}
          {viewMode === 'NEW' && onCreateMatch && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-300 text-xs font-black text-neutral-800 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t.schedule.backToListBtn}</span>
                </button>
                <span className="text-xs font-black uppercase text-[#00008B]">
                  {t.schedule.scheduleNewBtn}
                </span>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="bg-white rounded-xl p-3 border border-neutral-300 space-y-3">
                {/* Casa / Trasferta */}
                <div className="grid grid-cols-2 gap-2 bg-neutral-200 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMatchMode('CASA');
                      setNewHomeTeam(clubInfo?.name || 'Squadra Locale');
                      setNewGuestTeam('');
                      setNewLocation(clubInfo?.gymnasium || '');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      matchMode === 'CASA' ? 'bg-[#00008B] text-white shadow' : 'text-neutral-700'
                    }`}
                  >
                    {t.archive.homeMatchMode}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMatchMode('TRASFERTA');
                      setNewHomeTeam('');
                      setNewGuestTeam(clubInfo?.name || 'Squadra Locale');
                      setNewLocation('');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      matchMode === 'TRASFERTA' ? 'bg-[#00008B] text-white shadow' : 'text-neutral-700'
                    }`}
                  >
                    {t.archive.awayMatchMode}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-neutral-700 mb-1">
                      {t.archive.homeTeamLabel}
                    </label>
                    <input
                      type="text"
                      value={newHomeTeam}
                      onChange={(e) => setNewHomeTeam(e.target.value)}
                      placeholder={t.common.home}
                      className="w-full h-10 px-3 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-bold text-xs text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-neutral-700 mb-1">
                      {t.archive.guestTeamLabel}
                    </label>
                    <input
                      type="text"
                      value={newGuestTeam}
                      onChange={(e) => setNewGuestTeam(e.target.value)}
                      placeholder={t.common.guest}
                      className="w-full h-10 px-3 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-bold text-xs text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-neutral-700 mb-1">
                      {t.common.category}
                    </label>
                    <select
                      value={newCategoryId}
                      onChange={(e) => handleNewCategoryChange(e.target.value)}
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
                    <label className="block text-[11px] font-black uppercase text-neutral-700 mb-1">
                      {t.archive.matchDateLabel}
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full h-10 px-2.5 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-bold text-xs text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-neutral-700 mb-1">
                      {t.archive.venueLabel}
                    </label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder={t.archive.venuePlaceholder}
                      className="w-full h-10 px-2.5 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-bold text-xs text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Selezione Convocati */}
              <ConvocatiChecklistPanel
                categoryPlayers={newMatchCategoryPlayers}
                selectedIds={selectedConvocatedIds}
                onChangeSelectedIds={(nextIds) => {
                  setSelectedConvocatedIds(nextIds);
                  if (nextIds.length > 0 && formError === t.convocati.errorMinOnePlayer) {
                    setFormError(null);
                  }
                }}
                maxHeightClass="max-h-40"
              />

              {/* Pulsanti Salva in Calendario o Gioca Subito */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <Button3D
                  variant="secondary"
                  text={t.schedule.saveToCalendarBtn}
                  icon={<CalendarIcon className="w-4 h-4" />}
                  minHeight={46}
                  onClick={() => handleCreateScheduleMatch(false)}
                />
                <Button3D
                  variant="success"
                  text={t.archive.startMatchBtn}
                  icon={<Play className="w-4 h-4 fill-current" />}
                  minHeight={46}
                  onClick={() => handleCreateScheduleMatch(true)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-200 border-t border-neutral-300 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-300 hover:bg-neutral-400 text-neutral-900 font-bold text-xs cursor-pointer transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
