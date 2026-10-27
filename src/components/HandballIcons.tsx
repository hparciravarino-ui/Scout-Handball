/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

/**
 * Suite di Icone Stilizzate Rappresentative per SCOUT Handball
 */

// 1. Icona Gol (Rete di Porta + Pallone in Gol)
export const GoalIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Porta */}
    <rect x="3" y="4" width="18" height="14" rx="2" strokeWidth="2" />
    <path d="M3 9h18M3 14h18M8 4v14M13 4v14M18 4v14" opacity="0.3" strokeDasharray="1 1" />
    {/* Pallone in Rete */}
    <circle cx="16" cy="11" r="3.5" fill="#38BDF8" stroke="#00008B" strokeWidth="1.5" />
    <path d="M16 8.5a2.5 2.5 0 0 0 0 5" stroke="#FFFFFF" strokeWidth="1" />
  </svg>
);

// 2. Icona Parata Portiere (Scudo / Mano di Parata)
export const SaveIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Scudo Parata */}
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.1" />
    {/* Impatto Parata */}
    <path d="M12 8v4l3 3" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

// 3. Icona Tiro Fuori / Palo
export const MissIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Palo e traiettoria fuori */}
    <path d="M4 20V4h16" />
    <path d="M18 8l4-4M22 8l-4-4" stroke="#EF4444" strokeWidth="2.5" />
    <circle cx="12" cy="12" r="3" strokeDasharray="2 2" />
  </svg>
);

// 4. Icona Rigore 7 Metri
export const PenaltyIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Linea 7m e bersaglio */}
    <line x1="3" y1="19" x2="21" y2="19" strokeWidth="2.5" />
    <circle cx="12" cy="9" r="6" />
    <circle cx="12" cy="9" r="2" fill="currentColor" />
    <line x1="12" y1="3" x2="12" y2="5" />
  </svg>
);

// 5. Icona Assist Vincente
export const AssistIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Traiettoria passaggio curvilinea + Stella */}
    <path d="M3 17C7 7 14 7 21 11" strokeWidth="2" strokeDasharray="3 3" />
    <polygon points="21 11 17 9 19 14 21 11" fill="currentColor" />
    <circle cx="4" cy="18" r="2" fill="currentColor" />
  </svg>
);

// 6. Icona Palla Persa / Turnover
export const TurnoverIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size, color }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Inversione possesso */}
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

// 7. Cartellino Giallo IHF
export const YellowCardIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <rect x="5" y="3" width="14" height="18" rx="2" fill="#EAB308" stroke="#CA8A04" strokeWidth="1.5" />
    <path d="M8 7h8M8 11h5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
  </svg>
);

// 8. Sospensione 2 Minuti IHF
export const TwoMinIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <rect x="3" y="3" width="18" height="18" rx="4" fill="#2563EB" stroke="#1D4ED8" strokeWidth="1.5" />
    <text x="12" y="16" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="13" fill="#FFFFFF" textAnchor="middle">
      2'
    </text>
  </svg>
);

// 9. Cartellino Rosso IHF
export const RedCardIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <rect x="5" y="3" width="14" height="18" rx="2" fill="#DC2626" stroke="#B91C1C" strokeWidth="1.5" />
    <path d="M9 9l6 6M15 9l-6 6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 10. Cartellino Blu IHF
export const BlueCardIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <rect x="5" y="3" width="14" height="18" rx="2" fill="#0284C7" stroke="#0369A1" strokeWidth="1.5" />
    <path d="M8 8h8M8 12h8M8 16h5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// 11. Icona Dirigenti A, B, C, D
export const OfficialBadgeIcon: React.FC<IconProps & { letter?: 'A' | 'B' | 'C' | 'D' }> = ({
  className = 'w-5 h-5',
  size,
  letter = 'A',
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <rect x="3" y="3" width="18" height="18" rx="5" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
    <text x="12" y="16" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="13" fill="#F59E0B" textAnchor="middle">
      {letter}
    </text>
  </svg>
);

// 12. Icona Pallone da Pallamano IHF
export const HandballBallIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <circle cx="12" cy="12" r="9" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
    <path d="M5 9c4-3 10-3 14 0" stroke="#1E293B" />
    <path d="M5 15c4 3 10 3 14 0" stroke="#1E293B" />
    <path d="M9 5c-3 4-3 10 0 14" stroke="#1E293B" />
    <path d="M15 5c3 4 3 10 0 14" stroke="#1E293B" />
  </svg>
);
