# PROMPT PER GOOGLE AI STUDIO — SCOUT Handball v1.2.0 → v1.3.0

> Incolla tutto questo testo come prompt nel progetto SCOUT Handball (Build mode).
> Prima di inviarlo, carica nel progetto la cartella `public/` fornita insieme a questo file
> (contiene manifest, favicon, icone SVG e PNG, set icone d'azione). Non va ridisegnata né modificata.

---

## 0. RUOLO E REGOLE VINCOLANTI

Sei un ingegnere front-end senior. Devi correggere e potenziare l'app esistente **SCOUT Handball**
(React 19 + TypeScript + Vite + Tailwind 4, dati solo in `localStorage`, PDF con jsPDF).
Le regole seguenti sono **non negoziabili** e prevalgono su qualsiasi tua preferenza:

1. **Nessun dato demo, mock, stub, placeholder, `TODO`, `// ...resto invariato`.** Ogni funzione consegnata deve essere realmente operativa.
2. **Nessuna chiamata di rete verso terzi, nessuna telemetria, nessun uso di Gemini/AI API.** L'app resta 100% locale (GDPR). Le uniche richieste di rete ammesse sono quelle del browser verso la propria origine (asset, service worker).
3. **Non aggiungere dipendenze npm.** È ammessa solo la rimozione di `motion` (inutilizzata). Non cambiare le versioni esistenti.
4. **Non modificare il blocco `server.hmr` / `DISABLE_HMR` di `vite.config.ts`.** È gestito da AI Studio.
5. **Compatibilità dati:** `schemaVersion` resta `1`. Backup JSON e archivi già salvati con la v1.2.0 devono continuare a caricarsi e importarsi.
6. **Non ridisegnare** logo, icone e manifest forniti in `public/`: usali così come sono. Se non li trovi, **fermati e segnalalo**; non generarne di sostitutivi.
7. **Non dichiarare mai un risultato che non hai verificato.** Se non puoi eseguire `npm run lint`, `npm test` o `npm run build`, scrivilo esplicitamente nel rapporto finale.
8. Mantieni l'header di licenza Apache-2.0 nei file esistenti, i commenti in italiano e lo stile del codice attuale.

## 1. METODO DI LAVORO

Lavora **per fasi (A → G)**, in quest'ordine. Per ogni fase:
- elenca i file che tocchi;
- consegna i file modificati **per intero** (mai frammenti con ellissi);
- non toccare file che non servono;
- a fine fase esegui `npm run lint`, `npm test`, `npm run build` (se possibile) e riporta l'esito.

A fine lavoro produci una tabella **requisito → file → stato (FATTO / PARZIALE / NON FATTO + motivo)** e l'elenco dei punti che richiedono verifica manuale su dispositivo reale.

---

## FASE A — Coerenza del punteggio (priorità massima)

**Problema:** `calculateScoreFromMatch` combina registro azioni e statistiche con `Math.max(...)`; il punteggio live si aggiorna per delta. Risultato: dopo "Inverti Casa/Ospiti", modifica manuale o PDF, il punteggio cambia o i gol "risorgono".

**Specifica (unica fonte di verità, derivata):**

```
ourGoals       = Σ (field.gol + field.rigoriGol) sulle stats con role === 'GIOCATORE'
gkConceded     = Σ (goalkeeper.golSubiti + goalkeeper.rigoriSubiti) sulle stats con role === 'PORTIERE'
unassignedOpp  = #OPPONENT_GOAL − #OPPONENT_GOAL_UNDO nell'actionLog   (solo questi due tipi)
opponentGoals  = max(0, gkConceded + unassignedOpp)
```

Regole di implementazione:
1. Elimina l'uso di `Math.max(opponentGoalsFromLog, gkConcededTot)`.
2. Dopo **ogni** azione registrata e **ogni** undo, imposta `scoreHome/scoreGuest` richiamando `calculateScoreFromMatch(matchAggiornato)`. I delta nel log (`scoreChangeHome/Guest`) restano salvati per compatibilità ma non determinano più il punteggio.
3. Il ramo legacy resta: partita senza stats **e** senza log → mantieni il punteggio memorizzato.
4. Il pulsante **"−1 avversari"** è abilitato solo se `unassignedOpp > 0` (non `oppScore > 0`). Il gestore `OPPONENT_GOAL_UNDO` rifiuta l'azione se `unassignedOpp <= 0`. Per annullare un gol subito attribuito a un portiere si usa "Annulla" o la modifica manuale.
5. Rimuovi la dipendenza dal contesto stantio: gli handler leggono sempre lo stato più recente dentro l'updater, non `activeMatch` della closure.

**Test obbligatori** (aggiungili a `test/suite.ts`, ognuno deve fallire sul codice vecchio e passare sul nuovo):
- gol subito dal portiere + "−1 avversari" non disponibile → punteggio 0-1 stabile dopo inversione casa/ospiti;
- OPPONENT_GOAL ×2, poi undo ×1 → 0-1 live e dopo ricalcolo;
- portiere con 3 gol subiti ridotto a 1 in modifica manuale → punteggio avversario 1;
- inversione casa/ospiti in ogni scenario sopra → punteggio invariato sulle squadre, scambiato solo di lato;
- backup importato con log e stats coerenti → stesso punteggio prima/dopo il ricalcolo.

## FASE B — Assegnazione azioni e atleti

1. Crea `src/utils/actionRules.ts` con **una sola tabella** che definisce i destinatari ammessi:
   - `FP_*` → solo giocatori di movimento, **nessun dirigente**;
   - `GK_*` → solo portieri, **nessun dirigente**;
   - `SANCTION_*` → tutti gli atleti **e** i dirigenti A–D.
   Esporta `getEligibleTargets(actionType)` e `isTargetAllowed(actionType, role | officialLetter)`. (Decisione di prodotto: restrizione rigida; deve restare modificabile in questo unico punto.)
2. `ActionAssignModal`: mostra solo i destinatari ammessi; nascondi la scheda "Dirigenti" quando non ammessa; **resetta la scheda su "Atleti" a ogni apertura**; rimuovi la variabile inutilizzata `isSanctionAction`.
3. `handleRecordAction` in `App.tsx`: difesa in profondità — se il destinatario non è ammesso, non modificare lo stato e mostra un toast `warning` tradotto.
4. **Atleta aggiunto dopo la creazione della partita:** in `ScoutLiveScreen` il pannello pulsanti e la scheda atleta devono comparire anche senza statistiche già presenti, usando `activeStats ?? createEmptyPlayerStats(...)` **senza mutare lo stato durante il render**. Le statistiche vengono create al primo evento registrato. Non toccare le partite archiviate.
5. Elimina il fallback `effectivePlayers = matchPlayers.length > 0 ? matchPlayers : players` (attribuiva azioni ad atleti di altre categorie): se la categoria non ha atleti mostra lo stato vuoto guidato già esistente.
6. `SanctionsDialog`: stessa logica (dirigenti ammessi solo per sanzioni, già coerente) e verifica che usi i tipi `SANCTION_OFFICIAL_*` solo per i dirigenti.

**Test:** `isTargetAllowed` per tutte le 21 combinazioni `ActionType` × {portiere, giocatore, dirigente}.

## FASE C — Persistenza, backup, GDPR

1. **Salvataggio fuori dall'updater di `setState`:** sposta `saveAppDatabase` in un `useEffect` su `database` (più flush su `pagehide`/`visibilitychange`). Lo stato `saveStatus: 'ok' | 'error'` deriva dal valore di ritorno.
2. **Banner persistente non chiudibile** quando `saveStatus === 'error'`: "Impossibile salvare i dati (spazio esaurito). Esporta subito un backup JSON." con pulsante che porta alla scheda Backup. Testi in i18n.
3. **Recupero da database corrotto:** `App` deve usare `recoveredFromCorrupt` e `corruptionDetails` e mostrare un avviso chiudibile. In `BackupScreen` aggiungi la sezione **"Copie di emergenza"**: elenco delle chiavi `scout_handball_corrupt_*` (data, dimensione) con azioni **Scarica JSON** ed **Elimina**.
4. **Backup pre-import ripristinabile:** aggiungi in `BackupScreen` la sezione **"Ripristina ultimo backup pre-import"** (data da `safetyBackupTimestamp`, conteggi atleti/partite, conferma esplicita). Il contenuto passa da `validateBackupJson` prima di essere applicato.
5. **Import sicuro:** `handleRestoreBackup` restituisce `{ ok, safetyBackupCreated, persisted }`. Il messaggio "importazione riuscita" appare **solo** se `persisted === true`. Se `safetyBackupCreated === false` chiedi conferma ("Impossibile creare la copia di sicurezza. Procedere comunque?", predefinito Annulla).
6. **Cancellazione totale (GDPR art. 17):** `wipeAllLocalData` rimuove **tutte** le chiavi `localStorage` che iniziano con `scout_handball_` (database, backup pre-import, copie di emergenza, lingua, preferenze PWA). Test dedicato con uno `localStorage` simulato.
7. **Validazione import:**
   - esporta da `types/scout.ts` un array `ACTION_TYPES` (unica fonte per il tipo `ActionType`) e scarta le voci di log con `actionType` mancante o non valido (oggi il default è `OPPONENT_GOAL` e gonfia il punteggio); riporta il numero di voci scartate in `ValidationResult.warnings` e mostralo nel dialogo di conferma;
   - `categoryId` inesistente in atleti/partite → crea una categoria `{ id, name: 'Categoria importata' }` invece di lasciare orfani;
   - limite dimensione in **byte reali** (`TextEncoder`/`Blob.size`), controllato anche su `file.size` prima di leggere il file.
8. **Caricamento da `localStorage`:** applica la stessa proiezione dell'import in modalità *lenient* (scarta i singoli elementi non validi e segnala il conteggio; ripara con il flusso "corrotto" solo se il JSON è illeggibile).
9. **Export JSON:** usa `Blob` + `URL.createObjectURL` (+ `revokeObjectURL`) al posto del data-URI; usa la costante `CURRENT_SCHEMA_VERSION` esportata da `storage.ts` invece di `1` letterale.
10. **PDF:** `generateScoutReportPdf` va chiamato in `try/catch` **sia** in `ArchiveScreen` **sia** in `BackupScreen`; in caso di errore mostra un toast d'errore tradotto (oggi finisce solo in console). Verifica che ogni carattere non rappresentabile con il font standard di jsPDF non produca testo corrotto: sostituisci i caratteri non supportati con l'equivalente ASCII più vicino tramite `normalize('NFD')` per il solo testo del PDF.

**Test:** wipe completo; import con log invalido; import con categoria mancante; limite in byte con stringa multibyte; round-trip export → import identico.

## FASE D — Pulizia, i18n, CI, documentazione

1. **i18n completo:** sposta in `types.ts`, `it.ts`, `en.ts` **tutte** le stringhe oggi scritte nel codice: etichette e sottotitoli dei pulsanti della griglia in `ScoutLiveScreen`, "✈️ TRASFERTA" / "🏠 IN CASA" (anche in `ArchiveScreen`), "ROSA & DIRIGENTI", "Società Registrata", "Squadra Locale", "Nostra Squadra", i titoli dirigenti (A–D) in `ActionAssignModal`, "Dirigente {lettera}". Rimuovi gli emoji dalle etichette (le icone arrivano dalla Fase G).
2. **Test anti-regressione i18n:** oltre alla parità di chiavi, aggiungi un test che fallisce se nei file `src/components/**/*.tsx` compaiono letterali da una lista (`TRASFERTA`, `IN CASA`, `Gol su Azione`, `Cartellino`, `Squadra Locale`, `Nostra Squadra`, `ROSA & DIRIGENTI`).
3. **Stili inline:** elimina `style={{ height: '57.7031px', width: '154px' }}`, `textStyle`, `subtextStyle` e ogni `fontSize` in px dal primo pulsante e da tutto il codice. Rimuovi i relativi props superflui da `Button3D`.
4. **Animazioni:** le classi `animate-in fade-in duration-200` non hanno effetto (plugin assente). Sostituiscile con `@keyframes` e classi proprie in `index.css`, disattivate con `@media (prefers-reduced-motion: reduce)`.
5. **Residui template AI Studio:** in `metadata.json` imposta `"majorCapabilities": []`; elimina `.env.example` (o riducilo a un commento) e rimuovi da `package.json` la dipendenza `motion`.
6. **CI (`.github/workflows/ci.yml`):** il repo contiene `bun.lock` e non `package-lock.json`, quindi `npm ci` fallisce. Usa `oven-sh/setup-bun@v2` e `bun install --frozen-lockfile`, poi `bun run lint`, `bun run test`, `bun run build`.
7. **README:** allinea alla realtà — versioni lette da `package.json` (non "TypeScript 5.x"), il test runner è `tsx` con `node:assert` (non il runner nativo), la gestione quota spazio ora è realmente visibile all'utente, aggiungi sezioni PWA e Brand, aggiorna l'elenco dei test e il changelog 1.3.0. Aggiorna `APP_METADATA.version`, `package.json`, `index.html` e il test dei metadati a `1.3.0`.

---

## FASE E — Design adattivo: smartphone, tablet, desktop

**Obiettivo:** layout, font e pulsanti si adattano in modo fluido a smartphone (≥320 px), tablet (portrait e landscape) e desktop (fino a 1920 px e oltre). Niente più colonna unica da 672 px centrata su schermi grandi.

### E1. Token e breakpoint (in `src/index.css`, con `@theme` di Tailwind 4)
- Breakpoint: base <640 (smartphone), `sm` 640, `md` 768 (tablet portrait), `lg` 1024 (tablet landscape/desktop), `xl` 1280, `2xl` 1536.
- **Scala tipografica fluida** con `clamp()`: `--text-xs: clamp(.75rem,.72rem + .15vw,.8125rem)`, `sm: .875→.9375rem`, `base: 1→1.0625rem`, `lg: 1.125→1.25rem`, `xl: 1.25→1.5rem`, `--text-score: clamp(2rem,1.2rem + 4vw,4.5rem)` per il tabellone.
- **Dimensione minima assoluta del testo: 12 px (0.75rem).** Vietati `text-[9px]`, `text-[10px]`, `text-[11px]` e qualunque `font-size` in px: sostituiscili con i token.
- Target tocco: `--tap: 2.75rem` (44 px) con `@media (pointer: coarse)`, `2.25rem` altrimenti. Ogni elemento interattivo ha `min-height: var(--tap)` e `min-width: var(--tap)`; le icone-pulsante hanno area di tocco ≥ 44×44 px anche se l'icona è più piccola.
- Spaziature in `rem`/`clamp()`, non in px fissi.

### E2. Viewport e accessibilità di base
- In `index.html` **rimuovi** `maximum-scale=1.0` e `user-scalable=no` (bloccano lo zoom, violazione WCAG 1.4.4). Mantieni `width=device-width, initial-scale=1, viewport-fit=cover`.
- Rimuovi `select-none` dal contenitore radice; applicalo solo a pulsanti e tabellone. Testi, note e nomi devono essere selezionabili.
- Usa `dvh` (non `vh`) per le altezze; `min-h-dvh` per la radice.
- Il testo deve restare leggibile con zoom del browser al 200 % e dimensione font di sistema aumentata: nessun `height` fisso su contenitori di testo (usa `min-height`), nessun testo tagliato senza `title`/ellissi con alternativa.
- Stati `:focus-visible` evidenti su tutti i controlli; stati `:hover` solo dentro `@media (hover: hover)`; effetto `:active` per il tocco. Evita `scale-105` su elementi in righe a scorrimento (provoca overflow).

### E3. Layout per schermata
- **Contenitore:** sostituisci `max-w-2xl` / `max-w-4xl` con larghezze per breakpoint: `max-w-2xl` base, `md:max-w-4xl`, `lg:max-w-6xl`, `2xl:max-w-[96rem]`, padding con `env(safe-area-inset-*)`.
- **Navigazione:** sotto `md` barra inferiore fissa (con `padding-bottom: env(safe-area-inset-bottom)`); da `md` in su diventa **barra laterale a sinistra** (solo icone a `md`, icone + etichetta da `lg`), con il contenuto spostato di conseguenza. L'etichetta della scheda attiva resta sempre visibile.
- **Header:** compatto su smartphone; nel landscape con altezza < 500 px riduci padding e nascondi il sottotitolo.
- **Scout live:**
  - `< md`: colonna unica (ordine attuale);
  - `md–lg`: tabellone a tutta larghezza, sotto due colonne (griglia azioni a sinistra; selettore atleta + pannello + annulla + registro a destra);
  - `≥ lg`: tabellone **sticky** in alto; due colonne 7/5; registro eventi più lungo.
  - Griglia azioni con `grid-template-columns: repeat(auto-fill, minmax(min(100%, 9.5rem), 1fr))` (2 colonne su smartphone, 3–4 su tablet, 4–6 su desktop). Tutti i pulsanti hanno la stessa altezza minima e il testo va a capo senza uscire dal pulsante.
- **Rosa:** `< lg` elenco a pagina intera; `≥ lg` due pannelli (categorie a sinistra, atleti e form a destra).
- **Archivio:** schede partita in griglia 1 / 2 / 3 colonne per larghezza. Le tabelle statistiche stanno in un contenitore `overflow-x-auto` con **prima colonna sticky**; sotto `md` le statistiche per atleta diventano schede verticali. La pagina non scorre mai in orizzontale.
- **Backup / Privacy / Club:** una colonna sotto `md`, due da `md`.
- **Modali** (assegnazione azione, sanzioni, club, privacy, conferme): sotto `md` *bottom sheet* a tutta larghezza (`max-height: 90dvh`, angoli superiori arrotondati, area interna scrollabile, pulsanti principali sempre visibili in un footer sticky); da `md` finestra centrata `max-w-lg`/`max-w-2xl`. Aggiungi focus trap, chiusura con `Esc`, ripristino del focus all'elemento che ha aperto il modale, blocco dello scroll del body.
- **Button3D:** altezza `min-height` da token (non più in px passati dall'esterno), padding in `rem`, testo e sottotesto con i token tipografici, niente `width` fisse; varianti `compact` / `regular` / `large` che scelgono il token in base al breakpoint. Il badge contatore resta visibile a qualsiasi dimensione.
- **Orientamento:** supporto pieno a portrait e landscape su smartphone e tablet (nel manifest `orientation: "any"`).

### E4. Verifica (obbligatoria nel rapporto)
Per ciascuna di queste dimensioni dichiara "OK" o descrivi il difetto: **360×640, 390×844, 844×390 (landscape), 768×1024, 1024×768, 1280×800, 1920×1080**. Criteri: nessuno scroll orizzontale della pagina, nessun testo < 12 px, tutti i controlli ≥ 44 px su tocco, nessun testo tagliato, modali interamente utilizzabili. Aggiungi un test (`test/suite.ts`) che fallisce se nel codice compaiono `user-scalable=no`, `maximum-scale`, `text-[9px]`, `text-[10px]`, `text-[11px]`, `fontSize: '…px'`.

---

## FASE F — PWA (installabile, offline, dati protetti)

I file `public/manifest.webmanifest`, `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` e `public/icons/**` sono **già forniti**: collegali, non riscriverli.

### F1. `index.html`
Aggiungi (percorsi **relativi**, senza `/` iniziale, così funzionano anche in sotto-cartella):
```html
<link rel="manifest" href="manifest.webmanifest" />
<link rel="icon" href="favicon.svg" type="image/svg+xml" />
<link rel="icon" href="favicon.ico" sizes="48x48" />
<link rel="apple-touch-icon" href="apple-touch-icon.png" />
<meta name="theme-color" content="#00008B" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="SCOUT" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```
Con `black-translucent` il contenuto passa sotto la barra di stato: rispetta `env(safe-area-inset-top)` nell'header.

### F2. Service worker scritto a mano — `public/sw.js` (nessuna libreria)
- Versione cache dal parametro di registrazione: `register('sw.js?v=' + APP_METADATA.version)`; nel worker `const V = new URL(self.location).searchParams.get('v')`; cache `scout-shell-${V}` e `scout-runtime-${V}`.
- **install:** precache di `./`, `index.html`, `manifest.webmanifest`, `favicon.svg`, icone PNG del manifest **e** degli asset della shell: scarica `index.html`, estrai con una regex gli URL `src`/`href` di `script`, `link[rel=stylesheet]`, `link[rel=modulepreload]` sotto `assets/` e aggiungili alla cache (necessario perché gli asset caricati prima che il worker prenda il controllo non sarebbero altrimenti disponibili offline).
- **fetch** (solo `GET` e stessa origine; ignora il resto):
  - navigazione → *network-first* con timeout 3 s, fallback a `index.html` in cache;
  - `assets/*` (nomi con hash) → *cache-first*;
  - icone, manifest, favicon → *stale-while-revalidate*.
- **activate:** elimina le cache di versioni diverse da `V`; `clients.claim()` **solo dopo** `skipWaiting` richiesto dall'utente.
- Gestisci il messaggio `{ type: 'SKIP_WAITING' }`. Il worker non memorizza mai dati dell'utente (stanno in `localStorage`).

### F3. Registrazione e aggiornamenti — `src/pwa/registerSW.ts`
- Registra **solo** se `import.meta.env.PROD` e `'serviceWorker' in navigator`; tutto in `try/catch` silenzioso (l'anteprima di AI Studio gira in un iframe e la registrazione può essere rifiutata: l'app deve funzionare normalmente).
- Percorsi con `import.meta.env.BASE_URL`.
- Quando esiste `registration.waiting`, mostra il banner **"Nuova versione disponibile — Aggiorna"**. Premendo "Aggiorna": `postMessage(SKIP_WAITING)`, poi ricarica su `controllerchange`. **Non ricaricare mai la pagina in automatico** (potrebbe esserci una partita in corso).

### F4. Installazione
- Intercetta `beforeinstallprompt` (`preventDefault`, conserva l'evento) e mostra il pulsante **"Installa app"** nell'header o nella scheda Backup solo quando disponibile; nascondilo dopo `appinstalled` o se `matchMedia('(display-mode: standalone)')` è vero.
- Su iOS Safari non installato (`navigator.standalone === false`) mostra una volta un suggerimento "Condividi → Aggiungi alla schermata Home", chiudibile e ricordato con la chiave `scout_handball_pwa_hint_dismissed`.
- **Scorciatoie:** all'avvio leggi `?tab=scout|roster|archive|backup` (lista bianca; valori diversi ignorati), apri la scheda corrispondente e ripulisci l'URL con `history.replaceState`.

### F5. Offline e protezione dei dati
- Indicatore compatto "Offline — tutte le funzioni restano disponibili" in base a `navigator.onLine` ed eventi `online`/`offline`.
- Richiedi `navigator.storage.persist()` dopo il primo salvataggio riuscito (feature-detect) e mostra in **Backup** una scheda "Archivio dati": protezione persistente sì/no, spazio usato / disponibile da `navigator.storage.estimate()`, e l'avviso: "Se l'app non è installata, il browser può cancellare i dati dopo lunga inattività: installala ed esporta backup regolari."
- *(Consigliata)* Wake Lock: durante la scheda Scout con partita attiva richiedi `navigator.wakeLock.request('screen')`, riacquisiscilo su `visibilitychange`, interruttore "Schermo sempre acceso" visibile; nessun errore se l'API manca.

### F6. Criteri di accettazione PWA
- `manifest.webmanifest` valido e collegato; icone `any` e `maskable` 192/512 raggiungibili.
- Dopo il primo caricamento online, ricaricando **offline** l'app si avvia e tutte le funzioni (rilevazione, rosa, archivio, backup JSON, PDF) lavorano.
- Un test (`test/suite.ts`) verifica: JSON del manifest valido, presenza dei campi obbligatori (`name`, `short_name`, `start_url`, `scope`, `display`, `icons` con 192 e 512 `any` e `maskable`), esistenza su disco di ogni file icona referenziato, `theme_color` coerente con il `<meta>` di `index.html`.

---

## FASE G — Identità visiva e icone d'azione

1. **Logo:** in `Header` mostra il simbolo `public/logo-mark.svg` come marchio dell'app, con testo "SCOUT Handball" accanto. Il **logo della società** caricato dall'utente resta nelle schede Club, nei modali e nel PDF, invariato.
2. **Icone d'azione:** converti i 16 SVG di `public/icons/ui/` in componenti React in `src/components/icons/ActionIcons.tsx` copiando i tracciati **verbatim** (stesso `viewBox 0 0 24 24`, `stroke="currentColor"`, i tre cartellini con i colori originali). Mappatura: `gol`, `gol-7m`, `tiro-fuori`, `7m-sbagliato`, `assist`, `passaggio-perso`, `ricezione-persa`, `parata`, `gol-subito`, `parata-7m`, `cartellino-giallo/rosso/blu`, `due-minuti`, `annulla`, `inverti-casa-ospiti`. Usale nella griglia azioni, nei pulsanti del pannello atleta, nel pulsante annulla e nel toggle casa/ospiti. Sono decorative (`aria-hidden="true"`) quando accanto c'è il testo.
3. **Palette brand** (solo per asset e variabili CSS, senza cambiare la UI esistente): `--brand-navy #00008B`, `--brand-deep #00005C`, `--brand-royal #1B2BE0`, `--brand-amber #FFB800`.

---

## DEFINITION OF DONE (rispondi punto per punto nel rapporto finale)

- [ ] Fase A: punteggio derivato, 5 nuovi test, nessun `Math.max` tra log e statistiche.
- [ ] Fase B: nessuna azione assegnabile a destinatari non ammessi, atleta tardivo operativo, scheda dirigenti solo per sanzioni.
- [ ] Fase C: errori di salvataggio visibili, recupero corrotto notificato, ripristino backup pre-import funzionante, wipe totale, import validato, PDF con gestione errori.
- [ ] Fase D: zero stringhe italiane fuori da i18n, zero stili inline in px, residui Gemini e `motion` rimossi, CI funzionante, README veritiero, versione 1.3.0.
- [ ] Fase E: sette dimensioni verificate, nessun testo < 12 px, zoom abilitato, modali a bottom sheet su smartphone.
- [ ] Fase F: installabile, offline, aggiornamento controllato, scorciatoie, archivio protetto.
- [ ] Fase G: marchio nell'header, icone d'azione al posto degli emoji.
- [ ] `npm run lint`, `npm test`, `npm run build`: esito dichiarato (o impossibilità dichiarata).
- [ ] Nessun `TODO`, stub, mock o dato demo; nessuna nuova dipendenza; nessuna chiamata di rete a terzi.

**Divieti finali:** non cancellare funzioni esistenti; non cambiare il modello dati oltre quanto scritto; non introdurre `localStorage` con chiavi che non inizino per `scout_handball_`; non riscrivere file non coinvolti; non annunciare come fatto ciò che non hai eseguito.
