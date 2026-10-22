/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Locale, Translations } from './types.ts';
import { itTranslations } from './it.ts';
import { enTranslations } from './en.ts';

export const LOCALE_STORAGE_KEY = 'scout_handball_locale';
export const DEFAULT_LOCALE: Locale = 'it';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  toggleLocale: () => void;
  t: Translations;
  formatDate: (dateStr: string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveInitialLocale(): Locale {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === 'it' || stored === 'en') {
        return stored;
      }
    }
  } catch {
    // Fallback on security/sandbox block
  }
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale);

  const setLocale = (newLocale: Locale) => {
    const validLocale: Locale = newLocale === 'en' ? 'en' : 'it';
    setLocaleState(validLocale);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, validLocale);
      }
    } catch (e) {
      console.warn('Unable to persist locale preference to localStorage:', e);
    }
  };

  const toggleLocale = () => {
    setLocale(locale === 'it' ? 'en' : 'it');
  };

  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.lang = locale;
      }
    } catch {
      // Ignore if document not available
    }
  }, [locale]);

  const t: Translations = useMemo(() => {
    return locale === 'en' ? enTranslations : itTranslations;
  }, [locale]);

  const formatDate = useMemo(() => {
    return (dateStr: string, options?: Intl.DateTimeFormatOptions): string => {
      try {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const opts = options || { year: 'numeric', month: 'short', day: 'numeric' };
        return new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-US', opts).format(d);
      } catch {
        return dateStr;
      }
    };
  }, [locale]);

  const formatNumber = useMemo(() => {
    return (num: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-US', options).format(num);
      } catch {
        return String(num);
      }
    };
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    toggleLocale,
    t,
    formatDate,
    formatNumber,
  }), [locale, t, formatDate, formatNumber]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Provide graceful fallback if used outside Provider
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      toggleLocale: () => {},
      t: itTranslations,
      formatDate: (d: string) => d,
      formatNumber: (n: number) => String(n),
    };
  }
  return context;
}
