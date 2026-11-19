/** Small localStorage helpers; all reads/writes are safe during SSR. */
export function readStored({ key }: { key: string }): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored({ key, value }: { key: string; value: string }): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable; preferences still work for this session.
  }
}

export function removeStored({ key }: { key: string }): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable; preferences still work for this session.
  }
}
