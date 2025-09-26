#!/usr/bin/env python3
"""
Metadaten-Extraktion für Hans Gross Kriminalmuseum Archive
Extrahiert historische Daten und Kategorien aus Volltext-Feldern.
"""

import json
import re
from typing import Optional, List, Dict, Any
from pathlib import Path


class MetadataEnhancer:
    """Erweitert Archivdaten mit extrahierten Metadaten."""

    def __init__(self):
        self.statistics = {
            'total': 0,
            'with_date': 0,
            'classified': 0,
            'with_crimes': 0,
            'with_locations': 0
        }

        # Crime type mapping based on Austrian StGB paragraphs
        self.crime_mapping = {
            '140': 'Mord',
            '171': 'Wilderei',
            '174': 'Wilderei',
            '431': 'Betrug',
            '460': 'Diebstahl',
            '467': 'Unterschlagung',
            '468': 'Veruntreuung',
            '2': 'Waffengesetz',
            '8': 'Waffengesetz',
            '32': 'Waffengesetz'
        }

        # Weapon keywords for classification
        self.weapon_keywords = {
            'pistole': 'Waffe.Feuerwaffe.Pistole',
            'revolver': 'Waffe.Feuerwaffe.Revolver',
            'gewehr': 'Waffe.Feuerwaffe.Gewehr',
            'stutzen': 'Waffe.Feuerwaffe.Gewehr',
            'flobert': 'Waffe.Feuerwaffe.Kleinkaliberwaffe',
            'messer': 'Waffe.Stichwaffe.Messer',
            'dolch': 'Waffe.Stichwaffe.Dolch',
            'schalldämpfer': 'Waffe.Zubehör.Schalldämpfer'
        }

    def extract_historical_year(self, text: str) -> Optional[int]:
        """Extrahiert die früheste relevante Jahreszahl aus dem Text."""
        if not text:
            return None

        patterns = [
            # Geburtsdaten
            r'geb(?:oren)?\.?\s*(?:\d{1,2}[.\/-]\d{1,2}[.\/-])?(\d{4})',
            r'geb(?:oren)?\.?\s*(?:\d{1,2}\.?\s*\w+\s+)?(\d{4})',
            # Allgemeine Jahreszahlen
            r'\b(18[5-9]\d|19[0-4]\d)\b',
            # Urteile
            r'Urteil\s+v(?:om)?\.?\s*\d{1,2}[.\/-]\d{1,2}[.\/-](\d{4})',
            # Datumsangaben
            r'\d{1,2}[.\/-]\d{1,2}[.\/-](\d{4})'
        ]

        years = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    year = int(match)
                    if 1850 <= year <= 1950:
                        years.append(year)
                except (ValueError, TypeError):
                    continue

        # Return the earliest year found (most historically relevant)
        return min(years) if years else None

    def extract_date_range(self, text: str) -> Optional[List[int]]:
        """Extrahiert Zeitraum aus dem Text."""
        year = self.extract_historical_year(text)
        if not year:
            return None

        # Find all years to determine range
        all_years = re.findall(r'\b(18[5-9]\d|19[0-4]\d)\b', text)
        valid_years = [int(y) for y in all_years if 1850 <= int(y) <= 1950]

        if valid_years:
            return [min(valid_years), max(valid_years)]
        return [year, year]

    def classify_object(self, item: Dict[str, Any]) -> str:
        """Klassifiziert Objekt basierend auf Container und Inhalt."""
        container = item.get('container', '')

        # Karteikarten sind immer Dokumente
        if container == 'karteikarten':
            return 'Dokument.Karteikarte'

        # Analyse von Beschreibung und Volltext
        text = (item.get('description', '') + ' ' +
                item.get('fulltext', '') + ' ' +
                item.get('title', '')).lower()

        # Waffen-Klassifikation
        for keyword, classification in self.weapon_keywords.items():
            if keyword in text:
                return classification

        # Weitere Objekttypen
        if 'foto' in text or 'photo' in text:
            return 'Dokument.Fotografie'
        if 'brief' in text:
            return 'Dokument.Brief'
        if 'urkunde' in text:
            return 'Dokument.Urkunde'

        # Standard für Museumsobjekte
        if container == 'objekte':
            return 'Beweisstück.Objekt'

        return 'Beweisstück.Sonstiges'

    def extract_crime_types(self, text: str) -> List[str]:
        """Extrahiert Delikttypen aus dem Text."""
        if not text:
            return []

        crimes = set()

        # Paragraphen-basierte Extraktion
        paragraph_pattern = r'§+\s*(\d+[a-z]?)'
        paragraphs = re.findall(paragraph_pattern, text, re.IGNORECASE)

        for paragraph in paragraphs:
            base_number = re.match(r'\d+', paragraph)
            if base_number:
                number = base_number.group()
                if number in self.crime_mapping:
                    crimes.add(self.crime_mapping[number])

        # Direkte Deliktbezeichnungen
        crime_keywords = [
            'mord', 'totschlag', 'wilderei', 'wilddiebstahl',
            'diebstahl', 'betrug', 'unterschlagung', 'raub',
            'körperverletzung', 'waffengesetz', 'wp'
        ]

        text_lower = text.lower()
        for keyword in crime_keywords:
            if keyword in text_lower:
                if keyword == 'wilddiebstahl':
                    crimes.add('Wilderei')
                elif keyword == 'wp' or keyword == 'waffengesetz':
                    crimes.add('Waffengesetz')
                elif keyword == 'körperverletzung':
                    crimes.add('Körperverletzung')
                else:
                    crimes.add(keyword.capitalize())

        return sorted(list(crimes))

    def extract_locations(self, text: str) -> List[str]:
        """Extrahiert Ortsnamen aus dem Text."""
        if not text:
            return []

        locations = set()

        # Gerichtsorte
        court_pattern = r'(?:gericht|Gericht)\s+([A-Z][a-züöäß]+)'
        courts = re.findall(court_pattern, text)
        locations.update(courts)

        # Bekannte österreichische Städte
        austrian_cities = [
            'Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck',
            'Klagenfurt', 'Villach', 'Wels', 'Leoben', 'Steyr',
            'Rottenmann', 'Oberzeiring', 'Brettstein', 'Bretstein'
        ]

        for city in austrian_cities:
            if city in text:
                locations.add(city)

        return sorted(list(locations))

    def extract_persons(self, text: str) -> List[Dict[str, Any]]:
        """Extrahiert Personendaten aus dem Text."""
        if not text:
            return []

        persons = []

        # Pattern für Täternamen
        name_patterns = [
            r'Name des Täters:\s*([A-Z][a-z]+\s+[A-Z]\.?)',
            r'Täter:\s*([A-Z][a-z]+\s+[A-Z]\.?)',
            r'([A-Z][a-z]+\s+[A-Z]\.?)\s*Alter:'
        ]

        for pattern in name_patterns:
            matches = re.findall(pattern, text)
            for name in matches:
                person = {'name': name.strip()}

                # Alter extrahieren
                age_pattern = rf'{re.escape(name)}.*?Alter:\s*(\d+)'
                age_match = re.search(age_pattern, text, re.IGNORECASE | re.DOTALL)
                if age_match:
                    person['age'] = int(age_match.group(1))

                # Beruf extrahieren
                prof_pattern = rf'{re.escape(name)}.*?Beruf:\s*([A-Za-z]+)'
                prof_match = re.search(prof_pattern, text, re.IGNORECASE | re.DOTALL)
                if prof_match:
                    person['profession'] = prof_match.group(1)

                persons.append(person)

        return persons

    def enhance_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Erweitert ein einzelnes Archiv-Item mit Metadaten."""
        enhanced = item.copy()

        fulltext = item.get('fulltext', '')
        description = item.get('description', '')
        combined_text = f"{fulltext} {description}"

        # Historisches Jahr
        year = self.extract_historical_year(combined_text)
        if year:
            enhanced['historicalYear'] = year
            self.statistics['with_date'] += 1

        # Zeitraum
        date_range = self.extract_date_range(combined_text)
        if date_range:
            enhanced['dateRange'] = date_range

        # Objektklassifikation
        classification = self.classify_object(item)
        enhanced['objectClass'] = classification
        if not classification.endswith('Sonstiges'):
            self.statistics['classified'] += 1

        # Delikttypen
        crimes = self.extract_crime_types(combined_text)
        if crimes:
            enhanced['crimeType'] = crimes
            self.statistics['with_crimes'] += 1

        # Orte
        locations = self.extract_locations(combined_text)
        if locations:
            enhanced['locations'] = locations
            self.statistics['with_locations'] += 1

        # Personen
        persons = self.extract_persons(fulltext)
        if persons:
            enhanced['persons'] = persons

        # Qualitätsbewertung
        quality = 0.0
        if 'historicalYear' in enhanced:
            quality += 0.3
        if 'crimeType' in enhanced:
            quality += 0.3
        if 'locations' in enhanced:
            quality += 0.2
        if not classification.endswith('Sonstiges'):
            quality += 0.2
        enhanced['extractionQuality'] = round(quality, 2)

        return enhanced

    def process_archive(self, input_file: str, output_file: str) -> Dict[str, Any]:
        """Verarbeitet die gesamte Archivdatei."""
        print(f"Loading data from {input_file}...")

        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.statistics['total'] = len(data)
        print(f"Processing {len(data)} items...")

        enhanced_data = []
        for i, item in enumerate(data):
            if i % 100 == 0:
                print(f"  Processing item {i}/{len(data)}...")
            enhanced_item = self.enhance_item(item)
            enhanced_data.append(enhanced_item)

        # Sortiere nach historischem Jahr
        enhanced_data.sort(key=lambda x: x.get('historicalYear', 9999))

        print(f"Saving enhanced data to {output_file}...")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(enhanced_data, f, ensure_ascii=False, indent=2)

        # Berechne Statistiken
        self.statistics['coverage'] = {
            'date': round(self.statistics['with_date'] / self.statistics['total'], 3),
            'classified': round(self.statistics['classified'] / self.statistics['total'], 3),
            'crimes': round(self.statistics['with_crimes'] / self.statistics['total'], 3),
            'locations': round(self.statistics['with_locations'] / self.statistics['total'], 3)
        }

        return self.statistics


def main():
    """Hauptfunktion."""
    enhancer = MetadataEnhancer()

    input_file = 'km_archive/metadata/all_objects.json'
    output_file = 'km_archive/metadata/enhanced_objects.json'

    # Prüfe ob Input-Datei existiert
    if not Path(input_file).exists():
        print(f"Error: Input file {input_file} not found!")
        return 1

    # Verarbeite Archiv
    stats = enhancer.process_archive(input_file, output_file)

    # Ausgabe der Statistiken
    print("\n=== Enhancement Statistics ===")
    print(f"Total items: {stats['total']}")
    print(f"With historical date: {stats['with_date']} ({stats['coverage']['date']:.1%})")
    print(f"Classified: {stats['classified']} ({stats['coverage']['classified']:.1%})")
    print(f"With crime types: {stats['with_crimes']} ({stats['coverage']['crimes']:.1%})")
    print(f"With locations: {stats['with_locations']} ({stats['coverage']['locations']:.1%})")
    print(f"\nEnhanced data saved to: {output_file}")

    return 0


if __name__ == '__main__':
    exit(main())