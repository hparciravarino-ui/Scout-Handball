# Policy di Sicurezza & Vulnerability Disclosure

## Perimetro dell'Applicazione e Modello di Minaccia

**SCOUT Handball** è un'applicazione Web Single Page (SPA) con architettura puramente **Client-Side** (Local-First):
- **Nessun server backend o database remoto:** I dati non vengono mai trasmessi attraverso la rete verso server di applicazione.
- **Isolamento Sandbox Locale:** I record di atleti, categorie e statistiche risiedono esclusivamente nel Web Storage del browser (`localStorage`) del dispositivo dell'utente.
- **Nessuna autenticazione cloud:** Non esistono token remoti o chiavi API gestite dall'applicazione per la persistenza.

## Presidi di Sicurezza Implementati nel Codice

1. **Anti-Prototype Pollution Ricorsivo:**
   Tutti i file JSON importati sono sottoposti a scansione profonda tramite `Object.getOwnPropertyNames` per rilevare e bloccare in modo vincolante proprietà pericolose quali `__proto__`, `constructor` e `prototype`.
2. **Proiezione Rigorosa ad Allowlist:**
   In fase di ripristino di un backup JSON, i dati vengono filtrati campo per campo; proprietà impreviste, malevole o alterate vengono automaticamente rimosse prima della serializzazione nello storage.
3. **Protezione da Iniezioni Cross-Site Scripting (XSS):**
   Tutti i campi di testo inseriti dall'utente (nomi atleti, categorie, luoghi e note) vengono sanitizzati escludendo caratteri angolari (`<`, `>`) e troncati a lunghezze massime sicure.
4. **Protezione Denial of Service (DoS) da File:**
   I file JSON di backup con dimensione superiore a 5 MB (5 * 1024 * 1024 byte) vengono rifiutati prima dell'elaborazione per prevenire il freeze del thread principale del browser.
5. **Snapshot di Sicurezza Automatico:**
   Prima di qualunque operazione di ripristino da file JSON, il sistema crea una copia di sicurezza automatica preventiva (`scout_handball_pre_import_backup`).

## Trasparenza sul Limite di Crittografia Locale

Nel browser, `localStorage` memorizza i dati all'interno della sandbox del dominio d'origine senza crittografia a riposo.  
Per garantire una protezione fisica completa dei dati degli atleti:
- Attivare il blocco schermo con PIN o biometria sul dispositivo.
- Abilitare la cifratura del disco (ad esempio FileVault su macOS, BitLocker su Windows, crittografia integrata su Android e iOS).
- Non utilizzare dispositivi condivisi o non attendibili senza procedere alla cancellazione dei dati tramite la funzione di *Diritto all'Oblio* integrata (Art. 17 GDPR).

## Segnalazione di Vulnerabilità

Qualora venisse identificata una potenziale vulnerabilità di sicurezza:
1. Non aprire un issue pubblico con exploit o dettagli sensibili.
2. Segnala i dettagli aprendo una Security Advisory privata su GitHub tramite la sezione **Security > Report a vulnerability**.
3. Includi una descrizione chiara della vulnerabilità e i passaggi per riprodurla.
4. Il team risponderà entro 48 ore lavorative per valutare e rilasciare tempestivamente una patch.
