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

**SCOUT Handball** è un'applicazione web progressiva, responsive e offline-first gestita interamente lato client, concepita specificamente per allenatori, scout e dirigenti di società di pallamano. Consente la rilevazione avanzata delle azioni tecniche in tempo reale da qualsiasi dispositivo (smartphone, tablet o PC) **senza necessità di cronometro**, integrando la gestione dell'Anagrafica Società, la carica dei Dirigenti di Panchina (Ufficiali di Squadra A, B, C, D) e la generazione di referti tecnici ufficiali PDF A4 ad alta risoluzione in conformità con i regolamenti FIGH e IHF.

---

### 🌟 Caratteristiche Principali

- ⚡ **Rilevazione Scout Live a Tocco Singolo (Zero Cronometro):**
  - **Portieri:** Parate su tiro in gioco, Gol subiti su azione, 7 metri parati, 7 metri subiti. Calcolo automatico istantaneo della percentuale di efficacia.
  - **Giocatori di Movimento:** Gol su azione, Tiri fuori/parati, 7m realizzati, 7m sbagliati, Assist vincenti, Palle perse in passaggio, Palle perse in ricezione.
  - **Sanzioni Disciplinari IHF ad Atleti e Dirigenti:** Finestra modale con selettore a schede per assegnare Cartellino Giallo (ammonizione), Sospensione temporanea 2 Minuti, Cartellino Rosso (squalifica) e Cartellino Blu (rapporto scritto) sia ai giocatori in rosa sia agli Ufficiali di Squadra (Dirigenti A, B, C, D).
  - **Annullamento Simmetrico (Undo):** Storico completo di ripristino per annullare all'istante qualsiasi tocco accidentale sincronizzando statistiche e punteggio.

- 🏢 **Anagrafica Società Integrata (CASA / OSPITI):**
  - Form semplificato per la registrazione dei dati sociali: **Denominazione Società**, **Sede**, **Palazzetto di Gioco (Palasport)** e **Logo Ufficiale**.
  - Associazione automatica del nome della Società come squadra **CASA (Locale)** nella creazione di nuove partite e nei punteggi dello scout.
  - Inserimento automatico dell'intestazione societaria con stemma nei referti tecnici PDF.

- 👔 **Gestione Ufficiali di Squadra (Dirigenti Panchina A, B, C, D):**
  - Configurazione dei dirigenti accreditati per ogni categoria nella ROSA (Dirigente A - Accompagnatore Ufficiale, Dirigente B - Capo Allenatore, Dirigente C - Vice Allenatore, Dirigente D - Medico/Fisioterapista).
  - Rilevazione sanzioni disciplinari in tempo reale con registrazione a referto di gara.
  - Tabella dedicata **UFFICIALI DI SQUADRA** inclusa nel prospetto PDF A4.

- 👥 **Gestione Categorie & Rosa Atleti:**
  - Categorie flessibili e personalizzabili (Serie A, Serie B, Under 19, Under 17, Under 15, ecc.).
  - Gestione atleti con vincolo di maglia univoco (0-99) all'interno della stessa categoria.
  - Distinzione dei ruoli (Portiere e Giocatore di Movimento).

- 📑 **Archivio Partite, Schede a Tabella & Rettifica Manuale:**
  - Elenco storico delle gare con dettaglio punteggi, date e palazzetto di gara.
  - Visualizzazione a schede per **Giocatori di Movimento**, **Portieri** e **Dirigenti**.
  - Modale di correzione manuale post-partita per modificare contatori, tiri, parate o sanzioni sia degli atleti sia dei dirigenti prima dell'esportazione finale.

- 🖨️ **Esportazione Referto Tecnico PDF A4 Ufficiale:**
  - Layout orizzontale vettoriale multipagina ad alta risoluzione con intestazione federale e fascia tricolore italiana.
  - Tabelle separate per giocatori di movimento, portieri e dirigenti di panchina.
  - Riepilogo tecnico di squadra (gol totali, tiri, % realizzazione, assist, palle perse, parate portieri), note di gara e numerazione pagine dinamica «Pagina x di y».

- 🔒 **Backup JSON Sicuro & Cybersecurity Avanzata:**
  - Esportazione ed importazione dell'intero database JSON con snapshot di sicurezza preventiva automatica (`scout_handball_pre_import_backup`).
  - Scansione ricorsiva anti-Prototype Pollution (`__proto__`, `constructor`, `prototype`).
  - Limite di sicurezza sulla dimensione dei file (max 5 MB).
  - Proiezione restrittiva ad allowlist di tutte le proprietà importate.
  - Sanitizzazione preventiva di ogni input testuale contro iniezioni XSS.

- 🌍 **Internazionalizzazione (i18n) a Parità 100%:**
  - Supporto completo e tipizzato per **Italiano** (predefinito) e **Inglese**.
  - Commutazione istantanea dall'header senza ricaricamento di pagina.
  - Traduzione automatica di referti PDF e date tramite standard `Intl`.

---

## 🇬🇧 English Executive Summary

**SCOUT Handball** is an offline-first, client-side technical scouting application built for handball coaches, analysts, and directors. Running 100% inside the browser without requiring external servers, user subscriptions, or cloud tracking, it delivers real-time single-touch match event recording (no stopwatch needed), official IHF bench sanctions for both players and team officials (Dirigenti A, B, C, D), club profile registration auto-linked as Home Team (CASA), roster management, instant undo capabilities, printable A4 PDF match sheets, and secure JSON data backups featuring recursive prototype pollution protection, strict allowlist projection, and full typed English/Italian localization.

---

## 🛠️ Stack Tecnologico

- **Framework:** React 19 (Hooks, Context, Functional Components)
- **Linguaggio:** TypeScript 5.x (Strict typing, zero `any` non tipizzati)
- **Bundler & Dev Server:** Vite 8.x / Rollup (Build ultra-rapida ESM)
- **Styling:** Tailwind CSS 4.x (Utility-first, design tokens federazione #00008B, tricolore)
- **Icone:** Lucide React
- **Motore PDF:** jsPDF + jspdf-autotable (rendering vettoriale A4)
- **Test Runner:** Node.js native test runner + `tsx`

---

## 📁 Architettura del Repository

```
├── .github/
│   └── workflows/
│       └── ci.yml                     # Pipeline GitHub Actions (lint, test, build)
├── src/
│   ├── components/
│   │   ├── ArchiveScreen.tsx          # Gestione archivio, schede dirigenti/atleti e PDF
│   │   ├── BackupScreen.tsx           # Import/Export JSON e conformità GDPR
│   │   ├── BottomNav.tsx              # Barra di navigazione mobile
│   │   ├── Button3D.tsx               # Pulsante tattile 3D anti-misclick
│   │   ├── ClubInfoModal.tsx          # Anagrafica Società (Denominazione, Sede, Palazzetto, Logo)
│   │   ├── Header.tsx                 # Intestazione con fascia tricolore e selettore lingua
│   │   ├── PrivacySecurityModal.tsx   # Informativa trasparente GDPR e sicurezza
│   │   ├── RosterScreen.tsx           # Gestione categorie, atleti rosa e dirigenti A/B/C/D
│   │   ├── SanctionsDialog.tsx        # Finestra sanzioni disciplinari IHF (Atleti e Dirigenti)
│   │   └── ScoutLiveScreen.tsx        # Schermata di rilevazione live rapida
│   ├── constants/
│   │   └── appInfo.ts                 # Metadati, versione 1.2.0, anno sviluppo 2026
│   ├── i18n/
│   │   ├── types.ts                   # Interfaccia Translations tipizzata
│   │   ├── it.ts                      # Dizionario Italiano ufficiale
│   │   ├── en.ts                      # Dizionario Inglese ufficiale
│   │   ├── context.tsx                # Context provider, hook useI18n() e formattatori
│   │   └── index.ts                   # Barrel export
│   ├── types/
│   │   └── scout.ts                   # Modelli di dati, ruoli, sanzioni, dirigenti, statistiche
│   ├── utils/
│   │   ├── pdfExport.ts               # Generatore referti tecnici A4 con tabella ufficiali
│   │   ├── stats.ts                   # Algoritmi statistici e formule matematiche
│   │   └── storage.ts                 # Storage locale, controlli sicurezza, allowlist
│   ├── App.tsx                        # Controller principale dell'applicazione
│   ├── index.css                      # Stili Tailwind globali
│   └── main.tsx                       # Entry point React con I18nProvider
├── test/
│   └── suite.ts                       # Suite di test automatizzati (15 test vincolanti)
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
Tutti i dati dell'applicazione (anagrafica società, atleti, dirigenti, categorie, partite e statistiche) risiedono unicamente nello **storage locale del browser** (`localStorage`).
- Nessun server backend remoto o cloud terzo
- Nessun cookie di tracciamento o pixel pubblicitario
- Assenza totale di telemetria o profilazione utenti
- Tutela rafforzata dei dati di atleti minorenni (Art. 8 GDPR)

### 2. Presidi di Cibersicurezza nel Codice
- **Anti-Prototype Pollution Ricorsivo:** Blocco preventivo di chiavi pericolose (`__proto__`, `constructor`, `prototype`) tramite `Object.getOwnPropertyNames` su tutta la profondità dell'oggetto.
- **Proiezione restrittiva ad Allowlist:** In fase di importazione JSON, qualsiasi proprietà estranea o non riconosciuta viene scartata prima dell'inserimento nel database locale.
- **Protezione XSS (Cross-Site Scripting):** Tutti gli input utente (nomi, categorie, luoghi, note, dati società) vengono sanitizzati escludendo tag HTML (`<`, `>`) e limitati in lunghezza.
- **Quota Exceeded Error Handling:** Rilevazione e gestione dell'esaurimento memoria locale con limite logo max 500 KB per evitare crash del browser.
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

```bash
# Esegui tutti i test automatizzati della suite
npm test

# Esegui il controllo dei tipi e sintassi TypeScript
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
13. **Dati Società:** sanitizzazione campi anagrafici, matricola FIGH e rimozione script XSS.
14. **Validazione Logo Società:** accettazione solo data URL immagine validi e rifiuto payload malevoli.
15. **Backup JSON con ClubInfo:** verifica inclusione, proiezione ad allowlist e ripristino.

---

## 📜 Licenza e Diritti di Sviluppo

Distribuito con licenza **Apache-2.0**. Consulta il file [`LICENSE`](LICENSE) per i termini completi.  
© 2026 SCOUT Handball. Tutti i diritti di sviluppo riservati.
