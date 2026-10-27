/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useI18n } from '../i18n';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { locale } = useI18n();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-18 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-bounce">
      <span className="h-2.5 w-2.5 rounded-full bg-white animate-ping" />
      <span>
        {locale === 'it'
          ? 'Modalità Offline — Operatività 100% garantita in locale.'
          : 'Offline Mode — 100% local operation active.'}
      </span>
    </div>
  );
};
