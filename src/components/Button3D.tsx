/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

export type Button3DVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'cardYellow'
  | 'cardRed'
  | 'cardBlue'
  | 'cardTwoMin'
  | 'success';

interface Button3DProps {
  children?: React.ReactNode;
  text?: string;
  subtext?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: Button3DVariant;
  disabled?: boolean;
  className?: string;
  minHeight?: number; // default >= 48px, for scout actions 52px+
  fullWidth?: boolean;
  ariaLabel?: string;
  type?: 'button' | 'submit' | 'reset';
  testTag?: string;
  textClassName?: string;
  textStyle?: React.CSSProperties;
}

export const Button3D: React.FC<Button3DProps> = ({
  children,
  text,
  subtext,
  icon,
  badge,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  minHeight = 48,
  fullWidth = true,
  ariaLabel,
  type = 'button',
  testTag,
  textClassName,
  textStyle,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  // Variant color definitions: base face, lip, text, inner light highlight
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          lip: '#000052',
          faceGradient: 'from-[#2B2BA8] to-[#00008B]',
          faceBase: '#00008B',
          text: 'text-white',
          borderHighlight: 'border-t-white/30 border-l-white/20',
          shadowColor: 'rgba(0, 0, 82, 0.45)',
        };
      case 'destructive':
        return {
          lip: '#991B1B',
          faceGradient: 'from-[#EF4444] to-[#DC2626]',
          faceBase: '#DC2626',
          text: 'text-white',
          borderHighlight: 'border-t-white/35 border-l-white/25',
          shadowColor: 'rgba(153, 27, 27, 0.45)',
        };
      case 'secondary':
        return {
          lip: '#1E293B',
          faceGradient: 'from-[#475569] to-[#334155]',
          faceBase: '#334155',
          text: 'text-white',
          borderHighlight: 'border-t-white/25 border-l-white/15',
          shadowColor: 'rgba(30, 41, 59, 0.4)',
        };
      case 'cardYellow':
        return {
          lip: '#A16207',
          faceGradient: 'from-[#FACC15] to-[#EAB308]',
          faceBase: '#EAB308',
          text: 'text-neutral-950 font-black',
          borderHighlight: 'border-t-white/50 border-l-white/35',
          shadowColor: 'rgba(161, 98, 7, 0.5)',
        };
      case 'cardRed':
        return {
          lip: '#991B1B',
          faceGradient: 'from-[#EF4444] to-[#DC2626]',
          faceBase: '#DC2626',
          text: 'text-white font-bold',
          borderHighlight: 'border-t-white/35 border-l-white/25',
          shadowColor: 'rgba(153, 27, 27, 0.5)',
        };
      case 'cardBlue':
        return {
          lip: '#1E40AF',
          faceGradient: 'from-[#3B82F6] to-[#2563EB]',
          faceBase: '#2563EB',
          text: 'text-white font-bold',
          borderHighlight: 'border-t-white/35 border-l-white/25',
          shadowColor: 'rgba(30, 64, 175, 0.5)',
        };
      case 'cardTwoMin':
        return {
          lip: '#9A3412',
          faceGradient: 'from-[#FB923C] to-[#EA580C]',
          faceBase: '#EA580C',
          text: 'text-white font-bold',
          borderHighlight: 'border-t-white/35 border-l-white/25',
          shadowColor: 'rgba(154, 52, 18, 0.5)',
        };
      case 'success':
        return {
          lip: '#065F46',
          faceGradient: 'from-[#10B981] to-[#059669]',
          faceBase: '#059669',
          text: 'text-white font-bold',
          borderHighlight: 'border-t-white/35 border-l-white/25',
          shadowColor: 'rgba(6, 95, 70, 0.45)',
        };
    }
  };

  const vStyles = getVariantStyles();

  const handlePointerDown = () => {
    if (disabled) return;
    setIsPressed(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(15);
      } catch {
        // Safe fallback
      }
    }
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  const lipHeight = isPressed ? 1 : 4;
  const translateY = isPressed ? 3 : 0;

  return (
    <div
      className={`relative inline-block select-none ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        paddingBottom: `${disabled ? 0 : 4}px`,
      }}
    >
      <button
        type={type}
        role="button"
        data-testid={testTag}
        aria-label={ariaLabel || text || 'Pulsante'}
        disabled={disabled}
        onClick={onClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            setIsPressed(true);
          }
        }}
        onKeyUp={() => setIsPressed(false)}
        style={{
          minHeight: `${minHeight}px`,
          transform: disabled ? 'none' : `translateY(${translateY}px)`,
          transition: 'transform 80ms cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 80ms ease',
        }}
        className={`
          relative w-full rounded-xl flex items-center justify-center px-3 py-2 text-center
          cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-amber-400 focus-visible:ring-offset-2
          ${disabled ? 'opacity-40 cursor-not-allowed shadow-none' : ''}
          ${vStyles.text}
        `}
      >
        {/* Sfondo Lip (3D Bottom edge) */}
        {!disabled && (
          <span
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              backgroundColor: vStyles.lip,
              top: `${lipHeight}px`,
              bottom: `-${lipHeight}px`,
              boxShadow: isPressed
                ? `0 1px 2px ${vStyles.shadowColor}`
                : `0 4px 6px -1px ${vStyles.shadowColor}, 0 2px 4px -2px ${vStyles.shadowColor}`,
              zIndex: 0,
            }}
          />
        )}

        {/* Faccia del Pulsante con Gradiente & Riga di Luce 1px */}
        <span
          className={`
            absolute inset-0 rounded-xl bg-gradient-to-b ${vStyles.faceGradient}
            border-t border-l ${vStyles.borderHighlight} border-b border-black/20
            pointer-events-none
          `}
          style={{ zIndex: 1 }}
        />

        {/* Contenuto del pulsante */}
        <span className="relative z-10 flex items-center justify-center gap-2 w-full font-semibold tracking-wide">
          {icon && <span className="flex-shrink-0 text-current flex items-center">{icon}</span>}
          <span className="flex flex-col items-center justify-center leading-tight">
            {text && (
              <span
                style={textStyle}
                className={`${textClassName || 'text-sm md:text-base'} font-bold truncate max-w-full`}
              >
                {text}
              </span>
            )}
            {subtext && <span className="text-[11px] opacity-90 font-medium">{subtext}</span>}
            {children}
          </span>
          {badge !== undefined && badge !== null && (
            <span className="ml-auto inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-black rounded-full bg-white text-neutral-900 shadow-sm">
              {badge}
            </span>
          )}
        </span>
      </button>
    </div>
  );
};
