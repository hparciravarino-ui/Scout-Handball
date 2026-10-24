/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Category,
  Player,
  HandballMatch,
  BackupData,
  PlayerMatchStats,
  ActionLogEntry,
  ActionType,
  ClubInfo,
  OfficialLetter,
  OfficialSanctionStats,
  CategoryOfficials,
} from '../types/scout';

const STORAGE_KEY = 'scout_handball_database_v1';
const AUTO_BACKUP_KEY = 'scout_handball_pre_import_backup';
const CURRENT_SCHEMA_VERSION = 1;

/**
 * Limite massimo di dimensione per i file JSON importati: 5 MB (5 * 1024 * 1024 byte).
 * Previene attacchi di esaurimento memoria (DoS) e blocchi del thread principale.
 */
export const MAX_IMPORT_SIZE_BYTES = 5 * 1024 * 1024;

export const DEFAULT_INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-serie-a', name: 'Serie A' },
  { id: 'cat-serie-b', name: 'Serie B' },
  { id: 'cat-under-19', name: 'Under 19' },
  { id: 'cat-under-17', name: 'Under 17' },
  { id: 'cat-under-15', name: 'Under 15' },
];

export const DEFAULT_CLUB_INFO: ClubInfo = {
  name: 'SCOUT Handball Club',
  codeFIGH: '',
  city: '',
  gymnasium: '',
  presidentOrReferent: '',
  coach: '',
  email: '',
  phone: '',
  colors: '',
  notes: '',
  logoUrl: '',
};

export interface AppDatabase {
  schemaVersion: number;
  initialized: boolean;
  clubInfo: ClubInfo;
  categories: Category[];
  players: Player[];
  matches: HandballMatch[];
  activeMatchId: string | null;
}

export interface StorageLoadResult {
  data: AppDatabase;
  recoveredFromCorrupt: boolean;
  corruptionDetails?: string;
}

/**
 * Sanitizza l'oggetto ClubInfo con allowlist restrittiva e protezioni contro injection:
 * - Anti-Prototype Pollution
 * - Sanitizzazione campi testuali (tag HTML rimossi, limitazione lunghezza)
 * - Validazione formato e lunghezza immagine Base64 (max 700 KB per prevenire quota error)
 */
export function sanitizeClubInfo(raw: unknown): ClubInfo {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_CLUB_INFO };
  }

  if (hasPrototypePollution(raw)) {
    console.warn('Rilevato tentativo di prototype pollution in ClubInfo, ripristino default');
    return { ...DEFAULT_CLUB_INFO };
  }

  const obj = raw as Record<string, unknown>;

  // Validazione logoUrl (solo data URI di immagini standard, max 700.000 caratteri)
  let validLogoUrl = '';
  if (typeof obj.logoUrl === 'string' && obj.logoUrl.trim().length > 0) {
    const trimmedLogo = obj.logoUrl.trim();
    const isImageFormat = /^data:image\/(png|jpe?g|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(trimmedLogo);
    if (isImageFormat && trimmedLogo.length <= 700_000) {
      validLogoUrl = trimmedLogo;
    }
  }

  const nameVal = typeof obj.name === 'string' ? sanitizeInput(obj.name, 80) : '';

  return {
    name: nameVal || DEFAULT_CLUB_INFO.name,
    codeFIGH: typeof obj.codeFIGH === 'string' ? sanitizeInput(obj.codeFIGH, 30) : '',
    city: typeof obj.city === 'string' ? sanitizeInput(obj.city, 80) : '',
    gymnasium: typeof obj.gymnasium === 'string' ? sanitizeInput(obj.gymnasium, 100) : '',
    presidentOrReferent: typeof obj.presidentOrReferent === 'string' ? sanitizeInput(obj.presidentOrReferent, 80) : '',
    coach: typeof obj.coach === 'string' ? sanitizeInput(obj.coach, 80) : '',
    email: typeof obj.email === 'string' ? sanitizeInput(obj.email, 100) : '',
    phone: typeof obj.phone === 'string' ? sanitizeInput(obj.phone, 40) : '',
    colors: typeof obj.colors === 'string' ? sanitizeInput(obj.colors, 60) : '',
    notes: typeof obj.notes === 'string' ? sanitizeInput(obj.notes, 300) : '',
    logoUrl: validLogoUrl,
  };
}

export function loadAppDatabase(): StorageLoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Primo avvio: nessuna partita e nessun atleta, categorie iniziali modificabili
      const initialDb: AppDatabase = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        initialized: true,
        clubInfo: { ...DEFAULT_CLUB_INFO },
        categories: [...DEFAULT_INITIAL_CATEGORIES],
        players: [],
        matches: [],
        activeMatchId: null,
      };
      saveAppDatabase(initialDb);
      return { data: initialDb, recoveredFromCorrupt: false };
    }

    const parsed = JSON.parse(raw);

    // Validazione strutturale
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Formato JSON non valido (non è un oggetto)');
    }

    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    const players = Array.isArray(parsed.players) ? parsed.players : [];
    const matches = Array.isArray(parsed.matches) ? parsed.matches : [];
    const activeMatchId = typeof parsed.activeMatchId === 'string' ? parsed.activeMatchId : null;
    const clubInfo = sanitizeClubInfo(parsed.clubInfo);

    const data: AppDatabase = {
      schemaVersion: parsed.schemaVersion || CURRENT_SCHEMA_VERSION,
      initialized: true,
      clubInfo,
      categories,
      players,
      matches,
      activeMatchId,
    };

    return { data, recoveredFromCorrupt: false };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto di lettura';
    const corruptTimestamp = Date.now();
    try {
      const rawCorrupt = localStorage.getItem(STORAGE_KEY);
      if (rawCorrupt) {
        localStorage.setItem(`scout_handball_corrupt_${corruptTimestamp}`, rawCorrupt);
      }
    } catch {
      // fallback
    }

    // Parte pulito senza sovrascrivere distruttivamente dati correnti
    const safeDb: AppDatabase = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      initialized: true,
      clubInfo: { ...DEFAULT_CLUB_INFO },
      categories: [...DEFAULT_INITIAL_CATEGORIES],
      players: [],
      matches: [],
      activeMatchId: null,
    };
    saveAppDatabase(safeDb);

    return {
      data: safeDb,
      recoveredFromCorrupt: true,
      corruptionDetails: `Database corrotto salvato in copia d'emergenza (timestamp: ${corruptTimestamp}). Causa: ${errorMsg}`,
    };
  }
}

export function saveAppDatabase(db: AppDatabase): boolean {
  try {
    const serialized = JSON.stringify(db);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (err: unknown) {
    const isQuota = typeof DOMException !== 'undefined' && err instanceof DOMException && (
      err.code === 22 ||
      err.code === 1014 ||
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
    if (isQuota) {
      console.error('Spazio di archiviazione esaurito nel browser (QuotaExceededError). Impossibile salvare:', err);
    } else {
      console.error('Errore durante il salvataggio su storage:', err);
    }
    return false;
  }
}

/**
 * Crea una copia di sicurezza automatica prima dell'importazione
 */
export function createSafetyBackup(currentDb: AppDatabase): boolean {
  try {
    const backupJson = JSON.stringify({
      ...currentDb,
      safetyBackupTimestamp: new Date().toISOString(),
    });
    localStorage.setItem(AUTO_BACKUP_KEY, backupJson);
    return true;
  } catch (err) {
    console.warn('Impossibile creare backup di sicurezza prima di import:', err);
    return false;
  }
}

/**
 * Scansione per rilevare tentativi di Prototype Pollution
 * a qualsiasi livello di annidamento dell'oggetto.
 */
export function hasPrototypePollution(obj: unknown, depth = 0): boolean {
  if (!obj || typeof obj !== 'object' || depth > 50) return false;

  const ownKeys = Object.getOwnPropertyNames(obj);
  if (
    ownKeys.includes('__proto__') ||
    ownKeys.includes('constructor') ||
    ownKeys.includes('prototype')
  ) {
    return true;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (hasPrototypePollution(item, depth + 1)) return true;
    }
    return false;
  }

  for (const key of ownKeys) {
    const val = (obj as Record<string, unknown>)[key];
    if (val && typeof val === 'object') {
      if (hasPrototypePollution(val, depth + 1)) return true;
    }
  }

  return false;
}

/**
 * Valida un payload JSON di backup prima di applicarlo con verifiche di sicurezza avanzate:
 * - Limite dimensione file (max 5 MB)
 * - Anti prototype pollution ricorsivo
 * - Proiezione restrittiva ad allowlist di tutti i campi
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  summary?: {
    categoriesCount: number;
    playersCount: number;
    matchesCount: number;
    schemaVersion: number;
  };
  validatedData?: BackupData;
}

export function validateBackupJson(rawJson: string): ValidationResult {
  try {
    if (typeof rawJson !== 'string') {
      return { valid: false, error: 'Il contenuto da validare deve essere una stringa.' };
    }

    // 1. Limite di dimensione (max 5 MB)
    if (rawJson.length > MAX_IMPORT_SIZE_BYTES) {
      return {
        valid: false,
        error: `Dimensione file eccessiva (${(rawJson.length / (1024 * 1024)).toFixed(2)} MB). Il limite consentito è di 5 MB.`,
      };
    }

    const parsed = JSON.parse(rawJson);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { valid: false, error: 'Il file selezionato non contiene un oggetto JSON valido.' };
    }

    // 2. Cybersecurity: Controllo anti-Prototype Pollution ricorsivo
    if (hasPrototypePollution(parsed)) {
      return { valid: false, error: 'File non sicuro: rilevato tentativo di prototype pollution (__proto__, constructor, prototype).' };
    }

    if (!parsed.schemaVersion || typeof parsed.schemaVersion !== 'number') {
      return { valid: false, error: 'Versione dello schema assente o non valida nel file JSON.' };
    }

    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      return {
        valid: false,
        error: `Versione dello schema (${parsed.schemaVersion}) più recente di quella supportata (${CURRENT_SCHEMA_VERSION}).`,
      };
    }

    if (!Array.isArray(parsed.categories)) {
      return { valid: false, error: 'Campo "categories" mancante o non valido.' };
    }

    if (!Array.isArray(parsed.players)) {
      return { valid: false, error: 'Campo "players" mancante o non valido.' };
    }

    if (!Array.isArray(parsed.matches)) {
      return { valid: false, error: 'Campo "matches" mancante o non valido.' };
    }

    // 3. Proiezione restrittiva ad allowlist per le Categorie
    const sanitizedCategories: Category[] = [];
    const catIds = new Set<string>();
    for (const c of parsed.categories) {
      if (!c || typeof c !== 'object') {
        return { valid: false, error: 'Elemento categoria non valido nel file.' };
      }
      if (!c.id || typeof c.id !== 'string') {
        return { valid: false, error: 'Una o più categorie hanno un ID non valido.' };
      }
      if (catIds.has(c.id)) {
        return { valid: false, error: `ID categoria duplicato: ${c.id}` };
      }
      catIds.add(c.id);
      let cleanOfficials: CategoryOfficials | undefined = undefined;
      if (c.officials && typeof c.officials === 'object') {
        cleanOfficials = {
          A: c.officials.A ? sanitizeInput(String(c.officials.A), 60) : '',
          B: c.officials.B ? sanitizeInput(String(c.officials.B), 60) : '',
          C: c.officials.C ? sanitizeInput(String(c.officials.C), 60) : '',
          D: c.officials.D ? sanitizeInput(String(c.officials.D), 60) : '',
        };
      }
      sanitizedCategories.push({
        id: String(c.id),
        name: sanitizeInput(String(c.name || 'Categoria'), 60),
        officials: cleanOfficials,
      });
    }

    // 4. Proiezione restrittiva ad allowlist per i Giocatori
    const sanitizedPlayers: Player[] = [];
    const playerIds = new Set<string>();
    for (const p of parsed.players) {
      if (!p || typeof p !== 'object') {
        return { valid: false, error: 'Elemento atleta non valido nel file.' };
      }
      if (!p.id || typeof p.id !== 'string') {
        return { valid: false, error: 'Uno o più atleti hanno un ID non valido.' };
      }
      if (playerIds.has(p.id)) {
        return { valid: false, error: `ID atleta duplicato: ${p.id}` };
      }
      playerIds.add(p.id);

      if (typeof p.number !== 'number' || p.number < 0 || p.number > 99) {
        return { valid: false, error: `Numero di maglia non valido (${p.number}) per l'atleta ${p.name || p.id}. Deve essere tra 0 e 99.` };
      }

      const role = p.role === 'PORTIERE' ? 'PORTIERE' : 'GIOCATORE';
      sanitizedPlayers.push({
        id: String(p.id),
        categoryId: String(p.categoryId || ''),
        name: sanitizeInput(String(p.name || ''), 60),
        number: Math.floor(p.number),
        role,
        active: p.active !== false,
      });
    }

    // 5. Proiezione restrittiva ad allowlist per le Partite
    const sanitizedMatches: HandballMatch[] = [];
    const matchIds = new Set<string>();
    for (const m of parsed.matches) {
      if (!m || typeof m !== 'object') {
        return { valid: false, error: 'Elemento partita non valido nel file.' };
      }
      if (!m.id || typeof m.id !== 'string') {
        return { valid: false, error: 'Una o più partite hanno un ID non valido.' };
      }
      if (matchIds.has(m.id)) {
        return { valid: false, error: `ID partita duplicato: ${m.id}` };
      }
      matchIds.add(m.id);

      // Proiezione restrittiva statistiche
      const cleanStats: Record<string, PlayerMatchStats> = {};
      if (m.stats && typeof m.stats === 'object' && !Array.isArray(m.stats)) {
        for (const [pId, pStats] of Object.entries(m.stats)) {
          if (!pStats || typeof pStats !== 'object') continue;
          const s = pStats as Record<string, any>;
          const cleanPlayerStat: PlayerMatchStats = {
            playerId: String(s.playerId || pId),
            playerName: sanitizeInput(String(s.playerName || ''), 60),
            playerNumber: typeof s.playerNumber === 'number' ? s.playerNumber : 0,
            role: s.role === 'PORTIERE' ? 'PORTIERE' : 'GIOCATORE',
            goalkeeper: {
              parate: Math.max(0, Number(s.goalkeeper?.parate) || 0),
              golSubiti: Math.max(0, Number(s.goalkeeper?.golSubiti) || 0),
              rigoriParati: Math.max(0, Number(s.goalkeeper?.rigoriParati) || 0),
              rigoriSubiti: Math.max(0, Number(s.goalkeeper?.rigoriSubiti) || 0),
            },
            field: {
              gol: Math.max(0, Number(s.field?.gol) || 0),
              tiriFuori: Math.max(0, Number(s.field?.tiriFuori) || 0),
              assist: Math.max(0, Number(s.field?.assist) || 0),
              passaggiPersi: Math.max(0, Number(s.field?.passaggiPersi) || 0),
              passaggiPersiRicezione: Math.max(0, Number(s.field?.passaggiPersiRicezione) || 0),
              rigoriGol: Math.max(0, Number(s.field?.rigoriGol) || 0),
              rigoriPersi: Math.max(0, Number(s.field?.rigoriPersi) || 0),
            },
            sanctions: {
              giallo: Math.max(0, Number(s.sanctions?.giallo) || 0),
              dueMinuti: Math.max(0, Number(s.sanctions?.dueMinuti) || 0),
              rosso: Math.max(0, Number(s.sanctions?.rosso) || 0),
              blu: Math.max(0, Number(s.sanctions?.blu) || 0),
            },
          };

          cleanStats[pId] = cleanPlayerStat;
        }
      }

      // Proiezione restrittiva actionLog
      const cleanActionLog: ActionLogEntry[] = [];
      const rawLog = Array.isArray(m.actionLog) ? m.actionLog : [];
      for (const ev of rawLog) {
        if (!ev || typeof ev !== 'object') continue;
        cleanActionLog.push({
          id: String(ev.id || `act-${Date.now()}`),
          timestamp: typeof ev.timestamp === 'number' ? ev.timestamp : Date.now(),
          actionType: (ev.actionType || 'OPPONENT_GOAL') as ActionType,
          label: sanitizeInput(String(ev.label || ''), 60),
          playerId: ev.playerId ? String(ev.playerId) : undefined,
          playerName: ev.playerName ? sanitizeInput(String(ev.playerName), 60) : undefined,
          playerNumber: typeof ev.playerNumber === 'number' ? ev.playerNumber : undefined,
          role: ev.role === 'PORTIERE' ? 'PORTIERE' : ev.role === 'GIOCATORE' ? 'GIOCATORE' : undefined,
          officialLetter: ev.officialLetter && ['A', 'B', 'C', 'D'].includes(ev.officialLetter) ? ev.officialLetter : undefined,
          officialName: ev.officialName ? sanitizeInput(String(ev.officialName), 60) : undefined,
          scoreChangeHome: typeof ev.scoreChangeHome === 'number' ? ev.scoreChangeHome : 0,
          scoreChangeGuest: typeof ev.scoreChangeGuest === 'number' ? ev.scoreChangeGuest : 0,
        });
      }

      // Proiezione restrittiva Ufficiali di Panchina (A, B, C, D)
      let cleanOfficials: Record<OfficialLetter, OfficialSanctionStats> | undefined = undefined;
      if (m.officials && typeof m.officials === 'object') {
        const letters: OfficialLetter[] = ['A', 'B', 'C', 'D'];
        cleanOfficials = {
          A: { letter: 'A', name: '', sanctions: { giallo: 0, dueMinuti: 0, rosso: 0, blu: 0 } },
          B: { letter: 'B', name: '', sanctions: { giallo: 0, dueMinuti: 0, rosso: 0, blu: 0 } },
          C: { letter: 'C', name: '', sanctions: { giallo: 0, dueMinuti: 0, rosso: 0, blu: 0 } },
          D: { letter: 'D', name: '', sanctions: { giallo: 0, dueMinuti: 0, rosso: 0, blu: 0 } },
        };
        letters.forEach((letKey) => {
          const off = (m.officials as any)[letKey];
          if (off && typeof off === 'object') {
            cleanOfficials![letKey] = {
              letter: letKey,
              name: sanitizeInput(String(off.name || ''), 60),
              sanctions: {
                giallo: Math.max(0, Number(off.sanctions?.giallo) || 0),
                dueMinuti: Math.max(0, Number(off.sanctions?.dueMinuti) || 0),
                rosso: Math.max(0, Number(off.sanctions?.rosso) || 0),
                blu: Math.max(0, Number(off.sanctions?.blu) || 0),
              },
            };
          }
        });
      }

      sanitizedMatches.push({
        id: String(m.id),
        categoryId: String(m.categoryId || ''),
        date: typeof m.date === 'string' ? m.date : new Date().toISOString().split('T')[0],
        homeTeam: sanitizeInput(String(m.homeTeam || 'Casa'), 60),
        guestTeam: sanitizeInput(String(m.guestTeam || 'Ospiti'), 60),
        location: m.location ? sanitizeInput(String(m.location), 80) : '',
        notes: m.notes ? sanitizeInput(String(m.notes), 300) : '',
        scoreHome: Math.max(0, Number(m.scoreHome) || 0),
        scoreGuest: Math.max(0, Number(m.scoreGuest) || 0),
        stats: cleanStats,
        officials: cleanOfficials,
        actionLog: cleanActionLog,
        createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
        updatedAt: typeof m.updatedAt === 'number' ? m.updatedAt : Date.now(),
      });
    }

    const validatedClubInfo = parsed.clubInfo ? sanitizeClubInfo(parsed.clubInfo) : undefined;

    const backupData: BackupData = {
      schemaVersion: parsed.schemaVersion,
      exportDate: typeof parsed.exportDate === 'string' ? parsed.exportDate : new Date().toISOString(),
      app: 'SCOUT Handball',
      clubInfo: validatedClubInfo,
      categories: sanitizedCategories,
      players: sanitizedPlayers,
      matches: sanitizedMatches,
    };

    return {
      valid: true,
      summary: {
        categoriesCount: backupData.categories.length,
        playersCount: backupData.players.length,
        matchesCount: backupData.matches.length,
        schemaVersion: backupData.schemaVersion,
      },
      validatedData: backupData,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Errore nel parsing del file';
    return { valid: false, error: `Impossibile analizzare il JSON: ${errorMsg}` };
  }
}

/**
 * Sanitizza l'input testuale dell'utente rimuovendo tag HTML per prevenire iniezioni XSS
 */
export function sanitizeInput(input: string, maxLength: number = 80): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, maxLength);
}

/**
 * Esegue la cancellazione totale e sicura dei dati locali (Diritto all'Oblio - GDPR Art. 17)
 */
export function wipeAllLocalData(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(AUTO_BACKUP_KEY);
    return true;
  } catch {
    return false;
  }
}
