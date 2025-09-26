#!/usr/bin/env python3
"""
Verbesserte Metadaten-Extraktion für Hans Gross Kriminalmuseum Archive
Version 2.0 - Optimierte Datenerkennung mit Fallback-Strategien
"""

import json
import re
from typing import Optional, List, Dict, Any, Tuple
from pathlib import Path
from datetime import datetime


class ImprovedMetadataEnhancer:
    """Erweiterte Metadaten-Extraktion mit verbesserter Erkennungsrate."""

    def __init__(self):
        self.statistics = {
            'total': 0,
            'with_date': 0,
            'with_estimated_date': 0,
            'classified': 0,
            'with_crimes': 0,
            'with_locations': 0,
            'without_fulltext': 0
        }

        # Erweiterte Crime-Type Mappings
        self.crime_mapping = {
            '140': 'Mord',
            '142': 'Mord',
            '171': 'Wilderei',
            '174': 'Wilderei',
            '176': 'Wilderei',
            '431': 'Betrug',
            '460': 'Diebstahl',
            '467': 'Unterschlagung',
            '468': 'Veruntreuung',
            '2': 'Waffengesetz',
            '8': 'Waffengesetz',
            '32': 'Waffengesetz',
            '36': 'Waffengesetz',
            '81': 'Versuch',
            '82': 'Beihilfe',
            '267': 'Urkundenfälschung',
            '389': 'Kostentragung'
        }

        # Erweiterte Waffen-Keywords
        self.weapon_keywords = {
            'pistole': 'Waffe.Feuerwaffe.Pistole',
            'revolver': 'Waffe.Feuerwaffe.Revolver',
            'gewehr': 'Waffe.Feuerwaffe.Gewehr',
            'stutzen': 'Waffe.Feuerwaffe.Gewehr',
            'kugelstutzen': 'Waffe.Feuerwaffe.Gewehr',
            'flobert': 'Waffe.Feuerwaffe.Kleinkaliberwaffe',
            'flobertpistole': 'Waffe.Feuerwaffe.Kleinkaliberwaffe',
            'schreckpistole': 'Waffe.Feuerwaffe.Schreckschusswaffe',
            'repetierpistole': 'Waffe.Feuerwaffe.Pistole',
            'messer': 'Waffe.Stichwaffe.Messer',
            'dolch': 'Waffe.Stichwaffe.Dolch',
            'schalldämpfer': 'Waffe.Zubehör.Schalldämpfer',
            'säbel': 'Waffe.Hiebwaffe.Säbel',
            'bajonett': 'Waffe.Stichwaffe.Bajonett',
            'munition': 'Waffe.Zubehör.Munition',
            'patrone': 'Waffe.Zubehör.Munition',
            'kugel': 'Waffe.Zubehör.Munition'
        }

        # Erweiterte Ortsliste (österreichische Städte und Gerichte)
        self.austrian_locations = {
            # Landeshauptstädte
            'wien', 'graz', 'linz', 'salzburg', 'innsbruck',
            'klagenfurt', 'bregenz', 'eisenstadt', 'st. pölten',
            # Größere Städte
            'villach', 'wels', 'steyr', 'feldkirch', 'leonding',
            'klosterneuburg', 'baden', 'wolfsberg', 'krems',
            'traun', 'amstetten', 'lustenau', 'kapfenberg',
            'mödling', 'hallein', 'kufstein', 'traiskirchen',
            'schwechat', 'braunau', 'stockerau', 'saalfelden',
            'tulln', 'hohenems', 'spittal', 'bludenz', 'gmunden',
            'ternitz', 'perchtoldsdorf', 'feldkirchen', 'bad ischl',
            'schwaz', 'hall in tirol', 'wörgl',
            # Spezifische Orte aus dem Archiv
            'leoben', 'rottenmann', 'oberzeiring', 'brettstein',
            'bretstein', 'bleiburg', 'murau', 'judenburg',
            'knittelfeld', 'voitsberg', 'deutschlandsberg',
            'hartberg', 'fürstenfeld', 'radkersburg',
            'feldbach', 'gleisdorf', 'weiz', 'bruck an der mur',
            'mürzzuschlag', 'mariazell', 'liezen'
        }

    def extract_historical_year_advanced(self, text: str, description: str = "", identifier: str = "") -> Tuple[Optional[int], str]:
        """
        Erweiterte Jahresextraktion mit mehreren Strategien.
        Returns: (year, source_type)
        """
        if not text and not description:
            # Fallback: Versuche aus Identifier zu extrahieren (z.B. o:km.1920)
            if identifier:
                match = re.search(r'\.(\d{4})$', identifier)
                if match:
                    year = int(match.group(1))
                    if 1850 <= year <= 1950:
                        return year, 'identifier'
            return None, 'none'

        # Kombiniere alle verfügbaren Texte
        combined_text = f"{text or ''} {description or ''}"

        # Strategie 1: Explizite Jahresangaben mit Kontext
        patterns_with_context = [
            # Geburtsdaten
            (r'geb(?:oren)?\.?\s*(?:am\s+)?(?:\d{1,2}[.\/-]\d{1,2}[.\/-])?(\d{4})', 'birth'),
            (r'geb(?:oren)?\.?\s*(?:\d{1,2}\.?\s*\w+\s+)?(\d{4})', 'birth'),
            (r'\*\s*(\d{4})', 'birth'),  # * für geboren

            # Sterbedaten
            (r'(?:gest(?:orben)?|†)\s*(\d{4})', 'death'),

            # Tatdaten
            (r'(?:im\s+(?:Jahr|Jahre)\s+)?(\d{4})', 'crime'),
            (r'(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(\d{4})', 'crime'),

            # Urteile
            (r'Urteil\s+v(?:om)?\.?\s*\d{1,2}[.\/-]\d{1,2}[.\/-](\d{4})', 'court'),
            (r'verurteilt\s+(\d{4})', 'court'),

            # Allgemeine Datumsformate
            (r'\d{1,2}[.\/-]\d{1,2}[.\/-](\d{4})', 'date'),
            (r'(\d{4})[.\/-]\d{1,2}[.\/-]\d{1,2}', 'date'),
        ]

        years_with_context = []
        for pattern, context in patterns_with_context:
            matches = re.findall(pattern, combined_text, re.IGNORECASE)
            for match in matches:
                try:
                    year = int(match)
                    if 1850 <= year <= 1950:
                        years_with_context.append((year, context))
                except (ValueError, TypeError):
                    continue

        # Priorisiere nach Kontext (Geburt > Tat > Urteil > andere)
        priority = {'birth': 1, 'crime': 2, 'court': 3, 'death': 4, 'date': 5}
        if years_with_context:
            years_with_context.sort(key=lambda x: (priority.get(x[1], 99), x[0]))
            return years_with_context[0]

        # Strategie 2: Einfache Jahressuche
        simple_years = re.findall(r'\b(18[5-9]\d|19[0-4]\d)\b', combined_text)
        if simple_years:
            valid_years = [int(y) for y in simple_years if 1850 <= int(y) <= 1950]
            if valid_years:
                return min(valid_years), 'text'

        # Strategie 3: Schätze aus Museumsnummer (falls vorhanden)
        museum_id_match = re.search(r'KM-(?:KK|O)\.(\d+)', description)
        if museum_id_match:
            # Annahme: Niedrige Nummern = ältere Objekte
            num = int(museum_id_match.group(1))
            if num < 100:
                return 1900, 'estimated'
            elif num < 500:
                return 1910, 'estimated'
            elif num < 1000:
                return 1920, 'estimated'
            else:
                return 1930, 'estimated'

        return None, 'none'

    def extract_crime_types_advanced(self, text: str, description: str = "") -> List[str]:
        """Erweiterte Delikt-Extraktion mit Abkürzungserkennung."""
        if not text and not description:
            return []

        combined_text = f"{text or ''} {description or ''}"
        crimes = set()

        # Erweiterte Paragraphen-Patterns
        paragraph_patterns = [
            r'§+\s*(\d+[a-z]?)',
            r'§§\s*(\d+(?:\s*,\s*\d+)*)',  # Mehrere Paragraphen
            r'nach\s+§+\s*(\d+)',
            r'gem(?:äß)?\.?\s*§+\s*(\d+)'
        ]

        for pattern in paragraph_patterns:
            matches = re.findall(pattern, combined_text, re.IGNORECASE)
            for match in matches:
                # Handle multiple paragraphs
                numbers = re.findall(r'\d+', match)
                for num in numbers:
                    if num in self.crime_mapping:
                        crimes.add(self.crime_mapping[num])

        # Gesetzesabkürzungen
        law_abbreviations = {
            r'\bWp\.?\b': 'Waffengesetz',
            r'\bWG\b': 'Waffengesetz',
            r'\bStG\.?\b': 'Strafgesetz',
            r'\bStGB\.?\b': 'Strafgesetzbuch',
            r'\bStPO\.?\b': 'Strafprozessordnung'
        }

        for pattern, law_type in law_abbreviations.items():
            if re.search(pattern, combined_text, re.IGNORECASE):
                if law_type == 'Waffengesetz':
                    crimes.add('Waffengesetz')

        # Erweiterte Delikt-Keywords
        crime_keywords = {
            'mord': 'Mord',
            'totschlag': 'Totschlag',
            'wilderei': 'Wilderei',
            'wilddiebstahl': 'Wilderei',
            'wildern': 'Wilderei',
            'wilderer': 'Wilderei',
            'diebstahl': 'Diebstahl',
            'einbruch': 'Einbruchsdiebstahl',
            'raub': 'Raub',
            'betrug': 'Betrug',
            'urkundenfälschung': 'Urkundenfälschung',
            'fälschung': 'Fälschung',
            'unterschlagung': 'Unterschlagung',
            'veruntreuung': 'Veruntreuung',
            'körperverletzung': 'Körperverletzung',
            'notzucht': 'Sexualdelikt',
            'unzucht': 'Sexualdelikt',
            'brandstiftung': 'Brandstiftung',
            'sachbeschädigung': 'Sachbeschädigung',
            'hehlerei': 'Hehlerei',
            'schmuggel': 'Schmuggel',
            'falschmünzerei': 'Falschmünzerei',
            'amtsmissbrauch': 'Amtsmissbrauch'
        }

        text_lower = combined_text.lower()
        for keyword, crime_type in crime_keywords.items():
            if keyword in text_lower:
                crimes.add(crime_type)

        return sorted(list(crimes))

    def extract_locations_advanced(self, text: str, description: str = "") -> List[str]:
        """Erweiterte Ortsextraktion."""
        if not text and not description:
            return []

        combined_text = f"{text or ''} {description or ''}"
        locations = set()

        # Gerichtsorte mit verschiedenen Patterns
        court_patterns = [
            r'(?:Bezirks|Kreis|Land|Landes)?[gG]ericht\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[a-zander]+\s+[A-ZÄÖÜ][a-zäöüß]+)?)',
            r'(?:Amts|Bezirks)?[gG]ericht\s+([A-ZÄÖÜ][a-zäöüß]+)',
            r'[gG]erichtshof\s+([A-ZÄÖÜ][a-zäöüß]+)',
            r'LG\s+([A-ZÄÖÜ][a-zäöüß]+)',  # Landgericht Abkürzung
            r'BG\s+([A-ZÄÖÜ][a-zäöüß]+)'   # Bezirksgericht Abkürzung
        ]

        for pattern in court_patterns:
            matches = re.findall(pattern, combined_text)
            for match in matches:
                location = match.strip()
                if location.lower() not in ['der', 'des', 'zu', 'für', 'in']:
                    locations.add(location)

        # Tatorte
        location_indicators = [
            r'(?:Tatort|in|bei|zu|aus)\s+([A-ZÄÖÜ][a-zäöüß]+(?:[\s-][a-zander]+[\s-][A-ZÄÖÜ][a-zäöüß]+)?)',
            r'(?:wohnhaft\s+in|aus)\s+([A-ZÄÖÜ][a-zäöüß]+)',
            r'([A-ZÄÖÜ][a-zäöüß]+)[\s-]?(?:Graben|Bach|Tal|Berg|Alm)\b'
        ]

        for pattern in location_indicators:
            matches = re.findall(pattern, combined_text)
            for match in matches:
                location = match.strip()
                if len(location) > 2:
                    locations.add(location)

        # Bekannte österreichische Orte
        words = re.findall(r'\b[A-ZÄÖÜ][a-zäöüß]+(?:[\s-][a-zander]+[\s-][A-ZÄÖÜ][a-zäöüß]+)?\b', combined_text)
        for word in words:
            word_lower = word.lower()
            if word_lower in self.austrian_locations:
                locations.add(word)

        return sorted(list(locations))

    def extract_persons_advanced(self, text: str) -> List[Dict[str, Any]]:
        """Verbesserte Personenerkennung."""
        if not text:
            return []

        persons = []
        seen_names = set()

        # Erweiterte Name-Patterns
        name_patterns = [
            # Standard Patterns
            r'(?:Name\s+des?\s+)?Täters?:\s*(?:\d+\.\s*)?([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ]\.?(?:\s+[a-zund]+\s+[A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ]\.?)?)',
            r'(?:Angeklagter?|Beschuldigter?|Verdächtiger?):\s*([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ]\.?)',
            r'(?:gegen|wider)\s+([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ]\.?)',

            # Mit Nummern
            r'(?:\d+\.\s*)?([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ]\.?)\s*(?:Alter:|geb\.|Beruf:)',

            # Vollständige Namen
            r'([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)\s*,?\s*(?:\d+\s*Jahre?|geb\.)',
        ]

        for pattern in name_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for name in matches:
                clean_name = name.strip()
                if clean_name and clean_name not in seen_names and len(clean_name) > 3:
                    seen_names.add(clean_name)
                    person = {'name': clean_name}

                    # Extrahiere Zusatzinformationen
                    # Alter
                    age_patterns = [
                        rf'{re.escape(clean_name)}.*?(?:Alter:|,)\s*(\d+)\s*(?:J(?:ahre?)?)?',
                        rf'{re.escape(clean_name)}.*?(\d+)\s*Jahre?\s*alt'
                    ]

                    for age_pattern in age_patterns:
                        age_match = re.search(age_pattern, text, re.IGNORECASE | re.DOTALL)
                        if age_match:
                            try:
                                person['age'] = int(age_match.group(1))
                                break
                            except ValueError:
                                pass

                    # Beruf
                    prof_pattern = rf'{re.escape(clean_name)}.*?Beruf:\s*([A-Za-zäöüß]+(?:\s+[A-Za-zäöüß]+)?)'
                    prof_match = re.search(prof_pattern, text, re.IGNORECASE | re.DOTALL)
                    if prof_match:
                        profession = prof_match.group(1).strip()
                        if profession and len(profession) > 2:
                            person['profession'] = profession

                    # Geburtsjahr
                    birth_pattern = rf'{re.escape(clean_name)}.*?geb\.?\s*(?:\d{{1,2}}[.\/-]\d{{1,2}}[.\/-])?(\d{{4}})'
                    birth_match = re.search(birth_pattern, text, re.IGNORECASE | re.DOTALL)
                    if birth_match:
                        try:
                            birth_year = int(birth_match.group(1))
                            if 1800 <= birth_year <= 1950:
                                person['birth_year'] = birth_year
                        except ValueError:
                            pass

                    persons.append(person)

        return persons

    def classify_object_advanced(self, item: Dict[str, Any]) -> str:
        """Erweiterte Objektklassifikation."""
        container = item.get('container', '')

        # Karteikarten
        if container == 'karteikarten':
            return 'Dokument.Karteikarte'

        # Kombiniere alle Textfelder
        text_fields = [
            item.get('title', ''),
            item.get('description', ''),
            item.get('fulltext', '')
        ]
        combined_text = ' '.join(text_fields).lower()

        # Prüfe Waffen-Keywords (erweitert)
        for keyword, classification in self.weapon_keywords.items():
            if keyword in combined_text:
                # Zusätzliche Klassifikation nach Details
                if 'cal.' in combined_text or 'kaliber' in combined_text:
                    # Versuche Kaliber zu extrahieren
                    cal_match = re.search(r'(?:cal\.?|kaliber)\s*([\d,.-]+)', combined_text)
                    if cal_match:
                        classification += f'.Cal{cal_match.group(1).replace(",",".")}'
                return classification

        # Dokument-Typen
        document_types = {
            'foto': 'Dokument.Fotografie',
            'photo': 'Dokument.Fotografie',
            'brief': 'Dokument.Brief',
            'schreiben': 'Dokument.Brief',
            'urkunde': 'Dokument.Urkunde',
            'protokoll': 'Dokument.Protokoll',
            'akte': 'Dokument.Akte',
            'zeugnis': 'Dokument.Zeugnis',
            'ausweis': 'Dokument.Ausweis',
            'pass': 'Dokument.Pass'
        }

        for keyword, doc_type in document_types.items():
            if keyword in combined_text:
                return doc_type

        # Werkzeuge und Geräte
        tool_types = {
            'schlüssel': 'Werkzeug.Schlüssel',
            'dietrich': 'Werkzeug.Einbruchwerkzeug',
            'brecheisen': 'Werkzeug.Einbruchwerkzeug',
            'feile': 'Werkzeug.Feile',
            'säge': 'Werkzeug.Säge',
            'hammer': 'Werkzeug.Hammer',
            'zange': 'Werkzeug.Zange',
            'bohrer': 'Werkzeug.Bohrer'
        }

        for keyword, tool_type in tool_types.items():
            if keyword in combined_text:
                return tool_type

        # Sonstige Kategorien
        if 'kleidung' in combined_text or 'textil' in combined_text:
            return 'Textilie.Kleidungsstück'
        if 'schmuck' in combined_text or 'ring' in combined_text or 'kette' in combined_text:
            return 'Schmuck.Objekt'
        if 'münze' in combined_text or 'geld' in combined_text:
            return 'Geld.Münze'

        # Fallback basierend auf Container
        if container == 'objekte':
            return 'Beweisstück.Objekt'

        return 'Beweisstück.Unklassifiziert'

    def enhance_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Erweiterte Item-Verarbeitung."""
        enhanced = item.copy()

        fulltext = item.get('fulltext', '')
        description = item.get('description', '')
        identifier = item.get('identifier', '')

        # Track if we have no fulltext
        if not fulltext:
            self.statistics['without_fulltext'] += 1

        # Historisches Jahr mit erweiterter Methode
        year, source = self.extract_historical_year_advanced(fulltext, description, identifier)
        if year:
            enhanced['historicalYear'] = year
            enhanced['dateSource'] = source
            if source == 'estimated':
                self.statistics['with_estimated_date'] += 1
            else:
                self.statistics['with_date'] += 1

        # Delikttypen
        crimes = self.extract_crime_types_advanced(fulltext, description)
        if crimes:
            enhanced['crimeType'] = crimes
            self.statistics['with_crimes'] += 1

        # Orte
        locations = self.extract_locations_advanced(fulltext, description)
        if locations:
            enhanced['locations'] = locations
            self.statistics['with_locations'] += 1

        # Personen (nur wenn Volltext vorhanden)
        if fulltext:
            persons = self.extract_persons_advanced(fulltext)
            if persons:
                enhanced['persons'] = persons

        # Objektklassifikation
        classification = self.classify_object_advanced(item)
        enhanced['objectClass'] = classification
        if not classification.endswith(('Unklassifiziert', 'Sonstiges')):
            self.statistics['classified'] += 1

        # Erweiterte Qualitätsbewertung
        quality = 0.0
        if 'historicalYear' in enhanced:
            if enhanced.get('dateSource') != 'estimated':
                quality += 0.3
            else:
                quality += 0.15
        if 'crimeType' in enhanced:
            quality += 0.25
        if 'locations' in enhanced:
            quality += 0.2
        if 'persons' in enhanced:
            quality += 0.15
        if not classification.endswith(('Unklassifiziert', 'Sonstiges')):
            quality += 0.1

        enhanced['extractionQuality'] = round(min(quality, 1.0), 2)

        # Füge Extraktions-Timestamp hinzu
        enhanced['extractedAt'] = datetime.now().isoformat()

        return enhanced

    def process_archive(self, input_file: str, output_file: str) -> Dict[str, Any]:
        """Verarbeitet die gesamte Archivdatei."""
        print(f"Loading data from {input_file}...")

        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.statistics['total'] = len(data)
        print(f"Processing {len(data)} items with improved extraction...")

        enhanced_data = []
        for i, item in enumerate(data):
            if i % 100 == 0:
                print(f"  Processing item {i}/{len(data)}...")
            enhanced_item = self.enhance_item(item)
            enhanced_data.append(enhanced_item)

        # Sortiere nach historischem Jahr (geschätzte ans Ende)
        def sort_key(x):
            year = x.get('historicalYear', 9999)
            is_estimated = x.get('dateSource') == 'estimated'
            return (is_estimated, year)

        enhanced_data.sort(key=sort_key)

        print(f"Saving enhanced data to {output_file}...")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(enhanced_data, f, ensure_ascii=False, indent=2)

        # Berechne Statistiken
        self.statistics['coverage'] = {
            'date': round((self.statistics['with_date'] + self.statistics['with_estimated_date']) / self.statistics['total'], 3),
            'date_exact': round(self.statistics['with_date'] / self.statistics['total'], 3),
            'date_estimated': round(self.statistics['with_estimated_date'] / self.statistics['total'], 3),
            'classified': round(self.statistics['classified'] / self.statistics['total'], 3),
            'crimes': round(self.statistics['with_crimes'] / self.statistics['total'], 3),
            'locations': round(self.statistics['with_locations'] / self.statistics['total'], 3),
            'without_fulltext': round(self.statistics['without_fulltext'] / self.statistics['total'], 3)
        }

        return self.statistics


def main():
    """Hauptfunktion."""
    enhancer = ImprovedMetadataEnhancer()

    input_file = 'km_archive/metadata/all_objects.json'
    output_file = 'km_archive/metadata/enhanced_objects_v2.json'

    # Prüfe ob Input-Datei existiert
    if not Path(input_file).exists():
        print(f"Error: Input file {input_file} not found!")
        return 1

    # Verarbeite Archiv
    stats = enhancer.process_archive(input_file, output_file)

    # Ausgabe der Statistiken
    print("\n=== Enhanced Extraction Statistics ===")
    print(f"Total items: {stats['total']}")
    print(f"With exact historical date: {stats['with_date']} ({stats['coverage']['date_exact']:.1%})")
    print(f"With estimated date: {stats['with_estimated_date']} ({stats['coverage']['date_estimated']:.1%})")
    print(f"Total with dates: {stats['with_date'] + stats['with_estimated_date']} ({stats['coverage']['date']:.1%})")
    print(f"Classified: {stats['classified']} ({stats['coverage']['classified']:.1%})")
    print(f"With crime types: {stats['with_crimes']} ({stats['coverage']['crimes']:.1%})")
    print(f"With locations: {stats['with_locations']} ({stats['coverage']['locations']:.1%})")
    print(f"Without fulltext: {stats['without_fulltext']} ({stats['coverage']['without_fulltext']:.1%})")
    print(f"\nEnhanced data saved to: {output_file}")

    return 0


if __name__ == '__main__':
    exit(main())