import { describe, expect, it } from 'vitest';
import { buildMap, MAX_PUSHES, MAPS, DIFFICULTIES } from '@/lib/game';
import { checkName } from '@/lib/name-rules';

describe('점프맵 rules', () => {
  it('allows ten pushes per race', () => expect(MAX_PUSHES).toBe(10));
  it('locks the nickname to 익명 after three inappropriate submissions', () => {
    let result = checkName('씨발', 0);
    expect(result.warnings).toBe(1);
    result = checkName('씨발', result.warnings);
    expect(result.warnings).toBe(2);
    result = checkName('씨발', result.warnings);
    expect(result).toEqual({ name: '익명', warnings: 3, accepted: false });
    expect(checkName('토끼', result.warnings).name).toBe('익명');
  });
  it('provides easy, normal and hard maps with increasing length', () => {
    expect(buildMap('jelly', 'easy').platforms.length).toBe(25);
    expect(buildMap('jelly', 'normal').platforms.length).toBe(43);
    expect(buildMap('jelly', 'hard').platforms.length).toBe(57);
  });
  it('keeps every next platform within jumping distance in all modes', () => {
    for (const map of MAPS) for (const diff of DIFFICULTIES) {
      const platforms = buildMap(map.id, diff.id).platforms;
      for (let i = 2; i < platforms.length; i++) {
        const previous = platforms[i - 1];
        const next = platforms[i];
        if (!previous || !next) throw new Error('Missing platform');
        expect(Math.max(0, next.x - (previous.x + previous.w), previous.x - (next.x + next.w))).toBeLessThanOrEqual(110);
      }
    }
  });
});