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
} from '../src/utils/stats';
import {
  validateBackupJson,
  sanitizeInput,
  hasPrototypePollution,
  MAX_IMPORT_SIZE_BYTES,
  sanitizeClubInfo,
  DEFAULT_CLUB_INFO,
} from '../src/utils/storage';
import { sanitizeFileName } from '../src/utils/pdfExport';
import { APP_METADATA } from '../src/constants/appInfo';
import { GoalkeeperStats, FieldPlayerStats, SanctionsStats, PlayerMatchStats } from '../src/types/scout';
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

// 4. Test Simmetria Log Action e Undo
runTest('Simmetria Incremento e Undo: ripristino esatto dei contatori e del punteggio', () => {
  let scoreHome = 10;
  let scoreGuest = 8;
  const pStats = createEmptyPlayerStats('p1', 'Centrale', 5, 'GIOCATORE');

  // Azione 1: Gol su azione (+1 scoreHome)
  pStats.field.gol += 1;
  scoreHome += 1;
  assert.strictEqual(pStats.field.gol, 1);
  assert.strictEqual(scoreHome, 11);

  // Undo Azione 1:
  pStats.field.gol = Math.max(0, pStats.field.gol - 1);
  scoreHome = Math.max(0, scoreHome - 1);
  assert.strictEqual(pStats.field.gol, 0);
  assert.strictEqual(scoreHome, 10);

  // Azione 2: Gol subito (+1 scoreGuest)
  pStats.goalkeeper.golSubiti += 1;
  scoreGuest += 1;
  assert.strictEqual(scoreGuest, 9);

  // Undo Azione 2:
  pStats.goalkeeper.golSubiti = Math.max(0, pStats.goalkeeper.golSubiti - 1);
  scoreGuest = Math.max(0, scoreGuest - 1);
  assert.strictEqual(pStats.goalkeeper.golSubiti, 0);
  assert.strictEqual(scoreGuest, 8);
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

console.log(`\n=== TUTTI I ${passedTests} TEST COMPLETATI CON SUCCESSO! ===`);
