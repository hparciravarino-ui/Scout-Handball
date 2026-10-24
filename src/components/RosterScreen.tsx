/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, Category, PlayerRole, CategoryOfficials } from '../types/scout';
import { Button3D } from './Button3D';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  FolderPlus,
  AlertCircle,
  X,
  Shield,
  CheckCircle,
  Save,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface RosterScreenProps {
  categories: Category[];
  players: Player[];
  onAddPlayer: (player: Omit<Player, 'id'>) => { success: boolean; error?: string };
  onUpdatePlayer: (player: Player) => { success: boolean; error?: string };
  onDeletePlayer: (playerId: string) => void;
  onAddCategory: (name: string) => { success: boolean; error?: string };
  onUpdateCategory: (id: string, name: string) => { success: boolean; error?: string };
  onDeleteCategory: (id: string) => { success: boolean; error?: string };
  onUpdateCategoryOfficials?: (categoryId: string, officials: CategoryOfficials) => void;
}

export const RosterScreen: React.FC<RosterScreenProps> = ({
  categories,
  players,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateCategoryOfficials,
}) => {
  const { t } = useI18n();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ''
  );

  // Campi form Dirigenti (A, B, C, D) per la categoria selezionata
  const [officialsA, setOfficialsA] = useState('');
  const [officialsB, setOfficialsB] = useState('');
  const [officialsC, setOfficialsC] = useState('');
  const [officialsD, setOfficialsD] = useState('');
  const [officialsSavedNotice, setOfficialsSavedNotice] = useState(false);

  // Modali stato
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Campi form giocatore
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState<number | ''>('');
  const [formRole, setFormRole] = useState<PlayerRole>('GIOCATORE');
  const [formCategory, setFormCategory] = useState<string>(selectedCategoryId);
  const [formError, setFormError] = useState<string | null>(null);

  // Modale Categoria
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Dialog di conferma eliminazione
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'player' | 'category';
    id: string;
    title: string;
    message: string;
  } | null>(null);

  React.useEffect(() => {
    if (!categories.some((c) => c.id === selectedCategoryId) && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Sincronizza i dirigenti quando cambia la categoria selezionata
  React.useEffect(() => {
    const currentCat = categories.find((c) => c.id === selectedCategoryId);
    setOfficialsA(currentCat?.officials?.A || '');
    setOfficialsB(currentCat?.officials?.B || '');
    setOfficialsC(currentCat?.officials?.C || '');
    setOfficialsD(currentCat?.officials?.D || '');
    setOfficialsSavedNotice(false);
  }, [selectedCategoryId, categories]);

  const handleSaveOfficials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !onUpdateCategoryOfficials) return;
    onUpdateCategoryOfficials(selectedCategoryId, {
      A: officialsA.trim(),
      B: officialsB.trim(),
      C: officialsC.trim(),
      D: officialsD.trim(),
    });
    setOfficialsSavedNotice(true);
    setTimeout(() => setOfficialsSavedNotice(false), 3000);
  };

  // Filtra atleti per categoria
  const filteredPlayers = players.filter((p) => p.categoryId === selectedCategoryId);
  const goalkeepers = filteredPlayers.filter((p) => p.role === 'PORTIERE').sort((a, b) => a.number - b.number);
  const fieldPlayers = filteredPlayers.filter((p) => p.role === 'GIOCATORE').sort((a, b) => a.number - b.number);

  // Apertura modale nuovo atleta
  const openNewPlayerModal = () => {
    setEditingPlayer(null);
    setFormName('');
    setFormNumber('');
    setFormRole('GIOCATORE');
    setFormCategory(selectedCategoryId || categories[0]?.id || '');
    setFormError(null);
    setIsPlayerModalOpen(true);
  };

  // Apertura modale modifica atleta
  const openEditPlayerModal = (p: Player) => {
    setEditingPlayer(p);
    setFormName(p.name);
    setFormNumber(p.number);
    setFormRole(p.role);
    setFormCategory(p.categoryId);
    setFormError(null);
    setIsPlayerModalOpen(true);
  };

  // Salvataggio Atleta
  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError(t.roster.errorNameRequired);
      return;
    }

    if (formNumber === '' || isNaN(Number(formNumber))) {
      setFormError(t.roster.errorNumberInvalid);
      return;
    }

    const num = Number(formNumber);
    if (num < 0 || num > 99) {
      setFormError(t.roster.errorNumberRange);
      return;
    }

    if (!formCategory) {
      setFormError(t.roster.errorCategoryRequired);
      return;
    }

    const duplicate = players.find(
      (p) =>
        p.categoryId === formCategory &&
        p.number === num &&
        (!editingPlayer || p.id !== editingPlayer.id)
    );

    if (duplicate) {
      setFormError(`${t.roster.errorDuplicateNumber} (#${num} - ${duplicate.name})`);
      return;
    }

    if (editingPlayer) {
      const res = onUpdatePlayer({
        ...editingPlayer,
        name: trimmedName,
        number: num,
        role: formRole,
        categoryId: formCategory,
      });
      if (!res.success) {
        setFormError(res.error || t.common.error);
        return;
      }
    } else {
      const res = onAddPlayer({
        name: trimmedName,
        number: num,
        role: formRole,
        categoryId: formCategory,
        active: true,
      });
      if (!res.success) {
        setFormError(res.error || t.common.error);
        return;
      }
    }

    setIsPlayerModalOpen(false);
  };

  // Categorie handlers
  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setCategoryNameInput('');
    setCategoryError(null);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryNameInput(cat.name);
    setCategoryError(null);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    const trimmed = categoryNameInput.trim();
    if (!trimmed) {
      setCategoryError(t.roster.errorCategoryNameRequired);
      return;
    }

    if (editingCategory) {
      const res = onUpdateCategory(editingCategory.id, trimmed);
      if (!res.success) {
        setCategoryError(res.error || t.common.error);
        return;
      }
    } else {
      const res = onAddCategory(trimmed);
      if (!res.success) {
        setCategoryError(res.error || t.common.error);
        return;
      }
    }

    setIsCategoryModalOpen(false);
  };

  const confirmDeleteCategory = (cat: Category) => {
    const linkedPlayers = players.filter((p) => p.categoryId === cat.id);
    setDeleteConfirm({
      type: 'category',
      id: cat.id,
      title: `${t.common.delete} "${cat.name}"`,
      message:
        linkedPlayers.length > 0
          ? `${t.roster.confirmDeleteCategoryLinkedMsg} (${linkedPlayers.length})`
          : t.roster.confirmDeleteCategoryEmptyMsg,
    });
  };

  const confirmDeletePlayer = (p: Player) => {
    setDeleteConfirm({
      type: 'player',
      id: p.id,
      title: `${t.common.delete} #${p.number} ${p.name}`,
      message: t.roster.confirmDeleteAthleteMsg,
    });
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'category') {
      onDeleteCategory(deleteConfirm.id);
    } else {
      onDeletePlayer(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="pb-24 pt-2 px-3 max-w-2xl mx-auto space-y-4">
      {/* Sezione Gestione Categorie */}
      <div className="bg-[#F2F2F2] rounded-2xl p-3 border-2 border-neutral-300 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-5 h-5 text-[#00008B]" />
            <h2 className="text-sm font-black uppercase text-neutral-900">
              {t.roster.categoriesTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={openNewCategoryModal}
            className="text-xs font-bold text-[#00008B] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" /> {t.roster.newCategoryBtn}
          </button>
        </div>

        {/* Tab orizzontali categorie */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => {
            const isSelected = cat.id === selectedCategoryId;
            const count = players.filter((p) => p.categoryId === cat.id).length;

            return (
              <div
                key={cat.id}
                className={`
                  flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all cursor-pointer
                  ${
                    isSelected
                      ? 'bg-[#00008B] text-white border-blue-900 shadow-md'
                      : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-400'
                  }
                `}
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                <span className="font-bold text-xs">{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-amber-400 text-neutral-950' : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {count}
                </span>

                {/* Modifica / Elimina categoria */}
                <button
                  type="button"
                  title={t.common.edit}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditCategoryModal(cat);
                  }}
                  className="p-1 hover:text-amber-300 ml-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {categories.length > 1 && (
                  <button
                    type="button"
                    title={t.common.delete}
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDeleteCategory(cat);
                    }}
                    className="p-1 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sezione Caricamento Dirigenti di Panchina (A, B, C, D) per la categoria */}
      <div className="bg-[#F2F2F2] rounded-2xl p-3 sm:p-4 border-2 border-neutral-300 shadow-md space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-300">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00008B] text-amber-300 flex items-center justify-center font-black text-sm shadow">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-neutral-900">
                {t.roster.officialsCardTitle}
              </h3>
              <p className="text-[11px] text-neutral-600 font-medium">
                {t.roster.officialsCardSubtitle}
              </p>
            </div>
          </div>

          {officialsSavedNotice && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold animate-in fade-in">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              {t.common.saved}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveOfficials} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Dirigente A */}
            <div className="bg-white p-2.5 rounded-xl border border-neutral-300 shadow-sm flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#00008B] text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                A
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-black uppercase text-neutral-600 mb-0.5 truncate">
                  {t.roster.officialALabel}
                </label>
                <input
                  type="text"
                  value={officialsA}
                  onChange={(e) => setOfficialsA(e.target.value)}
                  placeholder={t.roster.officialAPlaceholder}
                  className="w-full h-8 px-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                />
              </div>
            </div>

            {/* Dirigente B */}
            <div className="bg-white p-2.5 rounded-xl border border-neutral-300 shadow-sm flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#00008B] text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                B
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-black uppercase text-neutral-600 mb-0.5 truncate">
                  {t.roster.officialBLabel}
                </label>
                <input
                  type="text"
                  value={officialsB}
                  onChange={(e) => setOfficialsB(e.target.value)}
                  placeholder={t.roster.officialBPlaceholder}
                  className="w-full h-8 px-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                />
              </div>
            </div>

            {/* Dirigente C */}
            <div className="bg-white p-2.5 rounded-xl border border-neutral-300 shadow-sm flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#00008B] text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                C
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-black uppercase text-neutral-600 mb-0.5 truncate">
                  {t.roster.officialCLabel}
                </label>
                <input
                  type="text"
                  value={officialsC}
                  onChange={(e) => setOfficialsC(e.target.value)}
                  placeholder={t.roster.officialCPlaceholder}
                  className="w-full h-8 px-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                />
              </div>
            </div>

            {/* Dirigente D */}
            <div className="bg-white p-2.5 rounded-xl border border-neutral-300 shadow-sm flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#00008B] text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                D
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-black uppercase text-neutral-600 mb-0.5 truncate">
                  {t.roster.officialDLabel}
                </label>
                <input
                  type="text"
                  value={officialsD}
                  onChange={(e) => setOfficialsD(e.target.value)}
                  placeholder={t.roster.officialDPlaceholder}
                  className="w-full h-8 px-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 focus:bg-white focus:border-[#00008B] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#00008B] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t.roster.saveOfficialsBtn}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sezione Rosa Giocatori per la categoria attiva */}
      <div className="bg-[#F2F2F2] rounded-2xl p-3 border-2 border-neutral-300 shadow-md space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-300">
          <div>
            <h3 className="text-sm font-black uppercase text-neutral-900">
              {t.roster.categoryRosterTitle}:{' '}
              <span className="text-[#00008B]">
                {categories.find((c) => c.id === selectedCategoryId)?.name || ''}
              </span>
            </h3>
            <p className="text-xs text-neutral-600 font-medium">
              {filteredPlayers.length} {t.roster.totalRegisteredAthletes}
            </p>
          </div>

          <div className="w-36">
            <Button3D
              variant="primary"
              text={t.roster.newAthleteBtn}
              textStyle={{ fontSize: '12px' }}
              textClassName="text-[12px]"
              icon={<UserPlus className="w-4 h-4" />}
              minHeight={46}
              onClick={openNewPlayerModal}
            />
          </div>
        </div>

        {/* Lista Portieri */}
        <div>
          <span className="text-xs font-black uppercase text-emerald-800 tracking-wider block mb-2">
            {t.roster.goalkeepersTitle} ({goalkeepers.length})
          </span>

          {goalkeepers.length === 0 ? (
            <div className="p-3 text-center text-xs text-neutral-500 bg-white rounded-xl border border-dashed border-neutral-300">
              {t.roster.noGoalkeepersInCategory}
            </div>
          ) : (
            <div className="space-y-2">
              {goalkeepers.map((gk) => (
                <div
                  key={gk.id}
                  className="bg-white p-2.5 rounded-xl border border-neutral-300 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-base shadow">
                      #{gk.number}
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900 text-sm">{gk.name}</div>
                      <div className="text-[11px] text-neutral-500 font-medium">
                        {t.common.role}: <strong className="text-emerald-700">{t.common.goalkeeper}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditPlayerModal(gk)}
                      aria-label={t.common.edit}
                      className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDeletePlayer(gk)}
                      aria-label={t.common.delete}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista Giocatori di Movimento */}
        <div>
          <span className="text-xs font-black uppercase text-blue-900 tracking-wider block mb-2">
            {t.roster.fieldPlayersTitle} ({fieldPlayers.length})
          </span>

          {fieldPlayers.length === 0 ? (
            <div className="p-3 text-center text-xs text-neutral-500 bg-white rounded-xl border border-dashed border-neutral-300">
              {t.roster.noFieldPlayersInCategory}
            </div>
          ) : (
            <div className="space-y-2">
              {fieldPlayers.map((fp) => (
                <div
                  key={fp.id}
                  className="bg-white p-2.5 rounded-xl border border-neutral-300 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00008B] text-white flex items-center justify-center font-black text-base shadow">
                      #{fp.number}
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900 text-sm">{fp.name}</div>
                      <div className="text-[11px] text-neutral-500 font-medium">
                        {t.common.role}: <strong className="text-blue-900">{t.common.fieldPlayer}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditPlayerModal(fp)}
                      aria-label={t.common.edit}
                      className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDeletePlayer(fp)}
                      aria-label={t.common.delete}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALE INSERIMENTO / MODIFICA ATLETA */}
      {isPlayerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] overflow-hidden flex flex-col">
            <div className="bg-[#00008B] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-black text-base uppercase">
                {editingPlayer ? t.roster.modalEditAthleteTitle : t.roster.modalAddAthleteTitle}
              </h3>
              <button
                type="button"
                onClick={() => setIsPlayerModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlayer} className="p-4 space-y-3.5">
              {formError && (
                <div className="p-2.5 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nome e Cognome */}
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                  {t.roster.fullNameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.roster.fullNamePlaceholder}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-11 px-3 bg-white border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:outline-none"
                />
              </div>

              {/* Numero Maglia (0-99) */}
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                  {t.roster.jerseyNumberLabel}
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={99}
                  placeholder={t.roster.jerseyNumberPlaceholder}
                  value={formNumber}
                  onChange={(e) =>
                    setFormNumber(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                  }
                  className="w-full h-11 px-3 bg-white border-2 border-neutral-300 rounded-xl font-black text-neutral-900 text-base focus:border-[#00008B] focus:outline-none"
                />
                <span className="text-[11px] text-neutral-500 font-medium block mt-1">
                  {t.roster.jerseyNumberHelp}
                </span>
              </div>

              {/* Ruolo */}
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                  {t.roster.roleLabel}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormRole('GIOCATORE')}
                    className={`h-11 rounded-xl border-2 font-black text-xs transition-all cursor-pointer ${
                      formRole === 'GIOCATORE'
                        ? 'bg-[#00008B] text-white border-blue-900 shadow'
                        : 'bg-white text-neutral-800 border-neutral-300'
                    }`}
                  >
                    {t.common.fieldPlayer.toUpperCase()}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormRole('PORTIERE')}
                    className={`h-11 rounded-xl border-2 font-black text-xs transition-all cursor-pointer ${
                      formRole === 'PORTIERE'
                        ? 'bg-emerald-700 text-white border-emerald-900 shadow'
                        : 'bg-white text-neutral-800 border-neutral-300'
                    }`}
                  >
                    {t.common.goalkeeper.toUpperCase()}
                  </button>
                </div>
              </div>

              {/* Categoria di appartenenza */}
              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                  {t.roster.categorySelectLabel}
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-11 px-3 bg-white border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <Button3D
                  variant="secondary"
                  text={t.common.cancel}
                  onClick={() => setIsPlayerModalOpen(false)}
                  minHeight={46}
                />
                <Button3D
                  variant="primary"
                  type="submit"
                  text={editingPlayer ? t.roster.saveAthleteChangesBtn : t.roster.confirmAthleteBtn}
                  minHeight={46}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CATEGORIA */}
      {isCategoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] overflow-hidden flex flex-col">
            <div className="bg-[#00008B] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-black text-base uppercase">
                {editingCategory ? t.roster.modalEditCategoryTitle : t.roster.modalNewCategoryTitle}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-4 space-y-3.5">
              {categoryError && (
                <div className="p-2.5 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-bold">
                  {categoryError}
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                  {t.roster.categoryNameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.roster.categoryNamePlaceholder}
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  className="w-full h-11 px-3 bg-white border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button3D
                  variant="secondary"
                  text={t.common.cancel}
                  onClick={() => setIsCategoryModalOpen(false)}
                  minHeight={46}
                />
                <Button3D
                  variant="primary"
                  type="submit"
                  text={t.roster.saveCategoryBtn}
                  minHeight={46}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG CONFERMA ELIMINAZIONE */}
      {deleteConfirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-red-600 overflow-hidden flex flex-col p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-black text-base uppercase text-neutral-900">
                {deleteConfirm.title}
              </h3>
            </div>

            <p className="text-xs text-neutral-700 font-medium">
              {deleteConfirm.message}
            </p>

            <div className="pt-2 flex gap-2">
              <Button3D
                variant="secondary"
                text={t.common.cancel}
                onClick={() => setDeleteConfirm(null)}
                minHeight={44}
              />
              <Button3D
                variant="destructive"
                text={t.common.confirm}
                onClick={executeDelete}
                minHeight={44}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
