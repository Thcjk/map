# CLAUDE.md – Deal-Radar

Einstieg für jede neue Session. Fortschritt steht in `ROADMAP.md`.
Der Nutzer lernt Webentwicklung: Schritte einfach erklären, Code verständlich kommentieren.

## Ziel
Mobile-first PWA (Deutsch, Schweizer Schreibweise «ss»), die Technik-Deals in der Schweiz
überwacht (aktuell Mini-PC fürs Gaming + Monitor). App: https://thcjk.github.io/map/
(Repo «map» wurde weiterverwendet; die frühere Wander-App «Etappa» ist Commit `5b3f0bf`.)

## Regeln
- Nur Gratisdienste. **Fair abfragen**: robots.txt/AGB beachten, langsam (Pausen zwischen
  Anfragen), **keinen Bot-Schutz und kein Captcha umgehen**. Blockiert ein Shop: klar anzeigen
  und Preis von Hand eintragbar machen.
- Strukturierte Daten statt HTML raten. Nichts erfinden: Unbekanntes als «unbekannt» anzeigen.
- Kein Framework im Frontend: HTML/CSS/JavaScript (ES-Module) mit Vite, Chart.js für Diagramme.
- Design: schlicht und hell, eine Akzentfarbe (Blau `#0f62fe`), grosse Zahlen, Tippflächen ≥ 44 px.
- Kleine Commits, Tests für Logik (`npm test`), `npm run build` vor dem Push.

## Aufbau
```
data/                    Daten (JSON im Repo, von App und Action gelesen/geschrieben)
  wishlist.json          Produkte: id, name, category (miniPc|monitor|other), query, url, productId, targetPrice
  prices.json            pro Produkt: status, current, lowest, history[{t, price, available, source?}], error
  rules.json             Kaufregeln für den Deal-Check (vom Nutzer bearbeitbar)
  settings.json          intervalHours (6 normal, 1 = stündlich rund um Black Friday)
  manual.json            von Hand eingetragene Preise (blockierte Shops)
shared/rules.js          Deal-Check: Specs erkennen, Urteil ✅/⚠️/❌, «Statt»-Preis prüfen
scraper/run.js           Preisprüfung (Action): Shops abfragen, Verlauf, Alarme
scraper/shops/           pro Shop ein Modul: galaxus.js (Digitec+Galaxus), blocked.js, index.js
scraper/lib/             mcp.js (MCP-Client), prices.js (Verlauf/Alarme, rein), ntfy.js
app/                     Frontend (Vite-Root): index.html, src/main.js (Seiten), github.js,
                         deals.js (Kennzahlen), chart.js, ui.js, style.css
tests/                   Vitest
.github/workflows/       check-prices.yml (stündlich, Takt aus settings), deploy.yml (Pages)
```

## Datenquellen (Stand 21.11.2026, getestet aus GitHub Actions)
| Shop | Weg | Status |
|---|---|---|
| Digitec, Galaxus | Offizielle Galaxus-MCP-Schnittstelle `https://mcp.galaxus.ch/`, Werkzeug `search_products` (Preis, `insteadOfPrice`, Verfügbarkeit, Produkt-ID). Gleiche Produkt-IDs bei Digitec und Galaxus. Pflichtfeld `agentInfo` ehrlich ausfüllen. | ✅ |
| Interdiscount, MediaMarkt, Conrad | HTTP 403 (Bot-Schutz) | ❌ manuell |
| Brack | keine Antwort (Zeitüberschreitung) | ❌ manuell |
| Amazon | nicht getestet, AGB verbieten Scraping | ❌ manuell |

Verfügbarkeit: bekannte Werte `TICK`, `FULL` → verfügbar; `UNKNOWN` und Unbekanntes → `null`
(«unbekannt»), nie raten. Alarme «wieder verfügbar» nur nach sicherem `false`.

## App ↔ Repo
- Lesen ohne Token: raw.githubusercontent.com (bis ~5 min Cache); mit Token: GitHub-API.
- Schreiben: GitHub-API mit feingranularem Token des Nutzers (nur dieses Repo; Contents: R/W,
  Actions: R/W). Token liegt nur im localStorage des Geräts.
- ntfy: Topic als Secret `NTFY_TOPIC` (nie ins Repo).

## Befehle
`npm run dev` · `npm test` · `npm run build` · `node scraper/run.js --force` (lokal ohne Netz zu den Shops)
