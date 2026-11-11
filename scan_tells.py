# -*- coding: utf-8 -*-
"""Scan pola AI-tell Indonesia pada docx (paragraf + tabel)."""
import re
import sys

import docx

PATTERNS = {
    "bukan X (tapi/tetapi/melainkan) Y + ekor ':bukan'":
        r'bukan\s[^.,;:]{3,60}?(?:,?\s(?:tapi|tetapi|melainkan)\s|:)|,\s*bukan\s[^.,]{3,40}|\bbukan\b[^.]{0,60}?\bmelainkan\b',
    "em dash U+2014": "\u2014",
    "Di sinilah": r'di sinilah',
    "Perlu dicatat / Menarik untuk dicatat": r'(perlu|menarik)\s+(untuk\s+)?dicatat',
    "adalah sebagai berikut / berikut adalah": r'(adalah sebagai berikut|berikut adalah)',
    "dalam rangka (filler)": r'dalam rangka',
    "dapat dikatakan / bisa dibilang": r'(dapat dikatakan|bisa dibilang)',
    "punchy kicker 2-4 kata diakhir titik": r'\b[A-Z][\w-]+(?: [\w-]+){1,3}\.(?=\s|$)',
}

def extract(path):
    d = docx.Document(path)
    chunks = [p.text for p in d.paragraphs]
    for t in d.tables:
        for r in t.rows:
            for c in r.cells:
                chunks.append(c.text)
    return "\n".join(chunks)

for path in sys.argv[1:]:
    text = extract(path)
    words = len(text.split())
    print("=" * 70)
    print(path.split("\\")[-1], f"({words} kata)")
    for name, pat in PATTERNS.items():
        hits = re.findall(pat, text, re.I)
        if name.startswith("punchy"):
            continue  # terlalu banyak false positive di judul dokumen
        print(f"  {name}: {len(hits)}")
        for m in re.finditer(pat, text, re.I):
            s = max(0, m.start() - 60)
            e = min(len(text), m.end() + 60)
            print("     ...", text[s:e].replace("\n", " "), "...")
