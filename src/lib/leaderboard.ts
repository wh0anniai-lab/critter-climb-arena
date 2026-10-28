import type { DiffId } from './game';

export function rankByMode<T extends { diff: string; time_ms: number; created_at: string }>(records: T[], mode: DiffId, view: 'best' | 'recent') {
  return records.filter(record => record.diff === mode).sort((a, b) => view === 'best'
    ? a.time_ms - b.time_ms || a.created_at.localeCompare(b.created_at)
    : b.created_at.localeCompare(a.created_at));
}

export function moderatedName(name: string, warnings: number) {
  return warnings >= 3 ? '익명' : name;
}