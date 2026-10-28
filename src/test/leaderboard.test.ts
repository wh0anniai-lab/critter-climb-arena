import { describe, expect, it } from 'vitest';
import { rankByMode, moderatedName } from '@/lib/leaderboard';

describe('mode leaderboard', () => {
  const records = [
    { id: 'slow', diff: 'easy', map: 'jelly', time_ms: 9000, created_at: '2026-10-28T10:00:00Z' },
    { id: 'fast', diff: 'easy', map: 'sea', time_ms: 4000, created_at: '2026-10-28T09:00:00Z' },
    { id: 'normal', diff: 'normal', map: 'sea', time_ms: 2000, created_at: '2026-10-28T09:00:00Z' },
    { id: 'hard', diff: 'hard', map: 'forest', time_ms: 1000, created_at: '2026-10-28T09:00:00Z' },
  ];
  it('ranks easy mode across backgrounds fastest first', () => expect(rankByMode(records, 'easy', 'best').map(r => r.id)).toEqual(['fast', 'slow']));
  it('keeps normal mode separate', () => expect(rankByMode(records, 'normal', 'best').map(r => r.id)).toEqual(['normal']));
  it('keeps hard mode separate', () => expect(rankByMode(records, 'hard', 'best').map(r => r.id)).toEqual(['hard']));
  it('forces anonymous at three global warnings', () => {
    expect(moderatedName('토끼', 2)).toBe('토끼');
    expect(moderatedName('토끼', 3)).toBe('익명');
    expect(moderatedName('토끼', 4)).toBe('익명');
  });
});