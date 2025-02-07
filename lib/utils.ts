import { RecordEntryKey } from './types.ts';

const entryKeyRegExp = /^\d+$/;

export function isRecord<K extends RecordEntryKey, V = unknown>(value: unknown): value is Record<K, V> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function getRecordEntries<K extends RecordEntryKey, V = unknown>(
  object: Record<K, V> | Partial<Record<K, V>>
): Array<[K, V]> {
  const entries = Object.entries(object);
  return entries.map((entry): [K, V] => {
    const [key, value] = entry;
    return [(entryKeyRegExp.test(key) ? Number(key) : key) as K, value as V];
  });
}
