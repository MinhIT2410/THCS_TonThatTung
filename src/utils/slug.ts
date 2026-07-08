/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function generateSlug(text: string): string {
  if (!text) return '';

  let slug = text.toLowerCase().trim();

  // Remove Vietnamese accents
  const accentsMap: { [key: string]: string } = {
    a: 'àáảãạăằắẳẵặâầấẩẫậåäæ',
    c: 'ç',
    d: 'đ',
    e: 'èéẻẽẹêềếểễệë',
    i: 'ìíỉĩịïîì',
    o: 'òóỏõọôồốổỗộơờớởỡợöø',
    u: 'ùúủũụưừứửữựüû',
    y: 'ỳýỷỹỵÿ',
  };

  for (const [nonAccent, accents] of Object.entries(accentsMap)) {
    const regex = new RegExp(`[${accents}]`, 'g');
    slug = slug.replace(regex, nonAccent);
  }

  // Replace special characters / spaces with a single hyphen
  slug = slug
    .replace(/[^a-z0-9\s-]/g, '') // Remove all non-alphanumeric and non-space, non-hyphen chars
    .replace(/[\s-]+/g, '-')      // Collapse multiple spaces or hyphens into a single hyphen
    .replace(/^-+|-+$/g, '');     // Trim leading/trailing hyphens

  return slug || 'post-' + Date.now();
}
