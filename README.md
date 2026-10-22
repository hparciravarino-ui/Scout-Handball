# SCOUT Handball 🤾‍♂️

> **Applicazione Professionale di Scouting Tecnico e Rilevazione Statistica per la Pallamano**  
> *Professional Handball Technical Scouting & Real-time Statistical Tracking Application*

[![CI](https://github.com/scout-handball/scout-handball/actions/workflows/ci.yml/badge.svg)](https://github.com/scout-handball/scout-handball/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

---

## 🇮🇹 Panoramica del Progetto

**SCOUT Handball** è un'applicazione web progressiva, responsive e offline-first specificamente concepita per allenatori, scout e dirigenti di società di pallamano. Consente la rilevazione delle azioni tecniche in tempo reale da smartphone o tablet **senza necessità di cronometro**, generando referti PDF ufficiali A4 ad alta risoluzione e garantendo la massima riservatezza dei dati mediante un'architettura **100% Client-Side**.

### Caratteristiche Principali

- ⚡ **Rilevazione Scout Live a Tocco Singolo (Zero Cronometro):**
  - **Portieri:** Parate su tiro in gioco, Gol subiti su azione, 7 metri parati, 7 metri subiti. Percentuali di efficacia calcolate istantaneamente.
  - **Giocatori di Movimento:** Gol su azione, Tiri fuori/parati, 7m realizzati, 7m sbagliati, Assist vincenti, Palle perse in passaggio, Palle perse in ricezione.
  - **Sanzioni Disciplinari IHF:** Finestra modale dedicata per assegnazione Cartellino Giallo (ammonizione), Sospensione temporanea 2 Minuti, Cartellino Rosso (squalifica) e Cartellino Blu (rapporto a referto).
  - **Annullamento Simmetrico (Undo):** Storico completo di ripristino per annullare all'istante qualsiasi tocco accidentale sincronizzando statistiche e punteggio.
- 👥 **Gestione Categorie & Rosa Atleti:**
  - Categorie modificabili (Serie A, Serie B, Under 19, Under 17, Under 15, ecc.).
  - Gestione atleti con vincolo di maglia univoco (0-99) all'interno della stessa categoria.
  - Ruoli specifici (Portiere e Giocatore di Movimento).
- 📑 **Archivio Partite & Correzione Manuale:**
  - Elenco partite con dettaglio punteggi, date e palazzetto di gara.
  - Tabella statistica analitica per singoli atleti e box riepilogativo di squadra.
  - Modale di rettifica manuale post-partita per correggere contatori o sanzioni prima della stampa.
- 🖨️ **Esportazione Referto Tecnico PDF A4:**
  - Layout orizzontale vettoriale multipagina ad alta risoluzione con intestazione federale e fascia tricolore italiana.
  - Tabelle separate per giocatori e portieri con percentuali di realizzazione e parata.
  - Riepilogo tecnico di squadra, note di gara e numerazione automatica «Pagina x di y».
- 🔒 **Backup JSON Sicuro & Cybersecurity Avanzata:**
  - Esportazione ed importazione JSON con copia di sicurezza preventiva automatica (`scout_handball_pre_import_backup`).
  - Scansione ricorsiva anti-Prototype Pollution (`__proto__`, `constructor`, `prototype`).
  - Limite di sicurezza sulla dimensione dei file (max 5 MB).
  - Proiezione restrittiva ad allowlist di tutte le proprietà importate.
  - Sanitizzazione preventiva di ogni input testuale contro iniezioni XSS.
- 🌍 **Internazionalizzazione (i18n):**
  - Supporto completo e tipizzato per **Italiano** (predefinito) e **Inglese**.
  - Commutazione istantanea dall'header senza ricaricamento di pagina.
  - Traduzione automatica di referti PDF e date tramite standard `Intl`.

---

## 🇬🇧 English Executive Summary

**SCOUT Handball** is an offline-first, zero-cloud technical scouting application built for handball coaches and analysts. It runs entirely inside the browser without requiring a server backend, user accounts, or external subscriptions. Features include real-time single-touch match event recording (no clock required), disciplinary sanction tracking (IHF rules), roster management, instant undo capabilities, professional A4 PDF match sheet export, and secure JSON backups with deep prototype pollution prevention and strict allowlist validation. Full typed English and Italian localization is supported out-of-the-box.

---

## 🛠️ Stack Tecnologico

- **Framework:** React 19 (Hooks, Context, Functional Components)
- **Linguaggio:** TypeScript 5.x (Strict typing, no `any` non gestiti)
- **Bundler & Dev Server:** Vite 6 / 8 (Port 3000, fast ESM compilation)
- **Styling:** Tailwind CSS 4.x (Utility-first, design tokens federazione #00008B, tricolore)
- **Icone:** Lucide React
- **Motore PDF:** jsPDF + jspdf-autotable (rendering vettoriale A4)
- **Test Runner:** Node.js native test runner + `tsx`

---

## 📁 Architettura del Repository

```
├── .github/
│   ├── workflows/
│   │   └── ci.yml                     # Pipeline GitHub Actions (lint, test, build)
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md              # Template segnalazione bug
│       └── feature_request.md         # Template richiesta funzionalità
├── src/
│   ├── components/
│   │   ├── ArchiveScreen.tsx          # Gestione archivio, rettifiche e PDF
│   │   ├── BackupScreen.tsx           # Import/Export JSON e conformità
│   │   ├── BottomNav.tsx              # Barra di navigazione smartphone
│   │   ├── Button3D.tsx               # Pulsante tattile 3D anti-misclick
│   │   ├── Header.tsx                 # Intestazione con fascia tricolore e selettore lingua
│   │   ├── PrivacySecurityModal.tsx   # Informativa trasparente GDPR e sicurezza
│   │   ├── RosterScreen.tsx           # Gestione categorie e atleti rosa
│   │   ├── SanctionsDialog.tsx        # Finestra sanzioni disciplinari IHF
│   │   └── ScoutLiveScreen.tsx        # Schermata di rilevazione live rapida
│   ├── constants/
│   │   └── appInfo.ts                 # Metadati, versione, anno sviluppo 2026
│   ├── i18n/
│   │   ├── types.ts                   # Interfaccia Translations tipizzata
│   │   ├── it.ts                      # Dizionario Italiano ufficiale
│   │   ├── en.ts                      # Dizionario Inglese ufficiale
│   │   ├── context.tsx                # Context provider, hook useI18n() e formattatori
│   │   └── index.ts                   # Barrel export
│   ├── types/
│   │   └── scout.ts                   # Modelli di dati, ruoli, sanzioni, statistiche
│   ├── utils/
│   │   ├── pdfExport.ts               # Generatore referti tecnici A4 multilingua
│   │   ├── stats.ts                   # Algoritmi statistici e formule matematiche
│   │   └── storage.ts                 # Storage locale, controlli sicurezza, allowlist
│   ├── App.tsx                        # Controller principale dell'applicazione
│   ├── index.css                      # Stili Tailwind globali
│   └── main.tsx                       # Entry point React con I18nProvider
├── test/
│   └── suite.ts                       # Suite di test automatizzati (12 test vincolanti)
├── LICENSE                            # Licenza Apache-2.0
├── SECURITY.md                        # Policy di sicurezza e perimetro sandbox
├── CONTRIBUTING.md                    # Linee guida per contributi e pull request
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🔒 Sicurezza, Privacy & Perimetro Locale (GDPR)

### 1. Architettura 100% Locale (Zero Cloud)
Tutti i dati dell'applicazione (atleti, categorie, partite e statistiche) risiedono unicamente nello **storage locale del browser** (`localStorage`).
- Nessun server backend remoto
- Nessun cookie di terze parti o pixel di tracciamento
- Nessuna telemetria o profilazione utenti
- Tutela rafforzata dei dati di atleti minorenni (Art. 8 GDPR)

### 2. Trasparenza Tecnica sullo Storage
I dati sono conservati in chiaro nel sandbox del browser dell'utente. Per garantire la riservatezza fisica del dispositivo, si raccomanda l'attivazione del blocco schermo con PIN/biometria e la crittografia a livello di sistema operativo.

### 3. Presidi di Cibersicurezza nel Codice
- **Anti-Prototype Pollution Ricorsivo:** Blocco preventivo di chiavi pericolose (`__proto__`, `constructor`, `prototype`) tramite `Object.getOwnPropertyNames` su tutta la profondità dell'oggetto.
- **Proiezione restrittiva ad Allowlist:** In fase di importazione JSON, qualsiasi proprietà estranea o non riconosciuta viene scartata prima di essere passata al database.
- **Protezione XSS (Cross-Site Scripting):** Tutti gli input utente (nomi, categorie, luoghi, note) vengono sanitizzati escludendo tag HTML (`<`, `>`) e limitati in lunghezza.
- **Quota Exceeded Error Handling:** Rilevazione e gestione dell'esaurimento memoria locale per evitare crash dell'interfaccia.
- **Backup Preventivo Automatico:** Generazione di una copia di sicurezza prima di qualsiasi sovrascrittura di archivio.

---

## 🚀 Installazione ed Esecuzione Locale

### Prerequisiti
- **Node.js** versione 18.0.0 o superiore
- **npm** (incluso in Node.js)

### Procedura

```bash
# 1. Clona il repository
git clone https://github.com/scout-handball/scout-handball.git
cd scout-handball

# 2. Installa le dipendenze
npm install

# 3. Avvia il server di sviluppo
npm run dev

# L'app sarà disponibile all'indirizzo http://localhost:3000
```

---

## 🧪 Esecuzione della Suite di Test

Il progetto include una suite di test rigorosa senza dipendenze pesanti, eseguibile istantaneamente con `tsx`:

```bash
# Esegui tutti i test automatizzati
npm test

# Esegui il controllo dei tipi TypeScript
npm run lint

# Esegui la compilazione di produzione
npm run build
```

### Copertura dei Test (`test/suite.ts`):
1. **Statistiche Portieri:** verifica parate totali, gol subiti, % parate e totale azioni.
2. **Statistiche Giocatori:** verifica gol, tiri, assist, palle perse e % realizzazione.
3. **Totali di Squadra:** aggregazione corretta di tutte le voci statistiche.
4. **Simmetria Incremento e Undo:** ripristino matematico perfetto dopo annullamento.
5. **Validazione JSON:** rifiuto di schemi futuri non supportati o id errati.
6. **Normalizzazione Nomi File:** sanitizzazione diacritica per download cross-platform.
7. **Sanitizzazione XSS:** filtraggio preventivo di frammenti di script HTML.
8. **Anti-Prototype Pollution:** rilevazione profonda di payload malevoli ricorsivi.
9. **Metadati Ufficiali:** verifica anno di sviluppo 2026, versione 1.2.0 e riserva diritti.
10. **Parità Dizionari i18n:** parità strutturale al 100% tra le chiavi italiane e inglesi.
11. **Limite Dimensione File:** rifiuto vincolante di file JSON superiori a 5 MB.
12. **Allowlist Projection:** verifica rimozione proprietà malevole iniettate.

---

## 📜 Licenza e Diritti di Sviluppo

Distribuito con licenza **Apache-2.0**. Consulta il file [`LICENSE`](LICENSE) per i termini completi.  
© 2026 SCOUT Handball. Tutti i diritti di sviluppo riservati.
