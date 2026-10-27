/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useI18n } from '../i18n';
import { Download, Share2, PlusSquare, X, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card' | 'badge';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { locale } = useI18n();

  if (isInstalled) {
    return null;
  }

  const isIT = locale === 'it';

  if (isInstallable) {
    if (variant === 'card') {
      return (
        <div className={`rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm dark:border-blue-900/50 dark:from-blue-950/40 dark:to-slate-900 ${className}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-amber-400 shadow-md">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-navy-900 dark:text-blue-100">
                  {isIT ? 'Installa l\'App SCOUT Handball' : 'Install SCOUT Handball App'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {isIT ? 'Usa l\'app a schermo intero offline senza barra del browser.' : 'Use app full-screen offline without browser bar.'}
                </p>
              </div>
            </div>
            <button
              onClick={install}
              className="flex items-center gap-1.5 rounded-lg bg-navy-900 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-navy-800 transition active:scale-95"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" />
              {isIT ? 'Installa' : 'Install'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-navy-950 shadow-sm transition active:scale-95 ${className}`}
        title={isIT ? 'Installa SCOUT Handball sul dispositivo' : 'Install SCOUT Handball on device'}
      >
        <Download className="h-3.5 w-3.5 stroke-[2.5]" />
        <span className="hidden sm:inline">{isIT ? 'Installa App' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-lg border border-amber-400/80 bg-amber-400/10 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition active:scale-95 ${className}`}
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span>{isIT ? 'Installa iOS' : 'Install iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-navy-900 dark:text-amber-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isIT ? 'Installa su iPhone / iPad' : 'Install on iPhone / iPad'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold dark:bg-blue-900/50 dark:text-blue-300">
                    1
                  </div>
                  <p className="pt-0.5">
                    {isIT ? (
                      <>Tocca l'icona <Share2 className="inline h-4 w-4 text-blue-600 mx-1" /> <strong>Condividi</strong> nella barra di Safari.</>
                    ) : (
                      <>Tap the <Share2 className="inline h-4 w-4 text-blue-600 mx-1" /> <strong>Share</strong> button in Safari toolbar.</>
                    )}
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold dark:bg-blue-900/50 dark:text-blue-300">
                    2
                  </div>
                  <p className="pt-0.5">
                    {isIT ? (
                      <>Scorri verso il basso e tocca <PlusSquare className="inline h-4 w-4 text-emerald-600 mx-1" /> <strong>Aggiungi a Schermata Home</strong>.</>
                    ) : (
                      <>Scroll down and tap <PlusSquare className="inline h-4 w-4 text-emerald-600 mx-1" /> <strong>Add to Home Screen</strong>.</>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-navy-900 py-2.5 text-sm font-bold text-white shadow-md hover:bg-navy-800 active:scale-95 transition"
              >
                {isIT ? 'Ho Capito' : 'Got It'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
