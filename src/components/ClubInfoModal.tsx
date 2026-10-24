/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { ClubInfo } from '../types/scout';
import { Button3D } from './Button3D';
import { sanitizeClubInfo } from '../utils/storage';
import {
  Building2,
  X,
  Upload,
  Trash2,
  Shield,
  AlertTriangle,
  FileText,
  MapPin,
  Landmark,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface ClubInfoModalProps {
  isOpen: boolean;
  clubInfo: ClubInfo;
  onClose: () => void;
  onSave: (updatedClubInfo: ClubInfo) => void;
}

const MAX_LOGO_SIZE_BYTES = 500 * 1024; // Limite 500 KB per sicurezza e integrità Web Storage

export const ClubInfoModal: React.FC<ClubInfoModalProps> = ({
  isOpen,
  clubInfo,
  onClose,
  onSave,
}) => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ClubInfo>(() => ({
    ...clubInfo,
  }));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(clubInfo.logoUrl || '');

  if (!isOpen) return null;

  const handleInputChange = (field: keyof ClubInfo, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errorMessage && field === 'name' && value.trim()) {
      setErrorMessage(null);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Controllo tipo MIME
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validMimes.includes(file.type) && !file.name.match(/\.(png|jpe?g|webp|svg)$/i)) {
      setErrorMessage(t.club.logoInvalidFormatError);
      return;
    }

    // Controllo dimensione (max 500 KB)
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setErrorMessage(t.club.logoTooLargeError);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setLogoPreview(base64Url);
        setFormData((prev) => ({
          ...prev,
          logoUrl: base64Url,
        }));
      }
    };
    reader.onerror = () => {
      setErrorMessage('Errore durante la lettura dell\'immagine selezionata.');
    };
    reader.readAsDataURL(file);

    // Reset input per permettere di ricaricare lo stesso file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      setErrorMessage(t.club.errorNameRequired);
      return;
    }

    // Sanitizza tutti i campi tramite proiezione ad allowlist e ripulitura XSS
    const cleanClub = sanitizeClubInfo({
      ...formData,
      name: formData.name.trim(),
      city: formData.city?.trim() || '',
      gymnasium: formData.gymnasium?.trim() || '',
      logoUrl: logoPreview,
    });

    onSave(cleanClub);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-lg bg-[#F2F2F2] rounded-2xl shadow-2xl border-2 border-[#00008B] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Intestazione Modale Navy Federale con Tricolore */}
        <div className="bg-[#00008B] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 id="club-modal-title" className="text-sm sm:text-base font-black uppercase text-white tracking-wide">
                {t.club.modalTitle}
              </h2>
              <p className="text-[10px] sm:text-xs text-white/80 font-medium">
                {t.club.modalSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fascia Tricolore sottile */}
        <div className="h-1 w-full flex flex-shrink-0">
          <div className="w-1/3 h-full bg-[#008C45]" />
          <div className="w-1/3 h-full bg-[#F4F5F0]" />
          <div className="w-1/3 h-full bg-[#CD212A]" />
        </div>

        {/* Form Semplificato: Denominazione Società, Sede, Palazzetto (+ Logo) */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Banner di avviso errore */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Logo Società (compatto ed elegante) */}
          <div className="bg-white p-3.5 rounded-xl border border-neutral-300 shadow-sm">
            <div className="flex items-center gap-3.5">
              {/* Anteprima Logo */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-neutral-300 bg-neutral-50 flex items-center justify-center p-1.5 relative shadow-inner overflow-hidden flex-shrink-0">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt={formData.name || 'Logo Club'}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-400">
                    <Shield className="w-6 h-6 text-neutral-300 mb-0.5" />
                    <span className="text-[9px] font-bold uppercase text-neutral-400">Logo</span>
                  </div>
                )}
              </div>

              {/* Azioni Logo */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-neutral-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#00008B]" />
                    {t.club.logoSectionTitle}
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-[#00008B] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t.club.uploadLogoBtn}</span>
                  </button>

                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t.club.removeLogoBtn}</span>
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-neutral-500 font-medium">
                  {t.club.logoHelpText}
                </p>
              </div>
            </div>
          </div>

          {/* I 3 Campi Richiesti: Denominazione Società, Sede, Palazzetto */}
          <div className="bg-white p-4 rounded-xl border border-neutral-300 shadow-sm space-y-3.5">
            {/* 1. Denominazione Società */}
            <div>
              <label className="block text-xs font-black uppercase text-neutral-800 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#00008B]" />
                <span>{t.club.clubNameLabel}</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t.club.clubNamePlaceholder}
                className="w-full h-11 px-3.5 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:bg-white focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* 2. Sede */}
            <div>
              <label className="block text-xs font-black uppercase text-neutral-800 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#00008B]" />
                <span>{t.club.cityLabel}</span>
              </label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder={t.club.cityPlaceholder}
                className="w-full h-11 px-3.5 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            {/* 3. Palazzetto */}
            <div>
              <label className="block text-xs font-black uppercase text-neutral-800 mb-1 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-[#00008B]" />
                <span>{t.club.gymLabel}</span>
              </label>
              <input
                type="text"
                value={formData.gymnasium || ''}
                onChange={(e) => handleInputChange('gymnasium', e.target.value)}
                placeholder={t.club.gymPlaceholder}
                className="w-full h-11 px-3.5 bg-neutral-50 border-2 border-neutral-300 rounded-xl font-bold text-neutral-900 text-sm focus:border-[#00008B] focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Avviso integrazione PDF & Scout */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs font-medium flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#00008B] flex-shrink-0" />
            <span>{t.club.pdfHeaderNotice}</span>
          </div>

          {/* Pulsanti Azione Modale */}
          <div className="pt-2 flex gap-2">
            <Button3D
              variant="secondary"
              type="button"
              text={t.common.cancel}
              onClick={onClose}
              minHeight={46}
            />
            <Button3D
              variant="primary"
              type="submit"
              text={t.club.saveBtn}
              minHeight={46}
            />
          </div>
        </form>
      </div>
    </div>
  );
};
