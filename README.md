# Armenisch lernen 🇦🇲

Eine Web-App (PWA) zum Lernen von **Ostarmenisch**, gedacht für 10–20 Minuten am Tag. Sie lässt sich auf iPhone und Android wie eine normale App installieren und funktioniert offline.

## Inhalte

| Stufe | Lektionen | Themen |
|---|---|---|
| Alphabet | 6 | alle 38 Buchstaben + և, mit Laut, IPA, Aussprachehinweis, Beispielwort |
| A1 | 7 | Begrüßung, Vorstellen, Zahlen, Familie, Essen, Farben/Adjektive, Stadt |
| A2 | 5 | Präsens, Zeit/Wochentage, Vergangenheit, Plural & Fälle, Reisen |
| B1 | 5 | Zukunft, Meinung/Modalverben, Gesundheit, Nebensätze/Konditional, Kultur |
| Aussprache | 6 Module | Betonung, 3 Reihen p/t/k, zwei R, խ/ղ, der stumme Vokal ը, ե/ո am Wortanfang |

Insgesamt sind es rund 370 Lernobjekte: Buchstaben, Wörter und Sätze.

**Ehrliche Einordnung:** Das reicht bis ungefähr Anfang B1, nicht für ein vollständiges B1 oder B2. Die Inhalte liegen zentral in [`js/content.js`](js/content.js) und lassen sich dort leicht erweitern.

## Funktionen

- **Tagestraining:** Tagesziel 10, 15 oder 20 Minuten. Fällige Wiederholungen werden mit neuen Inhalten gemischt, die Menge passt sich dem Tagesziel an. Dazu kommen Zeitmessung und eine Streak-Anzeige.
- **Wiederholung in Abständen:** Ein Leitner-System mit den Intervallen 1, 2, 4, 8, 16, 32 und 64 Tage.
- **Übungstypen:**
  - Einführungskarte
  - Armenisch → Deutsch und Deutsch → Armenisch
  - Hörverständnis
  - Wörter lesen (Umschrift wählen)
  - Buchstabe → Laut und Laut → Buchstabe
  - Satzbau mit Wortkacheln
  - Aussprache-Übung
- **Aussprache:**
  - Abspielen in normalem und langsamem Tempo 🐢
  - **Laut-für-Laut-Zerlegung:** Jeder Buchstabe wird mit seiner Umschrift angezeigt.
  - **Aufnehmen und vergleichen:** „⇄ Vergleich“ spielt Original und eigene Aufnahme direkt nacheinander ab.
  - Experimentelle Spracherkennung (hy-AM), nur wo der Browser sie anbietet.
- **Audio-Priorität:** ① Muttersprachler-Aufnahmen auf dem Gerät → ② Dateien in `audio/` → ③ armenische Stimme des Geräts.
- **Referenz-Modus:** Eine Muttersprachlerin oder ein Muttersprachler kann jedes Wort direkt in der App einsprechen (Mehr → Referenz-Modus). Die Aufnahmen lassen sich exportieren und auf anderen Geräten importieren.
- Fortschritt sichern und wiederherstellen (JSON), Dunkelmodus, offline nutzbar.

## Bekannte Grenzen

- **Armenische Geräte-Stimme:** Auf vielen Geräten gibt es keine, auf iPhones meistens nicht. Ohne Stimme und ohne Aufnahmen bleibt die App stumm, nur die Laut-für-Laut-Hilfe ist dann verfügbar. Deshalb empfehle ich, die Wörter im Referenz-Modus einsprechen zu lassen.
- **Automatische Bewertung der Aussprache:** Für Armenisch gibt es sie nicht zuverlässig. Die Erkennung ist als „experimentell“ markiert, die eigentliche Rückmeldung entsteht durch den Hörvergleich.
- **Inhalte von KI erstellt:** Sie müssen muttersprachlich geprüft werden, siehe unten.

## Auf dem Handy nutzen

1. Die App muss über **HTTPS** erreichbar sein, z. B. über GitHub Pages:
   - Repository → Settings → Pages → „Deploy from a branch“ wählen.
   - Branch und Ordner `/ (root)` auswählen.
   - Nach etwa einer Minute ist die App unter `https://<user>.github.io/<repo>/` erreichbar.
2. Seite auf dem Handy öffnen:
   - **iPhone (Safari):** Teilen → „Zum Home-Bildschirm“.
   - **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.

Lokal testen: `python3 -m http.server` im Projektordner starten und `http://localhost:8000` öffnen.

## Für die muttersprachliche Prüfung

Alle Inhalte stehen in **`js/content.js`**:

- `am`: armenischer Text
- `de`: deutsche Bedeutung
- `tr`: Umschrift, optional

Die Umschrift wird automatisch erzeugt (`translit()` in `js/app.js`). `tr` nur setzen, wenn die automatische Umschrift falsch ist.

Bitte vor allem prüfen:

1. Rechtschreibung und Natürlichkeit der Sätze, einschließlich Position des Fragezeichens ՞.
2. Grammatik-Erklärungen in den `intro`-Texten.
3. Die Wortpaare im Aussprachemodul (`PRONUNCIATION`).

Danach in `sw.js` die `VERSION` erhöhen, damit installierte Apps die Änderungen laden.

### Eigene Audiodateien (optional)

Dateien in `audio/` ablegen und in `audio/manifest.json` eintragen:

```json
{ "Բարև": "barev.mp3", "Շնորհակալություն": "shnorhakalutyun.mp3" }
```

Der Schlüssel muss exakt dem `am`-Text entsprechen.

## Technik

Das ist reines HTML, CSS und JavaScript ohne Build-Schritt und ohne Abhängigkeiten.

- Fortschritt: `localStorage`
- Aufnahmen: IndexedDB
- Offline-Betrieb: Service Worker
