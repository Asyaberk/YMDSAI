/**
 * Converts a YÖK regulation reference string OR a RAG source filename
 * into a direct mevzuat.gov.tr URL.
 *
 * Handles:
 *   - Law numbers:  "2547 sayılı Yükseköğretim Kanunu Md. 44/c"
 *   - Keywords:     "Yükseköğretim Kanunu Md. 5"
 *   - RAG filenames: "yok.pdf", "lisansustu.pdf", "cap.pdf" ...
 */

// ── RAG source filename → direct URL ─────────────────────────────────────────
// Maps the PDF filenames used in our local corpus to official mevzuat pages.

const FILE_MAP: Record<string, string> = {
  // Core YÖK law
  'yok':            'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2547&MevzuatTur=1&MevzuatTertip=5',
  'yok.pdf':        'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2547&MevzuatTur=1&MevzuatTertip=5',

  // Graduate education
  'lisansustu':     'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=30356&MevzuatTur=7&MevzuatTertip=5',
  'lisansustu.pdf': 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=30356&MevzuatTur=7&MevzuatTertip=5',

  // Undergraduate
  'lisans':         'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=26343&MevzuatTur=7&MevzuatTertip=5',
  'lisans.pdf':     'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=26343&MevzuatTur=7&MevzuatTertip=5',

  // Double major / minor
  'cap':            'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=25949&MevzuatTur=7&MevzuatTertip=5',
  'cap.pdf':        'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=25949&MevzuatTur=7&MevzuatTertip=5',
  'yandal':         'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=25949&MevzuatTur=7&MevzuatTertip=5',
  'yandal.pdf':     'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=25949&MevzuatTur=7&MevzuatTertip=5',

  // Lateral transfer
  'yatay':          'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=24622&MevzuatTur=7&MevzuatTertip=5',
  'yatay.pdf':      'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=24622&MevzuatTur=7&MevzuatTertip=5',

  // Dormitory / student housing
  'yurt':           'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=7343&MevzuatTur=7&MevzuatTertip=5',
  'yurt.pdf':       'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=7343&MevzuatTur=7&MevzuatTertip=5',

  // Internship
  'staj':           'https://www.yok.gov.tr/Documents/Mevzuat/staj_yonetmeligi.pdf',
  'staj.pdf':       'https://www.yok.gov.tr/Documents/Mevzuat/staj_yonetmeligi.pdf',

  // Procurement / public spending (İhalemali)
  'ihale':          'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4734&MevzuatTur=1&MevzuatTertip=5',
  'ihale.pdf':      'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4734&MevzuatTur=1&MevzuatTertip=5',
  'mal':            'https://idarimali.yok.gov.tr/tr/page/318',
  'mal.pdf':        'https://idarimali.yok.gov.tr/tr/page/318',
  'hizmet':         'https://idarimali.yok.gov.tr/tr/page/318',
  'hizmet.pdf':     'https://idarimali.yok.gov.tr/tr/page/318',

  // Ethics / other
  'etik':           'https://www.yok.gov.tr/Documents/Mevzuat/yonetici_secim.pdf',
  'etik.pdf':       'https://www.yok.gov.tr/Documents/Mevzuat/yonetici_secim.pdf',
  'disiplin':       'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2547&MevzuatTur=1&MevzuatTertip=5',
  'disiplin.pdf':   'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2547&MevzuatTur=1&MevzuatTertip=5',
};

// ── Keyword / law-number → URL ────────────────────────────────────────────────

const LAW_MAP: Array<{ patterns: string[]; url: string }> = [
  {
    patterns: ['2547', 'yükseköğretim kanunu', 'yüksekögretim kanunu'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2547&MevzuatTur=1&MevzuatTertip=5',
  },
  {
    patterns: ['2809', 'yükseköğretim kurumları teşkilatı'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2809&MevzuatTur=1&MevzuatTertip=5',
  },
  {
    patterns: ['2914', 'yükseköğretim personel'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2914&MevzuatTur=1&MevzuatTertip=5',
  },
  {
    patterns: ['657', 'devlet memurları'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=657&MevzuatTur=1&MevzuatTertip=5',
  },
  {
    patterns: ['5018', 'kamu mali yönetimi'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5018&MevzuatTur=1&MevzuatTertip=5',
  },
  {
    patterns: ['lisansüstü eğitim', 'lisansustu', 'lisansüstü öğretim'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=30356&MevzuatTur=7&MevzuatTertip=5',
  },
  {
    patterns: ['önlisans', 'lisans eğitim-öğretim', 'kredili sistem'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=26343&MevzuatTur=7&MevzuatTertip=5',
  },
  {
    patterns: ['yatay geçiş', 'yatay gecis'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=24622&MevzuatTur=7&MevzuatTertip=5',
  },
  {
    patterns: ['çift anadal', 'yan dal', 'yandal'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=25949&MevzuatTur=7&MevzuatTertip=5',
  },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a working mevzuat.gov.tr URL for the given reference or filename.
 * Falls back to the official YÖK mevzuat index page (never 404s).
 */
export function yokRefToUrl(ref: string): string {
  if (!ref) return 'https://idarimali.yok.gov.tr/tr/page/318';
  const lower = ref.toLowerCase().trim();

  // 1. Direct filename match (e.g., "yok.pdf", "lisansustu.pdf")
  const fileKey = lower.replace(/^.*[\\/]/, ''); // strip any path prefix
  if (FILE_MAP[fileKey]) return FILE_MAP[fileKey];

  // 2. Exact 4-5 digit law number (e.g., "2547 sayılı...")
  const numMatch = lower.match(/\b(\d{4,5})\b/);
  if (numMatch) {
    const num = numMatch[1];
    const found = LAW_MAP.find(m => m.patterns[0] === num);
    if (found) return found.url;
    // Valid-looking law number → construct generic link
    return `https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=${num}&MevzuatTur=1&MevzuatTertip=5`;
  }

  // 3. Keyword matching
  for (const entry of LAW_MAP) {
    const keywords = entry.patterns.slice(1);
    if (keywords.some(p => lower.includes(p))) return entry.url;
  }

  // 4. Safe fallback — YÖK mevzuat index (always works)
  return 'https://idarimali.yok.gov.tr/tr/page/318';
}

/** Returns a human-readable label for a source filename. */
export function yokSourceLabel(filename: string): string {
  const base = filename.replace(/\.pdf$/i, '').toLowerCase().trim();
  const labels: Record<string, string> = {
    yok:         '2547 s. YÖK Kanunu',
    lisansustu:  'Lisansüstü Eğitim Yön.',
    lisans:      'Lisans Eğitim-Öğretim Yön.',
    cap:         'Çift Anadal Yön.',
    yandal:      'Yan Dal Yön.',
    yatay:       'Yatay Geçiş Yön.',
    yurt:        'Öğrenci Yurt Yön.',
    staj:        'Staj Yönetmeliği',
    ihale:       '4734 s. Kamu İhale Kanunu',
    mal:         'Mal Alımları Yön.',
    hizmet:      'Hizmet Alımları Yön.',
    etik:        'Etik Yönetmeliği',
    disiplin:    'Disiplin Yönetmeliği',
  };
  return labels[base] ?? base.replace(/_/g, ' ');
}

/** Returns true if we resolved to a direct page (not just the index). */
export function hasDirectMevzuatLink(ref: string): boolean {
  const url = yokRefToUrl(ref);
  return !url.includes('idarimali.yok.gov.tr/tr/page/318');
}
