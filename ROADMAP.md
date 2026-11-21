# ROADMAP Deal-Radar

## Schritt 0 – Machbarkeit (21.11.2026)
- [x] Test aus GitHub Actions: robots.txt und Erreichbarkeit aller Shops
- [x] Digitec/Galaxus: offizielle Galaxus-MCP-Schnittstelle liefert Preis, «Statt»-Preis, Verfügbarkeit
- [x] Brack, Conrad, MediaMarkt, Interdiscount: blockiert → manuelle Preise

## Schritt 1 – Basis vor Black Friday
- [x] Wunschliste, Regeln, Einstellungen als JSON im Repo; Startprodukte eingetragen
- [x] Preisprüfung als Action (stündlich, Takt einstellbar), Verlauf in data/prices.json
- [x] ntfy-Alarme: Zielpreis, neuer Tiefstpreis, wieder verfügbar (ohne Mehrfachmeldungen)
- [x] Dashboard: aktuell, Ziel, Tiefst, Rabatt (ggü. gemessenem Höchstpreis), Badge, Sortierung
- [x] Detailseite mit Preisverlauf (Chart.js), Deal-Check nach deinen Regeln, Bearbeiten, Handpreis
- [x] Einstellungen: Token, Prüftakt, Regeln bearbeiten
- [ ] Nutzer: ntfy einrichten, Secret NTFY_TOPIC, Token erstellen (README)
- [ ] Nutzer: richtige Varianten per Link festlegen (Geekom, GMKtec, Beelink), Philips-Link (nicht bei Galaxus gefunden)

## Schritt 2 – Deal-Check für beliebige Links
- [ ] Link einfügen → Action liest Specs (Digitec/Galaxus über MCP) → Urteil ✅/⚠️/❌
- [ ] «Statt»-Preise kritisch einordnen (Logik fertig: shared/rules.js judgeStrikePrice)
- [ ] Andere Shops: Specs von Hand eintragen oder Text einfügen

## Schritt 3 – Vergleich
- [ ] 2–3 Produkte nebeneinander (Preis, Specs, Urteil)

## Später
- [ ] Weitere Quellen prüfen (z. B. Shops mit offizieller Schnittstelle), falls gewünscht
