/**
 * Converts a YÖK regulation reference string into a direct mevzuat.gov.tr URL.
 * Examples:
 *   "2547 sayılı Yükseköğretim Kanunu Md. 44/c" → mevzuat link for 2547
 *   "Yükseköğretim Kanunu Md. 5"                → mevzuat link for 2547
 *   "Lisansüstü Eğitim Yönetmeliği Md. 3"       → search link
 */

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
    patterns: ['2914', 'yükseköğretim personel kanunu'],
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
    patterns: ['lisansüstü eğitim', 'lisansustu egitim', 'lisansüstü öğretim'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=30356&MevzuatTur=7&MevzuatTertip=5',
  },
  {
    patterns: ['önlisans', 'lisans eğitim', 'lisans öğretim', 'kredili sistem'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=26343&MevzuatTur=7&MevzuatTertip=5',
  },
  {
    patterns: ['yatay geçiş', 'yatay gecis'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=24622&MevzuatTur=7&MevzuatTertip=5',
  },
  {
    patterns: ['çift anadal', 'yandal'],
    url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=25949&MevzuatTur=7&MevzuatTertip=5',
  },
];

/**
 * Returns a mevzuat.gov.tr URL for the given reference string,
 * or a search URL as fallback.
 */
export function yokRefToUrl(ref: string): string {
  if (!ref) return '';
  const lower = ref.toLowerCase();

  // Step 1: Try exact 4-5 digit law number match first
  const numMatch = lower.match(/\b(\d{4,5})\b/);
  if (numMatch) {
    const num = numMatch[1];
    // Check if this specific number is in our map
    const found = LAW_MAP.find(m => m.patterns[0] === num);
    if (found) return found.url;
    // Unknown number — construct a generic kanun link
    return `https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=${num}&MevzuatTur=1&MevzuatTertip=5`;
  }

  // Step 2: Keyword matching (no number found)
  for (const entry of LAW_MAP) {
    const keywords = entry.patterns.slice(1); // Skip the numeric pattern
    if (keywords.some(p => lower.includes(p))) {
      return entry.url;
    }
  }

  // Fallback: mevzuat.gov.tr search
  const query = encodeURIComponent(ref.split(/md\.|madde/i)[0].trim());
  return `https://www.mevzuat.gov.tr/MevzuatMetin/bulunan?sozcuk=${query}`;
}

/** Returns true if we have a direct mevzuat link (not just a search). */
export function hasDirectMevzuatLink(ref: string): boolean {
  if (!ref) return false;
  const lower = ref.toLowerCase();
  const numMatch = lower.match(/\b(\d{4,5})\b/);
  if (numMatch) return true;
  return LAW_MAP.some(e => e.patterns.some(p => lower.includes(p)));
}
