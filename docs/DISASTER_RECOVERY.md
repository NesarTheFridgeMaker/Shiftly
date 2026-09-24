# Dipera -- Disaster Recovery

**Stand:** 24.09.2026\
**Status:** Praktisch getestet mit einem separaten
Supabase-Restore-Projekt

> Diese Anleitung dokumentiert den tatsächlich durchgeführten und
> erfolgreichen Restore-Test von Dipera. Sie ist für den Notfall gedacht
> und sollte bei Änderungen am Backup-/Restore-Verfahren aktualisiert
> und erneut getestet werden.

## 1. Was das Backup enthält

Der GitHub-Actions-Workflow sichert:

-   PostgreSQL-Rollen als `backup/database/roles.sql`
-   Datenbankschema als `backup/database/schema.sql`
-   Daten als `backup/database/data.sql`
-   Dateien aus dem Supabase-Storage-Bucket `employee-documents`
-   `backup/MANIFEST.txt`
-   `backup/SHA256SUMS.txt`

Anschließend wird das gesamte Backup als `tar.gz` gepackt, mit OpenSSL
AES-256-CBC + PBKDF2 verschlüsselt und als `.tar.gz.enc` nach Cloudflare
R2 übertragen.

Der technische Storage-Bucket-Identifier lautet exakt:

`employee-documents`

Groß-/Kleinschreibung beachten. `Employee-documents` ist falsch.

Der produktive Workflow muss fehlschlagen, wenn aus `employee-documents`
0 Dateien gesichert werden. Ein grüner Lauf darf daher nicht entstehen,
wenn der bekannte Dokument-Bucket leer gesichert wurde.

## 2. Aufbewahrung in Cloudflare R2

Bucket:

`dipera-backups`

Verzeichnisstruktur:

-   `daily/` -- 14 Backups
-   `weekly/` -- 8 Backups
-   `monthly/` -- 12 Backups

Regelmäßiger Lauf: täglich um 03:15 UTC.

R2 enthält ausschließlich das verschlüsselte `.tar.gz.enc`-Archiv. Die
Backup-Passphrase gehört nicht in R2 und muss getrennt im
Passwortmanager aufbewahrt werden.

## 3. Grundregeln im Ernstfall

1.  Niemals zuerst am beschädigten Produktivsystem experimentieren.
2.  Ein geeignetes verschlüsseltes Backup aus R2 herunterladen.
3.  Restore nach Möglichkeit zunächst in einem neuen Supabase-Projekt
    testen.
4.  Niemals Passwörter, Secret Keys oder die Backup-Passphrase in
    Tickets, Chats, Git-Commits oder Logs kopieren.
5.  Supabase-Systemtabellen und reservierte Rollen nicht blind
    überschreiben.
6.  Storage-Dateien über die Supabase Storage API wiederherstellen,
    nicht durch direktes Schreiben in `storage.objects`.
7.  Erst nach technischen und funktionalen Prüfungen einen
    wiederhergestellten Stand als verwendbar betrachten.

## 4. Backup lokal entschlüsseln

Unter Windows wurde erfolgreich OpenSSL aus Git for Windows verwendet:

`C:\Program Files\Git\usr\bin\openssl.exe`

Die interaktive OpenSSL-Passworteingabe verursachte beim Test
`bad decrypt`. Erfolgreich war die Übergabe über eine temporäre
PowerShell-Umgebungsvariable.

Passphrase temporär laden:

``` powershell
$env:BACKUP_ENCRYPTION_PASSPHRASE = Read-Host "Backup-Passphrase"
```

Optional kann vor der Entschlüsselung geprüft werden, ob die lokal
eingegebene Passphrase der erwarteten Passphrase entspricht, indem ihr
SHA-256-Fingerprint mit einem zuvor sicher verifizierten Fingerprint
verglichen wird. Die Passphrase selbst niemals ausgeben.

Entschlüsselung:

``` powershell
& "C:\Program Files\Git\usr\bin\openssl.exe" enc -d -aes-256-cbc -pbkdf2 -iter 200000 `
  -in "PFAD\ZUM\BACKUP.tar.gz.enc" `
  -out "PFAD\ZUM\RESTORE.tar.gz" `
  -pass env:BACKUP_ENCRYPTION_PASSPHRASE
```

Wenn `bad decrypt` erscheint, nicht weiterarbeiten. Zuerst Passphrase
und Datei überprüfen.

## 5. Archiv entpacken

Beispiel:

``` powershell
$restoreDir = "$env:USERPROFILE\Downloads\dipera-restore"

Remove-Item $restoreDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $restoreDir | Out-Null

tar -xzf "$env:USERPROFILE\Downloads\dipera-restore.tar.gz" -C $restoreDir
```

Erwartete Kernstruktur:

``` text
backup/
├── MANIFEST.txt
├── SHA256SUMS.txt
├── database/
│   ├── roles.sql
│   ├── schema.sql
│   └── data.sql
└── storage/
    └── employee-documents/
        └── ...
```

## 6. Integrität mit SHA-256 prüfen

Mit Git Bash unter Windows:

``` powershell
& "C:\Program Files\Git\bin\bash.exe" -lc 'cd "/c/PFAD/ZUM/ENTPACKTEN/RESTORE" && sha256sum -c backup/SHA256SUMS.txt'
```

Alle aufgeführten Dateien müssen `OK` melden, insbesondere:

-   `MANIFEST.txt`
-   `schema.sql`
-   `roles.sql`
-   `data.sql`
-   alle Dateien unter `backup/storage/employee-documents/`

Bei einer fehlerhaften Prüfsumme Restore abbrechen und Backup/Download
untersuchen.

## 7. Neues Supabase-Restore-Projekt vorbereiten

Für einen kontrollierten Test ein neues Supabase-Projekt anlegen.

Benötigt werden:

-   Datenbank-Host bzw. Session-Pooler
-   Datenbankname
-   PostgreSQL-Benutzer
-   Datenbankpasswort
-   Project URL
-   Secret Key des Restore-Projekts

Geheimnisse nicht in Skripte committen.

Beim erfolgreichen Test wurde PostgreSQL 17 verwendet. Unter Windows lag
`psql.exe` unter:

`C:\Program Files\PostgreSQL\17\bin\psql.exe`

## 8. Datenbankschema wiederherstellen

Das Schema wurde erfolgreich mit `psql` und `ON_ERROR_STOP=1`
importiert.

Muster:

``` powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
  -h "RESTORE_DB_HOST" `
  -p 5432 `
  -U "RESTORE_DB_USER" `
  -d postgres `
  -v ON_ERROR_STOP=1 `
  -f "PFAD\backup\database\schema.sql"
```

Der Exitcode muss erfolgreich sein. SQL-Fehler nicht ignorieren.

## 9. `roles.sql` nicht blind erzwingen

Beim praktischen Restore-Test schlug der Import von `roles.sql` unter
anderem fehl, weil Supabase verwaltete/reservierte Rollen schützt, z.
B.:

`"supabase_admin" is a reserved role, only superusers can modify it`

Das bedeutet nicht automatisch, dass das Backup beschädigt ist.

Für einen Restore in ein verwaltetes Supabase-Projekt gilt:

-   Supabase-Systemrollen existieren bereits.
-   Reservierte Rollen nicht gewaltsam verändern.
-   `roles.sql` als Sicherungs-/Referenzbestandteil behalten.
-   Bei einem zukünftigen Restore prüfen, welche anwendungseigenen
    Rollen tatsächlich wiederhergestellt werden müssen.
-   Änderungen an Supabase-eigenen Rollen nicht erzwingen.

## 10. Daten wiederherstellen

Muster:

``` powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
  -h "RESTORE_DB_HOST" `
  -p 5432 `
  -U "RESTORE_DB_USER" `
  -d postgres `
  -v ON_ERROR_STOP=1 `
  -f "PFAD\backup\database\data.sql"
```

Beim Test wurden die Dipera-Fachdaten erfolgreich importiert. Der Import
stoppte später an einer geschützten Supabase-Storage-Systemtabelle:

`storage.buckets_vectors`

Das zeigt: `data.sql` enthält neben Dipera-Daten auch
Supabase-verwaltete Datenbereiche. Geschützte `storage.*`-Interna
sollten in einem verwalteten Supabase-Ziel nicht blind per SQL
überschrieben werden.

### Wichtig

Storage-Objektmetadaten in `storage.objects` ersetzen nicht die
eigentlichen Dateien. Die echten Dateien werden separat im Backup unter
`backup/storage/employee-documents/` gesichert und müssen über die
Storage API hochgeladen werden.

## 11. Dipera-Fachdaten prüfen

Nach dem Test-Restore wurden unter anderem folgende Werte erfolgreich
festgestellt:

-   `public.businesses`: 21
-   `public.employees`: 77
-   `public.profiles`: 15
-   `public.time_entries`: 486
-   `auth.users`: 17

Diese Zahlen sind nur der Stand des Restore-Tests vom 24.09.2026 und
dürfen bei zukünftigen Restores nicht als Sollwerte verwendet werden.

Sinnvolle Kontrollabfrage:

``` sql
SELECT
  (SELECT COUNT(*) FROM public.businesses) AS businesses,
  (SELECT COUNT(*) FROM public.employees) AS employees,
  (SELECT COUNT(*) FROM public.profiles) AS profiles,
  (SELECT COUNT(*) FROM public.time_entries) AS time_entries;
```

Auth:

``` sql
SELECT COUNT(*) AS auth_users
FROM auth.users;
```

## 12. Profile mit Auth-Benutzern abgleichen

Beim Test waren alle 15 Profile mit einem Auth-Benutzer derselben UUID
verknüpft.

Prüfabfrage:

``` sql
SELECT
  COUNT(*) AS profiles_total,
  COUNT(u.id) AS profiles_with_auth_user
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id;
```

Im Ernstfall müssen die beiden Werte zueinander passen, sofern jedes
Dipera-Profil einen Auth-Benutzer besitzen soll.

Wichtig: Dass `auth.users` vorhanden ist und UUID-Verknüpfungen stimmen,
beweist allein noch nicht, dass jeder Login-End-to-End funktioniert.
Authentifizierung sollte zusätzlich funktional getestet werden.

## 13. Storage-Backup vor dem Restore prüfen

Dateien zählen:

``` powershell
Get-ChildItem `
  "PFAD\backup\storage\employee-documents" `
  -File -Recurse |
Measure-Object
```

Beim Test vom 24.09.2026 waren 2 echte PDF-Dateien enthalten. Diese Zahl
ist kein zukünftiger Sollwert.

Wenn Produktivdaten Dokumente enthalten, das Backup-Verzeichnis aber 0
Dateien enthält, Restore/Backup-Prozess untersuchen.

## 14. Storage-Bucket im Restore-Projekt

Der Bucket muss technisch exakt heißen:

`employee-documents`

Beim Test waren folgende Eigenschaften vorhanden:

-   File Size Limit: 10 MB
-   erlaubte MIME-Typen:
    -   `application/pdf`
    -   `image/jpeg`
    -   `image/png`

Die jeweils aktuelle Produktivkonfiguration ist maßgeblich. Vor einem
echten Restore die Bucket-Konfiguration mit dem aktuellen Produktivstand
bzw. den versionierten Definitionen vergleichen.

## 15. Storage-Dateien über die API wiederherstellen

Nicht direkt in `storage.objects` schreiben.

Die Dateien müssen mit ihren ursprünglichen relativen Objektpfaden
hochgeladen werden. Beispielprinzip:

``` javascript
const objectPath = path
  .relative(sourceRoot, localPath)
  .split(path.sep)
  .join("/");
```

Anschließend:

``` javascript
await supabase.storage
  .from("employee-documents")
  .upload(objectPath, fileBuffer, {
    contentType,
    upsert: false
  });
```

`upsert: false` ist für einen frischen Restore sinnvoll, weil
unerwartete bestehende Objekte dadurch nicht still überschrieben werden.

### MIME-Typen

Beim Test schlug der erste Upload fehl, weil ohne expliziten
Content-Type eine PDF als `text/plain;charset=UTF-8` behandelt wurde.
Der Bucket akzeptierte diesen MIME-Typ nicht.

Deshalb beim Restore explizit setzen:

``` text
.pdf       -> application/pdf
.jpg/.jpeg -> image/jpeg
.png       -> image/png
```

Unbekannte Dateitypen nicht blind hochladen. Erst prüfen, ob sie nach
aktueller Dipera-Konfiguration zulässig sind.

## 16. Storage funktional prüfen

Nach dem Upload nicht nur auf eine Erfolgsmeldung des Skripts vertrauen.

Prüfen:

1.  Bucket `employee-documents` im Supabase-Dashboard öffnen.
2.  Erwartete UUID-/Objektpfade kontrollieren.
3.  Mindestens ein wiederhergestelltes Dokument tatsächlich
    herunterladen.
4.  Datei öffnen und prüfen, ob sie verwendbar ist.
5.  Bei größerem Restore stichprobenartig mehrere Dateitypen und
    Mandanten prüfen.
6.  Wenn möglich, Referenzen aus `public.employee_documents` mit den
    tatsächlichen Storage-Pfaden abgleichen.

Beim Test vom 24.09.2026 konnte eine wiederhergestellte PDF aus dem
neuen Supabase-Projekt erfolgreich heruntergeladen werden.

## 17. Auth funktional prüfen

Vor einer echten Umschaltung zusätzlich testen:

-   Anmeldung eines geeigneten Testbenutzers
-   korrekte Zuordnung zu Profil/Mitarbeiter/Betrieb
-   erwartete RLS-Berechtigungen
-   ggf. Passwort-Reset
-   relevante Auth-Identitäten

Keine realen Benutzerpasswörter für Tests anfordern oder offenlegen.

## 18. Anwendung vor Umschaltung prüfen

Mindestens folgende Dipera-Kernbereiche kontrollieren:

-   Login
-   Mandanten-/Business-Zuordnung
-   Mitarbeiter
-   Zeiterfassung
-   Schichten/Dienstplan
-   Abwesenheiten
-   Stundenkonten
-   Zuschläge
-   Payroll-/Monatsabschlussdaten
-   DATEV-relevante Daten
-   Mitarbeiterdokumente
-   RLS und Rollen
-   benötigte Storage-Policies
-   Push-/externe Integrationen, soweit für den wiederhergestellten
    Betrieb erforderlich

Ein erfolgreicher SQL-Import allein ist kein vollständiger
Disaster-Recovery-Nachweis.

## 19. Nach erfolgreichem Restore

Vor einer Produktionsumschaltung:

1.  Datenbank- und Storage-Prüfungen abschließen.
2.  Auth funktional testen.
3.  Anwendung mit Restore-Projekt testen.
4.  Environment Variables und Projekt-URLs kontrolliert umstellen.
5.  Externe Secrets/Integrationen prüfen.
6.  DNS/Deployment nur kontrolliert ändern.
7.  Altes/beschädigtes System nicht vorschnell löschen.
8.  Nach Umschaltung neues Backup des wiederhergestellten Systems
    erzeugen.
9.  Fehlerursache des ursprünglichen Ausfalls dokumentieren.

## 20. Lokale Sicherheitsbereinigung

Nach einem Restore-Test oder Notfall-Restore nicht mehr benötigte
Klartextkopien entfernen:

-   entschlüsseltes `.tar.gz`
-   entpackte SQL-Dumps
-   entpackte Mitarbeiterdokumente
-   temporäre Restore-Skripte mit lokalen Arbeitsdaten

Temporäre PowerShell-Variablen entfernen:

``` powershell
Remove-Item Env:BACKUP_ENCRYPTION_PASSPHRASE -ErrorAction SilentlyContinue
Remove-Item Env:SUPABASE_RESTORE_SECRET_KEY -ErrorAction SilentlyContinue
Remove-Item Env:SUPABASE_RESTORE_URL -ErrorAction SilentlyContinue
```

Alternativ die entsprechende Shell vollständig schließen.

Verschlüsselte R2-Backups gemäß Retention-Regeln behalten.

## 21. Erkenntnisse aus dem Restore-Test vom 24.09.2026

Der Test hat mehrere Fehler erkannt, die ein rein „grüner"
Backup-Workflow nicht gezeigt hätte:

1.  Der Workflow verwendete zunächst `Employee-documents` statt des
    technischen Bucket-Identifiers `employee-documents`.
2.  Dadurch wurden 0 Storage-Dateien gesichert, obwohl GitHub Actions
    zuvor erfolgreich durchlief.
3.  Der Workflow besitzt deshalb nun einen permanenten Fail-Safe: 0
    gesicherte Dateien aus dem bekannten Dokument-Bucket führen zum
    Abbruch.
4.  Verschlüsselung und R2-Transport wurden durch Download,
    Entschlüsselung und SHA-256-Prüfung praktisch verifiziert.
5.  `roles.sql` kann in einem verwalteten Supabase-Projekt an
    reservierten Rollen scheitern.
6.  `data.sql` kann geschützte Supabase-Systemtabellen enthalten;
    `storage.*` darf nicht blind erzwungen werden.
7.  Storage-Dateien müssen separat über die Storage API
    wiederhergestellt werden.
8.  MIME-Typen müssen beim Restore explizit korrekt gesetzt werden.
9.  Ein Dokument wurde nach dem Restore aus dem neuen Supabase-Projekt
    erfolgreich heruntergeladen.
10. Ein echter Restore-Test ist Teil der Backup-Strategie; ein
    erfolgreicher Backup-Job allein beweist keine Wiederherstellbarkeit.

## 22. Regelmäßige Wiederherstellungstests

Empfehlung für Dipera:

-   Nach wesentlichen Änderungen am Backup-Workflow erneut testen.
-   Nach Änderungen an Supabase Storage/Auth/Datenmodell
    Restore-Anleitung überprüfen.
-   Zusätzlich in regelmäßigen Abständen einen vollständigen Restore in
    ein isoliertes Testprojekt durchführen.
-   Testdatum und Ergebnis in diesem Dokument oder einem separaten
    Recovery-Testprotokoll festhalten.

### Letzter vollständiger Test

**24.09.2026 -- erfolgreich**

Verifiziert wurden:

-   R2-Download
-   AES-Entschlüsselung
-   Archiv
-   SHA-256-Integrität
-   Datenbankschema
-   Dipera-Fachdaten
-   `auth.users`
-   Profile/Auth-UUID-Verknüpfungen
-   physische Storage-Dateien
-   Storage-Restore unter Originalpfaden
-   Download eines wiederhergestellten Dokuments

------------------------------------------------------------------------

## Kurzfassung für den Notfall

**R2-Backup herunterladen → entschlüsseln → SHA-256 prüfen → neues
Supabase-Projekt → Schema/Fachdaten kontrolliert einspielen →
Supabase-Systemrollen/-Storage nicht blind überschreiben → Auth prüfen →
`employee-documents` über Storage API unter Originalpfaden
wiederherstellen → MIME-Typen setzen → Dokumente herunterladen/öffnen →
Anwendung End-to-End testen → erst danach Produktionsumschaltung.**
