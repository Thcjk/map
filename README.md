# Deal-Radar

Überwacht Technik-Deals in der Schweiz (aktuell Mini-PC fürs Gaming und Monitor) und meldet
sich per Push auf dem iPhone. App: **https://thcjk.github.io/map/**

> Dieses Repo enthielt früher die Wander-App «Etappa». Ihr letzter Stand ist Commit `5b3f0bf`.

## So funktioniert es (einfach erklärt)

1. **Wunschliste** (`data/wishlist.json`): deine Produkte mit Zielpreis.
2. **Preisprüfung**: Eine GitHub Action («Preise prüfen») startet jede Stunde. Ist sie laut
   `data/settings.json` fällig (normal alle 6 h, um Black Friday stündlich), fragt sie die Preise ab
   und speichert sie in `data/prices.json` – mit Verlauf.
3. **Push**: Fällt ein Preis unter dein Ziel, unter den bisher tiefsten Preis oder ist etwas wieder
   lieferbar, schickt die Action eine Nachricht über **ntfy** an dein iPhone.
4. **App**: zeigt die Daten an. Mit deinem GitHub-Token kann sie die Wunschliste, Zielpreise,
   Regeln und den Prüftakt ändern und eine Prüfung sofort starten.

Woher die Preise kommen: Digitec und Galaxus über die **offizielle Galaxus-Schnittstelle für
KI-Assistenten** (kein Scraping). Brack, Conrad, MediaMarkt, Interdiscount und Amazon sperren
automatische Abfragen – dort trägst du den Preis in der App von Hand ein.

## Einrichten (einmalig)

### 1. ntfy aufs iPhone (Push-Nachrichten)
1. Im App Store **«ntfy»** installieren und öffnen, Mitteilungen erlauben.
2. Einen **geheimen Kanalnamen** ausdenken, z. B. `deals-` plus eine lange Zufallsfolge
   (`deals-k3v9q2m8x1`). Wer den Namen kennt, kann mitlesen – darum nicht erraten lassbar.
3. In ntfy auf **«+»** tippen, den Kanalnamen eingeben, **Subscribe**.
4. Auf GitHub im Repo: **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `NTFY_TOPIC`
   - Secret: dein Kanalname
5. Test: In GitHub unter **Actions → Preise prüfen → Run workflow** starten. Ist ein Preis schon
   unter deinem Ziel, kommt eine Nachricht.

### 2. GitHub-Token für die App (zum Bearbeiten)
1. GitHub → Profilbild → **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. Name: `deal-radar`, Ablauf: z. B. 1 Jahr.
3. **Repository access → Only select repositories → `map`**.
4. **Permissions → Repository permissions**:
   - **Contents: Read and write** (Wunschliste, Regeln speichern)
   - **Actions: Read and write** (Knopf «Jetzt prüfen»)
5. **Generate token**, den Token kopieren und in der App unter **⚙︎ Einstellungen** einfügen.
   Er bleibt nur auf deinem Gerät.

### 3. GitHub Pages
Ist schon eingerichtet: **Settings → Pages → Source: GitHub Actions** und unter
**Settings → Environments → github-pages** «No restriction». Die App wird bei jedem Push neu
veröffentlicht.

### 4. App aufs iPhone
Safari → https://thcjk.github.io/map/ → Teilen-Knopf → **«Zum Home-Bildschirm»**.

## Für Entwickler
```bash
npm install
npm run dev        # App lokal (liest die Daten aus GitHub)
npm test           # Tests
node scraper/run.js --force   # Preisprüfung lokal (ohne NTFY_TOPIC nur Konsolenausgabe)
```
Aufbau und Regeln: [CLAUDE.md](CLAUDE.md) · Fortschritt: [ROADMAP.md](ROADMAP.md)
