/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const APP_METADATA = {
  name: 'SCOUT Handball',
  version: '1.2.0',
  releaseDate: '2026-10-21',
  developmentYear: 2026,
  copyrightNotice: '© 2026 SCOUT Handball. Tutti i diritti di sviluppo riservati.',
  developerNotice: 'Tutti i diritti di sviluppo, proprietà intellettuale e codice sorgente sono riservati.',
  privacyCompliance: {
    standard: 'GDPR (Regolamento UE 2016/679) Compliant',
    dataStorage: '100% Locale sul dispositivo (Sandbox Web Storage). Nessun server remoto.',
    tracking: 'Zero cookie di tracciamento, nessun pixel pubblicitario, nessuna profilazione.',
    minorsProtection: 'Massima tutela della privacy degli atleti minori (categorie giovanili) senza esposizione online.',
    rightToErasure: 'Diritto all\'oblio (Art. 17 GDPR): possibilità di cancellare definitivamente tutti i dati locali in qualunque momento.',
  },
  cybersecurityCompliance: {
    principles: [
      'Privacy by Design e Privacy by Default (Art. 25 GDPR)',
      'Input Sanitization & XSS Protection: sanitizzazione preventiva dei campi testuali',
      'Validazione strutturale JSON anti-tampering e schema poisoning',
      'Protezione anti-Prototype Pollution durante il parsing dei backup',
      'Esportazione sicura PDF e JSON client-side senza transito di rete',
      'Nessun invio di credenziali, telemetria o dati a terze parti',
    ],
  },
};
