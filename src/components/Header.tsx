/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Activity, Globe } from 'lucide-react';
import { useI18n } from '../i18n';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  onOpenPrivacyModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  rightAction,
  onOpenPrivacyModal,
}) => {
  const { locale, toggleLocale, t } = useI18n();

  const displayTitle = title || t.common.appName;

  return (
    <header className="sticky top-0 z-40 bg-[#00008B] text-white shadow-md">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
        {/* Logo & Titolo */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner flex-shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 fill-amber-300/20" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-wider text-white uppercase truncate">
                {displayTitle}
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/15 text-white">
                v1.2.0 (2026)
              </span>
            </div>
            {subtitle ? (
              <p className="text-[11px] sm:text-xs text-white/85 truncate font-medium">{subtitle}</p>
            ) : (
              <p className="text-[10px] sm:text-[11px] text-white/70 flex items-center gap-1 font-medium truncate">
                <Activity className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                {t.header.officialSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Azioni a destra: Selettore Lingua + Sicurezza & Privacy + custom action */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Pulsante Selettore Lingua (IT / EN) */}
          <button
            type="button"
            onClick={toggleLocale}
            title={t.header.languageToggleAria}
            aria-label={t.header.languageToggleAria}
            className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/25 flex items-center gap-1 text-[11px] font-bold text-white transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Globe className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
            <span className="uppercase tracking-wider font-extrabold">{locale.toUpperCase()}</span>
          </button>

          {onOpenPrivacyModal && (
            <button
              type="button"
              onClick={onOpenPrivacyModal}
              title={t.header.securityRightsAria}
              aria-label={t.header.securityRightsAria}
              className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/25 flex items-center gap-1 text-[11px] font-bold text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/30 flex-shrink-0" />
              <span className="hidden sm:inline">{t.header.securityRightsBtn}</span>
            </button>
          )}
          {rightAction}
        </div>
      </div>

      {/* Fascia Tricolore sul bordo inferiore (6px di altezza, 3 segmenti uguali) */}
      <div className="h-[6px] w-full flex">
        <div className="w-1/3 h-full bg-[#008C45]" aria-hidden="true" />
        <div className="w-1/3 h-full bg-[#F4F5F0]" aria-hidden="true" />
        <div className="w-1/3 h-full bg-[#CD212A]" aria-hidden="true" />
      </div>
    </header>
  );
};
