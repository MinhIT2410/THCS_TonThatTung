const classCollator = new Intl.Collator('vi', {
  numeric: true,
  sensitivity: 'base',
});

/**
 * Strip Vietnamese diacritics / tones from a string, convert to lowercase and trim.
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Normalizes class search string / class name for matching.
 * e.g.,
 * normalizeClassSearch("Lớp 6/10") -> "610"
 * normalizeClassSearch("lop 6-10") -> "610"
 * normalizeClassSearch("6/2") -> "62"
 * normalizeClassSearch("62") -> "62"
 */
export function normalizeClassSearch(str: string): string {
  if (!str) return '';
  let cleaned = removeVietnameseTones(str);
  // Remove prefix words like "lop", "khoi", "chi doi"
  cleaned = cleaned.replace(/\b(lop|khoi|chi doi)\b/g, '');
  // Remove all non-alphanumeric characters
  cleaned = cleaned.replace(/[^a-z0-9]/g, '');
  return cleaned;
}

/**
 * Parses class names like "6/1", "6/10", "Lớp 6/2", "Chi đội 6A10", "Khối 6"
 * into grade number, section number, and remaining text for natural numeric sorting.
 */
export function parseClassParts(str?: string | null): { grade: number; section: number; text: string } {
  if (!str) return { grade: 999, section: 999, text: '' };
  const cleaned = str.trim();
  // Strip prefix words like Lớp, Chi đội, Khối
  const unprefix = cleaned.replace(/^(?:Lớp|Chi\s+đội|Khối)\s+/i, '');
  // Match grade number and section number (e.g., "6/10", "6A10", "6-10", "6.10")
  const match = unprefix.match(/^(\d+)\s*[\/\-_A-Za-z.]?\s*(\d+)?(.*)$/);
  if (match) {
    const grade = parseInt(match[1], 10);
    const section = match[2] ? parseInt(match[2], 10) : 0;
    const text = (match[3] || '').trim();
    return { grade, section, text };
  }
  return { grade: 999, section: 999, text: cleaned };
}

/**
 * Natural comparison for class names or strings containing numbers
 * (e.g. "Lớp 6/1", "Lớp 6/2", "Lớp 6/10", "Khối 6", "Khối 10").
 */
export function compareClassNames(aName?: string | null, bName?: string | null): number {
  if (!aName && !bName) return 0;
  if (!aName) return 1;
  if (!bName) return -1;

  const aParts = parseClassParts(aName);
  const bParts = parseClassParts(bName);

  if (aParts.grade !== bParts.grade) {
    return aParts.grade - bParts.grade;
  }
  if (aParts.section !== bParts.section) {
    return aParts.section - bParts.section;
  }
  return classCollator.compare(aName, bName);
}

/**
 * Sorts an array of class objects (or objects with class names) naturally by their name.
 * Does NOT mutate the input array.
 */
export function sortClassesNaturally<T = any>(
  classes: T[],
  getName?: (item: T) => string | undefined | null
): T[] {
  if (!classes || !Array.isArray(classes)) return [];
  return [...classes].sort((a, b) => {
    const nameA = getName ? getName(a) : ((a as any)?.name ?? (a as any)?.class_name ?? (a as any)?.code ?? '');
    const nameB = getName ? getName(b) : ((b as any)?.name ?? (b as any)?.class_name ?? (b as any)?.code ?? '');
    return compareClassNames(nameA, nameB);
  });
}

