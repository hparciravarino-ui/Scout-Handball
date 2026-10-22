/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Target, Users, Archive, FileDown } from 'lucide-react';
import { useI18n } from '../i18n';

export type NavTab = 'scout' | 'roster' | 'archive' | 'backup';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeMatchScore?: { home: number; guest: number } | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  activeMatchScore,
}) => {
  const { t } = useI18n();

  const tabs = [
    {
      id: 'scout' as NavTab,
      label: t.bottomNav.scout,
      icon: Target,
      badge: activeMatchScore ? `${activeMatchScore.home}-${activeMatchScore.guest}` : undefined,
    },
    {
      id: 'roster' as NavTab,
      label: t.bottomNav.roster,
      icon: Users,
    },
    {
      id: 'archive' as NavTab,
      label: t.bottomNav.archive,
      icon: Archive,
    },
    {
      id: 'backup' as NavTab,
      label: t.bottomNav.backup,
      icon: FileDown,
    },
  ];

  return (
    <nav
      role="navigation"
      aria-label={t.bottomNav.ariaLabel}
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#00008B] border-t border-blue-900 shadow-[0_-4px_12px_rgba(0,0,0,0.25)] select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-4xl mx-auto flex items-stretch justify-around h-16 px-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex flex-col items-center justify-center py-1 px-2 relative transition-all duration-150 min-h-[48px]
                ${isActive ? 'text-amber-300 font-bold' : 'text-white/80 hover:text-white font-medium'}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Indicatore attivo superiore */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-amber-400 rounded-b-md shadow-sm" />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'
                  }`}
                />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-3.5 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-sm leading-tight">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[11px] sm:text-xs mt-1 tracking-tight leading-none ${
                  isActive ? 'font-black text-amber-300' : 'text-white/85'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
