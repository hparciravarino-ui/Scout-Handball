/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { AppDatabase, validateBackupJson, ValidationResult } from '../utils/storage';
import { HandballMatch, Category, BackupData } from '../types/scout';
import { Button3D } from './Button3D';
import { generateScoutReportPdf } from '../utils/pdfExport';
import {
  Download,
  Upload,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  FileJson,
  RefreshCw,
  Lock,
  Info,
  Building2,
} from 'lucide-react';
import { APP_METADATA } from '../constants/appInfo';
import { useI18n } from '../i18n';

interface BackupScreenProps {
  currentDatabase: AppDatabase;
  onRestoreBackup: (backupData: BackupData) => void;
  matches: HandballMatch[];
  categories: Category[];
  onOpenPrivacyModal?: () => void;
  onOpenClubModal?: () => void;
}

export const BackupScreen: React.FC<BackupScreenProps> = ({
  currentDatabase,
  onRestoreBackup,
  matches,
  categories,
  onOpenPrivacyModal,
  onOpenClubModal,
}) => {
  const { t, locale } = useI18n();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Dialog di conferma importazione con riepilogo
  const [pendingImportResult, setPendingImportResult] = useState<ValidationResult | null>(null);

  // Partita selezionata per l'esportazione del PDF
  const [selectedMatchForPdf, setSelectedMatchForPdf] = useState<string>(
    matches[0]?.id || ''
  );

  // Esporta archivio JSON
  const handleExportJson = () => {
    try {
      const backupPayload: BackupData = {
        schemaVersion: 1,
        exportDate: new Date().toISOString(),
        app: 'SCOUT Handball',
        clubInfo: currentDatabase.clubInfo,
        categories: currentDatabase.categories,
        players: currentDatabase.players,
        matches: currentDatabase.matches,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `scout_handball_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setStatusMessage({
        type: 'success',
        text: `${t.backup.exportSuccessToast} (${backupPayload.players.length} ${t.backup.playersCountLabel}, ${backupPayload.matches.length} ${t.backup.matchesCountLabel})`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.common.error;
      setStatusMessage({
        type: 'error',
        text: `${t.backup.exportErrorToast}: ${msg}`,
      });
    }
  };

  // Selezione file JSON per import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setStatusMessage({
          type: 'error',
          text: t.backup.emptyFileError,
        });
        return;
      }

      // Validazione formale del JSON
      const validation = validateBackupJson(content);
      if (!validation.valid || !validation.validatedData) {
        setStatusMessage({
          type: 'error',
          text: `${t.backup.importErrorToast}: ${validation.error}`,
        });
        return;
      }

      // Mostra modale con anteprima e richiesta di conferma
      setPendingImportResult(validation);
    };

    reader.onerror = () => {
      setStatusMessage({
        type: 'error',
        text: t.backup.importErrorToast,
      });
    };

    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!pendingImportResult?.validatedData) return;

    try {
      onRestoreBackup(pendingImportResult.validatedData);
      setStatusMessage({
        type: 'success',
        text: `${t.backup.importSuccessToast} (${pendingImportResult.summary?.playersCount} ${t.backup.playersCountLabel}, ${pendingImportResult.summary?.matchesCount} ${t.backup.matchesCountLabel})`,
      });
      setPendingImportResult(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.common.error;
      setStatusMessage({
        type: 'error',
        text: `${t.backup.importErrorToast}: ${msg}`,
      });
    }
  };

  const handleDownloadSelectedPdf = () => {
    const match = matches.find((m) => m.id === selectedMatchForPdf);
    if (!match) {
      setStatusMessage({
        type: 'error',
        text: t.backup.noMatchesForPdf,
      });
      return;
    }

    const catName = categories.find((c) => c.id === match.categoryId)?.name || t.common.category;
    generateScoutReportPdf(match, catName, locale, currentDatabase.clubInfo);
  };

  return (
    <div className="pb-24 pt-2 px-3 max-w-2xl mx-auto space-y-4">
      {/* Scheda Anagrafica Club / Società */}
      <div className="bg-[#F2F2F2] rounded-2xl p-4 border-2 border-neutral-300 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-12 h-12 rounded-xl bg-white border-2 border-neutral-300 shadow-inner flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
            {currentDatabase.clubInfo?.logoUrl ? (
              <img
                src={currentDatabase.clubInfo.logoUrl}
                alt={currentDatabase.clubInfo.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Building2 className="w-6 h-6 text-[#00008B]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#00008B] bg-blue-100 px-2 py-0.5 rounded-full inline-block mb-0.5">
              {t.club.badgeClubData}
            </span>
            <h3 className="text-sm sm:text-base font-black text-neutral-900 truncate">
              {currentDatabase.clubInfo?.name || t.common.appName}
            </h3>
            <p className="text-xs text-neutral-600 truncate font-medium">
              {currentDatabase.clubInfo?.city || ''}
              {currentDatabase.clubInfo?.codeFIGH ? ` • FIGH: ${currentDatabase.clubInfo.codeFIGH}` : ''}
              {currentDatabase.clubInfo?.gymnasium ? ` • ${currentDatabase.clubInfo.gymnasium}` : ''}
            </p>
          </div>
        </div>

        {onOpenClubModal && (
          <div className="w-full sm:w-auto flex-shrink-0">
            <button
              type="button"
              onClick={onOpenClubModal}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#00008B] hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-amber-300" />
              <span>{t.header.clubBtn}</span>
            </button>
          </div>
        )}
      </div>

      {/* Messaggi di feedback stato */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-2.5 shadow-sm text-xs font-bold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : statusMessage.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          ) : statusMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
          ) : (
            <ShieldCheck className="w-5 h-5 flex-shrink-0 text-blue-600 mt-0.5" />
          )}
          <span className="flex-1">{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-neutral-500 hover:text-neutral-800 text-xs font-black cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      )}

      {/* SEZIONE REFERTO PDF */}
      <div className="bg-[#F2F2F2] rounded-2xl p-4 border-2 border-neutral-300 shadow-md space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#00008B]" />
          <h2 className="text-sm font-black uppercase text-neutral-900">
            {t.backup.pdfSectionTitle}
          </h2>
        </div>
        <p className="text-xs text-neutral-700 font-medium">
          {t.backup.pdfSectionDesc}
        </p>

        {matches.length === 0 ? (
          <div className="p-3 text-center text-xs text-neutral-500 bg-white rounded-xl border border-dashed border-neutral-300 font-semibold">
            {t.backup.noMatchesForPdf}
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-black uppercase text-neutral-800 mb-1">
                {t.backup.selectMatchForPdfLabel}
              </label>
              <select
                value={selectedMatchForPdf}
                onChange={(e) => setSelectedMatchForPdf(e.target.value)}
                className="w-full h-11 px-3 bg-white border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:outline-none"
              >
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.date} - {m.homeTeam} vs {m.guestTeam} ({m.scoreHome}-{m.scoreGuest})
                  </option>
                ))}
              </select>
            </div>

            <Button3D
              variant="primary"
              text={t.backup.downloadPdfLargeBtn}
              subtext={t.backup.downloadPdfLargeSub}
              icon={<Download className="w-5 h-5" />}
              minHeight={52}
              onClick={handleDownloadSelectedPdf}
            />
          </div>
        )}
      </div>

      {/* SEZIONE BACKUP ARCHIVIO JSON */}
      <div className="bg-[#F2F2F2] rounded-2xl p-4 border-2 border-neutral-300 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <FileJson className="w-5 h-5 text-[#00008B]" />
          <h2 className="text-sm font-black uppercase text-neutral-900">
            {t.backup.backupSectionTitle}
          </h2>
        </div>
        <p className="text-xs text-neutral-700 font-medium">
          {t.backup.backupSectionDesc}
        </p>

        {/* Info archivio attuale */}
        <div className="bg-white p-3 rounded-xl border border-neutral-300 shadow-sm grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">{t.backup.catCountLabel}</span>
            <strong className="text-base text-[#00008B] font-black">{currentDatabase.categories.length}</strong>
          </div>
          <div>
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">{t.backup.playersCountLabel}</span>
            <strong className="text-base text-[#00008B] font-black">{currentDatabase.players.length}</strong>
          </div>
          <div>
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">{t.backup.matchesCountLabel}</span>
            <strong className="text-base text-[#00008B] font-black">{currentDatabase.matches.length}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Esporta JSON */}
          <Button3D
            variant="primary"
            text={t.backup.exportJsonBtnText}
            subtext={t.backup.exportJsonBtnSub}
            icon={<Download className="w-5 h-5" />}
            minHeight={52}
            onClick={handleExportJson}
          />

          {/* Importa JSON */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button3D
              variant="secondary"
              text={t.backup.importJsonBtnText}
              subtext={t.backup.importJsonBtnSub}
              icon={<Upload className="w-5 h-5" />}
              minHeight={52}
              onClick={() => fileInputRef.current?.click()}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-700 flex-shrink-0" />
          <span>{t.backup.localDataNotice}</span>
        </div>
      </div>

      {/* SEZIONE ANNO SVILUPPO, VERSIONE, DIRITTI & CIBERSICUREZZA */}
      <div className="bg-[#F2F2F2] rounded-2xl p-4 border-2 border-neutral-300 shadow-md space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-300">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#00008B]" />
            <h2 className="text-sm font-black uppercase text-neutral-900">
              {t.backup.privacyCyberCardTitle}
            </h2>
          </div>
          <span className="text-xs font-black text-[#00008B] bg-blue-100 px-2.5 py-0.5 rounded-full">
            v{APP_METADATA.version} ({APP_METADATA.developmentYear})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-neutral-300">
            <span className="text-[10px] uppercase font-black text-neutral-500 block">{t.backup.developmentYearLabel}</span>
            <span className="text-base font-black text-neutral-950">{APP_METADATA.developmentYear}</span>
            <span className="text-[11px] text-neutral-600 block mt-0.5">{t.backup.releaseDateLabel}: {APP_METADATA.releaseDate}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-neutral-300">
            <span className="text-[10px] uppercase font-black text-neutral-500 block">{t.backup.updateVersionLabel}</span>
            <span className="text-base font-black text-[#00008B]">v{APP_METADATA.version}</span>
            <span className="text-[11px] text-neutral-600 block mt-0.5">{t.backup.databaseSchemaLabel}: v1</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-neutral-300 text-xs space-y-1.5">
          <span className="font-black text-neutral-900 block">{t.backup.rightsReservedTitle}:</span>
          <p className="text-neutral-700 font-medium">
            {APP_METADATA.copyrightNotice}
          </p>
          <p className="text-[11px] text-neutral-500 italic">
            {APP_METADATA.developerNotice}
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-3 rounded-xl text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-black text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{t.backup.securityStandardsActiveTitle}:</span>
          </div>
          <p className="text-[11px] font-medium leading-relaxed">
            {t.backup.securityStandardsDesc}
          </p>
        </div>

        {onOpenPrivacyModal && (
          <Button3D
            variant="secondary"
            text={t.backup.consultDetailsBtnText}
            subtext={t.backup.consultDetailsBtnSub}
            icon={<Info className="w-4 h-4 text-amber-300" />}
            minHeight={48}
            onClick={onOpenPrivacyModal}
          />
        )}
      </div>

      {/* DIALOG DI CONFERMA IMPORTAZIONE CON RIEPILOGO */}
      {pendingImportResult && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] p-4 space-y-4">
            <div className="flex items-center gap-2 text-[#00008B]">
              <RefreshCw className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-black text-base uppercase text-neutral-900">
                {t.backup.importConfirmDialogTitle}
              </h3>
            </div>

            <p className="text-xs text-neutral-700 font-medium">
              {t.backup.importConfirmSummaryIntro}
            </p>

            <div className="bg-white p-3 rounded-xl border border-neutral-300 shadow-sm space-y-1.5 text-xs">
              <div className="flex justify-between py-0.5 border-b border-neutral-200">
                <span className="font-bold text-neutral-600">{t.backup.schemaVersionFound}</span>
                <span className="font-black text-neutral-900">{pendingImportResult.summary?.schemaVersion}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-neutral-200">
                <span className="font-bold text-neutral-600">{t.backup.categoriesFound}</span>
                <span className="font-black text-[#00008B]">{pendingImportResult.summary?.categoriesCount}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-neutral-200">
                <span className="font-bold text-neutral-600">{t.backup.athletesFound}</span>
                <span className="font-black text-[#00008B]">{pendingImportResult.summary?.playersCount}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="font-bold text-neutral-600">{t.backup.matchesFound}</span>
                <span className="font-black text-[#00008B]">{pendingImportResult.summary?.matchesCount}</span>
              </div>
            </div>

            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
              <span>{t.backup.safetyBackupNotice}</span>
            </div>

            <div className="pt-2 flex gap-2">
              <Button3D
                variant="secondary"
                text={t.common.cancel}
                onClick={() => setPendingImportResult(null)}
                minHeight={46}
              />
              <Button3D
                variant="primary"
                text={t.backup.proceedImportBtn}
                onClick={handleConfirmImport}
                minHeight={46}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
