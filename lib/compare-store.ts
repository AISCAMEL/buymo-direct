'use client';

const STORAGE_KEY = 'buymo_compare';
const MAX_COMPARE = 3;

function readIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function getCompareIds(): string[] {
  return readIds();
}

/** Returns false if the list is already at capacity (3 items). */
export function addToCompare(id: string): boolean {
  const ids = readIds();
  if (ids.includes(id)) return true; // already present — no-op, not an error
  if (ids.length >= MAX_COMPARE) return false;
  writeIds([...ids, id]);
  return true;
}

export function removeFromCompare(id: string): void {
  writeIds(readIds().filter((x) => x !== id));
}

export function isInCompare(id: string): boolean {
  return readIds().includes(id);
}

export function clearCompare(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
