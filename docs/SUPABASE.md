# Supabase einrichten (einmalig, gratis)

1. Auf https://supabase.com mit GitHub anmelden (keine Kreditkarte nötig) und
   **New project** anlegen: Name z. B. `wanderapp`, Region **Central EU (Frankfurt)**,
   ein Datenbank-Passwort generieren und sicher aufbewahren (wird von der App nicht gebraucht).
2. Im Projekt links **SQL Editor** → **New query** → den Inhalt von
   `supabase/migrations/20261110000000_init.sql` einfügen → **Run**.
3. **Authentication → Sign In / Providers → Email**: aktiviert lassen
   («Confirm email» darf an bleiben).
4. **Authentication → URL Configuration**:
   - Site URL: `https://thcjk.github.io/map/`
   - Redirect URLs: `https://thcjk.github.io/map/konto` und für lokale Tests
     `http://localhost:5173/konto`
5. **Project Settings → API** (bzw. «API Keys»): die **Project URL** und den
   **anon / publishable** Key kopieren. Den `service_role`/secret Key **nicht** verwenden.
6. Auf GitHub im Repo **Settings → Secrets and variables → Actions → New repository secret**:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon/publishable Key
7. Unter **Actions** den Workflow «Deploy auf GitHub Pages» erneut starten
   (Run workflow) und einmal «Supabase wach halten» manuell starten, um ihn zu testen.

Hinweise
- Der Gratis-E-Mail-Versand von Supabase ist stark limitiert (wenige Mails pro Stunde) und
  nur für Tests gedacht. Für mehr Nutzer später einen eigenen SMTP-Dienst eintragen.
- Gratis-Projekte pausieren nach 7 Tagen ohne Aktivität; die Action
  `.github/workflows/supabase-keepalive.yml` ruft alle 3 Tage `rpc/keepalive` auf.
  Geplante Actions laufen nur auf dem Standard-Branch und werden von GitHub nach
  60 Tagen ohne Repo-Aktivität deaktiviert.
