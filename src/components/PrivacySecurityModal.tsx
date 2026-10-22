/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { APP_METADATA } from '../constants/appInfo';
import { Button3D } from './Button3D';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  UserCheck,
  FileCode,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface PrivacySecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWipeData?: () => void;
}

export const PrivacySecurityModal: React.FC<PrivacySecurityModalProps> = ({
  isOpen,
  onClose,
  onWipeData,
}) => {
  const { t } = useI18n();
  const [confirmWipe, setConfirmWipe] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modale */}
        <div className="bg-[#00008B] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 id="privacy-modal-title" className="text-base sm:text-lg font-black tracking-wide uppercase">
                {t.privacyModal.modalTitle}
              </h2>
              <span className="text-[11px] text-white/80 font-bold block">
                {t.privacyModal.developmentYearLabel} {APP_METADATA.developmentYear} | {t.privacyModal.versionLabel} {APP_METADATA.version}
              </span>
            </div>
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

        {/* Contenuto scorrevole */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-neutral-800">
          {/* Box Anno, Versione e Riserva dei Diritti */}
          <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm space-y-2">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <span className="font-bold text-neutral-600">{t.privacyModal.appLabel}:</span>
              <strong className="text-sm text-[#00008B] font-black">{APP_METADATA.name}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <span className="font-bold text-neutral-600">{t.privacyModal.versionLabel}:</span>
              <strong className="text-sm font-black text-neutral-900">v{APP_METADATA.version}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <span className="font-bold text-neutral-600">{t.privacyModal.developmentYearLabel}:</span>
              <strong className="text-sm font-black text-neutral-900">{APP_METADATA.developmentYear}</strong>
            </div>
            <div className="pt-1">
              <span className="font-black text-neutral-900 block mb-0.5">{t.privacyModal.rightsReservedLabel}:</span>
              <p className="text-neutral-700 font-medium">
                {APP_METADATA.copyrightNotice}
              </p>
              <p className="text-[11px] text-neutral-500 italic mt-0.5">
                {APP_METADATA.developerNotice}
              </p>
            </div>
          </div>

          {/* Presidi di Privacy e Conformità GDPR */}
          <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-800 font-black uppercase text-xs">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>{t.privacyModal.privacyComplianceTitle}</span>
            </div>

            <ul className="space-y-2 text-neutral-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{t.privacyModal.zeroCloudBullet}:</strong> {t.privacyModal.zeroCloudDesc}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <EyeOff className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{t.privacyModal.zeroTrackingBullet}:</strong> {t.privacyModal.zeroTrackingDesc}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{t.privacyModal.minorsBullet}:</strong> {t.privacyModal.minorsDesc}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileCode className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{t.privacyModal.portabilityBullet}:</strong> {t.privacyModal.portabilityDesc}
                </span>
              </li>
            </ul>
          </div>

          {/* Misure di Cibersicurezza */}
          <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-[#00008B] font-black uppercase text-xs">
              <ShieldCheck className="w-4 h-4 text-[#00008B]" />
              <span>{t.privacyModal.cybersecurityTitle}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block text-[11px]">{t.privacyModal.xssCardTitle}</span>
                <span className="text-[11px] text-neutral-600">{t.privacyModal.xssCardDesc}</span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block text-[11px]">{t.privacyModal.protoCardTitle}</span>
                <span className="text-[11px] text-neutral-600">{t.privacyModal.protoCardDesc}</span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block text-[11px]">{t.privacyModal.schemaCardTitle}</span>
                <span className="text-[11px] text-neutral-600">{t.privacyModal.schemaCardDesc}</span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block text-[11px]">{t.privacyModal.backupCardTitle}</span>
                <span className="text-[11px] text-neutral-600">{t.privacyModal.backupCardDesc}</span>
              </div>
            </div>
          </div>

          {/* Nota tecnica di trasparenza */}
          <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-blue-950 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
            <span className="text-[11px] font-medium leading-relaxed">
              {t.privacyModal.storageClarification}
            </span>
          </div>

          {/* Diritto all'oblio (Cancellazione totale dati locali) */}
          {onWipeData && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-2">
              <div className="flex items-center gap-2 text-red-800 font-black uppercase text-xs">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>{t.privacyModal.rightToErasureTitle}</span>
              </div>
              <p className="text-red-900 text-xs font-medium">
                {t.privacyModal.rightToErasureDesc}
              </p>

              {!confirmWipe ? (
                <button
                  type="button"
                  onClick={() => setConfirmWipe(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  {t.privacyModal.requestEraseBtn}
                </button>
              ) : (
                <div className="p-2.5 bg-red-100 rounded-lg border border-red-300 space-y-2">
                  <div className="flex items-center gap-1.5 text-red-900 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{t.privacyModal.confirmEraseWarning}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmWipe(false)}
                      className="px-3 py-1 rounded-md bg-neutral-200 text-neutral-800 font-bold text-xs cursor-pointer"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onWipeData();
                        setConfirmWipe(false);
                        onClose();
                      }}
                      className="px-3 py-1 rounded-md bg-red-700 text-white font-bold text-xs cursor-pointer"
                    >
                      {t.privacyModal.confirmEraseBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer chiusura */}
        <div className="p-3 bg-neutral-200 border-t border-neutral-300 flex items-center justify-between">
          <span className="text-[10px] text-neutral-600 font-bold">
            {APP_METADATA.copyrightNotice}
          </span>
          <Button3D
            variant="primary"
            text={t.privacyModal.iUnderstandBtn}
            onClick={onClose}
            fullWidth={false}
            minHeight={40}
            className="w-auto px-6"
          />
        </div>
      </div>
    </div>
  );
};
