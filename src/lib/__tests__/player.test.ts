import { describe, it, expect } from 'vitest';
import { levelOf } from '../player';

describe('levelOf', () => {
  it('should return level 1 for 0 xp', () => {
    expect(levelOf(0)).toEqual({ level: 1, into: 0, need: 100 });
  });

  it('should return level 1 for negative xp', () => {
    expect(levelOf(-50)).toEqual({ level: 1, into: 0, need: 100 });
  });

  it('should handle xp exactly at the boundary of level 2 (100 xp)', () => {
    // level 1 needs 100 xp to level up
    expect(levelOf(100)).toEqual({ level: 2, into: 0, need: 150 });
  });

  it('should handle xp just below the boundary of level 2 (99 xp)', () => {
    expect(levelOf(99)).toEqual({ level: 1, into: 99, need: 100 });
  });

  it('should handle xp in the middle of level 2', () => {
    // Level 1 -> Level 2 requires 100 XP.
    // Level 2 -> Level 3 requires 150 XP.
    // So if you have 150 XP total:
    // - 100 XP goes to Level 2
    // - 50 XP remains into Level 2
    expect(levelOf(150)).toEqual({ level: 2, into: 50, need: 150 });
  });

  it('should handle exactly reaching level 3 (250 xp total)', () => {
    // 100 (for lv2) + 150 (for lv3) = 250
    expect(levelOf(250)).toEqual({ level: 3, into: 0, need: 200 });
  });

  it('should handle high xp amounts correctly', () => {
    // lv 1 -> 2: 100 xp
    // lv 2 -> 3: 150 xp
    // lv 3 -> 4: 200 xp
    // lv 4 -> 5: 250 xp
    // Total for level 5: 100 + 150 + 200 + 250 = 700
    expect(levelOf(700)).toEqual({ level: 5, into: 0, need: 300 });

    // With 800 XP total:
    // 700 used for level 5, 100 into level 5
    expect(levelOf(800)).toEqual({ level: 5, into: 100, need: 300 });
  });

  it('should calculate progression for arbitrary numbers accurately', () => {
    // Let's test a very specific number.
    // 0 -> 100 (lv2)
    // 100 -> 250 (lv3)
    // 250 -> 450 (lv4)
    // 450 -> 700 (lv5)
    // 700 -> 1000 (lv6)
    // For 1000:
    expect(levelOf(1000)).toEqual({ level: 6, into: 0, need: 350 });

    // For 1050:
    expect(levelOf(1050)).toEqual({ level: 6, into: 50, need: 350 });
  });
});
