# Sticker: Motive und Markierungsfarben

Alle Motive sind eigene Zeichnungen (`src/stickers/motifs.ts`), keine Kopien bestehender
Logos oder Wegzeichen. Die Farbflächen nutzen die Farben der echten Wegmarkierung.
Die Sticker dürfen bewusst von der App-Palette abweichen (Entscheid des Nutzers); die
Oberfläche und die Karte bleiben bei Papier/Grün/Tinte.

| Weg | Markierung vor Ort | Farben im Sticker | Motiv | Stand |
|---|---|---|---|---|
| Rota Vicentina – Fishermen's Trail | grün-blaue Streifen | Grün, Blau | zwei Sardinen | Vorgabe des Nutzers |
| Rota Vicentina – Historical Way | rot-weisse Streifen | Rot, Weiss | Korkeiche mit Markierung am Stamm | zu prüfen |
| Via Alpina (CH: Nationalroute 1) | Bergweg weiss-rot-weiss | Weiss, Rot | Grat mit Bergweg-Markierung | Vorgabe des Nutzers (CH-Bergweg) |
| Tour du Mont Blanc | GR-Balken rot-weiss (F), in CH gelbe Rauten | Weiss, Rot | Firnkuppe mit GR-Balken | zu prüfen |
| GR 20 | GR-Balken rot-weiss | Weiss, Rot | Granitnadeln mit GR-Balken | Vorgabe des Nutzers (GR) |
| Camino Francés / Portugués / del Norte | gelber Pfeil, oft auf Blau | Gelb, Blau | Kachel mit Pfeil (Varianten: Weg, Wellen, Küste) | Vorgabe des Nutzers |
| Kungsleden | rote Kreuze (Wintermarkierung), rote Farbpunkte | Rot, Steingrau | Steinmann mit rotem Kreuz | zu prüfen |
| West Highland Way | Distel-Symbol im Sechseck auf Holzpfosten | Distelviolett, Grün | Distel | zu prüfen; Farben sind die der Distel, nicht des Schilds |
| Schweizer Nationalrouten | gelbe Raute (Wanderweg), weiss-rot-weiss (Bergweg) | Gelb, Weiss, Rot | Raute mit Markierungsstreifen | Vorgabe des Nutzers |
| andere geladene Wege | unbekannt | Waldgrün | Wegweiser | neutral |

«zu prüfen» heisst: aus allgemeinem Wissen übernommen, aus der Entwicklungsumgebung nicht
gegen eine offizielle Quelle prüfbar. Vor einer Veröffentlichung nachschlagen und hier nachtragen.
Noch offen: weiss-blau-weiss (Alpinweg) kommt erst mit Stickern für einzelne Etappen/Alpinrouten.

## Technik
- `Sticker.tsx`: SVG-Filter `ink` (Strich leicht verschoben), `wash` (Aquarell: verschobene
  Kanten, ungleichmässige Deckkraft), `cut` (weisser Die-Cut-Rand aus der aufgeblähten
  Silhouette, weicher Schatten).
- Freischalten: Abdeckung = Anteil der Weglänge, der näher als 60 m an einer eigenen Spur
  liegt (`coverage.ts`). Die Farbe steigt von unten; ab 90 % voll, einmalige Animation.
- Teilen: `share.ts` zeichnet das SVG in ein Canvas (1080 × 1350) mit Name, Datum und km.
