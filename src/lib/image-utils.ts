const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_URL || "";

/**
 * Get public URLs from storage keys (client-side) - supports multiple images
 */
export function getImageUrls(storageKeys: string[] | string | null | undefined): string[] {
  if (!storageKeys) return [];

  // If single string, convert to array
  const keys = Array.isArray(storageKeys) ? storageKeys : [storageKeys];

  return keys
    .map(key => getImageUrl(key))
    .filter((url): url is string => url !== null);
}

/**
 * Get public URL from storage key (client-side)
 */
export function getImageUrl(storageKey: string | null | undefined): string | null {
  if (!storageKey) return null;

  // If already a full URL, return as-is
  if (storageKey.startsWith("http")) return storageKey;

  // If base64, return as-is
  if (storageKey.startsWith("data:")) return storageKey;

  return `${R2_PUBLIC_URL}/${storageKey}`;
}

/**
 * Get thumbnail URL from storage key
 */
export function getThumbnailUrl(
  storageKey: string | null | undefined,
  thumbnailKey?: string | null
): string | null {
  if (thumbnailKey) {
    return `${R2_PUBLIC_URL}/${thumbnailKey}`;
  }

  if (!storageKey) return null;

  // Generate thumbnail key from original
  return `${R2_PUBLIC_URL}/${storageKey.replace(/(\.[^.]+)$/, "_thumb$1")}`;
}
