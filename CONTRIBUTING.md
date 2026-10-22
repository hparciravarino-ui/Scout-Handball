# Guida per i Contributori (Contributing Guidelines)

Grazie per l'interesse nel contribuire a **SCOUT Handball**!

Questo documento definisce le linee guida per lo sviluppo, il controllo qualità e la sottomissione di modifiche tramite Pull Request.

---

## 1. Principi Fondamentali del Progetto

1. **Zero Cloud & Zero Telemetria:** Non introdurre dipendenze verso server esterni, database remoti, cookie o sistemi di analisi.
2. **Architettura Mobile-First:** L'interfaccia deve rimanere fluida, accessibile e facilmente utilizzabile a tocco singolo su smartphone (pulsanti minimi 44px, Button3D anti-misclick).
3. **Internazionalizzazione (i18n):** Qualsiasi nuova stringa o testo introdotto deve essere tipizzato in `/src/i18n/types.ts` e valorizzato sia in `it.ts` che in `en.ts`.
4. **Validazione dei Tipi:** TypeScript in modalità strict senza cast non sicuri o `any` privi di motivazione.
5. **Integrità dei Dati:** Mantenere sempre la retrocompatibilità con i backup JSON esistenti (`schemaVersion: 1`).

---

## 2. Configurazione dell'Ambiente Locale

```bash
# Clona il repository
git clone https://github.com/scout-handball/scout-handball.git
cd scout-handball

# Installa le dipendenze
npm install

# Avvia il server di sviluppo su http://localhost:3000
npm run dev
```

---

## 3. Flusso di Lavoro per le Pull Request

1. Crea un branch descrittivo a partire da `main`:
   ```bash
   git checkout -b feature/nome-funzionalita
   # oppure
   git checkout -b fix/descrizione-bug
   ```
2. Applica le modifiche rispettando gli standard di codice del progetto.
3. Esegui la suite completa di verifiche prima di effettuare il commit:
   ```bash
   npm test        # Esegue la suite automatizzata (12 test)
   npm run lint    # Verifica tipi e sintassi TypeScript
   npm run build   # Compila la build di produzione Vite
   ```
4. Scrivi messaggi di commit chiari e sintetici in italiano o inglese:
   - `feat(i18n): aggiungi supporto lingua...`
   - `fix(storage): correggi gestione quota...`
   - `test(stats): aggiungi test per percentuale parate...`
5. Apri una Pull Request verso `main` descrivendo le modifiche apportate e collegando eventuali issue correlati.

---

## 4. Checklist di Verifica PR

Prima di richiedere la revisione, accertati che:
- [ ] `npm test` superi tutti i test senza errori.
- [ ] `npm run lint` non produca errori TypeScript.
- [ ] `npm run build` compili senza warning bloccanti.
- [ ] I nuovi testi siano stati tradotti sia in `it.ts` che in `en.ts`.
- [ ] Nessun segreto o chiave API sia stato aggiunto al repository.
