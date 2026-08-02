const classCollator = new Intl.Collator('vi', {
  numeric: true,
  sensitivity: 'base',
});

/**
 * Natural comparison for class names or strings containing numbers
 * (e.g. "Lớp 6/1", "Lớp 6/2", "Lớp 6/10", "Khối 6", "Khối 10").
 */
export function compareClassNames(aName?: string | null, bName?: string | null): number {
  if (!aName && !bName) return 0;
  if (!aName) return 1;
  if (!bName) return -1;
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
    const nameB = getName ? getName(b) : ((a as any)?.name ?? (a as any)?.class_name ?? (a as any)?.code ?? '');
    return compareClassNames(nameA, nameB);
  });
}
