/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {
  calculateGoalkeeperStats,
  calculateFieldPlayerStats,
  calculateTeamTotals,
  createEmptyGoalkeeperStats,
  createEmptyFieldPlayerStats,
  createEmptySanctionsStats,
  createEmptyPlayerStats,
  calculateScoreFromMatch,
  getOurSide,
  getOpponentSide,
  getScoreDeltas,
  getUnassignedOpponentGoals,
} from '../src/utils/stats';
import {
  validateBackupJson,
  sanitizeInput,
  hasPrototypePollution,
  MAX_IMPORT_SIZE_BYTES,
  sanitizeClubInfo,
  DEFAULT_CLUB_INFO,
  wipeAllLocalData,
} from '../src/utils/storage';
import { isTargetAllowed } from '../src/utils/actionRules';
import { sanitizeFileName } from '../src/utils/pdfExport';
import { APP_METADATA } from '../src/constants/appInfo';
import { GoalkeeperStats, FieldPlayerStats, SanctionsStats, PlayerMatchStats, HandballMatch, ACTION_TYPES, BackupData } from '../src/types/scout';
import { itTranslations } from '../src/i18n/it';
import { enTranslations } from '../src/i18n/en';

console.log('--- AVVIO TEST SUITE SCOUT HANDBALL ---');

let passedTests = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err);
    process.exitCode = 1;
  }
}

// 1. Test Formule Portieri
runTest('Statistiche Portiere: parate totali, gol subiti totali e percentuali', () => {
  const gk: GoalkeeperStats = {
    parate: 8,
    golSubiti: 12,
    rigoriParati: 2,
    rigoriSubiti: 3,
  };
  const sanctions: SanctionsStats = {
    giallo: 1,
    dueMinuti: 1,
    rosso: 0,
    blu: 0,
  };

  const res = calculateGoalkeeperStats(gk, sanctions);
  assert.strictEqual(res.parateInGioco, 8);
  assert.strictEqual(res.golSubitiInGioco, 12);
  assert.strictEqual(res.rigoriParati, 2);
  assert.strictEqual(res.rigoriSubiti, 3);
  assert.strictEqual(res.parateTotali, 10, 'Parate totali deve essere 8 + 2 = 10');
  assert.strictEqual(res.golSubitiTotali, 15, 'Gol subiti totali deve essere 12 + 3 = 15');
  assert.strictEqual(res.tiriTotaliFronteggiati, 25, 'Tiri totali fronteggiati deve essere 10 + 15 = 25');
  assert.strictEqual(res.percentualeParateTotale, 40, 'Percentuale parate: (10 / 25) * 100 = 40.0%');
  assert.strictEqual(res.percentualeRigoriParati, 40, 'Percentuale rigori: (2 / 5) * 100 = 40.0%');
  assert.strictEqual(res.totaleAzioni, 27, 'Totale azioni: 25 tiri + 2 sanzioni = 27');
});

// 2. Test Formule Giocatori di Movimento
runTest('Statistiche Giocatore: gol totali, tiri totali, % realizzazione e palle perse', () => {
  const fp: FieldPlayerStats = {
    gol: 5,
    tiriFuori: 3,
    assist: 4,
    passaggiPersi: 2,
    passaggiPersiRicezione: 1,
    rigoriGol: 2,
    rigoriPersi: 1,
  };
  const sanctions: SanctionsStats = {
    giallo: 0,
    dueMinuti: 2,
    rosso: 0,
    blu: 0,
  };

  const res = calculateFieldPlayerStats(fp, sanctions);
  assert.strictEqual(res.golAzione, 5);
  assert.strictEqual(res.golTotali, 7, 'Gol totali deve essere 5 + 2 = 7');
  assert.strictEqual(res.tiriTotali, 11, 'Tiri totali deve essere 5 + 3 + 2 + 1 = 11');
  assert.strictEqual(res.pallePerseTotali, 3, 'Palle perse totali deve essere 2 + 1 = 3');
  assert.strictEqual(res.percentualeRealizzazione, 63.6, '% Realizzazione (7 / 11) * 100 arrotondato = 63.6%');
  assert.strictEqual(res.assist, 4);
  assert.strictEqual(res.totaleAzioni, 20, 'Totale azioni: 11 tiri + 4 assist + 3 perse + 2 sanzioni = 20');
});

// 3. Test Totali di Squadra
runTest('Totali Squadra: somma gol, tiri, assist, parate portieri e sanzioni', () => {
  const p1 = createEmptyPlayerStats('p1', 'Portiere 1', 1, 'PORTIERE');
  p1.goalkeeper = { parate: 10, golSubiti: 10, rigoriParati: 1, rigoriSubiti: 2 };

  const p2 = createEmptyPlayerStats('p2', 'Ala 1', 7, 'GIOCATORE');
  p2.field = { gol: 4, tiriFuori: 2, assist: 1, passaggiPersi: 1, passaggiPersiRicezione: 0, rigoriGol: 1, rigoriPersi: 0 };

  const p3 = createEmptyPlayerStats('p3', 'Terzino 1', 10, 'GIOCATORE');
  p3.field = { gol: 6, tiriFuori: 4, assist: 3, passaggiPersi: 2, passaggiPersiRicezione: 1, rigoriGol: 0, rigoriPersi: 1 };
  p3.sanctions = { giallo: 1, dueMinuti: 1, rosso: 0, blu: 0 };

  const statsMap: Record<string, PlayerMatchStats> = { p1, p2, p3 };
  const totals = calculateTeamTotals(statsMap);

  assert.strictEqual(totals.golTotaliSquadra, 11, 'Gol totali squadra: (4 + 1) + 6 = 11');
  assert.strictEqual(totals.tiriTotaliSquadra, 18, 'Tiri totali squadra: 7 + 11 = 18');
  assert.strictEqual(totals.assistTotali, 4, 'Assist totali: 1 + 3 = 4');
  assert.strictEqual(totals.pallePerseTotali, 4, 'Palle perse totali: 1 + 3 = 4');
  assert.strictEqual(totals.parateTotaliPortieri, 11, 'Parate totali portieri: 10 + 1 = 11');
  assert.strictEqual(totals.sanzioniSquadra.giallo, 1);
  assert.strictEqual(totals.sanzioniSquadra.dueMinuti, 1);
});

// 4. Test Punteggio CASA / TRASFERTA e Undo Simmetrico
runTest('Punteggio Partita CASA: FP_GOL -> +1 scoreHome, GK_GOL_SUBITO -> +1 scoreGuest', () => {
  const matchHome: HandballMatch = {
    id: 'm_home',
    homeTeam: 'Pallamano Secchia Rubiera',
    guestTeam: 'Avversari',
    categoryId: 'cat1',
    date: '2026-10-24',
    location: 'Palasport',
    notes: '',
    isAwayMatch: false,
    scoreHome: 0,
    scoreGuest: 0,
    stats: {
      p1: {
        ...createEmptyPlayerStats('p1', 'Giocatore 1', 7, 'GIOCATORE'),
        field: { ...createEmptyFieldPlayerStats(), gol: 2, rigoriGol: 1 },
      },
      gk1: {
        ...createEmptyPlayerStats('gk1', 'Portiere 1', 1, 'PORTIERE'),
        goalkeeper: { ...createEmptyGoalkeeperStats(), golSubiti: 1, rigoriSubiti: 1 },
      },
    },
    actionLog: [
      { id: '1', timestamp: 1, actionType: 'FP_GOL', label: 'Gol', scoreChangeHome: 1, scoreChangeGuest: 0, teamSide: 'HOME' },
      { id: '2', timestamp: 2, actionType: 'FP_GOL', label: 'Gol', scoreChangeHome: 1, scoreChangeGuest: 0, teamSide: 'HOME' },
      { id: '3', timestamp: 3, actionType: 'FP_7M_GOL', label: '7m Gol', scoreChangeHome: 1, scoreChangeGuest: 0, teamSide: 'HOME' },
      { id: '4', timestamp: 4, actionType: 'GK_GOL_SUBITO', label: 'Gol Subito', scoreChangeHome: 0, scoreChangeGuest: 1, teamSide: 'GUEST' },
      { id: '5', timestamp: 5, actionType: 'GK_7M_SUBITO', label: '7m Subito', scoreChangeHome: 0, scoreChangeGuest: 1, teamSide: 'GUEST' },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const score = calculateScoreFromMatch(matchHome);
  assert.strictEqual(score.home, 3, 'Gol nostri in casa (2 + 1 = 3)');
  assert.strictEqual(score.guest, 2, 'Gol subiti in casa (1 + 1 = 2)');
});

runTest('Punteggio Partita TRASFERTA: FP_GOL -> +1 scoreGuest, GK_GOL_SUBITO e OPPONENT_GOAL -> +1 scoreHome', () => {
  const matchAway: HandballMatch = {
    id: 'm_away',
    homeTeam: 'Avversari Fuori',
    guestTeam: 'Pallamano Secchia Rubiera',
    categoryId: 'cat1',
    date: '2026-10-24',
    location: 'Palasport Ospitante',
    notes: '',
    isAwayMatch: true,
    scoreHome: 0,
    scoreGuest: 0,
    stats: {
      p1: {
        ...createEmptyPlayerStats('p1', 'Giocatore 1', 7, 'GIOCATORE'),
        field: { ...createEmptyFieldPlayerStats(), gol: 3, rigoriGol: 1 },
      },
      gk1: {
        ...createEmptyPlayerStats('gk1', 'Portiere 1', 1, 'PORTIERE'),
        goalkeeper: { ...createEmptyGoalkeeperStats(), golSubiti: 2, rigoriSubiti: 0 },
      },
    },
    actionLog: [
      { id: '1', timestamp: 1, actionType: 'FP_GOL', label: 'Gol', scoreChangeHome: 0, scoreChangeGuest: 1, teamSide: 'GUEST' },
      { id: '2', timestamp: 2, actionType: 'FP_GOL', label: 'Gol', scoreChangeHome: 0, scoreChangeGuest: 1, teamSide: 'GUEST' },
      { id: '3', timestamp: 3, actionType: 'FP_GOL', label: 'Gol', scoreChangeHome: 0, scoreChangeGuest: 1, teamSide: 'GUEST' },
      { id: '4', timestamp: 4, actionType: 'FP_7M_GOL', label: '7m', scoreChangeHome: 0, scoreChangeGuest: 1, teamSide: 'GUEST' },
      { id: '5', timestamp: 5, actionType: 'GK_GOL_SUBITO', label: 'Gol Subito', scoreChangeHome: 1, scoreChangeGuest: 0, teamSide: 'HOME' },
      { id: '6', timestamp: 6, actionType: 'OPPONENT_GOAL', label: 'Opponent', scoreChangeHome: 1, scoreChangeGuest: 0, teamSide: 'HOME' },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const score = calculateScoreFromMatch(matchAway);
  assert.strictEqual(score.guest, 4, 'In trasferta i nostri gol (3+1) vanno a scoreGuest');
  assert.strictEqual(score.home, 3, 'In trasferta i gol subiti (2 GK + 1 OPPONENT) vanno a scoreHome');
});

runTest('Simmetria Undo: annullamento gol nostri e avversari ripristina il punteggio esatto', () => {
  const match: HandballMatch = {
    id: 'm_undo',
    homeTeam: 'Nostri',
    guestTeam: 'Ospiti',
    categoryId: 'cat1',
    date: '2026-10-24',
    location: '',
    notes: '',
    isAwayMatch: false,
    scoreHome: 0,
    scoreGuest: 0,
    stats: {
      p1: { ...createEmptyPlayerStats('p1', 'Giocatore 1', 10, 'GIOCATORE') },
    },
    actionLog: [
      { id: '1', timestamp: 1, actionType: 'FP_GOL', label: 'Gol', scoreChangeHome: 1, scoreChangeGuest: 0 },
      { id: '2', timestamp: 2, actionType: 'OPPONENT_GOAL', label: 'Gol Avv', scoreChangeHome: 0, scoreChangeGuest: 1 },
      { id: '3', timestamp: 3, actionType: 'OPPONENT_GOAL_UNDO', label: 'Undo Avv', scoreChangeHome: 0, scoreChangeGuest: -1 },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  match.stats.p1.field.gol = 1;

  const score = calculateScoreFromMatch(match);
  assert.strictEqual(score.home, 1);
  assert.strictEqual(score.guest, 0, 'OPPONENT_GOAL_UNDO compensa OPPONENT_GOAL');
});

runTest('Modifica manuale in trasferta: non sovrascrive scoreHome con i nostri gol', () => {
  const match: HandballMatch = {
    id: 'm_edit_away',
    homeTeam: 'Avversari Casa',
    guestTeam: 'Nostra Trasferta',
    categoryId: 'cat1',
    date: '2026-10-24',
    location: '',
    notes: '',
    isAwayMatch: true,
    scoreHome: 5,
    scoreGuest: 10,
    stats: {
      p1: {
        ...createEmptyPlayerStats('p1', 'Giocatore 1', 5, 'GIOCATORE'),
        field: { ...createEmptyFieldPlayerStats(), gol: 8, rigoriGol: 2 },
      },
      gk1: {
        ...createEmptyPlayerStats('gk1', 'Portiere 1', 1, 'PORTIERE'),
        goalkeeper: { ...createEmptyGoalkeeperStats(), golSubiti: 5, rigoriSubiti: 0 },
      },
    },
    actionLog: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const calculated = calculateScoreFromMatch(match);
  assert.strictEqual(calculated.guest, 10, 'I nostri 10 gol in trasferta finiscono in scoreGuest');
  assert.strictEqual(calculated.home, 5, 'I 5 gol subiti in trasferta rimangono in scoreHome');
});

// 5. Test Validazione Import Backup JSON
runTest('Validazione Backup JSON: rifiuta schema futuro, id duplicati e contatori negativi', () => {
  // JSON valido
  const validJson = JSON.stringify({
    schemaVersion: 1,
    exportDate: '2026-10-21T10:00:00Z',
    app: 'SCOUT Handball',
    categories: [{ id: 'cat-1', name: 'Serie A' }],
    players: [{ id: 'p1', name: 'Atleta Test', number: 12, role: 'PORTIERE', categoryId: 'cat-1', active: true }],
    matches: [],
  });
  const resValid = validateBackupJson(validJson);
  assert.strictEqual(resValid.valid, true);

  // Schema non supportato
  const futureSchemaJson = JSON.stringify({
    schemaVersion: 999,
    categories: [],
    players: [],
    matches: [],
  });
  assert.strictEqual(validateBackupJson(futureSchemaJson).valid, false);

  // Numero maglia non valido (< 0 o > 99)
  const invalidJerseyJson = JSON.stringify({
    schemaVersion: 1,
    categories: [{ id: 'cat-1', name: 'Serie A' }],
    players: [{ id: 'p1', name: 'Atleta', number: 105, role: 'GIOCATORE', categoryId: 'cat-1', active: true }],
    matches: [],
  });
  assert.strictEqual(validateBackupJson(invalidJerseyJson).valid, false);
});

// 6. Test Normalizzazione Nome File
runTest('Normalizzazione Nome File: preserva lettere base rimuovendo diacritici', () => {
  const result = sanitizeFileName('Città di Trieste & Pallamano Faenza');
  assert.strictEqual(result, 'Citta_di_Trieste_Pallamano_Faenza');
});

// 7. Test Cybersecurity: Sanitizzazione Input XSS
runTest('Cybersecurity: sanitizzazione preventiva input contro attacchi XSS', () => {
  const dirty = '<script>alert("hack")</script>Mario Rossi<style>body{display:none}</style>';
  const clean = sanitizeInput(dirty);
  assert.strictEqual(clean.includes('<script>'), false);
  assert.strictEqual(clean.includes('</script>'), false);
  assert.strictEqual(clean.includes('<'), false);
  assert.strictEqual(clean.includes('>'), false);
  assert.strictEqual(clean.includes('Mario Rossi'), true);
});

// 8. Test Cybersecurity: Difesa da Prototype Pollution
runTest('Cybersecurity: rilevazione e blocco di payload JSON con prototype pollution', () => {
  const maliciousJson = '{"schemaVersion":1,"categories":[],"players":[],"matches":[],"__proto__":{"polluted":true}}';
  const result = validateBackupJson(maliciousJson);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.error?.includes('prototype pollution'), true);

  // Verifica scansione ricorsiva profonda in hasPrototypePollution
  assert.strictEqual(hasPrototypePollution(JSON.parse('{"deep":{"nested":{"__proto__":{"a":1}}}}')), true);
  assert.strictEqual(hasPrototypePollution(JSON.parse('{"deep":{"nested":{"constructor":{"a":1}}}}')), true);
});

// 9. Test Conformità Anno Sviluppo, Versione e Diritti
runTest('Metadati: verifica anno sviluppo 2026, versione 1.2.0 e riserva diritti', () => {
  assert.strictEqual(APP_METADATA.developmentYear, 2026);
  assert.strictEqual(APP_METADATA.version, '1.2.0');
  assert.strictEqual(APP_METADATA.copyrightNotice.includes('2026'), true);
  assert.strictEqual(APP_METADATA.copyrightNotice.includes('Tutti i diritti di sviluppo riservati'), true);
});

// 10. Test Internazionalizzazione (i18n): Parità Strutturale 100% IT vs EN
runTest('i18n: verifica parità al 100% delle chiavi di traduzione tra italiano e inglese', () => {
  function verifyKeyParity(objA: Record<string, any>, objB: Record<string, any>, prefix = '') {
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    assert.strictEqual(
      keysA.length,
      keysB.length,
      `Differenza nel conteggio chiavi a ${prefix || 'root'}: IT ha ${keysA.length}, EN ha ${keysB.length}`
    );

    for (const key of keysA) {
      assert.ok(
        key in objB,
        `Chiave "${prefix ? prefix + '.' : ''}${key}" presente in italiano ma mancante in inglese`
      );

      const valA = objA[key];
      const valB = objB[key];

      if (typeof valA === 'object' && valA !== null) {
        assert.strictEqual(typeof valB, 'object', `Tipo disallineato per ${key}`);
        verifyKeyParity(valA, valB, `${prefix ? prefix + '.' : ''}${key}`);
      } else {
        assert.strictEqual(typeof valA, 'string');
        assert.strictEqual(typeof valB, 'string');
        assert.ok(valA.length > 0, `Traduzione IT vuota per ${prefix}.${key}`);
        assert.ok(valB.length > 0, `Traduzione EN vuota per ${prefix}.${key}`);
      }
    }
  }

  verifyKeyParity(itTranslations, enTranslations);
});

// 11. Test Cybersecurity: Limite Dimensione File (5 MB)
runTest('Cybersecurity: rifiuto file di importazione con dimensione superiore a 5 MB', () => {
  // Stringa di 5 MB + 10 byte
  const largeFakeContent = ' '.repeat(MAX_IMPORT_SIZE_BYTES + 10);
  const result = validateBackupJson(largeFakeContent);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error?.includes('5 MB'), 'Messaggio di errore deve menzionare il limite di 5 MB');
});

// 12. Test Sicurezza: Proiezione ad Allowlist
runTest('Cybersecurity: proiezione ad allowlist e rimozione proprietà inaspettate o malevole', () => {
  const jsonWithExtra = JSON.stringify({
    schemaVersion: 1,
    categories: [{ id: 'cat-1', name: 'Serie A', unexpectedField: '<script>alert(1)</script>' }],
    players: [{ id: 'p1', name: 'Atleta', number: 10, role: 'GIOCATORE', categoryId: 'cat-1', active: true, evilProp: 'eval()' }],
    matches: [],
  });

  const res = validateBackupJson(jsonWithExtra);
  assert.strictEqual(res.valid, true);
  assert.ok(res.validatedData);
  assert.strictEqual((res.validatedData.categories[0] as any).unexpectedField, undefined);
  assert.strictEqual((res.validatedData.players[0] as any).evilProp, undefined);
});

// 13. Test ClubInfo: Sanitizzazione Anagrafica e XSS
runTest('Dati Società: sanitizzazione campi anagrafici, matricola FIGH e rimozione script XSS', () => {
  const dirtyClub = {
    name: '<script>alert("hack")</script>Pallamano Secchia Rubiera',
    codeFIGH: '<b>0123</b>',
    city: 'Rubiera (RE)<style>body{}</style>',
    gymnasium: 'PalaBursi',
    presidentOrReferent: 'Mario Rossi <img src=x onerror=alert(1)>',
    coach: 'Marco Bianchi',
    email: 'info@handball.it',
    phone: '+39 0522 123456',
    colors: 'Bianco-Rosso',
    notes: 'Società FIGH',
  };

  const clean = sanitizeClubInfo(dirtyClub);
  assert.strictEqual(clean.name.includes('<'), false);
  assert.strictEqual(clean.name.includes('>'), false);
  assert.strictEqual(clean.name.includes('Pallamano Secchia Rubiera'), true);
  assert.strictEqual(clean.codeFIGH?.includes('<'), false);
  assert.strictEqual(clean.codeFIGH?.includes('>'), false);
  assert.strictEqual(clean.codeFIGH?.includes('0123'), true);
  assert.strictEqual(clean.city?.includes('<'), false);
  assert.strictEqual(clean.city?.includes('Rubiera (RE)'), true);
  assert.strictEqual(clean.presidentOrReferent?.includes('<'), false);
  assert.strictEqual(clean.presidentOrReferent?.includes('Mario Rossi'), true);
  assert.strictEqual(clean.colors, 'Bianco-Rosso');
});

// 14. Test ClubInfo: Logo Data URL Formato e Sicurezza
runTest('Dati Società: accettazione solo data URL immagine validi e rifiuto payload malevoli', () => {
  // Logo PNG valido
  const validBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const cleanWithValidLogo = sanitizeClubInfo({
    name: 'Club Test',
    logoUrl: validBase64,
  });
  assert.strictEqual(cleanWithValidLogo.logoUrl, validBase64);

  // Logo con payload script / javascript URI rifiutato
  const maliciousLogo = 'javascript:alert("xss")';
  const cleanMalicious = sanitizeClubInfo({
    name: 'Club Test',
    logoUrl: maliciousLogo,
  });
  assert.strictEqual(cleanMalicious.logoUrl, '', 'Payload non-image deve essere azzerato');

  // Payload eccessivamente grande rifiutato per proteggere lo storage
  const oversizedLogo = 'data:image/png;base64,' + 'A'.repeat(800_000);
  const cleanOversized = sanitizeClubInfo({
    name: 'Club Test',
    logoUrl: oversizedLogo,
  });
  assert.strictEqual(cleanOversized.logoUrl, '', 'Logo superiore a 700KB deve essere scartato');
});

// 15. Test Backup JSON con ClubInfo
runTest('Backup JSON con ClubInfo: verifica inclusione, proiezione ad allowlist e ripristino', () => {
  const jsonWithClub = JSON.stringify({
    schemaVersion: 1,
    app: 'SCOUT Handball',
    clubInfo: {
      name: 'Handball Club Carpi',
      codeFIGH: 'CARP-01',
      city: 'Carpi (MO)',
      gymnasium: 'PalaVallauri',
      colors: 'Rosso-Blu',
    },
    categories: [{ id: 'c1', name: 'Serie A' }],
    players: [],
    matches: [],
  });

  const res = validateBackupJson(jsonWithClub);
  assert.strictEqual(res.valid, true);
  assert.ok(res.validatedData?.clubInfo);
  assert.strictEqual(res.validatedData.clubInfo.name, 'Handball Club Carpi');
  assert.strictEqual(res.validatedData.clubInfo.codeFIGH, 'CARP-01');
  assert.strictEqual(res.validatedData.clubInfo.city, 'Carpi (MO)');
  assert.strictEqual(res.validatedData.clubInfo.gymnasium, 'PalaVallauri');
});

// 16. Test Partita in Trasferta (isAwayMatch)
runTest('Gestione Partite: supporto isAwayMatch e persistenza modalità Trasferta', () => {
  const jsonWithAwayMatch = JSON.stringify({
    schemaVersion: 1,
    app: 'SCOUT Handball',
    categories: [{ id: 'c1', name: 'Serie A' }],
    players: [],
    matches: [
      {
        id: 'm1',
        categoryId: 'c1',
        date: '2026-10-24',
        homeTeam: 'Squadra Avversaria',
        guestTeam: 'Pallamano Secchia Rubiera',
        location: 'PalaSport Ospitante',
        isAwayMatch: true,
        scoreHome: 12,
        scoreGuest: 15,
        stats: {},
        actionLog: [],
      },
    ],
  });

  const res = validateBackupJson(jsonWithAwayMatch);
  assert.strictEqual(res.valid, true);
  assert.ok(res.validatedData?.matches[0]);
  assert.strictEqual(res.validatedData.matches[0].isAwayMatch, true);
  assert.strictEqual(res.validatedData.matches[0].homeTeam, 'Squadra Avversaria');
  assert.strictEqual(res.validatedData.matches[0].guestTeam, 'Pallamano Secchia Rubiera');
});

// 17. Test Associazione Dati Società e Rosa in Trasferta
runTest('Associazione Dati Società e Rosa: le azioni dei giocatori rimangono legate alla Società anche in Trasferta', () => {
  const matchAway: HandballMatch = {
    id: 'm_away_roster',
    homeTeam: 'Squadra Avversaria',
    guestTeam: 'Pallamano Secchia Rubiera',
    categoryId: 'c1',
    date: '2026-10-24',
    location: 'Palasport Avversario',
    notes: '',
    isAwayMatch: true,
    scoreHome: 0,
    scoreGuest: 0,
    stats: {
      p1: {
        ...createEmptyPlayerStats('p1', 'Mario Rossi', 7, 'GIOCATORE'),
        field: { ...createEmptyFieldPlayerStats(), gol: 4, assist: 3 },
      },
      p2: {
        ...createEmptyPlayerStats('p2', 'Luigi Bianchi', 10, 'GIOCATORE'),
        field: { ...createEmptyFieldPlayerStats(), gol: 2 },
      },
    },
    actionLog: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  assert.strictEqual(getOurSide(matchAway), 'GUEST', 'In trasferta la nostra squadra è GUEST');
  assert.strictEqual(getOpponentSide(matchAway), 'HOME', 'In trasferta l\'avversario è HOME');

  const scores = calculateScoreFromMatch(matchAway);
  assert.strictEqual(scores.guest, 6, 'Gol totali atleta 1 (4) + atleta 2 (2) = 6 per la nostra squadra (GUEST)');
  assert.strictEqual(scores.home, 0, 'Nessun gol subito registrato');

  // Verifica che le stats degli atleti in Rosa rimangano salvate nel dizionario stats
  assert.strictEqual(matchAway.stats['p1'].playerName, 'Mario Rossi');
  assert.strictEqual(matchAway.stats['p1'].field.gol, 4);
  assert.strictEqual(matchAway.stats['p1'].field.assist, 3);
});

// 18. Test Inversione Dinamica CASA <-> OSPITI
runTest('Inversione Dinamica CASA <-> OSPITI: l\'inversione della sede della partita ricalcola correttamente il punteggio sulle due squadre', () => {
  const initialMatch: HandballMatch = {
    id: 'm_switch',
    homeTeam: 'Pallamano Secchia Rubiera',
    guestTeam: 'HC Carpi',
    categoryId: 'c1',
    date: '2026-10-24',
    location: '',
    notes: '',
    isAwayMatch: false, // CASA
    scoreHome: 0,
    scoreGuest: 0,
    stats: {
      p1: {
        ...createEmptyPlayerStats('p1', 'Giocatore 1', 10, 'GIOCATORE'),
        field: { ...createEmptyFieldPlayerStats(), gol: 5 },
      },
      gk1: {
        ...createEmptyPlayerStats('gk1', 'Portiere 1', 1, 'PORTIERE'),
        goalkeeper: { ...createEmptyGoalkeeperStats(), golSubiti: 3 },
      },
    },
    actionLog: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Iniziale IN CASA: i nostri 5 gol sono scoreHome, i 3 subiti sono scoreGuest
  const initialScores = calculateScoreFromMatch(initialMatch);
  assert.strictEqual(initialScores.home, 5);
  assert.strictEqual(initialScores.guest, 3);

  // Inversione: diventiamo TRASFERTA (isAwayMatch = true), homeTeam e guestTeam si scambiano
  const switchedMatch: HandballMatch = {
    ...initialMatch,
    homeTeam: initialMatch.guestTeam, // HC Carpi
    guestTeam: initialMatch.homeTeam, // Pallamano Secchia Rubiera
    isAwayMatch: true, // TRASFERTA
  };

  const switchedScores = calculateScoreFromMatch(switchedMatch);
  assert.strictEqual(switchedScores.home, 3, 'I gol subiti ora sono scoreHome per HC Carpi');
  assert.strictEqual(switchedScores.guest, 5, 'I nostri gol ora sono scoreGuest per Secchia Rubiera');
});

// 19. Test Backup JSON: preservazione del campo teamSide in ActionLog
runTest('Backup JSON: preservazione e validazione del campo teamSide in actionLog', () => {
  const jsonWithTeamSide = JSON.stringify({
    schemaVersion: 1,
    app: 'SCOUT Handball',
    categories: [{ id: 'c1', name: 'Serie A' }],
    players: [],
    matches: [
      {
        id: 'm1',
        categoryId: 'c1',
        date: '2026-10-24',
        homeTeam: 'Casa',
        guestTeam: 'Ospiti',
        scoreHome: 1,
        scoreGuest: 1,
        stats: {},
        actionLog: [
          {
            id: 'a1',
            timestamp: 1000,
            actionType: 'FP_GOL',
            label: 'Gol nostro',
            scoreChangeHome: 1,
            scoreChangeGuest: 0,
            teamSide: 'HOME',
          },
          {
            id: 'a2',
            timestamp: 2000,
            actionType: 'OPPONENT_GOAL',
            label: 'Gol avversari',
            scoreChangeHome: 0,
            scoreChangeGuest: 1,
            teamSide: 'GUEST',
          },
        ],
      },
    ],
  });

  const res = validateBackupJson(jsonWithTeamSide);
  assert.strictEqual(res.valid, true);
  assert.ok(res.validatedData);
  const log = res.validatedData.matches[0].actionLog;
  assert.strictEqual(log.length, 2);
  assert.strictEqual(log[0].teamSide, 'HOME', 'teamSide HOME deve essere preservato');
  assert.strictEqual(log[1].teamSide, 'GUEST', 'teamSide GUEST deve essere preservato');
});

// 20. Test Compatibilità Legacy e Modifiche Manuali Superiori a Log
runTest('Compatibilità Legacy e Modifiche Manuali: preserva punteggio senza statistiche e rispetta gol subiti modificati', () => {
  // Caso 1: Partita legacy senza stats né actionLog (mantiene scoreHome e scoreGuest salvati)
  const legacyMatch: HandballMatch = {
    id: 'm_legacy',
    homeTeam: 'Squadra A',
    guestTeam: 'Squadra B',
    categoryId: 'c1',
    date: '2026-10-24',
    location: '',
    notes: '',
    isAwayMatch: false,
    scoreHome: 28,
    scoreGuest: 25,
    stats: {},
    actionLog: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const legacyScores = calculateScoreFromMatch(legacyMatch);
  assert.strictEqual(legacyScores.home, 28, 'Punteggio legacy home deve rimanere intatto');
  assert.strictEqual(legacyScores.guest, 25, 'Punteggio legacy guest deve rimanere intatto');

  // Caso 2: Modifica manuale superiore al numero di eventi in actionLog
  const editedMatch: HandballMatch = {
    ...legacyMatch,
    stats: {
      gk1: {
        ...createEmptyPlayerStats('gk1', 'Portiere', 1, 'PORTIERE'),
        goalkeeper: { ...createEmptyGoalkeeperStats(), golSubiti: 15 },
      },
    },
    actionLog: [
      { id: '1', timestamp: 1, actionType: 'GK_GOL_SUBITO', label: 'Gol', scoreChangeHome: 0, scoreChangeGuest: 1 },
    ],
  };

  const editedScores = calculateScoreFromMatch(editedMatch);
  assert.strictEqual(editedScores.guest, 15, 'I gol subiti devono rispecchiare i 15 del portiere modificati manualmente');
});

// 21. Test FASE A: Gol subito dal portiere + "-1 avversari" disabilitato -> punteggio 0-1 stabile dopo inversione casa/ospiti
runTest('FASE A: Gol subito portiere + -1 avversari non disponibile -> 0-1 stabile dopo inversione', () => {
  const match: HandballMatch = {
    id: 'm_gk_goal',
    homeTeam: 'Nostri',
    guestTeam: 'Ospiti',
    categoryId: 'c1',
    date: '2026-10-24',
    location: '',
    notes: '',
    isAwayMatch: false,
    scoreHome: 0,
    scoreGuest: 1,
    stats: {
      gk1: {
        ...createEmptyPlayerStats('gk1', 'Portiere', 1, 'PORTIERE'),
        goalkeeper: { ...createEmptyGoalkeeperStats(), golSubiti: 1 },
      },
    },
    actionLog: [
      { id: '1', timestamp: 1, actionType: 'GK_GOL_SUBITO', label: 'Gol Subito', scoreChangeHome: 0, scoreChangeGuest: 1, teamSide: 'GUEST' },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // unassignedOpp deve essere 0 perché il gol è già sul portiere
  assert.strictEqual(getUnassignedOpponentGoals(match.actionLog), 0, 'unassignedOpp deve essere 0');

  const s1 = calculateScoreFromMatch(match);
  assert.strictEqual(s1.home, 0);
  assert.strictEqual(s1.guest, 1);

  // Inversione Casa/Ospiti
  const invertedMatch: HandballMatch = {
    ...match,
    homeTeam: 'Ospiti',
    guestTeam: 'Nostri',
    isAwayMatch: true,
  };

  const s2 = calculateScoreFromMatch(invertedMatch);
  assert.strictEqual(s2.guest, 0, 'In trasferta i nostri gol (0) sono scoreGuest');
  assert.strictEqual(s2.home, 1, 'In trasferta i gol subiti (1) sono scoreHome');
});

// 22. Test FASE A: OPPONENT_GOAL x2, poi undo x1 -> 0-1 live e dopo ricalcolo
runTest('FASE A: OPPONENT_GOAL x2, poi undo x1 -> 0-1 live e dopo ricalcolo', () => {
  const match: HandballMatch = {
    id: 'm_opp_undo',
    homeTeam: 'Nostri',
    guestTeam: 'Ospiti',
    categoryId: 'c1',
    date: '2026-10-24',
    location: '',
    notes: '',
    isAwayMatch: false,
    scoreHome: 0,
    scoreGuest: 0,
    stats: {},
    actionLog: [
      { id: '1', timestamp: 1, actionType: 'OPPONENT_GOAL', label: 'Gol Avv', scoreChangeHome: 0, scoreChangeGuest: 1 },
      { id: '2', timestamp: 2, actionType: 'OPPONENT_GOAL', label: 'Gol Avv', scoreChangeHome: 0, scoreChangeGuest: 1 },
      { id: '3', timestamp: 3, actionType: 'OPPONENT_GOAL_UNDO', label: 'Undo Avv', scoreChangeHome: 0, scoreChangeGuest: -1 },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  assert.strictEqual(getUnassignedOpponentGoals(match.actionLog), 1, 'unassignedOpp deve essere 2 - 1 = 1');
  const scores = calculateScoreFromMatch(match);
  assert.strictEqual(scores.home, 0);
  assert.strictEqual(scores.guest, 1);
});

// 23. Test FASE A: Portiere con 3 gol subiti ridotto a 1 in modifica manuale -> punteggio avversario 1
runTest('FASE A: Portiere ridotto da 3 a 1 gol subiti manualmente -> punteggio avversario 1', () => {
  const match: HandballMatch = {
    id: 'm_gk_reduced',
    homeTeam: 'Nostri',
    guestTeam: 'Ospiti',
    categoryId: 'c1',
    date: '2026-10-24',
    location: '',
    notes: '',
    isAwayMatch: false,
    scoreHome: 0,
    scoreGuest: 3,
    stats: {
      gk1: {
        ...createEmptyPlayerStats('gk1', 'Portiere 1', 1, 'PORTIERE'),
        goalkeeper: { ...createEmptyGoalkeeperStats(), golSubiti: 1, rigoriSubiti: 0 },
      },
    },
    actionLog: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const scores = calculateScoreFromMatch(match);
  assert.strictEqual(scores.home, 0);
  assert.strictEqual(scores.guest, 1, 'Il punteggio ospite si aggiorna a 1');
});

// 24. Test FASE A: Inversione casa/ospiti in ogni scenario -> punteggio invariato sulle squadre, scambiato di lato
runTest('FASE A: Inversione Casa/Ospiti in tutti gli scenari -> stabilità delle identità di squadra', () => {
  const match: HandballMatch = {
    id: 'm_multi',
    homeTeam: 'Squadra Alpha',
    guestTeam: 'Squadra Beta',
    categoryId: 'c1',
    date: '2026-10-24',
    location: '',
    notes: '',
    isAwayMatch: false,
    scoreHome: 0,
    scoreGuest: 0,
    stats: {
      p1: {
        ...createEmptyPlayerStats('p1', 'Giocatore 1', 10, 'GIOCATORE'),
        field: { ...createEmptyFieldPlayerStats(), gol: 4, rigoriGol: 1 },
      },
      gk1: {
        ...createEmptyPlayerStats('gk1', 'Portiere 1', 12, 'PORTIERE'),
        goalkeeper: { ...createEmptyGoalkeeperStats(), golSubiti: 3, rigoriSubiti: 1 },
      },
    },
    actionLog: [
      { id: '1', timestamp: 1, actionType: 'OPPONENT_GOAL', label: 'Gol non assegnato', scoreChangeHome: 0, scoreChangeGuest: 1 },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Alpha (nostri): 4+1 = 5 gol. Beta (avversari): 3+1 (GK) + 1 (unassigned) = 5 gol.
  const sHome = calculateScoreFromMatch(match);
  assert.strictEqual(sHome.home, 5, 'Alpha ha segnato 5 gol');
  assert.strictEqual(sHome.guest, 5, 'Beta ha segnato 5 gol');

  // Inverti a Trasferta
  const matchAway: HandballMatch = {
    ...match,
    homeTeam: 'Squadra Beta',
    guestTeam: 'Squadra Alpha',
    isAwayMatch: true,
  };

  const sAway = calculateScoreFromMatch(matchAway);
  assert.strictEqual(sAway.home, 5, 'Beta (in casa) ha 5 gol');
  assert.strictEqual(sAway.guest, 5, 'Alpha (in trasferta) ha 5 gol');
});

// 25. Test FASE A: Backup importato con log e stats coerenti -> stesso punteggio prima/dopo ricalcolo
runTest('FASE A: Backup importato con log e stats coerenti -> stesso punteggio prima e dopo il ricalcolo', () => {
  const importedMatch: HandballMatch = {
    id: 'm_import_cohesive',
    homeTeam: 'Nostra Club',
    guestTeam: 'Avversario',
    categoryId: 'c1',
    date: '2026-10-24',
    location: '',
    notes: '',
    isAwayMatch: false,
    scoreHome: 2,
    scoreGuest: 1,
    stats: {
      p1: {
        ...createEmptyPlayerStats('p1', 'Giocatore 1', 7, 'GIOCATORE'),
        field: { ...createEmptyFieldPlayerStats(), gol: 2 },
      },
      gk1: {
        ...createEmptyPlayerStats('gk1', 'Portiere 1', 1, 'PORTIERE'),
        goalkeeper: { ...createEmptyGoalkeeperStats(), golSubiti: 1 },
      },
    },
    actionLog: [
      { id: '1', timestamp: 1, actionType: 'FP_GOL', label: 'Gol', scoreChangeHome: 1, scoreChangeGuest: 0 },
      { id: '2', timestamp: 2, actionType: 'FP_GOL', label: 'Gol', scoreChangeHome: 1, scoreChangeGuest: 0 },
      { id: '3', timestamp: 3, actionType: 'GK_GOL_SUBITO', label: 'Gol Subito', scoreChangeHome: 0, scoreChangeGuest: 1 },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const recalculated = calculateScoreFromMatch(importedMatch);
  assert.strictEqual(recalculated.home, importedMatch.scoreHome, 'Score home non deve variare');
  assert.strictEqual(recalculated.guest, importedMatch.scoreGuest, 'Score guest non deve variare');
});

// 26. Test FASE B: Matrix di autorizzazione isTargetAllowed su tutte le combinazioni
runTest('FASE B: Matrix isTargetAllowed su tutte le combinazioni ActionType x Ruolo/Ufficiale', () => {
  for (const act of ACTION_TYPES) {
    if (act.startsWith('FP_')) {
      assert.strictEqual(isTargetAllowed(act, 'GIOCATORE'), true, `${act} deve essere permesso a GIOCATORE`);
      assert.strictEqual(isTargetAllowed(act, 'PORTIERE'), false, `${act} NON deve essere permesso a PORTIERE`);
      assert.strictEqual(isTargetAllowed(act, 'DIRIGENTE'), false, `${act} NON deve essere permesso a DIRIGENTE`);
    } else if (act.startsWith('GK_')) {
      assert.strictEqual(isTargetAllowed(act, 'PORTIERE'), true, `${act} deve essere permesso a PORTIERE`);
      assert.strictEqual(isTargetAllowed(act, 'GIOCATORE'), false, `${act} NON deve essere permesso a GIOCATORE`);
      assert.strictEqual(isTargetAllowed(act, 'DIRIGENTE'), false, `${act} NON deve essere permesso a DIRIGENTE`);
    } else if (act.startsWith('SANCTION_OFFICIAL_')) {
      assert.strictEqual(isTargetAllowed(act, 'DIRIGENTE'), true, `${act} deve essere permesso a DIRIGENTE`);
      assert.strictEqual(isTargetAllowed(act, 'GIOCATORE'), false, `${act} NON deve essere permesso a GIOCATORE`);
      assert.strictEqual(isTargetAllowed(act, 'PORTIERE'), false, `${act} NON deve essere permesso a PORTIERE`);
    } else if (act.startsWith('SANCTION_')) {
      assert.strictEqual(isTargetAllowed(act, 'GIOCATORE'), true, `${act} deve essere permesso a GIOCATORE`);
      assert.strictEqual(isTargetAllowed(act, 'PORTIERE'), true, `${act} deve essere permesso a PORTIERE`);
      assert.strictEqual(isTargetAllowed(act, 'DIRIGENTE'), true, `${act} deve essere permesso a DIRIGENTE`);
    }
  }
});

// 27. Test FASE C: Wipe all local data
runTest('FASE C: wipeAllLocalData rimuove tutte e sole le chiavi scout_handball_*', () => {
  // Mock localStorage
  const fakeStore: Record<string, string> = {
    'scout_handball_db': '{"test":1}',
    'scout_handball_safety': '{"test":2}',
    'scout_handball_corrupt_123': '{"test":3}',
    'scout_handball_lang': 'it',
    'scout_handball_pwa_dismissed': 'true',
    'other_app_key': 'keep_me',
  };

  const origLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      length: Object.keys(fakeStore).length,
      key: (i: number) => Object.keys(fakeStore)[i] || null,
      getItem: (k: string) => fakeStore[k] || null,
      setItem: (k: string, v: string) => { fakeStore[k] = v; },
      removeItem: (k: string) => { delete fakeStore[k]; },
      clear: () => { Object.keys(fakeStore).forEach(k => delete fakeStore[k]); },
    },
    writable: true,
    configurable: true,
  });

  wipeAllLocalData();

  assert.strictEqual(fakeStore['scout_handball_db'], undefined);
  assert.strictEqual(fakeStore['scout_handball_safety'], undefined);
  assert.strictEqual(fakeStore['scout_handball_corrupt_123'], undefined);
  assert.strictEqual(fakeStore['scout_handball_lang'], undefined);
  assert.strictEqual(fakeStore['scout_handball_pwa_dismissed'], undefined);
  assert.strictEqual(fakeStore['other_app_key'], 'keep_me', 'Chiavi non dell\'app devono essere preservate');

  Object.defineProperty(globalThis, 'localStorage', { value: origLocalStorage, writable: true, configurable: true });
});

// 28. Test FASE C: Import con actionType non valido scarta gli elementi e aggiunge warning
runTest('FASE C: Import con actionType non valido scarta gli elementi non validi e riporta warning', () => {
  const invalidActionJson = JSON.stringify({
    schemaVersion: 1,
    app: 'SCOUT Handball',
    categories: [{ id: 'c1', name: 'Serie A' }],
    players: [],
    matches: [
      {
        id: 'm1',
        categoryId: 'c1',
        date: '2026-10-24',
        homeTeam: 'Casa',
        guestTeam: 'Ospiti',
        scoreHome: 1,
        scoreGuest: 0,
        stats: {},
        actionLog: [
          { id: 'a1', timestamp: 1, actionType: 'FP_GOL', label: 'Gol', scoreChangeHome: 1, scoreChangeGuest: 0 },
          { id: 'a2', timestamp: 2, actionType: 'INVALID_ACTION_NAME_XYZ', label: 'Invalido', scoreChangeHome: 0, scoreChangeGuest: 0 },
        ],
      },
    ],
  });

  const res = validateBackupJson(invalidActionJson);
  assert.strictEqual(res.valid, true);
  assert.ok(res.validatedData);
  assert.strictEqual(res.validatedData.matches[0].actionLog.length, 1, 'Il log deve contenere solo l\'azione valida');
  assert.ok(res.warnings && res.warnings.length > 0, 'Deve contenere warning sugli elementi scartati');
  assert.ok(res.warnings?.[0]?.includes('azione'), 'Il warning deve menzionare le azioni scartate');
});

// 29. Test FASE C: Import con categoria mancante crea automaticamente la categoria
runTest('FASE C: Import con categoryId inesistente crea automaticamente Categoria importata', () => {
  const missingCatJson = JSON.stringify({
    schemaVersion: 1,
    app: 'SCOUT Handball',
    categories: [{ id: 'c1', name: 'Serie A' }],
    players: [{ id: 'p1', name: 'Atleta', number: 7, role: 'GIOCATORE', categoryId: 'missing_cat_99', active: true }],
    matches: [],
  });

  const res = validateBackupJson(missingCatJson);
  assert.strictEqual(res.valid, true);
  assert.ok(res.validatedData);
  const createdCat = res.validatedData.categories.find(c => c.id === 'missing_cat_99');
  assert.ok(createdCat, 'La categoria mancante deve essere stata creata');
  assert.strictEqual(createdCat.name, 'Categoria importata');
});

// 30. Test FASE C: Controllo byte reali con stringhe multibyte
runTest('FASE C: Controllo dimensione in byte reali su caratteri multibyte', () => {
  const encoder = new TextEncoder();
  const multiByteStr = '⚽'.repeat(100);
  const byteLen = encoder.encode(multiByteStr).length;
  assert.strictEqual(byteLen, 300, '3 byte per emoji ⚽');
  assert.notStrictEqual(multiByteStr.length, byteLen, 'str.length non equivale a byte length');
});

// 31. Test FASE C: Round-trip export -> import
runTest('FASE C: Round-trip di esportazione e importazione preserva la fedeltà dei dati', () => {
  const originalData: BackupData = {
    schemaVersion: 1,
    exportDate: new Date().toISOString(),
    app: 'SCOUT Handball',
    clubInfo: { name: 'Handball Test Club', codeFIGH: '12345' },
    categories: [{ id: 'c1', name: 'Under 17' }],
    players: [{ id: 'p1', name: 'Marco', number: 9, role: 'GIOCATORE', categoryId: 'c1', active: true }],
    matches: [
      {
        id: 'm1',
        categoryId: 'c1',
        date: '2026-10-24',
        homeTeam: 'Handball Test Club',
        guestTeam: 'Avversari',
        location: 'Palasport',
        notes: '',
        scoreHome: 1,
        scoreGuest: 0,
        stats: {},
        actionLog: [{ id: 'a1', timestamp: 1000, actionType: 'FP_GOL', label: 'Gol', scoreChangeHome: 1, scoreChangeGuest: 0 }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
  };

  const serialized = JSON.stringify(originalData);
  const validated = validateBackupJson(serialized);

  assert.strictEqual(validated.valid, true);
  assert.ok(validated.validatedData);
  assert.strictEqual(validated.validatedData.clubInfo?.name, 'Handball Test Club');
  assert.strictEqual(validated.validatedData.players[0].name, 'Marco');
  assert.strictEqual(validated.validatedData.matches[0].actionLog[0].actionType, 'FP_GOL');
});

console.log(`\n=== TUTTI I ${passedTests} TEST COMPLETATI CON SUCCESSO! ===`);

